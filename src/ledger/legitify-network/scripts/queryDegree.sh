#!/bin/bash

set -x

# Load environment variables
source .env

# Set the peer environment variables for OrgEmployer
export CORE_PEER_TLS_ENABLED=$ORG_EMPLOYER_TLS_ENABLED
export CORE_PEER_LOCALMSPID=$ORG_EMPLOYER_MSPID
export CORE_PEER_MSPCONFIGPATH=$ORG_EMPLOYER_MSP_PATH
export CORE_PEER_TLS_ROOTCERT_FILE=$ORG_EMPLOYER_TLS_CERT
export CORE_PEER_ADDRESS=$ORG_EMPLOYER_ADDRESS
sleep 30
peer chaincode query -C mychannel -n degreeCC -c '{"Args":["ReadDegree","1"]}'
