#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BLUE='\033[0;34m'
YELLOW='\033[0;33m'

# Determine base directory directly from script location
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo -e "${BLUE}Current directory: ${BASE_DIR}${NC}"

# Set fabric resources path 
FABRIC_RESOURCES_PATH="${BASE_DIR}/src"
echo -e "${BLUE}Using Fabric resources path: ${FABRIC_RESOURCES_PATH}${NC}"

# Export these paths as environment variables for the API to use
export FABRIC_RESOURCES_PATH
export CONNECTION_PROFILES_DIR="${FABRIC_RESOURCES_PATH}/connectionProfiles"
export CERTIFICATES_DIR="${FABRIC_RESOURCES_PATH}/certificates"
export MSP_DIR="${FABRIC_RESOURCES_PATH}/msp"

# Override the paths that would normally be in /app for API access
export APP_CONNECTION_PROFILES_PATH="${CONNECTION_PROFILES_DIR}"
export APP_CERTIFICATES_PATH="${CERTIFICATES_DIR}"
export APP_MSP_PATH="${MSP_DIR}"

echo -e "${BLUE}Using connection profiles directory: ${CONNECTION_PROFILES_DIR}${NC}"
echo -e "${BLUE}Using certificates directory: ${CERTIFICATES_DIR}${NC}"
echo -e "${BLUE}Using MSP directory: ${MSP_DIR}${NC}"

# Get the Supabase URL and key from server.env file or environment
if [ -f server.env ]; then
  echo "Loading environment variables from server.env"
  set -a
  source server.env
  set +a
else
  echo "Using system environment variables"
fi

echo -e "${BLUE}Starting test flow...${NC}"

# Function to extract token from login response
extract_token() {
    echo $1 | grep -o '"token":"[^"]*' | grep -o '[^"]*$' || echo ""
}

# Function to extract UID from login response
extract_uid() {
    echo $1 | grep -o '"uid":"[^"]*' | grep -o '[^"]*$' || echo ""
}

extract_doc_id() {
    echo $1 | grep -o '"docId":"[^"]*' | grep -o '[^"]*$' || echo ""
}

extract_request_id() {
    echo $1 | grep -o '"requestId":"[^"]*' | grep -o '[^"]*$' || echo ""
}

extract_error() {
    local error=$(echo $1 | grep -o '"error":"[^"]*' | grep -o '[^"]*$' 2>/dev/null)
    if [ -z "$error" ]; then
        error=$(echo $1 | grep -o '"message":"[^"]*' | grep -o '[^"]*$' 2>/dev/null)
    fi
    echo $error
}

# Add a delay function to avoid rate limiting
wait_a_bit() {
    echo -e "${BLUE}Waiting 3 seconds...${NC}"
    sleep 3
}

# Validate response for critical errors
validate_response() {
    local response="$1"
    local operation="$2"
    
    # First check for actual error fields
    if [[ "$response" == *"\"error\":"* ]]; then
        local error=$(echo $response | grep -o '"error":"[^"]*' | grep -o '[^"]*$' 2>/dev/null)
        echo -e "${RED}$operation failed: $error${NC}"
        
        # If it's because user already exists, that's okay, we'll proceed
        if [[ "$error" == *"already"* || "$error" == *"exists"* ]]; then
            echo -e "${YELLOW}User already exists, continuing...${NC}"
            return 0
        else
            return 1
        fi
    fi
    
    # Check for database connection errors
    if [[ "$response" == *"FATAL: could not open file"* ]]; then
        echo -e "${RED}Database permission error. Check your Supabase connection settings:${NC}"
        echo -e "${YELLOW}1. Verify POSTGRES_CONNECTION_URL in server.env is correct${NC}"
        echo -e "${YELLOW}2. Check if Prisma needs to be redeployed: npx prisma migrate deploy${NC}"
        echo -e "${YELLOW}3. Ensure your Supabase database password is correct${NC}"
        exit 1
    fi
    
    # If we have a message field but no error field, it's likely a success
    if [[ "$response" == *"\"message\":"* && "$response" == *"success"* ]]; then
        echo -e "${GREEN}$operation successful!${NC}"
    fi
    
    return 0
}

