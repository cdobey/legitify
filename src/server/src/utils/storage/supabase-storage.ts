import supabase from '@/config/supabase';
import { randomUUID } from 'crypto';

// Bucket name for university logos
const UNIVERSITY_LOGOS_BUCKET = 'university-logos';

// Initialize the storage bucket if it doesn't exist yet
export async function initStorageBuckets() {
  try {
    // Check if the bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error checking storage buckets:', listError);
      return false;
    }

    // Create the bucket if it doesn't exist
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

    // Upload the file to Supabase Storage
    const { error } = await supabase.storage
      .from(UNIVERSITY_LOGOS_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: `image/${fileExt}`,
        upsert: true, // Overwrite if exists
      });

    if (error) {
      console.error('Error uploading logo:', error);
      return null;
    }

    // Get the public URL for the uploaded file
    const { data } = supabase.storage.from(UNIVERSITY_LOGOS_BUCKET).getPublicUrl(filePath);

    return data.publicUrl;
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
