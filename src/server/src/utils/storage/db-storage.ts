import prisma from '@/prisma/client';
import { MediaType } from '@prisma/client';

// Get the base URL from env or default to localhost
const BASE_URL = process.env.API_URL || 'http://localhost:3001';

/**
 * Initialize storage - for DB storage this is a no-op but kept for API compatibility
 */
export async function initStorageBuckets(): Promise<boolean> {
  console.log('Database storage initialized (using PostgreSQL BYTEA)');
  return true;
}

/**
 * Upload an issuer logo to the database
 */
export async function uploadIssuerLogo(
  issuerId: string,
  fileBuffer: Buffer,
  fileExt: string,
  mimeType?: string,
): Promise<string | null> {
  try {
    // Delete any existing logo for this issuer
    await prisma.media.deleteMany({
      where: {
        ownerId: issuerId,
        type: MediaType.issuer_logo,
      },
    });

    // Create new media record
    const media = await prisma.media.create({
      data: {
        data: new Uint8Array(fileBuffer),
        mimeType: mimeType || `image/${fileExt}`,
        filename: `logo.${fileExt}`,
        size: fileBuffer.length,
        type: MediaType.issuer_logo,
        ownerId: issuerId,
      },
    });

    // Return URL that serves this media
    return `${BASE_URL}/media/${media.id}`;
  } catch (error) {
    console.error('Error uploading issuer logo to database:', error);
    return null;
  }
}

/**
 * Delete an issuer logo from the database
 */
export async function deleteIssuerLogo(logoUrl: string): Promise<boolean> {
  try {
    if (!logoUrl) return false;

    // Extract media ID from URL
    const mediaId = logoUrl.split('/').pop();
    if (!mediaId) return false;

    await prisma.media.delete({
      where: { id: mediaId },
    });

    return true;
  } catch (error) {
    console.error('Error deleting issuer logo from database:', error);
    return false;
  }
}

/**
 * Upload a profile picture to the database
 */
export async function uploadProfilePicture(
  userId: string,
  fileBuffer: Buffer,
  fileExt: string,
  mimeType?: string,
): Promise<string | null> {
  try {
    // Delete any existing profile picture for this user
    await prisma.media.deleteMany({
      where: {
        ownerId: userId,
        type: MediaType.profile_picture,
      },
    });

    // Create new media record
    const media = await prisma.media.create({
      data: {
        data: new Uint8Array(fileBuffer),
        mimeType: mimeType || `image/${fileExt}`,
        filename: `profile.${fileExt}`,
        size: fileBuffer.length,
        type: MediaType.profile_picture,
        ownerId: userId,
      },
    });

    // Return URL that serves this media
    return `${BASE_URL}/media/${media.id}`;
  } catch (error) {
    console.error('Error uploading profile picture to database:', error);
    return null;
  }
}

/**
 * Delete a profile picture from the database
 */
export async function deleteProfilePicture(profilePictureUrl: string): Promise<boolean> {
  try {
    if (!profilePictureUrl) return false;

    // Extract media ID from URL
    const mediaId = profilePictureUrl.split('/').pop();
    if (!mediaId) return false;

    await prisma.media.delete({
      where: { id: mediaId },
    });

    return true;
  } catch (error) {
    console.error('Error deleting profile picture from database:', error);
    return false;
  }
}

/**
 * Get media by ID - used by the serving endpoint
 */
export async function getMediaById(mediaId: string) {
  try {
    return await prisma.media.findUnique({
      where: { id: mediaId },
    });
  } catch (error) {
    console.error('Error retrieving media from database:', error);
    return null;
  }
}
