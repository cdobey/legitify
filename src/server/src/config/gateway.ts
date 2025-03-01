import { Gateway } from "fabric-network";
import fs from "fs";
import { DatabaseWallet } from "../utils/db-wallet";
import {
  getConnectionProfilePath,
  validateFabricPrerequisites,
} from "../utils/fabric-helpers";

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
  // Validate prerequisites
  const validation = validateFabricPrerequisites(orgName);
  if (!validation.success) {
    throw new Error(`Failed to connect to Fabric network: ${validation.error}`);
  }

  // Path to the connection profile
  const ccpPath = getConnectionProfilePath(orgName);
  const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

  // Use database wallet
  const wallet = await DatabaseWallet.createInstance(orgName);

  // Check if user identity exists
  const identityExists = await wallet.get(userId);
  if (!identityExists) {
    throw new Error(
      `Identity for user ${userId} not found in wallet for ${orgName}. User may need to be enrolled first.`
    );
  }

  try {
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: userId,
      discovery: { enabled: true, asLocalhost: false }, // Set to false for remote network
      eventHandlerOptions: {
        commitTimeout: 300, // 5 minutes
        endorseTimeout: 120, // 2 minutes
      },
    });

    return gateway;
  } catch (error) {
    console.error(
      `Failed to connect to gateway for ${userId} in ${orgName}:`,
      error
    );
    throw new Error(
      `Failed to connect to Fabric network: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
