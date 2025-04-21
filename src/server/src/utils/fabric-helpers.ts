import { OrgName } from '@prisma/client';
import FabricCAServices from 'fabric-ca-client';
import { X509Identity } from 'fabric-network';
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

export const enrollUser = async (
  userId: string,
  orgName: OrgName,
  issuerId?: string,
): Promise<void> => {
  try {
    console.log(`Enrolling user ${userId} with org ${orgName}...`);

    // For issuer users, we'll add issuer ID as an attribute
    const attributes = [];
    if (orgName === OrgName.orgissuer && issuerId) {
      attributes.push({
        name: 'issuerId',
        value: issuerId,
        ecert: true,
      });
    }

    const org = orgConfigs[orgName.toLowerCase()];
    if (!org) {
      throw new Error(`Invalid organization: ${orgName}`);
    }

    const ccpPath = path.resolve(__dirname, `../connectionProfiles/connection-${org.name}.json`);
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const caURL = ccp.certificateAuthorities[org.caName].url;
    const ca = new FabricCAServices(caURL);

    const wallet = await DatabaseWallet.createInstance(org.name);

    const userIdentity = await wallet.get(userId);
    if (userIdentity) {
      console.log(`Identity for ${userId} already exists in ${org.name} wallet`);
      return;
    }

    // Get admin identity for registering user
    const adminIdentity = await wallet.get(`${org.name}admin`);
    if (!adminIdentity) {
      throw new Error(`Admin for ${org.name} must be enrolled before registering users`);
    }

    // Register and enroll the user
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, `${org.name}admin`);

    const registrationRequest: {
      enrollmentID: string;
      enrollmentSecret: string;
      role: string;
      affiliation: string;
      maxEnrollments: number;
      attrs?: { name: string; value: string; ecert: boolean }[];
    } = {
      enrollmentID: userId,
      enrollmentSecret: '',
      role: 'client',
      affiliation: org.name,
      maxEnrollments: -1,
    };

    // Add attributes if needed
    if (attributes.length > 0) {
      registrationRequest['attrs'] = attributes;
    }

    // Register the user with the CA
    const secret = await ca.register(registrationRequest, adminUser);

    // When enrolling, include the requested attributes in the certificate
    const enrollmentRequest: FabricCAServices.IEnrollmentRequest = {
      enrollmentID: userId,
      enrollmentSecret: secret,
    };

    // If we have issuer attributes, request them to be included in the certificate
    if (attributes.length > 0) {
      enrollmentRequest.attr_reqs = [
        {
          name: 'issuerId',
          optional: false,
        },
      ];
    }

    // Enroll the user with the attribute request
    const enrollment = await ca.enroll(enrollmentRequest);

    // Create user identity
    const x509Identity: X509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
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
  try {
    // Check if connection profile exists
    const connectionProfilePath = path.resolve(
      __dirname,
      `../connectionProfiles/connection-${orgName}.json`,
    );

    if (!fs.existsSync(connectionProfilePath)) {
      return {
        success: false,
        error: `Connection profile not found at ${connectionProfilePath}. Run fetch-fabric-resources.js first.`,
      };
    }

    // Check if certificates directory exists
    const certsPath = path.resolve(__dirname, `../certificates/${orgName}`);

    if (!fs.existsSync(certsPath)) {
      return {
        success: false,
        error: `Certificates directory not found at ${certsPath}. Run fetch-fabric-resources.js first.`,
      };
    }

    // Parse connection profile to validate content
    try {
      const ccp = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));

      // Check for required elements
      if (!ccp.peers || !ccp.orderers || !ccp.certificateAuthorities) {
        return {
          success: false,
          error: `Connection profile is missing required elements. Run fetch-fabric-resources.js to get a complete profile.`,
        };
      }

      // Check that EC2 IP is used, not localhost
      const peerKey = Object.keys(ccp.peers)[0];
      if (peerKey && ccp.peers[peerKey].url.includes('test')) {
        return {
          success: false,
          error: `Connection profile contains test URLs. Run fetch-fabric-resources.js with proper EC2_IP environment variable.`,
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
  try {
    // Validate prerequisites
    const validation = validateFabricPrerequisites(orgName);
    if (!validation.success) {
      return { connected: false, error: validation.error };
    }

    // First try to ping the organizations's peer
    let peerPort;
    if (orgName === 'orgissuer') peerPort = 7051;
    else if (orgName === 'orgverifier') peerPort = 8051;
    else if (orgName === 'orgholder') peerPort = 9051;
    else return { connected: false, error: 'Unknown organization' };

    // Use node's built-in DNS to check hostname resolution
    const dns = require('dns');
    try {
      // Try to resolve peer hostname
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
        error:
          `Hostname resolution issue: ${
            dnsErr instanceof Error ? dnsErr.message : String(dnsErr)
          }\n` + `Add entries to /etc/hosts using: node src/server/scripts/update-hosts.js`,
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
  return path.resolve(__dirname, `../connectionProfiles/connection-${orgName}.json`);
}

/**
 * Gets the certificate path for a specific organization
 * @param orgName The organization name
 * @param certType The certificate type (ca or tlsca)
 * @returns The path to the certificate
 */
export function getCertificatePath(orgName: string, certType: 'ca' | 'tlsca'): string {
  return path.resolve(__dirname, `../certificates/${orgName}/${certType}.pem`);
}
