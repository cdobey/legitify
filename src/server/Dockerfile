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

# Expose the port that Swagger UI will run on
EXPOSE 3001

# Set environment variables (modify if needed)
ENV NODE_ENV=production

# Generate Prisma client (even if DB is not needed now)
RUN npx prisma generate

# Start the server
CMD ["npm", "run", "start"]
