#!/bin/bash
set -e

echo "📦 Starting container setup..."

# Run DB setup script
echo "🔄 Setting up fresh database..."
bash scripts/start-fresh-db.sh

# Start the server in the background
echo "🚀 Starting the server..."
npm run start &
SERVER_PID=$!

# Function to check if the server is ready
check_server_health() {
    # Try to connect to the docs endpoint, which should be available when the server is up
    curl --silent --fail http://localhost:3001/docs > /dev/null
    return $?
}

# Wait for the server to be ready
echo "⏳ Waiting for server to be ready..."
COUNTER=0
MAX_RETRIES=30
RETRY_INTERVAL=2

until check_server_health; do
    COUNTER=$((COUNTER + 1))
    if [ $COUNTER -ge $MAX_RETRIES ]; then
        echo "❌ Server failed to start after $((MAX_RETRIES * RETRY_INTERVAL)) seconds"
        exit 1
    fi
    echo "⏳ Server not ready yet, waiting... ($COUNTER/$MAX_RETRIES)"
    sleep $RETRY_INTERVAL
done

echo "✅ Server is ready!"

# Run the test-flow script
echo "🧪 Running test-flow script..."
bash scripts/test-flow.sh || echo "⚠️ Test flow completed with warnings or errors"

# Keep the server running in the foreground
echo "🔄 Server is running. Press CTRL+C to stop."
wait $SERVER_PID
