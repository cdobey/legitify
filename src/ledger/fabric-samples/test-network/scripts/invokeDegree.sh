#!/bin/bash

# Load environment variables
set -o allexport
source .env
set +o allexport

peer chaincode invoke -o localhost:7050 --tls --cafile $ORDERER_CA \
-C mychannel -n degreeCC \
--peerAddresses $ORG1_ADDRESS --tlsRootCertFiles $ORG1_TLS_CERT \
--peerAddresses $ORG2_ADDRESS --tlsRootCertFiles $ORG2_TLS_CERT \
-c '{"Args":["IssueDegree","1","UniversityXYZ","John Doe","Bachelor of Science","2024-01-01"]}'

echo "Degree issued successfully."