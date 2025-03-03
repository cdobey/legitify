#!/bin/bash

# Start the Fabric Resource Server
cd "$(dirname "$0")"

# Set the EC2 IP address
export EC2_IP=${EC2_IP:-"3.249.159.32"}

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing resource server dependencies..."
  npm install
fi

# Check if server is already running
if pgrep -f "node index.js" > /dev/null; then
  echo "Resource server is already running"
else
  # Start the server in the background
  echo "Starting Fabric Resource Server on port 8080..."
  nohup node index.js > resource-server.log 2>&1 &
  echo "Resource server started with PID $!"
fi 