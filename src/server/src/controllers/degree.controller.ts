import dotenv from 'dotenv';
import { Request, RequestHandler, Response } from 'express';
import path from 'path';

// Configure dotenv to use server.env instead of .env
dotenv.config({ path: path.resolve(__dirname, '../../server.env') });

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import '../config/env'; // Import our environment helper
import { getGateway } from '../config/gateway';
import prisma from '../prisma/client';

// Helper to compute SHA256
function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

interface DegreeDetails {
  email: string;
  base64File: string;
  degreeTitle: string;
  fieldOfStudy: string;
  graduationDate: string;
  honors: string;
  studentId: string;
  programDuration: string;
  gpa: number;
  additionalNotes?: string;
}

/**
 * Issues a degree to an individual. Only accessible by users with role 'university'.
 */
export const issueDegree: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // Cast req.user to our expected type
    const user = req.user as { uid: string; role: string; orgName?: string };
    if (user.role !== 'university') {
      res.status(403).json({ error: 'Only university can issue degrees' });
      return;
    }

    const {
      email,
      base64File,
      degreeTitle,
      fieldOfStudy,
      graduationDate,
      honors,
      studentId,
      programDuration,
      gpa,
      additionalNotes = '',
      universityId, // New parameter for university ID
    } = req.body as DegreeDetails & { universityId: string };

    if (!email || !base64File || !universityId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Check if the university exists and is owned by this user
    const university = await prisma.university.findFirst({
      where: {
        id: universityId,
        ownerId: user.uid,
      },
    });

    if (!university) {
      res.status(404).json({ error: 'University not found or not owned by you' });
      return;
    }

    // Find the individual by email
    const individual = await prisma.user.findUnique({
      where: { email },
    });

    if (!individual) {
      res.status(404).json({ error: 'Individual with this email not found' });
      return;
    }

    if (individual.role !== 'individual') {
      res.status(400).json({ error: 'The provided email does not belong to an individual user' });
      return;
    }

    // Check if the individual is affiliated with this university
    const affiliation = await prisma.affiliation.findFirst({
      where: {
        userId: individual.id,
        universityId,
        status: 'active',
      },
    });

    if (!affiliation) {
      res.status(403).json({ error: 'Individual is not affiliated with this university' });
      return;
    }

    // Add file size validation
    const decodedFile = Buffer.from(base64File, 'base64');
    if (decodedFile.length > MAX_FILE_SIZE) {
      res.status(400).json({ error: 'File size must be less than 5MB' });
      return;
    }

    const fileData = Buffer.from(base64File, 'base64');
    const docHash = sha256(fileData);
    const docId = uuidv4();

    // Store hash in Fabric first
    const gateway = await getGateway(user.uid, user.orgName?.toLowerCase() || '');
    const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'legitifychannel');
    const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'degreeCC');

    await contract.submitTransaction(
      'IssueDegree',
      docId,
      docHash,
      individual.id,
      user.uid,
      universityId, // Pass university ID to chaincode
      degreeTitle,
      fieldOfStudy,
      graduationDate,
      honors,
      studentId,
      programDuration,
      gpa.toString(),
      additionalNotes,
    );
    gateway.disconnect();

    // Store document in DB (without hash)
    const newDocument = await prisma.document.create({
      data: {
        id: docId,
        issuedTo: individual.id,
        issuer: user.uid,
        universityId, // Store university ID in document
        fileData,
        status: 'issued',
        degreeTitle,
        fieldOfStudy,
        graduationDate: new Date(graduationDate),
        honors,
        studentId,
        programDuration,
        gpa,
        additionalNotes,
      },
    });

    res.status(201).json({
      message: 'Degree issued',
      docId: newDocument.id,
      docHash, // Include hash in response for verification
    });
  } catch (error: unknown) {
    console.error('issueDegree error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    });
  }
};

/**
 * Accepts a degree. Only accessible by users with role 'individual'.
 */
