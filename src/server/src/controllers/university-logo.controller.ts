import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { deleteUniversityLogo, uploadUniversityLogo } from '@/utils/storage/supabase-storage';
import { RequestHandler, Response } from 'express';
import multer from 'multer';
import path from 'path';

// Simple multer configuration
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (_req, file, callback) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
}).single('file');

/**
 * Upload a logo for a university
 */
export const uploadLogo: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // Only university owners can upload logos
    if (req.user?.role !== 'university') {
      res.status(403).json({ error: 'Only university users can upload university logos' });
      return;
    }

    const { universityId } = req.params;
    if (!universityId) {
      res.status(400).json({ error: 'University ID is required' });
      return;
    }

    // Check if this user owns the university
    const university = await prisma.university.findUnique({
      where: {
        id: universityId,
      },
    });

    if (!university) {
      res.status(404).json({ error: 'University not found' });
      return;
    }

    if (university.ownerId !== req.user.id) {
      res.status(403).json({ error: 'You do not have permission to update this university' });
      return;
    }

    if (!req.file) {
      console.log('No file in request');
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Get the file extension
    const fileExt = path.extname(req.file.originalname).substring(1).toLowerCase();

    // Upload the logo to storage
    const logoUrl = await uploadUniversityLogo(universityId, req.file.buffer, fileExt);

    if (!logoUrl) {
      res.status(500).json({ error: 'Failed to upload logo' });
      return;
    }

    // If there's an existing logo, delete it
    if (university.logoUrl) {
      await deleteUniversityLogo(university.logoUrl);
    }

    // Update the university in the database with the logo URL
    const updatedUniversity = await prisma.university.update({
      where: {
        id: universityId,
      },
      data: {
        logoUrl,
      },
    });

    res.status(200).json({
      message: 'Logo uploaded successfully',
      university: updatedUniversity,
    });
  } catch (error: any) {
    console.error('uploadLogo error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a university logo
 */
export const deleteLogo: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // Only university owners can delete logos
    if (req.user?.role !== 'university') {
      res.status(403).json({ error: 'Only university users can delete university logos' });
      return;
    }

    const { universityId } = req.params;
    if (!universityId) {
      res.status(400).json({ error: 'University ID is required' });
      return;
    }

    // Check if this user owns the university
    const university = await prisma.university.findUnique({
      where: {
        id: universityId,
      },
    });

    if (!university) {
      res.status(404).json({ error: 'University not found' });
      return;
    }

    if (university.ownerId !== req.user.id) {
      res.status(403).json({ error: 'You do not have permission to update this university' });
      return;
    }

    // Check if the university has a logo
    if (!university.logoUrl) {
      res.status(404).json({ error: 'University does not have a logo' });
      return;
    }

    // Delete the logo from storage
    const deleted = await deleteUniversityLogo(university.logoUrl);

    if (!deleted) {
      res.status(500).json({ error: 'Failed to delete logo' });
      return;
    }

    // Update the university in the database to remove the logo URL
    const updatedUniversity = await prisma.university.update({
      where: {
        id: universityId,
      },
      data: {
        logoUrl: null,
      },
    });

    res.status(200).json({
      message: 'Logo deleted successfully',
      university: updatedUniversity,
    });
  } catch (error: any) {
    console.error('deleteLogo error:', error);
    res.status(500).json({ error: error.message });
  }
};
