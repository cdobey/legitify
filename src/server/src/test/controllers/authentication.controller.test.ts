import supabase from '@/config/supabase';
import { login, register } from '@/controllers/authentication.controller';
import { createIssuerHelper } from '@/controllers/issuer-management.controller';
import prisma from '@/prisma/client';
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

    it('should return 401 if supabase authentication fails', async () => {
      const { req, res } = createMockReqRes();
      req.body = { email: 'test@example.com', password: 'password123' };

      const mockSupabaseError = { message: 'Invalid login credentials' };
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: {},
        error: mockSupabaseError,
      });

      await login(req, res, {} as any);

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Authentication failed',
          details: mockSupabaseError.message,
        }),
      );
    });

    it('should return 401 if no session is returned', async () => {
      const { req, res } = createMockReqRes();
      req.body = { email: 'test@example.com', password: 'password123' };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: { id: 'user-id' } }, // No session
        error: null,
      });

      await login(req, res, {} as any);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'No session returned from Supabase',
        }),
      );
    });

    it('should request 2FA code if user has 2FA enabled', async () => {
      const { req, res } = createMockReqRes();
      req.body = { email: 'test@example.com', password: 'password123' };

      const mockUser = { id: 'user-id' };
      const mockSession = {
        access_token: 'mock-access-token',
        expires_at: 123456,
        refresh_token: 'mock-refresh-token',
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      (prisma.user.findUnique as any).mockResolvedValue({
        twoFactorEnabled: true,
        twoFactorSecret: 'secret',
      });

      await login(req, res, {} as any);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: { twoFactorEnabled: true, twoFactorSecret: true },
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        requiresTwoFactor: true,
        userId: mockUser.id,
        tempToken: mockSession.access_token,
      });
    });

    it('should return authentication token on successful login without 2FA', async () => {
      const { req, res } = createMockReqRes();
      req.body = { email: 'test@example.com', password: 'password123' };

      const mockUser = { id: 'user-id' };
      const mockSession = {
        access_token: 'mock-access-token',
        expires_at: 123456,
        refresh_token: 'mock-refresh-token',
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      (prisma.user.findUnique as any).mockResolvedValue({
        twoFactorEnabled: false,
      });

      await login(req, res, {} as any);

      expect(res.json).toHaveBeenCalledWith({
        token: mockSession.access_token,
        expiresIn: mockSession.expires_at,
        refreshToken: mockSession.refresh_token,
        uid: mockUser.id,
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

      // Mock Supabase user creation
      const mockSupabaseUser = {
        id: 'new-user-id',
        user_metadata: {
          username: 'testuser',
          role: 'holder',
          orgName: OrgName.orgholder,
        },
      };

      (supabase.auth.admin.createUser as any).mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      });

      // Mock Prisma user creation
      (prisma.user.create as any).mockResolvedValue({
        id: 'new-user-id',
        username: 'testuser',
        role: Role.holder,
        orgName: OrgName.orgholder,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        country: 'Ireland',
      });

      await register(req, res, {} as any);

      expect(supabase.auth.admin.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'password123',
          user_metadata: expect.any(Object),
          email_confirm: true,
        }),
      );

      expect(enrollUser).toHaveBeenCalledWith('new-user-id', OrgName.orgholder);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'new-user-id',
          username: 'testuser',
          role: 'holder',
          orgName: OrgName.orgholder,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          country: 'Ireland',
        }),
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User created successfully',
        uid: 'new-user-id',
        metadata: mockSupabaseUser.user_metadata,
      });
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

      // Mock Supabase user creation
      const mockSupabaseUser = {
        id: 'new-issuer-id',
        user_metadata: {
          username: 'testissuer',
          role: 'issuer',
          orgName: OrgName.orgissuer,
        },
      };

      (supabase.auth.admin.createUser as any).mockResolvedValue({
        data: { user: mockSupabaseUser },
        error: null,
      });

      // Mock Prisma user creation
      (prisma.user.create as any).mockResolvedValue({
        id: 'new-issuer-id',
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
        ownerId: 'new-issuer-id',
      };

      // Need to fuigure out proper type csting here
      (createIssuerHelper as any).mockResolvedValue(mockIssuer);

      await register(req, res, {} as any);

      expect(supabase.auth.admin.createUser).toHaveBeenCalled();
      expect(enrollUser).toHaveBeenCalledWith('new-issuer-id', OrgName.orgissuer);
      expect(prisma.user.create).toHaveBeenCalled();
      expect(createIssuerHelper).toHaveBeenCalledWith(
        'new-issuer-id',
        'test-university',
        'Test University',
        'A test university for educational purposes',
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Issuer user and issuer created successfully',
        uid: 'new-issuer-id',
        metadata: mockSupabaseUser.user_metadata,
        issuer: mockIssuer,
      });
    });
  });
});
