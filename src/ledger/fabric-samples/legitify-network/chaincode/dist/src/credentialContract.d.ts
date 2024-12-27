import { Context, Contract } from 'fabric-contract-api';
export declare class CredentialContract extends Contract {
    initLedger(ctx: Context): Promise<void>;
    issueCredential(ctx: Context, credentialId: string, hash: string, issuer: string, owner: string, metadata: string): Promise<void>;
    verifyCredential(ctx: Context, credentialId: string, hash: string): Promise<boolean>;
    revokeCredential(ctx: Context, credentialId: string, issuer: string): Promise<void>;
}
