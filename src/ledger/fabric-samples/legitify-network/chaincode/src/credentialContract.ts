import {
    Context,
    Contract,
    Info,
    Returns,
    Transaction,
} from 'fabric-contract-api';

@Info({
    title: 'CredentialContract',
    description: 'Smart contract for credential verification',
})
export class CredentialContract extends Contract {
    @Transaction()
    public async initLedger(ctx: Context): Promise<void> {
        console.log('Initialized the ledger');
    }

    @Transaction()
    public async issueCredential(
        ctx: Context,
        credentialId: string,
        hash: string,
        issuer: string,
        owner: string,
        metadata: string
    ): Promise<void> {
        const credential = {
            hash,
            issuer,
            owner,
            metadata: JSON.parse(metadata),
            issuedAt: new Date().toISOString(),
            isValid: true,
        };

        await ctx.stub.putState(
            credentialId,
            Buffer.from(JSON.stringify(credential))
        );
    }

    @Transaction(false)
    @Returns('boolean')
    public async verifyCredential(
        ctx: Context,
        credentialId: string,
        hash: string
    ): Promise<boolean> {
        const credentialBytes = await ctx.stub.getState(credentialId);
        if (!credentialBytes || credentialBytes.length === 0) {
            throw new Error(`Credential ${credentialId} does not exist`);
        }

        const credential = JSON.parse(credentialBytes.toString());
        return credential.hash === hash && credential.isValid;
    }

    @Transaction()
    public async revokeCredential(
        ctx: Context,
        credentialId: string,
        issuer: string
    ): Promise<void> {
        const credentialBytes = await ctx.stub.getState(credentialId);
        if (!credentialBytes || credentialBytes.length === 0) {
            throw new Error(`Credential ${credentialId} does not exist`);
        }

        const credential = JSON.parse(credentialBytes.toString());
        if (credential.issuer !== issuer) {
            throw new Error('Only the issuer can revoke credentials');
        }

        credential.isValid = false;
        await ctx.stub.putState(
            credentialId,
            Buffer.from(JSON.stringify(credential))
        );
    }
}
