import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { RequestHandler, Response } from 'express';

// Helper function to create an issuer (previously issuer)
export async function createIssuerHelper(
  userId: string,
  name: string,
  shorthand: string, // Changed from displayName
  description?: string,
  logoUrl?: string,
  country?: string, // New field
  address?: string, // New field
  website?: string, // New field
  foundedYear?: number, // New field
) {
  // Check if the user already has an issuer
  const existingIssuer = await prisma.issuer.findFirst({
    where: {
      ownerId: userId,
    },
  });

  if (existingIssuer) {
    throw new Error(
      'You already have an issuer. Issuer users can only have one associated issuer.',
    );
  }

  // Check if issuer with this name already exists for this user
  const existingIssuerByName = await prisma.issuer.findFirst({
    where: {
      name,
      ownerId: userId,
    },
  });

  if (existingIssuerByName) {
    throw new Error('Issuer with this name already exists');
  }

  // Create the issuer in the database
  const issuer = await prisma.issuer.create({
    data: {
      name,
      shorthand, // Changed from displayName
      description: description || '',
      logoUrl,
      ownerId: userId,
      issuerType: 'academic', // Default type
      country, // New field
      address, // New field
      website, // New field
      foundedYear, // New field
    },
  });

  // Automatically make the creator an active admin member of the issuer
  await prisma.issuerMember.create({
    data: {
      userId,
      issuerId: issuer.id,
      role: 'admin',
      status: 'active',
    },
  });

  // Import necessary functions for fabric identity update
  const { updateIssuerIdentity } = await import('../utils/fabric-helpers');

  // Update the user's fabric identity to include this issuer ID
  try {
    await updateIssuerIdentity(userId, issuer.id);
  } catch (fabricError) {
    console.error('Failed to update Fabric identity with issuer attribute:', fabricError);
    // Continue anyway as the issuer was created in the database
  }

  return issuer;
}

/**
 * Create a new issuer organization
 */
export const createIssuer: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // Only issuer role users can create issuer orgs
    if (req.user?.role !== 'issuer') {
      res.status(403).json({ error: 'Only issuer users can create issuer organizations' });
      return;
    }

    const {
      name,
      shorthand, // Changed from displayName
      description,
      logoUrl,
      country, // New field
      address, // New field
      website, // New field
      foundedYear, // New field
    } = req.body;

    if (!name || !shorthand) {
      res.status(400).json({ error: 'Name and shorthand are required' });
      return;
    }

    // Parse foundedYear as a number if it exists
    const parsedFoundedYear = foundedYear ? parseInt(foundedYear, 10) : undefined;

    const issuer = await createIssuerHelper(
      req.user.id,
      name,
      shorthand,
      description,
      logoUrl,
      country,
      address,
      website,
      parsedFoundedYear,
    );

    res.status(201).json({
      message: 'Issuer created successfully',
      issuer,
    });
  } catch (error: any) {
    console.error('createIssuer error:', error);

    // Check for specific Prisma errors
    if (error.code === 'P2021') {
      // P2021 is "Table does not exist in the database"
      res.status(500).json({
        error: 'Issuer model not found in database. You may need to run prisma migrate deploy.',
      });
      return;
    }

    res.status(500).json({ error: error.message });
  }
};

/**
 * Get the issuer owned by the current user (for issuer users)
 * or get issuers where the user is a member
 */
