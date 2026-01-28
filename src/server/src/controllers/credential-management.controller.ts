import { getGateway } from '@/config/gateway';
import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import {
    FABRIC_CHAINCODE,
    FABRIC_CHANNEL,
    getUserInfo,
    sha256,
    submitFabricTransaction,
    validateUserRole,
} from '@/utils/credential-utils';
import { RequestHandler, Response } from 'express';

/**
 * Issues a credential to a user.
 * Only accessible by users with role 'issuer'.
 */
export const issueCredential: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    validateUserRole(req.user, 'issuer');
    const userInfo = getUserInfo(req);

    const {
      email,
      base64File,
      title,
      description,
      expirationDate,
      type,
      attributes,
      issuerOrgId,
      achievementDate,
      programLength,
      domain,
    } = req.body;

    if (!email || !base64File || !title || !type || !issuerOrgId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Validate achievement date is not in the future
    if (achievementDate) {
      const achievementDateTime = new Date(achievementDate);
      const currentDate = new Date();

      if (achievementDateTime > currentDate) {
        res.status(400).json({ error: 'Achievement date cannot be in the future' });
        return;
      }
    }

    // Find the holder by email
    const holder = await prisma.user.findUnique({
      where: { email },
    });

    if (!holder) {
      res.status(404).json({ error: 'Recipient not found' });
      return;
    }

    // Verify the user is a member of the issuer organization
    const issuerMembership = await prisma.issuerMember.findFirst({
      where: {
        userId: userInfo.id,
        issuerId: issuerOrgId,
        status: 'active',
      },
    });

    if (!issuerMembership) {
      res.status(403).json({ error: 'Not authorized to issue credentials for this organization' });
      return;
    }

    // Generate a unique document ID
    const docId = `${issuerOrgId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    // Decode file from base64
    const fileBuffer = Buffer.from(base64File, 'base64');

    // Generate document hash
    const docHash = sha256(fileBuffer);

    // Submit to blockchain
    let txId = '';
    
    if (process.env.MOCK_LEDGER === 'true') {
        console.log(`[MOCK] Issuing credential ${docId} for user ${holder.id}`);
        txId = `mock_tx_${Date.now()}`;
    } else {
        // Connect to Fabric
        const gateway = await getGateway(userInfo.id, userInfo.orgName?.toLowerCase() || '');
        const network = await gateway.getNetwork(FABRIC_CHANNEL);
        const contract = network.getContract(FABRIC_CHAINCODE);

        // Convert attributes to JSON string for chaincode
        const attributesJSON = JSON.stringify(attributes || {});

        const transaction = contract.createTransaction('IssueCredential');
        txId = transaction.getTransactionId();

        await transaction.submit(
          docId,
          docHash,
          holder.id,
          userInfo.id,
          issuerOrgId,
          type,
          title,
          description || '',
          achievementDate || '',
          expirationDate || '',
          programLength || '',
          domain || '',
          attributesJSON,
        );

        gateway.disconnect();
    }

    const credential = await prisma.credential.create({
      data: {
        id: docId,
        docId,
        docHash,
        type,
        title,
        description,
        holderId: holder.id,
        issuerId: userInfo.id,
        issuerOrgId,
        fileData: fileBuffer,
        status: 'issued',
        achievementDate: achievementDate ? new Date(achievementDate) : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        programLength,
        domain,
        attributes: attributes || {},
        ledgerTimestamp: new Date().toISOString(), // Temporary value, will be updated
        txId: txId,
      },
    });

    // Return response
    res.status(201).json({
      message: 'Credential issued successfully',
      docId: credential.id,
      docHash,
    });
  } catch (error: any) {
    console.error('issueCredential error:', error);
    res.status(500).json({ error: error.message || 'Failed to issue credential' });
  }
};

/**
 * Holder accepts a credential
 */
export const acceptCredential: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    validateUserRole(req.user, 'holder');
    const userInfo = getUserInfo(req);

    const { docId } = req.body;
    if (!docId) {
      res.status(400).json({ error: 'Missing docId' });
      return;
    }

    // Check if credential exists and belongs to user
    const credential = await prisma.credential.findUnique({
      where: { id: docId },
    });

    if (!credential) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }

    if (credential.holderId !== userInfo.id) {
      res.status(403).json({ error: 'Not authorized to accept this credential' });
      return;
    }

    // Update blockchain
    await submitFabricTransaction(userInfo.id, userInfo.orgName, 'AcceptCredential', docId);

    // Update database
    await prisma.credential.update({
      where: { id: docId },
      data: { status: 'accepted' },
    });

    res.json({ message: 'Credential accepted successfully' });
  } catch (error: any) {
    console.error('acceptCredential error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Holder denies a credential
 */
export const denyCredential: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    validateUserRole(req.user, 'holder');
    const userInfo = getUserInfo(req);

    const { docId } = req.body;
    if (!docId) {
      res.status(400).json({ error: 'Missing docId' });
      return;
    }

    // Check if credential exists and belongs to user
    const credential = await prisma.credential.findUnique({
      where: { id: docId },
    });

    if (!credential) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }

    if (credential.holderId !== userInfo.id) {
      res.status(403).json({ error: 'Not authorized to deny this credential' });
      return;
    }

    // Update blockchain
    await submitFabricTransaction(userInfo.id, userInfo.orgName, 'DenyCredential', docId);

    // Update database
    await prisma.credential.update({
      where: { id: docId },
      data: { status: 'denied' },
    });

    res.json({ message: 'Credential denied successfully' });
  } catch (error: any) {
    console.error('denyCredential error:', error);
    res.status(500).json({ error: error.message });
  }
};
