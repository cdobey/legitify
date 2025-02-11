#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BLUE='\033[0;34m'

API_URL="http://localhost:3001"

# Use CI environment URL if available
if [ ! -z "$SERVER_URL" ]; then
    API_URL="$SERVER_URL"
fi

# Add error handling
set -e  # Exit on any error

# Add test result tracking
TESTS_PASSED=0
TESTS_FAILED=0
CONTINUE_ON_ERROR=true  # Set to true to continue after test failures

# Modify run_test function to preserve environment variables
run_test() {
    local test_name=$1
    local command=$2

    echo -e "\n${BLUE}Running test: ${test_name}${NC}"
    
    # Create a temporary file to store the results
    local temp_file=$(mktemp)
    
    # Run the command in a subshell that can modify our environment
    (
        eval "$command" > "$temp_file"
        echo $? > "${temp_file}.exit"
    )
    
    # Get the exit code
    local exit_code=$(cat "${temp_file}.exit")
    # Get the output
    local output=$(cat "$temp_file")
    
    # Clean up temp files
    rm -f "$temp_file" "${temp_file}.exit"
    
    # Show the output
    echo "$output"
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ Test passed: ${test_name}${NC}"
        ((TESTS_PASSED++))
        eval "$output" # This preserves any variable assignments from the output
        return 0
    else
        echo -e "${RED}✗ Test failed: ${test_name}${NC}"
        ((TESTS_FAILED++))
        if [ "$CONTINUE_ON_ERROR" != "true" ]; then
            exit 1
        fi
        return 1
    fi
}

# Initialize variables to store response data
UNIVERSITY_ID=""
INDIVIDUAL_ID=""
EMPLOYER_ID=""
UNIVERSITY_TOKEN=""
INDIVIDUAL_TOKEN=""
EMPLOYER_TOKEN=""
DOC_ID=""
REQUEST_ID=""

echo -e "${BLUE}Starting test flow...${NC}"

# Function to extract data from response
extract_data() {
    local response=$1
    local field=$2
    echo "$response" | grep -o "\"$field\":\"[^\"]*\"" | cut -d'"' -f4
}

echo -e "\n${BLUE}1. Registering users...${NC}"

# Register university with error handling
register_university() {
    local response
    response=$(curl -s -X POST "$API_URL/auth/register" -H "Content-Type: application/json" -d '{
        "email": "university@test.com",
        "password": "password123",
        "username": "testuniversity",
        "role": "university",
        "orgName": "orguniversity"
    }')
    
    # Extract and echo the ID for capture
    local id=$(echo "$response" | grep -o '"uid":"[^"]*"' | cut -d'"' -f4)
    if [ -z "$id" ]; then
        echo "Failed to extract university ID from response: $response" >&2
        return 1
    fi
    # Echo as a variable assignment that will be evaluated
    echo "UNIVERSITY_ID='$id'"
    echo "University registered with ID: $id" >&2
    return 0
}

# Register individual with error handling
register_individual() {
    local response
    response=$(curl -s -X POST "$API_URL/auth/register" -H "Content-Type: application/json" -d '{
        "email": "individual@test.com",
        "password": "password123",
        "username": "testindividual",
        "role": "individual",
        "orgName": "orgindividual"
    }')
    
    # Extract and echo the ID for capture
    local id=$(echo "$response" | grep -o '"uid":"[^"]*"' | cut -d'"' -f4)
    if [ -z "$id" ]; then
        echo "Failed to extract individual ID from response: $response" >&2
        return 1
    fi
    # Echo as a variable assignment that will be evaluated
    echo "INDIVIDUAL_ID='$id'"
    echo "Individual registered with ID: $id" >&2
    return 0
}

# Register employer with error handling
register_employer() {
    local response
    response=$(curl -s -X POST "$API_URL/auth/register" -H "Content-Type: application/json" -d '{
        "email": "employer@test.com",
        "password": "password123",
        "username": "testemployer",
        "role": "employer",
        "orgName": "orgemployer"
    }')
    
    # Extract and echo the ID for capture
    local id=$(echo "$response" | grep -o '"uid":"[^"]*"' | cut -d'"' -f4)
    if [ -z "$id" ]; then
        echo "Failed to extract employer ID from response: $response" >&2
        return 1
    fi
    # Echo as a variable assignment that will be evaluated
    echo "EMPLOYER_ID='$id'"
    echo "Employer registered with ID: $id" >&2
    return 0
}

# Run registration tests
run_test "Registering university" register_university || exit 1
echo "University ID: $UNIVERSITY_ID" # Debug output

run_test "Registering individual" register_individual || exit 1
echo "Individual ID: $INDIVIDUAL_ID" # Debug output

run_test "Registering employer" register_employer || exit 1
echo "Employer ID: $EMPLOYER_ID" # Debug output

echo -e "\n${BLUE}2. Logging in users...${NC}"

