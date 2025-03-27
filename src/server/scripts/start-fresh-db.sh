#!/bin/bash

echo "🔄 Setting up for Supabase database..."

# Determine if running in CI/deployment environment
IS_DEPLOYMENT=${IS_DEPLOYMENT:-false}
if [ "$CI" = "true" ] || [ "$IS_DEPLOYMENT" = "true" ]; then
  echo "🤖 Running in automated deployment mode - confirmations will be skipped"
  AUTO_CONFIRM="y"
else
  AUTO_CONFIRM=""
fi

# Ask for confirmation before deleting remote data (skip in deployment)
echo "⚠️  WARNING: This will DELETE ALL DATA in your Supabase database!"
echo "⚠️  All tables will be cleared and recreated. This action cannot be undone."

if [ -z "$AUTO_CONFIRM" ]; then
  read -p "Are you sure you want to continue? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled"
    exit 1
  fi
else
  echo "✅ Automatically confirmed data deletion (deployment mode)"
  REPLY="y"
fi

# Check Fabric connectivity
echo "🔌 Checking connectivity to Hyperledger Fabric network..."
# Support both new FABRIC_CONNECTION and legacy EC2_IP for backwards compatibility
export FABRIC_CONNECTION=${FABRIC_CONNECTION:-${EC2_IP:-"network.legitifyapp.com"}}
export RESOURCE_SERVER_PORT=${RESOURCE_SERVER_PORT:-"8080"}
echo "Using Fabric connection at ${FABRIC_CONNECTION}:${RESOURCE_SERVER_PORT}"

# Fetch Fabric resources from EC2 instance
echo "🌐 Fetching Hyperledger Fabric resources from Fabric network..."

# Run the resource fetcher script
node ./scripts/fetch-fabric-resources.js
if [ $? -ne 0 ]; then
  echo "❌ Failed to fetch Fabric resources from network"
  echo "Please make sure the Fabric network and resource server are running"
  exit 1
fi
echo "✅ Successfully fetched Fabric resources"

# Export environment variables from server.env only if in local development
if [ "$IS_DEPLOYMENT" != "true" ] && [ -f server.env ]; then
  echo "Loading environment variables from server.env"
  export $(grep -v '^#' server.env | xargs)
else
  echo "Using system environment variables (deployment mode)"
fi

# Check if required variables are set
if [ -z "$POSTGRES_CONNECTION_URL" ]; then
  echo "❌ POSTGRES_CONNECTION_URL is not set"
  echo "Please make sure it's defined in server.env for local development or in the deployment environment"
  exit 1
fi

# Ensure Prisma binaries are executable
echo "🔧 Ensuring Prisma binaries are executable..."
chmod -R +x ./node_modules/.bin/

# Regenerate Prisma client to ensure it uses the correct configuration
echo "🔄 Regenerating Prisma client..."
npx prisma generate

# Delete all Supabase Auth users
echo "🗑️  Clearing all authorized users from Supabase Auth..."
npx ts-node ./scripts/delete-auth-users.ts

echo "🗑️  Clearing all data from Supabase database..."

# Use Prisma to reset the database (drops all tables and recreates them)
echo "🔄 Resetting database schema..."
npx prisma migrate reset --force

echo "🔧 Running Prisma migrations and generation..."

# Run Prisma migrations (with --force for non-interactive mode)
echo "📝 Running Prisma migrations..."
npx prisma migrate deploy

echo "🔑 Running enrollment script..."
npx ts-node ./scripts/enrollAdmin.ts

echo "✅ Database setup completed successfully"
