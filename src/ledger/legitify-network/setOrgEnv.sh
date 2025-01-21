#!/bin/bash
#
# SPDX-License-Identifier: Apache-2.0

# default to using OrgUniversity
ORG=${1:-OrgUniversity}

# Exit on first error, print all commands.
set -e
set -o pipefail

# Where am I?
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

ORDERER_CA=${DIR}/legitify-network/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem
PEER0_ORGUNIVERSITY_CA=${DIR}/legitify-network/organizations/peerOrganizations/orguniversity.com/tlsca/tlsca.orguniversity.com-cert.pem
PEER0_ORGEMPLOYER_CA=${DIR}/legitify-network/organizations/peerOrganizations/orgemployer.com/tlsca/tlsca.orgemployer.com-cert.pem
PEER0_ORGINDIVIDUAL_CA=${DIR}/legitify-network/organizations/peerOrganizations/orgindividual.com/tlsca/tlsca.orgindividual.com-cert.pem

if [[ ${ORG,,} == "orguniversity" ]]; then

   CORE_PEER_LOCALMSPID=OrgUniversityMSP
   CORE_PEER_MSPCONFIGPATH=${DIR}/legitify-network/organizations/peerOrganizations/orguniversity.com/users/Admin@orguniversity.com/msp
   CORE_PEER_ADDRESS=localhost:7051
   CORE_PEER_TLS_ROOTCERT_FILE=${DIR}/legitify-network/organizations/peerOrganizations/orguniversity.com/tlsca/tlsca.orguniversity.com-cert.pem

elif [[ ${ORG,,} == "orgemployer" ]]; then

   CORE_PEER_LOCALMSPID=OrgEmployerMSP
   CORE_PEER_MSPCONFIGPATH=${DIR}/legitify-network/organizations/peerOrganizations/orgemployer.com/users/Admin@orgemployer.com/msp
   CORE_PEER_ADDRESS=localhost:8051
   CORE_PEER_TLS_ROOTCERT_FILE=${DIR}/legitify-network/organizations/peerOrganizations/orgemployer.com/tlsca/tlsca.orgemployer.com-cert.pem

elif [[ ${ORG,,} == "orgindividual" ]]; then

   CORE_PEER_LOCALMSPID=OrgIndividualMSP
   CORE_PEER_MSPCONFIGPATH=${DIR}/legitify-network/organizations/peerOrganizations/orgindividual.com/users/Admin@orgindividual.com/msp
   CORE_PEER_ADDRESS=localhost:9051
   CORE_PEER_TLS_ROOTCERT_FILE=${DIR}/legitify-network/organizations/peerOrganizations/orgindividual.com/tlsca/tlsca.orgindividual.com-cert.pem

else
   echo "Unknown \"$ORG\", please choose OrgUniversity, OrgEmployer, or OrgIndividual"
   echo "For example to get the environment variables to set up an OrgEmployer shell environment run:  ./setOrgEnv.sh OrgEmployer"
   echo
   echo "This can be automated to set them as well with:"
   echo
   echo 'export $(./setOrgEnv.sh OrgEmployer | xargs)'
   exit 1
fi

# output the variables that need to be set
echo "CORE_PEER_TLS_ENABLED=true"
echo "ORDERER_CA=${ORDERER_CA}"
echo "PEER0_ORGUNIVERSITY_CA=${PEER0_ORGUNIVERSITY_CA}"
echo "PEER0_ORGEMPLOYER_CA=${PEER0_ORGEMPLOYER_CA}"
echo "PEER0_ORGINDIVIDUAL_CA=${PEER0_ORGINDIVIDUAL_CA}"

echo "CORE_PEER_MSPCONFIGPATH=${CORE_PEER_MSPCONFIGPATH}"
echo "CORE_PEER_ADDRESS=${CORE_PEER_ADDRESS}"
echo "CORE_PEER_TLS_ROOTCERT_FILE=${CORE_PEER_TLS_ROOTCERT_FILE}"

echo "CORE_PEER_LOCALMSPID=${CORE_PEER_LOCALMSPID}"
