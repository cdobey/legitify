import FabricCAServices from "fabric-ca-client";
import { Wallets } from "fabric-network";
import fs from "fs";
import path from "path";

async function main() {
  try {
    const orgName = "orguniversity";
    const ccpPath = path.resolve(
      __dirname,
      "../ledger/legitify-network/organizations/peerOrganizations/orguniversity.com/connection-orguniversity.json"
    );
    const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

    const caInfo = ccp.certificateAuthorities["ca.orguniversity.com"];
    const ca = new FabricCAServices(
      caInfo.url,
      { trustedRoots: caInfo.tlsCACerts.pem, verify: false },
      caInfo.caName
    );

    const walletPath = path.join(__dirname, `src/wallet/${orgName}`);
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const adminExists = await wallet.get("orguniversityadmin");
    if (adminExists) {
      console.log("Admin identity already exists in the wallet");
      return;
    }

    console.log("Enrolling admin user...");
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
      mspId: "OrgUniversityMSP",
      type: "X.509",
    };

    await wallet.put("orguniversityadmin", x509Identity);
    console.log(
      "Successfully enrolled admin user and imported it into the wallet"
    );
  } catch (error) {
    console.error(`Failed to enroll admin user: ${error}`);
    process.exit(1);
  }
}

main();
