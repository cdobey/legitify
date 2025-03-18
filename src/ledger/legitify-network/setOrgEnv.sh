#!/bin/bash
#
# SPDX-License-Identifier: Apache-2.0

source .env

function setGlobals() {
  local USING_ORG=""
  if [ -z "$OVERRIDE_ORG" ]; then
    USING_ORG=$1
  else
    USING_ORG="${OVERRIDE_ORG}"
  fi
  echo "Using organization ${USING_ORG}"
  if [ $USING_ORG = orguniversity ]; then
    export CORE_PEER_LOCALMSPID="OrgUniversityMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${ORG_UNIVERSITY_TLS_CERT}
    export CORE_PEER_MSPCONFIGPATH=${ORG_UNIVERSITY_MSP_PATH}
    export CORE_PEER_ADDRESS=network.legitifyapp.com:7051
    export FABRIC_CFG_PATH=${PWD}/configtx
  elif [ $USING_ORG = orgemployer ]; then
    export CORE_PEER_LOCALMSPID="OrgEmployerMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${ORG_EMPLOYER_TLS_CERT}
    export CORE_PEER_MSPCONFIGPATH=${ORG_EMPLOYER_MSP_PATH}
    export CORE_PEER_ADDRESS=network.legitifyapp.com:8051
    export FABRIC_CFG_PATH=${PWD}/configtx
  elif [ $USING_ORG = orgindividual ]; then
    export CORE_PEER_LOCALMSPID="OrgIndividualMSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=${ORG_INDIVIDUAL_TLS_CERT}
    export CORE_PEER_MSPCONFIGPATH=${ORG_INDIVIDUAL_MSP_PATH}
    export CORE_PEER_ADDRESS=network.legitifyapp.com:9051
    export FABRIC_CFG_PATH=${PWD}/configtx
  else
    echo "Unknown organization: $USING_ORG"
    exit 1
  fi

  if [ "$VERBOSE" == "true" ]; then
    env | grep CORE
  fi
}

function setOrdererGlobals() {
  export CORE_PEER_LOCALMSPID="OrdererMSP"
  export CORE_PEER_TLS_ROOTCERT_FILE=${ORDERER_CA}
  export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/ordererOrganizations/example.com/users/Admin@example.com/msp
  export CORE_PEER_ADDRESS=network.legitifyapp.com:7050
  export FABRIC_CFG_PATH=${PWD}/configtx
}

# parsePeerConnectionParameters $@
function parsePeerConnectionParameters() {
  PEER_CONN_PARMS=()
  PEERS=""
  while [ "$#" -gt 0 ]; do
    setGlobals $1
    PEER="peer0.$1"
    ## Set peer addresses
    if [ -z "$PEERS" ]
    then
	PEERS="$PEER"
    else
	PEERS="$PEERS $PEER"
    fi
    PEER_CONN_PARMS=("${PEER_CONN_PARMS[@]}" --peerAddresses $CORE_PEER_ADDRESS)
    if [ "$CORE_PEER_TLS_ENABLED" = "true" ]; then
      TLSINFO=(--tlsRootCertFiles "${CORE_PEER_TLS_ROOTCERT_FILE}")
      PEER_CONN_PARMS=("${PEER_CONN_PARMS[@]}" "${TLSINFO[@]}")
    fi
    # shift by one to get to the next organization
    shift
  done
}

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
