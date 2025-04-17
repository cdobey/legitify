import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { RequestHandler, Response } from 'express';

// Helper function to create a university
export async function createUniversityHelper(
  userId: string,
  name: string,
  displayName: string,
  description?: string,
  logoUrl?: string,
) {
  // Check if the user already has a university
  const existingUniversity = await prisma.university.findFirst({
    where: {
      ownerId: userId,
    },
  });

  if (existingUniversity) {
    throw new Error(
      'You already have a university. University users can only have one associated university.',
    );
  }

  // Check if university with this name already exists for this user
  const existingUniversityByName = await prisma.university.findFirst({
    where: {
      name,
      ownerId: userId,
    },
  });

  if (existingUniversityByName) {
    throw new Error('University with this name already exists');
  }

  // Create the university in the database
  const university = await prisma.university.create({
    data: {
      name,
      displayName,
      description: description || '',
      logoUrl,
      ownerId: userId,
    },
  });

  // Automatically make the creator an active admin member of the university
  await prisma.universityMember.create({
    data: {
      userId,
      universityId: university.id,
      role: 'admin',
      status: 'active',
    },
  });

  // Import necessary functions for fabric identity update
  const { updateUniversityIdentity } = await import('../utils/fabric-helpers');

  // Update the user's fabric identity to include this university ID
  try {
    await updateUniversityIdentity(userId, university.id);
  } catch (fabricError) {
    console.error('Failed to update Fabric identity with university attribute:', fabricError);
    // Continue anyway as the university was created in the database
  }

  return university;
}

/**
 * Create a new university sub-organization
 */
export const createUniversity: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // Only university role users can create university sub-orgs
    if (req.user?.role !== 'university') {
      res.status(403).json({ error: 'Only university users can create university organizations' });
      return;
    }

    const { name, displayName, description, logoUrl } = req.body;

    if (!name || !displayName) {
      res.status(400).json({ error: 'Name and display name are required' });
      return;
    }

    const university = await createUniversityHelper(
      req.user.id,
      name,
      displayName,
      description,
      logoUrl,
    );

    res.status(201).json({
      message: 'University created successfully',
      university,
    });
  } catch (error: any) {
    console.error('createUniversity error:', error);

    // Check for specific Prisma errors
    if (error.code === 'P2021') {
      // P2021 is "Table does not exist in the database"
      res.status(500).json({
        error: 'University model not found in database. You may need to run prisma migrate deploy.',
      });
      return;
    }

    res.status(500).json({ error: error.message });
  }
};

/**
 * Get the university owned by the current user (for university users)
 * or get universities where the user is a member
 */
