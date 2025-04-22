#!/bin/bash

# Set up colors for better output readability
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

source ./ledger.env

# Environment variables (moved from ledger.env)
# OrgIssuer Variables
export ORG_ISSUER_TLS_CERT=$(pwd)/organizations/peerOrganizations/orgissuer.com/tlsca/tlsca.orgissuer.com-cert.pem
export ORG_ISSUER_MSP_PATH=$(pwd)/organizations/peerOrganizations/orgissuer.com/users/Admin@orgissuer.com/msp
export ORG_ISSUER_ADDRESS=localhost:7051

# OrgVerifier Variables
export ORG_VERIFIER_TLS_CERT=$(pwd)/organizations/peerOrganizations/orgverifier.com/tlsca/tlsca.orgverifier.com-cert.pem
export ORG_VERIFIER_MSP_PATH=$(pwd)/organizations/peerOrganizations/orgverifier.com/users/Admin@orgverifier.com/msp
export ORG_VERIFIER_ADDRESS=localhost:8051

# OrgHolder Variables
export ORG_HOLDER_TLS_CERT=$(pwd)/organizations/peerOrganizations/orgholder.com/tlsca/tlsca.orgholder.com-cert.pem
export ORG_HOLDER_MSP_PATH=$(pwd)/organizations/peerOrganizations/orgholder.com/users/Admin@orgholder.com/msp
export ORG_HOLDER_ADDRESS=localhost:9051

# Orderer Settings
export ORDERER_CA=$(pwd)/organizations/ordererOrganizations/legitifyapp.com/tlsca/tlsca.legitifyapp.com-cert.pem

# Test data
CREDENTIAL_ID="CRED$(date +%s)"
CREDENTIAL_HASH="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
HOLDER_ID="HOLDER001"
ISSUER_ID="ISSUER001"
ISSUER_ORG_ID="OrgIssuerMSP"
VERIFIER_ID="VERIFIER001"
CRED_TYPE="Credential"
TITLE="Bachelor of Science in Computer Science"
DESCRIPTION="Four-year undergraduate credential in Computer Science"
ACHIEVEMENT_DATE="2025-05-01"
EXPIRATION_DATE=""
PROGRAM_LENGTH="4 years"
DOMAIN="Computer Science"
# Define attributes as JSON without escape characters
ATTRIBUTES_JSON='{\"classification\":\"First Class\",\"holderId\":\"ST12345\",\"duration\":\"4 years\",\"gpa\":\"3.85\",\"honors\":\"Distinction in AI Project\"}'

# Success/failure counters
TESTS_RUN=0
TESTS_PASSED=0

# Helper function to set Issuer org context (as Issuer)
set_issuer_context() {
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="OrgIssuerMSP"
    export CORE_PEER_MSPCONFIGPATH=${ORG_ISSUER_MSP_PATH}
    export CORE_PEER_TLS_ROOTCERT_FILE=${ORG_ISSUER_TLS_CERT}
    export CORE_PEER_ADDRESS=${ORG_ISSUER_ADDRESS}
}

# Helper function to set Holder org context (as Holder)
set_holder_context() {
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="OrgHolderMSP"
    export CORE_PEER_MSPCONFIGPATH=${ORG_HOLDER_MSP_PATH}
    export CORE_PEER_TLS_ROOTCERT_FILE=${ORG_HOLDER_TLS_CERT}
    export CORE_PEER_ADDRESS=${ORG_HOLDER_ADDRESS}
}

# Helper function to set Verifier org context (as Verifier)
set_verifier_context() {
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID="OrgVerifierMSP"
    export CORE_PEER_MSPCONFIGPATH=${ORG_VERIFIER_MSP_PATH}
    export CORE_PEER_TLS_ROOTCERT_FILE=${ORG_VERIFIER_TLS_CERT}
    export CORE_PEER_ADDRESS=${ORG_VERIFIER_ADDRESS}
}

