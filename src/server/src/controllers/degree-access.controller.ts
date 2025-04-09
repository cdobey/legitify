import { getGateway } from '@/config/gateway';
import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import {
  getUserInfo,
  sha256,
  submitFabricTransaction,
  validateUserRole,
} from '@/utils/degree-utils';
import { RequestHandler, Response } from 'express';

/**
 * Requests access to a degree document. Only accessible by users with role 'employer'.
 */
export const requestAccess: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    validateUserRole(req.user, 'employer');
    const userInfo = getUserInfo(req);

    const { docId } = req.body;
    if (!docId) {
      res.status(400).json({ error: 'Missing docId' });
      return;
    }

    // Check if document exists and is accepted
    const doc = await prisma.document.findUnique({
      where: { id: docId },
    });

    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    if (doc.status !== 'accepted') {
      res.status(400).json({ error: 'Document must be accepted by the individual first' });
      return;
    }

    // Check if request already exists
    const existingRequest = await prisma.request.findFirst({
      where: {
        documentId: docId,
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
        documentId: docId,
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
 * Grants or denies access to a degree document. Only accessible by users with role 'individual'.
 */
export const grantAccess: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    validateUserRole(req.user, 'individual');
    const userInfo = getUserInfo(req);

    const { requestId, granted } = req.body;
    if (!requestId || typeof granted !== 'boolean') {
      res.status(400).json({ error: 'Missing requestId or granted status' });
      return;
    }

    // Check if request exists and document belongs to user
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { document: true },
    });

    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    if (request.document.issuedTo !== userInfo.id) {
      res.status(403).json({ error: 'Not authorized to grant access to this document' });
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
        request.documentId,
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
 * Employer views a degree document if access is granted and verifies its hash.
 */
export const viewDegree: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'employer') {
      res.status(403).json({ error: 'Only employer can view documents' });
      return;
    }

    const docId = req.params.docId;
    console.log(`Employer ${req.user.id} attempting to view document ${docId}`);

    if (!docId) {
      res.status(400).json({ error: 'Missing docId parameter' });
      return;
    }

    // Check if access is granted with enhanced logging
    console.log(`Checking if access is granted for document ${docId} to user ${req.user.id}`);
    const grantedRequest = await prisma.request.findFirst({
      where: {
        documentId: docId,
        requesterId: req.user.id,
        status: 'granted',
      },
    });

    if (!grantedRequest) {
      console.log(`No granted access found for document ${docId} and user ${req.user.id}`);

      // Check if there are any requests (for better error messages)
      const anyRequest = await prisma.request.findFirst({
        where: {
          documentId: docId,
          requesterId: req.user.id,
        },
      });

      if (anyRequest) {
        console.log(`Found request with status: ${anyRequest.status}`);
        res.status(403).json({
          error: `Access request exists but status is '${anyRequest.status}'. Please wait for the owner to grant access.`,
        });
      } else {
        res.status(403).json({ error: 'No access request found. Please request access first.' });
      }
      return;
    }

    console.log(`Access granted for document ${docId} to user ${req.user.id}`);

    const doc = await prisma.document.findUnique({
      where: { id: docId },
    });
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Get hash from Fabric
    const gateway = await getGateway(req.user.id, req.user.orgName?.toLowerCase() || '');
    const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'legitifychannel');
    const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'degreeCC');

    const record = await contract.evaluateTransaction('ReadDegree', docId);
    const degreeRecord = JSON.parse(record.toString());

    // Verify hash matches current file
    const currentHash = sha256(Buffer.from(doc.fileData!));
    const isVerified = currentHash === degreeRecord.docHash;

    res.json({
      docId: doc.id,
      verified: isVerified,
      issuer: degreeRecord.issuer,
      issuedAt: degreeRecord.issuedAt,
      fileData: doc.fileData ? Buffer.from(doc.fileData).toString('base64') : null,
      status: doc.status,
    });
  } catch (error: any) {
    console.error('viewDegree error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all access requests for a user's degrees
 */
export const getAccessRequests: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'individual') {
      res.status(403).json({ error: 'Only individuals can view access requests' });
      return;
    }

    console.log('Fetching requests for user:', req.user.id);

    // First, get all documents for debugging
    const allDocs = await prisma.document.findMany({
      where: {
        issuedTo: req.user.id,
      },
    });
    console.log('All user documents:', allDocs);

    // Get all requests, with less restrictive filtering
    const userDocuments = await prisma.document.findMany({
      where: {
        issuedTo: req.user.id,
      },
      select: {
        id: true,
        status: true,
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

    console.log('User documents with requests:', JSON.stringify(userDocuments, null, 2));

    // Flatten and format the requests, but include more info for debugging
    const requests = userDocuments.flatMap((doc: any) =>
      doc.requests.map((request: any) => ({
        requestId: request.id,
        docId: doc.id,
        docStatus: doc.status,
        employerName: request.requester.orgName,
        requestDate: request.createdAt,
        status: request.status,
      })),
    );

    console.log('Formatted requests:', requests);

    res.json(requests);
  } catch (error: any) {
    console.error('getAccessRequests error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all degrees that the employer has been granted access to.
 * Only accessible by users with role 'employer'.
 */
export const getAccessibleDegrees: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'employer') {
      res.status(403).json({ error: 'Only employers can view accessible degrees' });
      return;
    }

    console.log(`Fetching accessible degrees for employer: ${req.user.id}`);

    // Now we can directly include the university relation
    const accessRequests = await prisma.request.findMany({
      where: {
        requesterId: req.user.id,
        status: 'granted',
      },
      include: {
        document: {
          include: {
            issuerUser: {
              select: {
                orgName: true,
              },
            },
            issuedToUser: {
              select: {
                username: true,
                email: true,
              },
            },
            university: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    console.log(`Found ${accessRequests.length} accessible documents for employer ${req.user.id}`);

    // Format the response, using university name when available
    const accessibleDocs = accessRequests.map(request => ({
      requestId: request.id,
      docId: request.documentId,
      issuer: request.document.university?.displayName || request.document.issuerUser.orgName,
      owner: {
        name: request.document.issuedToUser.username,
        email: request.document.issuedToUser.email,
      },
      status: request.document.status,
      dateGranted: request.updatedAt,
    }));

    res.json(accessibleDocs);
  } catch (error: any) {
    console.error('getAccessibleDegrees error:', error);
    res.status(500).json({ error: error.message });
  }
};
