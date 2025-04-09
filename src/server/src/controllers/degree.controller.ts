import '@/config/env';
import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import {
  getUserInfo,
  processDegreeFile,
  submitFabricTransaction,
  validateUserRole,
} from '@/utils/degree-utils';
import { RequestHandler, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

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
export const issueDegree: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    validateUserRole(req.user, 'university');

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
        ownerId: req.user.id,
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
      req.user.id,
      req.user.orgName || '',
      'IssueDegree',
      docId,
      docHash,
      individual.id,
      req.user.id,
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
        issuer: req.user.id,
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
export const acceptDegree: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

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
    if (!doc || doc.issuedTo !== userInfo.id) {
      res.status(404).json({ error: 'Document not found or not owned by you' });
      return;
    }

    // Update Fabric ledger
    await submitFabricTransaction(userInfo.id, userInfo.orgName, 'AcceptDegree', docId);

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
export const denyDegree: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

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
    if (!doc || doc.issuedTo !== userInfo.id) {
      res.status(404).json({ error: 'Document not found or not owned by you' });
      return;
    }

    // Update Fabric ledger
    await submitFabricTransaction(userInfo.id, userInfo.orgName, 'DenyDegree', docId);

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
