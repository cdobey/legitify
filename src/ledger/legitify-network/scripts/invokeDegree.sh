#!/bin/bash

# Load environment variables
source .env

# Set the peer environment variables for OrgUniversity
export CORE_PEER_TLS_ENABLED=$ORG_UNIVERSITY_TLS_ENABLED
export CORE_PEER_LOCALMSPID=$ORG_UNIVERSITY_MSPID
export CORE_PEER_MSPCONFIGPATH=$ORG_UNIVERSITY_MSP_PATH
export CORE_PEER_TLS_ROOTCERT_FILE=$ORG_UNIVERSITY_TLS_CERT
export CORE_PEER_ADDRESS=$ORG_UNIVERSITY_ADDRESS

peer chaincode invoke -o localhost:7050 --tls --cafile $ORDERER_CA \
-C mychannel -n degreeCC $PEER_ADDRESSES \
-c '{"Args":["IssueDegree","1","UniversityXYZ","John Doe","Bachelor of Science","2024-01-01"]}'

echo "Degree issued successfully."