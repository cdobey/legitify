#!/bin/bash
set -e

# Load helper library
SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LEDGER_PATH="$(cd "${SCRIPT_PATH}/.." && pwd)"
source ${SCRIPT_PATH}/fabric-lib.sh

export PATH=${LEDGER_PATH}/bin:${SCRIPT_PATH}:$PATH
export FABRIC_CFG_PATH=${LEDGER_PATH}/config
export VERBOSE=false

# Root of the shared volume
DATA_DIR="/data"
ORG_DIR="${DATA_DIR}/organizations"
CONFIG_DIR="${DATA_DIR}/config"

infoln "Generating crypto material into ${DATA_DIR}..."

# Generate a unique crypto generation ID (timestamp + random)
CRYPTO_GEN_ID="$(date +%s)-$(head -c 8 /dev/urandom | od -An -tx1 | tr -d ' \n')"
infoln "Crypto Generation ID: ${CRYPTO_GEN_ID}"

# Always regenerate to ensure consistency
rm -rf ${ORG_DIR}/*

# Create directory structure
mkdir -p ${ORG_DIR}
mkdir -p ${CONFIG_DIR}

# Write crypto generation marker - this will be checked by init-channel.sh
# to detect crypto/ledger mismatch
echo "${CRYPTO_GEN_ID}" > ${DATA_DIR}/crypto_gen_id.txt

# Copy config files to shared volume (for orderers and peers)
infoln "Copying config files to shared volume..."
cp ${LEDGER_PATH}/config/orderer.yaml ${CONFIG_DIR}/orderer.yaml
cp ${LEDGER_PATH}/config/core.yaml ${CONFIG_DIR}/core.yaml
cp ${LEDGER_PATH}/config/configtx.yaml ${CONFIG_DIR}/configtx.yaml

# Copy ccp-template.json to data volume
cp ${LEDGER_PATH}/config/ccp-template.json ${ORG_DIR}/ccp-template.json

infoln "--- crypto-config.yaml content ---"
cat ${LEDGER_PATH}/config/crypto-config.yaml
infoln "-----------------------------------"

# Generate keys using cryptogen
infoln "Running cryptogen..."
cryptogen generate --config=${LEDGER_PATH}/config/crypto-config.yaml --output="${ORG_DIR}"
infoln "Cryptogen finished."

# Create symlink so configtx.yaml relative paths work
# configtx.yaml uses ../organizations/* paths relative to config/
# So from /src/ledger/config/, ../organizations resolves to /src/ledger/organizations
infoln "Creating organization symlink for configtxgen..."
rm -rf ${LEDGER_PATH}/organizations 2>/dev/null || true
ln -sf ${ORG_DIR} ${LEDGER_PATH}/organizations

# Generate Genesis Block
infoln "Generating Genesis Block..."
mkdir -p ${DATA_DIR}/channel-artifacts
configtxgen -profile ChannelUsingRaft -channelID legitifychannel -outputBlock ${DATA_DIR}/channel-artifacts/genesis.block -configPath ${LEDGER_PATH}/config

# Verify genesis block creation
if [ ! -f "${DATA_DIR}/channel-artifacts/genesis.block" ]; then
    fatalln "Failed to generate genesis block!"
fi

successln "Crypto generation completed."

# Generate Connection Profiles (Docker Internal)
infoln "Generating Connection Profiles..."

function one_line_pem {
    echo "`awk 'NF {sub(/\\n/, ""); printf "%s\\\\\\\n",$0;}' $1`"
}

function json_ccp {
    local ORG=$1
    
    # Read all TLS certs for all peers
    local ISSUER_TLS_PEM=$(one_line_pem "${ORG_DIR}/peerOrganizations/orgissuer.com/tlsca/tlsca.orgissuer.com-cert.pem")
    local VERIFIER_TLS_PEM=$(one_line_pem "${ORG_DIR}/peerOrganizations/orgverifier.com/tlsca/tlsca.orgverifier.com-cert.pem")
    local HOLDER_TLS_PEM=$(one_line_pem "${ORG_DIR}/peerOrganizations/orgholder.com/tlsca/tlsca.orgholder.com-cert.pem")
    
    # Read all CA certs
    local ISSUER_CA_PEM=$(one_line_pem "${ORG_DIR}/peerOrganizations/orgissuer.com/ca/ca.orgissuer.com-cert.pem")
    local VERIFIER_CA_PEM=$(one_line_pem "${ORG_DIR}/peerOrganizations/orgverifier.com/ca/ca.orgverifier.com-cert.pem")
    local HOLDER_CA_PEM=$(one_line_pem "${ORG_DIR}/peerOrganizations/orgholder.com/ca/ca.orgholder.com-cert.pem")
    local ORDERER_TLS_PEM=$(one_line_pem "${ORG_DIR}/ordererOrganizations/legitifyapp.com/tlsca/tlsca.legitifyapp.com-cert.pem")

    sed -e "s/\${ORG}/$ORG/" \
        -e "s#\${ISSUER_TLS_PEM}#$ISSUER_TLS_PEM#" \
        -e "s#\${VERIFIER_TLS_PEM}#$VERIFIER_TLS_PEM#" \
        -e "s#\${HOLDER_TLS_PEM}#$HOLDER_TLS_PEM#" \
        -e "s#\${ISSUER_CA_PEM}#$ISSUER_CA_PEM#" \
        -e "s#\${VERIFIER_CA_PEM}#$VERIFIER_CA_PEM#" \
        -e "s#\${HOLDER_CA_PEM}#$HOLDER_CA_PEM#" \
        -e "s#\${ORDERER_TLS_PEM}#$ORDERER_TLS_PEM#" \
        ${ORG_DIR}/ccp-template.json
}

# OrgIssuer
json_ccp "OrgIssuer" > "${ORG_DIR}/peerOrganizations/orgissuer.com/connection-orgissuer.json"
# OrgVerifier
json_ccp "OrgVerifier" > "${ORG_DIR}/peerOrganizations/orgverifier.com/connection-orgverifier.json"
# OrgHolder
json_ccp "OrgHolder" > "${ORG_DIR}/peerOrganizations/orgholder.com/connection-orgholder.json"

successln "Connection Profiles Generated."
