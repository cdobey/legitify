import { getGateway } from '@/config/gateway';
import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import {
  getUserInfo,
  sha256,
  submitFabricTransaction,
  validateUserRole,
} from '@/utils/credential-utils';
import { RequestHandler, Response } from 'express';

/**
 * Requests access to a credential. Only accessible by users with role 'verifier'.
 */
export const requestAccess: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    validateUserRole(req.user, 'verifier');
    const userInfo = getUserInfo(req);

    const { docId } = req.body;
    if (!docId) {
      res.status(400).json({ error: 'Missing docId' });
      return;
    }

    // Check if credential exists and is accepted
    const credential = await prisma.credential.findUnique({
      where: { id: docId },
    });

    if (!credential) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }

    if (credential.status !== 'accepted') {
      res.status(400).json({ error: 'Credential must be accepted by the holder first' });
      return;
    }

    // Check if request already exists
    const existingRequest = await prisma.request.findFirst({
      where: {
        credentialId: docId,
        requesterId: userInfo.id,
      },
    });

    if (existingRequest) {
      res.status(400).json({ error: 'Access request already exists' });
      return;
    }

    // Create request
    const request = await prisma.request.create({
      data: {
        requesterId: userInfo.id,
        credentialId: docId,
        status: 'pending',
      },
    });

    res.status(201).json({
      message: 'Access request created',
      requestId: request.id,
    });
  } catch (error: any) {
    console.error('requestAccess error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Grants or denies access to a credential. Only accessible by users with role 'holder'.
 */
export const grantAccess: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    validateUserRole(req.user, 'holder');
    const userInfo = getUserInfo(req);

    const { requestId, granted } = req.body;
    if (!requestId || typeof granted !== 'boolean') {
      res.status(400).json({ error: 'Missing requestId or granted status' });
      return;
    }

    // Check if request exists and credential belongs to user
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { credential: true },
    });

    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    if (request.credential.holderId !== userInfo.id) {
      res.status(403).json({ error: 'Not authorized to grant access to this credential' });
      return;
    }

    // Update request status
    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: { status: granted ? 'granted' : 'denied' },
    });

    // If granted, update Fabric ledger
    if (granted) {
      await submitFabricTransaction(
        userInfo.id,
        userInfo.orgName,
        'GrantAccess',
        request.credential.id,
        request.requesterId,
      );
    }

    res.json({
      message: `Access ${granted ? 'granted' : 'denied'}`,
      request: updatedRequest,
    });
  } catch (error: any) {
    console.error('grantAccess error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Verifier views a credential if access is granted and verifies its hash.
 * Issuers can also view credentials they have issued.
 */
export const viewCredential: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // Allow both verifiers and issuers to access credentials
    if (req.user?.role !== 'verifier' && req.user?.role !== 'issuer') {
      res.status(403).json({ error: 'Only verifiers or issuers can view credentials' });
      return;
    }

    const docId = req.params.docId;
    console.log(
      `User ${req.user.id} with role ${req.user.role} attempting to view credential ${docId}`,
    );

    if (!docId) {
      res.status(400).json({ error: 'Missing docId parameter' });
      return;
    }

    // First check if this is an issuer viewing a credential they issued
    if (req.user.role === 'issuer') {
      const isIssuer = await prisma.credential.findFirst({
        where: {
          id: docId,
          issuerId: req.user.id,
        },
      });

      if (!isIssuer) {
        res.status(403).json({ error: 'Issuers can only view credentials they have issued' });
        return;
      }

      console.log(`Issuer ${req.user.id} is the issuer of credential ${docId}, granting access`);
    }
    // For verifiers, check if access is granted
    else if (req.user.role === 'verifier') {
      console.log(
        `Checking if access is granted for credential ${docId} to verifier ${req.user.id}`,
      );
      const grantedRequest = await prisma.request.findFirst({
        where: {
          credentialId: docId,
          requesterId: req.user.id,
          status: 'granted',
        },
      });

      if (!grantedRequest) {
        console.log(`No granted access found for credential ${docId} and user ${req.user.id}`);

        // Check if there are any requests (for better error messages)
        const anyRequest = await prisma.request.findFirst({
          where: {
            credentialId: docId,
            requesterId: req.user.id,
          },
        });

        if (anyRequest) {
          console.log(`Found request with status: ${anyRequest.status}`);
          res.status(403).json({
            error: `Access request exists but status is '${anyRequest.status}'. Please wait for the holder to grant access.`,
          });
        } else {
          res.status(403).json({ error: 'No access request found. Please request access first.' });
        }
        return;
      }

      console.log(`Access granted for credential ${docId} to verifier ${req.user.id}`);
    }

    // Fetch credential with more detailed includes
    const credential = await prisma.credential.findUnique({
      where: { id: docId },
      include: {
        issuerOrg: {
          select: {
            shorthand: true,
            name: true,
            description: true,
            logoUrl: true,
          },
        },
        holder: {
          select: {
            username: true,
            email: true,
          },
        },
        issuer: {
          select: {
            username: true,
            email: true,
            orgName: true,
          },
        },
      },
    });

    if (!credential) {
      res.status(404).json({ error: 'Credential not found' });
      return;
    }

    // Get hash from Fabric
    const gateway = await getGateway(req.user.id, req.user.orgName?.toLowerCase() || '');
    const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'legitifychannel');
    const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'credentialCC');

    const record = await contract.evaluateTransaction('ReadCredential', docId);
    const credentialRecord = JSON.parse(record.toString());

    // Verify hash matches current file
    const currentHash = sha256(Buffer.from(credential.fileData!));
    const isVerified = currentHash === credentialRecord.docHash;

    // Format date strings for better readability
    const formatDate = (dateString: string | Date | null) => {
      if (!dateString) return null;
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    // For verifiers, include the access granted date
    const accessGrantedOn =
      req.user.role === 'verifier'
        ? await prisma.request
            .findFirst({
              where: {
                credentialId: docId,
                requesterId: req.user.id,
                status: 'granted',
              },
              select: {
                updatedAt: true,
              },
            })
            .then(request => formatDate(request?.updatedAt ?? null))
        : null;

    // Return enriched credential data with the new fields
    res.json({
      // Basic credential info
      docId: credential.id,
      verified: isVerified,
      status: credential.status,
      type: credential.type,
      ledgerTimestamp: credentialRecord.ledgerTimestamp || credential.ledgerTimestamp,
      achievementDate: formatDate(credential.achievementDate),
      expirationDate: formatDate(credential.expirationDate),
      programLength: credential.programLength,
      domain: credential.domain,
      verificationHash: currentHash,

      // Credential details
      title: credential.title,
      description: credential.description,
      attributes: credential.attributes,

      // Issuer information
      issuer: credential.issuerOrg?.shorthand || credential.issuer.orgName,
      issuerId: credential.issuerId,
      issuerOrgId: credential.issuerOrgId,
      issuerInfo: credential.issuerOrg
        ? {
            name: credential.issuerOrg.name,
            shorthand: credential.issuerOrg.shorthand,
            description: credential.issuerOrg.description,
            logoUrl: credential.issuerOrg.logoUrl,
          }
        : null,

      // Holder information
      holder: {
        name: credential.holder.username,
        email: credential.holder.email,
      },

      // Blockchain record information
      blockchainInfo: {
        recordCreated: formatDate(new Date(credentialRecord.ledgerTimestamp)),
        lastUpdated: credentialRecord.updatedAt
          ? formatDate(new Date(credentialRecord.updatedAt))
          : null,
      },

      // Credential file data
      fileData: credential.fileData ? Buffer.from(credential.fileData).toString('base64') : null,

      // Access information
      accessGrantedOn: accessGrantedOn,
    });
  } catch (error: any) {
    console.error('viewCredential error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all access requests for a user's credentials
 */
export const getAccessRequests: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'holder') {
      res.status(403).json({ error: 'Only holders can view access requests' });
      return;
    }

    console.log('Fetching requests for user:', req.user.id);

    // Get all credentials with their requests
    const userCredentials = await prisma.credential.findMany({
      where: {
        holderId: req.user.id,
      },
      select: {
        id: true,
        status: true,
        type: true,
        title: true,
        requests: {
          include: {
            requester: {
              select: {
                username: true,
                orgName: true,
              },
            },
          },
        },
      },
    });

    // Flatten and format the requests
    const requests = userCredentials.flatMap(credential =>
      credential.requests.map(request => ({
        requestId: request.id,
        credentialId: credential.id,
        credentialTitle: credential.title,
        credentialType: credential.type,
        credentialStatus: credential.status,
        verifierName: request.requester.username,
        verifierOrg: request.requester.orgName,
        requestDate: request.createdAt,
        status: request.status,
      })),
    );

    res.json(requests);
  } catch (error: any) {
    console.error('getAccessRequests error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all credentials that the verifier has been granted access to.
 * Only accessible by users with role 'verifier'.
 */
export const getAccessibleCredentials: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'verifier') {
      res.status(403).json({ error: 'Only verifiers can view accessible credentials' });
      return;
    }

    console.log(`Fetching accessible credentials for verifier: ${req.user.id}`);

    const accessRequests = await prisma.request.findMany({
      where: {
        requesterId: req.user.id,
      },
      include: {
        credential: {
          include: {
            issuer: {
              select: {
                orgName: true,
              },
            },
            holder: {
              select: {
                username: true,
                email: true,
              },
            },
            issuerOrg: {
              select: {
                shorthand: true,
              },
            },
          },
        },
      },
    });

    console.log(
      `Found ${accessRequests.length} accessible credentials for verifier ${req.user.id}`,
    );

    // Format the response, using issuer org name when available
    const accessibleCredentials = accessRequests.map(request => ({
      requestId: request.id,
      credentialId: request.credential.id,
      title: request.credential.title,
      type: request.credential.type,
      issuer: request.credential.issuerOrg?.shorthand || request.credential.issuer.orgName,
      holder: {
        name: request.credential.holder.username,
        email: request.credential.holder.email,
      },
      status: request.status,
      requestedAt: request.createdAt,
      dateGranted: request.status === 'granted' ? request.updatedAt : null,
    }));

    res.json(accessibleCredentials);
  } catch (error: any) {
    console.error('getAccessibleCredentials error:', error);
    res.status(500).json({ error: error.message });
  }
};
