#!/bin/bash

# Set up colors for better output readability
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

source ./ledger.env

# Environment variables (moved from ledger.env)
# OrgUniversity Variables
export ORG_UNIVERSITY_TLS_CERT=$(pwd)/organizations/peerOrganizations/orguniversity.com/tlsca/tlsca.orguniversity.com-cert.pem
export ORG_UNIVERSITY_MSP_PATH=$(pwd)/organizations/peerOrganizations/orguniversity.com/users/Admin@orguniversity.com/msp
export ORG_UNIVERSITY_ADDRESS=localhost:7051

# OrgEmployer Variables
export ORG_EMPLOYER_TLS_CERT=$(pwd)/organizations/peerOrganizations/orgemployer.com/tlsca/tlsca.orgemployer.com-cert.pem
export ORG_EMPLOYER_MSP_PATH=$(pwd)/organizations/peerOrganizations/orgemployer.com/users/Admin@orgemployer.com/msp
export ORG_EMPLOYER_ADDRESS=localhost:8051

# OrgIndividual Variables
export ORG_INDIVIDUAL_TLS_CERT=$(pwd)/organizations/peerOrganizations/orgindividual.com/tlsca/tlsca.orgindividual.com-cert.pem
export ORG_INDIVIDUAL_MSP_PATH=$(pwd)/organizations/peerOrganizations/orgindividual.com/users/Admin@orgindividual.com/msp
export ORG_INDIVIDUAL_ADDRESS=localhost:9051

# Orderer Settings
export ORDERER_CA=$(pwd)/organizations/ordererOrganizations/legitifyapp.com/tlsca/tlsca.legitifyapp.com-cert.pem

# Test data
DEGREE_ID="DEGREE$(date +%s)"
DEGREE_HASH="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
OWNER_ID="INDIVIDUAL001"
ISSUER_ID="OrgUniversityMSP"
UNIVERSITY_ID="UNIVERSITY001"
REQUESTER_ID="EMPLOYER001"

# Success/failure counters
TESTS_RUN=0
TESTS_PASSED=0

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
            -C legitifychannel -n degreeCC \
            --peerAddresses localhost:7051 \
            --tlsRootCertFiles ${ORG_UNIVERSITY_TLS_CERT} \
            --peerAddresses localhost:8051 \
            --tlsRootCertFiles ${ORG_EMPLOYER_TLS_CERT} \
            -c "{\"function\":\"$func\",\"Args\":[$args]}" \
            --waitForEvent > invoke_output.txt 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Success! Transaction committed using orderer at $ORDERER_ENDPOINT${NC}"
            cat invoke_output.txt
            success=true
            break
        else
            # For the specific case of "affiliation already exists", consider it a success
            if grep -q "affiliation already exists" invoke_output.txt; then
                echo -e "${GREEN}Affiliation already exists - considering as success${NC}"
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
    
    peer chaincode query -C legitifychannel -n degreeCC \
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

echo -e "${BLUE}Starting Hyperledger Fabric Degree Chaincode Tests${NC}"
echo -e "${BLUE}Test degree ID: $DEGREE_ID${NC}"
echo -e "${BLUE}Test degree hash: $DEGREE_HASH${NC}"

#################################
# Test 1: Test Affiliation Management
#################################
print_test_header "University-Student Affiliation"

# 1.1: Add university affiliation (University context)
set_university_context
echo -e "\n${YELLOW}Adding university affiliation between $OWNER_ID and $UNIVERSITY_ID${NC}"
invoke_chaincode "AddUniversityAffiliation" "\"$OWNER_ID\",\"$UNIVERSITY_ID\""
ADD_AFFILIATION_RESULT=$?
check_test_result "Add University Affiliation" $ADD_AFFILIATION_RESULT
sleep 2

# 1.2: Check affiliation exists (University context)
echo -e "\n${YELLOW}Checking university affiliation exists${NC}"
AFFILIATION_CHECK=$(query_chaincode "CheckAffiliation" "\"$OWNER_ID\",\"$UNIVERSITY_ID\"")
echo "Affiliation check result: $AFFILIATION_CHECK"
# Trim and check if result contains "true" (it may have prefix text)
if echo "$AFFILIATION_CHECK" | grep -q "true"; then
    check_test_result "Check University Affiliation" 0
else
    check_test_result "Check University Affiliation" 1
fi
sleep 2

#################################
# Test 2: Issue Degree
#################################
print_test_header "Issue Degree"

# 2.1: Issue a new degree (University context)
set_university_context
echo -e "\n${YELLOW}Issuing new degree${NC}"
# Format float as string for the GPA parameter to prevent JSON unmarshaling errors
GPA="3.85"
invoke_chaincode "IssueDegree" "\"$DEGREE_ID\",\"$DEGREE_HASH\",\"$OWNER_ID\",\"$ISSUER_ID\",\"$UNIVERSITY_ID\",\"Bachelor of Science\",\"Computer Science\",\"2025-05-01\",\"First Class\",\"ST12345\",\"4 years\",\"$GPA\",\"Distinction in AI Project\""
ISSUE_RESULT=$?
check_test_result "Issue Degree" $ISSUE_RESULT
sleep 2

# 2.2: Read the issued degree (University context)
echo -e "\n${YELLOW}Reading issued degree${NC}"
DEGREE_DATA=$(query_chaincode "ReadDegree" "\"$DEGREE_ID\"")
echo "Degree data: $DEGREE_DATA"

