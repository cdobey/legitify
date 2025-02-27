import { Gateway } from "fabric-network";
import fs from "fs";
import path from "path";
import { DatabaseWallet } from "../utils/db-wallet";

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
  // Path to the local connection profiles in the server config directory
  const ccpPath = path.resolve(
    __dirname,
    `../../config/connection-${orgName}.json`
  );
  const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

  // Use database wallet
  const wallet = await DatabaseWallet.createInstance(orgName);

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: userId,
    discovery: { enabled: true, asLocalhost: false }, // Set to false for remote network
  });

  return gateway;
}
