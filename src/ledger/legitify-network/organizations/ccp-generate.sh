#!/bin/bash

# Function to convert PEM files to a single line
function one_line_pem {
    echo "`awk 'NF {sub(/\\n/, ""); printf "%s\\\\\\\n",$0;}' $1`"
}

# Get IP address from environment variable or use localhost as default
IP=${FABRIC_IP:-localhost}
echo "Using IP address: $IP for connection profiles"

# Generate JSON connection profile from the template
function json_ccp {
    local ORG=$1
    local P0PORT=$2
    local CAPORT=$3
    local PEERPEM=$4
    local CAPEM=$5

    local PP=$(one_line_pem "$PEERPEM")
    local CP=$(one_line_pem "$CAPEM")

    sed -e "s/\${ORG}/$ORG/" \
        -e "s/\${P0PORT}/$P0PORT/" \
        -e "s/\${CAPORT}/$CAPORT/" \
        -e "s/\${IP}/$IP/" \
        -e "s#\${PEERPEM}#$PP#" \
        -e "s#\${CAPEM}#$CP#" \
        organizations/ccp-template.json
}

# Generate YAML connection profile from the template
function yaml_ccp {
    local ORG=$1
    local P0PORT=$2
    local CAPORT=$3
    local PEERPEM=$4
    local CAPEM=$5

    local PP=$(one_line_pem "$PEERPEM")
    local CP=$(one_line_pem "$CAPEM")

    sed -e "s/\${ORG}/$ORG/" \
        -e "s/\${P0PORT}/$P0PORT/" \
        -e "s/\${CAPORT}/$CAPORT/" \
        -e "s/\${IP}/$IP/" \
        -e "s#\${PEERPEM}#$PP#" \
        -e "s#\${CAPEM}#$CP#" \
        organizations/ccp-template.yaml | sed -e $'s/\\\\n/\\\n          /g'
}

# Generates connection profiles (JSON & YAML) for each organization
function generate_ccp {
    local ORG_NAME=$1
    local P0PORT=$2
    local CAPORT=$3
    local DOMAIN=$4

    # Construct paths to the CA certs and TLS CA certs
    local PEERPEM=organizations/peerOrganizations/${DOMAIN}/tlsca/tlsca.${DOMAIN}-cert.pem
    local CAPEM=organizations/peerOrganizations/${DOMAIN}/ca/ca.${DOMAIN}-cert.pem

    # Remove ".com" from the filename only
    local FILENAME_BASE=$(echo "${DOMAIN}" | sed 's/\.com//')

    echo "$(json_ccp "$ORG_NAME" "$P0PORT" "$CAPORT" "$PEERPEM" "$CAPEM")" \
        > organizations/peerOrganizations/${DOMAIN}/connection-${FILENAME_BASE}.json

    echo "$(yaml_ccp "$ORG_NAME" "$P0PORT" "$CAPORT" "$PEERPEM" "$CAPEM")" \
        > organizations/peerOrganizations/${DOMAIN}/connection-${FILENAME_BASE}.yaml
}

# --------------------------------------------------------------------
# Generate CCPs for the three organizations
# --------------------------------------------------------------------

# OrgUniversity
generate_ccp "OrgUniversity" 7051 7054 "orguniversity.com"

# OrgEmployer
generate_ccp "OrgEmployer" 8051 8054 "orgemployer.com"

# OrgIndividual
generate_ccp "OrgIndividual" 9051 9054 "orgindividual.com"

echo "Connection profiles generated successfully."
