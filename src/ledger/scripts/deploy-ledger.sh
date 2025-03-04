#!/bin/bash
set -e

# SSH connection details
SSH_KEY_FILE="${SSH_KEY_FILE:-/tmp/aws_ssh_key}"
EC2_USER="${EC2_USER:-ec2-user}"
EC2_HOST="${EC2_HOST:-3.249.159.32}"
SOURCE_DIR="${SOURCE_DIR:-$PWD/..}"  # Default to parent directory (ledger folder)

echo "Deploying Fabric network to EC2 instance ${EC2_HOST}..."

# SSH options for secure connection
SSH_OPTS="-i $SSH_KEY_FILE -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

# Step 1: Install dependencies on the EC2 instance (first time only)
echo "Setting up dependencies on EC2 instance..."
ssh $SSH_OPTS "$EC2_USER@$EC2_HOST" << 'EOF'
    set -e
    
    # Create project directory if it doesn't exist
    mkdir -p ~/legitify/network
    
    # Amazon Linux 2023 specific setup
    sudo dnf update -y
    
    # Install basic dependencies if needed
    which docker &>/dev/null || sudo dnf install -y docker
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker $USER
    
    # Install Docker Compose using Docker's official plugin
    if ! docker compose version &> /dev/null; then
        echo "Installing Docker Compose plugin..."
        sudo dnf install -y docker-compose-plugin
        
        # Verify installation
        if ! docker compose version &> /dev/null; then
            echo "Installing Docker Compose standalone as fallback..."
            DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
            mkdir -p $DOCKER_CONFIG/cli-plugins
            sudo curl -SL "https://github.com/docker/compose/releases/download/v2.5.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
            sudo ln -sf /usr/local/bin/docker-compose $DOCKER_CONFIG/cli-plugins/docker-compose
        fi
    fi
    # Create compatibility symlink
    if [ ! -f /usr/bin/docker-compose ] && [ -f /usr/local/bin/docker-compose ]; then
        sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    fi
    
    # Install Go if not already installed
    if ! command -v go &> /dev/null; then
        sudo dnf install -y golang
    fi
    
    # Install other utilities
    which jq &>/dev/null || sudo dnf install -y jq
    which git &>/dev/null || sudo dnf install -y git
EOF

# Step 2: Create and upload deployment package
echo "Creating and uploading deployment package..."
DEPLOY_PACKAGE="/tmp/ledger-deploy.tar.gz"
cd "${SOURCE_DIR}"
tar -czf "${DEPLOY_PACKAGE}" --exclude="node_modules" --exclude=".git" --exclude="bin" .
scp $SSH_OPTS "${DEPLOY_PACKAGE}" "${EC2_USER}@${EC2_HOST}:~/legitify/ledger-deploy.tar.gz"

# Step 4: Deploy and start network
echo "Deploying and starting network on EC2..."
ssh $SSH_OPTS "$EC2_USER@$EC2_HOST" << 'EOF'
    set -e
    
    # Clean previous deployment and extract new one
    rm -rf ~/legitify/network/*
    tar -xzf ~/legitify/ledger-deploy.tar.gz -C ~/legitify/network
    rm ~/legitify/ledger-deploy.tar.gz
    
    # Make scripts executable
    find ~/legitify/network -name "*.sh" -exec chmod +x {} \;
    
    # Install Fabric binaries using the install-fabric.sh script
    cd ~/legitify/network
    export ARCH=$(uname -m)
    [ "$ARCH" = "x86_64" ] && export ARCH=amd64
    export FABRIC_PATH=$PWD
    export PATH=$PATH:$FABRIC_PATH/bin:$HOME/fabric-samples/bin
    
    # Run the install-fabric script
    cd ~/legitify/network
    bash ./install-fabric.sh --fabric-version 2.5.10 binary --ca-version 1.5.13
    
    # Create symbolic links to the fabric-samples/bin directory
    if [ -d "$HOME/fabric-samples/bin" ]; then
        mkdir -p $FABRIC_PATH/bin
        ln -sf $HOME/fabric-samples/bin/* $FABRIC_PATH/bin/ 2>/dev/null || true
    fi
    
    # Verify .env file format (ensure it's valid)
    cd ~/legitify/network/legitify-network
    cat > .env << 'ENV_CONTENT'
# Environment variables for Fabric network


# Fabric configuration
FABRIC_CFG_PATH=$PWD/config
ENV_CONTENT
    
    # Prepare Go chaincode environment
    cd ~/legitify/network/chaincode/degreeChaincode
    GO111MODULE=on go mod vendor
    
    # Ensure PATH includes fabric binaries
    export PATH=$PATH:$HOME/fabric-samples/bin
    
    cd ~/legitify/network/legitify-network
    chmod +x scripts/startNetwork.sh
    
    # Start new network with improved error handling
    bash scripts/startNetwork.sh
    
EOF

# Clean up local temp file
rm -f "${DEPLOY_PACKAGE}"

echo "Ledger deployment completed successfully."
echo "You can manage the network on EC2 using: ~/legitify/manage-network.sh {start|stop|restart|status}"
