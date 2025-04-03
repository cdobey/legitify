#!/bin/bash

# This script adds a new organization to the legitify network

# Import utilities
. scripts/utils.sh
. scripts/envVar.sh

# Source the ledger environment variables
. ./ledger.env

# Default values
CHANNEL_NAME="${CHANNEL_NAME:-legitifychannel}"  # Use env var with fallback
ORG_NAME=""
ORG_MSP_ID=""
CA_PORT=0
PEER_PORT=0
ORG_TYPE="university" # university, employer, individual
CC_NAME="degreeCC"
CC_VERSION="1.0"
CC_SEQUENCE=1 # Get this from current network

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
  -c|--channel)
    CHANNEL_NAME="$2"
    shift 2
    ;;
  -o|--org)
    ORG_NAME="$2"
    shift 2
    ;;
  -m|--msp)
    ORG_MSP_ID="$2"
    shift 2
    ;;
  -p|--caport)
    CA_PORT="$2"
    shift 2
    ;;
  -r|--peerport)
    PEER_PORT="$2"
    shift 2
    ;;
  -t|--type)
    ORG_TYPE="$2"
    shift 2
    ;;
  -s|--sequence)
    CC_SEQUENCE="$2"
    shift 2
    ;;
  *)
    errorln "Unknown flag: $key"
    exit 1
    ;;
  esac
done

# Validate inputs
if [ -z "$ORG_NAME" ]; then
  errorln "Organization name is required with -o or --org"
  exit 1
fi

if [ -z "$ORG_MSP_ID" ]; then
  ORG_MSP_ID="${ORG_NAME}MSP"
  infoln "Setting MSP ID to $ORG_MSP_ID"
fi

if [ $CA_PORT -eq 0 ]; then
  # Find an available port
  CA_PORT=11054
  infoln "Setting CA port to $CA_PORT"
fi

if [ $PEER_PORT -eq 0 ]; then
  # Find an available port
  PEER_PORT=10051
  infoln "Setting peer port to $PEER_PORT"
fi

FABRIC_CFG_PATH=$PWD/config/
echo "Config path: ${FABRIC_CFG_PATH}"

##############################################################
# STEP 1: Set up a new CA for the organization
##############################################################
infoln "Setting up Fabric CA for $ORG_NAME"

# Create CA directories
mkdir -p organizations/fabric-ca/$ORG_NAME

# Copy CA config from an existing organization of the same type
if [ "$ORG_TYPE" = "university" ]; then
  cp -r organizations/fabric-ca/orguniversity/fabric-ca-server-config.yaml organizations/fabric-ca/$ORG_NAME/
elif [ "$ORG_TYPE" = "employer" ]; then
  cp -r organizations/fabric-ca/orgemployer/fabric-ca-server-config.yaml organizations/fabric-ca/$ORG_NAME/
elif [ "$ORG_TYPE" = "individual" ]; then
  cp -r organizations/fabric-ca/orgindividual/fabric-ca-server-config.yaml organizations/fabric-ca/$ORG_NAME/
else
  errorln "Unknown organization type: $ORG_TYPE"
  exit 1
fi

# Create docker-compose file for the new CA
cat << EOF > docker/ca-$ORG_NAME.yaml
version: '3.7'

networks:
  test:
    external: true
    name: fabric_test

services:
  ca.$ORG_NAME.com:
    image: hyperledger/fabric-ca:1.5
    labels:
      service: hyperledger-fabric
    environment:
      - FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server
      - FABRIC_CA_SERVER_CA_NAME=ca-$ORG_NAME
      - FABRIC_CA_SERVER_TLS_ENABLED=true
      - FABRIC_CA_SERVER_PORT=$CA_PORT
      - FABRIC_CA_SERVER_OPERATIONS_LISTENADDRESS=0.0.0.0:$(($CA_PORT + 10000))
      - FABRIC_CA_SERVER_CSR_HOSTS=ca.$ORG_NAME.com,localhost,localhost
    ports:
      - '$CA_PORT:$CA_PORT'
      - '$(($CA_PORT + 10000)):$(($CA_PORT + 10000))'
    command: sh -c 'fabric-ca-server start -b admin:adminpw -d'
    volumes:
      - ../organizations/fabric-ca/$ORG_NAME:/etc/hyperledger/fabric-ca-server
    container_name: ca.$ORG_NAME.com
    networks:
      - test
