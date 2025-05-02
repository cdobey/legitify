import { getGateway } from '@/config/gateway';
import {
  getAllLedgerRecords,
  getMyCredentials,
  getRecentIssuedCredentials,
  getUserCredentials,
} from '@/controllers/credential-lookup.controller';
import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { CredentialStatus, OrgName, Role } from '@prisma/client';
import { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('@/prisma/client', () => ({
  default: {
    credential: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    issuerMember: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/config/gateway', () => ({
  getGateway: vi.fn(),
}));

describe('Credential Lookup Controller', () => {
  let mockReq: RequestWithUser;
  let mockRes: Response;
  let mockGateway: any;
  let mockNetwork: any;
  let mockContract: any;

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup request and response mocks
    mockReq = {
      user: {
        id: 'user-id',
        role: 'holder' as Role,
        orgName: OrgName.orgholder,
      },
      params: {},
    } as RequestWithUser;

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    // Setup Fabric mocks
    mockContract = {
      evaluateTransaction: vi.fn(),
    };

    mockNetwork = {
      getContract: vi.fn().mockReturnValue(mockContract),
    };

    mockGateway = {
      getNetwork: vi.fn().mockResolvedValue(mockNetwork),
      disconnect: vi.fn(),
    };

    (getGateway as any).mockResolvedValue(mockGateway);
  });

  describe('getMyCredentials', () => {
    it('should return all credentials issued to the current user', async () => {
      // Arrange
      const mockCredentials = [
        {
          id: 'credential-id-1',
          status: CredentialStatus.accepted,
          createdAt: new Date('2025-01-01'),
          type: 'certificate',
          title: 'Example Certificate',
          issuerOrgId: 'issuer-org-id',
          issuer: {
            orgName: OrgName.orgissuer,
          },
          issuerOrg: {
            shorthand: 'TEST',
            name: 'Test University',
          },
        },
        {
          id: 'credential-id-2',
          status: CredentialStatus.issued,
          createdAt: new Date('2025-01-02'),
          type: 'badge',
          title: 'Example Badge',
          issuerOrgId: 'issuer-org-id-2',
          issuer: {
            orgName: OrgName.orgissuer,
          },
          issuerOrg: null, // Testing fallback to issuer.orgName
        },
      ];

      (prisma.credential.findMany as any).mockResolvedValue(mockCredentials);

      // Act
      await getMyCredentials(mockReq, mockRes, {} as any);

      // Assert
      expect(prisma.credential.findMany).toHaveBeenCalledWith({
        where: {
          holderId: 'user-id',
        },
        include: expect.any(Object),
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(mockRes.json).toHaveBeenCalledWith([
        {
          docId: 'credential-id-1',
          issuer: 'TEST',
          status: CredentialStatus.accepted,
          issueDate: mockCredentials[0].createdAt,
          issuerId: 'issuer-org-id',
          type: 'certificate',
          title: 'Example Certificate',
        },
        {
          docId: 'credential-id-2',
          issuer: OrgName.orgissuer, // Fallback value
          status: CredentialStatus.issued,
          issueDate: mockCredentials[1].createdAt,
          issuerId: 'issuer-org-id-2',
          type: 'badge',
          title: 'Example Badge',
        },
      ]);
    });

    it('should handle errors', async () => {
      // Arrange
      const mockError = new Error('Database error');
      (prisma.credential.findMany as any).mockRejectedValue(mockError);

      // Act
      await getMyCredentials(mockReq, mockRes, {} as any);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getAllLedgerRecords', () => {
    beforeEach(() => {
      // Setup for issuer
      mockReq.user = {
        id: 'issuer-id',
        role: 'issuer' as Role,
        orgName: OrgName.orgissuer,
      };
    });

    it('should return 403 if user is not an issuer', async () => {
      // Arrange
      mockReq.user = {
        id: 'non-issuer-id',
        role: 'holder' as Role,
        orgName: OrgName.orgholder,
      };

      // Act
      await getAllLedgerRecords(mockReq, mockRes, {} as any);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Only issuers can view all records' });
    });

    it('should return 404 if user has no active issuer membership', async () => {
      // Arrange
      (prisma.issuerMember.findFirst as any).mockResolvedValue(null);

      // Act
      await getAllLedgerRecords(mockReq, mockRes, {} as any);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No active issuer membership found for this user',
      });
    });

    it('should return records from the blockchain ledger', async () => {
      // Arrange
      const mockIssuerMembership = {
        userId: 'issuer-id',
        issuerId: 'issuer-org-id',
        status: 'active',
        issuer: {
          id: 'issuer-org-id',
          shorthand: 'TEST',
        },
      };

      const mockBlockchainRecords = [
        {
          docId: 'doc-id-1',
          docHash: 'hash-1',
          holderId: 'holder-id-1',
          issuerId: 'issuer-id',
          type: 'certificate',
          title: 'Test Certificate',
        },
        {
          docId: 'doc-id-2',
          docHash: 'hash-2',
          holderId: 'holder-id-2',
          issuerId: 'issuer-id',
          type: 'badge',
          title: 'Test Badge',
        },
      ];

      const mockUsers = [
        { id: 'holder-id-1', email: 'holder1@example.com' },
        { id: 'holder-id-2', email: 'holder2@example.com' },
      ];

      (prisma.issuerMember.findFirst as any).mockResolvedValue(mockIssuerMembership);
      (mockContract.evaluateTransaction as any).mockResolvedValue(
        Buffer.from(JSON.stringify(mockBlockchainRecords)),
      );
      (prisma.user.findMany as any).mockResolvedValue(mockUsers);

      // Act
      await getAllLedgerRecords(mockReq, mockRes, {} as any);

      // Assert
      expect(mockGateway.getNetwork).toHaveBeenCalled();
      expect(mockContract.evaluateTransaction).toHaveBeenCalledWith(
        'GetIssuerCredentials',
        'issuer-org-id',
      );
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['holder-id-1', 'holder-id-2'],
          },
        },
        select: {
          id: true,
          email: true,
        },
      });
      expect(mockGateway.disconnect).toHaveBeenCalled();

      // Check enriched records
      expect(mockRes.json).toHaveBeenCalledWith([
        {
          ...mockBlockchainRecords[0],
          issuerName: 'TEST',
          holderEmail: 'holder1@example.com',
        },
        {
          ...mockBlockchainRecords[1],
          issuerName: 'TEST',
          holderEmail: 'holder2@example.com',
        },
      ]);
    });

    it('should handle empty blockchain results', async () => {
      // Arrange
      const mockIssuerMembership = {
        userId: 'issuer-id',
        issuerId: 'issuer-org-id',
        status: 'active',
        issuer: {
          id: 'issuer-org-id',
          shorthand: 'TEST',
        },
      };

      (prisma.issuerMember.findFirst as any).mockResolvedValue(mockIssuerMembership);
      (mockContract.evaluateTransaction as any).mockResolvedValue(Buffer.from(''));

      // Act
      await getAllLedgerRecords(mockReq, mockRes, {} as any);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    it('should handle JSON parse errors', async () => {
      // Arrange
      const mockIssuerMembership = {
        userId: 'issuer-id',
        issuerId: 'issuer-org-id',
        status: 'active',
        issuer: {
          id: 'issuer-org-id',
          shorthand: 'TEST',
        },
      };

      (prisma.issuerMember.findFirst as any).mockResolvedValue(mockIssuerMembership);
      (mockContract.evaluateTransaction as any).mockResolvedValue(Buffer.from('invalid-json'));

      // Mock console.error to prevent noise in test output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await getAllLedgerRecords(mockReq, mockRes, {} as any);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith([]);

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });

    it('should handle errors', async () => {
      // Arrange
      const mockError = new Error('Blockchain error');
      (prisma.issuerMember.findFirst as any).mockRejectedValue(mockError);

      // Act
      await getAllLedgerRecords(mockReq, mockRes, {} as any);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Blockchain error',
      });
    });
  });

  describe('getUserCredentials', () => {
    beforeEach(() => {
      // Setup for verifier
      mockReq.user = {
        id: 'verifier-id',
        role: 'verifier' as Role,
        orgName: OrgName.orgverifier,
      };
      mockReq.params = { userId: 'target-user-id' };
    });

    it('should return 403 if user is not a verifier', async () => {
      // Arrange
      mockReq.user = {
        id: 'non-verifier-id',
        role: 'holder' as Role,
        orgName: OrgName.orgholder,
      };

      // Act
      await getUserCredentials(mockReq, mockRes, {} as any);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Only verifiers can view user credentials',
      });
    });

    it('should return 400 if userId is missing', async () => {
      // Arrange
      mockReq.params = {}; // Missing userId

      // Act
      await getUserCredentials(mockReq, mockRes, {} as any);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing userId parameter' });
    });

    it('should return 404 if user not found', async () => {
      // Arrange
      (prisma.user.findUnique as any).mockResolvedValue(null);

      // Act
      await getUserCredentials(mockReq, mockRes, {} as any);

      // Assert
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'target-user-id' },
      });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return accepted credentials for the specified user', async () => {
      // Arrange
      const mockUser = {
        id: 'target-user-id',
        username: 'testuser',
      };

      const mockCredentials = [
        {
          id: 'credential-id-1',
          status: CredentialStatus.accepted,
          createdAt: new Date('2025-01-01'),
          type: 'certificate',
          title: 'Example Certificate',
          description: 'Test certificate',
          issuerOrg: {
            id: 'issuer-org-id',
            shorthand: 'TEST',
            name: 'Test University',
          },
        },
        {
          id: 'credential-id-2',
          status: CredentialStatus.accepted,
          createdAt: new Date('2025-01-02'),
          type: 'badge',
          title: 'Example Badge',
          description: 'Test badge',
          issuerOrg: null, // Testing null issuerOrg
        },
      ];

      (prisma.user.findUnique as any).mockResolvedValue(mockUser);
      (prisma.credential.findMany as any).mockResolvedValue(mockCredentials);

      // Act
      await getUserCredentials(mockReq, mockRes, {} as any);

      // Assert
      expect(prisma.credential.findMany).toHaveBeenCalledWith({
        where: {
          holderId: 'target-user-id',
          status: 'accepted',
        },
        include: expect.any(Object),
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(mockRes.json).toHaveBeenCalledWith([
        {
          docId: 'credential-id-1',
          issuer: 'TEST',
          status: CredentialStatus.accepted,
          issueDate: mockCredentials[0].createdAt,
          description: 'Test certificate',
          type: 'certificate',
          title: 'Example Certificate',
        },
        {
          docId: 'credential-id-2',
          issuer: 'Unknown Issuer',
          status: CredentialStatus.accepted,
          issueDate: mockCredentials[1].createdAt,
          description: 'Test badge',
          type: 'badge',
          title: 'Example Badge',
        },
      ]);
    });

    it('should handle errors', async () => {
      // Arrange
      const mockError = new Error('Database error');
      (prisma.user.findUnique as any).mockRejectedValue(mockError);

      // Act
      await getUserCredentials(mockReq, mockRes, {} as any);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });

  describe('getRecentIssuedCredentials', () => {
    beforeEach(() => {
      // Setup for issuer
      mockReq.user = {
        id: 'issuer-id',
        role: 'issuer' as Role,
        orgName: OrgName.orgissuer,
      };
    });

    it('should return 403 if user is not an issuer', async () => {
      // Arrange
      mockReq.user = {
        id: 'non-issuer-id',
        role: 'holder' as Role,
        orgName: OrgName.orgholder,
      };

      // Act
      await getRecentIssuedCredentials(mockReq, mockRes, {} as any);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Only issuers can access this data',
      });
    });

    it('should return 404 if user has no active issuer membership', async () => {
      // Arrange
      (prisma.issuerMember.findFirst as any).mockResolvedValue(null);

      // Act
      await getRecentIssuedCredentials(mockReq, mockRes, {} as any);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'No active issuer membership found for this user',
      });
    });

    it('should return recently issued credentials', async () => {
      // Arrange
      const mockIssuerMembership = {
        userId: 'issuer-id',
        issuerId: 'issuer-org-id',
        status: 'active',
        issuer: {
          id: 'issuer-org-id',
          shorthand: 'TEST',
        },
      };

      const mockCredentials = [
        {
          id: 'credential-id-1',
          status: CredentialStatus.issued,
          createdAt: new Date('2025-01-01'),
          type: 'certificate',
          title: 'Example Certificate',
          holder: {
            username: 'holder1',
            email: 'holder1@example.com',
          },
          issuerOrg: {
            shorthand: 'TEST',
          },
        },
        {
          id: 'credential-id-2',
          status: CredentialStatus.accepted,
          createdAt: new Date('2025-01-02'),
          type: 'badge',
          title: 'Example Badge',
          holder: {
            username: 'holder2',
            email: 'holder2@example.com',
          },
          issuerOrg: null, // Testing null issuerOrg
        },
      ];

      (prisma.issuerMember.findFirst as any).mockResolvedValue(mockIssuerMembership);
      (prisma.credential.findMany as any).mockResolvedValue(mockCredentials);

      // Act
      await getRecentIssuedCredentials(mockReq, mockRes, {} as any);

      // Assert
      expect(prisma.credential.findMany).toHaveBeenCalledWith({
        where: {
          issuerOrgId: 'issuer-org-id',
        },
        include: expect.any(Object),
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      });

      expect(mockRes.json).toHaveBeenCalledWith([
        {
          docId: 'credential-id-1',
          issuedTo: 'holder1@example.com',
          recipientName: 'holder1',
          status: CredentialStatus.issued,
          issueDate: mockCredentials[0].createdAt,
          issuer: 'TEST',
          type: 'certificate',
          title: 'Example Certificate',
        },
        {
          docId: 'credential-id-2',
          issuedTo: 'holder2@example.com',
          recipientName: 'holder2',
          status: CredentialStatus.accepted,
          issueDate: mockCredentials[1].createdAt,
          issuer: 'Unknown Issuer',
          type: 'badge',
          title: 'Example Badge',
        },
      ]);
    });

    it('should handle errors', async () => {
      // Arrange
      const mockError = new Error('Database error');
      (prisma.issuerMember.findFirst as any).mockRejectedValue(mockError);

      // Act
      await getRecentIssuedCredentials(mockReq, mockRes, {} as any);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
  });
});
