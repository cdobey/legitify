import FabricCAServices from "fabric-ca-client";
import { RequestHandler } from "express";
import { Wallets } from "fabric-network";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import prisma from "../prisma/client";

interface OrganizationConfig {
  connectionPath: string;
  caName: string;
  mspId: string;
  adminId: string;
}

const organizationConfigs: Record<string, OrganizationConfig> = {
  orguniversity: {
    connectionPath: "orguniversity.com/connection-orguniversity.json",
    caName: "ca.orguniversity.com",
    mspId: "OrgUniversityMSP",
    adminId: "orguniversityadmin",
  },
  orgemployer: {
    connectionPath: "orgemployer.com/connection-orgemployer.json",
    caName: "ca.orgemployer.com",
    mspId: "OrgEmployerMSP",
    adminId: "orgemployeradmin",
  },
  orgindividual: {
    connectionPath: "orgindividual.com/connection-orgindividual.json",
    caName: "ca.orgindividual.com",
    mspId: "OrgIndividualMSP",
    adminId: "orgindividualadmin",
  },
};

/**
 * Registers a new user and enrolls them with Fabric CA.
 */
export const registerUser: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { username, password, role, orgName } = req.body;

    // Validate input
    if (!username || !password || !role || !orgName) {
      res.status(400).json({
        error: "username, password, role, orgName are required",
      });
      return;
    }

    // Validate organization
    const orgConfig = organizationConfigs[orgName.toLowerCase()];
    if (!orgConfig) {
      res.status(400).json({
        error: "Invalid organization name",
      });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    // Register/Enroll with Fabric CA
    const ccpPath = path.resolve(
      __dirname,
      `../../../ledger/legitify-network/organizations/peerOrganizations/${orgConfig.connectionPath}`
    );
    const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
    const caInfo = ccp.certificateAuthorities[orgConfig.caName];
    const ca = new FabricCAServices(
      caInfo.url,
      { trustedRoots: caInfo.tlsCACerts.pem, verify: false },
      caInfo.caName
    );

    const walletPath = path.join(__dirname, `../wallet/${orgName}`);
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const adminIdentity = await wallet.get(orgConfig.adminId);
    if (!adminIdentity) {
      throw new Error(`Admin identity for ${orgName} not found in wallet`);
    }

    const userExistsInWallet = await wallet.get(username);
    if (userExistsInWallet) {
      res.status(400).json({ error: "User is already enrolled in the wallet" });
      return;
    }

    // Get admin user context
    const provider = wallet
      .getProviderRegistry()
      .getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(
      adminIdentity,
      orgConfig.adminId
    );

    // Determine affiliation based on organization and role
    let affiliation = `${orgName.toLowerCase()}.department1`;
    if (orgName === "orgindividual") {
      affiliation = `${orgName.toLowerCase()}.user`;
    } else if (orgName === "orgemployer") {
      affiliation = `${orgName.toLowerCase()}.company`;
    }

    // Register the user with Fabric CA
    const secret = await ca.register(
      {
        enrollmentID: username,
        affiliation: affiliation,
        role: "client",
        attrs: [{ name: "role", value: role, ecert: true }],
      },
      adminUser
    );

    // Enroll the user and get certificates
    const enrollment = await ca.enroll({
      enrollmentID: username,
      enrollmentSecret: secret,
    });

    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: orgConfig.mspId,
      type: "X.509",
    };

    // Put the new identity into the wallet
    await wallet.put(username, x509Identity);

    console.log(
      `Registered & enrolled user ${username} on Fabric CA for ${orgName}`
    );

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user in the database
    const newUser = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role,
        orgName,
      },
    });

    // Send response
    res.status(201).json(newUser);
  } catch (error: any) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getUser: RequestHandler = async (req, res) => {
  try {
    const { username } = req.user!;

    if (!username) {
      res.status(400).json({ error: "Username is required." });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
