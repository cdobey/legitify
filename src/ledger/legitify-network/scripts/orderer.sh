#!/bin/bash


channel_name=$1

export PATH=${ROOTDIR}/../bin:${PWD}/../bin:$PATH
export ORDERER_ADMIN_TLS_SIGN_CERT=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.crt
export ORDERER_ADMIN_TLS_PRIVATE_KEY=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/server.key

# Change from localhost to AWS IP and add TLS hostname override
osnadmin channel join --channelID ${channel_name} --config-block ./channel-artifacts/${channel_name}.block -o 176.34.66.195:7053 --ordererTLSHostnameOverride orderer.example.com --ca-file "$ORDERER_CA" --client-cert "$ORDERER_ADMIN_TLS_SIGN_CERT" --client-key "$ORDERER_ADMIN_TLS_PRIVATE_KEY" --verbose