EOF

# Start the new CA
docker-compose -f docker/ca-$ORG_NAME.yaml up -d

# Wait for CA to start
sleep 5
infoln "Waiting for CA to start..."
while [ ! -f "organizations/fabric-ca/$ORG_NAME/ca-cert.pem" ]; do
  sleep 1
done

##############################################################
# STEP 2: Register and enroll identities for the new organization
##############################################################
infoln "Enrolling the CA admin for $ORG_NAME"

# Add a function to register and enroll users for the new org
function createNewOrg() {
  local ORG=$1
  local CA_PORT=$2
  local DOMAIN="${ORG}.com"

  infoln "Enrolling the CA admin"
  mkdir -p organizations/peerOrganizations/$DOMAIN/

  export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/$DOMAIN/

  set -x
  fabric-ca-client enroll -u https://admin:adminpw@localhost:$CA_PORT --caname ca-$ORG --tls.certfiles "${PWD}/organizations/fabric-ca/$ORG/ca-cert.pem"
  { set +x; } 2>/dev/null

  echo 'NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-'$CA_PORT'-ca-'$ORG'.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-'$CA_PORT'-ca-'$ORG'.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-'$CA_PORT'-ca-'$ORG'.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-'$CA_PORT'-ca-'$ORG'.pem
    OrganizationalUnitIdentifier: orderer' > "${PWD}/organizations/peerOrganizations/$DOMAIN/msp/config.yaml"

  # Copy org's CA cert to org's /msp/tlscacerts directory
  mkdir -p "${PWD}/organizations/peerOrganizations/$DOMAIN/msp/tlscacerts"
  cp "${PWD}/organizations/fabric-ca/$ORG/ca-cert.pem" "${PWD}/organizations/peerOrganizations/$DOMAIN/msp/tlscacerts/ca.crt"

  # Copy org's CA cert to org's /tlsca directory
  mkdir -p "${PWD}/organizations/peerOrganizations/$DOMAIN/tlsca"
  cp "${PWD}/organizations/fabric-ca/$ORG/ca-cert.pem" "${PWD}/organizations/peerOrganizations/$DOMAIN/tlsca/tlsca.$DOMAIN-cert.pem"

  # Copy org's CA cert to org's /ca directory
  mkdir -p "${PWD}/organizations/peerOrganizations/$DOMAIN/ca"
  cp "${PWD}/organizations/fabric-ca/$ORG/ca-cert.pem" "${PWD}/organizations/peerOrganizations/$DOMAIN/ca/ca.$DOMAIN-cert.pem"

  # Register identities if they don't exist
  infoln "Registering peer0"
  set -x
  fabric-ca-client register --caname ca-$ORG --id.name peer0 --id.secret peer0pw --id.type peer --tls.certfiles "${PWD}/organizations/fabric-ca/$ORG/ca-cert.pem" || true
  { set +x; } 2>/dev/null

  infoln "Registering user"
  set -x
  fabric-ca-client register --caname ca-$ORG --id.name user1 --id.secret user1pw --id.type client --tls.certfiles "${PWD}/organizations/fabric-ca/$ORG/ca-cert.pem" || true
  { set +x; } 2>/dev/null

  infoln "Registering the org admin"
  set -x
  fabric-ca-client register --caname ca-$ORG --id.name ${ORG}admin --id.secret ${ORG}adminpw --id.type admin --tls.certfiles "${PWD}/organizations/fabric-ca/$ORG/ca-cert.pem" || true
  { set +x; } 2>/dev/null

  infoln "Generating the peer0 msp"
  set -x
  fabric-ca-client enroll -u https://peer0:peer0pw@localhost:$CA_PORT --caname ca-$ORG -M "${PWD}/organizations/peerOrganizations/$DOMAIN/peers/peer0.$DOMAIN/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/$ORG/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/$DOMAIN/msp/config.yaml" "${PWD}/organizations/peerOrganizations/$DOMAIN/peers/peer0.$DOMAIN/msp/config.yaml"

  infoln "Generating the peer0-tls certificates"
  set -x
  fabric-ca-client enroll -u https://peer0:peer0pw@localhost:$CA_PORT --caname ca-$ORG -M "${PWD}/organizations/peerOrganizations/$DOMAIN/peers/peer0.$DOMAIN/tls" --enrollment.profile tls --csr.hosts peer0.$DOMAIN --csr.hosts localhost --csr.hosts localhost --tls.certfiles "${PWD}/organizations/fabric-ca/$ORG/ca-cert.pem"
  { set +x; } 2>/dev/null

  # Copy the TLS certificates to the correct locations
  mkdir -p "${PWD}/organizations/peerOrganizations/$DOMAIN/peers/peer0.$DOMAIN/tls"
  cp "${PWD}/organizations/peerOrganizations/$DOMAIN/peers/peer0.$DOMAIN/tls/tlscacerts/"* "${PWD}/organizations/peerOrganizations/$DOMAIN/peers/peer0.$DOMAIN/tls/ca.crt" || true
  cp "${PWD}/organizations/peerOrganizations/$DOMAIN/peers/peer0.$DOMAIN/tls/signcerts/"* "${PWD}/organizations/peerOrganizations/$DOMAIN/peers/peer0.$DOMAIN/tls/server.crt" || true
  find "${PWD}/organizations/peerOrganizations/$DOMAIN/peers/peer0.$DOMAIN/tls/keystore/" -type f -exec cp {} "${PWD}/organizations/peerOrganizations/$DOMAIN/peers/peer0.$DOMAIN/tls/server.key" \; || true

  infoln "Generating the user msp"
  set -x
  fabric-ca-client enroll -u https://user1:user1pw@localhost:$CA_PORT --caname ca-$ORG -M "${PWD}/organizations/peerOrganizations/$DOMAIN/users/User1@$DOMAIN/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/$ORG/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/$DOMAIN/msp/config.yaml" "${PWD}/organizations/peerOrganizations/$DOMAIN/users/User1@$DOMAIN/msp/config.yaml"

  infoln "Generating the org admin msp"
  set -x
  fabric-ca-client enroll -u https://${ORG}admin:${ORG}adminpw@localhost:$CA_PORT --caname ca-$ORG -M "${PWD}/organizations/peerOrganizations/$DOMAIN/users/Admin@$DOMAIN/msp" --tls.certfiles "${PWD}/organizations/fabric-ca/$ORG/ca-cert.pem"
  { set +x; } 2>/dev/null

  cp "${PWD}/organizations/peerOrganizations/$DOMAIN/msp/config.yaml" "${PWD}/organizations/peerOrganizations/$DOMAIN/users/Admin@$DOMAIN/msp/config.yaml"
}

