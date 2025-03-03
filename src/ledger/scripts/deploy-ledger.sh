#!/bin/bash
set -e

# Use the SSH_KEY_FILE from the gitlab-ci.yml or a default fallback
SSH_KEY_FILE="${SSH_KEY_FILE:-/tmp/aws_ssh_key}"
# SSH_KEY_FILE="./legitify-key-pair.pem"
EC2_USER="${EC2_USER:-ec2-user}"
EC2_HOST="${EC2_HOST:-3.249.159.32}"

# Docker Hub credentials should be set as environment variables
DOCKER_USERNAME="${DOCKER_USERNAME:-$CI_REGISTRY_USER}"
DOCKER_PASSWORD="${DOCKER_PASSWORD:-$CI_REGISTRY_PASSWORD}"

# Full image name with Docker Hub username
FULL_IMAGE_NAME="${DOCKER_USERNAME}/legitify-project:ledger"

echo "Deploying ledger to EC2 instance ${EC2_HOST}..."

# SSH options for secure connection
SSH_OPTS="-i $SSH_KEY_FILE -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

# First transfer Docker credentials securely to EC2
echo "Setting up Docker credentials on EC2 instance..."
ssh $SSH_OPTS "$EC2_USER@$EC2_HOST" "mkdir -p ~/.docker"
ssh $SSH_OPTS "$EC2_USER@$EC2_HOST" "cat > ~/.docker/config.json" << EOL
{
  "auths": {
    "https://index.docker.io/v1/": {
      "auth": "$(echo -n "$DOCKER_USERNAME:$DOCKER_PASSWORD" | base64)"
    }
  }
}
EOL

# Connect to the EC2 instance via SSH and deploy the ledger container
echo "Deploying container to EC2..."
ssh $SSH_OPTS "$EC2_USER@$EC2_HOST" << EOF
    set -e
    
    # Pull the latest ledger image
    echo "Pulling latest image: ${FULL_IMAGE_NAME}"
    docker pull ${FULL_IMAGE_NAME}
    
    # Stop and remove any existing ledger bootstrap container (if present)
    echo "Stopping existing containers..."
    docker stop ledger_bootstrap 2>/dev/null || echo "No container to stop"
    docker rm ledger_bootstrap 2>/dev/null || echo "No container to remove"
    
    # Run the ledger bootstrap container
    echo "Starting new container..."
    docker run -d \\
        --name ledger_bootstrap \\
        --restart always \\
        -p 8080:8080 \\
        -v /var/run/docker.sock:/var/run/docker.sock \\
        ${FULL_IMAGE_NAME}
        
    echo "Deployment completed successfully"
EOF

echo "Ledger deployment script completed."
