import { getGateway } from '@/config/gateway';
import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { sha256 } from '@/utils/credential-utils';
import { RequestHandler, Response } from 'express';

/**
 * Verify a credential. Only accessible by users with role 'verifier'.
 */
export const verifyCredentialDocument: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'verifier') {
      res.status(403).json({ error: 'Only verifiers can verify credentials' });
      return;
    }

    const { email, base64File } = req.body as {
      email: string;
      base64File: string;
    };
    if (!email || !base64File) {
      res.status(400).json({ error: 'Missing email or base64File' });
      return;
    }

    // Find user by email
    const targetUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!targetUser) {
      res.json({
        verified: false,
        message: 'No user found with this email',
      });
      return;
    }

    const fileData = Buffer.from(base64File, 'base64');
    const uploadedHash = sha256(fileData);

    // Find all accepted credentials for this user
    const credentials = await prisma.credential.findMany({
      where: {
        holderId: targetUser.id,
        status: 'accepted',
      },
      include: {
        holder: {
          select: {
            username: true,
          },
        },
        issuer: {
          select: {
            orgName: true,
            id: true,
          },
        },
        issuerOrg: {
          select: {
            id: true,
            shorthand: true,
            logoUrl: true,
          },
        },
      },
    });

    // Create gateway connection
    const gateway = await getGateway(req.user.id, req.user.orgName?.toLowerCase() || '');
    const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'legitifychannel');
    const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'credentialCC');

    // Check each credential's hash
    for (const credential of credentials) {
      try {
        const result = await contract.evaluateTransaction(
          'VerifyHash',
          credential.id,
          uploadedHash,
        );
        const isVerified = (result as Buffer).toString() === 'true';

        if (isVerified) {
          gateway.disconnect();

          // Format ledger timestamp if it exists
          const formattedTimestamp = credential.ledgerTimestamp
            ? new Date(credential.ledgerTimestamp).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : 'Not specified';

          res.json({
            verified: true,
            message: 'Credential verified successfully',
            credentialId: credential.id,
            fileData: credential.fileData
              ? Buffer.from(credential.fileData).toString('base64')
              : null,
            details: {
              holderName: credential.holder.username,
              issuer: credential.issuerOrg?.shorthand || credential.issuer.orgName,
              issuerLogoUrl: credential.issuerOrg?.logoUrl || null,
              issuerId: credential.issuerOrg?.id || null,
              title: credential.title || 'Not specified',
              description: credential.description || 'Not specified',
              type: credential.type || 'credential',
              attributes: credential.attributes || {},
              ledgerTimestamp: formattedTimestamp,
              issuedAt: credential.createdAt.toISOString(),
            },
          });
          return;
        }
      } catch (error) {
        console.error(`Error verifying credential ${credential.id}:`, error);
        continue;
      }
    }

    gateway.disconnect();
    res.json({
      verified: false,
      message: 'No matching credential found',
    });
  } catch (error: any) {
    console.error('verifyCredentialDocument error:', error);
    res.status(500).json({ error: error.message });
  }
};
