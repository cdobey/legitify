#!/bin/bash
set -e

echo "🔌 Fetching Hyperledger Fabric resources..."
node /app/scripts/fetch-fabric-resources.js

echo "✅ Resources fetched successfully, starting server..."
exec npm run start