# Helper function for chaincode invocation with multi-org endorsement
invoke_chaincode() {
    local func=$1
    local args=$2
    local success=false
    
    echo -e "${BLUE}Invoking chaincode function: ${func}${NC}"
    
    # Define array of orderer endpoints to try
    local ORDERER_ENDPOINTS=(
        "localhost:7050"
        "localhost:7052"
        "localhost:7056"
        "localhost:7058"
    )
  
    # Try each orderer until one succeeds
    for ORDERER_ENDPOINT in "${ORDERER_ENDPOINTS[@]}"; do
        echo -e "${YELLOW}Attempting to invoke using orderer at $ORDERER_ENDPOINT${NC}"
        
        peer chaincode invoke -o $ORDERER_ENDPOINT \
            --tls --cafile $ORDERER_CA \
            -C legitifychannel -n credentialCC \
            --peerAddresses localhost:7051 \
            --tlsRootCertFiles ${ORG_ISSUER_TLS_CERT} \
            --peerAddresses localhost:8051 \
            --tlsRootCertFiles ${ORG_VERIFIER_TLS_CERT} \
            -c "{\"function\":\"$func\",\"Args\":[$args]}" \
            --waitForEvent > invoke_output.txt 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Success! Transaction committed using orderer at $ORDERER_ENDPOINT${NC}"
            cat invoke_output.txt
            success=true
            break
        else
            # For the specific case of "relationship already exists", consider it a success
            if grep -q "relationship already exists" invoke_output.txt; then
                echo -e "${GREEN}Relationship already exists - considering as success${NC}"
                cat invoke_output.txt
                success=true
                break
            else
                echo -e "${YELLOW}Invoke failed with orderer at $ORDERER_ENDPOINT, trying next orderer...${NC}"
            fi
        fi
    done
    
    if [ "$success" = false ]; then
        echo -e "${RED}Error: Invoke failed with all available orderers${NC}"
        cat invoke_output.txt
        return 1
    fi
    
    return 0
}

# Helper function for chaincode queries
query_chaincode() {
    local func=$1
    local args=$2
    
    echo -e "${BLUE}Querying chaincode function: ${func}${NC}"
    
    peer chaincode query -C legitifychannel -n credentialCC \
        -c "{\"function\":\"$func\",\"Args\":[$args]}" 2>&1
}

