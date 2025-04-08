import crypto from 'crypto';
import dotenv from 'dotenv';
import { Request, RequestHandler, Response } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import '../config/env';
import { getGateway } from '../config/gateway';
import prisma from '../prisma/client';
import { AuthUser, RequestWithUser } from '../types/user.types';

// Configure dotenv to use server.env instead of .env
dotenv.config({ path: path.resolve(__dirname, '../../server.env') });

// Constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const FABRIC_CHANNEL = process.env.FABRIC_CHANNEL || 'legitifychannel';
const FABRIC_CHAINCODE = process.env.FABRIC_CHAINCODE || 'degreeCC';

// Helper to compute SHA256
function sha256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

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

// Helper function to interact with Fabric network
async function submitFabricTransaction(
  userId: string,
  orgName: string,
  transactionName: string,
  ...args: string[]
): Promise<void> {
  const gateway = await getGateway(userId, orgName.toLowerCase());
  try {
    const network = await gateway.getNetwork(FABRIC_CHANNEL);
    const contract = network.getContract(FABRIC_CHAINCODE);
    await contract.submitTransaction(transactionName, ...args);
  } finally {
    gateway.disconnect();
  }
}

// Helper function to validate and process degree file
function processDegreeFile(base64File: string): { fileData: Buffer; docHash: string } {
  const decodedFile = Buffer.from(base64File, 'base64');
  if (decodedFile.length > MAX_FILE_SIZE) {
    throw new Error('File size must be less than 5MB');
  }
  const fileData = Buffer.from(base64File, 'base64');
  const docHash = sha256(fileData);
  return { fileData, docHash };
}

// Helper function to validate user role
function validateUserRole(user: AuthUser | undefined, requiredRole: string): void {
  if (!user) {
    throw new Error('User not authenticated');
  }
  if (!user.role) {
    throw new Error('User role not found');
  }
  if (user.role !== requiredRole) {
    throw new Error(`Only ${requiredRole} can perform this action`);
  }
}

// Helper function to get user info safely
function getUserInfo(req: RequestWithUser): { uid: string; role: string; orgName: string } {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  if (!req.user.role) {
    throw new Error('User role not found');
  }
  return {
    uid: req.user.uid,
    role: req.user.role,
    orgName: req.user.orgName || '',
  };
}

/**
 * Issues a degree to an individual. Only accessible by users with role 'university'.
 */
export const issueDegree: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as AuthUser;
    validateUserRole(user, 'university');

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
      universityId,
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

    // Process the degree file
    const { fileData, docHash } = processDegreeFile(base64File);
    const docId = uuidv4();

    // Store hash in Fabric
    await submitFabricTransaction(
      user.uid,
      user.orgName || '',
      'IssueDegree',
      docId,
      docHash,
      individual.id,
      user.uid,
      universityId,
      degreeTitle,
      fieldOfStudy,
      graduationDate,
      honors,
      studentId,
      programDuration,
      gpa.toString(),
      additionalNotes,
    );

    // Store document in DB
    const newDocument = await prisma.document.create({
      data: {
        id: docId,
        issuedTo: individual.id,
        issuer: user.uid,
        universityId,
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
      docHash,
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
    validateUserRole(req.user, 'individual');
    const userInfo = getUserInfo(req);

    const { docId } = req.body;
    if (!docId) {
      res.status(400).json({ error: 'Missing docId' });
      return;
    }

    // Check DB ownership
    const doc = await prisma.document.findUnique({
      where: { id: docId },
    });
    if (!doc || doc.issuedTo !== userInfo.uid) {
      res.status(404).json({ error: 'Document not found or not owned by you' });
      return;
    }

    // Update Fabric ledger
    await submitFabricTransaction(userInfo.uid, userInfo.orgName, 'AcceptDegree', docId);

    // Update DB status
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
    validateUserRole(req.user, 'individual');
    const userInfo = getUserInfo(req);

    const { docId } = req.body;
    if (!docId) {
      res.status(400).json({ error: 'Missing docId' });
      return;
    }

    // Check DB ownership
    const doc = await prisma.document.findUnique({
      where: { id: docId },
    });
    if (!doc || doc.issuedTo !== userInfo.uid) {
      res.status(404).json({ error: 'Document not found or not owned by you' });
      return;
    }

    // Update Fabric ledger
    await submitFabricTransaction(userInfo.uid, userInfo.orgName, 'DenyDegree', docId);

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
        requesterId: userInfo.uid,
      },
    });

    if (existingRequest) {
      res.status(400).json({ error: 'Access request already exists' });
      return;
    }

    // Create request
    const request = await prisma.request.create({
      data: {
        requesterId: userInfo.uid,
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

    if (request.document.issuedTo !== userInfo.uid) {
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
        userInfo.uid,
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
