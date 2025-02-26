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
# This uses the schema but doesn't need DATABASE_URL at build time
RUN npx prisma generate

# Expose the port that Swagger UI will run on
EXPOSE 3001

# Start the server with migration at runtime
CMD npx prisma migrate deploy && npm run start