# Call the function to create the new org
createNewOrg $ORG_NAME $CA_PORT

##############################################################
# STEP 3: Create peer container for the new organization
##############################################################
infoln "Creating docker-compose file for peer0.$ORG_NAME.com"

cat << EOF > docker/docker-$ORG_NAME.yaml
version: '3.7'

volumes:
  peer0.$ORG_NAME.com:

networks:
  test:
    external: true
    name: fabric_test

services:
  peer0.$ORG_NAME.com:
    container_name: peer0.$ORG_NAME.com
    image: hyperledger/fabric-peer:2.5.10
    labels:
      service: hyperledger-fabric
    environment:
      #Generic peer variables
      - CORE_VM_ENDPOINT=unix:///host/var/run/docker.sock
      - CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE=fabric_test
      - FABRIC_CFG_PATH=/etc/hyperledger/peercfg
      - FABRIC_LOGGING_SPEC=INFO
      - CORE_PEER_TLS_ENABLED=true
      - CORE_PEER_PROFILE_ENABLED=false
      - CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt
      - CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key
      - CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt
      # Peer specific variables
      - CORE_PEER_ID=peer0.$ORG_NAME.com
      - CORE_PEER_ADDRESS=peer0.$ORG_NAME.com:$PEER_PORT
      - CORE_PEER_LISTENADDRESS=0.0.0.0:$PEER_PORT
      - CORE_PEER_CHAINCODEADDRESS=peer0.$ORG_NAME.com:$(($PEER_PORT + 1))
      - CORE_PEER_CHAINCODELISTENADDRESS=0.0.0.0:$(($PEER_PORT + 1))
      - CORE_PEER_GOSSIP_BOOTSTRAP=peer0.$ORG_NAME.com:$PEER_PORT
      - CORE_PEER_GOSSIP_EXTERNALENDPOINT=peer0.$ORG_NAME.com:$PEER_PORT
      - CORE_PEER_LOCALMSPID=$ORG_MSP_ID
      - CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/msp
      - CORE_OPERATIONS_LISTENADDRESS=peer0.$ORG_NAME.com:$(($PEER_PORT + 2000))
      - CORE_METRICS_PROVIDER=prometheus
      - CORE_CHAINCODE_EXECUTETIMEOUT=300s
    volumes:
      - ../organizations/peerOrganizations/$ORG_NAME.com/peers/peer0.$ORG_NAME.com:/etc/hyperledger/fabric
      - peer0.$ORG_NAME.com:/var/hyperledger/production
      - ../config:/etc/hyperledger/peercfg
      - \${DOCKER_SOCK:-/var/run/docker.sock}:/host/var/run/docker.sock
    working_dir: /root
    command: peer node start
    ports:
      - $PEER_PORT:$PEER_PORT
      - $(($PEER_PORT + 1)):$(($PEER_PORT + 1))
      - $(($PEER_PORT + 2000)):$(($PEER_PORT + 2000))
    networks:
      - test