export const acceptDegree: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'individual') {
      res.status(403).json({ error: 'Only individual can accept degrees' });
      return;
    }

    const { docId } = req.body;
    if (!docId) {
      res.status(400).json({ error: 'Missing docId' });
      return;
    }

    // Check DB ownership
    const doc = await prisma.document.findUnique({
      where: { id: docId },
    });
    if (!doc || doc.issuedTo !== req.user.uid) {
      res.status(404).json({ error: 'Document not found or not owned by you' });
      return;
    }

    const gateway = await getGateway(req.user.uid, req.user.orgName?.toLowerCase() || '');
    const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'legitifychannel');
    const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'degreeCC');

    await contract.submitTransaction('AcceptDegree', docId);
    gateway.disconnect();

    await prisma.document.update({
      where: { id: docId },
      data: { status: 'accepted' },
    });

    res.json({ message: `Doc ${docId} accepted` });
  } catch (error: any) {
    console.error('acceptDegree error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Denies a degree. Only accessible by users with role 'individual'.
 */
export const denyDegree: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'individual') {
      res.status(403).json({ error: 'Only individual can deny degrees' });
      return;
    }

    const { docId } = req.body;
    if (!docId) {
      res.status(400).json({ error: 'Missing docId' });
      return;
    }

    const doc = await prisma.document.findUnique({
      where: { id: docId },
    });
    if (!doc || doc.issuedTo !== req.user.uid) {
      res.status(404).json({ error: 'Document not found or not owned by you' });
      return;
    }

    // Interact with ledger
    const gateway = await getGateway(req.user.uid, req.user.orgName?.toLowerCase() || '');
    const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'legitifychannel');
    const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'degreeCC');

    await contract.submitTransaction('DenyDegree', docId);
    gateway.disconnect();

    // Update DB status
    await prisma.document.update({
      where: { id: docId },
      data: { status: 'denied' },
    });

    res.json({ message: `Doc ${docId} denied` });
  } catch (error: any) {
    console.error('denyDegree error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Employer requests access to a degree document.
 */
export const requestAccess: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'employer') {
      res.status(403).json({ error: 'Only employer can request access' });
      return;
    }

    const { docId } = req.body;
    if (!docId) {
      res.status(400).json({ error: 'Missing docId' });
      return;
    }

    // Check doc existence
    const doc = await prisma.document.findUnique({
      where: { id: docId },
    });
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const requestId = uuidv4();
    await prisma.request.create({
      data: {
        id: requestId,
        requesterId: req.user.uid,
        documentId: docId,
        status: 'pending',
      },
    });

    res.status(201).json({ message: 'Access requested', requestId });
  } catch (error: any) {
    console.error('requestAccess error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Individual grants or denies an employer's access request.
 */
export const grantAccess: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'individual') {
      res.status(403).json({ error: 'Only individual can grant/deny access' });
      return;
    }

    const { requestId, granted } = req.body;
    console.log(
      `Grant access request: requestId=${requestId}, granted=${granted}, userId=${req.user.uid}`,
    );

    if (!requestId || granted === undefined) {
      res.status(400).json({ error: 'Missing requestId or granted flag' });
      return;
    }

    // Find access request with additional logging
    console.log('Looking for access request:', requestId);
    const accessRequest = await prisma.request.findUnique({
      where: { id: requestId },
      include: { document: true },
    });

    if (!accessRequest) {
      console.log('Access request not found:', requestId);
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    console.log('Found access request:', {
      requestId: accessRequest.id,
      documentId: accessRequest.documentId,
      requesterId: accessRequest.requesterId,
      documentOwnerId: accessRequest.document.issuedTo,
    });

    // Check if user owns the document
    if (accessRequest.document.issuedTo !== req.user.uid) {
      console.log(
        `Ownership mismatch: document owner=${accessRequest.document.issuedTo}, current user=${req.user.uid}`,
      );
      res.status(403).json({ error: 'You do not own this document' });
      return;
    }

    // Update request status
    const newStatus = granted ? 'granted' : 'denied';
    console.log(`Updating access request ${requestId} status to: ${newStatus}`);

    await prisma.request.update({
      where: { id: requestId },
      data: { status: newStatus },
    });

    console.log(`Access request ${requestId} successfully updated to ${newStatus}`);

    res.json({
      message: `Access ${granted ? 'granted' : 'denied'} for request ${requestId}`,
    });
  } catch (error: any) {
    console.error('grantAccess error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Employer views a degree document if access is granted and verifies its hash.
 */
export const viewDegree: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.role !== 'employer') {
      res.status(403).json({ error: 'Only employer can view documents' });
      return;
    }

    const docId = req.params.docId;
    console.log(`Employer ${req.user.uid} attempting to view document ${docId}`);

    if (!docId) {
      res.status(400).json({ error: 'Missing docId parameter' });
      return;
    }

    // Check if access is granted with enhanced logging
    console.log(`Checking if access is granted for document ${docId} to user ${req.user.uid}`);
    const grantedRequest = await prisma.request.findFirst({
      where: {
        documentId: docId,
        requesterId: req.user.uid,
        status: 'granted',
      },
    });

    if (!grantedRequest) {
      console.log(`No granted access found for document ${docId} and user ${req.user.uid}`);

      // Check if there are any requests (for better error messages)
      const anyRequest = await prisma.request.findFirst({
        where: {
          documentId: docId,
          requesterId: req.user.uid,
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

    console.log(`Access granted for document ${docId} to user ${req.user.uid}`);

    const doc = await prisma.document.findUnique({
      where: { id: docId },
    });
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Get hash from Fabric
    const gateway = await getGateway(req.user.uid, req.user.orgName?.toLowerCase() || '');
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
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'individual') {
      res.status(403).json({ error: 'Only individuals can view access requests' });
      return;
    }

    console.log('Fetching requests for user:', req.user.uid);

    // First, get all documents for debugging
    const allDocs = await prisma.document.findMany({
      where: {
        issuedTo: req.user.uid,
      },
    });
    console.log('All user documents:', allDocs);

    // Get all requests, with less restrictive filtering
    const userDocuments = await prisma.document.findMany({
      where: {
        issuedTo: req.user.uid,
        // Remove status filter temporarily to see all documents
      },
      select: {
        id: true,
        status: true, // Add status to debug output
        requests: {
          include: {
            requester: {
              select: {
                username: true,
                orgName: true,
              },
            },
          },
          // Remove status filter temporarily
        },
      },
    });

    console.log('User documents with requests:', JSON.stringify(userDocuments, null, 2));

    // Flatten and format the requests, but include more info for debugging
    const requests = userDocuments.flatMap((doc: any) =>
      doc.requests.map((request: any) => ({
        requestId: request.id,
        docId: doc.id,
        docStatus: doc.status, // Add document status
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
 * Get all degrees issued to the logged-in user
 */
export const getMyDegrees: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const documents = await prisma.document.findMany({
      where: {
        issuedTo: req.user!.uid,
      },
      include: {
        issuerUser: {
          select: {
            orgName: true,
          },
        },
        university: {
          select: {
            displayName: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedDocs = documents.map(doc => ({
      docId: doc.id,
      // Use the university name if available, otherwise fallback to issuer organization name
      issuer: doc.university?.displayName || doc.issuerUser.orgName,
      status: doc.status,
      issueDate: doc.createdAt,
      universityId: doc.universityId,
    }));

    res.json(formattedDocs);
  } catch (error: any) {
    console.error('getMyDegrees error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Verify a degree document. Only accessible by users with role 'employer'.
 */
export const verifyDegreeDocument: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = req.user as { uid: string; role: string; orgName?: string };
    if (user.role !== 'employer') {
      res.status(403).json({ error: 'Only employers can verify documents' });
      return;
    }

    const { email, base64File } = req.body as {
      email: string;
      base64File: string;
    };
    if (!email || !base64File) {
      res.status(400).json({ error: 'Missing email or base64File' });
      return;
    }

    // Find user by email
    const targetUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!targetUser) {
      res.json({
        verified: false,
        message: 'No user found with this email',
      });
      return;
    }

    const fileData = Buffer.from(base64File, 'base64');
    const uploadedHash = sha256(fileData);

    // Find all accepted documents for this user
    const docs = await prisma.document.findMany({
      where: {
        issuedTo: targetUser.id, // Use the found user's ID
        status: 'accepted',
      },
      include: {
        issuedToUser: {
          select: {
            username: true,
          },
        },
        issuerUser: {
          select: {
            orgName: true,
          },
        },
      },
    });

    // Create gateway connection
    const gateway = await getGateway(user.uid, user.orgName?.toLowerCase() || '');
    const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'legitifychannel');
    const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'degreeCC');

    // Check each document's hash
    for (const doc of docs) {
      try {
        const result = await contract.evaluateTransaction('VerifyHash', doc.id, uploadedHash);
        const isVerified = (result as Buffer).toString() === 'true';

        if (isVerified) {
          gateway.disconnect();
          res.json({
            verified: true,
            message: 'Document verified successfully',
            docId: doc.id,
          });
          return;
        }
      } catch (error) {
        console.error(`Error verifying doc ${doc.id}:`, error);
        continue;
      }
    }

    gateway.disconnect();
    res.json({
      verified: false,
      message: 'No matching document found',
    });
  } catch (error: any) {
    console.error('verifyDegreeDocument error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all records from the blockchain ledger for a specific university
 */
export const getAllLedgerRecords: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'university') {
      res.status(403).json({ error: 'Only university can view all records' });
      return;
    }

    // Get the university ID for the current user
    const university = await prisma.university.findFirst({
      where: {
        ownerId: req.user.uid,
      },
    });

    if (!university) {
      res.status(404).json({ error: 'University not found for this user' });
      return;
    }

    const gateway = await getGateway(req.user.uid, req.user.orgName?.toLowerCase() || '');
    const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'legitifychannel');
    const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'degreeCC');

    // Call the GetUniversityRecords function with the university ID
    // instead of GetAllRecords to get only records for this university
    const result = await contract.evaluateTransaction('GetUniversityRecords', university.id);
    const records = JSON.parse(result.toString());
    gateway.disconnect();

    // Enrich the records with university display names, but use only the current university
    const enrichedRecords = records.map((record: any) => {
      return {
        ...record,
        universityName: university?.displayName || 'Unknown University',
      };
    });

    res.json(enrichedRecords);
  } catch (error: any) {
    console.error('getAllLedgerRecords error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all degrees issued to a specific user by userId.
 * Only accessible by users with role 'employer'.
 */
export const getUserDegrees: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Only employers should access other users' degrees
    if (req.user?.role !== 'employer') {
      res.status(403).json({ error: 'Only employers can view user degrees' });
      return;
    }

    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ error: 'Missing userId parameter' });
      return;
    }

    // Find the user to ensure they exist
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Only return accepted degrees for security
    const documents = await prisma.document.findMany({
      where: {
        issuedTo: userId,
        status: 'accepted', // Only return accepted documents
      },
      include: {
        issuerUser: {
          select: {
            orgName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedDocs = documents.map((doc: any) => ({
      docId: doc.id,
      issuer: doc.issuerUser.orgName,
      status: doc.status,
      issueDate: doc.createdAt,
    }));

    res.json(formattedDocs);
  } catch (error: any) {
    console.error('getUserDegrees error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all degrees that the employer has been granted access to.
 * Only accessible by users with role 'employer'.
 */
export const getAccessibleDegrees: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'employer') {
      res.status(403).json({ error: 'Only employers can view accessible degrees' });
      return;
    }

    console.log(`Fetching accessible degrees for employer: ${req.user.uid}`);

    // Now we can directly include the university relation
    const accessRequests = await prisma.request.findMany({
      where: {
        requesterId: req.user.uid,
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

    console.log(`Found ${accessRequests.length} accessible documents for employer ${req.user.uid}`);

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

/**
 * Get recently issued degrees for university dashboard.
 * Only accessible by users with role 'university'.
 */
export const getRecentIssuedDegrees: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'university') {
      res.status(403).json({ error: 'Only universities can access this data' });
      return;
    }

    // Get the university ID for the current user
    const university = await prisma.university.findFirst({
      where: {
        ownerId: req.user.uid,
      },
    });

    if (!university) {
      res.status(404).json({ error: 'University not found for this user' });
      return;
    }

    // Now we can directly include the university relation
    const recentDegrees = await prisma.document.findMany({
      where: {
        universityId: university.id,
      },
      include: {
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
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const formattedDocs = recentDegrees.map(doc => ({
      docId: doc.id,
      issuedTo: doc.issuedToUser.email,
      recipientName: doc.issuedToUser.username,
      status: doc.status,
      issueDate: doc.createdAt,
      // Now we can get the display name directly from the relation
      university: doc.university?.displayName || 'Unknown University',
    }));

    res.json(formattedDocs);
  } catch (error: any) {
    console.error('getRecentIssuedDegrees error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get recent verification history for employer dashboard.
 * Only accessible by users with role 'employer'.
 */
export const getRecentVerifications: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (req.user?.role !== 'employer') {
      res.status(403).json({ error: 'Only employers can access this data' });
      return;
    }

    // For now, just return an empty array since verification history isn't stored
    // This is where you would add the implementation to retrieve actual verification history
    res.json([]);
  } catch (error: any) {
    console.error('getRecentVerifications error:', error);
    res.status(500).json({ error: error.message });
  }
};
