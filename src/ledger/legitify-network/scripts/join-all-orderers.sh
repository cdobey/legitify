#!/bin/bash

channel_name=$1

if [ -z "$channel_name" ]; then
  echo "Channel name not provided"
  echo "Usage: ./join-all-orderers.sh <channel_name>"
  exit 1
fi

# Set the orderer CA path
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/legitifyapp.com/orderers/orderer.legitifyapp.com/tls/ca.crt

# Join all orderers to the channel
echo "Joining orderer.legitifyapp.com to channel $channel_name"
./scripts/orderer.sh $channel_name

echo "Joining orderer2.legitifyapp.com to channel $channel_name"
./scripts/orderer2.sh $channel_name

echo "Joining orderer3.legitifyapp.com to channel $channel_name"
./scripts/orderer3.sh $channel_name

echo "Joining orderer4.legitifyapp.com to channel $channel_name"
./scripts/orderer4.sh $channel_name

echo "All orderers joined channel $channel_name"
