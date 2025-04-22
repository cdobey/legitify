const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: process.env.NODE_ENV === 'production' ? '.env' : 'server.env' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_API_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_API_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

// Create a Supabase client with the service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    headers: {
      Authorization: `Bearer ${supabaseServiceKey}`,
    },
  },
});

// Bucket names for clearing
const BUCKET_NAMES = ['profile-pictures', 'issuer-logos'];

/**
 * Empty all contents of a bucket without deleting the bucket itself
 */
async function emptyBucketContents(bucketName) {
  try {
    console.log(`Emptying bucket: ${bucketName}...`);

    // Check if the bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    if (!buckets?.find(bucket => bucket.name === bucketName)) {
      console.log(`Bucket ${bucketName} doesn't exist, nothing to empty`);
      return;
    }

    // Function to recursively delete all contents in a path
    const deleteContentsRecursively = async (path = '') => {
      // List all objects at this path
      const { data: objects, error } = await supabase.storage.from(bucketName).list(path);

      if (error) {
        console.log(`Error listing objects at path "${path}": ${error.message}`);
        return;
      }

      if (!objects || objects.length === 0) {
        return;
      }

      // Process folders first (recursively)
      const folders = objects.filter(obj => !obj.metadata?.mimetype);
      for (const folder of folders) {
        const folderPath = path ? `${path}/${folder.name}` : folder.name;
        await deleteContentsRecursively(folderPath);
      }

      // Then delete files at this path
      const files = objects.filter(obj => obj.metadata?.mimetype);
      if (files.length > 0) {
        const filePaths = files.map(file => (path ? `${path}/${file.name}` : file.name));

        const { error: deleteError } = await supabase.storage.from(bucketName).remove(filePaths);

        if (deleteError) {
          console.log(`Error deleting files: ${deleteError.message}`);
        } else {
          console.log(
            `Deleted ${filePaths.length} files from ${bucketName}${path ? '/' + path : ''}`,
          );
        }
      }

      // Delete this folder too if it's not the root
      if (path) {
        const { error: deleteFolderError } = await supabase.storage.from(bucketName).remove([path]);

        if (deleteFolderError && !deleteFolderError.message.includes('Object not found')) {
          console.log(`Error deleting folder "${path}": ${deleteFolderError.message}`);
        }
      }
    };

    // Start the recursive deletion from the root
    await deleteContentsRecursively();
    console.log(`✅ Successfully emptied bucket: ${bucketName}`);

    return true;
  } catch (error) {
    console.error(`Error emptying bucket ${bucketName}: ${error.message}`);
    return false;
  }
}

/**
 * Empty all storage buckets
 */
async function emptyAllBuckets() {
  console.log('🗑️ Emptying all storage buckets...');

  for (const bucketName of BUCKET_NAMES) {
    await emptyBucketContents(bucketName);
  }

  console.log('✅ All storage buckets have been emptied');
}

// Run the function
emptyAllBuckets();
