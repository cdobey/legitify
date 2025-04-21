#!/bin/bash
#
# Collection of bash functions used by different scripts
#

# Import utilities
TEST_NETWORK_HOME=${TEST_NETWORK_HOME:-${PWD}}
. ${TEST_NETWORK_HOME}/scripts/utils.sh

export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA=${TEST_NETWORK_HOME}/organizations/ordererOrganizations/legitifyapp.com/tlsca/tlsca.legitifyapp.com-cert.pem
export PEER0_ORGISSUER_CA=${TEST_NETWORK_HOME}/organizations/peerOrganizations/orgissuer.com/tlsca/tlsca.orgissuer.com-cert.pem
export PEER0_ORGVERIFIER_CA=${TEST_NETWORK_HOME}/organizations/peerOrganizations/orgverifier.com/tlsca/tlsca.orgverifier.com-cert.pem
export PEER0_OrgHolder_CA=${TEST_NETWORK_HOME}/organizations/peerOrganizations/orgholder.com/tlsca/tlsca.orgholder.com-cert.pem

# Set environment variables for the peer org
setGlobals() {
  local USING_ORG=""
  if [ -z "$OVERRIDE_ORG" ]; then
    USING_ORG=$1
  else
    USING_ORG="${OVERRIDE_ORG}"
  fi
  infoln "Using organization ${USING_ORG}"
  if [ $USING_ORG -eq 1 ]; then
    export CORE_PEER_LOCALMSPID=OrgIssuerMSP
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORGISSUER_CA
    export CORE_PEER_MSPCONFIGPATH=${TEST_NETWORK_HOME}/organizations/peerOrganizations/orgissuer.com/users/Admin@orgissuer.com/msp
    export CORE_PEER_ADDRESS=localhost:7051
  elif [ $USING_ORG -eq 2 ]; then
    export CORE_PEER_LOCALMSPID=OrgVerifierMSP
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORGVERIFIER_CA
    export CORE_PEER_MSPCONFIGPATH=${TEST_NETWORK_HOME}/organizations/peerOrganizations/orgverifier.com/users/Admin@orgverifier.com/msp
    export CORE_PEER_ADDRESS=localhost:8051
  elif [ $USING_ORG -eq 3 ]; then
    export CORE_PEER_LOCALMSPID=OrgHolderMSP
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_OrgHolder_CA
    export CORE_PEER_MSPCONFIGPATH=${TEST_NETWORK_HOME}/organizations/peerOrganizations/orgholder.com/users/Admin@orgholder.com/msp
    export CORE_PEER_ADDRESS=localhost:9051
  else
    errorln "ORG Unknown"
    exit 1
  fi

  if [ "$VERBOSE" = "true" ]; then
    env | grep CORE
  fi
}

# parsePeerConnectionParameters $@
# Helper function that sets the peer connection parameters for a chaincode
# operation
parsePeerConnectionParameters() {
  PEER_CONN_PARMS=()
  PEERS=""
  while [ "$#" -gt 0 ]; do
    # Ensure $1 is a valid org identifier
    if [[ "$1" -ne 1 && "$1" -ne 2 && "$1" -ne 3 ]]; then
      errorln "Invalid organization identifier: $1. Must be 1, 2, or 3."
      exit 1
    fi

    setGlobals $1
    PEER="peer0.org$1"

    # Add peer to list
    if [ -z "$PEERS" ]; then
      PEERS="$PEER"
    else
      PEERS="$PEERS $PEER"
    fi

    # Add peer address to connection parameters
    PEER_CONN_PARMS=("${PEER_CONN_PARMS[@]}" --peerAddresses $CORE_PEER_ADDRESS)

    # Add TLS root certificate
    case $1 in
      1) CA=PEER0_ORGISSUER_CA ;;
      2) CA=PEER0_ORGVERIFIER_CA ;;
      3) CA=PEER0_OrgHolder_CA ;;
      *) errorln "Invalid organization identifier: $1. Must be 1, 2, or 3." ;;
    esac

    if [ -z "${!CA}" ]; then
      errorln "TLS root certificate file for $PEER is not set or invalid."
      exit 1
    fi
    TLSINFO=(--tlsRootCertFiles "${!CA}")
    PEER_CONN_PARMS=("${PEER_CONN_PARMS[@]}" "${TLSINFO[@]}")

    # Shift to the next organization
    shift || break
  done

  # Debug output
  infoln "PEER_CONN_PARMS: ${PEER_CONN_PARMS[@]}"
}

verifyResult() {
  if [ $1 -ne 0 ]; then
    fatalln "$2"
  fi
}
