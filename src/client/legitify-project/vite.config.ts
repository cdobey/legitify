import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load standard env files first
  const env = loadEnv(mode, process.cwd(), '');

  // Load client-specific env file
  const clientEnvPath = path.resolve(process.cwd(), 'client.env');
  if (fs.existsSync(clientEnvPath)) {
    const clientEnv = dotenv.parse(fs.readFileSync(clientEnvPath));
    // Add client env variables to process.env
    Object.keys(clientEnv).forEach(key => {
      process.env[key] = clientEnv[key];
      // Also add to import.meta.env for Vite
      if (key.startsWith('VITE_')) {
        env[key] = clientEnv[key];
      }
    });
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
          target: 'http://localhost:3001',
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
            supabase: ['@supabase/supabase-js'],
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
        '@supabase/supabase-js',
      ],
    },
  };
});
