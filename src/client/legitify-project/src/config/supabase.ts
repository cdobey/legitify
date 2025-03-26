import { createClient } from '@supabase/supabase-js';

// Only use environment variables without fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verify that required environment variables are set
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing required Supabase environment variables. Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are properly set in your environment.',
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: window.sessionStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export default supabase;
