import { login, register } from '@/controllers/authentication.controller';
import { createIssuerHelper } from '@/controllers/issuer-management.controller';
import prisma from '@/prisma/client';
import * as authUtils from '@/utils/auth-utils';
import { enrollUser } from '@/utils/fabric-helpers';
import { OrgName, Role } from '@prisma/client';
import { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Prisma
vi.mock('@/prisma/client', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    issuerJoinRequest: {
      create: vi.fn(),
    },
    issuerAffiliation: {
      create: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

// Mock auth utilities
vi.mock('@/utils/auth-utils', () => ({
  comparePassword: vi.fn(),
  hashPassword: vi.fn(),
  generateToken: vi.fn(),
  verifyToken: vi.fn(),
}));

// Mock fabric helpers
vi.mock('@/utils/fabric-helpers', () => ({
  enrollUser: vi.fn(),
}));

// Mock for createIssuerHelper function
vi.mock('@/controllers/issuer-management.controller', () => ({
  createIssuerHelper: vi.fn().mockResolvedValue({
    id: 'issuer-uuid',
    name: 'test-university',
    shorthand: 'TU',
    description: 'Test University Description',
    ownerId: 'user-uuid',
  }),
}));

// Helper function to create mock request and response
function createMockReqRes() {
  const req = {
    body: {},
  } as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;

  return { req, res };
}

describe('Authentication Controller', () => {
  describe('login', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 400 if email or password is missing', async () => {
      const { req, res } = createMockReqRes();
      req.body = { email: 'test@example.com' }; // Missing password

      await login(req, res, {} as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringMatching(/email and password are required/i),
        }),
      );
    });

    it('should return 401 if user not found', async () => {
      const { req, res } = createMockReqRes();
      req.body = { email: 'test@example.com', password: 'password123' };

      (prisma.user.findUnique as any).mockResolvedValue(null);

      await login(req, res, {} as any);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: {
          id: true,
          password: true,
          orgName: true,
          role: true,
          twoFactorEnabled: true,
          twoFactorSecret: true,
        },
      });
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password' });
    });

    it('should return 401 if password is incorrect', async () => {
      const { req, res } = createMockReqRes();
      req.body = { email: 'test@example.com', password: 'wrongpassword' };

      const mockUser = {
        id: 'user-id',
        password: 'hashed-password',
        orgName: OrgName.orgholder,
        role: Role.holder,
        twoFactorEnabled: false,
        twoFactorSecret: null,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (authUtils.comparePassword as any).mockResolvedValue(false);

      await login(req, res, {} as any);

      expect(authUtils.comparePassword).toHaveBeenCalledWith('wrongpassword', 'hashed-password');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password' });
    });

    it('should request 2FA code if user has 2FA enabled', async () => {
      const { req, res } = createMockReqRes();
      req.body = { email: 'test@example.com', password: 'password123' };

      const mockUser = {
        id: 'user-id',
        password: 'hashed-password',
        orgName: OrgName.orgholder,
        role: Role.holder,
        twoFactorEnabled: true,
        twoFactorSecret: 'secret',
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (authUtils.comparePassword as any).mockResolvedValue(true);
      (authUtils.generateToken as any).mockReturnValue('temp-2fa-token');

      await login(req, res, {} as any);

      expect(authUtils.generateToken).toHaveBeenCalledWith({
        userId: 'user-id',
        scope: '2fa_pending',
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        requiresTwoFactor: true,
        userId: 'user-id',
        tempToken: 'temp-2fa-token',
      });
    });

    it('should return authentication token on successful login without 2FA', async () => {
      const { req, res } = createMockReqRes();
      req.body = { email: 'test@example.com', password: 'password123' };

      const mockUser = {
        id: 'user-id',
        password: 'hashed-password',
        orgName: OrgName.orgholder,
        role: Role.holder,
        twoFactorEnabled: false,
        twoFactorSecret: null,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (authUtils.comparePassword as any).mockResolvedValue(true);
      (authUtils.generateToken as any).mockReturnValue('mock-jwt-token');

      await login(req, res, {} as any);

      expect(authUtils.generateToken).toHaveBeenCalledWith({
        userId: 'user-id',
        email: 'test@example.com',
        role: Role.holder,
        orgName: OrgName.orgholder,
      });

      expect(res.json).toHaveBeenCalledWith({
        token: 'mock-jwt-token',
        expiresIn: 86400,
        uid: 'user-id',
      });
    });
  });

  describe('register', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 400 if required fields are missing', async () => {
      const { req, res } = createMockReqRes();
      req.body = { email: 'test@example.com', password: 'password123' }; // Missing username and role

      await register(req, res, {} as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'email, password, username, and role are required',
      });
    });

    it('should return 400 if role is invalid', async () => {
      const { req, res } = createMockReqRes();
      req.body = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        role: 'invalid-role',
      };

      await register(req, res, {} as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid role. Must be "holder", "issuer", or "verifier"',
      });
    });

    it('should return 400 if user already exists', async () => {
      const { req, res } = createMockReqRes();
      req.body = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        role: 'holder',
      };

      (prisma.user.findFirst as any).mockResolvedValue({
        id: 'existing-user-id',
        email: 'test@example.com',
      });

      await register(req, res, {} as any);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'test@example.com' }, { username: 'testuser' }],
        },
      });

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Email already registered',
      });
    });

    it('should successfully register a holder user', async () => {
      const { req, res } = createMockReqRes();
      req.body = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testuser',
        role: 'holder',
        firstName: 'Test',
        lastName: 'User',
        country: 'Ireland',
      };

      (prisma.user.findFirst as any).mockResolvedValue(null);
      (authUtils.hashPassword as any).mockResolvedValue('hashed-password');
      (enrollUser as any).mockResolvedValue(undefined);
      (prisma.user.create as any).mockResolvedValue({
        id: expect.any(String),
        username: 'testuser',
        role: Role.holder,
        orgName: OrgName.orgholder,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        country: 'Ireland',
      });
      (authUtils.generateToken as any).mockReturnValue('mock-jwt-token');

      await register(req, res, {} as any);

      expect(authUtils.hashPassword).toHaveBeenCalledWith('password123');
      expect(enrollUser).toHaveBeenCalledWith(expect.any(String), OrgName.orgholder);
      expect(prisma.user.create).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User created successfully',
          uid: expect.any(String),
          token: 'mock-jwt-token',
        }),
      );
    });

    it('should successfully register an issuer user with issuer details', async () => {
      const { req, res } = createMockReqRes();
      req.body = {
        email: 'test@example.com',
        password: 'password123',
        username: 'testissuer',
        role: 'issuer',
        issuerName: 'test-university',
        issuerDisplayName: 'Test University',
        issuerDescription: 'A test university for educational purposes',
      };

      // No existing user
      (prisma.user.findFirst as any).mockResolvedValue(null);
      (authUtils.hashPassword as any).mockResolvedValue('hashed-password');
      (enrollUser as any).mockResolvedValue(undefined);
      (prisma.user.create as any).mockResolvedValue({
        id: expect.any(String),
        username: 'testissuer',
        role: Role.issuer,
        orgName: OrgName.orgissuer,
        email: 'test@example.com',
      });

      // Mock the return value from createIssuerHelper
      const mockIssuer = {
        id: 'issuer-uuid',
        name: 'test-university',
        shorthand: 'TU',
        description: 'Test University Description',
        ownerId: expect.any(String),
      };

      (createIssuerHelper as any).mockResolvedValue(mockIssuer);
      (authUtils.generateToken as any).mockReturnValue('mock-jwt-token');

      await register(req, res, {} as any);

      expect(enrollUser).toHaveBeenCalledWith(expect.any(String), OrgName.orgissuer);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(createIssuerHelper).toHaveBeenCalledWith(
        expect.any(String),
        'test-university',
        'Test University',
        'A test university for educational purposes',
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Issuer user and issuer created successfully',
          uid: expect.any(String),
          token: 'mock-jwt-token',
          issuer: mockIssuer,
        }),
      );
    });
  });
});
