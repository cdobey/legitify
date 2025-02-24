import { Request, RequestHandler, Response } from "express";

import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import { getGateway } from "../config/gateway";
import prisma from "../prisma/client";

// Helper to compute SHA256
function sha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Issues a degree to an individual. Only accessible by users with role 'university'.
 */
export const issueDegree: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== "university") {
      res.status(403).json({ error: "Only university can issue degrees" });
      return;
    }

    const { individualId, base64File } = req.body;
    console.log("Received payload:", {
      individualId: individualId ? "present" : "missing",
      base64File: base64File ? "present" : "missing",
    });

    if (!individualId || !base64File) {
      res.status(400).json({ error: "Missing individualId or base64File" });
      return;
    }

    // Calculate hash and prepare data
    const fileData = Buffer.from(base64File, "base64");
    const docHash = sha256(fileData);
    const docId = uuidv4();

    // Store hash in Fabric first
    const gateway = await getGateway(
      req.user.uid,
      req.user.orgName?.toLowerCase() || ""
    );
    const network = await gateway.getNetwork(
      process.env.FABRIC_CHANNEL || "mychannel"
    );
    const contract = network.getContract(
      process.env.FABRIC_CHAINCODE || "degreeCC"
    );

    await contract.submitTransaction(
      "IssueDegree",
      docId,
      docHash,
      individualId,
      req.user.uid
    );
    gateway.disconnect();

    // Store document in DB (without hash)
    const newDocument = await prisma.document.create({
      data: {
        id: docId,
        issuedTo: individualId,
        issuer: req.user.uid,
        fileData,
        status: "issued",
      },
    });

    res.status(201).json({
      message: "Degree issued",
      docId: newDocument.id,
      docHash, // Include hash in response for verification
    });
  } catch (error: any) {
    console.error("issueDegree error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Accepts a degree. Only accessible by users with role 'individual'.
 */
export const acceptDegree: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== "individual") {
      res.status(403).json({ error: "Only individual can accept degrees" });
      return;
    }

    const { docId } = req.body;
    if (!docId) {
      res.status(400).json({ error: "Missing docId" });
      return;
    }

    // Check DB ownership
    const doc = await prisma.document.findUnique({
      where: { id: docId },
    });
    if (!doc || doc.issuedTo !== req.user.uid) {
      res.status(404).json({ error: "Document not found or not owned by you" });
      return;
    }

    const gateway = await getGateway(
      req.user.uid,
      req.user.orgName?.toLowerCase() || ""
    );
    const network = await gateway.getNetwork(
      process.env.FABRIC_CHANNEL || "mychannel"
    );
    const contract = network.getContract(
      process.env.FABRIC_CHAINCODE || "degreeCC"
    );

    await contract.submitTransaction("AcceptDegree", docId);
    gateway.disconnect();

    await prisma.document.update({
      where: { id: docId },
      data: { status: "accepted" },
    });

    res.json({ message: `Doc ${docId} accepted` });
  } catch (error: any) {
    console.error("acceptDegree error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Denies a degree. Only accessible by users with role 'individual'.
 */
export const denyDegree: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== "individual") {
      res.status(403).json({ error: "Only individual can deny degrees" });
      return;
    }

    const { docId } = req.body;
    if (!docId) {
      res.status(400).json({ error: "Missing docId" });
      return;
    }

    const doc = await prisma.document.findUnique({
      where: { id: docId },
    });
    if (!doc || doc.issuedTo !== req.user.uid) {
      res.status(404).json({ error: "Document not found or not owned by you" });
      return;
    }

    // Interact with ledger
    const gateway = await getGateway(
      req.user.uid,
      req.user.orgName?.toLowerCase() || ""
    );
    const network = await gateway.getNetwork(
      process.env.FABRIC_CHANNEL || "mychannel"
    );
    const contract = network.getContract(
      process.env.FABRIC_CHAINCODE || "degreeCC"
    );

    await contract.submitTransaction("DenyDegree", docId);
    gateway.disconnect();

    // Update DB status
    await prisma.document.update({
      where: { id: docId },
      data: { status: "denied" },
    });

    res.json({ message: `Doc ${docId} denied` });
  } catch (error: any) {
    console.error("denyDegree error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Employer requests access to a degree document.
 */
export const requestAccess: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== "employer") {
      res.status(403).json({ error: "Only employer can request access" });
      return;
    }

    const { docId } = req.body;
    if (!docId) {
      res.status(400).json({ error: "Missing docId" });
      return;
    }

    // Check doc existence
    const doc = await prisma.document.findUnique({
      where: { id: docId },
    });
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const requestId = uuidv4();
    await prisma.request.create({
      data: {
        id: requestId,
        requesterId: req.user.uid,
        documentId: docId,
        status: "pending",
      },
    });

    res.status(201).json({ message: "Access requested", requestId });
  } catch (error: any) {
    console.error("requestAccess error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Individual grants or denies an employer's access request.
 */
export const grantAccess: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== "individual") {
      res.status(403).json({ error: "Only individual can grant/deny access" });
      return;
    }

    const { requestId, granted } = req.body;
    if (!requestId || granted === undefined) {
      res.status(400).json({ error: "Missing requestId or granted flag" });
      return;
    }

    const accessRequest = await prisma.request.findUnique({
      where: { id: requestId },
      include: { document: true },
    });
    if (!accessRequest) {
      res.status(404).json({ error: "Request not found" });
      return;
    }

    // Check if user owns the document
    if (accessRequest.document.issuedTo !== req.user.uid) {
      res.status(403).json({ error: "You do not own this document" });
      return;
    }

    // Update request status
    await prisma.request.update({
      where: { id: requestId },
      data: { status: granted ? "granted" : "denied" },
    });

    res.json({
      message: `Access ${
        granted ? "granted" : "denied"
      } for request ${requestId}`,
    });
  } catch (error: any) {
    console.error("grantAccess error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Employer views a degree document if access is granted and verifies its hash.
 */
export const viewDegree: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== "employer") {
      res.status(403).json({ error: "Only employer can view documents" });
      return;
    }

    const docId = req.params.docId;
    if (!docId) {
      res.status(400).json({ error: "Missing docId parameter" });
      return;
    }

    // Check if access is granted
    const grantedRequest = await prisma.request.findFirst({
      where: {
        documentId: docId,
        requesterId: req.user.uid,
        status: "granted",
      },
    });
    if (!grantedRequest) {
      res.status(403).json({ error: "No granted access for this document" });
      return;
    }

    const doc = await prisma.document.findUnique({
      where: { id: docId },
    });
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    // Get hash from Fabric
    const gateway = await getGateway(
      req.user.uid,
      req.user.orgName?.toLowerCase() || ""
    );
    const network = await gateway.getNetwork(
      process.env.FABRIC_CHANNEL || "mychannel"
    );
    const contract = network.getContract(
      process.env.FABRIC_CHAINCODE || "degreeCC"
    );

    const record = await contract.evaluateTransaction("ReadDegree", docId);
    const degreeRecord = JSON.parse(record.toString());

    // Verify hash matches current file
    const currentHash = sha256(Buffer.from(doc.fileData!));
    const isVerified = currentHash === degreeRecord.docHash;

    res.json({
      docId: doc.id,
      verified: isVerified,
      issuer: degreeRecord.issuer,
      issuedAt: degreeRecord.issuedAt,
      fileData: doc.fileData
        ? Buffer.from(doc.fileData).toString("base64")
        : null,
      status: doc.status,
    });
  } catch (error: any) {
    console.error("viewDegree error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all access requests for a user's degrees
 */
export const getAccessRequests: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== "individual") {
      res
        .status(403)
        .json({ error: "Only individuals can view access requests" });
      return;
    }

    console.log("Fetching requests for user:", req.user.uid);

    // First, get all documents for debugging
    const allDocs = await prisma.document.findMany({
      where: {
        issuedTo: req.user.uid,
      },
    });
    console.log("All user documents:", allDocs);

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

    console.log(
      "User documents with requests:",
      JSON.stringify(userDocuments, null, 2)
    );

    // Flatten and format the requests, but include more info for debugging
    const requests = userDocuments.flatMap((doc) =>
      doc.requests.map((request) => ({
        requestId: request.id,
        docId: doc.id,
        docStatus: doc.status, // Add document status
        employerName: request.requester.orgName,
        requestDate: request.createdAt,
        status: request.status,
      }))
    );

    console.log("Formatted requests:", requests);

    res.json(requests);
  } catch (error: any) {
    console.error("getAccessRequests error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all degrees issued to the logged-in user
 */
export const getMyDegrees: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedDocs = documents.map((doc) => ({
      docId: doc.id,
      issuer: doc.issuerUser.orgName,
      status: doc.status,
      issueDate: doc.createdAt,
    }));

    res.json(formattedDocs);
  } catch (error: any) {
    console.error("getMyDegrees error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Verify a degree document. Only accessible by users with role 'employer'.
 */
export const verifyDegreeDocument: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== "employer") {
      res.status(403).json({ error: "Only employers can verify documents" });
      return;
    }

    const { individualId, base64File } = req.body;
    if (!individualId || !base64File) {
      res.status(400).json({ error: "Missing individualId or base64File" });
      return;
    }

    // Calculate hash of uploaded document
    const fileData = Buffer.from(base64File, "base64");
    const uploadedHash = sha256(fileData);

    // Find document in database by individualId
    const doc = await prisma.document.findFirst({
      where: {
        issuedTo: individualId,
        status: "accepted",
      },
    });

    if (!doc) {
      res.json({
        verified: false,
        message: "No matching verified document found",
      });
      return;
    }

    // Verify hash from blockchain
    const gateway = await getGateway(
      req.user.uid,
      req.user.orgName?.toLowerCase() || ""
    );
    const network = await gateway.getNetwork(
      process.env.FABRIC_CHANNEL || "mychannel"
    );
    const contract = network.getContract(
      process.env.FABRIC_CHAINCODE || "degreeCC"
    );

    // Use the VerifyHash chaincode function to compare hashes
    const result = await contract.evaluateTransaction(
      "VerifyHash",
      doc.id,
      uploadedHash
    );
    const isVerified = result.toString() === "true";
    gateway.disconnect();

    res.json({
      verified: isVerified,
      message: isVerified
        ? "Document verified successfully"
        : "Document verification failed",
      docId: doc.id,
    });
  } catch (error: any) {
    console.error("verifyDegreeDocument error:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get all records from the blockchain ledger
 */
export const getAllLedgerRecords: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (req.user?.role !== "university") {
      res.status(403).json({ error: "Only university can view all records" });
      return;
    }

    const gateway = await getGateway(
      req.user.uid,
      req.user.orgName?.toLowerCase() || ""
    );
    const network = await gateway.getNetwork(
      process.env.FABRIC_CHANNEL || "mychannel"
    );
    const contract = network.getContract(
      process.env.FABRIC_CHAINCODE || "degreeCC"
    );

    const result = await contract.evaluateTransaction("GetAllRecords");
    const records = JSON.parse(result.toString());
    gateway.disconnect();

    res.json(records);
  } catch (error: any) {
    console.error("getAllLedgerRecords error:", error);
    res.status(500).json({ error: error.message });
  }
};
