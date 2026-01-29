# Dockerfile for Vite React app with runtime environment configuration
FROM node:24-alpine AS build

# Set working directory
WORKDIR /app
    
# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
    
# Copy the source code
COPY . .

# Increase Node.js memory limit to prevent out of memory errors
ENV NODE_OPTIONS="--max-old-space-size=4096"
    
# Build the app (no environment variables needed at build time)
RUN npm run build
    
# Use Nginx to serve the app with runtime configuration
FROM nginx:alpine
    
# Install curl for health checks
RUN apk add --no-cache curl

# Copy built app
COPY --from=build /app/dist /usr/share/nginx/html
    
# Copy the entrypoint script for runtime env injection
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
    
# Add Nginx config for SPA
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf
    
EXPOSE 80

# Use custom entrypoint to inject runtime environment variables
ENTRYPOINT ["/docker-entrypoint.sh"]
