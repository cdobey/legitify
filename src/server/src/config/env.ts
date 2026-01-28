import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

/**
 * Load environment variables from server.env file
 * Production environment variables (set in Coolify) take precedence
 */
export function loadEnvironment(): void {
  // Try multiple possible locations for server.env
  const possiblePaths = [
    path.resolve(__dirname, '../../../server.env'), // From /src/config to /server.env
    path.resolve(process.cwd(), 'server.env'), // From current working directory
  ];

  // Only load from file if it exists and we're not in a deployment environment
  const isDeployment = process.env.IS_DEPLOYMENT === 'true';

  if (!isDeployment) {
    // Try each possible path
    for (const envPath of possiblePaths) {
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        break;
      }
    }
  }
}

// Load environment variables when this module is imported
loadEnvironment();

/**
 * Get a required environment variable or throw an error
 */
export function getRequiredEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}
