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
    mkdir -p ~/legitify
    
    # Install basic dependencies if needed
    which docker &>/dev/null || sudo yum install -y docker
    which docker-compose &>/dev/null || sudo curl -L "https://github.com/docker/compose/releases/download/v2.12.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose
    which go &>/dev/null || sudo yum install -y golang
    which jq &>/dev/null || sudo yum install -y jq
    
    # Ensure Docker is running
    sudo systemctl status docker || sudo systemctl start docker
    sudo usermod -aG docker $USER
EOF

# Step 2: Create and upload deployment package
echo "Creating and uploading deployment package..."
DEPLOY_PACKAGE="/tmp/ledger-deploy.tar.gz"
cd "${SOURCE_DIR}"
tar -czf "${DEPLOY_PACKAGE}" --exclude="node_modules" --exclude=".git" .
scp $SSH_OPTS "${DEPLOY_PACKAGE}" "${EC2_USER}@${EC2_HOST}:~/legitify/ledger-deploy.tar.gz"

# Step 3: Deploy and start network
echo "Deploying and starting network on EC2..."
ssh $SSH_OPTS "$EC2_USER@$EC2_HOST" << 'EOF'
    set -e
    
    # Clean previous deployment and extract new one
    rm -rf ~/legitify/network
    mkdir -p ~/legitify/network
    tar -xzf ~/legitify/ledger-deploy.tar.gz -C ~/legitify/network
    rm ~/legitify/ledger-deploy.tar.gz
    
    # Make scripts executable
    find ~/legitify/network -name "*.sh" -exec chmod +x {} \;
    
    # Install Fabric binaries
    cd ~/legitify/network
    export ARCH=amd64
    export FABRIC_PATH=$PWD
    export PATH=$PATH:$FABRIC_PATH/bin
    if [ ! -d "bin" ]; then
        curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/bootstrap.sh | bash -s -- 2.5.10 1.5.13
    fi
    chmod +x bin/*
    
    # Setup Go chaincode
    cd ~/legitify/network/chaincode/degreeChaincode
    GO111MODULE=on go mod vendor
    
    # Stop any running network
    cd ~/legitify/network/legitify-network
    if [ -f "scripts/stopNetwork.sh" ]; then
        bash scripts/stopNetwork.sh || true
        sleep 5
    fi
    
    # Start new network
    bash scripts/startNetwork.sh
    
    # Create network management script if it doesn't exist
    cat > ~/legitify/manage-network.sh << 'SCRIPT'
#!/bin/bash
set -e

# Simple network management script
NETWORK_DIR=~/legitify/network/legitify-network

case "$1" in
  start)
    echo "Starting Fabric network..."
    cd $NETWORK_DIR
    bash scripts/startNetwork.sh
    ;;
  stop)
    echo "Stopping Fabric network..."
    cd $NETWORK_DIR
    bash scripts/stopNetwork.sh || true
    ;;
  restart)
    echo "Restarting Fabric network..."
    cd $NETWORK_DIR
    bash scripts/stopNetwork.sh || true
    sleep 5
    bash scripts/startNetwork.sh
    ;;
  status)
    echo "Network status:"
    docker ps | grep hyperledger/fabric
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
SCRIPT
    
    # Make it executable
    chmod +x ~/legitify/manage-network.sh
    
    # Setup as a service if it doesn't exist
    if [ ! -f "/etc/systemd/system/fabric-network.service" ]; then
        sudo tee /etc/systemd/system/fabric-network.service > /dev/null << 'SERVICE'
[Unit]
Description=Hyperledger Fabric Network
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
User=ec2-user
RemainAfterExit=yes
WorkingDirectory=/home/ec2-user/legitify
ExecStart=/home/ec2-user/legitify/manage-network.sh start
ExecStop=/home/ec2-user/legitify/manage-network.sh stop
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

        sudo systemctl daemon-reload
        sudo systemctl enable fabric-network.service
    fi
    
    # Show network status
    echo "Network deployment complete. Status:"
    docker ps | grep hyperledger/fabric
EOF

# Clean up local temp file
rm -f "${DEPLOY_PACKAGE}"

echo "Ledger deployment completed successfully."
echo "You can manage the network on EC2 using: ~/legitify/manage-network.sh {start|stop|restart|status}"
