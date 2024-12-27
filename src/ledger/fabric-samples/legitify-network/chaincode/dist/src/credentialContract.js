"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialContract = void 0;
const fabric_contract_api_1 = require("fabric-contract-api");
let CredentialContract = class CredentialContract extends fabric_contract_api_1.Contract {
    async initLedger(ctx) {
        console.log('Initialized the ledger');
    }
    async issueCredential(ctx, credentialId, hash, issuer, owner, metadata) {
        const credential = {
            hash,
            issuer,
            owner,
            metadata: JSON.parse(metadata),
            issuedAt: new Date().toISOString(),
            isValid: true,
        };
        await ctx.stub.putState(credentialId, Buffer.from(JSON.stringify(credential)));
    }
    async verifyCredential(ctx, credentialId, hash) {
        const credentialBytes = await ctx.stub.getState(credentialId);
        if (!credentialBytes || credentialBytes.length === 0) {
            throw new Error(`Credential ${credentialId} does not exist`);
        }
        const credential = JSON.parse(credentialBytes.toString());
        return credential.hash === hash && credential.isValid;
    }
    async revokeCredential(ctx, credentialId, issuer) {
        const credentialBytes = await ctx.stub.getState(credentialId);
        if (!credentialBytes || credentialBytes.length === 0) {
            throw new Error(`Credential ${credentialId} does not exist`);
        }
        const credential = JSON.parse(credentialBytes.toString());
        if (credential.issuer !== issuer) {
            throw new Error('Only the issuer can revoke credentials');
        }
        credential.isValid = false;
        await ctx.stub.putState(credentialId, Buffer.from(JSON.stringify(credential)));
    }
};
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context]),
    __metadata("design:returntype", Promise)
], CredentialContract.prototype, "initLedger", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], CredentialContract.prototype, "issueCredential", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(false),
    (0, fabric_contract_api_1.Returns)('boolean'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String]),
    __metadata("design:returntype", Promise)
], CredentialContract.prototype, "verifyCredential", null);
__decorate([
    (0, fabric_contract_api_1.Transaction)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String, String]),
    __metadata("design:returntype", Promise)
], CredentialContract.prototype, "revokeCredential", null);
CredentialContract = __decorate([
    (0, fabric_contract_api_1.Info)({
        title: 'CredentialContract',
        description: 'Smart contract for credential verification',
    })
], CredentialContract);
exports.CredentialContract = CredentialContract;
//# sourceMappingURL=credentialContract.js.map