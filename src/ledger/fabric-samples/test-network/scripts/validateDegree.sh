#!/bin/bash

# Load environment variables
set -o allexport
source .env
set +o allexport

peer chaincode query -C mychannel -n degreeCC -c '{"Args":["ValidateDegree","1"]}'