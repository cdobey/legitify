#!/bin/sh

# Set the path to the package ID file
ID_FILE="/data/chaincode_package_id.txt"

echo "Waiting for Package ID to be generated in $ID_FILE..."

# Wait for the file to exist and not be empty
while [ ! -s "$ID_FILE" ]; do
  sleep 2
done

# Read the package ID
PACKAGE_ID=$(cat "$ID_FILE")
echo "Starting chaincode with ID: $PACKAGE_ID"

# Export the ID for the Go chaincode shim
export CHAINCODE_ID="$PACKAGE_ID"

# Start the chaincode server
./chaincode-server
