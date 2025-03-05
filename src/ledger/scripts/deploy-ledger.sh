#!/bin/bash
set -e

# Configuration
EC2_HOST="${EC2_HOST:-18.202.198.84}"
EC2_USER="${EC2_USER:-ec2-user}"
SSH_KEY_FILE="${SSH_KEY_FILE:-/tmp/aws_ssh_key}"
DEPLOY_DIR="/home/${EC2_USER}/legitify/network"
SOURCE_DIR="${SOURCE_DIR:-$CI_PROJECT_DIR/src/ledger}"

echo "Deploying Fabric network to EC2 instance ${EC2_HOST}..."

# Install required dependencies on EC2
echo "Setting up dependencies on EC2 instance..."
ssh -o StrictHostKeyChecking=accept-new -i ${SSH_KEY_FILE} ${EC2_USER}@${EC2_HOST} "sudo yum -y install tar git curl docker jq"

# Create deployment package
echo "Creating and uploading deployment package..."
cd ${SOURCE_DIR}
tar -czf /tmp/ledger-deploy.tar.gz .
scp -i ${SSH_KEY_FILE} /tmp/ledger-deploy.tar.gz ${EC2_USER}@${EC2_HOST}:/tmp/

# Deploy on EC2
echo "Deploying and starting network on EC2..."
ssh -i ${SSH_KEY_FILE} ${EC2_USER}@${EC2_HOST} << 'EOF'
  # Ensure docker service is running
  sudo systemctl start docker || true
  sudo systemctl enable docker || true
  sudo usermod -aG docker $USER || true

  # Create deployment directory
  mkdir -p ${HOME}/legitify/network

  # Clean up previous deployment with proper permissions handling
  if [ -d "${HOME}/legitify/network/legitify-network" ]; then
    cd ${HOME}/legitify/network/legitify-network
    # Stop any running network first
    ./network.sh down || true
    
    # Handle permission issues by using sudo for cleanup
    sudo find ${HOME}/legitify/network -type d -exec chmod 755 {} \;
    sudo find ${HOME}/legitify/network -type f -exec chmod 644 {} \;
    sudo chmod -R 777 ${HOME}/legitify/network/legitify-network/organizations
    
    # Now we can safely remove files
    cd ${HOME}
    sudo rm -rf ${HOME}/legitify/network/*
  fi

  # Extract new deployment
  tar -xzf /tmp/ledger-deploy.tar.gz -C ${HOME}/legitify/network
  rm -f /tmp/ledger-deploy.tar.gz

  # Ensure all scripts are executable
  chmod +x ${HOME}/legitify/network/install-fabric.sh
  chmod +x ${HOME}/legitify/network/legitify-network/*.sh
  chmod +x ${HOME}/legitify/network/legitify-network/scripts/*.sh

  # Start fabric network
  cd ${HOME}/legitify/network
  export ARCH=amd64
  export FABRIC_PATH=$PWD
  export PATH=$PATH:$FABRIC_PATH/bin
  
  # Install Fabric binaries if needed
  if [ ! -d "./bin" ]; then
    ./install-fabric.sh --fabric-version 2.5.10 binary --ca-version 1.5.13
    chmod +x bin/*
  fi

  # Start the network
  cd ${HOME}/legitify/network/legitify-network
  sudo ./network.sh down || true
  sudo ./network.sh up createChannel -ca -s couchdb
  
  # Deploy chaincode
  cd ${HOME}/legitify/network/chaincode/degreeChaincode
  GO111MODULE=on go mod vendor
  cd ${HOME}/legitify/network/legitify-network
  sudo ./network.sh deployCC -ccn degree -ccp ../chaincode/degreeChaincode -ccl go
  
  # Set proper ownership of all files
  sudo chown -R ${USER}:${USER} ${HOME}/legitify

  echo "Ledger deployment completed successfully."
EOF

echo "Ledger deployment process completed."
