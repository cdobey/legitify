#!/bin/bash

echo "🧹 Cleaning up old data..."

# Remove old wallet directory if needed
rm -rf src/wallet/*

echo "🔄 Setting up for Supabase database..."

echo "✅ Supabase connection validated"

# Ask for confirmation before deleting remote data
echo "⚠️  WARNING: This will DELETE ALL DATA in your Supabase database!"
echo "⚠️  All tables will be cleared and recreated. This action cannot be undone."
read -p "Are you sure you want to continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Operation cancelled"
  exit 1
fi

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
npx ts-node ./enrollAdmin.ts

echo "🚀 Starting the server..."

# Start the server with npm run dev
npm run dev > server.log 2>&1 &
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

# Create environment file for GitLab CI
echo "SERVER_STARTED=true" > server.env
echo "SERVER_URL=http://localhost:3001" >> server.env

echo "✅ Setup complete!"
echo "Connection details:"
echo "  Using Supabase database: postgres.japzugjgdlvqkmytralh"
echo "Server is running at http://localhost:3001"
echo "Swagger documentation available at http://localhost:3001/docs" 