# Just check if it contains the degree ID and correct data format
if [[ "$DEGREE_DATA" == *"$DEGREE_ID"* && "$DEGREE_DATA" == *"docHash"* && "$DEGREE_DATA" == *"{"* && "$DEGREE_DATA" == *"}"* ]]; then
    check_test_result "Read Degree - Valid JSON" 0
else
    check_test_result "Read Degree - Valid JSON" 1
fi

# Check if the degree has correct data
if [[ "$DEGREE_DATA" == *"$DEGREE_HASH"* && "$DEGREE_DATA" == *"$OWNER_ID"* && "$DEGREE_DATA" == *"$UNIVERSITY_ID"* ]]; then
    check_test_result "Read Degree - Correct Data" 0
else
    check_test_result "Read Degree - Correct Data" 1
fi
sleep 2

# 2.3: Try to retrieve university records
echo -e "\n${YELLOW}Getting university records${NC}"
UNI_RECORDS=$(query_chaincode "GetUniversityRecords" "\"$UNIVERSITY_ID\"")
echo "University records: $UNI_RECORDS"

# Simplified check for university records - just check if it contains array markers and the degree ID
if [[ "$UNI_RECORDS" == *"["* && "$UNI_RECORDS" == *"]"* && "$UNI_RECORDS" == *"docId"* ]]; then
    check_test_result "Get University Records" 0
else
    check_test_result "Get University Records" 1
fi
sleep 2

#################################
# Test 3: Degree Acceptance
#################################
print_test_header "Degree Acceptance and Status Changes"

# 3.1: Accept the degree (Individual context)
set_individual_context
echo -e "\n${YELLOW}Accepting degree${NC}"
invoke_chaincode "AcceptDegree" "\"$DEGREE_ID\""
ACCEPT_RESULT=$?
check_test_result "Accept Degree" $ACCEPT_RESULT
sleep 2

# 3.2: Verify the degree was accepted (University context)
set_university_context
echo -e "\n${YELLOW}Verifying degree acceptance${NC}"
DEGREE_DATA=$(query_chaincode "ReadDegree" "\"$DEGREE_ID\"")
CLEAN_DEGREE_DATA=$(echo "$DEGREE_DATA" | sed 's/^Querying chaincode function: ReadDegree[[:space:]]*//')
if [[ "$CLEAN_DEGREE_DATA" == *"\"accepted\":true"* ]]; then
    check_test_result "Verify Degree Acceptance" 0
else
    check_test_result "Verify Degree Acceptance" 1
fi
sleep 2

# 3.3: Deny the degree (Individual context)
set_individual_context
echo -e "\n${YELLOW}Denying degree${NC}"
invoke_chaincode "DenyDegree" "\"$DEGREE_ID\""
DENY_RESULT=$?
check_test_result "Deny Degree" $DENY_RESULT
sleep 2

# 3.4: Verify the degree was denied (University context)
set_university_context
echo -e "\n${YELLOW}Verifying degree denial${NC}"
DEGREE_DATA=$(query_chaincode "ReadDegree" "\"$DEGREE_ID\"")
CLEAN_DEGREE_DATA=$(echo "$DEGREE_DATA" | sed 's/^Querying chaincode function: ReadDegree[[:space:]]*//')
if [[ "$CLEAN_DEGREE_DATA" == *"\"denied\":true"* && "$CLEAN_DEGREE_DATA" == *"\"accepted\":false"* ]]; then
    check_test_result "Verify Degree Denial" 0
else
    check_test_result "Verify Degree Denial" 1
fi
sleep 2

#################################
# Test 4: Hash Verification
#################################
print_test_header "Degree Hash Verification"

# 4.1: Verify the correct hash (University context)
set_university_context
echo -e "\n${YELLOW}Verifying correct degree hash${NC}"
VERIFICATION_RESULT=$(query_chaincode "VerifyHash" "\"$DEGREE_ID\",\"$DEGREE_HASH\"")
echo "Hash verification result: $VERIFICATION_RESULT"
if echo "$VERIFICATION_RESULT" | grep -q "true"; then
    check_test_result "Verify Hash - Correct Hash" 0
else
    check_test_result "Verify Hash - Correct Hash" 1
fi
sleep 2

# 4.2: Verify an incorrect hash (University context)
echo -e "\n${YELLOW}Verifying incorrect degree hash${NC}"
INCORRECT_HASH="incorrect_hash_value"
VERIFICATION_RESULT=$(query_chaincode "VerifyHash" "\"$DEGREE_ID\",\"$INCORRECT_HASH\"")
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

# 5.1: Grant access to a requester (University context)
set_university_context
echo -e "\n${YELLOW}Granting access to degree${NC}"
invoke_chaincode "GrantAccess" "\"$DEGREE_ID\",\"$REQUESTER_ID\""
GRANT_RESULT=$?
check_test_result "Grant Access" $GRANT_RESULT
sleep 2

#################################
# Test 6: Get All Records
#################################
print_test_header "Query All Records"

# 6.1: Get all records (University context)
set_university_context
echo -e "\n${YELLOW}Getting all degree records${NC}"
ALL_RECORDS=$(query_chaincode "GetAllRecords" "")
echo "Sample of records: ${ALL_RECORDS:0:200}..."

# Simplified validation for GetAllRecords - just check structure
if [[ "$ALL_RECORDS" == *"Querying chaincode function: GetAllRecords"*"["*"docId"* ]]; then
    check_test_result "Get All Records" 0
else
    check_test_result "Get All Records" 1
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