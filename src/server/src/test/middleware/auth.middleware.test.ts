import { authMiddleware } from '@/middleware/auth';
import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import * as authUtils from '@/utils/auth-utils';
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

// Mock auth utilities
vi.mock('@/utils/auth-utils', () => ({
  verifyToken: vi.fn(),
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
    (authUtils.verifyToken as any).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(authUtils.verifyToken).toHaveBeenCalledWith('valid-token');
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if token payload is invalid', async () => {
    (authUtils.verifyToken as any).mockReturnValue({}); // No userId

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token payload' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 404 if user not found in database', async () => {
    (authUtils.verifyToken as any).mockReturnValue({ userId: 'user-id' });
    (prisma.user.findUnique as any).mockResolvedValue(null);

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-id' },
    });
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 403 if user is missing role or orgName', async () => {
    (authUtils.verifyToken as any).mockReturnValue({ userId: 'user-id' });
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-id',
      // Missing role and orgName
    });

    await authMiddleware(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'User missing required claims' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should set user data and call next() on successful authentication', async () => {
    const mockDbUser = {
      id: 'user-id',
      role: Role.holder,
      orgName: OrgName.orgholder,
    };

    (authUtils.verifyToken as any).mockReturnValue({ userId: 'user-id' });
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
});