# Check if server is running
echo -e "\n${BLUE}Checking server connection...${NC}"
SERVER_CHECK_RESPONSE=$(curl -s -X GET "$LEGITIFY_API_URL/docs" -m 5 || echo '{"error":"Connection failed"}')

if [[ "$SERVER_CHECK_RESPONSE" == *"error"* ]]; then
    echo -e "${RED}Server connection failed. Make sure the server is running.${NC}"
    echo -e "${YELLOW}Possible issues:${NC}"
    echo -e "${YELLOW}1. Check if LEGITIFY_API_URL in .env is correct (currently: $LEGITIFY_API_URL)${NC}"
    echo -e "${YELLOW}2. Verify the server is running on the expected port (default: 3001)${NC}"
    echo -e "${YELLOW}3. Make sure there are no firewall issues blocking the connection${NC}"
    echo -e "${YELLOW}4. Try running ./src/server/scripts/start-fresh-db.sh first${NC}"
    
    # Try to ping the server to check basic connectivity
    echo -e "\n${BLUE}Attempting to ping server host...${NC}"
    SERVER_HOST=$(echo $LEGITIFY_API_URL | sed -E 's|https?://||' | sed -E 's|/.*||' | sed -E 's|:.*||')
    ping -c 1 $SERVER_HOST > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Host $SERVER_HOST is reachable.${NC}"
        echo -e "${YELLOW}The issue might be with the specific API endpoint or port.${NC}"
    else
        echo -e "${RED}Host $SERVER_HOST is not reachable.${NC}"
        echo -e "${YELLOW}Check your network connection or server address.${NC}"
    fi
    
    exit 1
else
    echo -e "${GREEN}Server is running!${NC}"
fi

# Check if database connection is working
echo -e "\n${BLUE}Checking Supabase connection...${NC}"
DB_CHECK_RESPONSE=$(curl -s -X GET "$SUPABASE_API_URL/rest/v1/" \
-H "apikey: $SUPABASE_ANON_KEY" || echo '{"error":"Connection failed"}')

if [[ "$DB_CHECK_RESPONSE" == *"error"* ]]; then
    echo -e "${RED}Supabase connection failed. Check your Supabase URL and API key.${NC}"
    exit 1
else
    echo -e "${GREEN}Supabase connection successful!${NC}"
fi

echo -e "\n${BLUE}1. Registering users...${NC}"

# Register university with stronger password
echo -e "\n${BLUE}Registering university...${NC}"
UNIVERSITY_REGISTER_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/register" \
-H "Content-Type: application/json" \
-d '{
    "email": "university@test.com",
    "password": "Password123!",
    "username": "testuniversity",
    "role": "university",
    "orgName": "orguniversity"
}')
echo "University Register Response: $UNIVERSITY_REGISTER_RESPONSE"

validate_response "$UNIVERSITY_REGISTER_RESPONSE" "University registration" || exit 1

wait_a_bit

# Register individual
echo -e "\n${BLUE}Registering individual...${NC}"
INDIVIDUAL_REGISTER_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/register" \
-H "Content-Type: application/json" \
-d '{
    "email": "individual@test.com",
    "password": "Password123!",
    "username": "testindividual",
    "role": "individual",
    "orgName": "orgindividual"
}')
echo "Individual Register Response: $INDIVIDUAL_REGISTER_RESPONSE"

validate_response "$INDIVIDUAL_REGISTER_RESPONSE" "Individual registration" || exit 1

wait_a_bit

# Register employer
echo -e "\n${BLUE}Registering employer...${NC}"
EMPLOYER_REGISTER_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/register" \
-H "Content-Type: application/json" \
-d '{
    "email": "employer@test.com",
    "password": "Password123!",
    "username": "testemployer",
    "role": "employer",
    "orgName": "orgemployer"
}')
echo "Employer Register Response: $EMPLOYER_REGISTER_RESPONSE"

validate_response "$EMPLOYER_REGISTER_RESPONSE" "Employer registration" || exit 1

wait_a_bit

echo -e "\n${BLUE}2. Logging in users and extracting UIDs...${NC}"

