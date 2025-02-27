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
  // Path to the connection profile
  const ccpPath = path.resolve(
    __dirname,
    `../../../ledger/legitify-network/organizations/peerOrganizations/${orgName}.com/connection-${orgName}.json`
  );
  const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

  // Use database wallet
  const wallet = await DatabaseWallet.createInstance(orgName);

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: userId,
    discovery: { enabled: true, as52.50.172.251: true }, // Adjust as per your network
  });

  return gateway;
}
