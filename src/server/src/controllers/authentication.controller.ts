import prisma from '@/prisma/client';
import { comparePassword, generateToken, hashPassword } from '@/utils/auth-utils';
import { enrollUser } from '@/utils/fabric-helpers';
import { OrgName, Role } from '@prisma/client';
import { Request, RequestHandler, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createIssuerHelper } from './issuer-management.controller';

async function createDatabaseUser(
  userId: string,
  username: string,
  role: Role,
  orgName: OrgName,
  email: string,
  passwordHash: string,
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
      password: passwordHash,
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

    const user = await prisma.user.findUnique({
      where: { email },
      select: { 
        id: true, 
        password: true, 
        orgName: true,
        role: true,
        twoFactorEnabled: true, 
        twoFactorSecret: true 
      },
    });

    if (!user || !(await comparePassword(password, user.password))) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    if (user.twoFactorEnabled && !twoFactorCode) {
      // 2FA flow
      // Generate a temporary short-lived token just for verifying 2FA if needed, 
      // or just return a flag telling frontend to ask for code.
      // For simplicity here, we assume frontend sends code if it knows 2FA is on?
      // But frontend doesn't know yet.
      // So we return `requiresTwoFactor: true`.
      // We shouldn't return a full access token yet.
      // Maybe a temp token with limited scope?
      
      // For now, let's stick to the existing response structure but we need a way to 
      // maintain state. The previous implementation returned `tempToken: data.session.access_token`.
      // Supabase handled this. 
      // We will generate a temporary JWT with scope '2fa_pending'
       const tempToken = generateToken({ userId: user.id, scope: '2fa_pending' });
       
      res.status(200).json({
        requiresTwoFactor: true,
        userId: user.id,
        tempToken: tempToken,
      });
      return;
    }

    // If 2FA is enabled and code was provided, verify it
    if (user.twoFactorEnabled && twoFactorCode && user.twoFactorSecret) {
      const { verifyTOTP } = await import('@/utils/totp');

      const isCodeValid = verifyTOTP(user.twoFactorSecret, twoFactorCode);

      if (!isCodeValid) {
        res.status(401).json({ error: 'Invalid two-factor authentication code' });
        return;
      }
    }

    const token = generateToken({ 
      userId: user.id, 
      email: email,
      role: user.role,
      orgName: user.orgName
    });

    // We can also return a refresh token if we implement that logic later.
    // For now, just access token.

    res.json({
      token: token,
      // No explicit refresh token yet unless we add it to schema
      expiresIn: 86400, // 24h
      uid: user.id,
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

    const userId = uuidv4();
    const passwordHash = await hashPassword(password);

    // Enroll user with Hyperledger Fabric
    // We do this BEFORE DB creation? Or after?
    // Supabase logic did: Create Supabase User -> Enroll -> Create DB User.
    // If Enroll fails, we have a Supabase user but no DB user (orphaned).
    // Let's try to Enroll first, if it fails, we abort.
    try {
        await enrollUser(userId, actualOrgName);
    } catch (fabricError) {
        console.error("Fabric enrollment failed:", fabricError);
         res.status(500).json({
            error: 'Blockchain enrollment failed. Please try again.',
            details: (fabricError as any).message,
        });
        return;
    }

    // Create user in database
    await createDatabaseUser(
      userId,
      username,
      role as Role,
      actualOrgName,
      email,
      passwordHash,
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

          // Return response here if issuer created
          const token = generateToken({ userId, email, role, orgName: actualOrgName });
          res.status(201).json({
            message: 'Issuer user and issuer created successfully',
            uid: userId,
            token, // Auto-login after register
            issuer,
          });
          return;
        } catch (issuerError) {
          console.error('Failed to create issuer during registration:', issuerError);
          // Continue... user is created but issuer failed?
        }
      } else if (joinIssuerId) {
        // Handle join request
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

    const token = generateToken({ userId, email, role, orgName: actualOrgName });

    res.status(201).json({
      message: 'User created successfully',
      uid: userId,
      token,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    // Note: If DB creation failed but Enroll succeeded, we might have a Fabric identity but no DB user.
    // Ideally we should rollback Fabric enrollment but that's hard.
    
    res.status(500).json({
      error: 'Registration failed',
      details: error.message,
    });
  }
};
