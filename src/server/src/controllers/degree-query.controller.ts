import { getGateway } from '@/config/gateway';
import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { FABRIC_CHAINCODE, FABRIC_CHANNEL } from '@/utils/degree-utils';
import { RequestHandler, Response } from 'express';

/**
 * Get all degrees issued to the logged-in user
 */
export const getMyDegrees: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    const documents = await prisma.document.findMany({
      where: {
        issuedTo: req.user!.id,
      },
      include: {
        issuerUser: {
          select: {
            orgName: true,
          },
        },
        university: {
          select: {
            displayName: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedDocs = documents.map(doc => ({
      docId: doc.id,
      // Use the university name if available, otherwise fallback to issuer organization name
      issuer: doc.university?.displayName || doc.issuerUser.orgName,
      status: doc.status,
      issueDate: doc.createdAt,
      universityId: doc.universityId,
    }));

    res.json(formattedDocs);
  } catch (error: any) {
    console.error('getMyDegrees error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all records from the blockchain ledger for a specific university
 */
export const getAllLedgerRecords: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'university') {
      res.status(403).json({ error: 'Only university can view all records' });
      return;
    }

    // Get the university ID for the current user
    const university = await prisma.university.findFirst({
      where: {
        ownerId: req.user.id,
      },
    });

    if (!university) {
      res.status(404).json({ error: 'University not found for this user' });
      return;
    }

    const gateway = await getGateway(req.user.id, req.user.orgName?.toLowerCase() || '');
    const network = await gateway.getNetwork(FABRIC_CHANNEL);
    const contract = network.getContract(FABRIC_CHAINCODE);

    // Call the GetUniversityRecords function with the university ID
    // instead of GetAllRecords to get only records for this university
    const result = await contract.evaluateTransaction('GetUniversityRecords', university.id);
    const records = JSON.parse(result.toString());
    gateway.disconnect();

    // Enrich the records with university display names, but use only the current university
    const enrichedRecords = records.map((record: any) => {
      return {
        ...record,
        universityName: university?.displayName || 'Unknown University',
      };
    });

    res.json(enrichedRecords);
  } catch (error: any) {
    console.error('getAllLedgerRecords error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all degrees issued to a specific user by userId.
 * Only accessible by users with role 'employer'.
 */
export const getUserDegrees: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // Only employers should access other users' degrees
    if (req.user?.role !== 'employer') {
      res.status(403).json({ error: 'Only employers can view user degrees' });
      return;
    }

    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'Missing userId parameter' });
      return;
    }

    // Find the user to ensure they exist
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Only return accepted degrees for security
    const documents = await prisma.document.findMany({
      where: {
        issuedTo: userId,
        status: 'accepted',
      },
      include: {
        issuerUser: {
          select: {
            orgName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedDocs = documents.map((doc: any) => ({
      docId: doc.id,
      issuer: doc.issuerUser.orgName,
      status: doc.status,
      issueDate: doc.createdAt,
    }));

    res.json(formattedDocs);
  } catch (error: any) {
    console.error('getUserDegrees error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get recently issued degrees for university dashboard.
 * Only accessible by users with role 'university'.
 */
export const getRecentIssuedDegrees: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'university') {
      res.status(403).json({ error: 'Only universities can access this data' });
      return;
    }

    // Get the university ID for the current user
    const university = await prisma.university.findFirst({
      where: {
        ownerId: req.user.id,
      },
    });

    if (!university) {
      res.status(404).json({ error: 'University not found for this user' });
      return;
    }

    // Now we can directly include the university relation
    const recentDegrees = await prisma.document.findMany({
      where: {
        universityId: university.id,
      },
      include: {
        issuedToUser: {
          select: {
            username: true,
            email: true,
          },
        },
        university: {
          select: {
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const formattedDocs = recentDegrees.map(doc => ({
      docId: doc.id,
      issuedTo: doc.issuedToUser.email,
      recipientName: doc.issuedToUser.username,
      status: doc.status,
      issueDate: doc.createdAt,
      // Now we can get the display name directly from the relation
      university: doc.university?.displayName || 'Unknown University',
    }));

    res.json(formattedDocs);
  } catch (error: any) {
    console.error('getRecentIssuedDegrees error:', error);
    res.status(500).json({ error: error.message });
  }
};
