#!/bin/bash
set -e

echo "🔄 Starting deployment check process..."

# Render sets this environment variable - different for each deployment but stable during restarts
RENDER_INSTANCE_ID=${RENDER_INSTANCE_ID:-"local-$(date +%s)"}
echo "📋 Current Render instance ID: $RENDER_INSTANCE_ID"

# Apply database migrations (always safe to run)
echo "📦 Running database migrations..."
npx prisma migrate deploy

# Check deployment status using Node.js one-liner with Prisma client
echo "🔍 Checking deployment status..."
DEPLOYMENT_STATUS=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDeployment() {
  try {
    const instanceId = '$RENDER_INSTANCE_ID';
    const deployment = await prisma.deploymentInfo.findUnique({
      where: { id: 'current' }
    });
    
    if (!deployment || deployment.commit_hash !== instanceId) {
      console.log('NEW_DEPLOYMENT');
      await prisma.deploymentInfo.upsert({
        where: { id: 'current' },
        update: { commit_hash: instanceId, deployed_at: new Date() },
        create: { id: 'current', commit_hash: instanceId }
      });
    } else {
      console.log('RESTART');
    }
    await prisma.\$disconnect();
  } catch (error) {
    console.log('NEW_DEPLOYMENT');
    process.exit(0);
  }
}

checkDeployment();
")

# Check if this is a new deployment or just a restart
if [[ "$DEPLOYMENT_STATUS" == *"NEW_DEPLOYMENT"* ]]; then
  echo "🔄 New deployment detected - performing full setup..."
  
  # Run the full setup (DB reset, server start)
  bash scripts/startup.sh
else
  echo "🔄 Container restarting after sleep - preserving existing database..."
  echo "🚀 Starting the server normally..."
  npm run start
fi
