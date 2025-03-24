#!/bin/bash
#
# Hyperledger Fabric setup script - installs binaries and pulls Docker images

# Process arguments and set defaults
while [ $# -gt 0 ]; do
  case "$1" in
    --fabric-version|-f)
      FABRIC_VERSION="$2"
      shift 2
      ;;
    --ca-version|-c)
      CA_VERSION="$2"
      shift 2
      ;;
    binary|bin)
      INSTALL_BINARY=true
      shift
      ;;
    docker|images)
      PULL_DOCKER=true
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS] [COMPONENTS]"
      echo "Options:"
      echo "  --fabric-version, -f VERSION  Fabric version to install (default: 2.5.10)"
      echo "  --ca-version, -c VERSION      Fabric CA version to install (default: 1.5.13)"
      echo "Components:"
      echo "  binary, bin                   Install binary components"
      echo "  docker, images                Pull Docker images"
      echo "If no components specified, only binaries will be installed"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Default versions if not specified
FABRIC_VERSION="${FABRIC_VERSION:-2.5.10}"
CA_VERSION="${CA_VERSION:-1.5.13}"

# Default to binary install if no components specified
if [ "$INSTALL_BINARY" != "true" ] && [ "$PULL_DOCKER" != "true" ]; then
  INSTALL_BINARY=true
fi

# Set platform info
OS=$(uname -s|tr '[:upper:]' '[:lower:]'|sed 's/mingw64_nt.*/windows/')
ARCH=$(uname -m | sed 's/x86_64/amd64/g' | sed 's/aarch64/arm64/g')
PLATFORM=${OS}-${ARCH}

# Prior to fabric 2.5, use amd64 binaries on darwin-arm64
if [[ $FABRIC_VERSION =~ ^2\.[0-4]\.* ]]; then
  PLATFORM=$(echo $PLATFORM | sed 's/darwin-arm64/darwin-amd64/g')
fi

# File names for binaries
BINARY_FILE=hyperledger-fabric-${PLATFORM}-${FABRIC_VERSION}.tar.gz
CA_BINARY_FILE=hyperledger-fabric-ca-${PLATFORM}-${CA_VERSION}.tar.gz

# Docker image registry
REGISTRY=${FABRIC_DOCKER_REGISTRY:-docker.io/hyperledger}

# Function to download and extract only binaries
install_binaries() {
  echo "Installing Fabric binaries v${FABRIC_VERSION} and CA binaries v${CA_VERSION}"
  
  # Create bin directory if it doesn't exist
  mkdir -p bin
  
  # Download and extract Fabric binaries
  echo "Fetching Fabric binaries..."
  download_binaries "${BINARY_FILE}" "https://github.com/hyperledger/fabric/releases/download/v${FABRIC_VERSION}/${BINARY_FILE}"
  
  # Download and extract CA binaries
  echo "Fetching Fabric CA binaries..."
  download_binaries "${CA_BINARY_FILE}" "https://github.com/hyperledger/fabric-ca/releases/download/v${CA_VERSION}/${CA_BINARY_FILE}"
  
  # Set executable permissions
  chmod +x bin/*
  
  echo "Binary installation complete. Binaries available in the bin directory."
}

# Helper function to download binaries
download_binaries() {
  local BINARY_FILE=$1
  local URL=$2
  local TMP_DIR=tmp-extract-$(date +%s)
  
  echo "Downloading: ${URL}"
  
  # Ensure temporary directory doesn't exist
  rm -rf ${TMP_DIR}
  mkdir -p ${TMP_DIR}
  
  # Download and extract to temp directory
  curl -s -L --retry 5 --retry-delay 3 "${URL}" | tar xz -C ${TMP_DIR} || {
    echo "Error downloading ${BINARY_FILE}"
    rm -rf ${TMP_DIR}
    return 1
  }
  
  # Copy only bin files
  if [ -d "${TMP_DIR}/bin" ]; then
    cp -r ${TMP_DIR}/bin/* bin/
    echo "Extracted binaries successfully"
  else
    echo "No bin directory found in ${TMP_DIR}"
    rm -rf ${TMP_DIR}
    return 1
  fi
  
  # Clean up
  rm -rf ${TMP_DIR}
  return 0
}

# Function to pull Docker images
pull_docker_images() {
  echo "Pulling Hyperledger Fabric Docker images..."
  
  # Check if Docker is available
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker not installed or not in PATH, skipping Docker image pull"
    return 1
  fi
  
  # Set image tags
  FABRIC_TAG=${FABRIC_VERSION}
  CA_TAG=${CA_VERSION}
  
  # Define Fabric images based on version
  FABRIC_IMAGES=(peer orderer ccenv)
  if [[ $FABRIC_VERSION =~ ^2\. ]]; then
    FABRIC_IMAGES+=(baseos)
  fi
  
  # Pull Fabric images
  echo "Pulling Fabric images..."
  for IMAGE in "${FABRIC_IMAGES[@]}"; do
    echo "Pulling ${REGISTRY}/fabric-${IMAGE}:${FABRIC_TAG}"
    docker pull "${REGISTRY}/fabric-${IMAGE}:${FABRIC_TAG}" || true
    
    # Tag with latest and major.minor version
    docker tag "${REGISTRY}/fabric-${IMAGE}:${FABRIC_TAG}" "${REGISTRY}/fabric-${IMAGE}" || true
    MINOR_TAG=$(echo ${FABRIC_TAG} | cut -d'.' -f1,2)
    docker tag "${REGISTRY}/fabric-${IMAGE}:${FABRIC_TAG}" "${REGISTRY}/fabric-${IMAGE}:${MINOR_TAG}" || true
  done
  
  # Pull CA images
  echo "Pulling Fabric CA images..."
  docker pull "${REGISTRY}/fabric-ca:${CA_TAG}" || true
  docker tag "${REGISTRY}/fabric-ca:${CA_TAG}" "${REGISTRY}/fabric-ca" || true
  CA_MINOR_TAG=$(echo ${CA_TAG} | cut -d'.' -f1,2)
  docker tag "${REGISTRY}/fabric-ca:${CA_TAG}" "${REGISTRY}/fabric-ca:${CA_MINOR_TAG}" || true
  
  # List pulled images
  echo "Hyperledger Fabric Docker images:"
  docker images | grep hyperledger
  
  echo "Docker image installation complete."
}

# Execute requested components
if [ "$INSTALL_BINARY" = "true" ]; then
  install_binaries || {
    echo "Binary installation failed"
    exit 1
  }
fi

if [ "$PULL_DOCKER" = "true" ]; then
  pull_docker_images || {
    echo "Docker image installation failed but continuing"
  }
fi

echo "Fabric setup completed successfully!"
