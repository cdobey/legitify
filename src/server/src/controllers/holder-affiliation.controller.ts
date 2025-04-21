import { getGateway } from '@/config/gateway';
import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { AffiliationStatus, MembershipStatus } from '@prisma/client';
import { RequestHandler, Response } from 'express';

/**
 * Add a holder to an issuer (create holder affiliation)
 */
export const addHolderToIssuer: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'issuer') {
      res.status(403).json({ error: 'Only issuer users can add holders' });
      return;
    }

    const { issuerId, holderEmail } = req.body;
    if (!issuerId || !holderEmail) {
      res.status(400).json({ error: 'Missing issuerId or holderEmail' });
      return;
    }

    // Check if the user is a member of this issuer
    const membership = await prisma.issuerMember.findFirst({
      where: {
        userId: req.user.id,
        issuerId,
        status: MembershipStatus.active,
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You must be a member of this issuer to add holders' });
      return;
    }

    // Find holder by email
    const holder = await prisma.user.findFirst({
      where: {
        email: holderEmail,
        role: 'holder',
      },
    });

    if (!holder) {
      res.status(404).json({ error: 'Holder not found' });
      return;
    }

    // Check if affiliation already exists
    const existingAffiliation = await prisma.issuerAffiliation.findFirst({
      where: {
        userId: holder.id,
        issuerId,
      },
    });

    if (existingAffiliation) {
      // Return appropriate message based on status
      if (existingAffiliation.status === AffiliationStatus.active) {
        res.status(400).json({ error: 'Holder is already affiliated with this issuer' });
      } else if (existingAffiliation.status === AffiliationStatus.pending) {
        res.status(400).json({ error: 'Affiliation request is already pending' });
      } else {
        res.status(400).json({ error: 'Previous affiliation request was rejected' });
      }
      return;
    }

    // Create the affiliation request with issuer as initiator
    const affiliation = await prisma.issuerAffiliation.create({
      data: {
        userId: holder.id,
        issuerId,
        status: AffiliationStatus.pending,
        initiatedBy: 'issuer',
      },
    });

    res.status(201).json({
      message: 'Holder affiliation request sent successfully',
      affiliation,
    });
  } catch (error: any) {
    console.error('addHolderToIssuer error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all holders affiliated with an issuer
 */
export const getIssuerHolders: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'issuer') {
      res.status(403).json({ error: 'Only issuer users can access this endpoint' });
      return;
    }

    const { issuerId } = req.params;

    if (!issuerId) {
      res.status(400).json({ error: 'Issuer ID is required' });
      return;
    }

    // Check if the user is a member of this issuer
    const membership = await prisma.issuerMember.findFirst({
      where: {
        userId: req.user.id,
        issuerId,
        status: MembershipStatus.active,
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You must be a member of this issuer to view its holders' });
      return;
    }

    // Get all active holder affiliations
    const affiliations = await prisma.issuerAffiliation.findMany({
      where: {
        issuerId,
        status: AffiliationStatus.active,
      },
      include: {
        holder: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    const holders = affiliations.map(affiliation => affiliation.holder);

    res.json(holders);
  } catch (error: any) {
    console.error('getIssuerHolders error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all issuers that a holder is affiliated with
 */
export const getHolderIssuers: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'holder') {
      res.status(403).json({ error: 'Only holder users can access this endpoint' });
      return;
    }

    const affiliations = await prisma.issuerAffiliation.findMany({
      where: {
        userId: req.user.id,
        status: AffiliationStatus.active,
      },
      include: {
        issuer: {
          include: {
            owner: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    });

    const issuers = affiliations.map(affiliation => affiliation.issuer);

    res.json(issuers);
  } catch (error: any) {
    console.error('getHolderIssuers error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get pending holder affiliation requests for issuers the user is a member of
 */
export const getPendingAffiliations: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // For holder users - return their pending issuer affiliations
    if (req.user?.role === 'holder') {
      const pendingAffiliations = await prisma.issuerAffiliation.findMany({
        where: {
          userId: req.user.id,
          status: AffiliationStatus.pending,
        },
        include: {
          issuer: {
            include: {
              owner: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
      });

      res.json(pendingAffiliations);
      return;
    }

    // For issuer users - return pending holder affiliations for issuers they're members of
    else if (req.user?.role === 'issuer') {
      // Find issuers where this user is a member
      const memberships = await prisma.issuerMember.findMany({
        where: {
          userId: req.user.id,
          status: MembershipStatus.active,
        },
        select: {
          issuerId: true,
        },
      });

      if (!memberships || memberships.length === 0) {
        res.json([]); // Return empty array rather than 404
        return;
      }

      // Get issuer IDs where this user is a member
      const issuerIds = memberships.map(m => m.issuerId);

      // Get pending holder affiliations for these issuers
      const pendingAffiliations = await prisma.issuerAffiliation.findMany({
        where: {
          issuerId: { in: issuerIds },
          status: AffiliationStatus.pending,
        },
        include: {
          holder: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          issuer: {
            include: {
              owner: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
      });

      // Transform to maintain backward compatibility with the UI
      const transformedAffiliations = pendingAffiliations.map(affiliation => ({
        id: affiliation.id,
        userId: affiliation.userId,
        issuerId: affiliation.issuerId,
        status: affiliation.status,
        initiatedBy: affiliation.initiatedBy,
        createdAt: affiliation.createdAt,
        updatedAt: affiliation.updatedAt,
        user: affiliation.holder,
        issuer: affiliation.issuer,
      }));

      res.json(transformedAffiliations);
      return;
    }

    res.status(403).json({ error: 'Unauthorized access' });
  } catch (error: any) {
    console.error('getPendingAffiliations error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Respond to a holder issuer affiliation request
 */
export const respondToAffiliation: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    const { affiliationId, accept } = req.body;
    if (!affiliationId || accept === undefined) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Find the affiliation request
    const affiliationRequest = await prisma.issuerAffiliation.findUnique({
      where: { id: affiliationId },
      include: {
        issuer: true,
      },
    });

    if (!affiliationRequest) {
      res.status(404).json({ error: 'Affiliation request not found' });
      return;
    }

    // Case 1: Issuer initiated the request, holder should respond
    if (affiliationRequest.initiatedBy === 'issuer') {
      // Verify responder is the holder
      if (req.user?.role !== 'holder' || affiliationRequest.userId !== req.user.id) {
        res.status(403).json({
          error: 'Only the invited holder can respond to this invitation',
        });
        return;
      }
    }
    // Case 2: Holder initiated the request, issuer member should respond
    else if (affiliationRequest.initiatedBy === 'holder' || !affiliationRequest.initiatedBy) {
      if (req.user?.role !== 'issuer') {
        res.status(403).json({
          error: 'Only issuer members can respond to holder join requests',
        });
        return;
      }

      // Verify responder is a member of the issuer
      const membership = await prisma.issuerMember.findFirst({
        where: {
          userId: req.user.id,
          issuerId: affiliationRequest.issuerId,
          status: MembershipStatus.active,
        },
      });

      if (!membership) {
        res.status(403).json({
          error: 'You must be a member of this issuer to respond to join requests',
        });
        return;
      }
    }

    // Update the status based on the response
    const newStatus = accept ? AffiliationStatus.active : AffiliationStatus.rejected;
    const updatedAffiliation = await prisma.issuerAffiliation.update({
      where: { id: affiliationId },
      data: { status: newStatus },
    });

    // If accepted, record this affiliation on the blockchain
    if (accept && req.user) {
      try {
        const gateway = await getGateway(req.user.id, req.user.orgName?.toLowerCase() || '');
        const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'legitifychannel');
        const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'credentialCC');

        await contract.submitTransaction(
          'AddIssuerHolderRelationship',
          affiliationRequest.userId,
          affiliationRequest.issuerId,
        );
        gateway.disconnect();
      } catch (fabricError) {
        console.error('Failed to record affiliation on blockchain:', fabricError);
        // Continue anyway since the database update was successful
      }
    }

    res.json({
      message: `Holder affiliation request ${accept ? 'accepted' : 'rejected'}`,
      affiliation: updatedAffiliation,
    });
  } catch (error: any) {
    console.error('respondToAffiliation error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Register a new holder and affiliate them with an issuer
 */
export const registerHolder: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'issuer') {
      res.status(403).json({ error: 'Only issuer users can register holders' });
      return;
    }

    const { email, username, password, issuerId } = req.body;

    if (!email || !username || !password || !issuerId) {
      res.status(400).json({ error: 'Email, username, password, and issuerId are required' });
      return;
    }

    // Check if the user is a member of this issuer
    const membership = await prisma.issuerMember.findFirst({
      where: {
        userId: req.user.id,
        issuerId,
        status: MembershipStatus.active,
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You must be a member of this issuer to register holders' });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      res.status(400).json({
        error: existingUser.email === email ? 'Email already registered' : 'Username already taken',
      });
      return;
    }

    // Import necessary functions
    const { default: supabase } = await import('../config/supabase');
    const { enrollUser } = await import('../utils/fabric-helpers');

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        username,
        role: 'holder',
        orgName: 'orgholder',
      },
      email_confirm: true, // Auto-confirm the email for testing purposes
    });

    if (authError || !authData.user) {
      throw authError || new Error('Failed to create user in Supabase');
    }

    const userId = authData.user.id;

    // Enroll user with Hyperledger Fabric
    await enrollUser(userId, 'orgholder');

    // Create user in database
    const user = await prisma.user.create({
      data: {
        id: userId,
        username,
        role: 'holder',
        orgName: 'orgholder',
        email,
      },
    });

    // Create the holder affiliation
    const affiliation = await prisma.issuerAffiliation.create({
      data: {
        userId,
        issuerId,
        status: AffiliationStatus.active, // Auto-approve
      },
    });

    // Record this affiliation on the blockchain
    try {
      const gateway = await getGateway(req.user.id, req.user.orgName?.toLowerCase() || '');
      const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'legitifychannel');
      const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'credentialCC');

      await contract.submitTransaction('AddIssuerHolderRelationship', userId, issuerId);
      gateway.disconnect();
    } catch (fabricError) {
      console.error('Failed to record affiliation on blockchain:', fabricError);
    }

    res.status(201).json({
      message: 'Holder registered and affiliated successfully',
      user,
      affiliation,
    });
  } catch (error: any) {
    console.error('registerHolder error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Request holder affiliation with an issuer
 * This is specifically for holder users to request to join issuers
 */
export const requestHolderAffiliation: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'holder') {
      res.status(403).json({ error: 'Only holder users can request holder affiliations' });
      return;
    }

    const { issuerId } = req.body;
    if (!issuerId) {
      res.status(400).json({ error: 'Issuer ID is required' });
      return;
    }

    // Check if issuer exists
    const issuer = await prisma.issuer.findUnique({
      where: { id: issuerId },
    });

    if (!issuer) {
      res.status(404).json({ error: 'Issuer not found' });
      return;
    }

    // Check if the affiliation already exists
    const existingAffiliation = await prisma.issuerAffiliation.findFirst({
      where: {
        userId: req.user.id,
        issuerId,
      },
    });

    if (existingAffiliation) {
      // Return appropriate message based on status
      if (existingAffiliation.status === AffiliationStatus.active) {
        res.status(400).json({ error: 'You are already affiliated with this issuer' });
      } else if (existingAffiliation.status === AffiliationStatus.pending) {
        res.status(400).json({ error: 'Your affiliation request is already pending' });
      } else {
        res.status(400).json({ error: 'Your previous affiliation request was rejected' });
      }
      return;
    }

    // Create the holder affiliation request
    const affiliation = await prisma.issuerAffiliation.create({
      data: {
        userId: req.user.id,
        issuerId,
        status: AffiliationStatus.pending,
        initiatedBy: 'holder',
      },
    });

    res.status(201).json({
      message: 'Holder affiliation request submitted successfully',
      affiliation,
    });
  } catch (error: any) {
    console.error('requestHolderAffiliation error:', error);
    res.status(500).json({ error: error.message });
  }
};
