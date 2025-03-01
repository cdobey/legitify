import dotenv from "dotenv";
import { Gateway } from "fabric-network";
import fs from "fs";
import path from "path";
import { DatabaseWallet } from "../utils/db-wallet";

// Load environment variables
dotenv.config();

// Get the Fabric network IP from environment
const FABRIC_IP = process.env.FABRIC_IP || "localhost";
const AS_LOCALHOST = process.env.AS_LOCALHOST === "true";

/**
 * Establishes a connection to the Fabric network using the specified user and organization.
 * @param userId - The user ID.
 * @param orgName - The organization name.
 * @returns A connected Gateway instance.
 */
export async function getGateway(
  userId: string,
  orgName: string
): Promise<Gateway> {
  // Path to the connection profile
  const ccpPath = path.resolve(
    __dirname,
    `../../../ledger/legitify-network/organizations/peerOrganizations/${orgName}.com/connection-${orgName}.json`
  );
  const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

  // Replace localhost with EC2 IP address in connection profile if needed
  if (FABRIC_IP !== "localhost") {
    console.log(`Using remote Fabric network at ${FABRIC_IP}`);
  }

  // Use database wallet
  const wallet = await DatabaseWallet.createInstance(orgName);

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: userId,
    discovery: { enabled: true, asLocalhost: AS_LOCALHOST }, // Set to false for production deployment
  });

  return gateway;
}
