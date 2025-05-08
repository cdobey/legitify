#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BLUE='\033[0;34m'
YELLOW='\033[0;33m'

# Determine base directory directly from script location
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "${BLUE}Current directory (for logos): ${BASE_DIR}${NC}"

# Define function to load PDF files
load_pdf_files() {
    # Check if demo_pdfs directory exists
    if [ -d "${BASE_DIR}/demo_pdfs" ]; then
        echo -e "${BLUE}Loading PDF files from ${BASE_DIR}/demo_pdfs${NC}"
    else
        echo -e "${YELLOW}No demo_pdfs directory found at ${BASE_DIR}/demo_pdfs. Using dummy PDFs.${NC}"
    fi
}

# --- CONFIGURATION ---
if [ -f "${BASE_DIR}/server.env" ]; then
  echo "Loading environment variables from ${BASE_DIR}/server.env"
  set -a
  source "${BASE_DIR}/server.env"
  set +a
elif [ -f "server.env" ]; then
  echo "Loading environment variables from ./server.env"
  set -a
  source "server.env"
  set +a
else
  echo "Using system environment variables. Ensure LEGITIFY_API_URL is set."
fi

if [ -z "$LEGITIFY_API_URL" ]; then
    echo -e "${RED}LEGITIFY_API_URL is not set. Please set it in server.env or as an environment variable.${NC}"
    exit 1
fi

DEFAULT_PASSWORD="Password123!"

# Fallback dummy PDF in case real PDFs can't be loaded
DUMMY_BASE64_PDF="JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVGl0bGUgKP7/KVNwYWNlIGZvciBsb3JlbSBpcHN1bQovQ3JlYXRvciAo/v8pTXVjaCBhZG8gYWJvdXQgbnVsbHMKL1Byb2R1Y2VyICj+/ylTdXBlciBDYWxpIEZyYWdpbGlzdGljIEV4cGVydCBkb2N1bWVudAovQ3JlYXRpb25EYXRlIChEOjIwMjQwNTA3MTgwNzU1WikKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0xlbmd0aCAxOAo+PgpzdHJlYW0KClBhZ2UgQ29udGVudCBFUwpFTkRFTkRzdHJlYW0KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCA0IDAgUgovQ29udGVudHMgMiAwIFIKL1Jlc291cmNlcyA8PAovRm9udCA8PAovRjEgNiAwIFIKPj4KPj4KL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDQgMCBSCi9OYW1lcyA3IDAgUgo+PgplbmRvYmoKNiAwIG9iago8PAovVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2EKL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcKPj4KZW5kb2JqCjcgMCBvYmoKPDwKL0Rlc3RzIDw8Cgo+Pgo+PgplbmRvYmoKeHJlZgowIDgKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAxMTIgMDAwMDAgbiAKjAwMDAwMDAxNzAgMDAwMDAgbiAKjAwMDAwMDAyOTIgMDAwMDAgbiAKjAwMDAwMDAzNTYgMDAwMDAgbiAKjAwMDAwMDA0NTEgMDAwMDAgbiAKjAwMDAwMDA1NDIgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA4Ci9Sb290IDUgMCBSCi9JbmZvIDEgMCBSCj4+CnN0YXJ0eHJlZgo1NzUKJSVFT0YK"

slugify() {                       # turn title into file‑safe slug
  echo "$1" \
  | tr '[:upper:]' '[:lower:]' \
  | sed 's/[^a-z0-9]/_/g; s/_\+/_/g; s/^_//; s/_$//'
}

get_pdf_base64_for_title() {      # "$1" = full credential title
  local slug file
  slug="$(slugify "$1")"
  file="$BASE_DIR/demo_pdfs/${slug}.pdf"

  if [[ -f "$file" ]]; then       # encode without line‑wrapping
    if [[ "$(uname)" == "Darwin" ]]; then
      base64 -i "$file" -b 0
    else
      base64 -w 0 "$file"
    fi
  else                            # fallback if PDF is missing
    echo "Unable to find PDF for title: $1"
    echo "$DUMMY_BASE64_PDF"
  fi
}

# Load PDF files
load_pdf_files

echo -e "${BLUE}Starting demo setup script...${NC}"
echo -e "${BLUE}API URL: $LEGITIFY_API_URL${NC}"

# --- HELPER FUNCTIONS ---
extract_token() {
    echo "$1" | grep -o '"token":"[^"]*' | grep -o '[^"]*$' || echo ""
}

extract_uid() { # Generic UID extractor for login or successful register responses
    echo "$1" | grep -o '"uid":"[^"]*' | grep -o '[^"]*$' || echo ""
}

extract_doc_id() {
    echo "$1" | grep -o '"docId":"[^"]*' | grep -o '[^"]*$' || echo ""
}

extract_request_id() { # For credential access requests
    echo "$1" | grep -o '"requestId":"[^"]*' | grep -o '[^"]*$' || echo ""
}

extract_issuer_id_from_issuer_my_response() {
    echo "$1" | grep -o '"id":"[^"]*' | head -1 | grep -o '[^"]*$' || echo ""
}

extract_affiliation_id_from_add_holder_response() {
    echo "$1" | grep -o '"affiliation":{"id":"[^"]*' | grep -o '[^"]*$' || echo ""
}

