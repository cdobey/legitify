import { OrgName } from '@prisma/client';
import { Wallet, X509Identity } from 'fabric-network';
import fs from 'fs';
import path from 'path';
import { DatabaseWallet } from './db-wallet';

interface OrgConfig {
  name: string;
  mspId: string;
  caName: string;
}

const orgConfigs: { [key: string]: OrgConfig } = {
  orgissuer: {
    name: 'orgissuer',
    mspId: 'OrgIssuerMSP',
    caName: 'ca.orgissuer.com',
  },
  orgverifier: {
    name: 'orgverifier',
    mspId: 'OrgVerifierMSP',
    caName: 'ca.orgverifier.com',
  },
  orgholder: {
    name: 'orgholder',
    mspId: 'OrgHolderMSP',
    caName: 'ca.orgholder.com',
  },
};

// Mock implementation support
const isMockLedger = process.env.MOCK_LEDGER === 'true';

/**
 * Import admin identity from pre-generated crypto materials into the wallet
 * This is used when Fabric CA is not available
 */
async function importAdminIdentity(wallet: Wallet, orgConfig: OrgConfig): Promise<void> {
  const adminId = `${orgConfig.name}admin`;

  // Check if admin already exists in wallet
  const existingAdmin = await wallet.get(adminId);
  if (existingAdmin) {
    console.log(`Admin identity ${adminId} already exists in wallet`);
    return;
  }

  // Use environment variable paths for crypto materials
  const basePath =
    process.env.FABRIC_CERTIFICATES_PATH || 
    process.env.FABRIC_CONNECTION_PROFILE_PATH || 
    '/app/fabric-data/organizations/peerOrganizations';
  const adminMspPath = path.join(
    basePath,
    `${orgConfig.name}.com`,
    'users',
    `Admin@${orgConfig.name}.com`,
    'msp',
  );

  // Read certificate
  const certDir = path.join(adminMspPath, 'signcerts');
  const certFiles = fs.readdirSync(certDir);
  const certFile = certFiles.find(f => f.endsWith('.pem') || f.endsWith('-cert.pem'));
  if (!certFile) {
    throw new Error(`No certificate found in ${certDir}`);
  }
  const certificate = fs.readFileSync(path.join(certDir, certFile), 'utf8');

  // Read private key
  const keyDir = path.join(adminMspPath, 'keystore');
  const keyFiles = fs.readdirSync(keyDir);
  const keyFile = keyFiles.find(f => f.endsWith('_sk') || f.endsWith('.pem'));
  if (!keyFile) {
    throw new Error(`No private key found in ${keyDir}`);
  }
  const privateKey = fs.readFileSync(path.join(keyDir, keyFile), 'utf8');

  // Create and store admin identity
  const x509Identity: X509Identity = {
    credentials: {
      certificate,
      privateKey,
    },
    mspId: orgConfig.mspId,
    type: 'X.509',
  };

  await wallet.put(adminId, x509Identity);
  console.log(`Successfully imported admin identity ${adminId} for ${orgConfig.name}`);
}

export const enrollUser = async (
  userId: string,
  orgName: OrgName,
  issuerId?: string,
): Promise<void> => {
  if (isMockLedger) {
    console.log(`[MOCK] Enrolling user ${userId} with org ${orgName}...`);
    return;
  }
  try {
    console.log(`Enrolling user ${userId} with org ${orgName}...`);

    const org = orgConfigs[orgName.toLowerCase()];
    if (!org) {
      throw new Error(`Invalid organization: ${orgName}`);
    }

    const wallet = await DatabaseWallet.createInstance(org.name);

    const userIdentity = await wallet.get(userId);
    if (userIdentity) {
      console.log(`Identity for ${userId} already exists in ${org.name} wallet`);
      return;
    }

    // First, ensure admin identity is imported from pre-generated crypto
    try {
      await importAdminIdentity(wallet, org);
    } catch (err) {
      console.log(`Admin identity import note: ${err}`);
    }

    // Get admin identity for registering user
    const adminIdentity = await wallet.get(`${org.name}admin`);
    if (!adminIdentity) {
      throw new Error(`Admin for ${org.name} must be enrolled before registering users`);
    }

    // For simplicity in cryptogen-based setup (no Fabric CA),
    // we'll use the admin identity for all users in the same org.
    // This allows transactions to be submitted without Fabric CA.
    // In production with Fabric CA, each user would have their own identity.
    console.log(`Using admin identity for user ${userId} in ${org.name} (cryptogen mode)`);

    // Create user identity based on admin (same crypto materials)
    const x509Identity: X509Identity = {
      credentials: {
        certificate: (adminIdentity as X509Identity).credentials.certificate,
        privateKey: (adminIdentity as X509Identity).credentials.privateKey,
      },
      mspId: org.mspId,
      type: 'X.509',
    };

    // Import identity into wallet
    await wallet.put(userId, x509Identity);

    console.log(
      `Successfully enrolled user ${userId} with ${org.name} and imported into database wallet`,
    );
  } catch (error) {
    console.error(`Failed to enroll user ${userId}: ${error}`);
    throw error;
  }
};

