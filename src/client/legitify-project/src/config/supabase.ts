// This file is kept for compatibility reasons, but should eventually be removed.
// All database interactions should now go through the server API.

// Export a dummy object for compatibility with any existing imports
const supabase = {
  // Placeholder methods
  auth: {
    getSession: async () => ({ data: { session: null } }),
    signOut: async () => {},
  },
};

export default supabase;
