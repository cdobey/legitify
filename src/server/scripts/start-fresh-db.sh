#!/bin/bash

echo "🔄 Setting up for Supabase database..."

# Ask for confirmation before deleting remote data
echo "⚠️  WARNING: This will DELETE ALL DATA in your Supabase database!"
echo "⚠️  All tables will be cleared and recreated. This action cannot be undone."
read -p "Are you sure you want to continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Operation cancelled"
  exit 1
fi

# Fetch Fabric resources from EC2 instance
echo "🌐 Fetching Hyperledger Fabric resources from EC2 instance..."
export EC2_IP=${EC2_IP:-"176.34.66.195"}
export RESOURCE_SERVER_PORT=${RESOURCE_SERVER_PORT:-"8080"}
echo "Using EC2 instance at ${EC2_IP}:${RESOURCE_SERVER_PORT}"

# Run the resource fetcher script
node ./scripts/fetch-fabric-resources.js
if [ $? -ne 0 ]; then
  echo "❌ Failed to fetch Fabric resources from EC2 instance"
  echo "Please make sure the Fabric network and resource server are running on the EC2 instance"
  exit 1
fi
echo "✅ Successfully fetched Fabric resources from EC2 instance"

echo "🗑️  Clearing all data from Supabase database..."

# Use Prisma to reset the database (drops all tables and recreates them)
echo "🔄 Resetting database schema..."
npx prisma migrate reset --force

echo "🔧 Running Prisma migrations and generation..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Run Prisma migrations (with --force for non-interactive mode)
echo "📝 Running Prisma migrations..."
npx prisma migrate deploy

echo "🔑 Running enrollment script..."
npx ts-node ./scripts/enrollAdmin.ts

echo "🚀 Starting the server..."

# Start the server
npm run dev &
SERVER_PID=$!

# Store the PID
echo $SERVER_PID > server.pid

# Wait for server to be ready (check if it's responding)
MAX_RETRIES=30
RETRY_COUNT=0
echo "⏳ Waiting for server to be ready..."

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://localhost:3001/docs > /dev/null; then
        echo "✅ Server is up and running!"
        break
    fi
    
    # Check if process is still running and show logs if it died
    if ! ps -p $SERVER_PID > /dev/null; then
        echo "❌ Server process died. Check server.log for details:"
        cat server.log
        exit 1
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 1
    echo -n "." # Show progress
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Server failed to start within timeout"
    cat server.log
    kill $SERVER_PID
    exit 1
fi

echo "✅ Setup complete!"
echo "Connection details:"
echo "  Using Supabase database: postgres.japzugjgdlvqkmytralh"
echo "Server is running at http://localhost:3001"
echo "Swagger documentation available at http://localhost:3001/docs" 
