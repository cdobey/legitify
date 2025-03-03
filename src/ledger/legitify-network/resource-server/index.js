const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());

// Base directory for resources
const NETWORK_ROOT = path.resolve(__dirname, '..');
const ORGANIZATIONS_DIR = path.join(NETWORK_ROOT, 'organizations');

// Generate connection profiles on demand with the correct IP
const generateConnectionProfile = (org) => {
    const template = {
        name: `legitify-network-${org}`,
        version: '1.0.0',
        client: {
            organization: org.charAt(0).toUpperCase() + org.slice(1),
            connection: {
                timeout: {
                    peer: {
                        endorser: '300',
                    },
                },
            },
        },
        organizations: {},
        peers: {},
        certificateAuthorities: {},
    };

    // Set organization info
    const orgCapitalized = org.charAt(0).toUpperCase() + org.slice(1);
    const orgMSPID = `${orgCapitalized}MSP`;
    template.organizations[orgCapitalized] = {
        mspid: orgMSPID,
        peers: [`peer0.${org}.com`],
        certificateAuthorities: [`ca.${org}.com`],
    };

    // Set peer and CA info based on org
    let peerPort, caPort;
    if (org === 'orguniversity') {
        peerPort = 7051;
        caPort = 7054;
    } else if (org === 'orgemployer') {
        peerPort = 8051;
        caPort = 8054;
    } else if (org === 'orgindividual') {
        peerPort = 9051;
        caPort = 9054;
    }

    // Add peer configuration
    template.peers[`peer0.${org}.com`] = {
        url: `grpcs://${process.env.EC2_IP || '3.249.159.32'}:${peerPort}`,
        tlsCACerts: {
            pem: fs.readFileSync(
                path.join(
                    ORGANIZATIONS_DIR,
                    `peerOrganizations/${org}.com/peers/peer0.${org}.com/tls/ca.crt`
                ),
                'utf8'
            ),
        },
        grpcOptions: {
            'ssl-target-name-override': `peer0.${org}.com`,
            hostnameOverride: `peer0.${org}.com`,
            'grpc.keepalive_time_ms': 120000,
            'grpc.keepalive_timeout_ms': 20000,
            'grpc.http2.min_time_between_pings_ms': 120000,
            'grpc.http2.max_pings_without_data': 0,
        },
    };

    // Add CA configuration
    template.certificateAuthorities[`ca.${org}.com`] = {
        url: `https://${process.env.EC2_IP || '3.249.159.32'}:${caPort}`,
        caName: `ca-${org}`,
        tlsCACerts: {
            pem: fs.readFileSync(
                path.join(
                    ORGANIZATIONS_DIR,
                    `peerOrganizations/${org}.com/ca/ca.${org}.com-cert.pem`
                ),
                'utf8'
            ),
        },
        httpOptions: {
            verify: false,
        },
    };

    // Add orderer information
    template.orderers = {
        'orderer.example.com': {
            url: `grpcs://${process.env.EC2_IP || '3.249.159.32'}:7050`,
            tlsCACerts: {
                pem: fs.readFileSync(
                    path.join(
                        ORGANIZATIONS_DIR,
                        'ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt'
                    ),
                    'utf8'
                ),
            },
            grpcOptions: {
                'ssl-target-name-override': 'orderer.example.com',
                hostnameOverride: 'orderer.example.com',
                'grpc.keepalive_time_ms': 120000,
                'grpc.keepalive_timeout_ms': 20000,
                'grpc.http2.min_time_between_pings_ms': 120000,
                'grpc.http2.max_pings_without_data': 0,
            },
        },
    };

    // Add channels structure
    template.channels = {
        mychannel: {
            orderers: ['orderer.example.com'],
            peers: {
                [`peer0.${org}.com`]: {
                    endorsingPeer: true,
                    chaincodeQuery: true,
                    ledgerQuery: true,
                    eventSource: true,
                },
            },
        },
    };

    return template;
};

// Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Get connection profile for an organization
app.get('/connection-profile/:org', (req, res) => {
    try {
        const org = req.params.org.toLowerCase();
        if (!['orguniversity', 'orgemployer', 'orgindividual'].includes(org)) {
            return res.status(400).json({ error: 'Invalid organization' });
        }

        const connectionProfile = generateConnectionProfile(org);
        res.json(connectionProfile);
    } catch (error) {
        console.error('Error generating connection profile:', error);
        res.status(500).json({
            error: 'Failed to generate connection profile',
        });
    }
});

// Get certificate for an organization
app.get('/certs/:orgType/:org/:certType', (req, res) => {
    try {
        const { orgType, org, certType } = req.params;
        let certPath;

        if (orgType === 'peer') {
            if (certType === 'ca') {
                certPath = path.join(
                    ORGANIZATIONS_DIR,
                    `peerOrganizations/${org}.com/peers/peer0.${org}.com/tls/ca.crt`
                );
            } else if (certType === 'tlsca') {
                certPath = path.join(
                    ORGANIZATIONS_DIR,
                    `peerOrganizations/${org}.com/tlsca/tlsca.${org}.com-cert.pem`
                );
            } else {
                return res
                    .status(400)
                    .json({ error: 'Invalid certificate type' });
            }
        } else if (orgType === 'orderer') {
            certPath = path.join(
                ORGANIZATIONS_DIR,
                'ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem'
            );
        } else {
            return res.status(400).json({ error: 'Invalid organization type' });
        }

        if (fs.existsSync(certPath)) {
            const cert = fs.readFileSync(certPath, 'utf8');
            res.set('Content-Type', 'application/x-pem-file');
            res.send(cert);
        } else {
            res.status(404).json({ error: 'Certificate not found' });
        }
    } catch (error) {
        console.error('Error retrieving certificate:', error);
        res.status(500).json({ error: 'Failed to retrieve certificate' });
    }
});