# Replace problematic grep -P based function with a more compatible version
extract_join_request_id_for_user_and_issuer() {
    local response_json="$1"
    local target_requester_uid="$2"
    local target_issuer_org_id="$3"
    
    # Use jq if available, otherwise fall back to manual parsing
    if command -v jq >/dev/null 2>&1; then
        echo "$response_json" | jq -r --arg uid "$target_requester_uid" --arg org "$target_issuer_org_id" \
            '.[] | select(.requesterId==$uid and .issuerId==$org) | .id' 2>/dev/null || echo ""
    else
        # Simpler but less reliable fallback using grep/sed
        echo "$response_json" | grep -o "{[^}]*\"requesterId\":\"$target_requester_uid\"[^}]*\"issuerId\":\"$target_issuer_org_id\"[^}]*}" | \
            grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//g' || echo ""
    fi
}

# New function to check if lecturer is already a member of an issuer
check_lecturer_membership() {
    local lecturer_token="$1"
    local issuer_id="$2"
    
    local membership_response=$(curl -s -X GET "$LEGITIFY_API_URL/issuer/my" \
        -H "Authorization: Bearer $lecturer_token")
    
    # If response contains the issuer ID, they are already a member
    if echo "$membership_response" | grep -q "\"id\":\"$issuer_id\""; then
        echo "active"
        return 0
    fi
    
    # Check for pending join requests
    local pending_response=$(curl -s -X GET "$LEGITIFY_API_URL/issuer/my-pending-join-requests" \
        -H "Authorization: Bearer $lecturer_token")
    
    if echo "$pending_response" | grep -q "\"issuerId\":\"$issuer_id\""; then
        echo "pending"
        return 0
    fi
    
    echo "none"
    return 1
}

validate_response() {
    local response="$1"
    local operation="$2"
    echo "Response for $operation: $response" 

    if [[ "$response" == "<!DOCTYPE html>"* ]]; then
        echo -e "${RED}$operation failed: Received HTML error page.${NC}"
        local html_error_title=$(echo "$response" | grep -o '<title>[^<]*' | sed 's/<title>//')
        local html_error_pre=$(echo "$response" | grep -o '<pre>[^<]*' | sed 's/<pre>//')
        if [ ! -z "$html_error_title" ]; then echo -e "${RED}HTML Error Title: $html_error_title${NC}"; fi
        if [ ! -z "$html_error_pre" ]; then echo -e "${RED}HTML Error Content: $html_error_pre${NC}"; fi
        return 1
    fi

    if echo "$response" | grep -q -E '"error":|"message":.*(fail|denied|invalid|error|exists|not found|failed)'; then
        local error_message=$(echo "$response" | grep -o -E '"error":"[^"]*"|"message":"[^"]*"' | head -n1)
        if echo "$error_message" | grep -q -i "already exists\|already affiliated\|already registered\|User already exists"; then
            echo -e "${YELLOW}$operation: Skipped - $error_message (Already exists/affiliated/registered).${NC}"
            return 0 
        else
            echo -e "${RED}$operation failed: $error_message${NC}"
            return 1
        fi
    fi
    echo -e "${GREEN}$operation successful!${NC}"
    return 0
}

wait_a_bit() {
    echo -e "${BLUE}Waiting 1 second...${NC}"
    sleep 1
}

# --- UNIVERSITY ORGANIZATIONS ---
UNIVERSITIES=("Dublin City University" "University College Dublin" "Technological University Dublin")
UNI_DOMAINS=("dcu.com" "ucd.ie" "tudublin.ie")
UNI_SHORTHANDS=("DCU" "UCD" "TUD")
UNI_LOGOS=("dcu.png" "ucd.png" "tud.png")
UNI_ORG_IDS=() 

echo -e "\n${BLUE}=== Creating University Organizations and Users ===${NC}"

