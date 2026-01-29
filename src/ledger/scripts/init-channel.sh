#!/bin/bash

# Load helper library
SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LEDGER_PATH="$(cd "${SCRIPT_PATH}/.." && pwd)"
source ${SCRIPT_PATH}/fabric-lib.sh

# Environment Setup
export CRYPTO_PATH=/data
export FABRIC_CFG_PATH=${LEDGER_PATH}/config
export PATH=${LEDGER_PATH}/bin:${SCRIPT_PATH}:$PATH
export VERBOSE=false
export ORDERER_HOST=orderer.legitifyapp.com

echo "=== Fabric Network Initialization ==="
infoln "CRYPTO_PATH: ${CRYPTO_PATH}"
infoln "FABRIC_CFG_PATH: ${FABRIC_CFG_PATH}"

# Check for crypto generation marker
if [ -f "${CRYPTO_PATH}/crypto_gen_id.txt" ]; then
    CRYPTO_GEN_ID=$(cat ${CRYPTO_PATH}/crypto_gen_id.txt)
    infoln "Crypto Generation ID: ${CRYPTO_GEN_ID}"
else
    warnln "No crypto generation marker found - this may indicate incomplete initialization"
fi

# Create symlink so configtx.yaml relative paths work
# configtx.yaml uses ../organizations/* paths relative to config/
infoln "Creating organization symlink for configtxgen..."
rm -rf ${LEDGER_PATH}/organizations 2>/dev/null || true
ln -sf ${CRYPTO_PATH}/organizations ${LEDGER_PATH}/organizations

# Also create channel-artifacts symlink to shared volume
rm -rf ${LEDGER_PATH}/channel-artifacts 2>/dev/null || true
mkdir -p ${CRYPTO_PATH}/channel-artifacts
ln -sf ${CRYPTO_PATH}/channel-artifacts ${LEDGER_PATH}/channel-artifacts

# --- Helper Functions ---

# Check connectivity
wait_for_peer() {
    local HOST=$1
    local PORT=$2
    local RETRIES=30
    infoln "Waiting for $HOST:$PORT..."
    while ! (echo > /dev/tcp/$HOST/$PORT) 2>/dev/null; do
        ((RETRIES--))
        if [ $RETRIES -le 0 ]; then
            fatalln "Timeout waiting for $HOST:$PORT"
        fi
        echo "  Retrying ($RETRIES left)..."
        sleep 2
    done
    successln "$HOST:$PORT is up!"
}

# Check if peer joined channel
peer_on_channel() {
    local ORG=$1
    local CHANNEL=$2
    setGlobals $ORG
    peer channel list 2>/dev/null | grep -q "^${CHANNEL}$"
}

# Check if chaincode is committed
chaincode_committed() {
    local CHANNEL=$1
    local CC_NAME=$2
    setGlobals 1
    peer lifecycle chaincode querycommitted --channelID ${CHANNEL} --name ${CC_NAME} 2>/dev/null | grep -q "Version:"
}

# --- Initialization Flow ---

# 1. Wait for Infrastructure
wait_for_peer orderer.legitifyapp.com 7050
wait_for_peer peer0.orgissuer.com 7051
wait_for_peer peer0.orgverifier.com 8051
wait_for_peer peer0.orgholder.com 9051

# 2. Channel Join
CHANNEL_NAME="legitifychannel"
BLOCKFILE="${LEDGER_PATH}/channel-artifacts/genesis.block"

# Check if peers are on channel
PEERS_ON_CHANNEL=false
if peer_on_channel 1 ${CHANNEL_NAME} && peer_on_channel 2 ${CHANNEL_NAME} && peer_on_channel 3 ${CHANNEL_NAME}; then
    PEERS_ON_CHANNEL=true
fi

# If peers are on channel, verify crypto material matches by attempting a simple query
if [ "$PEERS_ON_CHANNEL" = true ]; then
    infoln "Peers report being on channel, verifying crypto material compatibility..."
    setGlobals 1
    
    # Try to query committed chaincodes - this will fail if crypto doesn't match
    if peer lifecycle chaincode querycommitted --channelID ${CHANNEL_NAME} 2>&1 | grep -q "access denied\|unknown authority\|creator is malformed"; then
        errorln "CRITICAL: Crypto material mismatch detected!"
        errorln "The peers have old ledger data but new crypto material was generated."
        errorln ""
        errorln "To fix this, you must delete ALL Docker volumes in Coolify:"
        errorln "  - fabric_data"
        errorln "  - orderer_data"
        errorln "  - peer0_orgissuer, peer0_orgverifier, peer0_orgholder"
        errorln ""
        errorln "Then redeploy to start fresh."
        fatalln "Aborting due to crypto/ledger mismatch"
    fi
    
    successln "Crypto material verified - all peers are already on channel '${CHANNEL_NAME}', skipping join..."
