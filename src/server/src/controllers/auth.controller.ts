import { Request, RequestHandler, Response } from "express";
import { Wallets, X509Identity } from "fabric-network";

import FabricCAServices from "fabric-ca-client";
import bcrypt from "bcrypt";
import fs from "fs";
import jwt from "jsonwebtoken";
import path from "path";
import prisma from "../prisma/client";
import { v4 as uuidv4 } from "uuid";

// Organization Configuration Interface
interface OrganizationConfig {
  connectionPath: string;
  caName: string;
  mspId: string;
  adminId: string;
}

// Organization Configurations
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
export const register: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  let newUser: any; // To track if the user was created in DB
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

    // Check if user already exists in the database
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    // Register/Enroll with Fabric CA first
    const ccpPath = path.resolve(
      __dirname,
      `../../../ledger/legitify-network/organizations/peerOrganizations/${orgConfig.connectionPath}`
    );
    if (!fs.existsSync(ccpPath)) {
      res.status(500).json({ error: "Connection profile not found" });
      return;
    }
    const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
    const caInfo = ccp.certificateAuthorities[orgConfig.caName];
    if (!caInfo) {
      res
        .status(500)
        .json({ error: "CA information not found in connection profile" });
      return;
    }

    const ca = new FabricCAServices(
      caInfo.url,
      { trustedRoots: caInfo.tlsCACerts.pem, verify: false },
      caInfo.caName
    );

    const walletPath = path.join(__dirname, `../wallet/${orgName}`);
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const adminIdentity = await wallet.get(orgConfig.adminId);
    if (!adminIdentity) {
      res
        .status(500)
        .json({ error: `Admin identity for ${orgName} not found in wallet` });
      return;
    }

    // Generate a new user ID
    const userId = uuidv4();

    const userExistsInWallet = await wallet.get(userId);
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
    if (orgName.toLowerCase() === "orgindividual") {
      affiliation = `${orgName.toLowerCase()}.user`;
    } else if (orgName.toLowerCase() === "orgemployer") {
      affiliation = `${orgName.toLowerCase()}.company`;
    }

    // Register the user with Fabric CA
    const secret = await ca.register(
      {
        enrollmentID: userId,
        affiliation: affiliation,
        role: "client",
        attrs: [{ name: "role", value: role, ecert: true }],
      },
      adminUser
    );

    // Enroll the user and get certificates
    const enrollment = await ca.enroll({
      enrollmentID: userId,
      enrollmentSecret: secret,
    });

    const x509Identity: X509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: orgConfig.mspId,
      type: "X.509",
    };

    // Put the new identity into the wallet using the user ID
    await wallet.put(userId, x509Identity);

    console.log(
      `Registered & enrolled user ${username} with ID ${userId} on Fabric CA for ${orgName}`
    );

    // Now, create the user in the database
    const passwordHash = await bcrypt.hash(password, 10);
    newUser = await prisma.user.create({
      data: {
        id: userId,
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

    // If user was created in the database but Fabric CA enrollment failed, delete the user from the DB
    if (newUser) {
      try {
        await prisma.user.delete({
          where: { username: newUser.username },
        });
        console.log(
          `Rolled back user ${newUser.username} from the database due to Fabric CA error.`
        );
      } catch (rollbackError) {
        console.error(
          `Failed to rollback user ${newUser.username} from the database:`,
          rollbackError
        );
      }
    }

    res.status(500).json({ error: error.message });
  }
};

/**
 * Handles user login and JWT issuance.
 */
export const login: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Create JWT
    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        orgName: user.orgName,
      },
      process.env.JWT_SECRET || "fallbacksecret",
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
