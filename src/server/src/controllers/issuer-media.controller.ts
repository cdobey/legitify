import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { deleteIssuerLogo, uploadIssuerLogo } from '@/utils/storage/db-storage';
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
 * Upload a logo for an issuer
 */
export const uploadLogo: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // Only issuer users can upload logos
    if (req.user?.role !== 'issuer') {
      res.status(403).json({ error: 'Only issuer users can upload issuer logos' });
      return;
    }

    const issuerId = req.params.issuerId as string;
    if (!issuerId) {
      res.status(400).json({ error: 'Issuer ID is required' });
      return;
    }

    // Check if this user owns the issuer
    const issuer = await prisma.issuer.findUnique({
      where: {
        id: issuerId,
      },
    });

    if (!issuer) {
      res.status(404).json({ error: 'Issuer not found' });
      return;
    }

    if (issuer.ownerId !== req.user.id) {
      res.status(403).json({ error: 'You do not have permission to update this issuer' });
      return;
    }

    if (!req.file) {
      console.log('No file in request');
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    console.log(`Processing issuer logo upload for issuer ${issuerId}`);
    console.log(`File mimetype: ${req.file.mimetype}, size: ${req.file.size} bytes`);

    // Get the file extension
    const fileExt = path.extname(req.file.originalname).substring(1).toLowerCase();
    if (!fileExt) {
      res.status(400).json({ error: 'Invalid file format' });
      return;
    }

    // Upload the logo to storage
    try {
      const logoUrl = await uploadIssuerLogo(issuerId, req.file.buffer, fileExt, req.file.mimetype);

      if (!logoUrl) {
        res.status(500).json({ error: 'Failed to upload logo' });
        return;
      }

      // If there's an existing logo, delete it
      if (issuer.logoUrl) {
        await deleteIssuerLogo(issuer.logoUrl).catch(err =>
          console.error(`Failed to delete old logo: ${err.message}`),
        );
      }

      // Update the issuer in the database with the logo URL
      const updatedIssuer = await prisma.issuer.update({
        where: {
          id: issuerId,
        },
        data: {
          logoUrl,
        },
      });

      console.log(`Logo updated successfully for issuer ${issuerId}: ${logoUrl}`);

      res.status(200).json({
        message: 'Logo uploaded successfully',
        issuer: updatedIssuer,
      });
    } catch (uploadError: any) {
      console.error(`Error uploading issuer logo: ${uploadError.message}`);
      res.status(500).json({ error: `Error uploading logo: ${uploadError.message}` });
    }
  } catch (error: any) {
    console.error('uploadLogo error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload logo' });
  }
};

/**
 * Delete an issuer logo
 */
export const deleteLogo: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // Only issuer owners can delete logos
    if (req.user?.role !== 'issuer') {
      res.status(403).json({ error: 'Only issuer users can delete issuer logos' });
      return;
    }

    const issuerId = req.params.issuerId as string;
    if (!issuerId) {
      res.status(400).json({ error: 'Issuer ID is required' });
      return;
    }

    // Check if this user owns the issuer
    const issuer = await prisma.issuer.findUnique({
      where: {
        id: issuerId,
      },
    });

    if (!issuer) {
      res.status(404).json({ error: 'Issuer not found' });
      return;
    }

    if (issuer.ownerId !== req.user.id) {
      res.status(403).json({ error: 'You do not have permission to update this issuer' });
      return;
    }

    // Check if the issuer has a logo
    if (!issuer.logoUrl) {
      res.status(404).json({ error: 'Issuer does not have a logo' });
      return;
    }

    // Delete the logo from storage
    try {
      const deleted = await deleteIssuerLogo(issuer.logoUrl);

      if (!deleted) {
        res.status(500).json({ error: 'Failed to delete logo' });
        return;
      }

      // Update the issuer in the database to remove the logo URL
      const updatedIssuer = await prisma.issuer.update({
        where: {
          id: issuerId,
        },
        data: {
          logoUrl: null,
        },
      });

      console.log(`Logo deleted successfully for issuer ${issuerId}`);

      res.status(200).json({
        message: 'Logo deleted successfully',
        issuer: updatedIssuer,
      });
    } catch (deleteError: any) {
      console.error(`Error deleting issuer logo: ${deleteError.message}`);
      res.status(500).json({ error: `Error deleting logo: ${deleteError.message}` });
    }
  } catch (error: any) {
    console.error('deleteLogo error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete logo' });
  }
};