EOF

infoln "Starting peer0.$ORG_NAME.com"
docker-compose -f docker/docker-$ORG_NAME.yaml up -d

##############################################################
# STEP 4: Update the envVar.sh script to include the new org
##############################################################
infoln "Updating envVar.sh to include $ORG_NAME"

# Update envVar.sh by adding the new organization
ENV_VAR_FILE="scripts/envVar.sh"
PEER_CA_VAR="export PEER0_${ORG_MSP_ID}_CA=${PWD}/organizations/peerOrganizations/$ORG_NAME.com/tlsca/tlsca.$ORG_NAME.com-cert.pem"

# Check if the org is already in the file
if ! grep -q "$PEER_CA_VAR" "$ENV_VAR_FILE"; then
  echo "
# New Organization
$PEER_CA_VAR" >> "$ENV_VAR_FILE"
fi

# Check if the org is already in the setGlobals function
if ! grep -q "USING_ORG -eq 4" "$ENV_VAR_FILE"; then
  # Find the end of the setGlobals function before adding a new condition
  SET_GLOBALS_END=$(grep -n "else" "$ENV_VAR_FILE" | grep "ORG Unknown" | cut -d':' -f1)
  
  if [ -n "$SET_GLOBALS_END" ]; then
    # Create a temporary file for the updated content
    TMP_FILE=$(mktemp)
    
    # Split the file at the line number and insert the new condition
    head -n $((SET_GLOBALS_END - 1)) "$ENV_VAR_FILE" > "$TMP_FILE"
    cat << EOF >> "$TMP_FILE"
  elif [ \$USING_ORG -eq 4 ]; then
    export CORE_PEER_LOCALMSPID=$ORG_MSP_ID
    export CORE_PEER_TLS_ROOTCERT_FILE=\$PEER0_${ORG_MSP_ID}_CA
    export CORE_PEER_MSPCONFIGPATH=\${TEST_NETWORK_HOME}/organizations/peerOrganizations/$ORG_NAME.com/users/Admin@$ORG_NAME.com/msp
    export CORE_PEER_ADDRESS=localhost:$PEER_PORT