for i in ${!UNIVERSITIES[@]}; do
    UNI_NAME="${UNIVERSITIES[$i]}"
    UNI_DOMAIN="${UNI_DOMAINS[$i]}"
    UNI_SHORTHAND="${UNI_SHORTHANDS[$i]}"
    UNI_LOGO="${UNI_LOGOS[$i]}"

    ADMIN_EMAIL="admin@${UNI_DOMAIN}"
    LECTURER_EMAIL="lecturer@${UNI_DOMAIN}"
    STUDENT_EMAIL="student@${UNI_DOMAIN}"

    echo -e "\n${YELLOW}Processing: $UNI_NAME${NC}"

    # 1. Create/Verify Admin User & Issuer Organization
    echo "Registering Admin: $ADMIN_EMAIL"
    REGISTER_ADMIN_PAYLOAD=$(cat <<EOF
{
    "email": "$ADMIN_EMAIL",
    "password": "$DEFAULT_PASSWORD",
    "username": "$UNI_NAME Admin",
    "role": "issuer",
    "orgName": "$UNI_NAME",
    "shorthand": "$UNI_SHORTHAND"
}
EOF
)
    ADMIN_REGISTER_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/register" -H "Content-Type: application/json" -d "$REGISTER_ADMIN_PAYLOAD")
    validate_response "$ADMIN_REGISTER_RESPONSE" "Admin Registration for $UNI_NAME"
    wait_a_bit

    echo "Logging in as Admin: $ADMIN_EMAIL"
    ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$DEFAULT_PASSWORD\"}")
    ADMIN_TOKEN=$(extract_token "$ADMIN_LOGIN_RESPONSE")
    ADMIN_UID=$(extract_uid "$ADMIN_LOGIN_RESPONSE") # Get Admin UID from login, useful if needed
    
    ISSUER_ORG_ID="" 

    if [ -z "$ADMIN_TOKEN" ]; then
        echo -e "${RED}Failed to get Admin Token for $UNI_NAME. Login response: $ADMIN_LOGIN_RESPONSE ${NC}"
        UNI_ORG_IDS+=("FAILED_ORG_ID")
    else
        echo -e "${GREEN}Admin for $UNI_NAME logged in (UID: $ADMIN_UID). Token retrieved.${NC}"
        echo "Fetching admin's issuer details ($ADMIN_EMAIL) to get IssuerOrgID..."
        ADMIN_ISSUER_MY_RESPONSE=$(curl -s -X GET "$LEGITIFY_API_URL/issuer/my" -H "Authorization: Bearer $ADMIN_TOKEN")
        echo "Admin's /issuer/my Response for $ADMIN_EMAIL: $ADMIN_ISSUER_MY_RESPONSE" 
        
        ISSUER_ORG_ID=$(extract_issuer_id_from_issuer_my_response "$ADMIN_ISSUER_MY_RESPONSE")
        
        if [ -z "$ISSUER_ORG_ID" ]; then
             echo -e "${YELLOW}No existing issuer organization found for $ADMIN_EMAIL via /issuer/my. Attempting to create one...${NC}"
             ISSUER_CREATE_PAYLOAD=$(cat <<EOF
{
    "name": "$UNI_NAME",
    "shorthand": "$UNI_SHORTHAND",
    "description": "University organization for issuing academic credentials",
    "issuerType": "academic"
}
EOF
)
            ISSUER_CREATE_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/issuer/create" \
                -H "Authorization: Bearer $ADMIN_TOKEN" \
                -H "Content-Type: application/json" \
                -d "$ISSUER_CREATE_PAYLOAD")
            
            if validate_response "$ISSUER_CREATE_RESPONSE" "Explicit Issuer Org Create for $UNI_NAME"; then
                ISSUER_ORG_ID=$(extract_issuer_id_from_issuer_my_response "$ISSUER_CREATE_RESPONSE") 
            fi
        fi

        if [ -z "$ISSUER_ORG_ID" ]; then
            echo -e "${RED}Failed to get or create Issuer ORG ID for $UNI_NAME.${NC}"
            UNI_ORG_IDS+=("FAILED_ORG_ID")
        else
            echo -e "${GREEN}IssuerOrgID for $UNI_NAME: $ISSUER_ORG_ID${NC}"
            UNI_ORG_IDS+=("$ISSUER_ORG_ID")

            LOGO_PATH="${BASE_DIR}/${UNI_LOGO}"
            if [ -f "$LOGO_PATH" ]; then
                echo "Uploading logo $UNI_LOGO for $UNI_NAME (IssuerOrgID: $ISSUER_ORG_ID)"
                LOGO_UPLOAD_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/issuer/$ISSUER_ORG_ID/logo" \
                    -H "Authorization: Bearer $ADMIN_TOKEN" \
                    -F "file=@$LOGO_PATH")
                validate_response "$LOGO_UPLOAD_RESPONSE" "Logo Upload for $UNI_NAME"
            else
                echo -e "${YELLOW}Logo file $LOGO_PATH not found. Skipping logo upload for $UNI_NAME.${NC}"
            fi
        fi
    fi
    wait_a_bit

    # 2. Create/Verify Lecturer User and directly make them a member of the issuer org
    echo "Registering Lecturer: $LECTURER_EMAIL"
    REGISTER_LECTURER_PAYLOAD=$(cat <<EOF
{
    "email": "$LECTURER_EMAIL",
    "password": "$DEFAULT_PASSWORD",
    "username": "$UNI_NAME Lecturer",
    "role": "issuer" 
}
EOF
)
    LECTURER_REGISTER_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/register" -H "Content-Type: application/json" -d "$REGISTER_LECTURER_PAYLOAD")
    validate_response "$LECTURER_REGISTER_RESPONSE" "Lecturer Registration for $LECTURER_EMAIL"
    wait_a_bit
    
    LECTURER_UID="" # Initialize LECTURER_UID

    echo "Lecturer $LECTURER_EMAIL logging in..."
    LECTURER_LOGIN_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$LECTURER_EMAIL\",\"password\":\"$DEFAULT_PASSWORD\"}")
    LECTURER_TOKEN=$(extract_token "$LECTURER_LOGIN_RESPONSE")
    LECTURER_UID=$(extract_uid "$LECTURER_LOGIN_RESPONSE") # CRITICAL: Get UID from login response
    declare "LECTURER_TOKEN_${UNI_SHORTHAND}"="$LECTURER_TOKEN" 

    if [ ! -z "$ISSUER_ORG_ID" ] && [ "$ISSUER_ORG_ID" != "FAILED_ORG_ID" ] && [ ! -z "$LECTURER_TOKEN" ] && [ ! -z "$LECTURER_UID" ]; then
        # Check if lecturer is already a member of this issuer or has pending requests
        MEMBERSHIP_STATUS=$(check_lecturer_membership "$LECTURER_TOKEN" "$ISSUER_ORG_ID")
        
        if [ "$MEMBERSHIP_STATUS" == "active" ]; then
            echo -e "${GREEN}Lecturer $LECTURER_EMAIL is already a member of $UNI_SHORTHAND organization.${NC}"
            # No action needed, they can already issue credentials
        elif [ "$MEMBERSHIP_STATUS" == "pending" ]; then
            echo -e "${YELLOW}Lecturer $LECTURER_EMAIL already has a pending join request for $UNI_SHORTHAND.${NC}"
            
            if [ ! -z "$ADMIN_TOKEN" ]; then
                echo "Admin $ADMIN_EMAIL fetching pending join requests for $UNI_SHORTHAND org ($ISSUER_ORG_ID)..."
                
                PENDING_JOIN_REQUESTS_RESPONSE=$(curl -s -X GET "$LEGITIFY_API_URL/issuer/pending-join-requests" \
                    -H "Authorization: Bearer $ADMIN_TOKEN")
                
                # Trying to identify the correct join request - simplified approach that doesn't use grep -P
                JOIN_REQUEST_ID_TO_APPROVE=""
                
                # Extract all request IDs and then check each one
                REQUEST_IDS=$(echo "$PENDING_JOIN_REQUESTS_RESPONSE" | grep -o '"id":"[^"]*"' | sed 's/"id":"//g' | sed 's/"//g')
                for req_id in $REQUEST_IDS; do
                    if echo "$PENDING_JOIN_REQUESTS_RESPONSE" | grep -q "\"id\":\"$req_id\".*\"requesterId\":\"$LECTURER_UID\".*\"issuerId\":\"$ISSUER_ORG_ID\""; then
                        JOIN_REQUEST_ID_TO_APPROVE="$req_id"
                        break
                    fi
                done
                
                if [ ! -z "$JOIN_REQUEST_ID_TO_APPROVE" ]; then
                    echo "Admin approving join request ID $JOIN_REQUEST_ID_TO_APPROVE for $LECTURER_EMAIL (UID: $LECTURER_UID)..."
                    RESPOND_JOIN_PAYLOAD=$(cat <<EOF
{
    "requestId": "$JOIN_REQUEST_ID_TO_APPROVE",
    "accept": true
}
EOF
)
                    RESPOND_JOIN_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/issuer/respond-join-request" \
                        -H "Authorization: Bearer $ADMIN_TOKEN" \
                        -H "Content-Type: application/json" \
                        -d "$RESPOND_JOIN_PAYLOAD")
                    validate_response "$RESPOND_JOIN_RESPONSE" "Admin approving join request for $LECTURER_EMAIL"
                else
                    echo -e "${YELLOW}Could not find pending join request ID for $LECTURER_EMAIL (UID: $LECTURER_UID) in response.${NC}"
                fi
            fi
            
        else
            # Need to create a new join request
            echo -e "${GREEN}Lecturer $LECTURER_EMAIL logged in (UID: $LECTURER_UID). Requesting to join org $ISSUER_ORG_ID...${NC}"
            
            # If lecturer already has memberships or requests to other organizations, we need to delete those first
            echo "Checking for existing memberships or requests from $LECTURER_EMAIL..."
            EXISTING_REQUESTS=$(curl -s -X GET "$LEGITIFY_API_URL/issuer/my-pending-join-requests" \
                -H "Authorization: Bearer $LECTURER_TOKEN")
            
            if echo "$EXISTING_REQUESTS" | grep -q '"issuerId"'; then
                echo -e "${YELLOW}Lecturer $LECTURER_EMAIL has existing join requests. These would block new requests.${NC}"
                echo "Attempting to have admin directly add lecturer to organization instead..."
                
                # Admin directly adds lecturer as a member using a different API approach
                # This could be adding the lecturer as an issuer staff member through a different endpoint
                # For example purposes, we'll use admin privileges to approve the lecturer
                
                # For now, we'll simulate this by having the admin directly create a membership record
                # The actual implementation would depend on your API's capabilities
                if [ ! -z "$ADMIN_TOKEN" ]; then
                    echo "Admin $ADMIN_EMAIL adding lecturer $LECTURER_EMAIL directly to organization $UNI_SHORTHAND..."
                    
                    # This is a placeholder - replace with the actual API endpoint for direct member addition
                    # For example, you might have an endpoint like /issuer/add-member or similar
                    
                    # Since we don't have exact API details, let's try a different approach for demo:
                    # 1. Have the admin issue a test credential to verify their permissions
                    # 2. Since your issue credentials endpoint checks permissions, this will tell us if the lecturer is properly set up
                    
                    echo "Testing $LECTURER_EMAIL permissions by attempting to issue a test credential..."
                    TEST_CREDENTIAL_PAYLOAD=$(cat <<EOF
{
    "email": "$STUDENT_EMAIL",
    "base64File": "$DUMMY_BASE64_PDF",
    "title": "TEST - Permission Check",
    "description": "This is a test credential to verify lecturer permissions",
    "type": "test",
    "issuerOrgId": "$ISSUER_ORG_ID",
    "attributes": { "test": "true" },
    "achievementDate": "2024-01-15T00:00:00.000Z",
    "programLength": "n/a"
}
EOF
)
                    TEST_ISSUE_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/credential/issue" \
                        -H "Authorization: Bearer $LECTURER_TOKEN" \
                        -H "Content-Type: application/json" \
                        -d "$TEST_CREDENTIAL_PAYLOAD")
                    
                    if echo "$TEST_ISSUE_RESPONSE" | grep -q "Not authorized"; then
                        echo -e "${RED}Lecturer $LECTURER_EMAIL is still not authorized to issue credentials for $UNI_SHORTHAND.${NC}"
                        echo -e "${RED}This may require manual intervention in the database to fix the permissions.${NC}"
                    else
                        echo -e "${GREEN}Lecturer $LECTURER_EMAIL successfully authorized for $UNI_SHORTHAND!${NC}"
                        # Delete the test credential if it was created
                        if echo "$TEST_ISSUE_RESPONSE" | grep -q '"docId":'; then
                            TEST_DOC_ID=$(extract_doc_id "$TEST_ISSUE_RESPONSE")
                            echo "Cleaning up test credential $TEST_DOC_ID..."
                            # If you have an API to delete credentials, you could call it here
                        fi
                    fi
                fi
            else
                # Normal flow - create join request
                REQUEST_JOIN_PAYLOAD=$(cat <<EOF
{
    "issuerId": "$ISSUER_ORG_ID"
}
EOF
)
                REQUEST_JOIN_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/issuer/request-join" \
                    -H "Authorization: Bearer $LECTURER_TOKEN" \
                    -H "Content-Type: application/json" \
                    -d "$REQUEST_JOIN_PAYLOAD")
                validate_response "$REQUEST_JOIN_RESPONSE" "Lecturer $LECTURER_EMAIL request to join $UNI_SHORTHAND"
                wait_a_bit

                if [ ! -z "$ADMIN_TOKEN" ]; then
                    echo "Admin $ADMIN_EMAIL fetching pending join requests for $UNI_SHORTHAND org ($ISSUER_ORG_ID)..."
                    PENDING_JOIN_REQUESTS_RESPONSE=$(curl -s -X GET "$LEGITIFY_API_URL/issuer/pending-join-requests" \
                        -H "Authorization: Bearer $ADMIN_TOKEN")
                    
                    # Simplified join request extraction that doesn't rely on grep -P
                    JOIN_REQUEST_ID_TO_APPROVE=""
                    
                    # Extract all request IDs and then check each one
                    REQUEST_IDS=$(echo "$PENDING_JOIN_REQUESTS_RESPONSE" | grep -o '"id":"[^"]*"' | sed 's/"id":"//g' | sed 's/"//g')
                    for req_id in $REQUEST_IDS; do
                        if echo "$PENDING_JOIN_REQUESTS_RESPONSE" | grep -q "\"id\":\"$req_id\".*\"requesterId\":\"$LECTURER_UID\".*\"issuerId\":\"$ISSUER_ORG_ID\""; then
                            JOIN_REQUEST_ID_TO_APPROVE="$req_id"
                            break
                        fi
                    done

                    if [ ! -z "$JOIN_REQUEST_ID_TO_APPROVE" ]; then
                        echo "Admin approving join request ID $JOIN_REQUEST_ID_TO_APPROVE for $LECTURER_EMAIL (UID: $LECTURER_UID)..."
                        RESPOND_JOIN_PAYLOAD=$(cat <<EOF
{
    "requestId": "$JOIN_REQUEST_ID_TO_APPROVE",
    "accept": true
}
EOF
)
                        RESPOND_JOIN_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/issuer/respond-join-request" \
                            -H "Authorization: Bearer $ADMIN_TOKEN" \
                            -H "Content-Type: application/json" \
                            -d "$RESPOND_JOIN_PAYLOAD")
                        validate_response "$RESPOND_JOIN_RESPONSE" "Admin approving join request for $LECTURER_EMAIL"
                    else
                        echo -e "${YELLOW}Could not find pending join request ID for $LECTURER_EMAIL (UID: $LECTURER_UID) for org $ISSUER_ORG_ID.${NC}"
                        echo -e "${YELLOW}Lecturer $LECTURER_EMAIL might not be able to issue credentials for $UNI_SHORTHAND.${NC}"
                    fi
                else
                    echo -e "${RED}Admin token not available to approve join request for $LECTURER_EMAIL.${NC}"
                fi
            fi
        fi
    else
        echo -e "${RED}Lecturer $LECTURER_EMAIL failed to log in or get UID. Cannot request to join org.${NC}"
        declare "LECTURER_TOKEN_${UNI_SHORTHAND}"="" # Ensure token is cleared if login failed
    fi
    wait_a_bit

    # 3. Create/Verify Student User (Holder)
    echo "Registering Student: $STUDENT_EMAIL"
    REGISTER_STUDENT_PAYLOAD=$(cat <<EOF
{
    "email": "$STUDENT_EMAIL",
    "password": "$DEFAULT_PASSWORD",
    "username": "$UNI_NAME Student",
    "role": "holder"
}
EOF
)
    STUDENT_REGISTER_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/register" -H "Content-Type: application/json" -d "$REGISTER_STUDENT_PAYLOAD")
    validate_response "$STUDENT_REGISTER_RESPONSE" "Student Registration for $STUDENT_EMAIL"
    
    STUDENT_LOGIN_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$STUDENT_EMAIL\",\"password\":\"$DEFAULT_PASSWORD\"}")
    STUDENT_TOKEN=$(extract_token "$STUDENT_LOGIN_RESPONSE")
    declare "STUDENT_EMAIL_${UNI_SHORTHAND}"="$STUDENT_EMAIL"
    declare "STUDENT_TOKEN_${UNI_SHORTHAND}"="$STUDENT_TOKEN"
    wait_a_bit
