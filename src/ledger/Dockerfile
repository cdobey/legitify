# Fabric Tools image with bundled scripts and config
FROM hyperledger/fabric-tools:2.5.10

# Set working directory
WORKDIR /src/ledger

# Copy all ledger files (scripts, config)
COPY scripts/ /src/ledger/scripts/
COPY config/ /src/ledger/config/

# Create empty channel-artifacts directory (will be populated at runtime)
RUN mkdir -p /src/ledger/channel-artifacts

# Make scripts executable
RUN chmod +x /src/ledger/scripts/*.sh

# Default working directory for scripts
WORKDIR /src/ledger/scripts
