import { getGateway } from '@/config/gateway';
import prisma from '@/prisma/client';
import { sha256 } from '@/utils/degree-utils';
import { Request, RequestHandler, Response } from 'express';

/**
 * Verify a degree document. Only accessible by users with role 'employer'.
 */
export const verifyDegreeDocument: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as { uid: string; role: string; orgName?: string };
    if (user.role !== 'employer') {
      res.status(403).json({ error: 'Only employers can verify documents' });
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

    // Find all accepted documents for this user
    const docs = await prisma.document.findMany({
      where: {
        issuedTo: targetUser.id,
        status: 'accepted',
      },
      include: {
        issuedToUser: {
          select: {
            username: true,
          },
        },
        issuerUser: {
          select: {
            orgName: true,
          },
        },
      },
    });

    // Create gateway connection
    const gateway = await getGateway(user.uid, user.orgName?.toLowerCase() || '');
    const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'legitifychannel');
    const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'degreeCC');

    // Check each document's hash
    for (const doc of docs) {
      try {
        const result = await contract.evaluateTransaction('VerifyHash', doc.id, uploadedHash);
        const isVerified = (result as Buffer).toString() === 'true';

        if (isVerified) {
          gateway.disconnect();
          res.json({
            verified: true,
            message: 'Document verified successfully',
            docId: doc.id,
          });
          return;
        }
      } catch (error) {
        console.error(`Error verifying doc ${doc.id}:`, error);
        continue;
      }
    }

    gateway.disconnect();
    res.json({
      verified: false,
      message: 'No matching document found',
    });
  } catch (error: any) {
    console.error('verifyDegreeDocument error:', error);
    res.status(500).json({ error: error.message });
  }
};
