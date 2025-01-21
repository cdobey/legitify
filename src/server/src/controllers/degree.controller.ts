import { Request, Response } from "express";

import crypto from "crypto";
import prisma from "../prisma/client";
import { v4 as uuidv4 } from "uuid";

function sha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Example: Issue Degree
export const issueDegree = async (req: Request, res: Response) => {
  try {
    if (req.user?.role !== "university") {
      return res
        .status(403)
        .json({ error: "Only university can issue degrees" });
    }

    const { individualId, base64File } = req.body;
    if (!individualId || !base64File) {
      return res
        .status(400)
        .json({ error: "Missing individualId or base64File" });
    }

    const fileData = Buffer.from(base64File, "base64");
    const docHash = sha256(fileData);
    const docId = uuidv4();

    // Store document in DB
    const newDocument = await prisma.document.create({
      data: {
        id: docId,
        issuedTo: individualId,
        issuer: req.user.userId,
        docHash,
        fileData,
        status: "issued",
      },
    });

    // TODO: Interact with Chaincode if necessary

    return res.status(201).json({ message: "Degree issued", docId });
  } catch (error: any) {
    console.error("issueDegree error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Similar refactoring applies to acceptDegree, denyDegree, requestAccess, grantAccess, viewDegree
