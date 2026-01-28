// Runtime environment configuration utility
// This provides a consistent way to access environment variables
// that can be set at runtime (in Docker) or build time (in development)

interface EnvConfig {
  VITE_API_URL: string;
}

// Extend window interface to include our runtime config
declare global {
  interface Window {
    ENV_CONFIG?: EnvConfig;
  }
}

/**
 * Get environment configuration value
 * Priority: window.ENV_CONFIG (runtime) > import.meta.env (build time) > default
 */
export const getEnvConfig = () => {
  const runtimeConfig = window.ENV_CONFIG;
  
  return {
    VITE_API_URL: runtimeConfig?.VITE_API_URL || import.meta.env.VITE_API_URL || '/api',
  };
};

export default getEnvConfig;
