import FabricCAServices from "fabric-ca-client";
import { Wallets } from "fabric-network";
import fs from "fs";
import path from "path";

interface Organization {
  name: string;
  mspId: string;
}

async function enrollAdmin(orgName: string, mspId: string): Promise<void> {
  try {
    // Construct paths based on organization
    const ccpPath = path.resolve(
      __dirname,
      `../ledger/legitify-network/organizations/peerOrganizations/${orgName}.com/connection-${orgName}.json`
    );
    const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

    const caInfo = ccp.certificateAuthorities[`ca.${orgName}.com`];
    const ca = new FabricCAServices(
      caInfo.url,
      { trustedRoots: caInfo.tlsCACerts.pem, verify: false },
      caInfo.caName
    );

    const walletPath = path.join(__dirname, `src/wallet/${orgName}`);
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const adminExists = await wallet.get(`${orgName}admin`);
    if (adminExists) {
      console.log(`Admin identity for ${orgName} already exists in the wallet`);
      return;
    }

    console.log(`Enrolling admin user for ${orgName}...`);
    console.log(`CA URL: ${caInfo.url}`);
    console.log(`Enrollment ID: admin`);
    console.log(`Enrollment Secret: adminpw`);

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
      `Successfully enrolled admin user for ${orgName} and imported it into the wallet`
    );
  } catch (error) {
    console.error(`Failed to enroll admin user for ${orgName}: ${error}`);
    throw error;
  }
}

async function main(): Promise<void> {
  try {
    // Define organizations and their MSP IDs
    const organizations: Organization[] = [
      { name: "orguniversity", mspId: "OrgUniversityMSP" },
      { name: "orgemployer", mspId: "OrgEmployerMSP" },
      { name: "orgindividual", mspId: "OrgIndividualMSP" },
    ];

    // Enroll admin for each organization
    for (const org of organizations) {
      await enrollAdmin(org.name, org.mspId);
    }
  } catch (error) {
    console.error(`Failed to enroll admin users: ${error}`);
    process.exit(1);
  }
}

main();
