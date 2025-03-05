# ---- Stage 1: Build the React App ----
    FROM node:18 as build

    # Set working directory
    WORKDIR /app
    
    # Copy package files and install dependencies
    COPY package*.json ./
    RUN npm install
    
    # Copy the rest of your source code
    COPY . .
    
    # Build the app (default Vite output is in "dist")
    RUN npm run build
    
    # ---- Stage 2: Serve the App using Nginx ----
    FROM nginx:alpine
    
    # Remove default Nginx static assets
    RUN rm -rf /usr/share/nginx/html/*
    
    # Copy the built app from the previous stage
    COPY --from=build /app/dist /usr/share/nginx/html
    
    # Expose port 80 (default for Nginx)
    EXPOSE 80
    
    # Start Nginx in the foreground
    CMD ["nginx", "-g", "daemon off;"]
    