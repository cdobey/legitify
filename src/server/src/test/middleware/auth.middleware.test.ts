import supabase from '@/config/supabase';
import { authMiddleware } from '@/middleware/auth';
import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { OrgName, Role } from '@prisma/client';
import { NextFunction, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock prisma
vi.mock('@/prisma/client', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Auth Middleware', () => {
  let mockReq: RequestWithUser;
  let mockRes: Response;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      headers: {
        authorization: 'Bearer valid-token',
      },
      user: undefined,
    } as unknown as RequestWithUser;

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    mockNext = vi.fn() as unknown as NextFunction;
  });

  it('should return 401 if no auth header is provided', async () => {
    mockReq.headers = {}; // No authorization header

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if auth header does not start with Bearer', async () => {
    mockReq.headers.authorization = 'InvalidFormat token';

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token verification fails', async () => {
    const mockError = new Error('Invalid token');
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: mockError,
    });

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(supabase.auth.getUser).toHaveBeenCalledWith('valid-token');
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 if user is missing role or orgName', async () => {
    const mockUser = { id: 'user-id' };
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Missing role and orgName
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-id',
    });

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-id' },
    });
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'User missing required claims' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should set user data and call next() on successful authentication', async () => {
    const mockUser = { id: 'user-id' };
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const mockDbUser = {
      id: 'user-id',
      role: Role.holder,
      orgName: OrgName.orgholder,
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockDbUser);

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-id' },
    });

    expect(mockReq.user).toEqual({
      id: 'user-id',
      role: Role.holder,
      orgName: OrgName.orgholder,
    });

    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle unexpected errors', async () => {
    const mockError = new Error('Unexpected error');
    (supabase.auth.getUser as any).mockRejectedValue(mockError);

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Authentication failed',
        message: mockError.message,
      }),
    );
    expect(mockNext).not.toHaveBeenCalled();
  });
});
