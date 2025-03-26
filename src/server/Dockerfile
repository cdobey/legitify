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
# This uses the schema but doesn't need POSTGRES_CONNECTION_URL at build time
RUN npx prisma generate

# Make scripts executable
RUN chmod +x scripts/*.sh

# Explicitly setting PORT environment variable for Render
ENV PORT=3001

# Expose the port that Swagger UI will run on
EXPOSE 3001

# Set environment variables for automated deployment
ENV IS_DEPLOYMENT=true
ENV FABRIC_CONNECTION=network.legitifyapp.com

# Start the server directly - no conditional logic needed anymore
CMD ["npm", "run", "start"]
