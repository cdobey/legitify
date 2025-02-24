export const API_BASE_URL = import.meta.env.PROD
  ? "/api" // Will be handled by proxy in production
  : "/api"; // Will be handled by Vite's proxy in development
