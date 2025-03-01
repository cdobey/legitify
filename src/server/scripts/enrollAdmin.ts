import dotenv from "dotenv";
import FabricCAServices from "fabric-ca-client";
import fs from "fs";
import path from "path";
import { DatabaseWallet } from "../src/utils/db-wallet";

// Load environment variables
dotenv.config();

// Get the Fabric network IP from environment
const FABRIC_IP = process.env.FABRIC_IP || "localhost";

interface Organization {
  name: string;
  mspId: string;
}

async function enrollAdmin(orgName: string, mspId: string): Promise<void> {
  try {
    const rootDir = __dirname;

    // Construct paths based on organization
    const ccpPath = path.resolve(
      rootDir,
      `../../ledger/legitify-network/organizations/peerOrganizations/${orgName}.com/connection-${orgName}.json`
    );

    if (!fs.existsSync(ccpPath)) {
      throw new Error(`Connection profile not found at ${ccpPath}`);
    }

    const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
    const caInfo = ccp.certificateAuthorities[`ca.${orgName}.com`];

    if (!caInfo) {
      throw new Error(`CA info not found for ${orgName}`);
    }

    console.log(`Connecting to CA at: ${caInfo.url}`);
    const ca = new FabricCAServices(
      caInfo.url,
      { trustedRoots: caInfo.tlsCACerts.pem, verify: false },
      caInfo.caName
    );

    // Use database wallet
    console.log(`Using database wallet for ${orgName}`);
    const wallet = await DatabaseWallet.createInstance(orgName);

    const adminExists = await wallet.get(`${orgName}admin`);
    if (adminExists) {
      console.log(`Admin identity for ${orgName} already exists in the wallet`);
      return;
    }

    console.log(`Enrolling admin user for ${orgName}...`);

    const enrollment = await ca.enroll({
      enrollmentID: "admin",
      enrollmentSecret: "adminpw",
    });

    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: mspId,
      type: "X.509",
    };

    await wallet.put(`${orgName}admin`, x509Identity);
    console.log(
      `Successfully enrolled admin user for ${orgName} and imported it into the database wallet`
    );
  } catch (error) {
    console.error(`Failed to enroll admin user for ${orgName}:`, error);
    throw error;
  }
}

// Main function
async function main(): Promise<void> {
  try {
    const organizations: Organization[] = [
      { name: "orguniversity", mspId: "OrgUniversityMSP" },
      { name: "orgemployer", mspId: "OrgEmployerMSP" },
      { name: "orgindividual", mspId: "OrgIndividualMSP" },
    ];

    for (const org of organizations) {
      await enrollAdmin(org.name, org.mspId);
    }
  } catch (error) {
    console.error(`Failed to enroll admin users:`, error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}
