import { createClient } from '@supabase/supabase-js';
import { getRequiredEnv } from './env';

const supabaseUrl = getRequiredEnv('SUPABASE_API_URL');
const supabaseServiceKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

// Create a single supabase client for interacting with your database
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

export default supabase;
