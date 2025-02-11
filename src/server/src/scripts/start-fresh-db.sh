#!/bin/bash

echo "🧹 Cleaning up old data..."

# Remove old wallet directory
rm -rf ../../wallet/*

# Remove old pgdata directory if it exists
rm -rf pgdata

echo "🔄 Stopping any existing PostgreSQL container..."
docker-compose down

echo "🚀 Starting new PostgreSQL container..."
docker-compose up -d

echo "⏳ Waiting for database to start..."
sleep 5

echo "🔧 Running Prisma migrations and generation..."

# Run Prisma migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

echo "🔑 Running enrollment script..."
ts-node ./enrollAdmin.ts

echo "🚀 Starting the server..."

# Start the server with proper logging and process management
ts-node ../index.ts > server.log 2>&1 &
SERVER_PID=$!

# Store the PID
echo $SERVER_PID > server.pid

# Wait for server to be ready (check if it's responding)
MAX_RETRIES=30
RETRY_COUNT=0
echo "⏳ Waiting for server to be ready..."

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3001/health > /dev/null; then
        echo "✅ Server is up and running!"
        break
    fi
    
    # Check if process is still running
    if ! ps -p $SERVER_PID > /dev/null; then
        echo "❌ Server process died. Check server.log for details"
        cat server.log
        exit 1
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 1
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Server failed to start within timeout"
    cat server.log
    kill $SERVER_PID
    exit 1
fi

# Create environment file for GitLab CI
echo "SERVER_STARTED=true" > server.env
echo "SERVER_URL=http://localhost:3001" >> server.env

echo "✅ Setup complete!"
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: my_fabric_db"
echo "  Username: postgres"
echo "  Password: postgrespw"
echo "Server is runn"