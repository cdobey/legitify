import { OrgName } from '@prisma/client';
import { getGateway } from '@/config/gateway';
import prisma from '@/prisma/client';
import { enrollUser } from '@/utils/fabric-helpers';
import { submitFabricTransaction } from '@/utils/credential-utils';

const FABRIC_CHANNEL = process.env.FABRIC_CHANNEL || 'legitifychannel';
const FABRIC_CHAINCODE = process.env.FABRIC_CHAINCODE || 'credentialCC';

type Mode = 'wallet' | 'ledger' | 'full';

function parseMode(args: string[]): Mode {
  const modeArg = args.find((arg) => arg.startsWith('--mode='));
  const mode = (modeArg?.split('=')[1] || 'full').toLowerCase();
  if (mode === 'wallet' || mode === 'ledger' || mode === 'full') {
    return mode;
  }
  return 'full';
}

function isIgnorableError(error: unknown, phrases: string[]): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return phrases.some((phrase) => lower.includes(phrase));
}

async function reseedWallet(): Promise<void> {
  console.log('Clearing wallet identities...');
  await prisma.walletIdentity.deleteMany();

  const users = await prisma.user.findMany({
    select: { id: true, orgName: true },
  });

  console.log(`Re-enrolling ${users.length} users...`);
  for (const user of users) {
    await enrollUser(user.id, user.orgName as OrgName);
  }
}

async function issueCredentialFromDb(credential: any, issuer: any): Promise<void> {
  const gateway = await getGateway(issuer.id, String(issuer.orgName).toLowerCase());
  try {
    const network = await gateway.getNetwork(FABRIC_CHANNEL);
    const contract = network.getContract(FABRIC_CHAINCODE);

    const attributes = credential.attributes ?? {};
    const attributesJSON =
      typeof attributes === 'string' ? attributes : JSON.stringify(attributes);

    const transaction = contract.createTransaction('IssueCredential');
    const txId = transaction.getTransactionId();

    try {
      await transaction.submit(
        credential.docId,
        credential.docHash,
        credential.holderId,
        credential.issuerId,
        credential.issuerOrgId,
        credential.type,
        credential.title,
        credential.description || '',
        credential.achievementDate ? credential.achievementDate.toISOString() : '',
        credential.expirationDate ? credential.expirationDate.toISOString() : '',
        credential.programLength || '',
        credential.domain || '',
        attributesJSON,
      );
      console.log(`Issued credential ${credential.docId} (txId=${txId})`);
    } catch (error) {
      if (isIgnorableError(error, ['already exists'])) {
        console.log(`Credential ${credential.docId} already exists, skipping issue.`);
      } else {
        throw error;
      }
    }

    let ledgerTimestamp: string | undefined;
    try {
      const result = await contract.evaluateTransaction('ReadCredential', credential.docId);
      const parsed = JSON.parse(result.toString());
      if (parsed?.ledgerTimestamp) {
        ledgerTimestamp = parsed.ledgerTimestamp;
      }
    } catch (error) {
      if (!isIgnorableError(error, ['not found'])) {
        console.warn(`Failed to read ledger record for ${credential.docId}:`, error);
      }
    }

    if (txId || ledgerTimestamp) {
      await prisma.credential.update({
        where: { id: credential.id },
        data: {
          ...(txId ? { txId } : {}),
          ...(ledgerTimestamp ? { ledgerTimestamp } : {}),
        },
      });
    }
  } finally {
    gateway.disconnect();
  }
}

async function reseedLedger(): Promise<void> {
  const credentials = await prisma.credential.findMany({
    include: {
      issuer: { select: { id: true, orgName: true } },
      holder: { select: { id: true, orgName: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Re-issuing ${credentials.length} credentials...`);
  for (const credential of credentials) {
    if (!credential.issuer) {
      console.warn(`Skipping credential ${credential.docId}: issuer missing`);
      continue;
    }
    await issueCredentialFromDb(credential, credential.issuer);
  }

  const statusCredentials = await prisma.credential.findMany({
    where: { status: { in: ['accepted', 'denied'] } },
    include: { holder: { select: { id: true, orgName: true } } },
  });

  console.log(`Re-applying ${statusCredentials.length} accept/deny statuses...`);
  for (const credential of statusCredentials) {
    if (!credential.holder) {
      console.warn(`Skipping status update for ${credential.docId}: holder missing`);
      continue;
    }

    const txName = credential.status === 'accepted' ? 'AcceptCredential' : 'DenyCredential';
    try {
      await submitFabricTransaction(
        credential.holder.id,
        String(credential.holder.orgName),
        txName,
        credential.docId,
      );
    } catch (error) {
      if (!isIgnorableError(error, ['not found'])) {
        throw error;
      }
    }
  }

  const affiliations = await prisma.issuerAffiliation.findMany({
    where: { status: 'active' },
    include: { holder: { select: { id: true, orgName: true } } },
  });

  console.log(`Rebuilding ${affiliations.length} issuer-holder relationships...`);
  for (const affiliation of affiliations) {
    if (!affiliation.holder) {
      console.warn(`Skipping affiliation ${affiliation.id}: holder missing`);
      continue;
    }

    try {
      await submitFabricTransaction(
        affiliation.holder.id,
        String(affiliation.holder.orgName),
        'AddIssuerHolderRelationship',
        affiliation.userId,
        affiliation.issuerId,
      );
    } catch (error) {
      if (!isIgnorableError(error, ['already exists'])) {
        throw error;
      }
    }
  }

  const grantedRequests = await prisma.request.findMany({
    where: { status: 'granted' },
    include: {
      credential: {
        select: {
          id: true,
          holder: { select: { id: true, orgName: true } },
        },
      },
    },
  });

  console.log(`Re-applying ${grantedRequests.length} access grants...`);
  for (const request of grantedRequests) {
    const holder = request.credential?.holder;
    if (!holder) {
      console.warn(`Skipping access grant ${request.id}: holder missing`);
      continue;
    }

    try {
      await submitFabricTransaction(
        holder.id,
        String(holder.orgName),
        'GrantAccess',
        request.credential.id,
        request.requesterId,
      );
    } catch (error) {
      if (!isIgnorableError(error, ['not found', 'already exists'])) {
        throw error;
      }
    }
  }
}

async function main(): Promise<void> {
  if (process.env.MOCK_LEDGER === 'true') {
    console.error('MOCK_LEDGER=true; reseed is not applicable.');
    return;
  }

  const mode = parseMode(process.argv.slice(2));
  const reseedWalletOnly = mode === 'wallet';
  const reseedLedgerOnly = mode === 'ledger';

  console.log(`Ledger reseed mode: ${mode}`);

  if (!reseedLedgerOnly) {
    await reseedWallet();
  }

  if (!reseedWalletOnly) {
    await reseedLedger();
  }
}

main()
  .catch((error) => {
    console.error('Ledger reseed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