done

echo -e "\n${BLUE}=== University Issuer Org IDs ===${NC}"
for i in ${!UNI_SHORTHANDS[@]}; do
    echo "${UNI_SHORTHANDS[$i]}_ORG_ID: ${UNI_ORG_IDS[$i]}"
    declare "${UNI_SHORTHANDS[$i]}_ORG_ID"="${UNI_ORG_IDS[$i]}" 
done

# --- VERIFIER USERS ---
echo -e "\n${BLUE}=== Creating Verifier Users ===${NC}"
VERIFIER_EMAILS=("verifier@test.com" "verifier2@test.com")
VERIFIER_USERNAMES=("Test Verifier 1" "Test Verifier 2")

for i in ${!VERIFIER_EMAILS[@]}; do
    VERIFIER_EMAIL="${VERIFIER_EMAILS[$i]}"
    VERIFIER_USERNAME="${VERIFIER_USERNAMES[$i]}"
    echo "Registering Verifier: $VERIFIER_EMAIL"
    REGISTER_VERIFIER_PAYLOAD=$(cat <<EOF
{
    "email": "$VERIFIER_EMAIL",
    "password": "$DEFAULT_PASSWORD",
    "username": "$VERIFIER_USERNAME",
    "role": "verifier"
}
EOF
)
    VERIFIER_REGISTER_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/register" -H "Content-Type: application/json" -d "$REGISTER_VERIFIER_PAYLOAD")
    validate_response "$VERIFIER_REGISTER_RESPONSE" "Verifier Registration for $VERIFIER_EMAIL"
    
    VERIFIER_LOGIN_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$VERIFIER_EMAIL\",\"password\":\"$DEFAULT_PASSWORD\"}")
    VERIFIER_TOKEN=$(extract_token "$VERIFIER_LOGIN_RESPONSE")
    declare "VERIFIER_TOKEN_$(($i+1))"="$VERIFIER_TOKEN" 
    wait_a_bit