EOF
    tail -n +$SET_GLOBALS_END "$ENV_VAR_FILE" >> "$TMP_FILE"
    
    # Replace the original file
    mv "$TMP_FILE" "$ENV_VAR_FILE"
  else
    errorln "Could not find the right location to update setGlobals function in $ENV_VAR_FILE"
  fi
fi

##############################################################
# STEP 5: Create configuration json for the new org
##############################################################
infoln "Creating config json for $ORG_NAME"

mkdir -p channel-artifacts

# Fetch the latest config block from the channel
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/legitifyapp.com/tlsca/tlsca.legitifyapp.com-cert.pem
export ORDERER_ADMIN_TLS_SIGN_CERT=${PWD}/organizations/ordererOrganizations/legitifyapp.com/orderers/orderer.legitifyapp.com/tls/server.crt
export ORDERER_ADMIN_TLS_PRIVATE_KEY=${PWD}/organizations/ordererOrganizations/legitifyapp.com/orderers/orderer.legitifyapp.com/tls/server.key

# Set environment for one of the existing organizations
setGlobals 1

# Fetch the latest config block
peer channel fetch config channel-artifacts/config_block.pb -o localhost:7050 --ordererTLSHostnameOverride orderer.legitifyapp.com -c $CHANNEL_NAME --tls --cafile $ORDERER_CA

# Convert the config block to JSON format
configtxlator proto_decode --input channel-artifacts/config_block.pb --type common.Block --output channel-artifacts/config_block.json
jq '.data.data[0].payload.data.config' channel-artifacts/config_block.json > channel-artifacts/config.json

# Create a modified config with the new org
jq '.channel_group.groups.Application.groups.'$ORG_MSP_ID' = { 
  "mod_policy": "Admins",
  "policies": {
    "Admins": {
      "mod_policy": "Admins",
      "policy": {
        "type": 1,
        "value": {
          "identities": [
            {
              "principal": {
                "msp_identifier": "'$ORG_MSP_ID'",
                "role": "ADMIN"
              },
              "principal_classification": "ROLE"
            }
          ],
          "rule": {
            "n_out_of": {
              "n": 1,
              "rules": [
                {
                  "signed_by": 0
                }
              ]
            }
          }
        }
      },
      "version": "0"
    },
    "Endorsement": {
      "mod_policy": "Admins",
      "policy": {
        "type": 1,
        "value": {
          "identities": [
            {
              "principal": {
                "msp_identifier": "'$ORG_MSP_ID'",
                "role": "PEER"
              },
              "principal_classification": "ROLE"
            }
          ],
          "rule": {
            "n_out_of": {
              "n": 1,
              "rules": [
                {
                  "signed_by": 0
                }
              ]
            }
          }
        }
      },
      "version": "0"
    },
    "Readers": {
      "mod_policy": "Admins",
      "policy": {
        "type": 1,
        "value": {
          "identities": [
            {
              "principal": {
                "msp_identifier": "'$ORG_MSP_ID'",
                "role": "MEMBER"
              },
              "principal_classification": "ROLE"
            }
          ],
          "rule": {
            "n_out_of": {
              "n": 1,
              "rules": [
                {
                  "signed_by": 0
                }
              ]
            }
          }
        }
      },
      "version": "0"
    },
    "Writers": {
      "mod_policy": "Admins",
      "policy": {
        "type": 1,
        "value": {
          "identities": [
            {
              "principal": {
                "msp_identifier": "'$ORG_MSP_ID'",
                "role": "MEMBER"
              },
              "principal_classification": "ROLE"
            }
          ],
          "rule": {
            "n_out_of": {
              "n": 1,
              "rules": [
                {
                  "signed_by": 0
                }
              ]
            }
          }
        }
      },
      "version": "0"
    }
  },
  "values": {
    "MSP": {
      "mod_policy": "Admins",
      "value": {
        "config": {
          "admins": [],
          "crypto_config": {
            "identity_identifier_hash_function": "SHA256",
            "signature_hash_family": "SHA2"
          },
          "fabric_node_ous": {
            "admin_ou_identifier": {
              "certificate": "'$(cat organizations/peerOrganizations/$ORG_NAME.com/msp/cacerts/localhost-$CA_PORT-ca-$ORG_NAME.pem | base64 | tr -d "\n")'",
              "organizational_unit_identifier": "admin"
            },
            "client_ou_identifier": {
              "certificate": "'$(cat organizations/peerOrganizations/$ORG_NAME.com/msp/cacerts/localhost-$CA_PORT-ca-$ORG_NAME.pem | base64 | tr -d "\n")'",
              "organizational_unit_identifier": "client"
            },
            "enable": true,
            "orderer_ou_identifier": {
              "certificate": "'$(cat organizations/peerOrganizations/$ORG_NAME.com/msp/cacerts/localhost-$CA_PORT-ca-$ORG_NAME.pem | base64 | tr -d "\n")'",
              "organizational_unit_identifier": "orderer"
            },
            "peer_ou_identifier": {
              "certificate": "'$(cat organizations/peerOrganizations/$ORG_NAME.com/msp/cacerts/localhost-$CA_PORT-ca-$ORG_NAME.pem | base64 | tr -d "\n")'",
              "organizational_unit_identifier": "peer"
            }
          },
          "intermediate_certs": [],
          "name": "'$ORG_MSP_ID'",
          "organizational_unit_identifiers": [],
          "revocation_list": [],
          "root_certs": [
            "'$(cat organizations/peerOrganizations/$ORG_NAME.com/msp/cacerts/localhost-$CA_PORT-ca-$ORG_NAME.pem | base64 | tr -d "\n")'"
          ],
          "signing_identity": null,
          "tls_intermediate_certs": [],
          "tls_root_certs": [
            "'$(cat organizations/peerOrganizations/$ORG_NAME.com/msp/tlscacerts/ca.crt | base64 | tr -d "\n")'"
          ]
        },
        "type": 0
      },
      "version": "0"
    },
    "AnchorPeers": {
      "mod_policy": "Admins",
      "value": {
        "anchor_peers": [
          {
            "host": "peer0.'$ORG_NAME'.com",
            "port": '$PEER_PORT'
          }
        ]
      },
      "version": "0"
    }
  },
  "version": "0"
}' channel-artifacts/config.json > channel-artifacts/modified_config.json

