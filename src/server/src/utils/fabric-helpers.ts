import FabricCAServices from "fabric-ca-client";
import { X509Identity } from "fabric-network";
import fs from "fs";
import path from "path";
import { DatabaseWallet } from "./db-wallet";

interface OrgConfig {
  name: string;
  mspId: string;
  caName: string;
}

const orgConfigs: { [key: string]: OrgConfig } = {
  orguniversity: {
    name: "orguniversity",
    mspId: "OrgUniversityMSP",
    caName: "ca.orguniversity.com",
  },
  orgemployer: {
    name: "orgemployer",
    mspId: "OrgEmployerMSP",
    caName: "ca.orgemployer.com",
  },
  orgindividual: {
    name: "orgindividual",
    mspId: "OrgIndividualMSP",
    caName: "ca.orgindividual.com",
  },
};

export async function enrollUser(
  userId: string,
  orgName: string
): Promise<void> {
  try {
    const org = orgConfigs[orgName.toLowerCase()];
    if (!org) {
      throw new Error(`Invalid organization: ${orgName}`);
    }

    // Load the network configuration
    const ccpPath = path.resolve(
      __dirname,
      `../../../ledger/legitify-network/organizations/peerOrganizations/${org.name}.com/connection-${org.name}.json`
    );
    const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

    // Create a new CA client for interacting with the CA
    const caURL = ccp.certificateAuthorities[org.caName].url;
    const ca = new FabricCAServices(caURL);

    // Create a wallet using the database
    const wallet = await DatabaseWallet.createInstance(org.name);

    // Check if user already exists in wallet
    const userIdentity = await wallet.get(userId);
    if (userIdentity) {
      console.log(
        `Identity for ${userId} already exists in ${org.name} wallet`
      );
      return;
    }

    // Get admin identity for registering user
    const adminIdentity = await wallet.get(`${org.name}admin`);
    if (!adminIdentity) {
      throw new Error(
        `Admin for ${org.name} must be enrolled before registering users`
      );
    }

    // Register and enroll the user
    const provider = wallet
      .getProviderRegistry()
      .getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(
      adminIdentity,
      `${org.name}admin`
    );

    // Register user with CA
    const secret = await ca.register(
      {
        affiliation: `${org.name}.department1`,
        enrollmentID: userId,
        role: "client",
      },
      adminUser
    );

    // Enroll user with CA
    const enrollment = await ca.enroll({
      enrollmentID: userId,
      enrollmentSecret: secret,
    });

    // Create user identity
    const x509Identity: X509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: org.mspId,
      type: "X.509",
    };

    // Import identity into wallet
    await wallet.put(userId, x509Identity);

    console.log(
      `Successfully enrolled user ${userId} with ${org.name} and imported into database wallet`
    );
  } catch (error) {
    console.error(`Failed to enroll user ${userId}: ${error}`);
    throw error;
  }
}
