import * as fs from "fs";
import * as path from "path";

import { Gateway, Network, Wallets } from "fabric-network";

export async function getNetwork(
  ccpPath: string,
  walletPath: string,
  userId: string,
  channelName: string,
  chaincodeName: string
): Promise<{ network: Network; gateway: Gateway }> {
  // 1. Load connection profile
  const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

  // 2. Setup the wallet
  const wallet = await Wallets.newFileSystemWallet(walletPath);

  // 3. Check if user is enrolled
  const identity = await wallet.get(userId);
  if (!identity) {
    throw new Error(`Identity for user ${userId} not found in wallet`);
  }

  // 4. Create a new gateway and connect
  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: userId,
    discovery: { enabled: true, asLocalhost: true },
  });

  // 5. Get network (channel) and contract (chaincode)
  const network = await gateway.getNetwork(channelName);

  return { network, gateway };
}
