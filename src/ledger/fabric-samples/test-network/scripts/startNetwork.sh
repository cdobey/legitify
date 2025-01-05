#!/bin/bash

# Source the .env file
source .env

# Bring down any existing network
echo "Shutting down existing network..."
./network.sh down

# Start the network with certificate authorities
echo "Starting network..."
./network.sh up createChannel -ca

# Deploy the chaincode
echo "Deploying chaincode..."
./network.sh deployCC -ccn degreeCC -ccp ../chaincode/degreeChaincode/ -ccl go

# Confirm setup success
echo "Network setup complete."