// Get MSP config.yaml for an organization
app.get('/msp-config/:org', (req, res) => {
    try {
        const { org } = req.params;

        const configPath = path.join(
            ORGANIZATIONS_DIR,
            `peerOrganizations/${org}.com/msp/config.yaml`
        );

        if (fs.existsSync(configPath)) {
            const configContent = fs.readFileSync(configPath, 'utf8');
            res.set('Content-Type', 'text/yaml');
            res.send(configContent);
        } else {
            console.error(`MSP config not found: ${configPath}`);
            res.status(404).json({ error: 'MSP config file not found' });
        }
    } catch (error) {
        console.error('Error retrieving MSP config:', error);
        res.status(500).json({
            error: 'Failed to retrieve MSP config',
            details: error.message,
        });
    }
});

// Get network status
app.get('/status', (req, res) => {
    try {
        // Simple status check to see if the network is running
        const networkStatus = {
            network: 'legitify-network',
            running: fs.existsSync(path.join(NETWORK_ROOT, '.running')),
            orgs: ['orguniversity', 'orgemployer', 'orgindividual'].map(
                (org) => {
                    return {
                        name: org,
                        peer: {
                            port:
                                org === 'orguniversity'
                                    ? 7051
                                    : org === 'orgemployer'
                                    ? 8051
                                    : 9051,
                        },
                        ca: {
                            port:
                                org === 'orguniversity'
                                    ? 7054
                                    : org === 'orgemployer'
                                    ? 8054
                                    : 9054,
                        },
                    };
                }
            ),
            orderer: {
                port: 7050,
            },
        };
        res.json(networkStatus);
    } catch (error) {
        console.error('Error checking network status:', error);
        res.status(500).json({ error: 'Failed to check network status' });
    }
});

// List organizations
app.get('/organizations', (req, res) => {
    try {
        const peerOrgs = fs
            .readdirSync(path.join(ORGANIZATIONS_DIR, 'peerOrganizations'))
            .filter((dir) =>
                fs
                    .statSync(
                        path.join(ORGANIZATIONS_DIR, 'peerOrganizations', dir)
                    )
                    .isDirectory()
            )
            .map((dir) => dir.replace('.com', ''));
        res.json({ organizations: peerOrgs });
    } catch (error) {
        console.error('Error listing organizations:', error);
        res.status(500).json({ error: 'Failed to list organizations' });
    }
});

// Get MSP files for an organization
app.get('/msp/:org/:mspType', (req, res) => {
    try {
        const { org, mspType } = req.params;
        const validMspTypes = [
            'signcerts',
            'keystore',
            'cacerts',
            'tlscacerts',
        ];
        if (!validMspTypes.includes(mspType)) {
            return res.status(400).json({ error: 'Invalid MSP type' });
        }

        // Base MSP directory path
        const mspBasePath = path.join(
            ORGANIZATIONS_DIR,
            `peerOrganizations/${org}.com/msp/${mspType}`
        );

        // Check if path exists
        if (!fs.existsSync(mspBasePath)) {
            console.error(`Path not found: ${mspBasePath}`);
            return res.status(404).json({ error: 'MSP path not found' });
        }

        // Handle different cases based on whether it's a file or directory
        const stats = fs.statSync(mspBasePath);
        let fileContent;
        let fileName;

        if (stats.isFile()) {
            // If it's a file, read it directly
            fileContent = fs.readFileSync(mspBasePath, 'utf8');
            fileName = path.basename(mspBasePath);
        } else if (stats.isDirectory()) {
            // If it's a directory, find and read the first certificate file
            const files = fs.readdirSync(mspBasePath);
            if (files.length === 0) {
                return res
                    .status(404)
                    .json({ error: 'No files found in MSP directory' });
            }

            // Find the first file that looks like a certificate - expanded patterns
            const certFile = files.find(
                (file) =>
                    file.endsWith('.pem') ||
                    file.endsWith('.crt') ||
                    file.includes('cert') ||
                    !file.includes('.')
            );

            if (!certFile) {
                return res
                    .status(404)
                    .json({ error: 'No certificate found in MSP directory' });
            }

            const certPath = path.join(mspBasePath, certFile);
            fileContent = fs.readFileSync(certPath, 'utf8');
            fileName = certFile;
        } else {
            return res
                .status(404)
                .json({ error: 'MSP path is neither a file nor a directory' });
        }

        // Send the certificate content with X-Filename header
        res.set('Content-Type', 'application/x-pem-file');
        res.set('X-Filename', fileName);
        res.send(fileContent);
    } catch (error) {
        console.error('Error retrieving MSP file:', error);
        res.status(500).json({
            error: 'Failed to retrieve MSP file',
            details: error.message,
            path: req.params
                ? `${req.params.org}/${req.params.mspType}`
                : 'unknown',
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Fabric Resource Server running on port ${PORT}`);
    // Create a .running file to indicate the network is up
    fs.writeFileSync(
        path.join(NETWORK_ROOT, '.running'),
        new Date().toISOString()
    );
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down Fabric Resource Server...');
    if (fs.existsSync(path.join(NETWORK_ROOT, '.running'))) {
        fs.unlinkSync(path.join(NETWORK_ROOT, '.running'));
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Shutting down Fabric Resource Server...');
    if (fs.existsSync(path.join(NETWORK_ROOT, '.running'))) {
        fs.unlinkSync(path.join(NETWORK_ROOT, '.running'));
    }
    process.exit(0);
});
