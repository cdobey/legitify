// vite.config.ts
import react from "file:///mnt/c/Users/35386/Documents/4thYearProject/Gitlab/2025-csc1097-mannp2-dobeyc3/src/client/legitify-project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import dotenv from "file:///mnt/c/Users/35386/Documents/4thYearProject/Gitlab/2025-csc1097-mannp2-dobeyc3/src/client/legitify-project/node_modules/dotenv/lib/main.js";
import fs from "fs";
import path from "path";
import { defineConfig, loadEnv } from "file:///mnt/c/Users/35386/Documents/4thYearProject/Gitlab/2025-csc1097-mannp2-dobeyc3/src/client/legitify-project/node_modules/vite/dist/node/index.js";
var vite_config_default = defineConfig(({ mode }) => {
  console.log(`Building in ${mode} mode`);
  const env = loadEnv(mode, process.cwd(), "");
  if (mode !== "production") {
    const clientEnvPath = path.resolve(process.cwd(), "client.env");
    if (fs.existsSync(clientEnvPath)) {
      console.log("Loading environment from client.env file");
      dotenv.config({ path: clientEnvPath });
    }
  }
  const apiUrl = mode === "production" ? env.VITE_API_URL : "http://localhost:3001";
  console.log(`API URL: ${apiUrl}`);
  if (mode === "production") {
    const requiredVars = ["VITE_API_URL"];
    const missingVars = requiredVars.filter((varName) => !process.env[varName] && !env[varName]);
    if (missingVars.length > 0) {
      console.error(`ERROR: Missing required environment variables: ${missingVars.join(", ")}`);
      throw new Error("Missing required environment variables for production build");
    }
  }
  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      cors: false,
      proxy: {
        "/api": {
          changeOrigin: true,
          secure: false,
          target: apiUrl,
          rewrite: (path2) => path2.replace(/^\/api/, "")
        }
      }
    },
    // Define is now empty as we don't need Supabase env vars
    define: {},
    build: {
      // Optimize chunk splitting
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            mantine: ["@mantine/core", "@mantine/hooks"],
            query: ["@tanstack/react-query"]
          }
        }
      },
      // Improve chunk size optimization
      chunkSizeWarningLimit: 1e3,
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        }
      }
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@mantine/core",
        "@mantine/hooks",
        "@tanstack/react-query"
      ]
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvbW50L2MvVXNlcnMvMzUzODYvRG9jdW1lbnRzLzR0aFllYXJQcm9qZWN0L0dpdGxhYi8yMDI1LWNzYzEwOTctbWFubnAyLWRvYmV5YzMvc3JjL2NsaWVudC9sZWdpdGlmeS1wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvbW50L2MvVXNlcnMvMzUzODYvRG9jdW1lbnRzLzR0aFllYXJQcm9qZWN0L0dpdGxhYi8yMDI1LWNzYzEwOTctbWFubnAyLWRvYmV5YzMvc3JjL2NsaWVudC9sZWdpdGlmeS1wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9tbnQvYy9Vc2Vycy8zNTM4Ni9Eb2N1bWVudHMvNHRoWWVhclByb2plY3QvR2l0bGFiLzIwMjUtY3NjMTA5Ny1tYW5ucDItZG9iZXljMy9zcmMvY2xpZW50L2xlZ2l0aWZ5LXByb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IGRvdGVudiBmcm9tICdkb3RlbnYnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgY29uc29sZS5sb2coYEJ1aWxkaW5nIGluICR7bW9kZX0gbW9kZWApO1xuXG4gIC8vIExvYWQgZW52aXJvbm1lbnQgdmFyaWFibGVzIC0gUmVuZGVyLmNvbSB3aWxsIHByb3ZpZGUgdGhlc2VcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJyk7XG5cbiAgLy8gTG9hZCBjbGllbnQuZW52IGZpbGUgb25seSBmb3IgbG9jYWwgZGV2ZWxvcG1lbnRcbiAgaWYgKG1vZGUgIT09ICdwcm9kdWN0aW9uJykge1xuICAgIGNvbnN0IGNsaWVudEVudlBhdGggPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ2NsaWVudC5lbnYnKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhjbGllbnRFbnZQYXRoKSkge1xuICAgICAgY29uc29sZS5sb2coJ0xvYWRpbmcgZW52aXJvbm1lbnQgZnJvbSBjbGllbnQuZW52IGZpbGUnKTtcbiAgICAgIGRvdGVudi5jb25maWcoeyBwYXRoOiBjbGllbnRFbnZQYXRoIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIERldGVybWluZSBBUEkgVVJMIGJhc2VkIG9uIG1vZGUgKHVzZSBvbmx5IGVudmlyb25tZW50IHZhcmlhYmxlIGluIHByb2R1Y3Rpb24pXG4gIGNvbnN0IGFwaVVybCA9IG1vZGUgPT09ICdwcm9kdWN0aW9uJyA/IGVudi5WSVRFX0FQSV9VUkwgOiAnaHR0cDovL2xvY2FsaG9zdDozMDAxJztcbiAgY29uc29sZS5sb2coYEFQSSBVUkw6ICR7YXBpVXJsfWApO1xuXG4gIC8vIENoZWNrIGlmIHJlcXVpcmVkIGVudiB2YXJzIGFyZSBwcmVzZW50IGR1cmluZyBidWlsZFxuICBpZiAobW9kZSA9PT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgY29uc3QgcmVxdWlyZWRWYXJzID0gWydWSVRFX0FQSV9VUkwnXTtcbiAgICBjb25zdCBtaXNzaW5nVmFycyA9IHJlcXVpcmVkVmFycy5maWx0ZXIodmFyTmFtZSA9PiAhcHJvY2Vzcy5lbnZbdmFyTmFtZV0gJiYgIWVudlt2YXJOYW1lXSk7XG5cbiAgICBpZiAobWlzc2luZ1ZhcnMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc29sZS5lcnJvcihgRVJST1I6IE1pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGVzOiAke21pc3NpbmdWYXJzLmpvaW4oJywgJyl9YCk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgcmVxdWlyZWQgZW52aXJvbm1lbnQgdmFyaWFibGVzIGZvciBwcm9kdWN0aW9uIGJ1aWxkJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gICAgc2VydmVyOiB7XG4gICAgICBwb3J0OiA1MTczLFxuICAgICAgaG9zdDogdHJ1ZSxcbiAgICAgIGNvcnM6IGZhbHNlLFxuICAgICAgcHJveHk6IHtcbiAgICAgICAgJy9hcGknOiB7XG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgICAgdGFyZ2V0OiBhcGlVcmwsXG4gICAgICAgICAgcmV3cml0ZTogcGF0aCA9PiBwYXRoLnJlcGxhY2UoL15cXC9hcGkvLCAnJyksXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgLy8gRGVmaW5lIGlzIG5vdyBlbXB0eSBhcyB3ZSBkb24ndCBuZWVkIFN1cGFiYXNlIGVudiB2YXJzXG4gICAgZGVmaW5lOiB7fSxcbiAgICBidWlsZDoge1xuICAgICAgLy8gT3B0aW1pemUgY2h1bmsgc3BsaXR0aW5nXG4gICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgIG91dHB1dDoge1xuICAgICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgICAgJ3JlYWN0LXZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICAgICAgICAgIG1hbnRpbmU6IFsnQG1hbnRpbmUvY29yZScsICdAbWFudGluZS9ob29rcyddLFxuICAgICAgICAgICAgcXVlcnk6IFsnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5J10sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICAvLyBJbXByb3ZlIGNodW5rIHNpemUgb3B0aW1pemF0aW9uXG4gICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXG4gICAgICBtaW5pZnk6ICd0ZXJzZXInLFxuICAgICAgdGVyc2VyT3B0aW9uczoge1xuICAgICAgICBjb21wcmVzczoge1xuICAgICAgICAgIGRyb3BfY29uc29sZTogdHJ1ZSxcbiAgICAgICAgICBkcm9wX2RlYnVnZ2VyOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgaW5jbHVkZTogW1xuICAgICAgICAncmVhY3QnLFxuICAgICAgICAncmVhY3QtZG9tJyxcbiAgICAgICAgJ3JlYWN0LXJvdXRlci1kb20nLFxuICAgICAgICAnQG1hbnRpbmUvY29yZScsXG4gICAgICAgICdAbWFudGluZS9ob29rcycsXG4gICAgICAgICdAdGFuc3RhY2svcmVhY3QtcXVlcnknLFxuICAgICAgXSxcbiAgICB9LFxuICB9O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWdmLE9BQU8sV0FBVztBQUNsZ0IsT0FBTyxZQUFZO0FBQ25CLE9BQU8sUUFBUTtBQUNmLE9BQU8sVUFBVTtBQUNqQixTQUFTLGNBQWMsZUFBZTtBQUV0QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxVQUFRLElBQUksZUFBZSxJQUFJLE9BQU87QUFHdEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBRzNDLE1BQUksU0FBUyxjQUFjO0FBQ3pCLFVBQU0sZ0JBQWdCLEtBQUssUUFBUSxRQUFRLElBQUksR0FBRyxZQUFZO0FBQzlELFFBQUksR0FBRyxXQUFXLGFBQWEsR0FBRztBQUNoQyxjQUFRLElBQUksMENBQTBDO0FBQ3RELGFBQU8sT0FBTyxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQUEsSUFDdkM7QUFBQSxFQUNGO0FBR0EsUUFBTSxTQUFTLFNBQVMsZUFBZSxJQUFJLGVBQWU7QUFDMUQsVUFBUSxJQUFJLFlBQVksTUFBTSxFQUFFO0FBR2hDLE1BQUksU0FBUyxjQUFjO0FBQ3pCLFVBQU0sZUFBZSxDQUFDLGNBQWM7QUFDcEMsVUFBTSxjQUFjLGFBQWEsT0FBTyxhQUFXLENBQUMsUUFBUSxJQUFJLE9BQU8sS0FBSyxDQUFDLElBQUksT0FBTyxDQUFDO0FBRXpGLFFBQUksWUFBWSxTQUFTLEdBQUc7QUFDMUIsY0FBUSxNQUFNLGtEQUFrRCxZQUFZLEtBQUssSUFBSSxDQUFDLEVBQUU7QUFDeEYsWUFBTSxJQUFJLE1BQU0sNkRBQTZEO0FBQUEsSUFDL0U7QUFBQSxFQUNGO0FBRUEsU0FBTztBQUFBLElBQ0wsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLElBQ2pCLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxRQUNMLFFBQVE7QUFBQSxVQUNOLGNBQWM7QUFBQSxVQUNkLFFBQVE7QUFBQSxVQUNSLFFBQVE7QUFBQSxVQUNSLFNBQVMsQ0FBQUEsVUFBUUEsTUFBSyxRQUFRLFVBQVUsRUFBRTtBQUFBLFFBQzVDO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBRUEsUUFBUSxDQUFDO0FBQUEsSUFDVCxPQUFPO0FBQUE7QUFBQSxNQUVMLGVBQWU7QUFBQSxRQUNiLFFBQVE7QUFBQSxVQUNOLGNBQWM7QUFBQSxZQUNaLGdCQUFnQixDQUFDLFNBQVMsYUFBYSxrQkFBa0I7QUFBQSxZQUN6RCxTQUFTLENBQUMsaUJBQWlCLGdCQUFnQjtBQUFBLFlBQzNDLE9BQU8sQ0FBQyx1QkFBdUI7QUFBQSxVQUNqQztBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUE7QUFBQSxNQUVBLHVCQUF1QjtBQUFBLE1BQ3ZCLFFBQVE7QUFBQSxNQUNSLGVBQWU7QUFBQSxRQUNiLFVBQVU7QUFBQSxVQUNSLGNBQWM7QUFBQSxVQUNkLGVBQWU7QUFBQSxRQUNqQjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxjQUFjO0FBQUEsTUFDWixTQUFTO0FBQUEsUUFDUDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFsicGF0aCJdCn0K
