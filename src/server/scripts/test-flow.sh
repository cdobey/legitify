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

extract_issuer_id() {
    echo $1 | grep -o '"issuer":{"id":"[^"]*' | grep -o '[^"]*$' || echo ""
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

# Register issuer with stronger password
echo -e "\n${BLUE}Registering issuer...${NC}"
ISSUER_REGISTER_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/register" \
-H "Content-Type: application/json" \
-d '{
    "email": "issuer@test.com",
    "password": "Password123!",
    "username": "testissuer",
    "role": "issuer",
    "issuerName": "test-issuer",
    "shorthand": "TEST"
}')
echo "Issuer Register Response: $ISSUER_REGISTER_RESPONSE"

validate_response "$ISSUER_REGISTER_RESPONSE" "Issuer registration" || exit 1

wait_a_bit

# Register holder
echo -e "\n${BLUE}Registering holder...${NC}"
HOLDER_REGISTER_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/register" \
-H "Content-Type: application/json" \
-d '{
    "email": "holder@test.com",
    "password": "Password123!",
    "username": "testholder",
    "role": "holder"
}')
echo "Holder Register Response: $HOLDER_REGISTER_RESPONSE"

validate_response "$HOLDER_REGISTER_RESPONSE" "Holder registration" || exit 1

wait_a_bit

# Register verifier
echo -e "\n${BLUE}Registering verifier...${NC}"
VERIFIER_REGISTER_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/register" \
-H "Content-Type: application/json" \
-d '{
    "email": "verifier@test.com",
    "password": "Password123!",
    "username": "testverifier",
    "role": "verifier"
}')
echo "Verifier Register Response: $VERIFIER_REGISTER_RESPONSE"

validate_response "$VERIFIER_REGISTER_RESPONSE" "Verifier registration" || exit 1

wait_a_bit

echo -e "\n${BLUE}2. Logging in users and extracting UIDs...${NC}"

# Login issuer
echo -e "\n${BLUE}Logging in issuer...${NC}"
ISSUER_LOGIN_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/login" \
-H "Content-Type: application/json" \
-d '{
    "email": "issuer@test.com",
    "password": "Password123!"
}')
echo "Issuer Login Response: $ISSUER_LOGIN_RESPONSE"
ISSUER_TOKEN=$(extract_token "$ISSUER_LOGIN_RESPONSE")
ISSUER_UID=$(extract_uid "$ISSUER_LOGIN_RESPONSE")
echo "Issuer Token: $ISSUER_TOKEN"
echo "Issuer UID: $ISSUER_UID"

if [ -z "$ISSUER_TOKEN" ]; then
    echo -e "${RED}Failed to get token for issuer user${NC}"
    echo -e "${YELLOW}Check server logs for details${NC}"
    exit 1
fi

wait_a_bit

# Login holder
echo -e "\n${BLUE}Logging in holder...${NC}"
HOLDER_LOGIN_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/login" \
-H "Content-Type: application/json" \
-d '{
    "email": "holder@test.com",
    "password": "Password123!"
}')
echo "Holder Login Response: $HOLDER_LOGIN_RESPONSE"
HOLDER_TOKEN=$(extract_token "$HOLDER_LOGIN_RESPONSE")
HOLDER_UID=$(extract_uid "$HOLDER_LOGIN_RESPONSE")
echo "Holder Token: $HOLDER_TOKEN"
echo "Holder UID: $HOLDER_UID"

if [ -z "$HOLDER_TOKEN" ]; then
    echo -e "${RED}Failed to get token for holder user${NC}"
    echo -e "${YELLOW}Check server logs for details${NC}"
    exit 1
fi

wait_a_bit

# Login verifier
echo -e "\n${BLUE}Logging in verifier...${NC}"
VERIFIER_LOGIN_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/login" \
-H "Content-Type: application/json" \
-d '{
    "email": "verifier@test.com",
    "password": "Password123!"
}')
echo "Verifier Login Response: $VERIFIER_LOGIN_RESPONSE"
VERIFIER_TOKEN=$(extract_token "$VERIFIER_LOGIN_RESPONSE")
VERIFIER_UID=$(extract_uid "$VERIFIER_LOGIN_RESPONSE")
echo "Verifier Token: $VERIFIER_TOKEN"
echo "Verifier UID: $VERIFIER_UID"

if [ -z "$VERIFIER_TOKEN" ]; then
    echo -e "${RED}Failed to get token for verifier user${NC}"
    echo -e "${YELLOW}Check server logs for details${NC}"
    exit 1
fi

wait_a_bit

