#!/bin/bash

# Load environment variables
source ledger.env

# Helper function to set University org context
set_university_context() {
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="OrgUniversityMSP"
    export CORE_PEER_MSPCONFIGPATH=${ORG_UNIVERSITY_MSP_PATH}
    export CORE_PEER_TLS_ROOTCERT_FILE=${ORG_UNIVERSITY_TLS_CERT}
    export CORE_PEER_ADDRESS=${ORG_UNIVERSITY_ADDRESS}
}

# Helper function to set Individual org context
set_individual_context() {
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="OrgIndividualMSP"
    export CORE_PEER_MSPCONFIGPATH=${ORG_INDIVIDUAL_MSP_PATH}
    export CORE_PEER_TLS_ROOTCERT_FILE=${ORG_INDIVIDUAL_TLS_CERT}
    export CORE_PEER_ADDRESS=${ORG_INDIVIDUAL_ADDRESS}
}

# Helper function to set Employer org context
set_employer_context() {
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="OrgEmployerMSP"
    export CORE_PEER_MSPCONFIGPATH=${ORG_EMPLOYER_MSP_PATH}
    export CORE_PEER_TLS_ROOTCERT_FILE=${ORG_EMPLOYER_TLS_CERT}
    export CORE_PEER_ADDRESS=${ORG_EMPLOYER_ADDRESS}
}

# Helper function for chaincode invocation with multi-org endorsement
invoke_chaincode() {
    local func=$1
    local args=$2
    local success=false
    
    # Define array of orderer endpoints to try
    local ORDERER_ENDPOINTS=(
        "localhost:7050"
        "localhost:7052"
        "localhost:7056"
        "localhost:7058"
    )
  
    # Try each orderer until one succeeds
    for ORDERER_ENDPOINT in "${ORDERER_ENDPOINTS[@]}"; do
        echo "Attempting to invoke using orderer at $ORDERER_ENDPOINT"
        
        peer chaincode invoke -o $ORDERER_ENDPOINT \
            --tls --cafile $ORDERER_CA \
            -C legitifychannel -n degreeCC \
            --peerAddresses localhost:7051 \
            --tlsRootCertFiles ${ORG_UNIVERSITY_TLS_CERT} \
            --peerAddresses localhost:8051 \
            --tlsRootCertFiles ${ORG_EMPLOYER_TLS_CERT} \
            -c "{\"Args\":[\"$func\",$args]}" \
            --waitForEvent > invoke_output.txt 2>&1
        
        if [ $? -eq 0 ]; then
            echo "Invoke transaction successful using orderer at $ORDERER_ENDPOINT"
            cat invoke_output.txt
            success=true
            break
        else
            echo "Warning: Invoke failed with orderer at $ORDERER_ENDPOINT, trying next orderer..."
        fi
    done
    
    if [ "$success" = false ]; then
        echo "Error: Invoke failed with all available orderers"
        cat invoke_output.txt
        return 1
    fi
    
    return 0
}

# Helper function for chaincode queries
query_chaincode() {
    local func=$1
    local args=$2
    
    peer chaincode query -C legitifychannel -n degreeCC \
        -c "{\"Args\":[\"$func\",$args]}"
}

echo "Starting Degree Chaincode Tests..."

# Test 1: Issue a new degree (as University with Employer endorsement)
echo "Test 1: Issuing new degree..."
set_university_context
DEGREE_ID="DEGREE009"
DEGREE_HASH="abc123hash"
OWNER_ID="INDIVIDUAL001"
ISSUER_ID="OrgUniversityMSP"
invoke_chaincode "IssueDegree" "\"$DEGREE_ID\",\"$DEGREE_HASH\",\"$OWNER_ID\",\"$ISSUER_ID\""
sleep 5

# Test 2: Query the degree (as University)
echo "Test 2: Reading issued degree..."
set_university_context
RESULT=$(query_chaincode "ReadDegree" "\"$DEGREE_ID\"")
echo "Degree details: $RESULT"
sleep 2

# Test 3: Accept degree (as Individual with Employer endorsement)
echo "Test 3: Accepting degree..."
set_individual_context
invoke_chaincode "AcceptDegree" "\"$DEGREE_ID\""
sleep 5  # Wait for transaction to be committed

# Test 4: Query degree after acceptance (as University)
echo "Test 4: Verifying degree acceptance..."
set_university_context
RESULT=$(query_chaincode "ReadDegree" "\"$DEGREE_ID\"")
echo "Updated degree details: $RESULT"
sleep 2

# Test 5: Deny degree (as Individual with Employer endorsement)
echo "Test 5: Denying degree..."
set_individual_context
invoke_chaincode "DenyDegree" "\"$DEGREE_ID\""
sleep 5  # Wait for transaction to be committed

# Test 6: Query degree after denial (as University)
echo "Test 6: Verifying degree denial..."
set_university_context
RESULT=$(query_chaincode "ReadDegree" "\"$DEGREE_ID\"")
echo "Updated degree details: $RESULT"
sleep 2

# Test 7: Verify hash (as University)
echo "Test 7: Verifying degree hash..."
set_university_context
RESULT=$(query_chaincode "VerifyHash" "\"$DEGREE_ID\",\"$DEGREE_HASH\"")
echo "Hash verification result: $RESULT"

echo "All tests completed!"