# Login university with error handling
login_university() {
    local response
    response=$(curl -s -X POST "$API_URL/auth/test-login" -H "Content-Type: application/json" -d '{
        "email": "university@test.com",
        "password": "password123"
    }')
    UNIVERSITY_TOKEN=$(extract_data "$response" "token")
    if [ -z "$UNIVERSITY_TOKEN" ]; then
        echo "Failed to extract university token from response: $response"
        return 1
    fi
    echo "University logged in successfully"
    return 0
}

# Login individual with error handling
login_individual() {
    local response
    response=$(curl -s -X POST "$API_URL/auth/test-login" -H "Content-Type: application/json" -d '{
        "email": "individual@test.com",
        "password": "password123"
    }')
    INDIVIDUAL_TOKEN=$(extract_data "$response" "token")
    if [ -z "$INDIVIDUAL_TOKEN" ]; then
        echo "Failed to extract individual token from response: $response"
        return 1
    fi
    echo "Individual logged in successfully"
    return 0
}

# Login employer with error handling
login_employer() {
    local response
    response=$(curl -s -X POST "$API_URL/auth/test-login" -H "Content-Type: application/json" -d '{
        "email": "employer@test.com",
        "password": "password123"
    }')
    EMPLOYER_TOKEN=$(extract_data "$response" "token")
    if [ -z "$EMPLOYER_TOKEN" ]; then
        echo "Failed to extract employer token from response: $response"
        return 1
    fi
    echo "Employer logged in successfully"
    return 0
}

# Run login tests
run_test "Logging in university" login_university
run_test "Logging in individual" login_individual
run_test "Logging in employer" login_employer

echo -e "\n${BLUE}3. University issues degree to individual...${NC}"

# Issue degree with error handling
issue_degree() {
    local response
    response=$(curl -s -X POST "$API_URL/degree/issue" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $UNIVERSITY_TOKEN" \
        -d "{
            \"individualId\": \"$INDIVIDUAL_ID\",
            \"base64File\": \"SGVsbG8gV29ybGQ=\"
        }")
    DOC_ID=$(extract_data "$response" "docId")
    if [ -z "$DOC_ID" ]; then
        echo "Failed to extract document ID from response: $response"
        return 1
    fi
    echo "Degree issued with ID: $DOC_ID"
    return 0
}

run_test "University issues degree to individual" issue_degree

echo -e "\n${BLUE}4. Individual accepts degree...${NC}"

# Accept degree with error handling
accept_degree() {
    local response
    response=$(curl -s -X POST "$API_URL/degree/accept" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $INDIVIDUAL_TOKEN" \
        -d "{
            \"docId\": \"$DOC_ID\"
        }")
    if ! echo "$response" | grep -q "success"; then
        echo "Failed to accept degree: $response"
        return 1
    fi
    echo "Degree accepted successfully"
    return 0
}

run_test "Individual accepts degree" accept_degree

echo -e "\n${BLUE}5. Employer requests access to degree...${NC}"

# Request access with error handling
request_access() {
    local response
    response=$(curl -s -X POST "$API_URL/degree/requestAccess" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $EMPLOYER_TOKEN" \
        -d "{
            \"docId\": \"$DOC_ID\"
        }")
    REQUEST_ID=$(extract_data "$response" "requestId")
    if [ -z "$REQUEST_ID" ]; then
        echo "Failed to extract request ID from response: $response"
        return 1
    fi
    echo "Access requested with ID: $REQUEST_ID"
    return 0
}

run_test "Employer requests access to degree" request_access

echo -e "\n${BLUE}6. Individual grants access to employer...${NC}"

# Grant access with error handling
grant_access() {
    local response
    response=$(curl -s -X POST "$API_URL/degree/grantAccess" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $INDIVIDUAL_TOKEN" \
        -d "{
            \"requestId\": \"$REQUEST_ID\",
            \"granted\": true
        }")
    if ! echo "$response" | grep -q "success"; then
        echo "Failed to grant access: $response"
        return 1
    fi
    echo "Access granted successfully"
    return 0
}

run_test "Individual grants access to employer" grant_access

echo -e "\n${BLUE}7. Employer verifies degree...${NC}"

# Verify degree with error handling
verify_degree() {
    local response
    response=$(curl -s -X GET "$API_URL/degree/view/$DOC_ID" \
        -H "Authorization: Bearer $EMPLOYER_TOKEN")
    if ! echo "$response" | grep -q "base64File"; then
        echo "Failed to verify degree: $response"
        return 1
    fi
    echo "Degree verified successfully"
    return 0
}

run_test "Employer verifies degree" verify_degree

# Print test summary
echo -e "\n${BLUE}Test Summary:${NC}"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

# Mark as complete if we got here
echo -e "\n${GREEN}Test flow completed successfully!${NC}"

# Exit with success only if all tests passed
if [ "$TESTS_FAILED" -eq 0 ]; then
    exit 0
else
    exit 1
fi