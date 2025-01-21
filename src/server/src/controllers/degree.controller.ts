import { Request, RequestHandler, Response } from "express";

import crypto from "crypto";
import { getGateway } from "../config/gateway";
import prisma from "../prisma/client";
import { v4 as uuidv4 } from "uuid";

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
    if (!individualId || !base64File) {
      res.status(400).json({ error: "Missing individualId or base64File" });
      return;
    }

    // Verify that the individual exists
    const individual = await prisma.user.findUnique({
      where: { id: individualId },
    });
    if (!individual || individual.role !== "individual") {
      res.status(400).json({ error: "Invalid individualId" });
      return;
    }

    const fileData = Buffer.from(base64File, "base64");
    const docHash = sha256(fileData);
    const docId = uuidv4();

    // Interact with ledger first
    const gateway = await getGateway(req.user.sub, req.user.orgName);
    const network = await gateway.getNetwork("mychannel");
    const contract = network.getContract("degreeCC"); // Chaincode name

    await contract.submitTransaction(
      "IssueDegree",
      docId,
      docHash,
      individualId
    );
    gateway.disconnect();

    // Store doc in DB
    const newDocument = await prisma.document.create({
      data: {
        id: docId,
        issuedTo: individualId,
        issuer: req.user.sub,
        docHash,
        fileData,
        status: "issued",
      },
    });

    res.status(201).json({ message: "Degree issued", docId: newDocument.id });
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
    if (!doc || doc.issuedTo !== req.user.sub) {
      res.status(404).json({ error: "Document not found or not owned by you" });
      return;
    }

    // Interact with ledger
    const gateway = await getGateway(req.user.sub, req.user.orgName);
    const network = await gateway.getNetwork("mychannel");
    const contract = network.getContract("degreeCC");

    await contract.submitTransaction("AcceptDegree", docId);
    gateway.disconnect();

    // Update DB status
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
    if (!doc || doc.issuedTo !== req.user.sub) {
      res.status(404).json({ error: "Document not found or not owned by you" });
      return;
    }

    // Interact with ledger
    const gateway = await getGateway(req.user.sub, req.user.orgName);
    const network = await gateway.getNetwork("mychannel");
    const contract = network.getContract("degreeCC");

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
        requesterId: req.user.sub,
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
    if (accessRequest.document.issuedTo !== req.user.sub) {
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
        requesterId: req.user.sub,
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

    // Verify hash with ledger
    const gateway = await getGateway(req.user.sub, req.user.orgName);
    const network = await gateway.getNetwork("mychannel");
    const contract = network.getContract("degreeCC");

    const result = await contract.evaluateTransaction(
      "VerifyHash",
      docId,
      doc.docHash
    );
    const isVerified = result.toString() === "true";
    gateway.disconnect();

    res.json({
      docId: doc.id,
      verified: isVerified,
      docHash: doc.docHash,
      fileData: doc.fileData ? doc.fileData.toString() : null,
      status: doc.status,
    });
  } catch (error: any) {
    console.error("viewDegree error:", error);
    res.status(500).json({ error: error.message });
  }
};
