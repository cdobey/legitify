/**
 * Check connectivity to Hyperledger Fabric network components
 * This script attempts to establish connections to all peers, orderers, and CAs
 * to verify network connectivity before proceeding with operations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { exit } = require('process');
const dotenv = require('dotenv');

// Load environment variables from server.env file only in development
const isDeployment = process.env.IS_DEPLOYMENT === 'true';
const envPath = path.join(__dirname, '../server.env');

if (!isDeployment && fs.existsSync(envPath)) {
  console.log('Loading environment variables from server.env');
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.warn(
      'Warning: Failed to load environment variables from server.env:',
      result.error.message,
    );
  }
} else {
  console.log('Using system environment variables');
}

// Configuration
// Support both new FABRIC_CONNECTION and legacy EC2_IP for backwards compatibility
const FABRIC_CONNECTION =
  process.env.FABRIC_CONNECTION || process.env.EC2_IP || 'network.legitifyapp.com';
const RESOURCE_SERVER_PORT = process.env.RESOURCE_SERVER_PORT || 8080;
const RESOURCE_SERVER_URL = `http://${FABRIC_CONNECTION}:${RESOURCE_SERVER_PORT}`;

// Define the components to check
const components = [
  { name: 'OrgUniversity Peer', port: 7051, protocol: 'tcp' },
  { name: 'OrgEmployer Peer', port: 8051, protocol: 'tcp' },
  { name: 'OrgIndividual Peer', port: 9051, protocol: 'tcp' },
  { name: 'Orderer', port: 7050, protocol: 'tcp' },
  { name: 'OrgUniversity CA', port: 7054, protocol: 'tcp' },
  { name: 'OrgEmployer CA', port: 8054, protocol: 'tcp' },
  { name: 'OrgIndividual CA', port: 9054, protocol: 'tcp' },
  { name: 'Resource Server', port: 8080, protocol: 'http' },
];

/**
 * Check connectivity to a specific port using nc (netcat)
 * @param {string} host - The hostname or IP to connect to
 * @param {number} port - The port number to check
 * @returns {boolean} - True if connection successful, false otherwise
 */
function checkPortConnectivity(host, port) {
  try {
    // Try to establish a TCP connection with a 5-second timeout
    execSync(`nc -z -w 5 ${host} ${port}`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check HTTP connectivity to a URL
 * @param {string} url - The URL to check
 * @returns {Promise<boolean>} - True if connection successful, false otherwise
 */
function checkHttpConnectivity(url) {
  return new Promise(resolve => {
    const req = http.get(url, { timeout: 5000 }, res => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Run all connectivity checks
 */
async function runConnectivityChecks() {
  console.log('=================================================================');
  console.log(`Checking connectivity to Hyperledger Fabric on ${FABRIC_CONNECTION}`);
  console.log('=================================================================');

  let allSuccessful = true;
  let failures = [];

  for (const component of components) {
    process.stdout.write(`Checking ${component.name} (${FABRIC_CONNECTION}:${component.port})... `);

    let isConnected = false;
    if (component.protocol === 'http') {
      isConnected = await checkHttpConnectivity(`${RESOURCE_SERVER_URL}/health`);
    } else {
      isConnected = checkPortConnectivity(FABRIC_CONNECTION, component.port);
    }

    if (isConnected) {
      console.log('✅ Connected');
    } else {
      console.log('❌ Failed');
      allSuccessful = false;
      failures.push(component);
    }
  }

  console.log('=================================================================');
  if (allSuccessful) {
    console.log('✅ All connectivity checks passed!');
    return true;
  } else {
    console.log('❌ Some connectivity checks failed:');
    failures.forEach(component => {
      console.log(`   - ${component.name} (${FABRIC_CONNECTION}:${component.port})`);
    });

    console.log('\nPossible solutions:');
    console.log('1. Check that your EC2 instance is running');
    console.log('2. Verify that the Fabric network is started on the EC2 instance');
    console.log('3. Make sure the AWS security group has the following ports open:');
    failures.forEach(component => {
      console.log(`   - TCP ${component.port} (${component.name})`);
    });
    console.log('4. Check if your local network allows outbound connections to these ports');
    return false;
  }
}

// If this file is run directly (not imported)
if (require.main === module) {
  runConnectivityChecks().then(success => {
    if (!success) {
      process.exit(1);
    }
  });
}

module.exports = { runConnectivityChecks };
