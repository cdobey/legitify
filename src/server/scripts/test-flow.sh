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

# Add test result tracking
TESTS_PASSED=0
TESTS_FAILED=0

# Function to wait for server to be ready
wait_for_server() {
    local max_retries=30
    local retry_count=0
    
    echo -e "${BLUE}Waiting for server to be ready...${NC}"
    while [ $retry_count -lt $max_retries ]; do
        if curl -s "$API_URL/health" > /dev/null; then
            echo -e "${GREEN}Server is ready!${NC}"
            return 0
        fi
        retry_count=$((retry_count + 1))
        sleep 2
    done
    echo -e "${RED}Server failed to start within timeout${NC}"
    return 1
}

# Modified run_test function with retries and better error handling
run_test() {
    local test_name=$1
    local command=$2
    local max_retries=3
    local retry_count=0
    local success=false
    
    echo -e "\n${BLUE}Running test: ${test_name}${NC}"
    
    while [ $retry_count -lt $max_retries ] && [ "$success" = false ]; do
        if [ $retry_count -gt 0 ]; then
            echo -e "${BLUE}Retrying... (Attempt $((retry_count + 1))/${max_retries})${NC}"
            sleep 2
        fi
        
        # Run the command in a subshell to preserve variables
        if (set -e; eval "$command") 2>&1; then
            success=true
            echo -e "${GREEN}✓ Test passed: ${test_name}${NC}"
            ((TESTS_PASSED++))
            return 0
        else
            ((retry_count++))
            if [ $retry_count -eq $max_retries ]; then
                echo -e "${RED}✗ Test failed after $max_retries attempts: ${test_name}${NC}"
                ((TESTS_FAILED++))
                if [ ! -z "$CI" ]; then
                    echo -e "${RED}Critical test failure in CI environment${NC}"
                    return 1
                fi
            fi
        fi
    done
    return 1
}

# Function to extract token from response with error checking
extract_token() {
    local response=$1
    local token=$(echo "$response" | grep -o '"token":"[^"]*' | grep -o '[^"]*$')
    if [ -z "$token" ]; then
        echo -e "${RED}Failed to extract token from response${NC}" >&2
        return 1
    fi
    echo "$token"
}

# Similar error checking for other extract functions
extract_id() {
    local response=$1
    local id=$(echo "$response" | grep -o '"uid":"[^"]*' | grep -o '[^"]*$')
    if [ -z "$id" ]; then
        echo -e "${RED}Failed to extract ID from response${NC}" >&2
        return 1
    fi
    echo "$id"
}

extract_doc_id() {
    local response=$1
    local doc_id=$(echo "$response" | grep -o '"docId":"[^"]*' | grep -o '[^"]*$')
    if [ -z "$doc_id" ]; then
        echo -e "${RED}Failed to extract docId from response${NC}" >&2
        return 1
    fi
    echo "$doc_id"
}

extract_request_id() {
    local response=$1
    local request_id=$(echo "$response" | grep -o '"requestId":"[^"]*' | grep -o '[^"]*$')
    if [ -z "$request_id" ]; then
        echo -e "${RED}Failed to extract requestId from response${NC}" >&2
        return 1
    fi
    echo "$request_id"
}

# Wait for server before starting tests
if ! wait_for_server; then
    echo -e "${RED}Server not ready, cannot proceed with tests${NC}"
    exit 1
fi

echo -e "${BLUE}Starting test flow...${NC}"

# Store variables in a more reliable way
declare -A TEST_VARS

[Rest of your existing test commands remain the same, but wrap variables in TEST_VARS array]

# Example of modified test command:
run_test "Registering university" "
    RESPONSE=\$(curl -s -X POST \"$API_URL/auth/register\" -H \"Content-Type: application/json\" -d '{
        \"email\": \"university@test.com\",
        \"password\": \"password123\",
        \"username\": \"testuniversity\",
        \"role\": \"university\",
        \"orgName\": \"orguniversity\"
    }')
    TEST_VARS[UNIVERSITY_ID]=\$(extract_id \"\$RESPONSE\")
    [ ! -z \"\${TEST_VARS[UNIVERSITY_ID]}\" ] || exit 1
    echo \"University registered with ID: \${TEST_VARS[UNIVERSITY_ID]}\"
"

[Continue with rest of your tests, using TEST_VARS array for variable storage]

# Add trap for cleanup
trap 'echo -e "${RED}Test script interrupted${NC}"; exit 1' INT TERM

# Print test summary
echo -e "\n${BLUE}Test Summary:${NC}"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

# Exit with failure if any tests failed
if [ "$TESTS_FAILED" -gt 0 ]; then
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi

echo -e "\n${GREEN}Test flow completed successfully!${NC}"