# Explicitly create an issuer entity if not created during registration
echo -e "\n${BLUE}2a. Creating issuer organization...${NC}"
ISSUER_CREATE_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/issuer/create" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $ISSUER_TOKEN" \
-d '{
    "name": "test-issuer-org", 
    "shorthand": "TEST",
    "description": "An organization that issues professional credentials"
}')
echo "Issuer Create Response: $ISSUER_CREATE_RESPONSE"

# Get the issuer organization ID whether creation succeeded or already exists
echo -e "\n${BLUE}2b. Getting issuer organization ID...${NC}"
ISSUER_ORG_RESPONSE=$(curl -s -X GET "$LEGITIFY_API_URL/issuer/my" \
-H "Authorization: Bearer $ISSUER_TOKEN")
echo "Issuer Org Response: $ISSUER_ORG_RESPONSE"
ISSUER_ID=$(echo $ISSUER_ORG_RESPONSE | grep -o '"id":"[^"]*' | head -1 | grep -o '[^"]*$')
echo "Issuer ID: $ISSUER_ID"

if [ -z "$ISSUER_ID" ]; then
    echo -e "${RED}Failed to get issuer organization ID. Response: $ISSUER_ORG_RESPONSE${NC}"
    exit 1
fi

wait_a_bit

echo -e "\n${BLUE}2c. Issuer adds the holder to the organization...${NC}"
ADD_HOLDER_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/issuer/add-holder" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $ISSUER_TOKEN" \
-d "{
    \"issuerId\": \"$ISSUER_ID\",
    \"holderEmail\": \"holder@test.com\"
}")
echo "Add Holder Response: $ADD_HOLDER_RESPONSE"

if [[ "$ADD_HOLDER_RESPONSE" == *"error"* ]]; then
    echo -e "${RED}Failed to add holder to issuer. Response: $ADD_HOLDER_RESPONSE${NC}"
    exit 1
fi

wait_a_bit

echo -e "\n${BLUE}2c. Holder approves the issuer affiliation request...${NC}"
# First get the affiliations to find the affiliation ID
PENDING_AFFILIATIONS_RESPONSE=$(curl -s -X GET "$LEGITIFY_API_URL/issuer/pending-affiliations" \
-H "Authorization: Bearer $HOLDER_TOKEN")
echo "Pending Affiliations Response: $PENDING_AFFILIATIONS_RESPONSE"

# Extract the affiliation ID from the response
AFFILIATION_ID=$(echo $PENDING_AFFILIATIONS_RESPONSE | grep -o '"id":"[^"]*' | head -1 | grep -o '[^"]*$')
echo "Affiliation ID: $AFFILIATION_ID"

# Approve the affiliation
if [ -n "$AFFILIATION_ID" ]; then
  APPROVE_AFFILIATION_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/issuer/respond-affiliation" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $HOLDER_TOKEN" \
  -d "{
      \"affiliationId\": \"$AFFILIATION_ID\",
      \"accept\": true
  }")
  echo "Approve Affiliation Response: $APPROVE_AFFILIATION_RESPONSE"
  
  # Check if there was an error in the approval
  if [[ "$APPROVE_AFFILIATION_RESPONSE" == *"error"* ]]; then
    echo -e "${RED}Failed to approve affiliation: $APPROVE_AFFILIATION_RESPONSE${NC}"
    exit 1
  else
    echo -e "${GREEN}Affiliation successfully approved!${NC}"
  fi
else
  echo -e "${RED}No pending affiliation found, the issuer might not have added the holder yet${NC}"
  exit 1
fi

wait_a_bit

echo -e "\n${BLUE}3. Issuer issues credential to holder...${NC}"
ISSUE_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/credential/issue" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $ISSUER_TOKEN" \
-d "{
    \"email\": \"holder@test.com\",
    \"issuerOrgId\": \"$ISSUER_ID\",
    \"base64File\": \"JVBERi0xLjcKCjEgMCBvYmogICUgZW50cnkgcG9pbnQKPDwKICAvVHlwZSAvQ2F0YWxvZwogIC9QYWdlcyAyIDAgUgo+PgplbmRvYmoKCjIgMCBvYmoKPDwKICAvVHlwZSAvUGFnZXMKICAvTWVkaWFCb3ggWyAwIDAgMjAwIDIwMCBdCiAgL0NvdW50IDEKICAvS2lkcyBbIDMgMCBSIF0KPj4KZW5kb2JqCgozIDAgb2JqCjw8CiAgL1R5cGUgL1BhZ2UKICAvUGFyZW50IDIgMCBSCiAgL1Jlc291cmNlcyA8PAogICAgL0ZvbnQgPDwKICAgICAgL0YxIDQgMCBSIAogICAgPj4KICA+PgogIC9Db250ZW50cyA1IDAgUgo+PgplbmRvYmoKCjQgMCBvYmoKPDwKICAvVHlwZSAvRm9udAogIC9TdWJ0eXBlIC9UeXBlMQogIC9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KZW5kb2JqCgo1IDAgb2JqICAlIHBhZ2UgY29udGVudAo8PAogIC9MZW5ndGggNDQKPj4Kc3RyZWFtCkJUCjcwIDUwIFRECi9GMSAxMiBUZgooSGVsbG8sIHdvcmxkISkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNzkgMDAwMDAgbiAKMDAwMDAwMDE3MyAwMDAwMCBuIAowMDAwMDAwMzAxIDAwMDAwIG4gCjAwMDAwMDAzODAgMDAwMDAgbiAKdHJhaWxlcgo8PAogIC9TaXplIDYKICAvUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKNDkyCiUlRU9G\",
    \"title\": \"Test Credential\",
    \"description\": \"Professional Certificate\",
    \"achievementDate\": \"2024-05-01T00:00:00.000Z\",
    \"programLength\": \"4 years\",
    \"domain\": \"Computer Science\",
    \"type\": \"certificate\",
    \"attributes\": {
        \"honors\": \"First Class\",
        \"holderId\": \"12345\",
        \"duration\": \"4 years\",
        \"grade\": \"3.8\"
    }
}")
echo "Issue response: $ISSUE_RESPONSE"

