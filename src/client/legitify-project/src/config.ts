// API base URL - use environment variable if available, otherwise fallback to localhost
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

// Add other configuration constants here as needed
export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // Add other Firebase config properties as needed
};
