const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const certPath =
        '../network/organizations/peerOrganizations/university.legitify.com/users/Admin@university.legitify.com/msp/signcerts/Admin@university.legitify.com-cert.pem';
    const keyPath =
        '../network/organizations/peerOrganizations/university.legitify.com/users/Admin@university.legitify.com/msp/keystore/';
    const keyFiles = fs.readdirSync(keyPath);
    const privateKey = fs.readFileSync(keyPath + keyFiles[0]).toString();
    const certificate = fs.readFileSync(certPath).toString();

    const identity = {
        credentials: { certificate, privateKey },
        mspId: 'UniversityMSP',
        type: 'X.509',
    };

    await wallet.put('Admin', identity);
    console.log('Admin identity imported successfully!');
}

main();
