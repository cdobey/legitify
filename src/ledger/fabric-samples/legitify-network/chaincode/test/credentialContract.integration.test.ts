import * as fs from 'fs';
import * as path from 'path';

import { Gateway, Wallets } from 'fabric-network';

const channelName = 'legitifychannel';
const chaincodeName = 'legitify';
const walletPath = path.resolve(__dirname, '..', '..', 'network', 'wallet');
const ccpPath = path.resolve(
    __dirname,
    '..',
    '..',
    'network',
    'connection-profiles',
    'connection.json'
);

jest.setTimeout(30000); // Increase timeout to 30 seconds

describe('CredentialContract Integration Tests', () => {
    let gateway: Gateway;

    beforeAll(async () => {
        // Load connection profile
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new file system based wallet
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Connect to the gateway
        gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'Admin',
            discovery: { enabled: true, asLocalhost: true },
        });
    });

    afterAll(async () => {
        await gateway.disconnect();
    });

    test('Issue Credential', async () => {
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        const metadata = JSON.stringify({
            type: 'degree',
            institution: 'Test University',
        });
        await contract.submitTransaction(
            'issueCredential',
            'credential1',
            'hash123',
            'university1',
            'student1',
            metadata
        );

        const result = await contract.evaluateTransaction(
            'verifyCredential',
            'credential1',
            'hash123'
        );
        expect(result.toString()).toBe('true');
    });

    test('Verify Credential - Invalid ID', async () => {
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        await expect(
            contract.evaluateTransaction(
                'verifyCredential',
                'invalidId',
                'hash123'
            )
        ).rejects.toThrow('does not exist');
    });

    test('Revoke Credential', async () => {
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        await contract.submitTransaction(
            'revokeCredential',
            'credential1',
            'university1'
        );

        const result = await contract.evaluateTransaction(
            'verifyCredential',
            'credential1',
            'hash123'
        );
        expect(result.toString()).toBe('false');
    });
});
