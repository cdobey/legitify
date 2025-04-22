#!/bin/bash

# Hardcoded values instead of sourcing from ledger.env
FABRIC_VERSION="2.5.10"
FABRIC_CA_VERSION="1.5.13"
CHANNEL_NAME="legitifychannel"
CHAINCODE_NAME="credentialCC"
CHAINCODE_PATH="../chaincode/credentialChaincode/"
CHAINCODE_LANGUAGE="go"
START_EXPLORER=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
  --with-explorer)
    START_EXPLORER=true
    shift
    ;;
  *)
    # Unknown option, just skip it
    shift
    ;;
  esac
done

# Ensure we're using our custom config files
export FABRIC_CFG_PATH=${PWD}/../config

# Check if binaries exist, install if needed
if [ ! -f "../bin/peer" ] || [ ! -f "../bin/orderer" ]; then
  echo "Fabric binaries not found. Installing..."
  cd ..
  
  # Use the new setup-fabric script
  if [ -f "setup-fabric.sh" ]; then
    chmod +x setup-fabric.sh
    ./setup-fabric.sh --fabric-version ${FABRIC_VERSION} --ca-version ${FABRIC_CA_VERSION} binary
  else
    echo "Error: setup-fabric.sh not found."
    exit 1
  fi
  
  cd legitify-network
fi

echo "Starting Legitify Network..."
./network.sh down
./network.sh up createChannel -ca -c ${CHANNEL_NAME}
./network.sh deployCC -ccn ${CHAINCODE_NAME} -ccp ${CHAINCODE_PATH} -ccl ${CHAINCODE_LANGUAGE}

# Start Explorer if requested
if [ "$START_EXPLORER" = true ]; then
  echo "Setting up and starting Hyperledger Explorer..."
  EXPLORER_SCRIPT_PATH="../../explorer/scripts/explorer.sh"
  if [ -f "$EXPLORER_SCRIPT_PATH" ]; then
    chmod +x $EXPLORER_SCRIPT_PATH
    bash $EXPLORER_SCRIPT_PATH up
    echo "Hyperledger Explorer should be available at http://localhost:8090"
    echo "Login with username: exploreradmin, password: exploreradminpw"
  else
    echo "Explorer script not found at $EXPLORER_SCRIPT_PATH"
  fi
fi

echo "Network setup complete!"