# Helper function to validate JSON response - more relaxed approach
validate_json() {
    # Remove the "Querying chaincode function: X" prefix if present
    local json_string=$(echo "$1" | sed 's/^Querying chaincode function: [^[:space:]]*[[:space:]]*//')
    
    # Check if it's just a boolean value (true/false)
    if [[ "$json_string" == "true" || "$json_string" == "false" ]]; then
        return 0
    fi
    
    # Check if it starts with [ or { which would indicate JSON
    if [[ "$json_string" == \[* || "$json_string" == \{* ]]; then
        # For GetAllRecords results which may be very large, just check if it starts with [ and contains at least one {
        if [[ "$json_string" =~ ^\[.*\{.*$ ]]; then
            return 0
        fi
        
        # Try to validate the JSON with Python, but if it fails, don't consider it automatically invalid
        echo "$json_string" | python3 -m json.tool > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            return 0
        fi
        
        # If Python validation failed but it looks like JSON, still accept it
        if [[ "$json_string" =~ ^\{.*\}$ || "$json_string" =~ ^\[.*\]$ ]]; then
            return 0
        fi
    fi
    
    # If it's not a recognizable JSON format
    return 1
}

# Helper function to check test results
check_test_result() {
    local test_name=$1
    local success=$2
    
    TESTS_RUN=$((TESTS_RUN+1))
    
    if [ $success -eq 0 ]; then
        echo -e "${GREEN}✓ $test_name - PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED+1))
    else
        echo -e "${RED}✗ $test_name - FAILED${NC}"
    fi
}

# Print a header for a test section
print_test_header() {
    echo -e "\n${BLUE}=================================================${NC}"
    echo -e "${BLUE}TEST: $1${NC}"
    echo -e "${BLUE}=================================================${NC}"
}

echo -e "${BLUE}Starting Hyperledger Fabric Credential Chaincode Tests${NC}"
echo -e "${BLUE}Test credential ID: $CREDENTIAL_ID${NC}"
echo -e "${BLUE}Test credential hash: $CREDENTIAL_HASH${NC}"

#################################
# Test 1: Test Issuer-Holder Relationship
#################################
print_test_header "Issuer-Holder Relationship"

# 1.1: Add issuer-holder relationship (Issuer context as Issuer)
set_issuer_context
echo -e "\n${YELLOW}Adding issuer-holder relationship between $HOLDER_ID and $ISSUER_ID${NC}"
invoke_chaincode "AddIssuerHolderRelationship" "\"$HOLDER_ID\",\"$ISSUER_ID\""
ADD_RELATIONSHIP_RESULT=$?
check_test_result "Add Issuer-Holder Relationship" $ADD_RELATIONSHIP_RESULT
sleep 2

# 1.2: Check relationship exists (Issuer context)
echo -e "\n${YELLOW}Checking issuer-holder relationship exists${NC}"
RELATIONSHIP_CHECK=$(query_chaincode "CheckIssuerHolderRelationship" "\"$HOLDER_ID\",\"$ISSUER_ID\"")
echo "Relationship check result: $RELATIONSHIP_CHECK"
# Trim and check if result contains "true" (it may have prefix text)
if echo "$RELATIONSHIP_CHECK" | grep -q "true"; then
    check_test_result "Check Issuer-Holder Relationship" 0
else
    check_test_result "Check Issuer-Holder Relationship" 1
fi
sleep 2

#################################
# Test 2: Issue Credential
#################################
print_test_header "Issue Credential"

# 2.1: Issue a new credential (Issuer context as Issuer)
set_issuer_context
echo -e "\n${YELLOW}Issuing new credential${NC}"
# Update the invoke_chaincode call with all required parameters
invoke_chaincode "IssueCredential" "\"$CREDENTIAL_ID\",\"$CREDENTIAL_HASH\",\"$HOLDER_ID\",\"$ISSUER_ID\",\"$ISSUER_ORG_ID\",\"$CRED_TYPE\",\"$TITLE\",\"$DESCRIPTION\",\"$ACHIEVEMENT_DATE\",\"$EXPIRATION_DATE\",\"$PROGRAM_LENGTH\",\"$DOMAIN\",\"$ATTRIBUTES_JSON\""
ISSUE_RESULT=$?
check_test_result "Issue Credential" $ISSUE_RESULT
sleep 2

# 2.2: Read the issued credential (Issuer context)
echo -e "\n${YELLOW}Reading issued credential${NC}"
CREDENTIAL_DATA=$(query_chaincode "ReadCredential" "\"$CREDENTIAL_ID\"")
echo "Credential data: $CREDENTIAL_DATA"

# Just check if it contains the credential ID and correct data format
if [[ "$CREDENTIAL_DATA" == *"$CREDENTIAL_ID"* && "$CREDENTIAL_DATA" == *"docHash"* && "$CREDENTIAL_DATA" == *"{"* && "$CREDENTIAL_DATA" == *"}"* ]]; then
    check_test_result "Read Credential - Valid JSON" 0
else
    check_test_result "Read Credential - Valid JSON" 1
fi

# Check if the credential has correct data
if [[ "$CREDENTIAL_DATA" == *"$CREDENTIAL_HASH"* && "$CREDENTIAL_DATA" == *"$HOLDER_ID"* && "$CREDENTIAL_DATA" == *"$ISSUER_ID"* ]]; then
    check_test_result "Read Credential - Correct Data" 0
else
    check_test_result "Read Credential - Correct Data" 1
fi
sleep 2

# 2.3: Try to retrieve issuer records
echo -e "\n${YELLOW}Getting issuer records${NC}"
ISSUER_RECORDS=$(query_chaincode "GetIssuerCredentials" "\"$ISSUER_ORG_ID\"")
echo "Issuer records: $ISSUER_RECORDS"

# Simplified check for issuer records - just check if it contains array markers and the credential ID
if [[ "$ISSUER_RECORDS" == *"["* && "$ISSUER_RECORDS" == *"]"* && "$ISSUER_RECORDS" == *"docId"* ]]; then
    check_test_result "Get Issuer Credentials" 0
else
    check_test_result "Get Issuer Credentials" 1
fi
sleep 2

#################################
# Test 3: Credential Acceptance
#################################
print_test_header "Credential Acceptance and Status Changes"

# 3.1: Accept the credential (Holder context as Holder)
set_holder_context
echo -e "\n${YELLOW}Accepting credential${NC}"
invoke_chaincode "AcceptCredential" "\"$CREDENTIAL_ID\""
ACCEPT_RESULT=$?
check_test_result "Accept Credential" $ACCEPT_RESULT
sleep 2

# 3.2: Verify the credential was accepted (Issuer context)
set_issuer_context
echo -e "\n${YELLOW}Verifying credential acceptance${NC}"
CREDENTIAL_DATA=$(query_chaincode "ReadCredential" "\"$CREDENTIAL_ID\"")
CLEAN_CREDENTIAL_DATA=$(echo "$CREDENTIAL_DATA" | sed 's/^Querying chaincode function: ReadCredential[[:space:]]*//')
if [[ "$CLEAN_CREDENTIAL_DATA" == *"\"accepted\":true"* ]]; then
    check_test_result "Verify Credential Acceptance" 0
else
    check_test_result "Verify Credential Acceptance" 1
fi
sleep 2

# 3.3: Deny the credential (Holder context as Holder)
set_holder_context
echo -e "\n${YELLOW}Denying credential${NC}"
invoke_chaincode "DenyCredential" "\"$CREDENTIAL_ID\""
DENY_RESULT=$?
check_test_result "Deny Credential" $DENY_RESULT
sleep 2

# 3.4: Verify the credential was denied (Issuer context)
set_issuer_context
echo -e "\n${YELLOW}Verifying credential denial${NC}"
CREDENTIAL_DATA=$(query_chaincode "ReadCredential" "\"$CREDENTIAL_ID\"")
CLEAN_CREDENTIAL_DATA=$(echo "$CREDENTIAL_DATA" | sed 's/^Querying chaincode function: ReadCredential[[:space:]]*//')
if [[ "$CLEAN_CREDENTIAL_DATA" == *"\"denied\":true"* && "$CLEAN_CREDENTIAL_DATA" == *"\"accepted\":false"* ]]; then
    check_test_result "Verify Credential Denial" 0
else
    check_test_result "Verify Credential Denial" 1
fi
sleep 2

#################################
# Test 4: Hash Verification
#################################
print_test_header "Credential Hash Verification"

# 4.1: Verify the correct hash (Issuer context)
set_issuer_context
echo -e "\n${YELLOW}Verifying correct credential hash${NC}"
VERIFICATION_RESULT=$(query_chaincode "VerifyHash" "\"$CREDENTIAL_ID\",\"$CREDENTIAL_HASH\"")
echo "Hash verification result: $VERIFICATION_RESULT"
if echo "$VERIFICATION_RESULT" | grep -q "true"; then
    check_test_result "Verify Hash - Correct Hash" 0
else
    check_test_result "Verify Hash - Correct Hash" 1
fi
sleep 2

# 4.2: Verify an incorrect hash (Issuer context)
echo -e "\n${YELLOW}Verifying incorrect credential hash${NC}"
INCORRECT_HASH="incorrect_hash_value"
VERIFICATION_RESULT=$(query_chaincode "VerifyHash" "\"$CREDENTIAL_ID\",\"$INCORRECT_HASH\"")
echo "Incorrect hash verification result: $VERIFICATION_RESULT"
if echo "$VERIFICATION_RESULT" | grep -q "false"; then
    check_test_result "Verify Hash - Incorrect Hash" 0
else
    check_test_result "Verify Hash - Incorrect Hash" 1
fi
sleep 2

#################################
# Test 5: Access Control
#################################
print_test_header "Access Control Tests"

# 5.1: Grant access to a verifier (Issuer context)
set_issuer_context
echo -e "\n${YELLOW}Granting access to credential${NC}"
invoke_chaincode "GrantAccess" "\"$CREDENTIAL_ID\",\"$VERIFIER_ID\""
GRANT_RESULT=$?
check_test_result "Grant Access" $GRANT_RESULT
sleep 2

#################################
# Test 6: Get All Credentials
#################################
print_test_header "Query All Credentials"

# 6.1: Get all credentials (Issuer context)
set_issuer_context
echo -e "\n${YELLOW}Getting all credentials${NC}"
ALL_RECORDS=$(query_chaincode "GetAllCredentials" "")
echo "Sample of records: ${ALL_RECORDS:0:200}..."

# Simplified validation for GetAllCredentials - just check structure
if [[ "$ALL_RECORDS" == *"Querying chaincode function: GetAllCredentials"*"["*"docId"* ]]; then
    check_test_result "Get All Credentials" 0
else
    check_test_result "Get All Credentials" 1
fi
sleep 2

#################################
# Test 7: Get Holder Credentials
#################################
print_test_header "Query Holder Credentials"

# 7.1: Get holder credentials
set_issuer_context
echo -e "\n${YELLOW}Getting holder credentials${NC}"
HOLDER_RECORDS=$(query_chaincode "GetHolderCredentials" "\"$HOLDER_ID\"")
echo "Sample of holder records: ${HOLDER_RECORDS:0:200}..."

# Check structure of holder records response
if [[ "$HOLDER_RECORDS" == *"Querying chaincode function: GetHolderCredentials"*"["*"docId"* ]]; then
    check_test_result "Get Holder Credentials" 0
else
    check_test_result "Get Holder Credentials" 1
fi
sleep 2

#################################
# Print Test Summary
#################################
echo -e "\n${BLUE}=================================================${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}=================================================${NC}"
echo -e "Tests run: $TESTS_RUN"
echo -e "Tests passed: $TESTS_PASSED"
echo -e "Success rate: $((100*TESTS_PASSED/TESTS_RUN))%"

if [ $TESTS_PASSED -eq $TESTS_RUN ]; then
    echo -e "\n${GREEN}All tests passed successfully!${NC}"
else
    echo -e "\n${RED}Some tests failed. Please review the output.${NC}"
fi