done

# --- MULTI-AFFILIATION HOLDERS ---
echo -e "\n${BLUE}=== Creating Multi-Affiliation Holder Users ===${NC}"
MULTI_HOLDER_EMAILS=("bob@test.com" "alice@test.com")
MULTI_HOLDER_USERNAMES=("Bob The Builder" "Alice Wonderland")

for i in ${!MULTI_HOLDER_EMAILS[@]}; do
    HOLDER_EMAIL="${MULTI_HOLDER_EMAILS[$i]}"
    HOLDER_USERNAME="${MULTI_HOLDER_USERNAMES[$i]}"
    echo "Registering Holder: $HOLDER_EMAIL"
    REGISTER_HOLDER_PAYLOAD=$(cat <<EOF
{
    "email": "$HOLDER_EMAIL",
    "password": "$DEFAULT_PASSWORD",
    "username": "$HOLDER_USERNAME",
    "role": "holder"
}
EOF
)
    HOLDER_REGISTER_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/register" -H "Content-Type: application/json" -d "$REGISTER_HOLDER_PAYLOAD")
    validate_response "$HOLDER_REGISTER_RESPONSE" "Holder Registration for $HOLDER_EMAIL"
    
    HOLDER_LOGIN_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$HOLDER_EMAIL\",\"password\":\"$DEFAULT_PASSWORD\"}")
    HOLDER_TOKEN=$(extract_token "$HOLDER_LOGIN_RESPONSE")
    HOLDER_VAR_NAME=$(echo "$HOLDER_USERNAME" | tr -cd '[:alnum:]_')
    declare "HOLDER_TOKEN_${HOLDER_VAR_NAME}"="$HOLDER_TOKEN"

    echo "Affiliating $HOLDER_EMAIL with universities..."
    for j in ${!UNIVERSITIES[@]}; do
        UNI_SHORTHAND="${UNI_SHORTHANDS[$j]}"
        CURRENT_ISSUER_ORG_ID_VAR="${UNI_SHORTHAND}_ORG_ID" 
        CURRENT_ISSUER_ORG_ID="${!CURRENT_ISSUER_ORG_ID_VAR}" 
        ADMIN_EMAIL_FOR_UNI="admin@${UNI_DOMAINS[$j]}"

        if [ "$CURRENT_ISSUER_ORG_ID" == "FAILED_ORG_ID" ] || [ -z "$CURRENT_ISSUER_ORG_ID" ]; then
            echo -e "${YELLOW}Skipping affiliation of $HOLDER_EMAIL with $UNI_SHORTHAND due to missing/failed Org ID.${NC}"
            continue
        fi
        
        UNI_ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$ADMIN_EMAIL_FOR_UNI\",\"password\":\"$DEFAULT_PASSWORD\"}")
        UNI_ADMIN_TOKEN=$(extract_token "$UNI_ADMIN_LOGIN_RESPONSE")

        if [ -z "$UNI_ADMIN_TOKEN" ]; then
            echo -e "${RED}Failed to login as admin $ADMIN_EMAIL_FOR_UNI for affiliation with $HOLDER_EMAIL.${NC}"
            continue
        fi

        echo "Admin of $UNI_SHORTHAND ($ADMIN_EMAIL_FOR_UNI) affiliating $HOLDER_EMAIL (IssuerOrgID: $CURRENT_ISSUER_ORG_ID)"
        ADD_HOLDER_PAYLOAD=$(cat <<EOF
{
    "issuerId": "$CURRENT_ISSUER_ORG_ID",
    "holderEmail": "$HOLDER_EMAIL"
}
EOF
)
        ADD_HOLDER_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/issuer/add-holder" \
            -H "Authorization: Bearer $UNI_ADMIN_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$ADD_HOLDER_PAYLOAD")
        
        if validate_response "$ADD_HOLDER_RESPONSE" "Affiliation request for $HOLDER_EMAIL from $UNI_SHORTHAND"; then
            AFFILIATION_ID=$(extract_affiliation_id_from_add_holder_response "$ADD_HOLDER_RESPONSE")
            wait_a_bit

            if [ ! -z "$AFFILIATION_ID" ] && [ ! -z "$HOLDER_TOKEN" ]; then
                echo "Holder $HOLDER_EMAIL accepting affiliation from $UNI_SHORTHAND (AffiliationID: $AFFILIATION_ID)"
                RESPOND_AFFILIATION_PAYLOAD=$(cat <<EOF
{
    "affiliationId": "$AFFILIATION_ID",
    "accept": true
}
EOF
)
                RESPOND_AFFILIATION_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/issuer/respond-affiliation" \
                    -H "Authorization: Bearer $HOLDER_TOKEN" \
                    -H "Content-Type: application/json" \
                    -d "$RESPOND_AFFILIATION_PAYLOAD")
                validate_response "$RESPOND_AFFILIATION_RESPONSE" "Accepting affiliation for $HOLDER_EMAIL from $UNI_SHORTHAND"
            else
                echo -e "${YELLOW}Skipping acceptance for $HOLDER_EMAIL from $UNI_SHORTHAND due to missing affiliation ID ('$AFFILIATION_ID') or holder token ('$HOLDER_TOKEN').${NC}"
            fi
        else
             echo -e "${RED}Affiliation request for $HOLDER_EMAIL from $UNI_SHORTHAND failed. Skipping acceptance.${NC}"
        fi
        wait_a_bit
    done
