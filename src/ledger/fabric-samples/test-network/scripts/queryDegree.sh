#!/bin/bash

# Load environment variables
source .env

# Set the peer environment variables for Org1
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=$ORG1_MSPID
export CORE_PEER_MSPCONFIGPATH=$ORG1_MSP_PATH
export CORE_PEER_TLS_ROOTCERT_FILE=$ORG1_TLS_CERT
export CORE_PEER_ADDRESS=$ORG1_ADDRESS

peer chaincode query -C mychannel -n degreeCC -c '{"Args":["ReadDegree","1"]}'