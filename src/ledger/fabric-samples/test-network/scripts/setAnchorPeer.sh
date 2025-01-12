#!/bin/bash
#
# Script to set anchor peers for a specific organization
#

# Exit on first error
set -e

# Import utilities
TEST_NETWORK_HOME=${TEST_NETWORK_HOME:-${PWD}}
. ${TEST_NETWORK_HOME}/scripts/configUpdate.sh
. ${TEST_NETWORK_HOME}/scripts/envVar.sh

# Function to create anchor peer update for a specific org
createAnchorPeerUpdate() {
  ORG=$1
  CHANNEL_NAME=$2

  infoln "Fetching channel config for channel $CHANNEL_NAME"
  fetchChannelConfig $ORG $CHANNEL_NAME ${TEST_NETWORK_HOME}/channel-artifacts/${CORE_PEER_LOCALMSPID}config.json

  infoln "Generating anchor peer update transaction for Org${ORG} on channel $CHANNEL_NAME"

  if [ $ORG -eq 1 ]; then
    HOST="peer0.orguniversity.com"
    PORT=7051
  elif [ $ORG -eq 2 ]; then
    HOST="peer0.orgemployer.com"
    PORT=8051
  elif [ $ORG -eq 3 ]; then
    HOST="peer0.orgindividual.com"
    PORT=9051
  else
    errorln "Org${ORG} unknown"
    exit 1
  fi

  set -x
  # Modify the configuration to append the anchor peer
  jq '.channel_group.groups.Application.groups.'${CORE_PEER_LOCALMSPID}'.values.AnchorPeers.value.anchor_peers += [{"host": "'$HOST'","port": '$PORT'}]' \
    ${TEST_NETWORK_HOME}/channel-artifacts/${CORE_PEER_LOCALMSPID}config.json > ${TEST_NETWORK_HOME}/channel-artifacts/${CORE_PEER_LOCALMSPID}modified_config.json
  res=$?
  { set +x; } 2>/dev/null
  verifyResult $res "Channel configuration update for anchor peer failed, make sure you have jq installed"

  # Compute a config update, based on the differences between 
  # original_config.json and modified_config.json, write it as a transaction to a unified config update file
  createConfigUpdate ${CHANNEL_NAME} \
    ${TEST_NETWORK_HOME}/channel-artifacts/${CORE_PEER_LOCALMSPID}config.json \
    ${TEST_NETWORK_HOME}/channel-artifacts/${CORE_PEER_LOCALMSPID}modified_config.json \
    ${TEST_NETWORK_HOME}/channel-artifacts/${CHANNEL_NAME}_anchor_update.pb
}

updateAnchorPeer() {
  CHANNEL_NAME=$1
  CONFIG_UPDATE_FILE=${TEST_NETWORK_HOME}/channel-artifacts/${CHANNEL_NAME}_anchor_update.pb

  # Convert the config update from protobuf to JSON
  configtxlator proto_decode --input ${CONFIG_UPDATE_FILE} --type common.ConfigUpdate | jq . > ${TEST_NETWORK_HOME}/channel-artifacts/${CHANNEL_NAME}_anchor_update.json

  # Wrap the config update in an envelope using jq
  jq -n --arg channel "mychannel" \
    --slurpfile update ./channel-artifacts/OrgUniversityMSPconfig.json \
    '{
      payload: {
        header: {
          channel_header: {
            channel_id: $channel,
            type: 2
          }
        },
        data: {
          config_update: $update[0]
        }
      }
    }' > ./channel-artifacts/config_update_in_envelope.json


  # Encode the envelope back to protobuf
  configtxlator proto_encode --input "${TEST_NETWORK_HOME}/channel-artifacts/${CHANNEL_NAME}_anchor_update_in_envelope.json" --type common.Envelope --output "${TEST_NETWORK_HOME}/channel-artifacts/${CHANNEL_NAME}_anchor_update_envelope.pb"

  # Sign the config update as all organizations
  collectSignatures "${TEST_NETWORK_HOME}/channel-artifacts/${CHANNEL_NAME}_anchor_update_envelope.pb"

  # Submit the config update
  peer channel update -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c "$CHANNEL_NAME" -f "${TEST_NETWORK_HOME}/channel-artifacts/${CHANNEL_NAME}_anchor_update_envelope.pb" --tls --cafile "$ORDERER_CA" >&log.txt
  res=$?
  cat log.txt
  verifyResult $res "Anchor peer update failed"
  successln "Anchor peer set for org '$CORE_PEER_LOCALMSPID' on channel '$CHANNEL_NAME'"
}


# Collect signatures from all organizations for a given config update file
collectSignatures() {
  CONFIG_UPDATE_FILE=$1
  for ORG in 1 2 3; do
    setGlobals $ORG
    infoln "Signing config update as Org${ORG}"
    peer channel signconfigtx -f ${CONFIG_UPDATE_FILE}
    res=$?
    verifyResult $res "Failed to sign config update as Org${ORG}"
  done
}

# Main execution
ORG=$1
CHANNEL_NAME=$2

if [ -z "$ORG" ] || [ -z "$CHANNEL_NAME" ]; then
  fatalln "Usage: setAnchorPeer.sh <Org Number> <Channel Name>"
fi

# Create the anchor peer update
setGlobals $ORG
createAnchorPeerUpdate $ORG $CHANNEL_NAME

# Update the anchor peer with collected signatures
updateAnchorPeer $CHANNEL_NAME
