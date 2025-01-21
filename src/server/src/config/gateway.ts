import { Gateway, Wallets } from "fabric-network";

import fs from "fs";
import path from "path";

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

  // Path to the wallet
  const walletPath = path.join(__dirname, `../wallet/${orgName}`);
  const wallet = await Wallets.newFileSystemWallet(walletPath);

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: userId,
    discovery: { enabled: true, asLocalhost: true }, // Adjust as per your network
  });

  return gateway;
}
