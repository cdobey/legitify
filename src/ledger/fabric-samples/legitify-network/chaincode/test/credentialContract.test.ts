import { ChaincodeStub, ClientIdentity } from 'fabric-shim';

import { Context } from 'fabric-contract-api';
import { CredentialContract } from '../src/credentialContract';

describe('CredentialContract', () => {
    let contract: CredentialContract;
    let ctx: Context;
    let stub: ChaincodeStub;
    let clientIdentity: ClientIdentity;

    beforeEach(() => {
        contract = new CredentialContract();
        stub = {
            putState: jest.fn(),
            getState: jest.fn(),
            deleteState: jest.fn(),
        } as unknown as ChaincodeStub;

        clientIdentity = {
            getID: jest.fn(),
            getMSPID: jest.fn().mockReturnValue('UniversityMSP'),
        } as unknown as ClientIdentity;

        ctx = {
            stub,
            clientIdentity,
        } as unknown as Context;
    });

    describe('initLedger', () => {
        it('should initialize the ledger', async () => {
            const consoleSpy = jest.spyOn(console, 'log');
            await contract.initLedger(ctx);
            expect(consoleSpy).toHaveBeenCalledWith('Initialized the ledger');
        });
    });

    describe('issueCredential', () => {
        it('should create a new credential', async () => {
            const credentialId = 'credential1';
            const hash = 'hash123';
            const issuer = 'university1';
            const owner = 'student1';
            const metadata = JSON.stringify({
                type: 'degree',
                institution: 'Test University',
            });

            await contract.issueCredential(
                ctx,
                credentialId,
                hash,
                issuer,
                owner,
                metadata
            );

            expect(ctx.stub.putState).toHaveBeenCalledWith(
                credentialId,
                expect.any(Buffer) // Match any Buffer type for flexibility
            );

            const savedCredential = JSON.parse(
                (ctx.stub.putState as jest.Mock).mock.calls[0][1].toString()
            );

            // Check specific properties, ignoring `issuedAt` timestamp
            expect(savedCredential).toMatchObject({
                hash,
                issuer,
                owner,
                metadata: JSON.parse(metadata),
                isValid: true,
            });
        });
    });

    describe('verifyCredential', () => {
        it('should verify a valid credential', async () => {
            const credentialId = 'credential1';
            const hash = 'hash123';
            const credential = {
                hash,
                issuer: 'university1',
                owner: 'student1',
                metadata: { type: 'degree', institution: 'Test University' },
                issuedAt: new Date().toISOString(),
                isValid: true,
            };

            stub.getState = jest
                .fn()
                .mockResolvedValue(Buffer.from(JSON.stringify(credential)));

            const result = await contract.verifyCredential(
                ctx,
                credentialId,
                hash
            );
            expect(result).toBe(true);
        });

        it('should fail verification if credential does not exist', async () => {
            stub.getState = jest.fn().mockResolvedValue(null);

            await expect(
                contract.verifyCredential(ctx, 'invalidId', 'hash123')
            ).rejects.toThrow('Credential invalidId does not exist');
        });

        it('should fail verification if hash does not match', async () => {
            const credentialId = 'credential1';
            const hash = 'hash123';
            const credential = {
                hash: 'wrongHash',
                issuer: 'university1',
                owner: 'student1',
                metadata: { type: 'degree', institution: 'Test University' },
                issuedAt: new Date().toISOString(),
                isValid: true,
            };

            stub.getState = jest
                .fn()
                .mockResolvedValue(Buffer.from(JSON.stringify(credential)));

            const result = await contract.verifyCredential(
                ctx,
                credentialId,
                hash
            );
            expect(result).toBe(false);
        });
    });

    describe('revokeCredential', () => {
        it('should revoke a valid credential', async () => {
            const credentialId = 'credential1';
            const issuer = 'university1';
            const credential = {
                hash: 'hash123',
                issuer,
                owner: 'student1',
                metadata: { type: 'degree', institution: 'Test University' },
                issuedAt: new Date().toISOString(),
                isValid: true,
            };

            stub.getState = jest
                .fn()
                .mockResolvedValue(Buffer.from(JSON.stringify(credential)));

            await contract.revokeCredential(ctx, credentialId, issuer);

            const updatedCredential = { ...credential, isValid: false };

            expect(ctx.stub.putState).toHaveBeenCalledWith(
                credentialId,
                Buffer.from(JSON.stringify(updatedCredential))
            );
        });

        it('should throw an error if credential does not exist', async () => {
            stub.getState = jest.fn().mockResolvedValue(null);

            await expect(
                contract.revokeCredential(ctx, 'invalidId', 'university1')
            ).rejects.toThrow('Credential invalidId does not exist');
        });

        it('should throw an error if the issuer does not match', async () => {
            const credentialId = 'credential1';
            const issuer = 'university1';
            const credential = {
                hash: 'hash123',
                issuer: 'wrongIssuer',
                owner: 'student1',
                metadata: { type: 'degree', institution: 'Test University' },
                issuedAt: new Date().toISOString(),
                isValid: true,
            };

            stub.getState = jest
                .fn()
                .mockResolvedValue(Buffer.from(JSON.stringify(credential)));

            await expect(
                contract.revokeCredential(ctx, credentialId, issuer)
            ).rejects.toThrow('Only the issuer can revoke credentials');
        });
    });
});
