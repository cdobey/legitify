const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const dotenv = require('dotenv');

// Load environment variables from server.env file
const result = dotenv.config({ path: path.join(__dirname, '../server.env') });
if (result.error) {
  console.warn(
    'Warning: Failed to load environment variables from server.env:',
    result.error.message,
  );
}

// Configuration
const EC2_IP = process.env.EC2_IP || 'network.legitifyapp.com';
const RESOURCE_SERVER_PORT = process.env.RESOURCE_SERVER_PORT || 8080;
const RESOURCE_SERVER_URL = `http://${EC2_IP}:${RESOURCE_SERVER_PORT}`;
const CONNECTION_PROFILES_DIR = path.resolve(__dirname, '../src/connectionProfiles');
const CERTS_DIR = path.resolve(__dirname, '../src/certificates');
const MSP_DIR = path.resolve(__dirname, '../src/msp');

// Ensure directories exist
if (!fs.existsSync(CONNECTION_PROFILES_DIR)) {
  fs.mkdirSync(CONNECTION_PROFILES_DIR, { recursive: true });
}

if (!fs.existsSync(CERTS_DIR)) {
  fs.mkdirSync(CERTS_DIR, { recursive: true });
}

if (!fs.existsSync(MSP_DIR)) {
  fs.mkdirSync(MSP_DIR, { recursive: true });
}

/**
 * Make an HTTP request to the resource server
 * @param {string} endpoint - The API endpoint
 * @returns {Promise<any>} - The response data
 */
function makeRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${RESOURCE_SERVER_URL}${endpoint}`;
    console.log(`Making request to: ${url}`);

    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, { rejectUnauthorized: false }, res => {
      let data = '';
      let filename = null;

      if (res.headers['x-filename']) {
        filename = res.headers['x-filename'];
      }

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            if (res.headers['content-type'] === 'application/x-pem-file') {
              resolve({ data, filename }); // Return both data and filename
            } else {
              resolve(JSON.parse(data));
            }
          } catch (e) {
            resolve({ data, filename }); // Default to returning both for non-JSON
          }
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', error => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Fetch and save a connection profile
 * @param {string} org - The organization name
 */
async function fetchConnectionProfile(org) {
  try {
    console.log(`Fetching connection profile for ${org}...`);
    const connectionProfile = await makeRequest(`/connection-profile/${org}`);
    const filePath = path.join(CONNECTION_PROFILES_DIR, `connection-${org}.json`);
    fs.writeFileSync(filePath, JSON.stringify(connectionProfile, null, 2));
    console.log(`Saved connection profile to ${filePath}`);
  } catch (error) {
    console.error(`Error fetching connection profile for ${org}:`, error.message);
    throw error;
  }
}

/**
 * Fetch and save a certificate
 * @param {string} orgType - The organization type (peer or orderer)
 * @param {string} org - The organization name
 * @param {string} certType - The certificate type (ca or tlsca)
 */
async function fetchCertificate(orgType, org, certType) {
  try {
    console.log(`Fetching ${certType} certificate for ${orgType} ${org}...`);
    const response = await makeRequest(`/certs/${orgType}/${org}/${certType}`);

    // Handle the case where response might be an object with data property
    const certData = response.data || response;

    const orgDir = path.join(CERTS_DIR, org);
    if (!fs.existsSync(orgDir)) {
      fs.mkdirSync(orgDir, { recursive: true });
    }

    const fileName = `${certType}.pem`;
    const filePath = path.join(orgDir, fileName);
    fs.writeFileSync(filePath, certData);
    console.log(`Saved certificate to ${filePath}`);
  } catch (error) {
    console.error(`Error fetching certificate for ${orgType} ${org} ${certType}:`, error.message);
    throw error;
  }
}

/**
 * Fetch and save MSP files
 * @param {string} org - The organization name
 */
async function fetchMSPFiles(org) {
  const mspTypes = ['signcerts', 'keystore', 'cacerts', 'tlscacerts'];

  for (const mspType of mspTypes) {
    try {
      console.log(`Fetching ${mspType} for ${org}...`);
      const response = await makeRequest(`/msp/${org}/${mspType}`);

      // Check if we received an object with data and filename
      if (!response || !response.data) {
        console.warn(`Warning: No valid data received for ${mspType} for ${org}`);
        continue;
      }

      const orgDir = path.join(MSP_DIR, org, mspType);
      if (!fs.existsSync(orgDir)) {
        fs.mkdirSync(orgDir, { recursive: true });
      }

      // Use the original filename if provided, otherwise use a default name
      const filename = response.filename || `${mspType}.pem`;
      const filePath = path.join(orgDir, filename);

      fs.writeFileSync(filePath, response.data);
      console.log(`Saved ${mspType} to ${filePath} (as ${filename})`);
    } catch (error) {
      console.error(`Error fetching ${mspType} for ${org}:`, error.message);
      console.log(`Skipping ${mspType} for ${org} due to error`);
    }
  }
}

/**
 * Fetch and save an organization's MSP config.yaml
 * @param {string} org - The organization name
 */
async function fetchMSPConfig(org) {
  try {
    console.log(`Fetching MSP config for ${org}...`);
    const response = await makeRequest(`/msp-config/${org}`);

    // Extract the YAML content - handle both object response and direct string response
    const configYaml = response.data || response;

    if (!configYaml || configYaml.trim() === '') {
      console.warn(`Warning: Empty config.yaml received for ${org}`);
      return;
    }

    const orgMspDir = path.join(MSP_DIR, org);
    if (!fs.existsSync(orgMspDir)) {
      fs.mkdirSync(orgMspDir, { recursive: true });
    }

    const filePath = path.join(orgMspDir, 'config.yaml');
    fs.writeFileSync(filePath, configYaml);
    console.log(`Saved MSP config to ${filePath}`);
  } catch (error) {
    console.error(`Error fetching MSP config for ${org}:`, error.message);
    console.log(`Skipping MSP config for ${org} due to error`);
  }
}

/**
 * Fetch network status
 */
async function fetchNetworkStatus() {
  try {
    console.log('Fetching network status...');
    const status = await makeRequest('/status');
    console.log('Network Status:', JSON.stringify(status, null, 2));
    return status;
  } catch (error) {
    console.error('Error fetching network status:', error.message);
    throw error;
  }
}

/**
 * Fetch all resources
 */
async function fetchAllResources() {
  try {
    const status = await fetchNetworkStatus();
    if (!status.running) {
      console.error('Fabric network is not running on the EC2 instance!');
      process.exit(1);
    }

    const orgsResponse = await makeRequest('/organizations');
    const orgs = orgsResponse.organizations;

    for (const org of orgs) {
      await fetchConnectionProfile(org);
      await fetchCertificate('peer', org, 'ca');
      await fetchCertificate('peer', org, 'tlsca');
      await fetchMSPFiles(org);
      await fetchMSPConfig(org); // Add this line to fetch the config.yaml
    }

    await fetchCertificate('orderer', 'example', 'tlsca');

    console.log('\nAll Fabric resources have been successfully fetched!');
  } catch (error) {
    console.error('Error fetching resources:', error);
    process.exit(1);
  }
}

// Run the script
fetchAllResources();