else
    infoln "Joining peers to Channel '${CHANNEL_NAME}'..."
    
    # Join Peers
    for ORG in 1 2 3; do
        infoln "Joining Org${ORG} peer to channel..."
        setGlobals ${ORG}
        peer channel join -b ${BLOCKFILE}
    done
    
    successln "Peers joined channel '${CHANNEL_NAME}' successfully."
fi

# 3. Chaincode Deployment
CC_NAME="credentialCC"
CC_VERSION="1.0"
CC_SEQUENCE="1"

if chaincode_committed ${CHANNEL_NAME} ${CC_NAME}; then
    successln "Chaincode '${CC_NAME}' is already committed."
    exit 0
fi

infoln "Deploying Chaincode '${CC_NAME}' via CCaaS..."
CC_ADDRESS="credential-chaincode:9999"
CCAAS_DIR="/tmp/ccaas"
mkdir -p ${CCAAS_DIR}

# Create CCaaS package
cat > ${CCAAS_DIR}/connection.json << EOF
{
  "address": "${CC_ADDRESS}",
  "dial_timeout": "10s",
  "tls_required": false
}
EOF

cd ${CCAAS_DIR}
tar cfz code.tar.gz connection.json
cat > metadata.json << EOF
{
  "type": "ccaas",
  "label": "${CC_NAME}_${CC_VERSION}"
}
EOF
tar cfz ${CC_NAME}.tar.gz code.tar.gz metadata.json

# Calculate package ID
PACKAGE_ID=$(peer lifecycle chaincode calculatepackageid ${CC_NAME}.tar.gz)
infoln "Package ID: ${PACKAGE_ID}"
echo "${PACKAGE_ID}" > /data/chaincode_package_id.txt

# Install, Approve, Commit
for ORG in 1 2 3; do
    setGlobals ${ORG}
    infoln "Installing chaincode on Org${ORG}..."
    peer lifecycle chaincode install ${CC_NAME}.tar.gz
    
    # Approve with retries
    infoln "Approving chaincode for Org${ORG}..."
    rc=1
    counter=1
    while [[ $rc -ne 0 && $counter -lt 6 ]]; do
        peer lifecycle chaincode approveformyorg \
            -o ${ORDERER_HOST}:7050 --tls --cafile "${ORDERER_CA}" \
            --channelID ${CHANNEL_NAME} --name ${CC_NAME} --version ${CC_VERSION} \
            --package-id ${PACKAGE_ID} --sequence ${CC_SEQUENCE}
        rc=$?
        if [[ $rc -ne 0 ]]; then
            warnln "Approval failed for Org${ORG}, retrying in 3s... ($counter/5)"
            sleep 3
            counter=$((counter + 1))
        fi
    done
    if [[ $rc -ne 0 ]]; then fatalln "Failed to approve chaincode for Org${ORG} after 5 attempts"; fi
done

# Commit with retries
infoln "Committing chaincode..."
rc=1
counter=1
while [[ $rc -ne 0 && $counter -lt 6 ]]; do
    peer lifecycle chaincode commit \
        -o ${ORDERER_HOST}:7050 --tls --cafile "${ORDERER_CA}" \
        --channelID ${CHANNEL_NAME} --name ${CC_NAME} --version ${CC_VERSION} --sequence ${CC_SEQUENCE} \
        --peerAddresses peer0.orgissuer.com:7051 --tlsRootCertFiles ${PEER0_ORGISSUER_CA} \
        --peerAddresses peer0.orgverifier.com:8051 --tlsRootCertFiles ${PEER0_ORGVERIFIER_CA} \
        --peerAddresses peer0.orgholder.com:9051 --tlsRootCertFiles ${PEER0_ORG_HOLDER_CA}
    rc=$?
    if [[ $rc -ne 0 ]]; then
        warnln "Commit failed, retrying in 3s... ($counter/5)"
        sleep 3
        counter=$((counter + 1))
    fi
done
if [[ $rc -ne 0 ]]; then fatalln "Failed to commit chaincode after 5 attempts"; fi

successln "Network initialization completed successfully!"
