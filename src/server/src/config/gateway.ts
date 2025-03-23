import { Gateway } from 'fabric-network';
import fs from 'fs';
import { DatabaseWallet } from '../utils/db-wallet';
import { getConnectionProfilePath, validateFabricPrerequisites } from '../utils/fabric-helpers';

/**
 * Establishes a connection to the Fabric network using the specified user and organization.
 * @param userId - The user ID.
 * @param orgName - The organization name.
 * @returns A connected Gateway instance.
 */
export async function getGateway(userId: string, orgName: string): Promise<Gateway> {
  // Validate prerequisites
  const validation = validateFabricPrerequisites(orgName);
  if (!validation.success) {
    throw new Error(`Failed to connect to Fabric network: ${validation.error}`);
  }

  // Path to the connection profile
  const ccpPath = getConnectionProfilePath(orgName);
  const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

  // Use database wallet
  const wallet = await DatabaseWallet.createInstance(orgName);

  // Check if user identity exists
  const identityExists = await wallet.get(userId);
  if (!identityExists) {
    throw new Error(
      `Identity for user ${userId} not found in wallet for ${orgName}. User may need to be enrolled first.`,
    );
  }

  try {
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: userId,
      discovery: { enabled: false, asLocalhost: false }, // Set to false for remote network - Would be nice to revisit this and see if we can get discovery working
      eventHandlerOptions: {
        commitTimeout: 600, // 10 minutes (increased from 5)
        endorseTimeout: 300, // 5 minutes (increased from 2)
      },
      'connection-options': {
        grpc: {
          'grpc.keepalive_timeout_ms': 30000, // 30 seconds
          'grpc.keepalive_time_ms': 60000, // 60 seconds
          'grpc.http2.min_time_between_pings_ms': 60000, // 60 seconds
          'grpc.max_receive_message_length': 100 * 1024 * 1024, // 100MB
          'grpc.max_send_message_length': 100 * 1024 * 1024, // 100MB
          'grpc-wait-for-ready': true,
          // Add these options for better orderer failover
          'grpc.max_reconnect_backoff_ms': 5000,
          'grpc.initial_reconnect_backoff_ms': 1000,
          'grpc.keepalive_permit_without_calls': 1,
        },
      },
    });

    return gateway;
  } catch (error) {
    console.error(`Failed to connect to gateway for ${userId} in ${orgName}:`, error);
    throw new Error(
      `Failed to connect to Fabric network: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
