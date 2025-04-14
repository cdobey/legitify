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
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Sets up RLS policies for storage buckets
 */
async function setupStoragePolicies() {
  try {
    console.log('🔒 Setting up storage bucket policies...');

    // List all existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    console.log(`Found ${buckets.length} storage bucket(s)`);

    // For each bucket, ensure it's configured correctly
    for (const bucket of buckets) {
      console.log(`Configuring bucket: ${bucket.name}...`);

      // Make sure the buckets are properly configured for public access
      // Profile pictures and university logos should be public
      const isPublic = bucket.name === 'university-logos' || bucket.name === 'profile-pictures';

      try {
        // Update the bucket configuration
        const { error } = await supabase.storage.updateBucket(bucket.name, {
          public: isPublic,
          fileSizeLimit: 2 * 1024 * 1024, // 2MB limit
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
        });

        if (error) {
          console.warn(`  Warning updating bucket ${bucket.name}: ${error.message}`);
        } else {
          console.log(`  ✅ Updated bucket configuration: ${bucket.name} (Public: ${isPublic})`);
        }
      } catch (error) {
        console.warn(`  Failed to update bucket ${bucket.name}: ${error.message}`);
      }

      // Disable all bucket policies to start fresh
      try {
        const { data: policies } = await supabase
          .rpc('get_policies', {
            table_name: 'objects',
            schema_name: 'storage',
          })
          .maybeThrow();

        if (policies && Array.isArray(policies)) {
          for (const policy of policies) {
            if (policy.name && policy.name.includes(bucket.name)) {
              await supabase.rpc('drop_policy', {
                policy_name: policy.name,
                table_name: 'objects',
                schema_name: 'storage',
              });
              console.log(`  Dropped policy: ${policy.name}`);
            }
          }
        }
      } catch (error) {
        console.log(`  Note: Could not drop existing policies. This is normal if none exist.`);
      }

      // Create download (SELECT) policy for this bucket
      try {
        await supabase.rpc('create_policy', {
          name: `${bucket.name}_download_policy`,
          table_name: 'objects',
          schema_name: 'storage',
          operation: 'SELECT',
          definition: `bucket_id = '${bucket.name}'`,
          check: '',
          for_role: 'authenticated',
        });
        console.log(`  ✅ Created download policy for ${bucket.name}`);
      } catch (error) {
        console.log(`  Note: Could not create download policy. May already exist.`);
      }

      // Create upload (INSERT) policy for this bucket
      try {
        await supabase.rpc('create_policy', {
          name: `${bucket.name}_upload_policy`,
          table_name: 'objects',
          schema_name: 'storage',
          operation: 'INSERT',
          definition: `bucket_id = '${bucket.name}'`,
          check: `bucket_id = '${bucket.name}'`,
          for_role: 'authenticated',
        });
        console.log(`  ✅ Created upload policy for ${bucket.name}`);
      } catch (error) {
        console.log(`  Note: Could not create upload policy. May already exist.`);
      }

      // Create update policy for this bucket
      try {
        await supabase.rpc('create_policy', {
          name: `${bucket.name}_update_policy`,
          table_name: 'objects',
          schema_name: 'storage',
          operation: 'UPDATE',
          definition: `bucket_id = '${bucket.name}'`,
          check: `bucket_id = '${bucket.name}'`,
          for_role: 'authenticated',
        });
        console.log(`  ✅ Created update policy for ${bucket.name}`);
      } catch (error) {
        console.log(`  Note: Could not create update policy. May already exist.`);
      }

      // Create delete policy for this bucket
      try {
        await supabase.rpc('create_policy', {
          name: `${bucket.name}_delete_policy`,
          table_name: 'objects',
          schema_name: 'storage',
          operation: 'DELETE',
          definition: `bucket_id = '${bucket.name}'`,
          for_role: 'authenticated',
        });
        console.log(`  ✅ Created delete policy for ${bucket.name}`);
      } catch (error) {
        console.log(`  Note: Could not create delete policy. May already exist.`);
      }

      // Make sure RLS is enabled
      try {
        await supabase.rpc('set_table_rls', {
          table_name: 'objects',
          schema_name: 'storage',
          enable: true,
        });
        console.log(`  ✅ Enabled RLS for storage.objects table`);
      } catch (error) {
        console.log(`  Note: Could not enable RLS. May already be enabled.`);
      }
    }

    console.log(`\n✅ Storage bucket policies configured successfully!`);
    console.log(`You can now upload files to the buckets.`);
  } catch (error) {
    console.error(`\n❌ Error setting up storage policies:`, error.message);
    process.exit(1);
  }
}

setupStoragePolicies();
