import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { evaluateFabricTransaction } from '@/utils/credential-utils';
import { RequestHandler, Response } from 'express';

/**
 * Get all credentials issued to the logged-in user
 */
export const getMyCredentials: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    const credentials = await prisma.credential.findMany({
      where: {
        holderId: req.user!.id,
      },
      include: {
        issuer: {
          select: {
            orgName: true,
          },
        },
        issuerOrg: {
          select: {
            shorthand: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedCredentials = credentials.map(credential => ({
      docId: credential.id,
      // Use the issuer org name if available, otherwise fallback to issuer organization name
      issuer: credential.issuerOrg?.shorthand || credential.issuer.orgName,
      status: credential.status,
      issueDate: credential.createdAt,
      issuerId: credential.issuerOrgId,
      type: credential.type,
      title: credential.title,
    }));

    res.json(formattedCredentials);
  } catch (error: any) {
    console.error('getMyCredentials error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all records from the blockchain ledger for a specific issuer
 */
export const getAllLedgerRecords: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'issuer') {
      res.status(403).json({ error: 'Only issuers can view all records' });
      return;
    }

    // Check if user is a member of any issuer
    const issuerMembership = await prisma.issuerMember.findFirst({
      where: {
        userId: req.user.id,
        status: 'active',
      },
      include: {
        issuer: true,
      },
    });

    if (!issuerMembership) {
      res.status(404).json({ error: 'No active issuer membership found for this user' });
      return;
    }

    const issuer = issuerMembership.issuer;

    // Use helper function which supports mocking
    let records: any[] = [];
    try {
      const result = await evaluateFabricTransaction(
        req.user.id, 
        req.user.orgName?.toLowerCase() || '', 
        'GetIssuerCredentials', 
        issuer.id
      );

      // Result is already parsed or a string by evaluateFabricTransaction
      if (Array.isArray(result)) {
          records = result;
      } else if (result && typeof result === 'object') {
          records = [result];
      } else if (typeof result === 'string') {
          try {
              records = JSON.parse(result);
              if (!Array.isArray(records)) records = [records];
          } catch (e) {
              console.error('Failed to parse result as JSON:', result);
              records = [];
          }
      }
    } catch (fabricError) {
      console.error('Fabric evaluation error:', fabricError);
      // Return empty array instead of failing
      records = [];
    }

    // If no records, return empty array early
    if (records.length === 0) {
      res.json([]);
      return;
    }

    // Get all user IDs from the records to fetch their emails in a single query
    const userIds = records.map((record: any) => record.holderId).filter(Boolean);

    // Fetch all users with these IDs in a single query
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        email: true,
      },
    });

    // Create a map for quick lookup
    const userEmailMap = new Map();
    users.forEach(user => {
      userEmailMap.set(user.id, user.email);
    });

    // Enrich the records with issuer display names and holder emails
    const enrichedRecords = records.map((record: any) => {
      return {
        ...record,
        issuerName: issuer?.shorthand || 'Unknown Issuer',
        holderEmail: userEmailMap.get(record.holderId) || 'Unknown Email',
      };
    });

    res.json(enrichedRecords);
  } catch (error: any) {
    console.error('getAllLedgerRecords error:', error);
    res
      .status(500)
      .json({ error: error.message || 'An error occurred while retrieving ledger records' });
  }
};

/**
 * Get all credentials issued to a specific user by userId.
 * Only accessible by users with role 'verifier'.
 */
export const getUserCredentials: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // Only verifiers should access other users' credentials
    if (req.user?.role !== 'verifier') {
      res.status(403).json({ error: 'Only verifiers can view user credentials' });
      return;
    }

    const userId = req.params.userId as string;
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

    // Only return accepted credentials for security
    const credentials = await prisma.credential.findMany({
      where: {
        holderId: userId,
        status: 'accepted',
      },
      include: {
        issuerOrg: {
          select: {
            id: true,
            shorthand: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedCredentials = credentials.map((credential: any) => ({
      docId: credential.id,
      issuer: credential.issuerOrg?.shorthand || 'Unknown Issuer',
      status: credential.status,
      issueDate: credential.createdAt,
      description: credential.description,
      type: credential.type,
      title: credential.title,
    }));

    res.json(formattedCredentials);
  } catch (error: any) {
    console.error('getUserCredentials error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get recently issued credentials for issuer dashboard.
 * Only accessible by users with role 'issuer'.
 */
export const getRecentIssuedCredentials: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'issuer') {
      res.status(403).json({ error: 'Only issuers can access this data' });
      return;
    }

    // Check if user is a member of any issuer
    const issuerMembership = await prisma.issuerMember.findFirst({
      where: {
        userId: req.user.id,
        status: 'active',
      },
      include: {
        issuer: true,
      },
    });

    if (!issuerMembership) {
      res.status(404).json({ error: 'No active issuer membership found for this user' });
      return;
    }

    const issuer = issuerMembership.issuer;

    // Now we can directly include the issuer relation
    const recentCredentials = await prisma.credential.findMany({
      where: {
        issuerOrgId: issuer.id,
      },
      include: {
        holder: {
          select: {
            username: true,
            email: true,
          },
        },
        issuerOrg: {
          select: {
            shorthand: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const formattedCredentials = recentCredentials.map(credential => ({
      docId: credential.id,
      issuedTo: credential.holder.email,
      recipientName: credential.holder.username,
      status: credential.status,
      issueDate: credential.createdAt,
      // Now we can get the shorthand directly from the relation
      issuer: credential.issuerOrg?.shorthand || 'Unknown Issuer',
      type: credential.type,
      title: credential.title,
    }));

    res.json(formattedCredentials);
  } catch (error: any) {
    console.error('getRecentIssuedCredentials error:', error);
    res.status(500).json({ error: error.message });
  }
};
