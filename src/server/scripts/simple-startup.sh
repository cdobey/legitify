#!/bin/bash
set -e

echo "🌐 Fetching Hyperledger Fabric resources..."
# Support both new FABRIC_CONNECTION and legacy EC2_IP for backwards compatibility
export FABRIC_CONNECTION=${FABRIC_CONNECTION:-${EC2_IP:-"network.legitifyapp.com"}}
export RESOURCE_SERVER_PORT=${RESOURCE_SERVER_PORT:-"8080"}
echo "Using Fabric connection at ${FABRIC_CONNECTION}:${RESOURCE_SERVER_PORT}"

# Fetch Fabric resources
node ./scripts/fetch-fabric-resources.js
if [ $? -ne 0 ]; then
  echo "❌ Failed to fetch Fabric resources from network"
  echo "Will continue startup anyway, but functionality may be limited"
fi
echo "✅ Fabric resources fetch attempt completed"

# Start the server
echo "🚀 Starting the server..."
npm run start
