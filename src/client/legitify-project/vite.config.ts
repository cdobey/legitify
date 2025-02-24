import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    cors: false,
    origin: "http://localhost:3001",
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          mantine: ["@mantine/core", "@mantine/hooks"],
          query: ["@tanstack/react-query"],
          firebase: ["firebase/app", "firebase/auth"],
        },
      },
    },
    // Improve chunk size optimization
    chunkSizeWarningLimit: 1000,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@mantine/core",
      "@mantine/hooks",
      "@tanstack/react-query",
      "firebase/app",
      "firebase/auth",
    ],
  },
});
