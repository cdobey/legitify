import supabase from '@/config/supabase';
import prisma from '@/prisma/client';
import { enrollUser } from '@/utils/fabric-helpers';
import { OrgName, Role } from '@prisma/client';
import { Request, RequestHandler, Response } from 'express';
import { createIssuerHelper } from './issuer-management.controller';

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
  firstName?: string,
  lastName?: string,
  country?: string,
) {
  return prisma.user.create({
    data: {
      id: userId,
      username,
      role,
      orgName,
      email,
      firstName,
      lastName,
      country,
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
      firstName,
      lastName,
      country,
      role,
      issuerName,
      issuerDisplayName,
      issuerDescription,
      joinIssuerId,
      issuerIds,
    } = req.body;

    if (!email || !password || !username || !role) {
      res.status(400).json({
        error: 'email, password, username, and role are required',
      });
      return;
    }

    // Map role to organization name
    let actualOrgName: OrgName;
    if (role === 'holder') {
      actualOrgName = OrgName.orgholder;
    } else if (role === 'issuer') {
      actualOrgName = OrgName.orgissuer;
    } else if (role === 'verifier') {
      actualOrgName = OrgName.orgverifier;
    } else {
      res.status(400).json({
        error: 'Invalid role. Must be "holder", "issuer", or "verifier"',
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
    await createDatabaseUser(
      userId,
      username,
      role as Role,
      actualOrgName,
      email,
      firstName,
      lastName,
      country,
    );

    // Handle issuer-specific registration
    if (role === 'issuer') {
      if (issuerName && issuerDisplayName) {
        try {
          const issuer = await createIssuerHelper(
            userId,
            issuerName,
            issuerDisplayName,
            issuerDescription,
          );

          res.status(201).json({
            message: 'Issuer user and issuer created successfully',
            uid: userId,
            metadata: supabaseUser.user_metadata,
            issuer,
          });
          return;
        } catch (issuerError) {
          console.error('Failed to create issuer during registration:', issuerError);
          // Continue with user creation even if issuer creation fails
        }
      } else if (joinIssuerId) {
        // Handle join request - this will be processed as an issuer join request
        await prisma.issuerJoinRequest.create({
          data: {
            requesterId: userId,
            issuerId: joinIssuerId,
            status: 'pending',
          },
        });
      }
    }

    // Handle holder issuer affiliations
    if (role === 'holder' && issuerIds?.length > 0) {
      const affiliationPromises = issuerIds.map((issuerId: string) =>
        prisma.issuerAffiliation.create({
          data: {
            userId,
            issuerId,
            status: 'pending',
            initiatedBy: 'holder',
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
