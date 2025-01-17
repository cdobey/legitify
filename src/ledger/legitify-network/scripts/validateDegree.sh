#!/bin/bash

set -x

# Load environment variables
source .env

# Set the peer environment variables for OrgUniversity
export CORE_PEER_TLS_ENABLED=$ORG_UNIVERSITY_TLS_ENABLED
export CORE_PEER_LOCALMSPID=$ORG_UNIVERSITY_MSPID
export CORE_PEER_MSPCONFIGPATH=$ORG_UNIVERSITY_MSP_PATH
export CORE_PEER_TLS_ROOTCERT_FILE=$ORG_UNIVERSITY_TLS_CERT
export CORE_PEER_ADDRESS=$ORG_UNIVERSITY_ADDRESS

peer chaincode query -C mychannel -n degreeCC -c '{"Args":["ValidateDegree","1"]}'