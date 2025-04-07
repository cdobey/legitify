import { Request, RequestHandler, Response } from 'express';
import { getGateway } from '../config/gateway';
import prisma from '../prisma/client';

/**
 * Create a new university sub-organization
 */
export const createUniversity: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Only university role users can create university sub-orgs
    if (req.user?.role !== 'university') {
      res.status(403).json({ error: 'Only university users can create university organizations' });
      return;
    }

    // Check if the user already has a university
    const existingUniversity = await prisma.university.findFirst({
      where: {
        ownerId: req.user.uid,
      },
    });

    if (existingUniversity) {
      res.status(400).json({
        error:
          'You already have a university. University users can only have one associated university.',
        university: existingUniversity,
      });
      return;
    }

    const { name, displayName, description } = req.body;

    if (!name || !displayName) {
      res.status(400).json({ error: 'Name and display name are required' });
      return;
    }

    // Check if university with this name already exists for this user
    const existingUniversityByName = await prisma.university.findFirst({
      where: {
        name,
        ownerId: req.user.uid,
      },
    });

    if (existingUniversityByName) {
      res.status(400).json({ error: 'University with this name already exists' });
      return;
    }

    // Create the university in the database
    const university = await prisma.university.create({
      data: {
        name,
        displayName,
        description: description || '',
        ownerId: req.user.uid,
      },
    });

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
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // For university users - return only their associated university
    if (req.user?.role === 'university') {
      const university = await prisma.university.findFirst({
        where: {
          ownerId: req.user.uid,
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

      // Always return an array, even if no university is found
      // This prevents 404 errors and lets the client handle empty data
      if (!university) {
        res.json([]); // Return empty array rather than 404
        return;
      }

      res.json([university]); // Return as array for consistent API
      return;
    }

    // For individual users - return all of their affiliated universities
    else if (req.user?.role === 'individual') {
      const affiliations = await prisma.affiliation.findMany({
        where: {
          userId: req.user.uid,
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
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const universities = await prisma.university.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        description: true,
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
 * Add a student to a university (create affiliation)
 */
export const addStudentToUniversity: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // This endpoint can now be used by both university users OR individuals joining a university
    const { universityId, studentId, studentEmail } = req.body;

    if (!universityId) {
      res.status(400).json({ error: 'University ID is required' });
      return;
    }

    // If university user is adding a student
    if (req.user?.role === 'university') {
      // Determine student ID - either directly provided or looked up by email
      let actualStudentId = studentId;

      // If studentId is not provided but studentEmail is, look up the student by email
      if (!actualStudentId && studentEmail) {
        const student = await prisma.user.findUnique({
          where: { email: studentEmail },
        });

        if (!student) {
          res.status(404).json({ error: 'Student with this email not found' });
          return;
        }

        if (student.role !== 'individual') {
          res.status(400).json({ error: 'User is not an individual/student' });
          return;
        }

        actualStudentId = student.id;
      }

      // If we still don't have a student ID, return an error
      if (!actualStudentId) {
        res.status(400).json({ error: 'Student ID or email is required' });
        return;
      }

      // Check if the university exists and is owned by this user
      const university = await prisma.university.findFirst({
        where: {
          id: universityId,
          ownerId: req.user.uid,
        },
      });

      if (!university) {
        res.status(404).json({ error: 'University not found or not owned by you' });
        return;
      }

      // CHANGE: Create a pending affiliation that requires approval
      // instead of automatically activating it
      const affiliation = await prisma.affiliation.upsert({
        where: {
          userId_universityId: {
            userId: actualStudentId,
            universityId,
          },
        },
        update: {
          status: 'pending', // Changed from 'active' to 'pending'
        },
        create: {
          userId: actualStudentId,
          universityId,
          status: 'pending', // Changed from 'active' to 'pending'
        },
      });

      res.json({
        message: 'Affiliation request sent to student',
        affiliation,
      });
    }
    // If individual user is joining a university
    else if (req.user?.role === 'individual') {
      // Check if the university exists
      const university = await prisma.university.findUnique({
        where: {
          id: universityId,
        },
      });

      if (!university) {
        res.status(404).json({ error: 'University not found' });
        return;
      }

      // Create or update the affiliation
      const affiliation = await prisma.affiliation.upsert({
        where: {
          userId_universityId: {
            userId: req.user.uid,
            universityId,
          },
        },
        update: {
          status: 'pending', // Set to pending for university approval
        },
        create: {
          userId: req.user.uid,
          universityId,
          status: 'pending', // Pending university approval
        },
      });

      res.json({
        message: 'University affiliation request submitted',
        affiliation,
      });
    } else {
      res.status(403).json({ error: 'Only university users or individuals can use this endpoint' });
    }
  } catch (error: any) {
    console.error('addStudentToUniversity error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all universities that a student is affiliated with
 */
export const getStudentUniversities: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'individual') {
      res.status(403).json({ error: 'Only individual users can access this endpoint' });
      return;
    }

    const affiliations = await prisma.affiliation.findMany({
      where: {
        userId: req.user.uid,
        status: 'active',
      },
      include: {
        university: true,
      },
    });

    const universities = affiliations.map(affiliation => affiliation.university);

    res.json(universities);
  } catch (error: any) {
    console.error('getStudentUniversities error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Register a new student and affiliate them with a university
 */
export const registerStudent: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'university') {
      res.status(403).json({ error: 'Only university users can register students' });
      return;
    }

    const { email, username, password, universityId } = req.body;

    if (!email || !username || !password || !universityId) {
      res.status(400).json({ error: 'Email, username, password, and universityId are required' });
      return;
    }

    // Check if the university exists and is owned by this user
    const university = await prisma.university.findFirst({
      where: {
        id: universityId,
        ownerId: req.user.uid,
      },
    });

    if (!university) {
      res.status(404).json({ error: 'University not found or not owned by you' });
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
        role: 'individual',
        orgName: 'orgindividual',
      },
      email_confirm: true, // Auto-confirm the email
    });

    if (authError || !authData.user) {
      throw authError || new Error('Failed to create user in Supabase');
    }

    const userId = authData.user.id;

    // Enroll user with Hyperledger Fabric
    await enrollUser(userId, 'orgindividual');

    // Create user in database
    const user = await prisma.user.create({
      data: {
        id: userId,
        username,
        role: 'individual',
        orgName: 'orgindividual',
        email,
      },
    });

    // Create the affiliation
    const affiliation = await prisma.affiliation.create({
      data: {
        userId,
        universityId,
        status: 'active', // Auto-approve
      },
    });

    // Record this affiliation on the blockchain
    try {
      const gateway = await getGateway(req.user.uid, req.user.orgName?.toLowerCase() || '');
      const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'legitifychannel');
      const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'degreeCC');

      await contract.submitTransaction('AddUniversityAffiliation', userId, universityId);
      gateway.disconnect();
    } catch (fabricError) {
      console.error('Failed to record affiliation on blockchain:', fabricError);
    }

    res.status(201).json({
      message: 'Student registered and affiliated successfully',
      user,
      affiliation,
    });
  } catch (error: any) {
    console.error('registerStudent error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all students affiliated with a university
 */
export const getUniversityStudents: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'university') {
      res.status(403).json({ error: 'Only university users can access this endpoint' });
      return;
    }

    const { universityId } = req.params;

    if (!universityId) {
      res.status(400).json({ error: 'University ID is required' });
      return;
    }

    // Check if the university exists and is owned by this user
    const university = await prisma.university.findFirst({
      where: {
        id: universityId,
        ownerId: req.user.uid,
      },
    });

    if (!university) {
      res.status(404).json({ error: 'University not found or not owned by you' });
      return;
    }

    // Get all active affiliations
    const affiliations = await prisma.affiliation.findMany({
      where: {
        universityId,
        status: 'active',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    const students = affiliations.map(affiliation => affiliation.user);

    res.json(students);
  } catch (error: any) {
    console.error('getUniversityStudents error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get pending university affiliations for the current user
 */
export const getPendingAffiliations: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'individual') {
      res.status(403).json({ error: 'Only individual users can access this endpoint' });
      return;
    }

    const affiliations = await prisma.affiliation.findMany({
      where: {
        userId: req.user.uid,
        status: 'pending',
      },
      include: {
        university: {
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

    res.json(affiliations);
  } catch (error: any) {
    console.error('getPendingAffiliations error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Respond to a university affiliation request
 */
export const respondToAffiliation: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'individual') {
      res.status(403).json({ error: 'Only individual users can respond to affiliation requests' });
      return;
    }

    const { affiliationId, accept } = req.body;
    console.log(
      `Handling affiliation response: affiliationId=${affiliationId}, accept=${accept}, userId=${req.user.uid}`,
    );

    if (!affiliationId) {
      res.status(400).json({ error: 'Affiliation ID is required' });
      return;
    }

    // Find the affiliation and verify it belongs to this user
    console.log(`Looking for affiliation with id=${affiliationId} for user=${req.user.uid}`);
    const affiliation = await prisma.affiliation.findFirst({
      where: {
        id: affiliationId,
        userId: req.user.uid,
        status: 'pending',
      },
    });

    if (!affiliation) {
      console.log(`No pending affiliation found for id=${affiliationId} and user=${req.user.uid}`);
      res.status(404).json({ error: 'Pending affiliation request not found' });
      return;
    }

    console.log(`Found affiliation: ${JSON.stringify(affiliation)}`);

    // Update the affiliation status
    const newStatus = accept ? 'active' : 'rejected';
    console.log(`Updating affiliation ${affiliationId} status to: ${newStatus}`);

    const updatedAffiliation = await prisma.affiliation.update({
      where: { id: affiliationId },
      data: { status: newStatus },
    });

    console.log(`Affiliation updated: ${JSON.stringify(updatedAffiliation)}`);

    // Record this on the blockchain if accepted
    if (accept) {
      try {
        const gateway = await getGateway(req.user.uid, req.user.orgName?.toLowerCase() || '');
        const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'legitifychannel');
        const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'degreeCC');

        await contract.submitTransaction(
          'AddUniversityAffiliation',
          req.user.uid,
          affiliation.universityId,
        );
        gateway.disconnect();
      } catch (fabricError) {
        console.error('Failed to record affiliation on blockchain:', fabricError);
      }
    }

    res.json({
      message: accept ? 'Affiliation accepted' : 'Affiliation rejected',
      status: newStatus,
      affiliation: updatedAffiliation,
    });
  } catch (error: any) {
    console.error('respondToAffiliation error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Request to join a university (for university users)
 */
export const requestJoinUniversity: RequestHandler = async (
  req: Request,
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
        ownerId: req.user.uid,
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
        requesterId: req.user.uid,
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
 * Approve or reject a university join request
 */
export const respondToJoinRequest: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'university') {
      res.status(403).json({ error: 'Only university users can respond to join requests' });
      return;
    }

    const { requestId, approve } = req.body;
    if (!requestId) {
      res.status(400).json({ error: 'Request ID is required' });
      return;
    }

    // Get the join request
    const joinRequest = await prisma.universityJoinRequest.findUnique({
      where: { id: requestId },
      include: { university: true },
    });

    if (!joinRequest) {
      res.status(404).json({ error: 'Join request not found' });
      return;
    }

    // Check if current user owns the university
    if (joinRequest.university.ownerId !== req.user.uid) {
      res.status(403).json({ error: 'You do not own this university' });
      return;
    }

    if (approve) {
      // Set the requester as a member of this university
      await prisma.university.update({
        where: { id: joinRequest.universityId },
        data: {
          members: {
            connect: { id: joinRequest.requesterId },
          },
        },
      });
    }

    // Update request status
    await prisma.universityJoinRequest.update({
      where: { id: requestId },
      data: { status: approve ? 'approved' : 'rejected' },
    });

    res.json({
      message: `Join request ${approve ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error: any) {
    console.error('respondToJoinRequest error:', error);
    res.status(500).json({ error: error.message });
  }
};
