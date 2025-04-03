#!/bin/bash

# This script updates the network configuration to include a new organization

. scripts/utils.sh

# Source the ledger environment variables
if [ -f "./ledger.env" ]; then
  . ./ledger.env
fi

# Default values
ORG_NAME=""
ORG_MSP_ID=""
PEER_PORT=0
CA_PORT=0

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
  -o|--org)
    ORG_NAME="$2"
    shift 2
    ;;
  -m|--msp)
    ORG_MSP_ID="$2"
    shift 2
    ;;
  -p|--peerport)
    PEER_PORT="$2"
    shift 2
    ;;
  -c|--caport)
    CA_PORT="$2"
    shift 2
    ;;
  *)
    errorln "Unknown flag: $key"
    exit 1
    ;;
  esac
done

# Validate inputs
if [ -z "$ORG_NAME" ]; then
  errorln "Organization name is required with -o or --org"
  exit 1
fi

if [ -z "$ORG_MSP_ID" ]; then
  ORG_MSP_ID="${ORG_NAME}MSP"
  infoln "Setting MSP ID to $ORG_MSP_ID"
fi

if [ $PEER_PORT -eq 0 ]; then
  errorln "Peer port is required with -p or --peerport"
  exit 1
fi

if [ $CA_PORT -eq 0 ]; then
  errorln "CA port is required with -c or --caport"
  exit 1
fi

##############################################################
# STEP 1: Update the connection profile to include the new org
##############################################################
infoln "Updating connection profiles to include $ORG_NAME"

# Check if ccp-generate.sh exists
if [ ! -f "organizations/ccp-generate.sh" ]; then
  errorln "ccp-generate.sh not found in organizations directory"
  exit 1
fi

# Check if the organization is already included
if grep -q "$ORG_NAME" organizations/ccp-generate.sh; then
  infoln "$ORG_NAME already exists in ccp-generate.sh"
else
  infoln "Adding $ORG_NAME to ccp-generate.sh"
  
  # Backup the original file
  cp organizations/ccp-generate.sh organizations/ccp-generate.sh.bak
  
  # Create a temporary file for the new content
  TMP_FILE=$(mktemp)
  
  # Add the new organization to the script - macOS compatible approach
  awk '/function one_line_pem/,/^}/ {print}' organizations/ccp-generate.sh > $TMP_FILE
  
  cat << EOF >> $TMP_FILE

# Generate the connection profile for $ORG_NAME
function gen_ccp_$ORG_NAME() {
  local PP=\$(one_line_pem \$PEER0_${ORG_MSP_ID}_PEM)
  local CP=\$(one_line_pem \$CA_${ORG_MSP_ID}_PEM)
  sed -e "s/\\\${ORG}/$ORG_NAME/" \\
      -e "s/\\\${P0PORT}/$PEER_PORT/" \\
      -e "s/\\\${CAPORT}/$CA_PORT/" \\
      -e "s#\\\${PEERPEM}#\$PP#" \\
      -e "s#\\\${CAPEM}#\$CP#" \\
      organizations/ccp-template.json > organizations/peerOrganizations/$ORG_NAME.com/connection-$ORG_NAME.json
}
EOF
  
  # Add the function call section
  awk '/gen_ccp_orgindividual/,/^$/ {print}' organizations/ccp-generate.sh >> $TMP_FILE
  
  cat << EOF >> $TMP_FILE
PEER0_${ORG_MSP_ID}_PEM=organizations/peerOrganizations/$ORG_NAME.com/tlsca/tlsca.$ORG_NAME.com-cert.pem
CA_${ORG_MSP_ID}_PEM=organizations/peerOrganizations/$ORG_NAME.com/ca/ca.$ORG_NAME.com-cert.pem

echo "Generating CCP files for $ORG_NAME"
gen_ccp_$ORG_NAME
EOF
  
  # Append any remaining content
  awk 'BEGIN{found=0} /gen_ccp_orgindividual/,/^$/ {found=1; next} found {print}' organizations/ccp-generate.sh >> $TMP_FILE
  
  # Replace the original file
  mv $TMP_FILE organizations/ccp-generate.sh
  chmod +x organizations/ccp-generate.sh
fi

# Run the script to generate the connection profile for the new organization
./organizations/ccp-generate.sh

