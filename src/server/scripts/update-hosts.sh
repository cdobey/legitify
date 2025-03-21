#!/bin/bash

# This script adds Fabric network hostname entries to your hosts file
# May need to be run with sudo

FABRIC_IP="localhost"

echo "Adding Fabric network hostnames to /etc/hosts..."

# Check if entries already exist
if grep -q "peer0.orguniversity.com" /etc/hosts; then
  echo "Entries already exist in /etc/hosts, skipping..."
else
  echo "Adding new entries to /etc/hosts..."
  echo "" | sudo tee -a /etc/hosts
  echo "# Hyperledger Fabric network entries" | sudo tee -a /etc/hosts
  echo "$FABRIC_IP orderer.example.com" | sudo tee -a /etc/hosts
  echo "$FABRIC_IP peer0.orguniversity.com" | sudo tee -a /etc/hosts
  echo "$FABRIC_IP peer0.orgemployer.com" | sudo tee -a /etc/hosts
  echo "$FABRIC_IP peer0.orgindividual.com" | sudo tee -a /etc/hosts
  echo "$FABRIC_IP ca.orguniversity.com" | sudo tee -a /etc/hosts
  echo "$FABRIC_IP ca.orgemployer.com" | sudo tee -a /etc/hosts
  echo "$FABRIC_IP ca.orgindividual.com" | sudo tee -a /etc/hosts
fi

echo "Done!"
