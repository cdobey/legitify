#!/bin/bash

# Set environment variables
export EXPLORER_BASE_DIR=$(dirname "$(cd "$(dirname "$0")" && pwd)")
export FABRIC_NETWORK_DIR=${EXPLORER_BASE_DIR}/../legitify-network
export DOCKER_SOCK="${DOCKER_HOST:-/var/run/docker.sock}"

# Function to show usage information
show_usage() {
  echo "Usage: $0 [up|down]"
  echo "  up   - Start Hyperledger Explorer"
  echo "  down - Stop Hyperledger Explorer"
  exit 1
}

# Function to prepare certificates
prepare_certificates() {
  local orgs=("orguniversity.com" "orgemployer.com" "orgindividual.com")
  
  for org in "${orgs[@]}"; do
    # Set up admin certificate symlinks
    msp_path="${FABRIC_NETWORK_DIR}/organizations/peerOrganizations/${org}/users/Admin@${org}/msp"
    if [ -d "${msp_path}/keystore" ]; then
      priv_key=$(find "${msp_path}/keystore" -type f | head -1)
      if [ -n "$priv_key" ] && [ ! -f "${msp_path}/keystore/priv_sk" ]; then
        ln -sf "$(basename $priv_key)" "${msp_path}/keystore/priv_sk"
      fi
    fi
  done
  
  # Set up orderer admin certificate symlinks
  msp_path="${FABRIC_NETWORK_DIR}/organizations/ordererOrganizations/legitifyapp.com/users/Admin@legitifyapp.com/msp"
  if [ -d "${msp_path}/keystore" ]; then
    priv_key=$(find "${msp_path}/keystore" -type f | head -1)
    if [ -n "$priv_key" ] && [ ! -f "${msp_path}/keystore/priv_sk" ]; then
      ln -sf "$(basename $priv_key)" "${msp_path}/keystore/priv_sk"
    fi
  fi
}

# Function to start explorer
start_explorer() {
  # Ensure we're in the explorer directory
  cd $EXPLORER_BASE_DIR

  # Create connection profile directory if it doesn't exist
  mkdir -p "${EXPLORER_BASE_DIR}/connection-profile"

  # Check if the fabric network is running
  if [ ! "$(docker ps | grep peer0.orguniversity)" ]; then
    echo "The Fabric network doesn't seem to be running. Start it first!"
    exit 1
  fi

  # Prepare certificates
  prepare_certificates

  # Stop any running explorer containers
  echo "Stopping any previous explorer instances..."
  DOCKER_SOCK=$DOCKER_SOCK docker-compose -f docker-compose.yaml down -v 2>/dev/null

  # Start explorer
  echo "Starting Hyperledger Explorer..."
  DOCKER_SOCK=$DOCKER_SOCK docker-compose -f docker-compose.yaml up -d

  # Initialize database
  echo "Initializing explorer database..."
  sleep 10
  EXPLORER_CONTAINER_ID=$(docker ps -qf "name=explorer.legitifyapp.com")
  if [ -n "$EXPLORER_CONTAINER_ID" ]; then
    docker exec $EXPLORER_CONTAINER_ID /bin/sh -c "cd /opt/explorer/app/persistence/fabric/postgreSQL && ./createdb.sh"
  fi

  echo "Explorer started! Available at http://localhost:8090"
  echo "Login with username: exploreradmin, password: exploreradminpw"
}

# Function to stop explorer
stop_explorer() {
  # Ensure we're in the explorer directory
  cd $EXPLORER_BASE_DIR

  echo "Stopping Hyperledger Explorer..."
  DOCKER_SOCK=$DOCKER_SOCK docker-compose -f docker-compose.yaml down -v

  echo "Explorer stopped!"
}

# Check for arguments
if [ $# -eq 0 ]; then
  show_usage
fi

# Process command line arguments
case "$1" in
  up)
    start_explorer
    ;;
  down)
    stop_explorer
    ;;
  *)
    show_usage
    ;;
esac