# Create the config update
configtxlator proto_encode --input channel-artifacts/config.json --type common.Config --output channel-artifacts/config.pb
configtxlator proto_encode --input channel-artifacts/modified_config.json --type common.Config --output channel-artifacts/modified_config.pb
configtxlator compute_update --channel_id $CHANNEL_NAME --original channel-artifacts/config.pb --updated channel-artifacts/modified_config.pb --output channel-artifacts/config_update.pb

# Convert config update to JSON and wrap it
configtxlator proto_decode --input channel-artifacts/config_update.pb --type common.ConfigUpdate --output channel-artifacts/config_update.json
echo '{"payload":{"header":{"channel_header":{"channel_id":"'$CHANNEL_NAME'", "type":2}},"data":{"config_update":'$(cat channel-artifacts/config_update.json)'}}}'  > channel-artifacts/config_update_in_envelope.json
configtxlator proto_encode --input channel-artifacts/config_update_in_envelope.json --type common.Envelope --output channel-artifacts/${ORG_NAME}"_update_in_envelope.pb"

##############################################################
# STEP 6: Sign the config update by existing organizations
##############################################################
infoln "Signing the config update by existing organizations"

# Sign with org 1 (already set)
peer channel signconfigtx -f channel-artifacts/${ORG_NAME}"_update_in_envelope.pb"

# Sign with org 2
setGlobals 2
peer channel signconfigtx -f channel-artifacts/${ORG_NAME}"_update_in_envelope.pb"

# Sign with org 3
setGlobals 3
peer channel signconfigtx -f channel-artifacts/${ORG_NAME}"_update_in_envelope.pb"