export const getMyUniversities: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // For university users - return their associated universities
    if (req.user?.role === 'university') {
      // Find universities where this user is a member
      const memberships = await prisma.universityMember.findMany({
        where: {
          userId: req.user.id,
          status: 'active',
        },
        include: {
          university: {
            include: {
              students: {
                where: {
                  status: 'active',
                },
                include: {
                  student: {
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
      const universities = memberships.map(membership => {
        const university = membership.university;
        // Transform students array to affiliations format for backward compatibility
        const affiliations = university.students.map(studentAff => ({
          id: studentAff.id,
          userId: studentAff.userId,
          universityId: studentAff.universityId,
          status: studentAff.status,
          user: studentAff.student,
        }));

        return {
          ...university,
          affiliations,
          // Include the user's role within the university
          memberRole: membership.role,
        };
      });

      res.json(universities);
      return;
    }

    // For individual users - this should use getStudentUniversities from the affiliation controller
    else if (req.user?.role === 'individual') {
      res.status(403).json({
        error: 'Individual users should use the student affiliations endpoint',
        endpoint: '/university/my-affiliations',
      });
      return;
    }

    res.status(403).json({ error: 'Unauthorized access' });
  } catch (error: any) {
    console.error('getMyUniversities error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all universities
 */
export const getAllUniversities: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    const universities = await prisma.university.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
        logoUrl: true,
        ownerId: true,
        owner: {
          select: {
            username: true,
          },
        },
      },
    });

    res.json(universities);
  } catch (error: any) {
    console.error('getAllUniversities error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Request to join an existing university as a university member
 */
export const requestJoinUniversity: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'university') {
      res.status(403).json({ error: 'Only university users can request to join universities' });
      return;
    }

    const { universityId } = req.body;
    if (!universityId) {
      res.status(400).json({ error: 'University ID is required' });
      return;
    }

    // Check if university exists
    const university = await prisma.university.findUnique({
      where: { id: universityId },
    });

    if (!university) {
      res.status(404).json({ error: 'University not found' });
      return;
    }

    // Check if user is already a member of ANY university (not just this one)
    const existingMemberships = await prisma.universityMember.findMany({
      where: {
        userId: req.user.id,
        status: { in: ['active', 'pending'] },
      },
    });

    // Check for existing join requests to other universities
    const existingJoinRequests = await prisma.universityJoinRequest.findMany({
      where: {
        requesterId: req.user.id,
        status: 'pending',
      },
    });

    // If they are a member of ANY university or have ANY pending join requests, they can't join another one
    if (existingMemberships.length > 0 || existingJoinRequests.length > 0) {
      // Special case: if they're trying to join the university they're already a member of
      const alreadyMemberOfThisUniversity = existingMemberships.some(
        m => m.universityId === universityId,
      );

      if (alreadyMemberOfThisUniversity) {
        const membership = existingMemberships.find(m => m.universityId === universityId);
        if (membership?.status === 'active') {
          res.status(400).json({ error: 'You are already a member of this university' });
        } else {
          res
            .status(400)
            .json({ error: 'Your membership request for this university is already pending' });
        }
      } else {
        res.status(400).json({
          error:
            'University users can only be a member of one university. You are already a member of a university or have a pending request.',
        });
      }
      return;
    }

    // Create a university join request
    await prisma.universityJoinRequest.create({
      data: {
        requesterId: req.user.id,
        universityId,
        status: 'pending',
      },
    });

    res.status(201).json({
      message: 'Join request submitted successfully',
    });
  } catch (error: any) {
    console.error('requestJoinUniversity error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get pending join requests for universities where user is an admin
 */
export const getPendingJoinRequests: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'university') {
      res.status(403).json({ error: 'Only university users can access this endpoint' });
      return;
    }

    // Find universities where this user is an admin
    const adminMemberships = await prisma.universityMember.findMany({
      where: {
        userId: req.user.id,
        status: 'active',
        role: 'admin', // Only admins can view join requests
      },
      select: {
        universityId: true,
      },
    });

    if (adminMemberships.length === 0) {
      res.json([]); // Return empty array if user isn't an admin anywhere
      return;
    }

    // Get university IDs where this user is an admin
    const universityIds = adminMemberships.map(m => m.universityId);

    // Get pending join requests for these universities
    const pendingJoinRequests = await prisma.universityJoinRequest.findMany({
      where: {
        universityId: { in: universityIds },
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
        university: true,
      },
    });

    res.json(pendingJoinRequests);
  } catch (error: any) {
    console.error('getPendingJoinRequests error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Respond to a university join request
 */
export const respondToJoinRequest: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'university') {
      res.status(403).json({ error: 'Only university users can respond to join requests' });
      return;
    }

    const { requestId, accept } = req.body;
    if (!requestId || accept === undefined) {
      res.status(400).json({ error: 'Missing requestId or accept status' });
      return;
    }

    // Find the join request
    const joinRequest = await prisma.universityJoinRequest.findUnique({
      where: { id: requestId },
      include: { university: true },
    });

    if (!joinRequest) {
      res.status(404).json({ error: 'Join request not found' });
      return;
    }

    // Check if user is an admin of this university
    const membership = await prisma.universityMember.findFirst({
      where: {
        userId: req.user.id,
        universityId: joinRequest.universityId,
        status: 'active',
        role: 'admin',
      },
    });

    if (!membership) {
      res
        .status(403)
        .json({ error: 'You must be an admin of this university to approve join requests' });
      return;
    }

    // Update the status
    const newStatus = accept ? 'approved' : 'rejected';
    const updatedRequest = await prisma.universityJoinRequest.update({
      where: { id: requestId },
      data: { status: newStatus },
    });

    // If accepted, create a new university member
    if (accept) {
      // Check if the requester is already a member of any other university
      const existingOtherMemberships = await prisma.universityMember.findMany({
        where: {
          userId: joinRequest.requesterId,
          universityId: { not: joinRequest.universityId },
          status: { in: ['active', 'pending'] },
        },
      });

      if (existingOtherMemberships.length > 0) {
        res.status(400).json({
          error:
            'Cannot approve request: university users can only be members of one university at a time.',
        });
        return;
      }

      // First check if membership already exists for this university
      const existingMembership = await prisma.universityMember.findFirst({
        where: {
          userId: joinRequest.requesterId,
          universityId: joinRequest.universityId,
        },
      });

      if (existingMembership) {
        // Update existing membership
        await prisma.universityMember.update({
          where: { id: existingMembership.id },
          data: { status: 'active' },
        });
      } else {
        // Create new membership
        await prisma.universityMember.create({
          data: {
            userId: joinRequest.requesterId,
            universityId: joinRequest.universityId,
            status: 'active',
            role: 'admin', // All university members start as admins
          },
        });
      }

      // Update the user's fabric identity
      try {
        const { updateUniversityIdentity } = await import('../utils/fabric-helpers');
        await updateUniversityIdentity(joinRequest.requesterId, joinRequest.universityId);
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