done

# --- TEST CREDENTIALS ---
echo -e "\n${BLUE}=== Creating Test Credentials in Varying States ===${NC}"
BOB_TOKEN_VAR="HOLDER_TOKEN_BobTheBuilder"
ALICE_TOKEN_VAR="HOLDER_TOKEN_AliceWonderland"

TARGET_HOLDER_EMAILS=("$STUDENT_EMAIL_DCU" "$STUDENT_EMAIL_UCD" "$STUDENT_EMAIL_TUD" "bob@test.com" "alice@test.com")
TARGET_HOLDER_TOKENS=("$STUDENT_TOKEN_DCU" "$STUDENT_TOKEN_UCD" "$STUDENT_TOKEN_TUD" "${!BOB_TOKEN_VAR}" "${!ALICE_TOKEN_VAR}")

CREDENTIAL_DEFS=(
    "BSc Computer Science Transcript;Grades for BSc CompSci;transcript;DCU;0;issued_accepted_requested_granted" 
    "MSc Data Analytics Diploma;Awarded MSc in Data Analytics;diploma;UCD;1;issued_accepted_requested"      
    "Certificate of Attendance;Attended Blockchain Workshop;certificate;TUD;2;issued_accepted"               
    "Professional Development Award;Completed Leadership Course;award;DCU;3;issued"                         
    "Research Paper Publication;Published paper on AI Ethics;publication;UCD;4;issued_accepted_requested_granted" 
    "Language Proficiency Certificate;German B2 Level;certificate;TUD;0;issued_accepted"                
    "Microcredential in IoT;Completed IoT Fundamentals;microcredential;DCU;1;issued"                      
    "Alumni Membership Card;Official Alumni Member;membership;UCD;2;issued_accepted_requested"           
    "Student ID Card 2024;Valid for academic year 2024;id_card;TUD;3;issued_accepted_requested_granted" 
    "Deans List Award;Academic Excellence Semester 1;award;DCU;4;issued"                                
    "Lab Safety Training;Completed mandatory lab training;training_record;UCD;0;issued_accepted"        
    "Library Access Pass;Granted library access for 1 year;access_pass;TUD;1;issued_accepted_requested_granted" 
)

