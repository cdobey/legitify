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
 * or get universities a student is affiliated with (for individual users)
 */
export const getMyUniversities: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // For university users - return only their associated university
    if (req.user?.role === 'university') {
      const university = await prisma.university.findFirst({
        where: {
          ownerId: req.user.id,
        },
        include: {
          affiliations: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!university) {
        res.json([]); // Return empty array rather than 404 so client can handle emopty data
        return;
      }

      res.json([university]);
      return;
    }

    // For individual users - return all of their affiliated universities
    else if (req.user?.role === 'individual') {
      const affiliations = await prisma.affiliation.findMany({
        where: {
          userId: req.user.id,
          status: 'active',
        },
        include: {
          university: true,
        },
      });

      const universities = affiliations.map(affiliation => affiliation.university);
      res.json(universities);
      return;
    }

    res.status(403).json({ error: 'Unauthorized access' });
  } catch (error: any) {
    console.error('getMyUniversities error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all available universities for student registration
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
        owner: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        displayName: 'asc',
      },
    });

    res.json(universities);
  } catch (error: any) {
    console.error('getAllUniversities error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Request to join a university (for university users)
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

    // Check if user already has a university
    const existingUniversity = await prisma.university.findFirst({
      where: {
        ownerId: req.user.id,
      },
    });

    if (existingUniversity) {
      res.status(400).json({
        error:
          'You already have a university. University users can only have one associated university.',
      });
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
