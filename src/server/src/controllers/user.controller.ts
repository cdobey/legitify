import FabricCAServices from "fabric-ca-client";
import { RequestHandler } from "express";
import User from "../database/models/user.model";
import { Wallets } from "fabric-network";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";

export const registerUser: RequestHandler = async (req, res) => {
  try {
    const { username, password, role, orgName } = req.body;
    if (!username || !password || !role || !orgName) {
      res.status(400).json({
        error: "username, password, role, orgName are required",
      });
      return;
    }

    const existing = await User.findOne({ where: { username } });
    if (existing) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      passwordHash,
      role,
      orgName,
    });

    // Register/Enroll with Fabric CA
    const ccpPath = path.resolve(
      __dirname,
      "../../../ledger/legitify-network/organizations/peerOrganizations/orguniversity.com/connection-orguniversity.json"
    );
    const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
    const caInfo = ccp.certificateAuthorities["ca.orguniversity.com"];
    const ca = new FabricCAServices(
      caInfo.url,
      { trustedRoots: caInfo.tlsCACerts.pem, verify: false },
      caInfo.caName
    );

    const walletPath = path.join(__dirname, `../wallet/${orgName}`);
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const adminIdentity = await wallet.get("orguniversityadmin");
    if (!adminIdentity) {
      throw new Error("Admin identity not found in wallet");
    }

    const userExists = await wallet.get(username);
    if (userExists) {
      // Already enrolled
      res.status(201).json(newUser);
      return;
    }

    // Register + enroll the user
    const provider = wallet
      .getProviderRegistry()
      .getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(
      adminIdentity,
      "orguniversityadmin"
    );

    const secret = await ca.register(
      {
        enrollmentID: username,
        affiliation: `${orgName.toLowerCase()}.department1`,
        role: "client",
        attrs: [{ name: "role", value: role, ecert: true }],
      },
      adminUser
    );

    const enrollment = await ca.enroll({
      enrollmentID: username,
      enrollmentSecret: secret,
    });
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: `${orgName}MSP`,
      type: "X.509",
    };

    await wallet.put(username, x509Identity);

    console.log(`Registered & enrolled user ${username} on Fabric CA`);
    res.status(201).json(newUser);
  } catch (error: any) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getUser: RequestHandler = async (req, res) => {
  try {
    const { username } = req.user!;
    const user = await User.findOne({ where: { username } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (error: any) {
    console.error("Error getting user:", error);
    res.status(500).json({ error: error.message });
  }
};
