#!/bin/bash

# installChaincode PEER ORG
function installChaincode() {
  ORG=$1
  setGlobals $ORG
  set -x
  peer lifecycle chaincode queryinstalled --output json | jq -r 'try (.installed_chaincodes[].package_id)' | grep ^${PACKAGE_ID}$ >&log.txt
  if test $? -ne 0; then
    MAX_ATTEMPTS=3
    DELAY=30
    for i in $(seq 1 $MAX_ATTEMPTS); do
      echo "Attempt $i to install chaincode on peer0.org${ORG}..."
      peer lifecycle chaincode install ${CC_NAME}.tar.gz && break
      echo "Install failed; retry in $DELAY seconds..."
      sleep $DELAY
    done
    res=$?
  fi
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Chaincode installation on peer0.org${ORG} has failed"
  successln "Chaincode is installed on peer0.org${ORG}"
}

# queryInstalled PEER ORG
function queryInstalled() {
  ORG=$1
  setGlobals $ORG
  set -x
  peer lifecycle chaincode queryinstalled --output json | jq -r 'try (.installed_chaincodes[].package_id)' | grep ^${PACKAGE_ID}$ >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Query installed on peer0.org${ORG} has failed"
  successln "Query installed successful on peer0.org${ORG} on channel"
}

# approveForMyOrg VERSION PEER ORG
function approveForMyOrg() {
  ORG=$1
  setGlobals $ORG
  set -x
  peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.legitifyapp.com --tls --cafile "$ORDERER_CA" --channelID $CHANNEL_NAME --name ${CC_NAME} --version ${CC_VERSION} --package-id ${PACKAGE_ID} --sequence ${CC_SEQUENCE} ${INIT_REQUIRED} ${CC_END_POLICY} ${CC_COLL_CONFIG} >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Chaincode definition approved on peer0.org${ORG} on channel '$CHANNEL_NAME' failed"
  successln "Chaincode definition approved on peer0.org${ORG} on channel '$CHANNEL_NAME'"
}

# checkCommitReadiness VERSION PEER ORG
function checkCommitReadiness() {
  ORG=$1
  shift 1
  setGlobals $ORG
  infoln "Checking the commit readiness of the chaincode definition on peer0.org${ORG} on channel '$CHANNEL_NAME'..."
  local rc=1
  local COUNTER=1
  # continue to poll
  # we either get a successful response, or reach MAX RETRY
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
    sleep $DELAY
    infoln "Attempting to check the commit readiness of the chaincode definition on peer0.org${ORG}, Retry after $DELAY seconds."
    set -x
    peer lifecycle chaincode checkcommitreadiness --channelID $CHANNEL_NAME --name ${CC_NAME} --version ${CC_VERSION} --sequence ${CC_SEQUENCE} ${INIT_REQUIRED} ${CC_END_POLICY} ${CC_COLL_CONFIG} --output json >&log.txt
    res=$?
    { set +x; } 2>/dev/null
    let rc=0
    for var in "$@"; do
      if ! grep -q "$var" log.txt; then
        let rc=1
      fi
    done
    COUNTER=$(expr $COUNTER + 1)
  done
  cat log.txt
  if test $rc -eq 0; then
    infoln "Checking the commit readiness of the chaincode definition successful on peer0.org${ORG} on channel '$CHANNEL_NAME'"
  else
    fatalln "After $MAX_RETRY attempts, Check commit readiness result on peer0.org${ORG} is INVALID!"
  fi
}

# commitChaincodeDefinition VERSION PEER ORG (PEER ORG)...
function commitChaincodeDefinition() {
  parsePeerConnectionParameters $@
  res=$?
  verifyResult $res "Invoke transaction failed on channel '$CHANNEL_NAME' due to uneven number of peer and org parameters "

  # while 'peer chaincode' command can get the orderer endpoint from the
  # peer (if join was successful), let's supply it directly as we know
  # it using the "-o" option
  set -x
  peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.legitifyapp.com --tls --cafile "$ORDERER_CA" --channelID $CHANNEL_NAME --name ${CC_NAME} "${PEER_CONN_PARMS[@]}" --version ${CC_VERSION} --sequence ${CC_SEQUENCE} ${INIT_REQUIRED} ${CC_END_POLICY} ${CC_COLL_CONFIG} >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Chaincode definition commit failed on peer0.org${ORG} on channel '$CHANNEL_NAME' failed"
  successln "Chaincode definition committed on channel '$CHANNEL_NAME'"
}