export const getMyIssuers: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // For issuer users - return their associated issuers
    if (req.user?.role === 'issuer') {
      // Find issuers where this user is a member
      const memberships = await prisma.issuerMember.findMany({
        where: {
          userId: req.user.id,
          status: 'active',
        },
        include: {
          issuer: {
            include: {
              affiliations: {
                where: {
                  status: 'active',
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
              },
            },
          },
        },
      });

      if (!memberships || memberships.length === 0) {
        res.json([]); // Return empty array rather than 404
        return;
      }

      // Map and transform the data to maintain backward compatibility with UI
      const issuers = memberships.map(membership => {
        const issuer = membership.issuer;
        // Transform affiliations array for backward compatibility
        const affiliations = issuer.affiliations.map(affiliation => ({
          id: affiliation.id,
          userId: affiliation.userId,
          issuerId: affiliation.issuerId,
          status: affiliation.status,
          user: affiliation.holder,
        }));

        return {
          ...issuer,
          affiliations,
          // Include the user's role within the issuer
          memberRole: membership.role,
        };
      });

      res.json(issuers);
      return;
    }

    // For holder users - this should use the holder affiliations endpoint
    else if (req.user?.role === 'holder') {
      res.status(403).json({
        error: 'Holder users should use the holder affiliations endpoint',
        endpoint: '/issuer/my-affiliations',
      });
      return;
    }

    res.status(403).json({ error: 'Unauthorized access' });
  } catch (error: any) {
    console.error('getMyIssuers error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all issuers
 */
export const getAllIssuers: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    const issuers = await prisma.issuer.findMany({
      select: {
        id: true,
        name: true,
        shorthand: true, // Changed from displayName
        description: true,
        logoUrl: true,
        ownerId: true,
        issuerType: true,
        country: true, // New field
        address: true, // New field
        website: true, // New field
        foundedYear: true, // New field
        owner: {
          select: {
            username: true,
          },
        },
      },
    });

    res.json(issuers);
  } catch (error: any) {
    console.error('getAllIssuers error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Request to join an existing issuer as an issuer member
 */
export const requestJoinIssuer: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'issuer') {
      res.status(403).json({ error: 'Only issuer users can request to join issuers' });
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

    // Check if user is already a member of ANY issuer (not just this one)
    const existingMemberships = await prisma.issuerMember.findMany({
      where: {
        userId: req.user.id,
        status: { in: ['active', 'pending'] },
      },
    });

    // Check for existing join requests to other issuers
    const existingJoinRequests = await prisma.issuerJoinRequest.findMany({
      where: {
        requesterId: req.user.id,
        status: 'pending',
      },
    });

    // If they are a member of ANY issuer or have ANY pending join requests, they can't join another one
    if (existingMemberships.length > 0 || existingJoinRequests.length > 0) {
      // Special case: if they're trying to join the issuer they're already a member of
      const alreadyMemberOfThisIssuer = existingMemberships.some(m => m.issuerId === issuerId);

      if (alreadyMemberOfThisIssuer) {
        const membership = existingMemberships.find(m => m.issuerId === issuerId);
        if (membership?.status === 'active') {
          res.status(400).json({ error: 'You are already a member of this issuer' });
        } else {
          res
            .status(400)
            .json({ error: 'Your membership request for this issuer is already pending' });
        }
      } else {
        res.status(400).json({
          error:
            'Issuer users can only be a member of one issuer. You are already a member of an issuer or have a pending request.',
        });
      }
      return;
    }

    // Create an issuer join request
    await prisma.issuerJoinRequest.create({
      data: {
        requesterId: req.user.id,
        issuerId,
        status: 'pending',
      },
    });

    res.status(201).json({
      message: 'Join request submitted successfully',
    });
  } catch (error: any) {
    console.error('requestJoinIssuer error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get pending join requests for issuers where user is an admin
 */
export const getPendingJoinRequests: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'issuer') {
      res.status(403).json({ error: 'Only issuer users can access this endpoint' });
      return;
    }

    // Find issuers where this user is an admin
    const adminMemberships = await prisma.issuerMember.findMany({
      where: {
        userId: req.user.id,
        status: 'active',
        role: 'admin', // Only admins can view join requests
      },
      select: {
        issuerId: true,
      },
    });

    if (adminMemberships.length === 0) {
      res.json([]); // Return empty array if user isn't an admin anywhere
      return;
    }

    // Get issuer IDs where this user is an admin
    const issuerIds = adminMemberships.map(m => m.issuerId);

    // Get pending join requests for these issuers
    const pendingJoinRequests = await prisma.issuerJoinRequest.findMany({
      where: {
        issuerId: { in: issuerIds },
        status: 'pending',
      },
      include: {
        requester: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        issuer: true,
      },
    });

    res.json(pendingJoinRequests);
  } catch (error: any) {
    console.error('getPendingJoinRequests error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get pending join requests initiated BY the current issuer user
 */
export const getMyPendingJoinRequests: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'issuer') {
      res.status(403).json({ error: 'Only issuer users can view their pending join requests' });
      return;
    }

    const pendingRequests = await prisma.issuerJoinRequest.findMany({
      where: {
        requesterId: req.user.id,
        status: 'pending',
      },
      include: {
        issuer: {
          select: {
            id: true,
            shorthand: true, // Changed from displayName
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(pendingRequests);
  } catch (error: any) {
    console.error('getMyPendingJoinRequests error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Respond to an issuer join request
 */
export const respondToJoinRequest: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'issuer') {
      res.status(403).json({ error: 'Only issuer users can respond to join requests' });
      return;
    }

    const { requestId, accept } = req.body;
    if (!requestId || accept === undefined) {
      res.status(400).json({ error: 'Missing requestId or accept status' });
      return;
    }

    // Find the join request
    const joinRequest = await prisma.issuerJoinRequest.findUnique({
      where: { id: requestId },
      include: { issuer: true },
    });

    if (!joinRequest) {
      res.status(404).json({ error: 'Join request not found' });
      return;
    }

    // Check if user is an admin of this issuer
    const membership = await prisma.issuerMember.findFirst({
      where: {
        userId: req.user.id,
        issuerId: joinRequest.issuerId,
        status: 'active',
        role: 'admin',
      },
    });

    if (!membership) {
      res
        .status(403)
        .json({ error: 'You must be an admin of this issuer to approve join requests' });
      return;
    }

    // Update the status
    const newStatus = accept ? 'approved' : 'rejected';
    const updatedRequest = await prisma.issuerJoinRequest.update({
      where: { id: requestId },
      data: { status: newStatus },
    });

    // If accepted, create a new issuer member
    if (accept) {
      // Check if the requester is already a member of any other issuer
      const existingOtherMemberships = await prisma.issuerMember.findMany({
        where: {
          userId: joinRequest.requesterId,
          issuerId: { not: joinRequest.issuerId },
          status: { in: ['active', 'pending'] },
        },
      });

      if (existingOtherMemberships.length > 0) {
        res.status(400).json({
          error:
            'Cannot approve request: issuer users can only be members of one issuer at a time.',
        });
        return;
      }

      // First check if membership already exists for this issuer
      const existingMembership = await prisma.issuerMember.findFirst({
        where: {
          userId: joinRequest.requesterId,
          issuerId: joinRequest.issuerId,
        },
      });

      if (existingMembership) {
        // Update existing membership
        await prisma.issuerMember.update({
          where: { id: existingMembership.id },
          data: { status: 'active' },
        });
      } else {
        // Create new membership
        await prisma.issuerMember.create({
          data: {
            userId: joinRequest.requesterId,
            issuerId: joinRequest.issuerId,
            status: 'active',
            role: 'admin', // All issuer members start as admins
          },
        });
      }

      // Update the user's fabric identity
      try {
        const { updateIssuerIdentity } = await import('../utils/fabric-helpers');
        await updateIssuerIdentity(joinRequest.requesterId, joinRequest.issuerId);
      } catch (fabricError) {
        console.error('Failed to update Fabric identity:', fabricError);
      }
    }

    res.json({
      message: `Join request ${accept ? 'approved' : 'rejected'}`,
      request: updatedRequest,
    });
  } catch (error: any) {
    console.error('respondToJoinRequest error:', error);
    res.status(500).json({ error: error.message });
  }
};
