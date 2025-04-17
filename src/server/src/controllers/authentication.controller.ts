import supabase from '@/config/supabase';
import prisma from '@/prisma/client';
import { enrollUser } from '@/utils/fabric-helpers';
import { OrgName, Role } from '@prisma/client';
import { Request, RequestHandler, Response } from 'express';
import { createUniversityHelper } from './university-management.controller';

async function createSupabaseUser(
  email: string,
  password: string,
  username: string,
  role: string,
  orgName: OrgName,
) {
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: {
      username,
      role,
      orgName,
    },
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw authError || new Error('Failed to create user in Supabase');
  }

  return authData.user;
}

async function createDatabaseUser(
  userId: string,
  username: string,
  role: Role,
  orgName: OrgName,
  email: string,
) {
  return prisma.user.create({
    data: {
      id: userId,
      username,
      role,
      orgName,
      email,
    },
  });
}

export const login: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, twoFactorCode } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

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

    const user = await prisma.user.findUnique({
      where: { id: data.user?.id },
      select: { twoFactorEnabled: true, twoFactorSecret: true },
    });

    if (user?.twoFactorEnabled && !twoFactorCode) {
      res.status(200).json({
        requiresTwoFactor: true,
        userId: data.user?.id,
        // Don't include the actual token yet, but include a temporary token for the 2FA step
        tempToken: data.session.access_token,
      });
      return;
    }

    // If 2FA is enabled and code was provided, verify it
    if (user?.twoFactorEnabled && twoFactorCode && user.twoFactorSecret) {
      const { verifyTOTP } = await import('@/utils/totp');

      const isCodeValid = verifyTOTP(user.twoFactorSecret, twoFactorCode);

      if (!isCodeValid) {
        res.status(401).json({ error: 'Invalid two-factor authentication code' });
        return;
      }
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
    console.log('Registration payload:', req.body);

    const {
      email,
      password,
      username,
      role,
      universityName,
      universityDisplayName,
      universityDescription,
      joinUniversityId,
      universityIds,
    } = req.body;

    if (!email || !password || !username || !role) {
      res.status(400).json({
        error: 'email, password, username, and role are required',
      });
      return;
    }

    // Map role to organization name
    let actualOrgName: OrgName;
    if (role === 'individual') {
      actualOrgName = OrgName.orgindividual;
    } else if (role === 'university') {
      actualOrgName = OrgName.orguniversity;
    } else if (role === 'employer') {
      actualOrgName = OrgName.orgemployer;
    } else {
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

    // Create user in Supabase
    const supabaseUser = await createSupabaseUser(email, password, username, role, actualOrgName);
    const userId = supabaseUser.id;

    // Enroll user with Hyperledger Fabric
    await enrollUser(userId, actualOrgName);

    // Create user in database
    await createDatabaseUser(userId, username, role as Role, actualOrgName, email);

    // Handle university-specific registration
    if (role === 'university') {
      if (universityName && universityDisplayName) {
        try {
          const university = await createUniversityHelper(
            userId,
            universityName,
            universityDisplayName,
            universityDescription,
          );

          res.status(201).json({
            message: 'University user and university created successfully',
            uid: userId,
            metadata: supabaseUser.user_metadata,
            university,
          });
          return;
        } catch (uniError) {
          console.error('Failed to create university during registration:', uniError);
          // Continue with user creation even if university creation fails
        }
      } else if (joinUniversityId) {
        // Handle join request - this will be processed as a university join request
        await prisma.universityJoinRequest.create({
          data: {
            requesterId: userId,
            universityId: joinUniversityId,
            status: 'pending',
          },
        });
      }
    }

    // Handle individual university affiliations
    if (role === 'individual' && universityIds?.length > 0) {
      const affiliationPromises = universityIds.map((universityId: string) =>
        prisma.studentAffiliation.create({
          data: {
            userId,
            universityId,
            status: 'pending',
            initiatedBy: 'student',
          },
        }),
      );
      await Promise.all(affiliationPromises);
    }

    res.status(201).json({
      message: 'User created successfully',
      uid: userId,
      metadata: supabaseUser.user_metadata,
    });
  } catch (error: any) {
    console.error('Registration error:', error);

    // Cleanup Supabase user if database creation failed
    if (error.code === 'P2002') {
      try {
        const userEmail = req.body.email;
        const dbUser = await prisma.user.findUnique({
          where: { email: userEmail },
        });

        if (dbUser?.id) {
          await supabase.auth.admin.deleteUser(dbUser.id);
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup Supabase user:', cleanupError);
      }
    }

    res.status(500).json({
      error: 'Registration failed',
      details: error.message,
    });
  }
};
