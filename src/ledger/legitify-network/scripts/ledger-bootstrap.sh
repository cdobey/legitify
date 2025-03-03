#!/bin/bash
set -e

# Verify that the Docker socket is available.
if [ ! -S /var/run/docker.sock ]; then
  echo "Error: Docker socket (/var/run/docker.sock) is not available."
  exit 1
fi

echo "Starting Fabric network bootstrap..."

# Optional: perform any pre-setup cleanup on the host if needed
# e.g., docker system prune -af
./network.sh down

# Run your Fabric network startup script
./scripts/startNetwork.sh

# At this point your Fabric network should be up and running on the host.
# Meanwhile, start (or keep alive) the resource server on port 8080.
# (Assuming your network scripts already start the resource server in the background.)
echo "Fabric network setup completed. Resource server running on port 8080."

# Keep the container running (if needed, e.g., tail logs)
tail -f /dev/null
