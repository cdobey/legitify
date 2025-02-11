#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BLUE='\033[0;34m'

API_URL="http://localhost:3001"

echo -e "${BLUE}Starting test flow...${NC}"

# Function to extract token from login response
extract_token() {
    echo $1 | grep -o '"token":"[^"]*' | grep -o '[^"]*$'
}

# Function to extract UID from login response
extract_uid() {
    echo $1 | grep -o '"uid":"[^"]*' | grep -o '[^"]*$'
}

extract_doc_id() {
    echo $1 | grep -o '"docId":"[^"]*' | grep -o '[^"]*$'
}

extract_request_id() {
    echo $1 | grep -o '"requestId":"[^"]*' | grep -o '[^"]*$'
}

echo -e "\n${BLUE}1. Registering users...${NC}"

# Register university (don't need to capture UID here)
echo -e "\n${BLUE}Registering university...${NC}"
curl -s -X POST "$API_URL/auth/register" \
-H "Content-Type: application/json" \
-d '{
    "email": "university@test.com",
    "password": "password123",
    "username": "testuniversity",
    "role": "university",
    "orgName": "orguniversity"
}' > /dev/null

# Register individual
echo -e "\n${BLUE}Registering individual...${NC}"
curl -s -X POST "$API_URL/auth/register" \
-H "Content-Type: application/json" \
-d '{
    "email": "individual@test.com",
    "password": "password123",
    "username": "testindividual",
    "role": "individual",
    "orgName": "orgindividual"
}' > /dev/null

# Register employer
echo -e "\n${BLUE}Registering employer...${NC}"
curl -s -X POST "$API_URL/auth/register" \
-H "Content-Type: application/json" \
-d '{
    "email": "employer@test.com",
    "password": "password123",
    "username": "testemployer",
    "role": "employer",
    "orgName": "orgemployer"
}' > /dev/null

echo -e "\n${BLUE}2. Logging in users and extracting UIDs...${NC}"

# Login university and get UID
echo -e "\n${BLUE}Logging in university...${NC}"
UNIVERSITY_LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/test-login" \
-H "Content-Type: application/json" \
-d '{
    "email": "university@test.com",
    "password": "password123"
}')
UNIVERSITY_TOKEN=$(extract_token "$UNIVERSITY_LOGIN_RESPONSE")
UNIVERSITY_UID=$(extract_uid "$UNIVERSITY_LOGIN_RESPONSE")
echo "University UID: $UNIVERSITY_UID"

# Login individual
echo -e "\n${BLUE}Logging in individual...${NC}"
INDIVIDUAL_LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/test-login" \
-H "Content-Type: application/json" \
-d '{
    "email": "individual@test.com",
    "password": "password123"
}')
INDIVIDUAL_TOKEN=$(extract_token "$INDIVIDUAL_LOGIN_RESPONSE")
INDIVIDUAL_UID=$(extract_uid "$INDIVIDUAL_LOGIN_RESPONSE")
echo "Individual UID: $INDIVIDUAL_UID"

# Login employer
echo -e "\n${BLUE}Logging in employer...${NC}"
EMPLOYER_LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/test-login" \
-H "Content-Type: application/json" \
-d '{
    "email": "employer@test.com",
    "password": "password123"
}')
EMPLOYER_TOKEN=$(extract_token "$EMPLOYER_LOGIN_RESPONSE")
EMPLOYER_UID=$(extract_uid "$EMPLOYER_LOGIN_RESPONSE")
echo "Employer UID: $EMPLOYER_UID"

echo -e "\n${BLUE}3. University issues degree to individual...${NC}"
ISSUE_RESPONSE=$(curl -s -X POST "$API_URL/degree/issue" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $UNIVERSITY_TOKEN" \
-d "{
    \"individualId\": \"$INDIVIDUAL_UID\",
    \"base64File\": \"SGVsbG8gV29ybGQ=\"
}")
echo "Issue Response: $ISSUE_RESPONSE"
DOC_ID=$(extract_doc_id "$ISSUE_RESPONSE")
echo "Degree issued with DOC_ID: $DOC_ID"

echo -e "\n${BLUE}4. Individual accepts degree...${NC}"
ACCEPT_RESPONSE=$(curl -s -X POST "$API_URL/degree/accept" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $INDIVIDUAL_TOKEN" \
-d "{
    \"docId\": \"$DOC_ID\"
}")
echo "Degree acceptance response: $ACCEPT_RESPONSE"

echo -e "\n${BLUE}5. Employer requests access to degree...${NC}"
REQUEST_RESPONSE=$(curl -s -X POST "$API_URL/degree/requestAccess" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $EMPLOYER_TOKEN" \
-d "{
    \"docId\": \"$DOC_ID\"
}")
REQUEST_ID=$(extract_request_id "$REQUEST_RESPONSE")
echo "Access requested with REQUEST_ID: $REQUEST_ID"

echo -e "\n${BLUE}6. Individual grants access to employer...${NC}"
GRANT_RESPONSE=$(curl -s -X POST "$API_URL/degree/grantAccess" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $INDIVIDUAL_TOKEN" \
-d "{
    \"requestId\": \"$REQUEST_ID\",
    \"granted\": true
}")
echo "Access grant response: $GRANT_RESPONSE"

echo -e "\n${BLUE}7. Employer verifies degree...${NC}"
VERIFY_RESPONSE=$(curl -s -X GET "$API_URL/degree/view/$DOC_ID" \
-H "Authorization: Bearer $EMPLOYER_TOKEN")
echo "Verification response: $VERIFY_RESPONSE"

echo -e "\n${GREEN}Test flow completed successfully!${NC}"