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

# Run all setup steps during build
RUN echo "🔄 Running initial setup..." && \
    bash scripts/start-fresh-db.sh && \
    echo "✅ Setup completed"

# Explicitly setting PORT environment variable for Render
ENV PORT=3001

# Expose the port that Swagger UI will run on
EXPOSE 3001

# Start the server directly without using a separate script
CMD ["npm", "run", "start"]
