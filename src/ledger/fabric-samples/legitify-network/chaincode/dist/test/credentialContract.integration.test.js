"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fabric_network_1 = require("fabric-network");
const channelName = 'legitifychannel';
const chaincodeName = 'legitify';
const walletPath = path.resolve(__dirname, '..', '..', 'network', 'wallet');
const ccpPath = path.resolve(__dirname, '..', '..', 'network', 'connection-profiles', 'connection.json');
jest.setTimeout(30000); // Increase timeout to 30 seconds
describe('CredentialContract Integration Tests', () => {
    let gateway;
    beforeAll(async () => {
        // Load connection profile
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        // Create a new file system based wallet
        const wallet = await fabric_network_1.Wallets.newFileSystemWallet(walletPath);
        // Connect to the gateway
        gateway = new fabric_network_1.Gateway();
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
        await contract.submitTransaction('issueCredential', 'credential1', 'hash123', 'university1', 'student1', metadata);
        const result = await contract.evaluateTransaction('verifyCredential', 'credential1', 'hash123');
        expect(result.toString()).toBe('true');
    });
    test('Verify Credential - Invalid ID', async () => {
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        await expect(contract.evaluateTransaction('verifyCredential', 'invalidId', 'hash123')).rejects.toThrow('does not exist');
    });
    test('Revoke Credential', async () => {
        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        await contract.submitTransaction('revokeCredential', 'credential1', 'university1');
        const result = await contract.evaluateTransaction('verifyCredential', 'credential1', 'hash123');
        expect(result.toString()).toBe('false');
    });
});
//# sourceMappingURL=credentialContract.integration.test.js.map