# Simple Dockerfile for Vite React app
FROM node:18 AS build

# Set working directory
WORKDIR /app
    
# Copy package files and install dependencies
COPY package*.json ./
RUN npm install
    
# Copy the source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL

# Set build environment variables (these won't persist in the final image)
ENV VITE_API_URL=${VITE_API_URL}
# Increase Node.js memory limit to prevent out of memory errors
ENV NODE_OPTIONS="--max-old-space-size=4096"
    
# Build the app
RUN npm run build
    
# Use Nginx to serve the app - clean image without build args
FROM nginx:alpine
    
# Copy built app
COPY --from=build /app/dist /usr/share/nginx/html
    
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
CMD ["nginx", "-g", "daemon off;"]
