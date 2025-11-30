import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load environment variables for local development
  const env = loadEnv(mode, process.cwd(), '');

  // Load client.env file only for local development
  if (mode !== 'production') {
    const clientEnvPath = path.resolve(process.cwd(), 'client.env');
    if (fs.existsSync(clientEnvPath)) {
      dotenv.config({ path: clientEnvPath });
    }
  }

  // Determine API URL based on mode
  // In production, the app uses runtime configuration (window.ENV_CONFIG)
  // In development, use environment variable or default to localhost
  const apiUrl = mode === 'production' ? (env.VITE_API_URL || '/api') : 'http://localhost:3001';

  // Note: We no longer require VITE_API_URL at build time
  // The app now uses runtime environment variables via docker-entrypoint.sh

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
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
