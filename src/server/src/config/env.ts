import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

/**
 * Load environment variables from server.env file only if they're not already set
 * This allows Render.com environment variables to take precedence
 */
export function loadEnvironment(): void {
  const envPath = path.resolve(__dirname, '../../../server.env');

  // Only load from file if it exists and we're not in a deployment environment
  const isDeployment = process.env.IS_DEPLOYMENT === 'true';

  if (!isDeployment && fs.existsSync(envPath)) {
    console.log('Loading environment variables from server.env file');
    const result = dotenv.config({ path: envPath });

    if (result.error) {
      console.warn('Warning: Error loading server.env file:', result.error.message);
    }
  } else {
    console.log('Using environment variables from the system');
  }
}

// Call this function immediately so it loads when this module is imported
loadEnvironment();

// Function to get a required environment variable
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
