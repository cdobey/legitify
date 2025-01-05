#!/bin/bash

# Load environment variables
source .env

# Set the peer environment variables for Org1
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=$ORG1_MSPID
export CORE_PEER_MSPCONFIGPATH=$ORG1_MSP_PATH
export CORE_PEER_TLS_ROOTCERT_FILE=$ORG1_TLS_CERT
export CORE_PEER_ADDRESS=$ORG1_ADDRESS

peer chaincode invoke -o localhost:7050 --tls --cafile $ORDERER_CA \
-C mychannel -n degreeCC $PEER_ADDRESSES \
-c '{"Args":["IssueDegree","1","UniversityXYZ","John Doe","Bachelor of Science","2024-01-01"]}'

echo "Degree issued successfully."