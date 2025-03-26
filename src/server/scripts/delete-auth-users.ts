import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables directly
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env' : 'server.env' });

// For debugging
console.log(
  'Environment variables loaded from: ',
  process.env.NODE_ENV === 'production' ? '.env' : 'server.env',
);

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_API_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Found' : 'Not found');
console.log('Supabase Service Role Key:', supabaseServiceKey ? 'Found' : 'Not found');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase URL or Service Role key not found in environment variables');
  console.error('Make sure SUPABASE_API_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  console.error(
    'Available env vars:',
    Object.keys(process.env).filter(key => key.includes('SUPA')),
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteAllUsers() {
  try {
    console.log('🔄 Fetching all users from Supabase Auth...');

    // Get all users from Supabase Auth
    const { data: users, error } = await supabase.auth.admin.listUsers();

    if (error) {
      throw error;
    }

    console.log(`📊 Found ${users.users.length} users in Supabase Auth`);

    // Skip deletion if there are no users
    if (users.users.length === 0) {
      console.log('✅ No users to delete');
      return;
    }

    // Delete each user
    console.log('🗑️ Deleting all users...');

    for (const user of users.users) {
      console.log(`🔄 Deleting user ${user.email} (${user.id})...`);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

      if (deleteError) {
        console.error(
          `❌ Failed to delete user ${user.email} (${user.id}): ${deleteError.message}`,
        );
      }
    }

    console.log('✅ All users deleted successfully');
  } catch (error: any) {
    console.error(`❌ Error deleting users: ${error.message}`);
    process.exit(1);
  }
}

// Run the function
deleteAllUsers()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
