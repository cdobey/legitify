import { OrgName, Role } from '@prisma/client'; // Import Prisma enums
import { Request, RequestHandler, Response } from 'express';
import supabase from '../config/supabase';
import prisma from '../prisma/client';
import { enrollUser } from '../utils/fabric-helpers';

export const login: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Sign in error:', error);
      res.status(401).json({
        error: 'Authentication failed',
        details: error.message,
      });
      return;
    }

    if (!data.session) {
      res.status(401).json({ error: 'No session returned from Supabase' });
      return;
    }

    res.json({
      token: data.session.access_token,
      expiresIn: data.session.expires_at,
      refreshToken: data.session.refresh_token,
      uid: data.user?.id,
    });
  } catch (error: any) {
    console.error('Login error:', {
      message: error.message,
      stack: error.stack,
    });
    res.status(401).json({
      error: 'Authentication failed',
      details: error.message,
    });
  }
};

export const register: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Registration payload:', req.body); // Add debug logging

    const {
      email,
      password,
      username,
      role,
      universityIds,
      joinUniversityId,
      universityName,
      universityDisplayName,
      universityDescription,
      orgName,
    } = req.body;

    // Validate input
    if (!email || !password || !username || !role) {
      res.status(400).json({
        error: 'email, password, username, and role are required',
      });
      return;
    }

    // Map role to the correct organization name using Prisma enum
    let actualOrgName: OrgName;
    if (role === 'individual') {
      actualOrgName = OrgName.orgindividual;
    } else if (role === 'university') {
      actualOrgName = OrgName.orguniversity;
    } else if (role === 'employer') {
      actualOrgName = OrgName.orgemployer;
    } else {
      // If the role is invalid
      res.status(400).json({
        error: 'Invalid role. Must be "individual", "university", or "employer"',
      });
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

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        username,
        role,
        orgName: actualOrgName, // This is fine as Supabase just stores it as a string
      },
      email_confirm: true, // Auto-confirm the email
    });

    if (authError || !authData.user) {
      throw authError || new Error('Failed to create user in Supabase');
    }

    const userId = authData.user.id;

    // Enroll user with Hyperledger Fabric
    await enrollUser(userId, actualOrgName);

    // Create user in database with the proper enum values
    const user = await prisma.user.create({
      data: {
        id: userId,
        username,
        role: role as Role, // Cast to Prisma enum
        orgName: actualOrgName, // Use the enum value
        email,
      },
    });

    // Handle university registration if they're creating on signup
    if (role === 'university' && universityName && universityDisplayName) {
      try {
        console.log(
          'Creating university with name:',
          universityName,
          'and display name:',
          universityDisplayName,
        );

        const university = await prisma.university.create({
          data: {
            name: universityName,
            displayName: universityDisplayName,
            description: universityDescription || '',
            ownerId: userId,
          },
        });

        console.log('University created successfully:', university);

        res.status(201).json({
          message: 'University user and university created successfully',
          uid: userId,
          metadata: authData.user.user_metadata,
          university: university,
        });
        return;
      } catch (uniError) {
        console.error('Failed to create university during registration:', uniError);
        // We still created the user, but let's log specific error details
        if ((uniError as any).code === 'P2002') {
          console.error('Unique constraint violation - university name may already exist');
        }
      }
    }

    // Handle university join request
    if (role === 'university' && joinUniversityId) {
      try {
        // Create join request through the university controller
        await prisma.universityJoinRequest.create({
          data: {
            requesterId: userId,
            universityId: joinUniversityId,
            status: 'pending',
          },
        });
      } catch (joinError) {
        console.error('Failed to create university join request:', joinError);
      }
    }

    // Handle university affiliation for individuals
    if (
      role === 'individual' &&
      universityIds &&
      Array.isArray(universityIds) &&
      universityIds.length > 0
    ) {
      try {
        // Create affiliations
        const affiliationPromises = universityIds.map(async (universityId: string) => {
          return prisma.affiliation.create({
            data: {
              userId,
              universityId,
              status: 'pending', // Pending university approval
            },
          });
        });

        await Promise.all(affiliationPromises);

        res.status(201).json({
          message: 'User created with university affiliation requests',
          uid: userId,
          metadata: authData.user.user_metadata,
        });
        return;
      } catch (affError) {
        console.error('Failed to create university affiliations:', affError);
        // Still proceed with user creation
      }
    }

    // Just return success if we're here
    res.status(201).json({
      message: 'User created successfully',
      uid: userId,
      metadata: authData.user.user_metadata,
    });
  } catch (error: any) {
    console.error('Registration error:', error);

    // If Supabase user was created but database creation failed
    if (error.code === 'P2002' && error.meta?.target) {
      // Prisma unique constraint error
      try {
        // Since we can't directly filter users in Supabase admin API,
        // we'll need to search for the user in our database first
        const userEmail = req.body.email;
        const dbUser = await prisma.user.findUnique({
          where: { email: userEmail },
        });

        if (dbUser?.id) {
          // Now delete the user from Supabase
          await supabase.auth.admin.deleteUser(dbUser.id);
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup Supabase user:', cleanupError);
      }
      res.status(400).json({
        error: `${error.meta.target.join(', ')} already exists`,
      });
      return;
    }

    res.status(500).json({ error: error.message });
  }
};

export const deleteAccount: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Delete from Supabase Auth
    const { error } = await supabase.auth.admin.deleteUser(uid);
    if (error) throw error;

    // Delete from database
    await prisma.user.delete({
      where: { id: uid },
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Invalidate the session in Supabase
    const { error } = await supabase.auth.admin.signOut(uid);

    if (error) {
      throw error;
    }

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
};
