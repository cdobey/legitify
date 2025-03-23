#!/bin/bash

# Source the .env file
source ledger.env

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
./scripts/join-all-orderers.sh legitifychannel

# Deploy the chaincode
echo "Deploying chaincode..."
./network.sh deployCC -ccn degreeCC -ccp ../chaincode/degreeChaincode/ -ccl go

# Confirm setup success
echo "Network setup complete."
