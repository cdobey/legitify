import * as fs from "fs";
import * as path from "path";

import { Gateway, Wallets } from "fabric-network";

export async function getGateway(
  userId: string,
  orgName: string
): Promise<Gateway> {
  // Example: single connection profile for OrgUniversity.
  const ccpPath = path.resolve(
    __dirname,
    "../../../ledger/legitify-network/organizations/peerOrganizations/orguniversity.com/connection-orguniversity.json"
  );
  const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

  // wallet path
  const walletPath = path.join(__dirname, `../wallet/${orgName}`);
  const wallet = await Wallets.newFileSystemWallet(walletPath);

  // create gateway
  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: userId,
    discovery: { enabled: true, asLocalhost: true },
  });

  return gateway;
}
