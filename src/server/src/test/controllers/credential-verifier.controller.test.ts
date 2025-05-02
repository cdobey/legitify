import { getGateway } from '@/config/gateway';
import { verifyCredentialDocument } from '@/controllers/credential-verifier.controller';
import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { sha256 } from '@/utils/credential-utils';
import { CredentialStatus, OrgName } from '@prisma/client';
import { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the prisma client
vi.mock('@/prisma/client', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
    credential: {
      findMany: vi.fn(),
    },
  },
}));

// Mock the gateway
vi.mock('@/config/gateway', () => ({
  getGateway: vi.fn(),
}));

// Mock the credential utils
vi.mock('@/utils/credential-utils', () => ({
  sha256: vi.fn().mockReturnValue('mocked-hash-value'),
}));

describe('Credential Verifier Controller', () => {
  let mockReq: RequestWithUser;
  let mockRes: Response;

  beforeEach(() => {
    vi.resetAllMocks();

    mockReq = {
      user: {
        id: 'verifier-id',
        role: 'verifier',
        orgName: OrgName.orgverifier,
      },
      body: {
        email: 'holder@example.com',
        base64File: 'base64-encoded-file-data',
      },
    } as RequestWithUser;

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
  });

  it('should return 403 if user is not a verifier', async () => {
    mockReq.user = {
      id: 'non-verifier-id',
      role: 'holder',
      orgName: OrgName.orgholder,
    };

    await verifyCredentialDocument(mockReq, mockRes, {} as any);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Only verifiers can verify credentials' });
  });

  it('should return 400 if email or base64File is missing', async () => {
    mockReq.body = { email: 'holder@example.com' }; // Missing base64File

    await verifyCredentialDocument(mockReq, mockRes, {} as any);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Missing email or base64File' });
  });

  it('should return unverified response if no user found with the email', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    await verifyCredentialDocument(mockReq, mockRes, {} as any);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'holder@example.com' },
    });
    expect(mockRes.json).toHaveBeenCalledWith({
      verified: false,
      message: 'No user found with this email',
    });
  });

  it('should return unverified response if no matching credentials found', async () => {
    const mockUser = {
      id: 'holder-id',
      email: 'holder@example.com',
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.credential.findMany as any).mockResolvedValue([]);

    // Mock gateway
    const mockContract = {
      evaluateTransaction: vi.fn().mockResolvedValue(Buffer.from('false')),
    };

    const mockNetwork = {
      getContract: vi.fn().mockReturnValue(mockContract),
    };

    const mockGateway = {
      getNetwork: vi.fn().mockResolvedValue(mockNetwork),
      disconnect: vi.fn(),
    };

    (getGateway as any).mockResolvedValue(mockGateway);

    await verifyCredentialDocument(mockReq, mockRes, {} as any);

    expect(prisma.credential.findMany).toHaveBeenCalledWith({
      where: {
        holderId: 'holder-id',
        status: 'accepted',
      },
      include: expect.any(Object),
    });

    expect(mockGateway.disconnect).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith({
      verified: false,
      message: 'No matching credential found',
    });
  });

  it('should return verified response if a matching credential is found', async () => {
    const mockUser = {
      id: 'holder-id',
      email: 'holder@example.com',
    };

    const mockCredential = {
      id: 'credential-id',
      docId: 'doc-id',
      docHash: 'mocked-hash-value',
      type: 'certificate',
      title: 'Test Certificate',
      description: 'A test certificate',
      status: CredentialStatus.accepted,
      createdAt: new Date('2025-01-01'),
      fileData: Buffer.from('file-data'),
      ledgerTimestamp: '2025-01-01T12:00:00Z',
      attributes: { level: 'Advanced' },
      holder: {
        username: 'testuser',
      },
      issuer: {
        id: 'issuer-user-id',
        orgName: OrgName.orgissuer,
      },
      issuerOrg: {
        id: 'issuer-org-id',
        shorthand: 'TEST',
        logoUrl: 'https://example.com/logo.png',
      },
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.credential.findMany as any).mockResolvedValue([mockCredential]);
    (sha256 as any).mockReturnValue('mocked-hash-value');

    // Mock gateway with successful verification
    const mockContract = {
      evaluateTransaction: vi.fn().mockResolvedValue(Buffer.from('true')),
    };

    const mockNetwork = {
      getContract: vi.fn().mockReturnValue(mockContract),
    };

    const mockGateway = {
      getNetwork: vi.fn().mockResolvedValue(mockNetwork),
      disconnect: vi.fn(),
    };

    (getGateway as any).mockResolvedValue(mockGateway);

    await verifyCredentialDocument(mockReq, mockRes, {} as any);

    expect(sha256).toHaveBeenCalled();
    expect(mockContract.evaluateTransaction).toHaveBeenCalledWith(
      'VerifyHash',
      'credential-id',
      'mocked-hash-value',
    );

    expect(mockGateway.disconnect).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith({
      verified: true,
      message: 'Credential verified successfully',
      credentialId: 'credential-id',
      fileData: expect.any(String),
      details: {
        holderName: 'testuser',
        issuer: 'TEST',
        issuerLogoUrl: 'https://example.com/logo.png',
        issuerId: 'issuer-org-id',
        title: 'Test Certificate',
        description: 'A test certificate',
        type: 'certificate',
        attributes: { level: 'Advanced' },
        ledgerTimestamp: expect.any(String),
        issuedAt: '2025-01-01T00:00:00.000Z',
      },
    });
  });

  it('should handle errors when verifying a specific credential', async () => {
    const mockUser = {
      id: 'holder-id',
      email: 'holder@example.com',
    };

    const mockCredential = {
      id: 'credential-id',
      docHash: 'doc-hash',
      status: CredentialStatus.accepted,
      holder: { username: 'testuser' },
      issuer: { orgName: OrgName.orgissuer },
      issuerOrg: { shorthand: 'TEST' },
      createdAt: new Date(),
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
    (prisma.credential.findMany as any).mockResolvedValue([mockCredential]);

    // Mock gateway with error
    const mockContract = {
      evaluateTransaction: vi.fn().mockRejectedValue(new Error('Chaincode error')),
    };

    const mockNetwork = {
      getContract: vi.fn().mockReturnValue(mockContract),
    };

    const mockGateway = {
      getNetwork: vi.fn().mockResolvedValue(mockNetwork),
      disconnect: vi.fn(),
    };

    (getGateway as any).mockResolvedValue(mockGateway);

    // We need to spy on console.error to avoid polluting test output
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await verifyCredentialDocument(mockReq, mockRes, {} as any);

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(mockGateway.disconnect).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith({
      verified: false,
      message: 'No matching credential found',
    });

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  it('should handle unexpected errors during verification', async () => {
    const mockError = new Error('Unexpected error');
    (prisma.user.findUnique as any).mockRejectedValue(mockError);

    // We need to spy on console.error to avoid polluting test output
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await verifyCredentialDocument(mockReq, mockRes, {} as any);

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unexpected error' });

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
});
