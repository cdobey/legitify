#!/bin/bash
set -e

echo "🔄 Starting deployment check process..."

# Get current Git commit hash
CURRENT_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
echo "📋 Current commit: $CURRENT_COMMIT"

# Add DeploymentInfo model for tracking if not already in schema
npx prisma migrate deploy

# Function to check for stored deployment info
check_deployment_commit() {
  DB_COMMIT=$(npx prisma query "SELECT commit_hash FROM \"DeploymentInfo\" WHERE id = 'current'" --json 2>/dev/null || echo "{}")
  
  if [[ "$DB_COMMIT" == *"commit_hash"* ]]; then
    DB_COMMIT=$(echo $DB_COMMIT | jq -r '.[0].commit_hash')
    echo "📋 Database deployment commit: $DB_COMMIT"
    echo $DB_COMMIT
    return 0
  else
    echo "❓ No deployment info found in database"
    return 1
  fi
}

# Check if DeploymentInfo exists first
TABLE_EXISTS=$(npx prisma query "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'DeploymentInfo')" --json 2>/dev/null || echo "{}")

if [[ "$TABLE_EXISTS" != *"true"* ]]; then
  echo "🔄 First run - creating DeploymentInfo table..."
  npx prisma query "CREATE TABLE IF NOT EXISTS \"DeploymentInfo\" (id TEXT PRIMARY KEY, commit_hash TEXT, deployed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
fi

# Get stored commit from database
DB_COMMIT=$(check_deployment_commit)
RESULT=$?

# Is this a new deployment?
if [ $RESULT -ne 0 ] || [ "$DB_COMMIT" != "$CURRENT_COMMIT" ]; then
  echo "🔄 New deployment detected (commit changed or first run)"
  
  # Run the full setup (DB reset, server start, test flow)
  bash scripts/startup.sh
  
  # Update deployment info in database
  npx prisma query "INSERT INTO \"DeploymentInfo\" (id, commit_hash) VALUES ('current', '$CURRENT_COMMIT') ON CONFLICT (id) DO UPDATE SET commit_hash = '$CURRENT_COMMIT', deployed_at = CURRENT_TIMESTAMP"
  echo "✅ Deployment info updated in database"
else
  echo "🔄 Container restarting after sleep - preserving existing database..."
  echo "🚀 Starting the server normally..."
  npm run start
fi
