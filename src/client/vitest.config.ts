import { defineConfig } from 'vitest/config';

import path from 'path';

export default defineConfig({
  test: {
    setupFiles: 'src/setupTests.ts',
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
