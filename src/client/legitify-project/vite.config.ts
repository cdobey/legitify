import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  console.log(`Building in ${mode} mode`);

  // Load environment variables - Render.com will provide these
  const env = loadEnv(mode, process.cwd(), '');

  // Load client.env file only for local development
  if (mode !== 'production') {
    const clientEnvPath = path.resolve(process.cwd(), 'client.env');
    if (fs.existsSync(clientEnvPath)) {
      console.log('Loading environment from client.env file');
      dotenv.config({ path: clientEnvPath });
    }
  }

  // Determine API URL based on mode (use only environment variable in production)
  const apiUrl = mode === 'production' ? env.VITE_API_URL : 'http://localhost:3001';
  console.log(`API URL: ${apiUrl}`);

  // Check if required env vars are present during build
  if (mode === 'production') {
    const requiredVars = ['VITE_API_URL'];
    const missingVars = requiredVars.filter(varName => !process.env[varName] && !env[varName]);

    if (missingVars.length > 0) {
      console.error(`ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
      throw new Error('Missing required environment variables for production build');
    }
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      cors: false,
      proxy: {
        '/api': {
          changeOrigin: true,
          secure: false,
          target: apiUrl,
          rewrite: path => path.replace(/^\/api/, ''),
        },
      },
    },
    // Define is now empty as we don't need Supabase env vars
    define: {},
    build: {
      // Optimize chunk splitting
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            mantine: ['@mantine/core', '@mantine/hooks'],
            query: ['@tanstack/react-query'],
          },
        },
      },
      // Improve chunk size optimization
      chunkSizeWarningLimit: 1000,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@mantine/core',
        '@mantine/hooks',
        '@tanstack/react-query',
      ],
    },
  };
});
