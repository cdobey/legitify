#!/bin/bash

# Configuration and common functions for Fabric ledger management

C_RESET='\033[0m'
C_RED='\033[0;31m'
C_GREEN='\033[0;32m'
C_BLUE='\033[0;34m'
C_YELLOW='\033[1;33m'

# Logging functions
println() { echo -e "$1"; }
errorln() { println "${C_RED}${1}${C_RESET}"; }
successln() { println "${C_GREEN}${1}${C_RESET}"; }
infoln() { println "${C_BLUE}${1}${C_RESET}"; }
warnln() { println "${C_YELLOW}${1}${C_RESET}"; }
fatalln() { errorln "$1"; exit 1; }

export -f errorln successln infoln warnln

# Environment defaults
export CORE_PEER_TLS_ENABLED=true
CRYPTO_PATH=${CRYPTO_PATH:-"/data"}

# Paths to CAs
export ORDERER_CA=${CRYPTO_PATH}/organizations/ordererOrganizations/legitifyapp.com/tlsca/tlsca.legitifyapp.com-cert.pem
export PEER0_ORGISSUER_CA=${CRYPTO_PATH}/organizations/peerOrganizations/orgissuer.com/tlsca/tlsca.orgissuer.com-cert.pem
export PEER0_ORGVERIFIER_CA=${CRYPTO_PATH}/organizations/peerOrganizations/orgverifier.com/tlsca/tlsca.orgverifier.com-cert.pem
export PEER0_ORG_HOLDER_CA=${CRYPTO_PATH}/organizations/peerOrganizations/orgholder.com/tlsca/tlsca.orgholder.com-cert.pem

# Set environment variables for the peer org
setGlobals() {
  local USING_ORG=$1
  
  case $USING_ORG in
    1)
      export CORE_PEER_LOCALMSPID=OrgIssuerMSP
      export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORGISSUER_CA
      export CORE_PEER_MSPCONFIGPATH=${CRYPTO_PATH}/organizations/peerOrganizations/orgissuer.com/users/Admin@orgissuer.com/msp
      export CORE_PEER_ADDRESS=peer0.orgissuer.com:7051
      ;;
    2)
      export CORE_PEER_LOCALMSPID=OrgVerifierMSP
      export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORGVERIFIER_CA
      export CORE_PEER_MSPCONFIGPATH=${CRYPTO_PATH}/organizations/peerOrganizations/orgverifier.com/users/Admin@orgverifier.com/msp
      export CORE_PEER_ADDRESS=peer0.orgverifier.com:8051
      ;;
    3)
      export CORE_PEER_LOCALMSPID=OrgHolderMSP
      export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG_HOLDER_CA
      export CORE_PEER_MSPCONFIGPATH=${CRYPTO_PATH}/organizations/peerOrganizations/orgholder.com/users/Admin@orgholder.com/msp
      export CORE_PEER_ADDRESS=peer0.orgholder.com:9051
      ;;
    *)
      errorln "Organization $USING_ORG unknown. Use 1, 2, or 3."
      exit 1
      ;;
  esac

  if [ "$VERBOSE" = "true" ]; then
    env | grep CORE
  fi
}
