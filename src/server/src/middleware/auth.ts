import { RequestWithUser } from '@/types/user.types';
import { NextFunction, Response } from 'express';
import supabase from '../config/supabase';
import prisma from '../prisma/client';

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

    // Verify the Supabase token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Token verification error:', error);
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Get user from our database to get role and organization
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser?.role || !dbUser?.orgName) {
      console.error('Missing role or orgName for user:', user.id);
      res.status(403).json({ error: 'User missing required claims' });
      return;
    }

    req.user = {
      id: user.id,
      role: dbUser.role,
      orgName: dbUser.orgName,
    };

    console.log('Authenticated user:', {
      id: req.user.id,
      role: req.user.role,
      orgName: req.user.orgName,
    });

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
