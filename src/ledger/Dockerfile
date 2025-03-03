# Dockerfile for Ledger Bootstrap Container
FROM node:18-bullseye

# Install prerequisites including Docker, Docker Compose, and Go
RUN apt-get update && apt-get install -y \
    curl \
    git \
    jq \
    docker.io \
    docker-compose \
    golang-go

# Set working directory
WORKDIR /app

# Copy your ledger source code and scripts into the container
# (Assuming your Fabric scripts and network files are under src/ledger/)
COPY . .

# Change to the legitify-network directory and make scripts executable
WORKDIR /app/legitify-network
RUN chmod +x scripts/startNetwork.sh scripts/ledger-bootstrap.sh

# Return to the main app directory
WORKDIR /app

# Expose the port for the resource server (e.g., 8080)
EXPOSE 8080

# The bootstrap container's entrypoint: run the ledger bootstrap script.
ENTRYPOINT ["/app/legitify-network/scripts/ledger-bootstrap.sh"]
