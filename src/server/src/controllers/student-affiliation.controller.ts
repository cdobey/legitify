import { getGateway } from '@/config/gateway';
import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { AffiliationStatus, MembershipStatus } from '@prisma/client';
import { RequestHandler, Response } from 'express';

/**
 * Add a student to a university (create student affiliation)
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

    // Check if the user is a member of this university
    const membership = await prisma.universityMember.findFirst({
      where: {
        userId: req.user.id,
        universityId,
        status: MembershipStatus.active,
      },
    });

    if (!membership) {
      res.status(403).json({ error: 'You must be a member of this university to add students' });
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
    const existingAffiliation = await prisma.studentAffiliation.findFirst({
      where: {
        userId: student.id,
        universityId,
      },
    });

    if (existingAffiliation) {
      // Return appropriate message based on status
      if (existingAffiliation.status === AffiliationStatus.active) {
        res.status(400).json({ error: 'Student is already affiliated with this university' });
      } else if (existingAffiliation.status === AffiliationStatus.pending) {
        res.status(400).json({ error: 'Affiliation request is already pending' });
      } else {
        res.status(400).json({ error: 'Previous affiliation request was rejected' });
      }
      return;
    }

    // Create the affiliation request with university as initiator
    const affiliation = await prisma.studentAffiliation.create({
      data: {
        userId: student.id,
        universityId,
        status: AffiliationStatus.pending,
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

    // Check if the user is a member of this university
    const membership = await prisma.universityMember.findFirst({
      where: {
        userId: req.user.id,
        universityId,
        status: MembershipStatus.active,
      },
    });

    if (!membership) {
      res
        .status(403)
        .json({ error: 'You must be a member of this university to view its students' });
      return;
    }

    // Get all active student affiliations
    const affiliations = await prisma.studentAffiliation.findMany({
      where: {
        universityId,
        status: AffiliationStatus.active,
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
    });

    const students = affiliations.map(affiliation => affiliation.student);

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

    const affiliations = await prisma.studentAffiliation.findMany({
      where: {
        userId: req.user.id,
        status: AffiliationStatus.active,
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

    const universities = affiliations.map(affiliation => affiliation.university);

    res.json(universities);
  } catch (error: any) {
    console.error('getStudentUniversities error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get pending student affiliation requests for universities the user is a member of
 */
export const getPendingAffiliations: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // For individual users - return their pending university affiliations
    if (req.user?.role === 'individual') {
      const pendingAffiliations = await prisma.studentAffiliation.findMany({
        where: {
          userId: req.user.id,
          status: AffiliationStatus.pending,
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

      res.json(pendingAffiliations);
      return;
    }

    // For university users - return pending student affiliations for universities they're members of
    else if (req.user?.role === 'university') {
      // Find universities where this user is a member
      const memberships = await prisma.universityMember.findMany({
        where: {
          userId: req.user.id,
          status: MembershipStatus.active,
        },
        select: {
          universityId: true,
        },
      });

      if (!memberships || memberships.length === 0) {
        res.json([]); // Return empty array rather than 404
        return;
      }

      // Get university IDs where this user is a member
      const universityIds = memberships.map(m => m.universityId);

      // Get pending student affiliations for these universities
      const pendingAffiliations = await prisma.studentAffiliation.findMany({
        where: {
          universityId: { in: universityIds },
          status: AffiliationStatus.pending,
        },
        include: {
          student: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
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

      // Transform to maintain backward compatibility with the UI
      const transformedAffiliations = pendingAffiliations.map(affiliation => ({
        id: affiliation.id,
        userId: affiliation.userId,
        universityId: affiliation.universityId,
        status: affiliation.status,
        initiatedBy: affiliation.initiatedBy,
        createdAt: affiliation.createdAt,
        updatedAt: affiliation.updatedAt,
        user: affiliation.student,
        university: affiliation.university,
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
 * Respond to a student university affiliation request
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
    const affiliationRequest = await prisma.studentAffiliation.findUnique({
      where: { id: affiliationId },
      include: {
        university: true,
      },
    });

    if (!affiliationRequest) {
      res.status(404).json({ error: 'Affiliation request not found' });
      return;
    }

    // Case 1: University initiated the request, student should respond
    if (affiliationRequest.initiatedBy === 'university') {
      // Verify responder is the student
      if (req.user?.role !== 'individual' || affiliationRequest.userId !== req.user.id) {
        res.status(403).json({
          error: 'Only the invited student can respond to this invitation',
        });
        return;
      }
    }
    // Case 2: Student initiated the request, university member should respond
    else if (affiliationRequest.initiatedBy === 'student' || !affiliationRequest.initiatedBy) {
      if (req.user?.role !== 'university') {
        res.status(403).json({
          error: 'Only university members can respond to student join requests',
        });
        return;
      }

      // Verify responder is a member of the university
      const membership = await prisma.universityMember.findFirst({
        where: {
          userId: req.user.id,
          universityId: affiliationRequest.universityId,
          status: MembershipStatus.active,
        },
      });

      if (!membership) {
        res.status(403).json({
          error: 'You must be a member of this university to respond to join requests',
        });
        return;
      }
    }

    // Update the status based on the response
    const newStatus = accept ? AffiliationStatus.active : AffiliationStatus.rejected;
    const updatedAffiliation = await prisma.studentAffiliation.update({
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
      message: `Student affiliation request ${accept ? 'accepted' : 'rejected'}`,
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

    // Check if the user is a member of this university
    const membership = await prisma.universityMember.findFirst({
      where: {
        userId: req.user.id,
        universityId,
        status: MembershipStatus.active,
      },
    });

    if (!membership) {
      res
        .status(403)
        .json({ error: 'You must be a member of this university to register students' });
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

    // Create the student affiliation
    const affiliation = await prisma.studentAffiliation.create({
      data: {
        userId,
        universityId,
        status: AffiliationStatus.active, // Auto-approve
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

/**
 * Request student affiliation with a university
 * This is specifically for individual (student) users to request to join universities
 */
export const requestStudentAffiliation: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'individual') {
      res.status(403).json({ error: 'Only individual users can request student affiliations' });
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

    // Check if the affiliation already exists
    const existingAffiliation = await prisma.studentAffiliation.findFirst({
      where: {
        userId: req.user.id,
        universityId,
      },
    });

    if (existingAffiliation) {
      // Return appropriate message based on status
      if (existingAffiliation.status === AffiliationStatus.active) {
        res.status(400).json({ error: 'You are already affiliated with this university' });
      } else if (existingAffiliation.status === AffiliationStatus.pending) {
        res.status(400).json({ error: 'Your affiliation request is already pending' });
      } else {
        res.status(400).json({ error: 'Your previous affiliation request was rejected' });
      }
      return;
    }

    // Create the student affiliation request
    const affiliation = await prisma.studentAffiliation.create({
      data: {
        userId: req.user.id,
        universityId,
        status: AffiliationStatus.pending,
        initiatedBy: 'student',
      },
    });

    res.status(201).json({
      message: 'Student affiliation request submitted successfully',
      affiliation,
    });
  } catch (error: any) {
    console.error('requestStudentAffiliation error:', error);
    res.status(500).json({ error: error.message });
  }
};
