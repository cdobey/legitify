import { getGateway } from '@/config/gateway';
import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { RequestHandler, Response } from 'express';

/**
 * Add a student to a university (create affiliation)
 */
export const addStudentToUniversity: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'university') {
      res.status(403).json({ error: 'Only university users can add students' });
      return;
    }

    const { universityId, studentEmail } = req.body;
    if (!universityId || !studentEmail) {
      res.status(400).json({ error: 'Missing universityId or studentEmail' });
      return;
    }

    // Check if university exists and is owned by this user
    const university = await prisma.university.findFirst({
      where: {
        id: universityId,
        ownerId: req.user.id,
      },
    });

    if (!university) {
      res.status(404).json({ error: 'University not found or not owned by you' });
      return;
    }

    // Find student by email
    const student = await prisma.user.findFirst({
      where: {
        email: studentEmail,
        role: 'individual',
      },
    });

    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    // Check if affiliation already exists
    const existingAffiliation = await prisma.affiliation.findFirst({
      where: {
        userId: student.id,
        universityId,
      },
    });

    if (existingAffiliation) {
      // Return appropriate message based on status
      if (existingAffiliation.status === 'active') {
        res.status(400).json({ error: 'Student is already affiliated with this university' });
      } else if (existingAffiliation.status === 'pending') {
        res.status(400).json({ error: 'Affiliation request is already pending' });
      } else {
        res.status(400).json({ error: 'Previous affiliation request was rejected' });
      }
      return;
    }

    // Create the affiliation request with university as initiator
    const affiliation = await prisma.affiliation.create({
      data: {
        userId: student.id,
        universityId,
        status: 'pending',
        initiatedBy: 'university',
      },
    });

    res.status(201).json({
      message: 'Student affiliation request sent successfully',
      affiliation,
    });
  } catch (error: any) {
    console.error('addStudentToUniversity error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all students affiliated with a university
 */
export const getUniversityStudents: RequestHandler = async (
  req: RequestWithUser,
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
        ownerId: req.user.id,
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
 * Get all universities that a student is affiliated with
 */
export const getStudentUniversities: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'individual') {
      res.status(403).json({ error: 'Only individual users can access this endpoint' });
      return;
    }

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
  } catch (error: any) {
    console.error('getStudentUniversities error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get pending university affiliations for the current user
 * This function handles both individual users and university users
 */
export const getPendingAffiliations: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // For individual users - return their pending affiliations
    if (req.user?.role === 'individual') {
      const pendingAffiliations = await prisma.affiliation.findMany({
        where: {
          userId: req.user.id,
          status: 'pending',
        },
        include: {
          university: {
            select: {
              id: true,
              name: true,
              displayName: true,
              description: true,
            },
          },
        },
      });

      res.json(pendingAffiliations);
      return;
    }

    // For university users - return pending affiliations for their university
    else if (req.user?.role === 'university') {
      // Find the university owned by this user
      const university = await prisma.university.findFirst({
        where: {
          ownerId: req.user.id,
        },
      });

      if (!university) {
        res.status(404).json({ error: 'No university found for this user' });
        return;
      }

      // Get pending affiliations for this university
      const pendingAffiliations = await prisma.affiliation.findMany({
        where: {
          universityId: university.id,
          status: 'pending',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          university: true,
        },
      });

      res.json(pendingAffiliations);
      return;
    }

    res.status(403).json({ error: 'Unauthorized access' });
  } catch (error: any) {
    console.error('getPendingAffiliations error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Respond to a university affiliation request
 * This function now properly handles authorization based on who initiated the request
 */
export const respondToAffiliation: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    const { affiliationId, accept } = req.body;
    const userId = req.user?.id;

    if (!affiliationId || accept === undefined || !userId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Find the affiliation request first
    const affiliationRequest = await prisma.affiliation.findUnique({
      where: { id: affiliationId },
      include: {
        university: true,
      },
    });

    if (!affiliationRequest) {
      res.status(404).json({ error: 'Affiliation request not found' });
      return;
    }

    // Case 1: If university initiated the request, student should be able to respond
    if (affiliationRequest.initiatedBy === 'university') {
      // Verify responder is the student who received the invitation
      if (req.user?.role !== 'individual' || affiliationRequest.userId !== req.user.id) {
        res.status(403).json({
          error: 'Only the invited student can respond to this invitation',
        });
        return;
      }
    }

    // Case 2: If student initiated the request, university should be able to respond
    else if (affiliationRequest.initiatedBy === 'student' || !affiliationRequest.initiatedBy) {
      // Verify responder is the university owner
      if (
        req.user?.role !== 'university' ||
        affiliationRequest.university.ownerId !== req.user.id
      ) {
        res.status(403).json({
          error: 'Only the university owner can respond to this join request',
        });
        return;
      }
    }

    // Update the status based on the response
    const newStatus = accept ? 'active' : 'rejected';
    const updatedAffiliation = await prisma.affiliation.update({
      where: { id: affiliationId },
      data: { status: newStatus },
    });

    // If accepted, record this affiliation on the blockchain
    if (accept && req.user) {
      try {
        const gateway = await getGateway(req.user.id, req.user.orgName?.toLowerCase() || '');
        const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'legitifychannel');
        const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'degreeCC');

        await contract.submitTransaction(
          'AddUniversityAffiliation',
          affiliationRequest.userId,
          affiliationRequest.universityId,
        );
        gateway.disconnect();
      } catch (fabricError) {
        console.error('Failed to record affiliation on blockchain:', fabricError);
        // Continue anyway since the database update was successful
      }
    }

    res.json({
      message: `Affiliation request ${accept ? 'accepted' : 'rejected'}`,
      affiliation: updatedAffiliation,
    });
  } catch (error: any) {
    console.error('respondToAffiliation error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Register a new student and affiliate them with a university
 */
export const registerStudent: RequestHandler = async (
  req: RequestWithUser,
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
        ownerId: req.user.id,
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
      email_confirm: true, // Auto-confirm the email for testing purposes
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
      const gateway = await getGateway(req.user.id, req.user.orgName?.toLowerCase() || '');
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