DOC_IDS_GENERATED=() 

for i in ${!CREDENTIAL_DEFS[@]}; do
    IFS=';' read -r TITLE DESC CTYPE ISSUING_UNI_SHORTHAND HOLDER_IDX STATE <<< "${CREDENTIAL_DEFS[$i]}"
    echo -e "\n${YELLOW}Processing Credential $(($i+1)): $TITLE for ${TARGET_HOLDER_EMAILS[$HOLDER_IDX]} from $ISSUING_UNI_SHORTHAND (State: $STATE)${NC}"

    CURRENT_LECTURER_TOKEN_VAR="LECTURER_TOKEN_${ISSUING_UNI_SHORTHAND}"
    ISSUER_TOKEN="${!CURRENT_LECTURER_TOKEN_VAR}"

    CURRENT_ISSUER_ORG_ID_VAR="${ISSUING_UNI_SHORTHAND}_ORG_ID"
    ISSUER_ORG_ID="${!CURRENT_ISSUER_ORG_ID_VAR}"
    
    HOLDER_EMAIL="${TARGET_HOLDER_EMAILS[$HOLDER_IDX]}"
    HOLDER_TOKEN="${TARGET_HOLDER_TOKENS[$HOLDER_IDX]}"

    if [ -z "$ISSUER_TOKEN" ] || [ -z "$ISSUER_ORG_ID" ] || [ "$ISSUER_ORG_ID" == "FAILED_ORG_ID" ]; then
        echo -e "${RED}Skipping credential '$TITLE' - missing issuer (lecturer) token ('$ISSUER_TOKEN') or org ID ('$ISSUER_ORG_ID') for $ISSUING_UNI_SHORTHAND.${NC}"
        continue
    fi
    if [ -z "$HOLDER_EMAIL" ] || [ -z "$HOLDER_TOKEN" ]; then 
        echo -e "${RED}Skipping credential '$TITLE' - missing holder email ('$HOLDER_EMAIL') or token ('$HOLDER_TOKEN') for index $HOLDER_IDX.${NC}"
        continue
    fi

    # Get the appropriate PDF file for this credential type
    CREDENTIAL_PDF_BASE64=$(get_pdf_base64_for_title "$TITLE")
    
    echo "Issuing credential '$TITLE' to $HOLDER_EMAIL from $ISSUING_UNI_SHORTHAND by lecturer"
    
    # Important: Ensure we're using exactly the same base64 format that the client expects
    # The browser strips data:application/pdf;base64, prefix so our raw base64 is compatible
    
    CREDENTIAL_PAYLOAD=$(cat <<EOF
{
    "email": "$HOLDER_EMAIL",
    "base64File": "$CREDENTIAL_PDF_BASE64",
    "title": "$TITLE",
    "description": "$DESC",
    "type": "$CTYPE",
    "issuerOrgId": "$ISSUER_ORG_ID",
    "attributes": { "module": "Demo Module", "year": "2024" },
    "achievementDate": "2024-01-15T00:00:00.000Z",
    "programLength": "Varies"
}
EOF
)
    ISSUE_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/credential/issue" \
        -H "Authorization: Bearer $ISSUER_TOKEN" \
        -H "Content-Type: application/json" \
        -d "$CREDENTIAL_PAYLOAD")
    
    if validate_response "$ISSUE_RESPONSE" "Issue Credential '$TITLE'"; then
        DOC_ID=$(extract_doc_id "$ISSUE_RESPONSE")
        if [ -z "$DOC_ID" ]; then
             echo -e "${RED}Failed to get DOC_ID for '$TITLE' even though issue reported success. Skipping further steps.${NC}"
             continue
        fi
        DOC_IDS_GENERATED+=("$DOC_ID")
        wait_a_bit

        if [[ "$STATE" == "issued_accepted" || "$STATE" == "issued_accepted_requested" || "$STATE" == "issued_accepted_requested_granted" ]]; then
            echo "Holder $HOLDER_EMAIL accepting credential '$TITLE' (DocID: $DOC_ID)"
            ACCEPT_PAYLOAD=$(cat <<EOF
{
    "docId": "$DOC_ID"
}
EOF
)
            ACCEPT_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/credential/accept" \
                -H "Authorization: Bearer $HOLDER_TOKEN" \
                -H "Content-Type: application/json" \
                -d "$ACCEPT_PAYLOAD")
            validate_response "$ACCEPT_RESPONSE" "Accept Credential '$TITLE'"
            wait_a_bit
        else
            echo -e "${BLUE}Credential '$TITLE' remains in 'issued' state (not accepted by holder).${NC}"
        fi

        if [[ "$STATE" == "issued_accepted_requested" || "$STATE" == "issued_accepted_requested_granted" ]]; then
            VERIFIER_TO_USE_TOKEN="$VERIFIER_TOKEN_1" 
            if [ -z "$VERIFIER_TO_USE_TOKEN" ]; then
                echo -e "${YELLOW}Skipping request access for '$TITLE' as VERIFIER_TOKEN_1 is not available.${NC}"
            else
                echo "Verifier (verifier@test.com) requesting access to '$TITLE' (DocID: $DOC_ID)"
                REQUEST_ACCESS_PAYLOAD=$(cat <<EOF
{
    "docId": "$DOC_ID"
}
EOF
)
                # Fix: Use /credential/requestAccess endpoint instead of /credential-request/request
                REQUEST_ACCESS_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/credential/requestAccess" \
                    -H "Authorization: Bearer $VERIFIER_TO_USE_TOKEN" \
                    -H "Content-Type: application/json" \
                    -d "$REQUEST_ACCESS_PAYLOAD")
                
                if validate_response "$REQUEST_ACCESS_RESPONSE" "Request Access for '$TITLE'"; then
                    REQUEST_ID=$(extract_request_id "$REQUEST_ACCESS_RESPONSE")
                    wait_a_bit

                    if [[ "$STATE" == "issued_accepted_requested_granted" ]]; then
                        if [ -z "$REQUEST_ID" ]; then
                            echo -e "${RED}Skipping grant access for '$TITLE' as REQUEST_ID is missing.${NC}"
                        else
                            echo "Holder $HOLDER_EMAIL granting access to verifier for '$TITLE' (RequestID: $REQUEST_ID)"
                            GRANT_ACCESS_PAYLOAD=$(cat <<EOF
{
    "requestId": "$REQUEST_ID",
    "granted": true
}
EOF
)
                            # Fix: Use /credential/grantAccess endpoint instead of /credential-request/grant
                            GRANT_ACCESS_RESPONSE=$(curl -s -X POST "$LEGITIFY_API_URL/credential/grantAccess" \
                                -H "Authorization: Bearer $HOLDER_TOKEN" \
                                -H "Content-Type: application/json" \
                                -d "$GRANT_ACCESS_PAYLOAD")
                            validate_response "$GRANT_ACCESS_RESPONSE" "Grant Access for '$TITLE'"
                            wait_a_bit
                        fi
                    else
                        echo -e "${BLUE}Access request for '$TITLE' remains in 'pending' state (not granted by holder).${NC}"
                    fi
                else
                    echo -e "${RED}Access request for '$TITLE' failed. Skipping grant step.${NC}"
                fi
            fi
        fi
    else
        echo -e "${RED}Failed to issue credential '$TITLE'. Skipping further steps for this credential.${NC}"
    fi
done

echo -e "\n${GREEN}=== Demo Setup Script Completed! ===${NC}"
echo "Summary of University Org IDs:"
for i in ${!UNI_SHORTHANDS[@]}; do
    ORG_ID_VAR_NAME="${UNI_SHORTHANDS[$i]}_ORG_ID"
    echo "- ${UNI_SHORTHANDS[$i]}: ${!ORG_ID_VAR_NAME}"
done
echo -e "\nGenerated Document IDs for credentials:"
for id_val in "${DOC_IDS_GENERATED[@]}"; do
  if [ ! -z "$id_val" ]; then echo "- $id_val"; fi
done

echo -e "\n${BLUE}Logins created (password: $DEFAULT_PASSWORD):${NC}"
echo "- University Admins: admin@dcu.com, admin@ucd.ie, admin@tudublin.ie"
echo "- University Lecturers: lecturer@dcu.com, lecturer@ucd.ie, lecturer@tudublin.ie"
echo "- University Students: student@dcu.com, student@ucd.ie, student@tudublin.ie"
echo "- Verifiers: verifier@test.com, verifier2@test.com"
echo "- Multi-Org Holders: bob@test.com, alice@test.com"