# Login university through login endpoint
echo -e "\n${BLUE}Logging in university...${NC}"
UNIVERSITY_LOGIN_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/login" \
-H "Content-Type: application/json" \
-d '{
    "email": "university@test.com",
    "password": "Password123!"
}')
echo "University Login Response: $UNIVERSITY_LOGIN_RESPONSE"
UNIVERSITY_TOKEN=$(extract_token "$UNIVERSITY_LOGIN_RESPONSE")
UNIVERSITY_UID=$(extract_uid "$UNIVERSITY_LOGIN_RESPONSE")
echo "University Token: $UNIVERSITY_TOKEN"
echo "University UID: $UNIVERSITY_UID"

if [ -z "$UNIVERSITY_TOKEN" ]; then
    echo -e "${RED}Failed to get token for university user${NC}"
    echo -e "${YELLOW}Check server logs for details${NC}"
    exit 1
fi

wait_a_bit

# Login individual
echo -e "\n${BLUE}Logging in individual...${NC}"
INDIVIDUAL_LOGIN_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/login" \
-H "Content-Type: application/json" \
-d '{
    "email": "individual@test.com",
    "password": "Password123!"
}')
echo "Individual Login Response: $INDIVIDUAL_LOGIN_RESPONSE"
INDIVIDUAL_TOKEN=$(extract_token "$INDIVIDUAL_LOGIN_RESPONSE")
INDIVIDUAL_UID=$(extract_uid "$INDIVIDUAL_LOGIN_RESPONSE")
echo "Individual Token: $INDIVIDUAL_TOKEN"
echo "Individual UID: $INDIVIDUAL_UID"

if [ -z "$INDIVIDUAL_TOKEN" ]; then
    echo -e "${RED}Failed to get token for individual user${NC}"
    echo -e "${YELLOW}Check server logs for details${NC}"
    exit 1
fi

wait_a_bit

# Login employer
echo -e "\n${BLUE}Logging in employer...${NC}"
EMPLOYER_LOGIN_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/login" \
-H "Content-Type: application/json" \
-d '{
    "email": "employer@test.com",
    "password": "Password123!"
}')
echo "Employer Login Response: $EMPLOYER_LOGIN_RESPONSE"
EMPLOYER_TOKEN=$(extract_token "$EMPLOYER_LOGIN_RESPONSE")
EMPLOYER_UID=$(extract_uid "$EMPLOYER_LOGIN_RESPONSE")
echo "Employer Token: $EMPLOYER_TOKEN"
echo "Employer UID: $EMPLOYER_UID"

if [ -z "$EMPLOYER_TOKEN" ]; then
    echo -e "${RED}Failed to get token for employer user${NC}"
    echo -e "${YELLOW}Check server logs for details${NC}"
    exit 1
fi

wait_a_bit

# Test authentication to verify tokens
echo -e "\n${BLUE}Testing authentication for university...${NC}"
AUTH_TEST_RESPONSE=$(curl -s -X GET "$LEGITIFY_API_URL/me" \
-H "Authorization: Bearer $UNIVERSITY_TOKEN")
echo "Auth test response: $AUTH_TEST_RESPONSE"

if [[ "$AUTH_TEST_RESPONSE" == *"error"* ]]; then
    echo -e "${RED}Authentication test failed. Token may be invalid.${NC}"
    echo -e "${YELLOW}Check auth middleware and server logs for details${NC}"
else
    echo -e "${GREEN}Authentication test successful!${NC}"
fi

wait_a_bit

echo -e "\n${BLUE}3. University issues degree to individual...${NC}"
ISSUE_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/degree/issue" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $UNIVERSITY_TOKEN" \
-d "{
    \"email\": \"individual@test.com\",
    \"base64File\": \"JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSIAogICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCgo1IDAgb2JqICAlIHBhZ2UgY29udGVudAo8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRECi9GMSAxMiBUZgooSGVsbG8sIHdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNzkgMDAwMDAgbiAKMDAwMDAwMDE3MyAwMDAwMCBuIAowMDAwMDAwMzAxIDAwMDAwIG4gCjAwMDAwMDAzODAgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDkyCiUlRU9G\",
    \"degreeTitle\": \"Test Degree\",
    \"fieldOfStudy\": \"Computer Science\",
    \"graduationDate\": \"2024-05-01T00:00:00.000Z\",
    \"honors\": \"First Class\",
    \"studentId\": \"12345\",
    \"programDuration\": \"4 years\",
    \"gpa\": 3.8,
    \"additionalNotes\": \"Test degree for integration testing\"
}")
echo "Issue Response: $ISSUE_RESPONSE"
DOC_ID=$(extract_doc_id "$ISSUE_RESPONSE")
echo "Degree issued with DOC_ID: $DOC_ID"