# queryCommitted ORG
function queryCommitted() {
  ORG=$1
  setGlobals $ORG
  EXPECTED_RESULT="Version: ${CC_VERSION}, Sequence: ${CC_SEQUENCE}, Endorsement Plugin: escc, Validation Plugin: vscc"
  infoln "Querying chaincode definition on peer0.org${ORG} on channel '$CHANNEL_NAME'..."
  local rc=1
  local COUNTER=1
  # continue to poll
  # we either get a successful response, or reach MAX RETRY
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
    sleep $DELAY
    infoln "Attempting to Query committed status on peer0.org${ORG}, Retry after $DELAY seconds."
    set -x
    peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name ${CC_NAME} >&log.txt
    res=$?
    { set +x; } 2>/dev/null
    test $res -eq 0 && VALUE=$(cat log.txt | grep -o '^Version: '$CC_VERSION', Sequence: [0-9]*, Endorsement Plugin: escc, Validation Plugin: vscc')
    test "$VALUE" = "$EXPECTED_RESULT" && let rc=0
    COUNTER=$(expr $COUNTER + 1)
  done
  cat log.txt
  if test $rc -eq 0; then
    successln "Query chaincode definition successful on peer0.org${ORG} on channel '$CHANNEL_NAME'"
  else
    fatalln "After $MAX_RETRY attempts, Query chaincode definition result on peer0.org${ORG} is INVALID!"
  fi
}

function chaincodeInvokeInit() {
  parsePeerConnectionParameters $@
  res=$?
  verifyResult $res "Invoke transaction failed on channel '$CHANNEL_NAME' due to uneven number of peer and org parameters "

  local rc=1
  local COUNTER=1
  local fcn_call='{"function":"'${CC_INIT_FCN}'","Args":[]}'
  # continue to poll
  # we either get a successful response, or reach MAX RETRY
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
    sleep $DELAY
    # while 'peer chaincode' command can get the orderer endpoint from the
    # peer (if join was successful), let's supply it directly as we know
    # it using the "-o" option
    set -x
    infoln "invoke fcn call:${fcn_call}"
    peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.legitifyapp.com --tls --cafile "$ORDERER_CA" -C $CHANNEL_NAME -n ${CC_NAME} "${PEER_CONN_PARMS[@]}" --isInit -c ${fcn_call} >&log.txt
    res=$?
    { set +x; } 2>/dev/null
    let rc=$res
    COUNTER=$(expr $COUNTER + 1)
  done
  cat log.txt
  verifyResult $res "Invoke execution on $PEERS failed "
  successln "Invoke transaction successful on $PEERS on channel '$CHANNEL_NAME'"
}

function chaincodeQuery() {
  ORG=$1
  setGlobals $ORG
  infoln "Querying on peer0.org${ORG} on channel '$CHANNEL_NAME'..."
  local rc=1
  local COUNTER=1
  # continue to poll
  # we either get a successful response, or reach MAX RETRY
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
    sleep $DELAY
    infoln "Attempting to Query peer0.org${ORG}, Retry after $DELAY seconds."
    set -x
    peer chaincode query -C $CHANNEL_NAME -n ${CC_NAME} -c '{"Args":["org.hyperledger.fabric:GetMetadata"]}' >&log.txt
    res=$?
    { set +x; } 2>/dev/null
    let rc=$res
    COUNTER=$(expr $COUNTER + 1)
  done
  cat log.txt
  if test $rc -eq 0; then
    successln "Query successful on peer0.org${ORG} on channel '$CHANNEL_NAME'"
  else
    fatalln "After $MAX_RETRY attempts, Query result on peer0.org${ORG} is INVALID!"
  fi
}

function resolveSequence() {

  #if the sequence is not "auto", then use the provided sequence
  if [[ "${CC_SEQUENCE}" != "auto" ]]; then
    return 0
  fi

  local rc=1
  local COUNTER=1
  # first, find the sequence number of the committed chaincode
  # we either get a successful response, or reach MAX RETRY
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
    set -x
    COMMITTED_CC_SEQUENCE=$(peer lifecycle chaincode querycommitted --channelID $CHANNEL_NAME --name ${CC_NAME} | sed -n "/Version:/{s/.*Sequence: //; s/, Endorsement Plugin:.*$//; p;}")
    res=$?
    { set +x; } 2>/dev/null
    let rc=$res
    COUNTER=$(expr $COUNTER + 1)
  done

  # if there are no committed versions, then set the sequence to 1
  if [ -z $COMMITTED_CC_SEQUENCE ]; then
    CC_SEQUENCE=1
    return 0
  fi

  rc=1
  COUNTER=1
  # next, find the sequence number of the approved chaincode
  # we either get a successful response, or reach MAX RETRY
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
    set -x
    APPROVED_CC_SEQUENCE=$(peer lifecycle chaincode queryapproved --channelID $CHANNEL_NAME --name ${CC_NAME} | sed -n "/sequence:/{s/^sequence: //; s/, version:.*$//; p;}")
    res=$?
    { set +x; } 2>/dev/null
    let rc=$res
    COUNTER=$(expr $COUNTER + 1)
  done

  # if the committed sequence and the approved sequence match, then increment the sequence
  # otherwise, use the approved sequence
  if [ $COMMITTED_CC_SEQUENCE == $APPROVED_CC_SEQUENCE ]; then
    CC_SEQUENCE=$((COMMITTED_CC_SEQUENCE+1))
  else
    CC_SEQUENCE=$APPROVED_CC_SEQUENCE
  fi

}

#. scripts/envVar.sh

