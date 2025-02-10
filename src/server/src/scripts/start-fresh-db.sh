#!/bin/bash
# filepath: /Users/chris.dobey/College/FYP/2025-csc1097-mannp2-dobeyc3/src/server/src/scripts/fresh-db.sh

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

ts-node ../enrollAdmin.ts

echo "🚀 Starting the server..."
# Start the server
npm run dev

echo "✅ Setup complete!"
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: my_fabric_db"
echo "  Username: postgres"
echo "  Password: postgrespw"
echo "Server is running on port 3001"