# Now update the channel configuration
infoln "Submitting the config update to the channel"
peer channel update -f channel-artifacts/${ORG_NAME}"_update_in_envelope.pb" -c $CHANNEL_NAME -o localhost:7050 --ordererTLSHostnameOverride orderer.legitifyapp.com --tls --cafile $ORDERER_CA

# Wait for the update to propagate
sleep 5

##############################################################
# STEP 7: Join the new org's peer to the channel
##############################################################
infoln "Joining peer0.$ORG_NAME.com to the channel"

# Source the updated environment
. scripts/envVar.sh

# Fetch the genesis block for the channel
setGlobals 1
peer channel fetch 0 channel-artifacts/$CHANNEL_NAME.block -o localhost:7050 --ordererTLSHostnameOverride orderer.legitifyapp.com -c $CHANNEL_NAME --tls --cafile $ORDERER_CA

# Set environment for the new organization
export CORE_PEER_LOCALMSPID=$ORG_MSP_ID
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/$ORG_NAME.com/peers/peer0.$ORG_NAME.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/$ORG_NAME.com/users/Admin@$ORG_NAME.com/msp
export CORE_PEER_ADDRESS=localhost:$PEER_PORT

# Join the peer to the channel - handle existing peers gracefully
peer channel join -b channel-artifacts/$CHANNEL_NAME.block || true

##############################################################
# STEP 8: Install and approve chaincode for the new org
##############################################################
infoln "Installing chaincode on peer0.$ORG_NAME.com"

# Get current chaincode details
setGlobals 1
CC_VERSION=$(peer lifecycle chaincode querycommitted -C $CHANNEL_NAME -n $CC_NAME --output json 2>/dev/null | jq -r '.version')
CC_SEQUENCE=$(peer lifecycle chaincode querycommitted -C $CHANNEL_NAME -n $CC_NAME --output json 2>/dev/null | jq -r '.sequence')

if [ -z "$CC_VERSION" ] || [ "$CC_VERSION" = "null" ]; then
  CC_VERSION="1.0"
fi

if [ -z "$CC_SEQUENCE" ] || [ "$CC_SEQUENCE" = "null" ]; then
  CC_SEQUENCE=1
fi

infoln "Using chaincode version: $CC_VERSION and sequence: $CC_SEQUENCE"

# Set environment for the new organization
export CORE_PEER_LOCALMSPID=$ORG_MSP_ID
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/$ORG_NAME.com/peers/peer0.$ORG_NAME.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/$ORG_NAME.com/users/Admin@$ORG_NAME.com/msp
export CORE_PEER_ADDRESS=localhost:$PEER_PORT

# Install the chaincode package
peer lifecycle chaincode install ${CC_NAME}.tar.gz || true

# Get the package ID
PACKAGE_ID=$(peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[] | select(.label == "'$CC_NAME'_'$CC_VERSION'") | .package_id')
if [ -z "$PACKAGE_ID" ]; then
  # If not found by label, get the first one for the chain code name
  PACKAGE_ID=$(peer lifecycle chaincode queryinstalled --output json | jq -r '.installed_chaincodes[] | select(.label | startswith("'$CC_NAME'")) | .package_id' | head -1)
fi

echo "Package ID: $PACKAGE_ID"

# Approve the chaincode for the new organization
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.legitifyapp.com --tls --cafile $ORDERER_CA --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --package-id $PACKAGE_ID --sequence $CC_SEQUENCE || true

# Check commit readiness
peer lifecycle chaincode checkcommitreadiness --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --sequence $CC_SEQUENCE --output json

infoln "New organization $ORG_NAME has been added to the channel $CHANNEL_NAME successfully!"

##############################################################
# STEP 9: Update connection profiles
##############################################################
infoln "Updating connection profiles to include $ORG_NAME"

# Update the ccp-generate.sh script
if [ -f "organizations/ccp-generate.sh" ]; then
  ./scripts/updateNetworkConfig.sh -o $ORG_NAME -m $ORG_MSP_ID -p $PEER_PORT -c $CA_PORT
fi
