#!/bin/bash

# Source the .env file
source ledger.env

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
  echo "Binaries installed successfully."
fi

# Bring down any existing network
echo "Shutting down existing network..."
./network.sh down

# Start the network with certificate authorities and CouchDB
echo "Starting network with CouchDB..."
./network.sh up -s couchdb -ca

# Create the channel
echo "Creating channel..."
./network.sh createChannel -ca

# Join all orderers to the channel
echo "Joining all orderers to the channel..."
./scripts/join-all-orderers.sh ${CHANNEL_NAME}

# Deploy the chaincode
echo "Deploying chaincode..."
./network.sh deployCC -ccn ${CHAINCODE_NAME} -ccp ${CHAINCODE_PATH} -ccl ${CHAINCODE_LANGUAGE}

# Confirm setup success
echo "Network setup complete."
