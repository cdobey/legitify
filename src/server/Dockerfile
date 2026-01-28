# Use Node.js base image
FROM node:24-alpine

# Set the working directory inside the container
WORKDIR /app

# Install build dependencies for native modules and netcat for health checks
RUN apk add --no-cache python3 make g++ netcat-openbsd

# Install dependencies (all, not just production - we need ts-node)
COPY package*.json ./
RUN npm ci

# Copy the entire project
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Make scripts executable
RUN chmod +x scripts/*.sh

# Set environment variables
ENV NODE_ENV=production
ENV IS_DEPLOYMENT=true

# Expose the port
EXPOSE 3001

# Use entrypoint for startup tasks
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "start"]
