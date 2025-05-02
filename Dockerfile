# Use Node.js base image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies first (improves build caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire project (except ignored files)
COPY . .

# Generate Prisma client without accessing the database
RUN npx prisma generate

# Make scripts executable
RUN chmod +x scripts/*.sh

# Set environment variables for automated deployment
ENV IS_DEPLOYMENT=true
ENV FABRIC_CONNECTION=network.legitifyapp.com

# No database initialization during build - this will be handled by GitLab CI
# after deployment to Render

# Explicitly setting PORT environment variable for Render
ENV PORT=3001

# Expose the port that Swagger UI will run on
EXPOSE 3001

# Use our entrypoint script to fetch resources and start the app
ENTRYPOINT ["/app/scripts/entrypoint.sh"]