# Extract the document ID from the response
DOC_ID=$(extract_doc_id "$ISSUE_RESPONSE")
echo "Credential issued with DOC_ID: $DOC_ID"

if [ -z "$DOC_ID" ]; then
    echo -e "${RED}Failed to extract document ID from response:${NC} $ISSUE_RESPONSE"
    exit 1
fi

wait_a_bit

echo -e "\n${BLUE}4. Holder accepts credential...${NC}"
ACCEPT_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/credential/accept" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $HOLDER_TOKEN" \
-d "{
    \"docId\": \"$DOC_ID\"
}")
echo "Credential acceptance response: $ACCEPT_RESPONSE"

if [[ "$ACCEPT_RESPONSE" == *"error"* ]]; then
    echo -e "${RED}Failed to accept credential. Response: $ACCEPT_RESPONSE${NC}"
    echo -e "${YELLOW}Check server logs for more details.${NC}"
else
    echo -e "${GREEN}Credential accepted successfully!${NC}"
fi

wait_a_bit

echo -e "\n${BLUE}5. Verifier requests access to credential...${NC}"
REQUEST_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/credential/requestAccess" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $VERIFIER_TOKEN" \
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

echo -e "\n${BLUE}6. Holder grants access to verifier...${NC}"
GRANT_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/credential/grantAccess" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $HOLDER_TOKEN" \
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

echo -e "\n${BLUE}7. Verifier views credential...${NC}"
VERIFY_RESPONSE=$(curl -s -X GET "$LEGITIFY_API_URL/credential/view/$DOC_ID" \
-H "Authorization: Bearer $VERIFIER_TOKEN")
echo "Verification response: $VERIFY_RESPONSE"

if [[ "$VERIFY_RESPONSE" == *"error"* ]]; then
    echo -e "${RED}Failed to view credential. Response: $VERIFY_RESPONSE${NC}"
    echo -e "${YELLOW}Check server logs for more details.${NC}"
else
    echo -e "${GREEN}Credential viewed successfully!${NC}"
fi

# The test is complete, let's also check if holder can see their credentials
echo -e "\n${BLUE}8. Checking holder's credentials...${NC}"
MY_CREDENTIALS_RESPONSE=$(curl -s -X GET "$LEGITIFY_API_URL/credential/list" \
-H "Authorization: Bearer $HOLDER_TOKEN")
echo "Holder's credentials: $MY_CREDENTIALS_RESPONSE"

# Verify the issuer info is properly displayed
if [[ "$MY_CREDENTIALS_RESPONSE" == *"Test Issuer"* ]]; then
    echo -e "${GREEN}Issuer name displayed correctly in credential records!${NC}"
else
    echo -e "${YELLOW}Note: Issuer name might not be showing up correctly in credential records${NC}"
fi

# Let's also check that the verifier can see the credentials they have access to
echo -e "\n${BLUE}9. Checking verifier's accessible credentials...${NC}"
ACCESSIBLE_CREDENTIALS_RESPONSE=$(curl -s -X GET "$LEGITIFY_API_URL/credential/accessible" \
-H "Authorization: Bearer $VERIFIER_TOKEN")
echo "Verifier's accessible credentials: $ACCESSIBLE_CREDENTIALS_RESPONSE"

if [[ "$ACCESSIBLE_CREDENTIALS_RESPONSE" == *"$DOC_ID"* ]]; then
    echo -e "${GREEN}Verifier can see the accessible credential!${NC}"
else
    echo -e "${YELLOW}Note: Verifier might not be able to see the accessible credential${NC}"
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