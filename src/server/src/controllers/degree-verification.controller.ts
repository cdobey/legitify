import { getGateway } from '@/config/gateway';
import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { sha256 } from '@/utils/degree-utils';
import { RequestHandler, Response } from 'express';

/**
 * Verify a degree document. Only accessible by users with role 'employer'.
 */
export const verifyDegreeDocument: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'employer') {
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
            id: true,
          },
        },
        university: {
          select: {
            id: true,
            displayName: true,
            logoUrl: true,
          },
        },
      },
    });

    // Create gateway connection
    const gateway = await getGateway(req.user.id, req.user.orgName?.toLowerCase() || '');
    const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'legitifychannel');
    const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'degreeCC');

    // Check each document's hash
    for (const doc of docs) {
      try {
        const result = await contract.evaluateTransaction('VerifyHash', doc.id, uploadedHash);
        const isVerified = (result as Buffer).toString() === 'true';

        if (isVerified) {
          gateway.disconnect();

          // Format graduation date if it exists
          const graduationDateStr = doc.graduationDate
            ? new Date(doc.graduationDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : 'Not specified';

          res.json({
            verified: true,
            message: 'Document verified successfully',
            docId: doc.id,
            fileData: doc.fileData ? Buffer.from(doc.fileData).toString('base64') : null, // Include the file data in base64 format
            details: {
              studentName: doc.issuedToUser.username,
              university: doc.university?.displayName || doc.issuerUser.orgName,
              universityLogoUrl: doc.university?.logoUrl || null,
              universityId: doc.university?.id || null,
              degreeTitle: doc.degreeTitle || 'Not specified',
              fieldOfStudy: doc.fieldOfStudy || 'Not specified',
              honors: doc.honors || null,
              studentId: doc.studentId || null,
              graduationDate: graduationDateStr,
              issuer: doc.issuerUser.orgName,
              issuedAt: doc.createdAt.toISOString(),
            },
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
