import prisma from '@/prisma/client';
import { RequestWithUser } from '@/types/user.types';
import { deleteProfilePicture, uploadProfilePicture } from '@/utils/storage/db-storage';
import { RequestHandler, Response } from 'express';
import multer from 'multer';
import path from 'path';

// Multer configuration for profile pictures
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
 * Upload a profile picture for current user
 */
export const uploadProfilePictureHandler: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = req.user.id;

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    console.log(`Processing profile picture upload for user ${userId}`);
    console.log(`File mimetype: ${req.file.mimetype}, size: ${req.file.size} bytes`);

    // Get the file extension
    const fileExt = path.extname(req.file.originalname).substring(1).toLowerCase();
    if (!fileExt) {
      res.status(400).json({ error: 'Invalid file format' });
      return;
    }

    // Upload the profile picture to storage
    try {
      const pictureUrl = await uploadProfilePicture(userId, req.file.buffer, fileExt, req.file.mimetype);

      if (!pictureUrl) {
        res.status(500).json({ error: 'Failed to upload profile picture' });
        return;
      }

      // Get the current user to check if they already have a profile picture
      const user = await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // If there's an existing profile picture, delete it
      if (user.profilePictureUrl) {
        await deleteProfilePicture(user.profilePictureUrl).catch(err =>
          console.error(`Failed to delete old profile picture: ${err.message}`),
        );
      }

      // Update the user in the database with the profile picture URL
      const updatedUser = await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          profilePictureUrl: pictureUrl,
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          orgName: true,
          profilePictureUrl: true,
          createdAt: true,
          updatedAt: true,
          twoFactorEnabled: true,
        },
      });

      console.log(`Profile picture updated successfully for ${userId}: ${pictureUrl}`);

      res.status(200).json({
        message: 'Profile picture uploaded successfully',
        user: updatedUser,
      });
    } catch (uploadError: any) {
      console.error(`Error uploading profile picture: ${uploadError.message}`);
      res.status(500).json({ error: `Error uploading profile picture: ${uploadError.message}` });
    }
  } catch (error: any) {
    console.error('uploadProfilePicture error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload profile picture' });
  }
};

/**
 * Delete the current user's profile picture
 */
export const deleteProfilePictureHandler: RequestHandler = async (
  req: RequestWithUser,
  res: Response,
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userId = req.user.id;

    // Get the current user
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if the user has a profile picture
    if (!user.profilePictureUrl) {
      res.status(404).json({ error: 'User does not have a profile picture' });
      return;
    }

    // Delete the profile picture from storage
    const deleted = await deleteProfilePicture(user.profilePictureUrl);

    if (!deleted) {
      res.status(500).json({ error: 'Failed to delete profile picture' });
      return;
    }

    // Update the user in the database to remove the profile picture URL
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        profilePictureUrl: null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        orgName: true,
        profilePictureUrl: true,
        createdAt: true,
        updatedAt: true,
        twoFactorEnabled: true,
      },
    });

    res.status(200).json({
      message: 'Profile picture deleted successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('deleteProfilePicture error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete profile picture' });
  }
};
