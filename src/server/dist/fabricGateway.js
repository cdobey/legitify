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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNetwork = getNetwork;
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fabric_network_1 = require("fabric-network");
const logger_1 = require("./logger");
dotenv.config();
function getNetwork() {
    return __awaiter(this, void 0, void 0, function* () {
        // Base directory path for reuse
        const baseDir = path.resolve(__dirname, "/Users/chris.dobey/College/FYP/2025-csc1097-mannp2-dobeyc3/src/ledger/fabric-samples/test-network");
        const org1Dir = path.join(baseDir, "organizations/peerOrganizations/org1.example.com");
        // Configure paths relative to base directory
        const ccpPath = path.join(org1Dir, "connection-org1.json");
        const walletPath = org1Dir;
        const channelName = "mychannel";
        const chaincodeName = "degreeCC";
        const userId = "Admin@org1.example.com";
        // Validate paths and configuration
        if (!fs.existsSync(baseDir)) {
            logger_1.Logger.error(`Base directory does not exist: ${baseDir}`);
            throw new Error(`Base directory does not exist: ${baseDir}`);
        }
        if (!fs.existsSync(ccpPath)) {
            logger_1.Logger.error(`Connection profile not found: ${ccpPath}`);
            throw new Error(`Connection profile not found: ${ccpPath}`);
        }
        logger_1.Logger.info("Environment Variables:", {
            ccpPath,
            walletPath,
            channelName,
            chaincodeName,
            userId,
        });
        // Load connection profile
        let ccp;
        try {
            ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
            logger_1.Logger.info("Successfully loaded connection profile");
        }
        catch (error) {
            logger_1.Logger.error(`Error loading connection profile: ${error.message}`);
            throw error;
        }
        // Setup the wallet
        const wallet = yield fabric_network_1.Wallets.newFileSystemWallet(walletPath);
        logger_1.Logger.info("Wallet initialized at:", walletPath);
        // Load admin identity files
        const certPath = path.join(org1Dir, "users", userId, "msp/signcerts/cert.pem");
        const keyDir = path.join(org1Dir, "users", userId, "msp/keystore");
        // Verify certificate path
        if (!fs.existsSync(certPath)) {
            logger_1.Logger.error(`Certificate file not found: ${certPath}`);
            throw new Error(`Certificate file not found: ${certPath}`);
        }
        // Find and verify keystore file
        let keyFile;
        try {
            // Check if directory exists
            if (!fs.existsSync(keyDir)) {
                logger_1.Logger.error(`Keystore directory does not exist: ${keyDir}`);
                throw new Error(`Keystore directory does not exist: ${keyDir}`);
            }
            // Read directory contents
            const keyFiles = fs.readdirSync(keyDir);
            logger_1.Logger.info(`Found ${keyFiles.length} files in keystore directory`);
            // Find the private key file
            keyFile = keyFiles.find((file) => file.endsWith("_sk") ||
                file === "priv_sk" ||
                file.match(/^[0-9a-f]{64}_sk$/));
            if (!keyFile) {
                logger_1.Logger.error("No private key file found in keystore directory");
                throw new Error("No private key file found in keystore directory");
            }
            logger_1.Logger.info(`Found private key file: ${keyFile}`);
        }
        catch (error) {
            logger_1.Logger.error(`Error accessing keystore: ${error.message}`);
            logger_1.Logger.error(`Attempted directory path: ${keyDir}`);
            throw error;
        }
        const keyPath = path.join(keyDir, keyFile);
        // Create admin identity
        try {
            const adminIdentity = {
                credentials: {
                    certificate: fs.readFileSync(certPath).toString(),
                    privateKey: fs.readFileSync(keyPath).toString(),
                },
                mspId: "Org1MSP",
                type: "X.509",
            };
            yield wallet.put(userId, adminIdentity);
            logger_1.Logger.info("Successfully stored admin identity in wallet");
            // Verify wallet contents
            const walletContents = yield wallet.list();
            logger_1.Logger.info("Wallet contents:", walletContents);
            // Check user identity
            const identity = yield wallet.get(userId);
            if (!identity) {
                throw new Error(`Identity for the user ${userId} not found in wallet`);
            }
            logger_1.Logger.info("Successfully retrieved identity from wallet");
            // Create and connect gateway
            const gateway = new fabric_network_1.Gateway();
            yield gateway.connect(ccp, {
                wallet,
                identity: userId,
                discovery: { enabled: true, asLocalhost: true },
            });
            logger_1.Logger.info("Successfully connected to gateway");
            // Get network and contract
            const network = yield gateway.getNetwork(channelName);
            const contract = network.getContract(chaincodeName);
            logger_1.Logger.info("Successfully connected to the network and contract");
            return { gateway, network, contract };
        }
        catch (error) {
            logger_1.Logger.error(`Failed to setup network connection: ${error.message}`);
            throw error;
        }
    });
}