queryInstalledOnPeer() {

  local rc=1
  local COUNTER=1
  # continue to poll
  # we either get a successful response, or reach MAX RETRY
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
    #sleep $DELAY
    #infoln "Attempting to list on peer0.org${ORG}, Retry after $DELAY seconds."
    peer lifecycle chaincode queryinstalled >&log.txt
    res=$?
    let rc=$res
    COUNTER=$(expr $COUNTER + 1)
  done
  cat log.txt
}

queryCommittedOnChannel() {
  CHANNEL=$1
  local rc=1
  local COUNTER=1
  # continue to poll
  # we either get a successful response, or reach MAX RETRY
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
    #sleep $DELAY
    #infoln "Attempting to list on peer0.org${ORG}, Retry after $DELAY seconds."
    peer lifecycle chaincode querycommitted -C $CHANNEL >&log.txt
    res=$?
    let rc=$res
    COUNTER=$(expr $COUNTER + 1)
  done
  cat log.txt
  if test $rc -ne 0; then
    fatalln "After $MAX_RETRY attempts, Failed to retrieve committed chaincode!"
  fi

}

## Function to list chaincodes installed on the peer and committed chaincode visible to the org
listAllCommitted() {

  local rc=1
  local COUNTER=1
  # continue to poll
  # we either get a successful response, or reach MAX RETRY
  while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
    CHANNEL_LIST=$(peer channel list | sed '1,1d')
    res=$?
    let rc=$res
    COUNTER=$(expr $COUNTER + 1)
  done
  if test $rc -eq 0; then
    for channel in $CHANNEL_LIST
    do
      queryCommittedOnChannel "$channel"
    done
  else
    fatalln "After $MAX_RETRY attempts, Failed to retrieve committed chaincode!"
  fi

}

function chaincodeInvoke() {
  ORG=$1
  CHANNEL=$2
  NAME=$3
  ARGS=$4
  
  # Set peer variables based on organization
  if [ "$ORG" -eq 1 ]; then
    PEER="peer0.orguniversity.com"
    PORT=7051
    PEER_TLS_ROOTCERT=${PWD}/organizations/peerOrganizations/orguniversity.com/peers/peer0.orguniversity.com/tls/ca.crt
    PEER2="peer0.orgindividual.com"
    PORT2=9051
    PEER2_TLS_ROOTCERT=${PWD}/organizations/peerOrganizations/orgindividual.com/peers/peer0.orgindividual.com/tls/ca.crt
  elif [ "$ORG" -eq 2 ]; then
    PEER="peer0.orgemployer.com"
    PORT=8051
    PEER_TLS_ROOTCERT=${PWD}/organizations/peerOrganizations/orgemployer.com/peers/peer0.orgemployer.com/tls/ca.crt
    PEER2="peer0.orgindividual.com"
    PORT2=9051
    PEER2_TLS_ROOTCERT=${PWD}/organizations/peerOrganizations/orgindividual.com/peers/peer0.orgindividual.com/tls/ca.crt
  elif [ "$ORG" -eq 3 ]; then
    PEER="peer0.orgindividual.com"
    PORT=9051
    PEER_TLS_ROOTCERT=${PWD}/organizations/peerOrganizations/orgindividual.com/peers/peer0.orgindividual.com/tls/ca.crt
    PEER2="peer0.orguniversity.com"
    PORT2=7051
    PEER2_TLS_ROOTCERT=${PWD}/organizations/peerOrganizations/orguniversity.com/peers/peer0.orguniversity.com/tls/ca.crt
  else
    errorln "ORG Unknown"
  fi
  
  infoln "Invoking on ${PEER} on channel '${CHANNEL}'..."
  
  # Define array of orderer endpoints to try
  ORDERER_ENDPOINTS=(
    "localhost:7050"
    "localhost:7052"
    "localhost:7056"
    "localhost:7058"
  )
  
  # Try each orderer until one succeeds
  for ORDERER_ENDPOINT in "${ORDERER_ENDPOINTS[@]}"; do
    infoln "Attempting to invoke using orderer at $ORDERER_ENDPOINT"
    set -x
    peer chaincode invoke -o $ORDERER_ENDPOINT \
      -C $CHANNEL \
      -n $NAME \
      -c $ARGS \
      --tls \
      --cafile $ORDERER_CA \
      --peerAddresses localhost:${PORT} \
      --tlsRootCertFiles ${PEER_TLS_ROOTCERT} \
      --peerAddresses localhost:${PORT2} \
      --tlsRootCertFiles ${PEER2_TLS_ROOTCERT} \
      --waitForEvent &> invoke_output.txt
    
    res=$?
    set +x
    
    if [ $res -eq 0 ]; then
      cat invoke_output.txt
      infoln "Invoke transaction successful using orderer at $ORDERER_ENDPOINT"
      break
    else
      warnln "Invoke failed with orderer at $ORDERER_ENDPOINT, trying next orderer..."
    fi
  done
  
  # Check if any orderer succeeded
  if [ $res -ne 0 ]; then
    cat invoke_output.txt
    errorln "Invoke failed with all available orderers"
  fi
  
  verifyResult $res "Invoke execution on $PEER failed"
  infoln "Invoke transaction successful on $PEER on channel '$CHANNEL'"
}