export const updateIssuerIdentity = async (userId: string, issuerId: string): Promise<void> => {
  if (isMockLedger) {
    console.log(`[MOCK] Updated identity for user ${userId} with issuerId ${issuerId}`);
    return;
  }
  try {
    await enrollUser(userId, OrgName.orgissuer, issuerId);
    console.log(`Updated identity for user ${userId} with issuerId ${issuerId}`);
  } catch (error) {
    console.error(`Failed to update issuer identity: ${error}`);
    throw error;
  }
};

/**
 * Validates that all prerequisites for Fabric connectivity are in place
 * @param orgName The organization name to validate
 * @returns A validation result with success status and optional error message
 */
export function validateFabricPrerequisites(orgName: string): {
  success: boolean;
  error?: string;
} {
  if (isMockLedger) {
    return { success: true };
  }
  try {
    const connectionProfilePath = getConnectionProfilePath(orgName);

    if (!fs.existsSync(connectionProfilePath)) {
      return {
        success: false,
        error: `Connection profile not found at ${connectionProfilePath}. Ensure the fabric-data volume is correctly mounted.`,
      };
    }

    // Parse connection profile to validate content
    try {
      const ccp = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));

      // Check for required elements
      if (!ccp.peers || !ccp.organizations) {
        return {
          success: false,
          error: `Connection profile at ${connectionProfilePath} is missing required elements (peers or organizations).`,
        };
      }
    } catch (e) {
      return {
        success: false,
        error: `Failed to parse connection profile: ${e instanceof Error ? e.message : String(e)}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Tests connectivity with the Fabric network
 * @param orgName Organization name to test
 * @returns Promise resolving to connection status
 */
export async function testFabricConnection(
  orgName: string,
): Promise<{ connected: boolean; error?: string }> {
  if (isMockLedger) {
    return { connected: true };
  }
  try {
    // Validate prerequisites
    const validation = validateFabricPrerequisites(orgName);
    if (!validation.success) {
      return { connected: false, error: validation.error };
    }

    // Use node's built-in DNS to check hostname resolution
    const dns = require('dns');
    try {
      const peerHostname = `peer0.${orgName}.com`;
      await new Promise((resolve, reject) => {
        dns.lookup(peerHostname, (err: Error, address: string) => {
          if (err) reject(new Error(`Cannot resolve hostname ${peerHostname}: ${err.message}`));
          else resolve(address);
        });
      });
    } catch (dnsErr) {
      return {
        connected: false,
        error: `Hostname resolution issue: ${dnsErr instanceof Error ? dnsErr.message : String(dnsErr)}. Ensure the network is up and reachable.`,
      };
    }

    return { connected: true };
  } catch (error) {
    return {
      connected: false,
      error: `Failed to connect to Fabric network: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Gets the file path for the connection profile for a specific organization
 * @param orgName The organization name
 * @returns The path to the connection profile
 */
export function getConnectionProfilePath(orgName: string): string {
  const basePath =
    process.env.FABRIC_CERTIFICATES_PATH || 
    process.env.FABRIC_CONNECTION_PROFILE_PATH || 
    '/data/organizations/peerOrganizations';
    
  return path.join(basePath, `${orgName}.com`, `connection-${orgName}.json`);
}

/**
 * Gets the certificate path for a specific organization
 * @param orgName The organization name
 * @param certType The certificate type (ca or tlsca)
 * @returns The path to the certificate
 */
export function getCertificatePath(orgName: string, certType: 'ca' | 'tlsca'): string {
  const basePath =
    process.env.FABRIC_CERTIFICATES_PATH || 
    '/data/organizations/peerOrganizations';

  if (certType === 'ca') {
    return path.join(basePath, `${orgName}.com`, 'ca', `ca.${orgName}.com-cert.pem`);
  } else {
    return path.join(basePath, `${orgName}.com`, 'tlsca', `tlsca.${orgName}.com-cert.pem`);
  }
}