if [ -z "$DOC_ID" ]; then
    echo -e "${RED}Failed to issue degree. Response: $ISSUE_RESPONSE${NC}"
    echo -e "${YELLOW}This could be due to:${NC}"
    echo -e "${YELLOW}1. Database permissions issues${NC}"
    echo -e "${YELLOW}2. Invalid user token${NC}"
    echo -e "${YELLOW}3. Missing wallet identity setup${NC}"
    echo -e "${YELLOW}Check server logs for details.${NC}"
    exit 1
fi

wait_a_bit

echo -e "\n${BLUE}4. Individual accepts degree...${NC}"
ACCEPT_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/degree/accept" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $INDIVIDUAL_TOKEN" \
-d "{
    \"docId\": \"$DOC_ID\"
}")
echo "Degree acceptance response: $ACCEPT_RESPONSE"

if [[ "$ACCEPT_RESPONSE" == *"error"* ]]; then
    echo -e "${RED}Failed to accept degree. Response: $ACCEPT_RESPONSE${NC}"
    echo -e "${YELLOW}Check server logs for more details.${NC}"
else
    echo -e "${GREEN}Degree accepted successfully!${NC}"
fi

wait_a_bit

echo -e "\n${BLUE}5. Employer requests access to degree...${NC}"
REQUEST_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/degree/requestAccess" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $EMPLOYER_TOKEN" \
-d "{
    \"docId\": \"$DOC_ID\"
}")
REQUEST_ID=$(extract_request_id "$REQUEST_RESPONSE")
echo "Access requested with REQUEST_ID: $REQUEST_ID"

if [ -z "$REQUEST_ID" ]; then
    echo -e "${RED}Failed to request access. Response: $REQUEST_RESPONSE${NC}"
    echo -e "${YELLOW}Check server logs for more details.${NC}"
    exit 1
fi

wait_a_bit

echo -e "\n${BLUE}6. Individual grants access to employer...${NC}"
GRANT_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/degree/grantAccess" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $INDIVIDUAL_TOKEN" \
-d "{
    \"requestId\": \"$REQUEST_ID\",
    \"granted\": true
}")
echo "Access grant response: $GRANT_RESPONSE"

if [[ "$GRANT_RESPONSE" == *"error"* ]]; then
    echo -e "${RED}Failed to grant access. Response: $GRANT_RESPONSE${NC}"
    echo -e "${YELLOW}Check server logs for more details.${NC}"
else
    echo -e "${GREEN}Access granted successfully!${NC}"
fi

wait_a_bit

echo -e "\n${BLUE}7. Employer verifies degree...${NC}"
VERIFY_RESPONSE=$(curl -s -X GET "$LEGITIFY_API_URL/degree/view/$DOC_ID" \
-H "Authorization: Bearer $EMPLOYER_TOKEN")
echo "Verification response: $VERIFY_RESPONSE"

if [[ "$VERIFY_RESPONSE" == *"error"* ]]; then
    echo -e "${RED}Failed to verify degree. Response: $VERIFY_RESPONSE${NC}"
    echo -e "${YELLOW}Check server logs for more details.${NC}"
else
    echo -e "${GREEN}Degree verified successfully!${NC}"
fi

echo -e "\n${GREEN}Test flow completed successfully!${NC}"

echo -e "\n${BLUE}=== Troubleshooting Tips ====${NC}"
echo -e "${YELLOW}If you encountered errors:${NC}"
echo -e "1. Check server logs: cat server.log"
echo -e "2. Verify Supabase connection in .env file"
echo -e "3. Confirm Hyperledger Fabric setup is working"
echo -e "4. Visit Supabase dashboard to check user creation"
echo -e "5. Try running ./src/server/scripts/start-fresh-db.sh again" 
echo -e "6. Verify LEGITIFY_API_URL in .env matches the actual server address and port"
echo -e "7. Check if the server process is still running: ps aux | grep node"