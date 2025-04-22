import { getGateway } from '@/config/gateway';
import { RequestUser, RequestWithUser } from '@/types/user.types';
import crypto from 'crypto';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
export const FABRIC_CHANNEL = process.env.FABRIC_CHANNEL || 'legitifychannel';
export const FABRIC_CHAINCODE = process.env.FABRIC_CHAINCODE || 'credentialCC';

export function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function submitFabricTransaction(
  userId: string,
  orgName: string,
  transactionName: string,
  ...args: string[]
): Promise<void> {
  const gateway = await getGateway(userId, orgName.toLowerCase());
  try {
    const network = await gateway.getNetwork(FABRIC_CHANNEL);
    const contract = network.getContract(FABRIC_CHAINCODE);
    await contract.submitTransaction(transactionName, ...args);
  } finally {
    gateway.disconnect();
  }
}

export function processCredentialFile(base64File: string): { fileData: Buffer; docHash: string } {
  const decodedFile = Buffer.from(base64File, 'base64');
  if (decodedFile.length > MAX_FILE_SIZE) {
    throw new Error('File size must be less than 5MB');
  }
  const fileData = Buffer.from(base64File, 'base64');
  const docHash = sha256(fileData);
  return { fileData, docHash };
}

export function validateUserRole(user: RequestUser | undefined, requiredRole: string): void {
  if (!user) {
    throw new Error('User not authenticated');
  }
  if (user.role !== requiredRole) {
    throw new Error(`Only ${requiredRole} can perform this action`);
  }
}

export function getUserInfo(req: RequestWithUser): { id: string; role: string; orgName: string } {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return {
    id: req.user.id,
    role: req.user.role,
    orgName: req.user.orgName || '',
  };
}
