#!/bin/bash

channel_name=$1

if [ -z "$channel_name" ]; then
  echo "Channel name not provided"
  echo "Usage: ./join-all-orderers.sh <channel_name>"
  exit 1
fi

# Set the orderer CA path
export ORDERER_CA=${PWD}/organizations/ordererOrganizations/legitifyapp.com/orderers/orderer.legitifyapp.com/tls/ca.crt
export PATH=${ROOTDIR}/../bin:${PWD}/../bin:$PATH

# Function to join a specific orderer to the channel
join_orderer() {
  orderer_num=$1
  orderer_name="orderer"
  port="7053"
  
  # Set orderer-specific values
  if [ "$orderer_num" -gt 1 ]; then
    orderer_name="orderer${orderer_num}"
    port=$((7053 + (orderer_num - 1) * 2))
  fi
  
  echo "Joining ${orderer_name}.legitifyapp.com to channel $channel_name"
  
  # Set orderer-specific environment variables
  export ORDERER_ADMIN_TLS_SIGN_CERT=${PWD}/organizations/ordererOrganizations/legitifyapp.com/orderers/${orderer_name}.legitifyapp.com/tls/server.crt
  export ORDERER_ADMIN_TLS_PRIVATE_KEY=${PWD}/organizations/ordererOrganizations/legitifyapp.com/orderers/${orderer_name}.legitifyapp.com/tls/server.key
  
  # Join the orderer to the channel
  osnadmin channel join --channelID ${channel_name} --config-block ./channel-artifacts/${channel_name}.block -o localhost:${port} --ca-file "$ORDERER_CA" --client-cert "$ORDERER_ADMIN_TLS_SIGN_CERT" --client-key "$ORDERER_ADMIN_TLS_PRIVATE_KEY" >> log.txt 2>&1
  
  if [ $? -eq 0 ]; then
    echo "Successfully joined ${orderer_name}.legitifyapp.com to channel $channel_name"
  else
    echo "Failed to join ${orderer_name}.legitifyapp.com to channel $channel_name"
  fi
}

# Join all orderers to the channel
for i in {1..4}; do
  join_orderer $i
done

echo "All orderers joined channel $channel_name"
