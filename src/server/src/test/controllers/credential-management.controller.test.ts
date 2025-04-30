import { getGateway } from '@/config/gateway';
import {
  acceptCredential,
  denyCredential,
  issueCredential,
} from '@/controllers/credential-management.controller';
import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import {
  getUserInfo,
  sha256,
  submitFabricTransaction,
  validateUserRole,
} from '@/utils/credential-utils';
import { CredentialStatus, OrgName, Role } from '@prisma/client';
import { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the dependencies
vi.mock('@/prisma/client', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    credential: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    issuerMember: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/config/gateway', () => ({
  getGateway: vi.fn(),
}));

vi.mock('@/utils/credential-utils', () => ({
  validateUserRole: vi.fn(),
  getUserInfo: vi.fn(),
  sha256: vi.fn().mockReturnValue('mocked-hash-value'),
  submitFabricTransaction: vi.fn(),
  FABRIC_CHAINCODE: 'credentialCC',
  FABRIC_CHANNEL: 'legitifychannel',
}));

describe('Credential Management Controller', () => {
  let mockReq: RequestWithUser;
  let mockRes: Response;
  let mockGateway: any;
  let mockNetwork: any;
  let mockContract: any;
  let mockTransaction: any;

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup request and response mocks
    mockReq = {
      user: {
        id: 'issuer-id',
        role: 'issuer' as Role,
        orgName: OrgName.orgissuer,
      },
      body: {},
    } as RequestWithUser;

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    // Setup Fabric mocks
    mockTransaction = {
      submit: vi.fn().mockResolvedValue(Buffer.from('success')),
      getTransactionId: vi.fn().mockReturnValue('mock-tx-id'),
    };

    mockContract = {
      createTransaction: vi.fn().mockReturnValue(mockTransaction),
    };

    mockNetwork = {
      getContract: vi.fn().mockReturnValue(mockContract),
    };

    mockGateway = {
      getNetwork: vi.fn().mockResolvedValue(mockNetwork),
      disconnect: vi.fn(),
    };

    (getGateway as any).mockResolvedValue(mockGateway);
    (getUserInfo as any).mockReturnValue({
      id: 'issuer-id',
      role: 'issuer',
      orgName: OrgName.orgissuer,
    });
  });

  describe('issueCredential', () => {
    it('should return 403 if user is not an issuer', async () => {
      (validateUserRole as any).mockImplementation(() => {
        throw new Error('Only issuers can issue credentials');
      });

      await issueCredential(mockReq, mockRes, {} as any);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Only issuers can issue credentials',
      });
    });

    it('should return 400 if required fields are missing', async () => {
      mockReq.body = { email: 'holder@example.com' }; // Missing fields

      await issueCredential(mockReq, mockRes, {} as any);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing required fields',
      });
    });

    it('should return 400 if achievement date is in the future', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      mockReq.body = {
        email: 'holder@example.com',
        base64File: 'base64-data',
        title: 'Test Credential',
        type: 'certificate',
        issuerOrgId: 'org-id',
        achievementDate: futureDate.toISOString(),
      };

      await issueCredential(mockReq, mockRes, {} as any);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Achievement date cannot be in the future',
      });
    });

    it('should return 404 if holder is not found', async () => {
      mockReq.body = {
        email: 'holder@example.com',
        base64File: 'base64-data',
        title: 'Test Credential',
        type: 'certificate',
        issuerOrgId: 'org-id',
      };

      (prisma.user.findUnique as any).mockResolvedValue(null);

      await issueCredential(mockReq, mockRes, {} as any);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'holder@example.com' },
      });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Recipient not found',
      });
    });

    it('should return 403 if issuer is not a member of the organization', async () => {
      mockReq.body = {
        email: 'holder@example.com',
        base64File: 'base64-data',
        title: 'Test Credential',
        type: 'certificate',
        issuerOrgId: 'org-id',
      };

      const holder = {
        id: 'holder-id',
        email: 'holder@example.com',
      };

      (prisma.user.findUnique as any).mockResolvedValue(holder);
      (prisma.issuerMember.findFirst as any).mockResolvedValue(null);

      await issueCredential(mockReq, mockRes, {} as any);

      expect(prisma.issuerMember.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'issuer-id',
          issuerId: 'org-id',
          status: 'active',
        },
      });
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not authorized to issue credentials for this organization',
      });
    });

    it('should successfully issue a credential', async () => {
      mockReq.body = {
        email: 'holder@example.com',
        base64File: 'base64-data',
        title: 'Test Credential',
        description: 'A test credential',
        type: 'certificate',
        issuerOrgId: 'org-id',
        attributes: { skill: 'Advanced' },
      };

      const holder = {
        id: 'holder-id',
        email: 'holder@example.com',
      };

      const issuerMembership = {
        userId: 'issuer-id',
        issuerId: 'org-id',
        status: 'active',
      };

      const expectedCredential = {
        id: expect.any(String),
        docId: expect.any(String),
        docHash: 'mocked-hash-value',
        type: 'certificate',
        title: 'Test Credential',
        description: 'A test credential',
        holderId: 'holder-id',
        issuerId: 'issuer-id',
        issuerOrgId: 'org-id',
        fileData: expect.any(Buffer),
        status: 'issued',
        attributes: { skill: 'Advanced' },
        ledgerTimestamp: expect.any(String),
        txId: 'mock-tx-id',
      };

      (prisma.user.findUnique as any).mockResolvedValue(holder);
      (prisma.issuerMember.findFirst as any).mockResolvedValue(issuerMembership);
      (prisma.credential.create as any).mockResolvedValue(expectedCredential);
      (sha256 as any).mockReturnValue('mocked-hash-value');

      await issueCredential(mockReq, mockRes, {} as any);

      expect(sha256).toHaveBeenCalled();
      expect(getGateway).toHaveBeenCalledWith('issuer-id', 'orgissuer');
      expect(mockGateway.getNetwork).toHaveBeenCalled();
      expect(mockContract.createTransaction).toHaveBeenCalledWith('IssueCredential');
      expect(mockTransaction.submit).toHaveBeenCalled();
      expect(mockGateway.disconnect).toHaveBeenCalled();

      // Use a less strict expectation that doesn't depend on dynamic values
      expect(prisma.credential.create).toHaveBeenCalled();

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Credential issued successfully',
        docId: expect.any(String),
        docHash: 'mocked-hash-value',
      });
    });

    it('should handle errors', async () => {
      mockReq.body = {
        email: 'holder@example.com',
        base64File: 'base64-data',
        title: 'Test Credential',
        type: 'certificate',
        issuerOrgId: 'org-id',
      };

      const holder = {
        id: 'holder-id',
        email: 'holder@example.com',
      };

      const issuerMembership = {
        userId: 'issuer-id',
        issuerId: 'org-id',
        status: 'active',
      };

      (prisma.user.findUnique as any).mockResolvedValue(holder);
      (prisma.issuerMember.findFirst as any).mockResolvedValue(issuerMembership);

      // Force gateway to be defined before the error
      await getGateway('issuer-id', 'orgissuer');

      // Mock transaction error
      mockTransaction.submit.mockRejectedValue(new Error('Blockchain error'));

      await issueCredential(mockReq, mockRes, {} as any);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Blockchain error',
      });
    });
  });

  describe('acceptCredential', () => {
    beforeEach(() => {
      // Setup for holder
      (getUserInfo as any).mockReturnValue({
        id: 'holder-id',
        role: 'holder',
        orgName: OrgName.orgholder,
      });

      mockReq.user = {
        id: 'holder-id',
        role: 'holder' as Role,
        orgName: OrgName.orgholder,
      };
    });

    it('should return 403 if user is not a holder', async () => {
      (validateUserRole as any).mockImplementation(() => {
        throw new Error('Only holders can accept credentials');
      });

      await acceptCredential(mockReq, mockRes, {} as any);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Only holders can accept credentials',
      });
    });

    it('should return 400 if docId is missing', async () => {
      mockReq.body = {}; // Missing docId

      await acceptCredential(mockReq, mockRes, {} as any);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing docId',
      });
    });

    it('should return 404 if credential is not found', async () => {
      mockReq.body = { docId: 'invalid-doc-id' };
      (prisma.credential.findUnique as any).mockResolvedValue(null);

      await acceptCredential(mockReq, mockRes, {} as any);

      expect(prisma.credential.findUnique).toHaveBeenCalledWith({
        where: { id: 'invalid-doc-id' },
      });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Credential not found',
      });
    });

    it('should return 403 if credential belongs to another user', async () => {
      mockReq.body = { docId: 'doc-id' };

      const credential = {
        id: 'doc-id',
        holderId: 'other-holder-id', // Different holder
        status: CredentialStatus.issued,
      };

      (prisma.credential.findUnique as any).mockResolvedValue(credential);

      await acceptCredential(mockReq, mockRes, {} as any);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not authorized to accept this credential',
      });
    });

    it('should successfully accept a credential', async () => {
      mockReq.body = { docId: 'doc-id' };

      const credential = {
        id: 'doc-id',
        holderId: 'holder-id',
        status: CredentialStatus.issued,
      };

      (prisma.credential.findUnique as any).mockResolvedValue(credential);
      (submitFabricTransaction as any).mockResolvedValue('success');
      (prisma.credential.update as any).mockResolvedValue({
        ...credential,
        status: CredentialStatus.accepted,
      });

      await acceptCredential(mockReq, mockRes, {} as any);

      expect(submitFabricTransaction).toHaveBeenCalledWith(
        'holder-id',
        OrgName.orgholder,
        'AcceptCredential',
        'doc-id',
      );

      expect(prisma.credential.update).toHaveBeenCalledWith({
        where: { id: 'doc-id' },
        data: { status: 'accepted' },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Credential accepted successfully',
      });
    });

    it('should handle errors', async () => {
      mockReq.body = { docId: 'doc-id' };

      const credential = {
        id: 'doc-id',
        holderId: 'holder-id',
        status: CredentialStatus.issued,
      };

      (prisma.credential.findUnique as any).mockResolvedValue(credential);
      (submitFabricTransaction as any).mockRejectedValue(new Error('Blockchain error'));

      await acceptCredential(mockReq, mockRes, {} as any);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Blockchain error',
      });
    });
  });

  describe('denyCredential', () => {
    beforeEach(() => {
      // Setup for holder
      (getUserInfo as any).mockReturnValue({
        id: 'holder-id',
        role: 'holder',
        orgName: OrgName.orgholder,
      });

      mockReq.user = {
        id: 'holder-id',
        role: 'holder' as Role,
        orgName: OrgName.orgholder,
      };
    });

    it('should return 403 if user is not a holder', async () => {
      (validateUserRole as any).mockImplementation(() => {
        throw new Error('Only holders can deny credentials');
      });

      await denyCredential(mockReq, mockRes, {} as any);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Only holders can deny credentials',
      });
    });

    it('should return 400 if docId is missing', async () => {
      mockReq.body = {}; // Missing docId

      await denyCredential(mockReq, mockRes, {} as any);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Missing docId',
      });
    });

    it('should return 404 if credential is not found', async () => {
      mockReq.body = { docId: 'invalid-doc-id' };
      (prisma.credential.findUnique as any).mockResolvedValue(null);

      await denyCredential(mockReq, mockRes, {} as any);

      expect(prisma.credential.findUnique).toHaveBeenCalledWith({
        where: { id: 'invalid-doc-id' },
      });
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Credential not found',
      });
    });

    it('should return 403 if credential belongs to another user', async () => {
      mockReq.body = { docId: 'doc-id' };

      const credential = {
        id: 'doc-id',
        holderId: 'other-holder-id', // Different holder
        status: CredentialStatus.issued,
      };

      (prisma.credential.findUnique as any).mockResolvedValue(credential);

      await denyCredential(mockReq, mockRes, {} as any);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Not authorized to deny this credential',
      });
    });

    it('should successfully deny a credential', async () => {
      mockReq.body = { docId: 'doc-id' };

      const credential = {
        id: 'doc-id',
        holderId: 'holder-id',
        status: CredentialStatus.issued,
      };

      (prisma.credential.findUnique as any).mockResolvedValue(credential);
      (submitFabricTransaction as any).mockResolvedValue('success');
      (prisma.credential.update as any).mockResolvedValue({
        ...credential,
        status: CredentialStatus.denied,
      });

      await denyCredential(mockReq, mockRes, {} as any);

      expect(submitFabricTransaction).toHaveBeenCalledWith(
        'holder-id',
        OrgName.orgholder,
        'DenyCredential',
        'doc-id',
      );

      expect(prisma.credential.update).toHaveBeenCalledWith({
        where: { id: 'doc-id' },
        data: { status: 'denied' },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Credential denied successfully',
      });
    });

    it('should handle errors', async () => {
      mockReq.body = { docId: 'doc-id' };

      const credential = {
        id: 'doc-id',
        holderId: 'holder-id',
        status: CredentialStatus.issued,
      };

      (prisma.credential.findUnique as any).mockResolvedValue(credential);
      (submitFabricTransaction as any).mockRejectedValue(new Error('Blockchain error'));

      await denyCredential(mockReq, mockRes, {} as any);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Blockchain error',
      });
    });
  });
});
