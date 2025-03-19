#!/bin/bash

# Source the .env file
source .env

# Bring down any existing network
echo "Shutting down existing network..."
./network.sh down

# Start the network with certificate authorities and CouchDB
echo "Starting network with CouchDB..."
./network.sh up -s couchdb -ca

# Create the channel
echo "Creating channel..."
./network.sh createChannel -ca

# Deploy the chaincode
echo "Deploying chaincode..."
./network.sh deployCC -ccn degreeCC -ccp ../chaincode/degreeChaincode/ -ccl go

# Confirm setup success
echo "Network setup complete."
