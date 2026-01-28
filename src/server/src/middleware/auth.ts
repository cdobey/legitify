import { RequestWithUser } from '@/types/user.types';
import { NextFunction, Response } from 'express';
import prisma from '../prisma/client';
import { verifyToken } from '../utils/auth-utils';

export const authMiddleware = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify the local JWT token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      console.error('Token verification error:', err);
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    if (!decoded || !decoded.userId) {
       res.status(401).json({ error: 'Invalid token payload' });
       return;
    }

    // Get user from our database to get role and organization
    // optimizing by using the payload if role/org is in it, but for safety verify with DB
    // actually, let's trust DB for now or we could encode role in token
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!dbUser) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    if (!dbUser.role || !dbUser.orgName) {
      console.error('Missing role or orgName for user:', dbUser.id);
      res.status(403).json({ error: 'User missing required claims' });
      return;
    }

    req.user = {
      id: dbUser.id,
      role: dbUser.role,
      orgName: dbUser.orgName,
    };

    next();
  } catch (error: any) {
    console.error('Auth middleware error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    res.status(401).json({
      error: 'Authentication failed',
      message: error.message,
      code: error.code,
    });
  }
};
