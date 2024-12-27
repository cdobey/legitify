#!/bin/bash

export PATH=${PWD}/../bin:${PWD}:$PATH
export FABRIC_CFG_PATH=${PWD}/configtx
export VERBOSE=false

# Create required directories
function createDirectories() {
    mkdir -p organizations/ordererOrganizations
    mkdir -p organizations/peerOrganizations
    mkdir -p organizations/cryptogen

    # Ensure channel-artifacts is a directory, not a file
    if [ ! -d "channel-artifacts" ]; then
        if [ -e "channel-artifacts" ]; then
            echo "Error: 'channel-artifacts' exists and is not a directory!"
            exit 1
        fi
        mkdir channel-artifacts
    fi
}

# Generate crypto materials using cryptogen
function generateCryptoMaterial() {
    which cryptogen
    if [ "$?" -ne 0 ]; then
        echo "cryptogen tool not found. Please install fabric-samples first."
        exit 1
    fi
    
    echo "Generating crypto material..."
    
    # Generate crypto config files if they don't exist
    if [ ! -f "organizations/cryptogen/crypto-config-org1.yaml" ]; then
        # Create University Org crypto config
        cat > organizations/cryptogen/crypto-config-org1.yaml << EOF
OrdererOrgs:
  - Name: Orderer
    Domain: legitify.com
    EnableNodeOUs: true
    Specs:
      - Hostname: orderer

PeerOrgs:
  - Name: UniversityOrg
    Domain: university.legitify.com
    EnableNodeOUs: true
    Template:
      Count: 1
    Users:
      Count: 1
EOF
    fi

    # Generate the crypto material
    cryptogen generate --config=./organizations/cryptogen/crypto-config-org1.yaml --output="organizations"
}

# Generate the genesis block
function generateGenesisBlock() {
    echo "Generating genesis block..."

    which configtxgen
    if [ "$?" -ne 0 ]; then
        echo "configtxgen tool not found. Please ensure Fabric binaries are installed and in PATH."
        exit 1
    fi

    # Ensure the output directory exists
    if [ ! -d "channel-artifacts" ]; then
        mkdir -p channel-artifacts
    fi

    # Remove any existing genesis block (optional: avoid stale data)
    if [ -f "channel-artifacts/genesis.block" ]; then
        echo "Removing existing genesis.block..."
        rm channel-artifacts/genesis.block
    fi

    # Generate the genesis block
    configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block

    if [ "$?" -ne 0 ]; then
        echo "Failed to generate genesis block..."
        exit 1
    fi

    echo "Genesis block generated successfully."
}

# Bring up the network
function networkUp() {
    createDirectories
    generateCryptoMaterial
    generateGenesisBlock  # NEW function added here

    # Start Docker containers
    echo "Starting Docker containers..."
    docker-compose -f docker/docker-compose-dev.yaml up -d

    if [ "$?" -ne 0 ]; then
        echo "Failed to start Docker containers..."
        exit 1
    fi
    
    # Create channel if specified
    if [ "$1" = "createChannel" ]; then
        createChannel "$2"
    fi
}


# Create channel configuration transaction
function createChannel() {
    echo "Creating channel..."
    # Generate channel creation transaction
    configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/channel1.tx -channelID "$1"
    
    if [ "$?" -ne 0 ]; then
        echo "Failed to generate channel configuration transaction..."
        exit 1
    fi
}

# Tear down the network
function networkDown() {
    echo "Shutting down network..."
    docker-compose -f docker/docker-compose-dev.yaml down --volumes --remove-orphans
    
    echo "Cleaning up generated files..."
    rm -rf organizations/peerOrganizations
    rm -rf organizations/ordererOrganizations
    rm -rf channel-artifacts/*
}

# Parse commandline args
MODE=$1
shift

case "$MODE" in
    "up")
        networkUp "$@"
        ;;
    "createChannel")
        if [ -z "$1" ]; then
            echo "Please provide channel name"
            exit 1
        fi
        networkUp "createChannel" "$1"
        ;;
    "down")
        networkDown
        ;;
    *)
        echo "Usage: $0 {up|createChannel|down}"
        exit 1
esac