# Check if the connection profile was generated
if [ ! -f "organizations/peerOrganizations/$ORG_NAME.com/connection-$ORG_NAME.json" ]; then
  warnln "Connection profile was not generated. Creating a template version."
  
  # Create directory if it doesn't exist
  mkdir -p organizations/peerOrganizations/$ORG_NAME.com/
  
  # Create a basic connection profile template
  cat << EOF > organizations/peerOrganizations/$ORG_NAME.com/connection-$ORG_NAME.json
{
  "name": "${ORG_NAME}-network",
  "version": "1.0.0",
  "client": {
    "organization": "${ORG_NAME}",
    "connection": {
      "timeout": {
        "peer": {
          "endorser": "300"
        }
      }
    }
  },
  "organizations": {
    "${ORG_NAME}": {
      "mspid": "${ORG_MSP_ID}",
      "peers": [
        "peer0.${ORG_NAME}.com"
      ],
      "certificateAuthorities": [
        "ca.${ORG_NAME}.com"
      ]
    }
  },
  "peers": {
    "peer0.${ORG_NAME}.com": {
      "url": "grpcs://localhost:${PEER_PORT}",
      "tlsCACerts": {
        "path": "organizations/peerOrganizations/${ORG_NAME}.com/tlsca/tlsca.${ORG_NAME}.com-cert.pem"
      },
      "grpcOptions": {
        "ssl-target-name-override": "peer0.${ORG_NAME}.com",
        "hostnameOverride": "peer0.${ORG_NAME}.com"
      }
    }
  },
  "certificateAuthorities": {
    "ca.${ORG_NAME}.com": {
      "url": "https://localhost:${CA_PORT}",
      "caName": "ca-${ORG_NAME}",
      "tlsCACerts": {
        "path": "organizations/peerOrganizations/${ORG_NAME}.com/ca/ca.${ORG_NAME}.com-cert.pem"
      },
      "httpOptions": {
        "verify": false
      }
    }
  }
}
EOF
  infoln "Created template connection profile for $ORG_NAME"
fi

##############################################################
# STEP 2: Update connection profiles in the server code
##############################################################
infoln "Updating server connection profiles"

# Check if server directory exists
if [ -d "../../server/src/connectionProfiles" ]; then
  # Copy connection profile to server's connection profiles directory
  cp organizations/peerOrganizations/$ORG_NAME.com/connection-$ORG_NAME.json ../../server/src/connectionProfiles/connection-$ORG_NAME.json
  if [ $? -eq 0 ]; then
    infoln "Copied connection profile to server"
  else
    warnln "Failed to copy connection profile to server"
  fi
else
  warnln "Server connection profiles directory not found at ../../server/src/connectionProfiles"
fi

# Update the fabric-helpers.ts file if it exists
FABRIC_HELPERS="../../server/src/utils/fabric-helpers.ts"
if [ -f "$FABRIC_HELPERS" ]; then
  infoln "Updating fabric-helpers.ts to include $ORG_NAME"
  
  # Check if the organization is already in the file
  if grep -q "$ORG_NAME" "$FABRIC_HELPERS"; then
    infoln "$ORG_NAME already exists in fabric-helpers.ts"
  else
    # Create a backup
    cp "$FABRIC_HELPERS" "${FABRIC_HELPERS}.bak"
    
    # Create a temporary file
    TMP_FILE=$(mktemp)
    
    # Add the new organization to the orgConfigs object - macOS compatible approach
    awk -v org="$ORG_NAME" -v msp="$ORG_MSP_ID" -v port="$PEER_PORT" '
    /const orgConfigs.*=.*{/,/},/ {
      if (/},/) {
        print "  " org ": {";
        print "    name: \"" org "\",";
        print "    mspId: \"" msp "\",";
        print "    caName: \"ca." org ".com\",";
        print "  },";
      }
      print;
      next;
    }
    
    /testFabricConnection/,/else return { connected: false, error: "Unknown organization" };/ {
      if (/else if \(orgName === "orgindividual"\)/) {
        print $0;
        print "    else if (orgName === \"" org "\") peerPort = " port ";";
        next;
      }
    }
    {print}
    ' "$FABRIC_HELPERS" > "$TMP_FILE"
    
    # Replace the original file
    mv "$TMP_FILE" "$FABRIC_HELPERS"
    infoln "Updated fabric-helpers.ts with $ORG_NAME"
  fi
else
  warnln "fabric-helpers.ts not found at $FABRIC_HELPERS"
fi

infoln "Network configuration updated to include $ORG_NAME"
