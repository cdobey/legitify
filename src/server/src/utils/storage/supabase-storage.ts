import supabase from '@/config/supabase';
import { randomUUID } from 'crypto';

// Bucket names for storage
const UNIVERSITY_LOGOS_BUCKET = 'university-logos';
const PROFILE_PICTURES_BUCKET = 'profile-pictures';

// Initialize the storage bucket if it doesn't exist yet
export async function initStorageBuckets() {
  try {
    // Check if the buckets exist
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error checking storage buckets:', listError);
      return false;
    }

    // Create the university logos bucket if it doesn't exist
    if (!buckets?.find(bucket => bucket.name === UNIVERSITY_LOGOS_BUCKET)) {
      const { error: createError } = await supabase.storage.createBucket(UNIVERSITY_LOGOS_BUCKET, {
        public: true, // Make the bucket public so logos can be accessed without authentication
        fileSizeLimit: 2 * 1024 * 1024, // 2MB limit for logo files
      });

      if (createError) {
        console.error('Error creating university logos bucket:', createError);
        return false;
      }

      console.log(`Created storage bucket: ${UNIVERSITY_LOGOS_BUCKET}`);
    }

    // Create the profile pictures bucket if it doesn't exist
    if (!buckets?.find(bucket => bucket.name === PROFILE_PICTURES_BUCKET)) {
      const { error: createError } = await supabase.storage.createBucket(PROFILE_PICTURES_BUCKET, {
        public: true, // Make the bucket public so profile pictures can be accessed without authentication
        fileSizeLimit: 2 * 1024 * 1024, // 2MB limit for profile pictures
      });

      if (createError) {
        console.error('Error creating profile pictures bucket:', createError);
        return false;
      }

      console.log(`Created storage bucket: ${PROFILE_PICTURES_BUCKET}`);
    }

    return true;
  } catch (error) {
    console.error('Error initializing storage buckets:', error);
    return false;
  }
}

// Upload a university logo file
export async function uploadUniversityLogo(
  universityId: string,
  fileBuffer: Buffer,
  fileExt: string,
): Promise<string | null> {
  try {
    // Generate a unique filename
    const filename = `${universityId}-${randomUUID()}.${fileExt}`;
    const filePath = `${universityId}/${filename}`;

    console.log(`Attempting to upload file to ${UNIVERSITY_LOGOS_BUCKET}/${filePath}`);

    // Upload the file to Supabase Storage with explicit content type
    const { data, error } = await supabase.storage
      .from(UNIVERSITY_LOGOS_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: `image/${fileExt}`,
        upsert: true, // Overwrite if exists
        cacheControl: '3600',
      });

    if (error) {
      console.error('Error uploading logo:', error);
      throw new Error(`Failed to upload logo: ${error.message}`);
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage.from(UNIVERSITY_LOGOS_BUCKET).getPublicUrl(filePath);

    console.log(`Successfully uploaded to ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadUniversityLogo:', error);
    return null;
  }
}

// Delete a university logo from storage
export async function deleteUniversityLogo(logoUrl: string): Promise<boolean> {
  try {
    // Extract the path from the URL
    const urlObj = new URL(logoUrl);
    const pathMatch = urlObj.pathname.match(
      /\/storage\/v1\/object\/public\/university-logos\/(.+)/,
    );

    if (!pathMatch || !pathMatch[1]) {
      console.error('Could not extract path from logo URL:', logoUrl);
      return false;
    }

    const filePath = pathMatch[1];

    // Delete the file
    const { error } = await supabase.storage.from(UNIVERSITY_LOGOS_BUCKET).remove([filePath]);

    if (error) {
      console.error('Error deleting logo:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteUniversityLogo:', error);
    return false;
  }
}

// Upload a user profile picture
export async function uploadProfilePicture(
  userId: string,
  fileBuffer: Buffer,
  fileExt: string,
): Promise<string | null> {
  try {
    // Generate a unique filename
    const filename = `${userId}-${randomUUID()}.${fileExt}`;
    const filePath = `${userId}/${filename}`;

    console.log(`Attempting to upload profile picture to ${PROFILE_PICTURES_BUCKET}/${filePath}`);

    // Upload the file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(PROFILE_PICTURES_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: `image/${fileExt}`,
        upsert: true, // Overwrite if exists
        cacheControl: '3600',
      });

    if (error) {
      console.error('Error uploading profile picture:', error);
      throw new Error(`Failed to upload profile picture: ${error.message}`);
    }

    // Get the public URL for the uploaded file
    const { data: urlData } = supabase.storage.from(PROFILE_PICTURES_BUCKET).getPublicUrl(filePath);

    console.log(`Successfully uploaded profile picture to ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadProfilePicture:', error);
    return null;
  }
}

// Delete a profile picture from storage
export async function deleteProfilePicture(profilePictureUrl: string): Promise<boolean> {
  try {
    // Extract the path from the URL
    const urlObj = new URL(profilePictureUrl);
    const pathMatch = urlObj.pathname.match(
      /\/storage\/v1\/object\/public\/profile-pictures\/(.+)/,
    );

    if (!pathMatch || !pathMatch[1]) {
      console.error('Could not extract path from profile picture URL:', profilePictureUrl);
      return false;
    }

    const filePath = pathMatch[1];

    // Delete the file
    const { error } = await supabase.storage.from(PROFILE_PICTURES_BUCKET).remove([filePath]);

    if (error) {
      console.error('Error deleting profile picture:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteProfilePicture:', error);
    return false;
  }
}
