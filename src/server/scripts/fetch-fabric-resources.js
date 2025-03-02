/**
 * Fetch Fabric resources from the EC2 resource server
 * This script gets the connection profiles and certificates needed to connect to the Fabric network
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// Configuration
const EC2_IP = process.env.EC2_IP || "176.34.66.195";
const RESOURCE_SERVER_PORT = process.env.RESOURCE_SERVER_PORT || 8080;
const RESOURCE_SERVER_URL = `http://${EC2_IP}:${RESOURCE_SERVER_PORT}`;
const CONNECTION_PROFILES_DIR = path.resolve(
  __dirname,
  "../src/connectionProfiles"
);
const CERTS_DIR = path.resolve(__dirname, "../src/certificates");

// Ensure directories exist
if (!fs.existsSync(CONNECTION_PROFILES_DIR)) {
  fs.mkdirSync(CONNECTION_PROFILES_DIR, { recursive: true });
}

if (!fs.existsSync(CERTS_DIR)) {
  fs.mkdirSync(CERTS_DIR, { recursive: true });
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

    // Choose http or https based on the URL
    const client = url.startsWith("https") ? https : http;

    const req = client.get(url, { rejectUnauthorized: false }, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            // Try to parse as JSON if it's not a certificate
            if (res.headers["content-type"] === "application/x-pem-file") {
              resolve(data);
            } else {
              resolve(JSON.parse(data));
            }
          } catch (e) {
            // If parsing fails, return raw data
            resolve(data);
          }
        } else {
          reject(
            new Error(
              `Request failed with status code ${res.statusCode}: ${data}`
            )
          );
        }
      });
    });

    req.on("error", (error) => {
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

    // Ensure the organization name case is consistent in all parts of the connection profile
    const orgLower = org.toLowerCase();
    const orgCapitalized = orgLower.charAt(0).toUpperCase() + orgLower.slice(1);
    const mspId = `${orgCapitalized}MSP`;

    // Ensure specific keys are present
    if (!connectionProfile.channels) {
      console.log(
        `Adding missing channels section to ${org} connection profile`
      );
      connectionProfile.channels = {
        mychannel: {
          orderers: ["orderer.example.com"],
          peers: {},
        },
      };

      // Add current org's peer to channel
      connectionProfile.channels.mychannel.peers = {
        [`peer0.${orgLower}.com`]: {
          endorsingPeer: true,
          chaincodeQuery: true,
          ledgerQuery: true,
          eventSource: true,
        },
      };
    }

    // Ensure orderers section exists
    if (!connectionProfile.orderers) {
      console.log(
        `Adding missing orderers section to ${org} connection profile`
      );
      connectionProfile.orderers = {
        "orderer.example.com": {
          url: `grpcs://${EC2_IP}:7050`,
          tlsCACerts: {
            pem:
              "-----BEGIN CERTIFICATE-----\n" +
              (await makeRequest(`/certs/orderer/example/tlsca`)) +
              "\n-----END CERTIFICATE-----\n",
          },
          grpcOptions: {
            "ssl-target-name-override": "orderer.example.com",
            hostnameOverride: "orderer.example.com",
            "grpc.keepalive_time_ms": 120000,
            "grpc.keepalive_timeout_ms": 20000,
            "grpc.http2.min_time_between_pings_ms": 120000,
            "grpc.http2.max_pings_without_data": 0,
          },
        },
      };
    }

    // Add additional grpcOptions if they don't exist
    if (connectionProfile.peers[`peer0.${orgLower}.com`]?.grpcOptions) {
      const grpcOptions =
        connectionProfile.peers[`peer0.${orgLower}.com`].grpcOptions;
      if (!grpcOptions["grpc.keepalive_time_ms"]) {
        grpcOptions["grpc.keepalive_time_ms"] = 120000;
        grpcOptions["grpc.keepalive_timeout_ms"] = 20000;
        grpcOptions["grpc.http2.min_time_between_pings_ms"] = 120000;
        grpcOptions["grpc.http2.max_pings_without_data"] = 0;
      }
    }

    const filePath = path.join(
      CONNECTION_PROFILES_DIR,
      `connection-${orgLower}.json`
    );
    fs.writeFileSync(filePath, JSON.stringify(connectionProfile, null, 2));
    console.log(`Saved connection profile to ${filePath}`);
  } catch (error) {
    console.error(
      `Error fetching connection profile for ${org}:`,
      error.message
    );
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
    const cert = await makeRequest(`/certs/${orgType}/${org}/${certType}`);

    // Create org directory if it doesn't exist
    const orgDir = path.join(CERTS_DIR, org);
    if (!fs.existsSync(orgDir)) {
      fs.mkdirSync(orgDir, { recursive: true });
    }

    const fileName = `${certType}.pem`;
    const filePath = path.join(orgDir, fileName);
    fs.writeFileSync(filePath, cert);
    console.log(`Saved certificate to ${filePath}`);
  } catch (error) {
    console.error(
      `Error fetching certificate for ${orgType} ${org} ${certType}:`,
      error.message
    );
    throw error;
  }
}

/**
 * Fetch network status
 */
async function fetchNetworkStatus() {
  try {
    console.log("Fetching network status...");
    const status = await makeRequest("/status");
    console.log("Network Status:", JSON.stringify(status, null, 2));
    return status;
  } catch (error) {
    console.error("Error fetching network status:", error.message);
    throw error;
  }
}

/**
 * Fetch all resources
 */
async function fetchAllResources() {
  try {
    // First check if network is running
    const status = await fetchNetworkStatus();
    if (!status.running) {
      console.error("Fabric network is not running on the EC2 instance!");
      process.exit(1);
    }

    // Get list of organizations
    const orgsResponse = await makeRequest("/organizations");
    const orgs = orgsResponse.organizations;

    // Fetch resources for each organization
    for (const org of orgs) {
      // Fetch connection profile
      await fetchConnectionProfile(org);

      // Fetch certificates
      await fetchCertificate("peer", org, "ca");
      await fetchCertificate("peer", org, "tlsca");
    }

    // Fetch orderer certificate
    await fetchCertificate("orderer", "example", "tlsca");

    console.log("\nAll Fabric resources have been successfully fetched!");
  } catch (error) {
    console.error("Error fetching resources:", error);
    process.exit(1);
  }
}

// Run the script
fetchAllResources();
