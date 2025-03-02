import FabricCAServices from "fabric-ca-client";
import fs from "fs";
import path from "path";
import { DatabaseWallet } from "../src/utils/db-wallet";

interface Organization {
  name: string;
  mspId: string;
}

async function enrollAdmin(orgName: string, mspId: string): Promise<void> {
  try {
    // Get the absolute path of the project root directory
    const serverDir = path.resolve(__dirname, "..");

    // First try to get the connection profile from the server's connectionProfiles directory
    // which is populated by the fetch-fabric-resources script
    let ccpPath = path.resolve(
      serverDir,
      `src/connectionProfiles/connection-${orgName}.json`
    );

    // If the file doesn't exist, fall back to the ledger directory
    if (!fs.existsSync(ccpPath)) {
      console.log(
        `Connection profile not found at ${ccpPath}, trying ledger directory...`
      );
      ccpPath = path.resolve(
        serverDir,
        `../ledger/legitify-network/organizations/peerOrganizations/${orgName}.com/connection-${orgName}.json`
      );
    }

    if (!fs.existsSync(ccpPath)) {
      throw new Error(`Connection profile not found at ${ccpPath}`);
    }

    console.log(`Using connection profile from: ${ccpPath}`);
    const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
    const caInfo = ccp.certificateAuthorities[`ca.${orgName}.com`];

    if (!caInfo) {
      throw new Error(`CA info not found for ${orgName}`);
    }

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
