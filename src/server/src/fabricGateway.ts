import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

import { Gateway, Wallets } from "fabric-network";

import { Logger } from "./logger";

dotenv.config();

export async function getNetwork() {
  // Base directory path for reuse
  const baseDir = path.resolve(
    __dirname,
    "/Users/chris.dobey/College/FYP/2025-csc1097-mannp2-dobeyc3/src/ledger/fabric-samples/test-network"
  );
  const org1Dir = path.join(
    baseDir,
    "organizations/peerOrganizations/org1.example.com"
  );

  // Configure paths relative to base directory
  const ccpPath = path.join(org1Dir, "connection-org1.json");
  const walletPath = org1Dir;
  const channelName = "mychannel";
  const chaincodeName = "degreeCC";
  const userId = "Admin@org1.example.com";

  // Validate paths and configuration
  if (!fs.existsSync(baseDir)) {
    Logger.error(`Base directory does not exist: ${baseDir}`);
    throw new Error(`Base directory does not exist: ${baseDir}`);
  }

  if (!fs.existsSync(ccpPath)) {
    Logger.error(`Connection profile not found: ${ccpPath}`);
    throw new Error(`Connection profile not found: ${ccpPath}`);
  }

  Logger.info("Environment Variables:", {
    ccpPath,
    walletPath,
    channelName,
    chaincodeName,
    userId,
  });

  // Load connection profile
  let ccp;
  try {
    ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
    Logger.info("Successfully loaded connection profile");
  } catch (error) {
    Logger.error(
      `Error loading connection profile: ${(error as Error).message}`
    );
    throw error;
  }

  // Setup the wallet
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  Logger.info("Wallet initialized at:", walletPath);

  // Load admin identity files
  const certPath = path.join(
    org1Dir,
    "users",
    userId,
    "msp/signcerts/cert.pem"
  );
  const keyDir = path.join(org1Dir, "users", userId, "msp/keystore");

  // Verify certificate path
  if (!fs.existsSync(certPath)) {
    Logger.error(`Certificate file not found: ${certPath}`);
    throw new Error(`Certificate file not found: ${certPath}`);
  }

  // Find and verify keystore file
  let keyFile;
  try {
    // Check if directory exists
    if (!fs.existsSync(keyDir)) {
      Logger.error(`Keystore directory does not exist: ${keyDir}`);
      throw new Error(`Keystore directory does not exist: ${keyDir}`);
    }

    // Read directory contents
    const keyFiles = fs.readdirSync(keyDir);
    Logger.info(`Found ${keyFiles.length} files in keystore directory`);

    // Find the private key file
    keyFile = keyFiles.find(
      (file) =>
        file.endsWith("_sk") ||
        file === "priv_sk" ||
        file.match(/^[0-9a-f]{64}_sk$/)
    );

    if (!keyFile) {
      Logger.error("No private key file found in keystore directory");
      throw new Error("No private key file found in keystore directory");
    }

    Logger.info(`Found private key file: ${keyFile}`);
  } catch (error) {
    Logger.error(`Error accessing keystore: ${(error as Error).message}`);
    Logger.error(`Attempted directory path: ${keyDir}`);
    throw error;
  }

  const keyPath = path.join(keyDir, keyFile);

  // Create admin identity
  try {
    const adminIdentity = {
      credentials: {
        certificate: fs.readFileSync(certPath).toString(),
        privateKey: fs.readFileSync(keyPath).toString(),
      },
      mspId: "Org1MSP",
      type: "X.509",
    };

    await wallet.put(userId, adminIdentity);
    Logger.info("Successfully stored admin identity in wallet");

    // Verify wallet contents
    const walletContents = await wallet.list();
    Logger.info("Wallet contents:", walletContents);

    // Check user identity
    const identity = await wallet.get(userId);
    if (!identity) {
      throw new Error(`Identity for the user ${userId} not found in wallet`);
    }
    Logger.info("Successfully retrieved identity from wallet");

    // Create and connect gateway
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: userId,
      discovery: { enabled: true, asLocalhost: true },
    });
    Logger.info("Successfully connected to gateway");

    // Get network and contract
    const network = await gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);
    Logger.info("Successfully connected to the network and contract");

    return { gateway, network, contract };
  } catch (error) {
    Logger.error(
      `Failed to setup network connection: ${(error as Error).message}`
    );
    throw error;
  }
}
