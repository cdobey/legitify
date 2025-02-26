import { OrgName } from "@prisma/client";
import {
  Identity,
  Wallet,
  Wallets,
  WalletStore,
  X509Identity,
} from "fabric-network";
import prisma from "../prisma/client";

/**
 * Custom implementation of WalletStore that uses the database
 */
class DatabaseWalletStore implements WalletStore {
  private readonly orgName: string;

  constructor(orgName: string) {
    this.orgName = orgName;
  }

  async get(label: string): Promise<Buffer | undefined> {
    try {
      const identity = await prisma.walletIdentity.findFirst({
        where: {
          label: label,
          orgName: this.orgName as OrgName,
        },
      });

      if (!identity) {
        return undefined;
      }

      // Convert the identity to a buffer
      const x509Identity: X509Identity = {
        credentials: {
          certificate: identity.certificate,
          privateKey: identity.privateKey,
        },
        mspId: identity.mspId,
        type: "X.509",
      };

      return Buffer.from(JSON.stringify(x509Identity));
    } catch (error) {
      console.error(`Error getting identity from database: ${error}`);
      return undefined;
    }
  }

  async list(): Promise<string[]> {
    try {
      const identities = await prisma.walletIdentity.findMany({
        where: {
          orgName: this.orgName as OrgName,
        },
        select: {
          label: true,
        },
      });

      return identities.map((identity) => identity.label);
    } catch (error) {
      console.error(`Error listing identities from database: ${error}`);
      return [];
    }
  }

  async put(label: string, data: Buffer): Promise<void> {
    try {
      const identityJson = JSON.parse(data.toString());

      await prisma.walletIdentity.upsert({
        where: {
          label_orgName: {
            label: label,
            orgName: this.orgName as OrgName,
          },
        },
        update: {
          type: identityJson.type,
          certificate: identityJson.credentials.certificate,
          privateKey: identityJson.credentials.privateKey,
          mspId: identityJson.mspId,
          updatedAt: new Date(),
        },
        create: {
          label: label,
          orgName: this.orgName as OrgName,
          type: identityJson.type,
          certificate: identityJson.credentials.certificate,
          privateKey: identityJson.credentials.privateKey,
          mspId: identityJson.mspId,
        },
      });
    } catch (error) {
      console.error(`Error storing identity in database: ${error}`);
      throw error;
    }
  }

  async remove(label: string): Promise<void> {
    try {
      await prisma.walletIdentity.deleteMany({
        where: {
          label: label,
          orgName: this.orgName as OrgName,
        },
      });
    } catch (error) {
      console.error(`Error removing identity from database: ${error}`);
    }
  }
}

/**
 * Class to create a database-backed wallet
 */
export class DatabaseWallet {
  /**
   * Creates and returns a new wallet backed by the database
   * @param orgName The organization name
   * @returns A wallet instance
   */
  static async createInstance(orgName: string): Promise<Wallet> {
    const store = new DatabaseWalletStore(orgName);

    // Create a new in-memory wallet
    const wallet = await Wallets.newInMemoryWallet();

    // Copy all identities from the store to the wallet
    const labels = await store.list();
    for (const label of labels) {
      const data = await store.get(label);
      if (data) {
        const identity = JSON.parse(data.toString()) as Identity;
        await wallet.put(label, identity);
      }
    }

    // Override the put and remove methods to also update the store
    const originalPut = wallet.put.bind(wallet);
    wallet.put = async (label: string, identity: Identity): Promise<void> => {
      await originalPut(label, identity);
      const data = Buffer.from(JSON.stringify(identity));
      await store.put(label, data);
    };

    const originalRemove = wallet.remove.bind(wallet);
    wallet.remove = async (label: string): Promise<void> => {
      await originalRemove(label);
      await store.remove(label);
    };

    return wallet;
  }
}
