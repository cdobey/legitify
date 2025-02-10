#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BLUE='\033[0;34m'

API_URL="http://localhost:3001"

echo -e "${BLUE}Starting test flow...${NC}"

# Function to extract token from response
extract_token() {
    echo $1 | grep -o '"token":"[^"]*' | grep -o '[^"]*$'
}

# Function to extract ID from response
extract_id() {
    echo $1 | grep -o '"uid":"[^"]*' | grep -o '[^"]*$'
}

# Function to extract docId from response
extract_doc_id() {
    echo $1 | grep -o '"docId":"[^"]*' | grep -o '[^"]*$'
}

# Function to extract requestId from response
extract_request_id() {
    echo $1 | grep -o '"requestId":"[^"]*' | grep -o '[^"]*$'
}

echo -e "\n${BLUE}1. Registering users...${NC}"

# Register university
echo -e "\n${BLUE}Registering university...${NC}"
UNIVERSITY_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
-H "Content-Type: application/json" \
-d '{
    "email": "university@test.com",
    "password": "password123",
    "username": "testuniversity",
    "role": "university",
    "orgName": "orguniversity"
}')
UNIVERSITY_ID=$(extract_id "$UNIVERSITY_RESPONSE")
echo "University registered with ID: $UNIVERSITY_ID"

# Register individual
echo -e "\n${BLUE}Registering individual...${NC}"
INDIVIDUAL_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
-H "Content-Type: application/json" \
-d '{
    "email": "individual@test.com",
    "password": "password123",
    "username": "testindividual",
    "role": "individual",
    "orgName": "orgindividual"
}')
INDIVIDUAL_ID=$(extract_id "$INDIVIDUAL_RESPONSE")
echo "Individual registered with ID: $INDIVIDUAL_ID"

# Register employer
echo -e "\n${BLUE}Registering employer...${NC}"
EMPLOYER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
-H "Content-Type: application/json" \
-d '{
    "email": "employer@test.com",
    "password": "password123",
    "username": "testemployer",
    "role": "employer",
    "orgName": "orgemployer"
}')
EMPLOYER_ID=$(extract_id "$EMPLOYER_RESPONSE")
echo "Employer registered with ID: $EMPLOYER_ID"

echo -e "\n${BLUE}2. Logging in users...${NC}"

# Login university
echo -e "\n${BLUE}Logging in university...${NC}"
UNIVERSITY_LOGIN=$(curl -s -X POST "$API_URL/auth/test-login" \
-H "Content-Type: application/json" \
-d '{
    "email": "university@test.com",
    "password": "password123"
}')
UNIVERSITY_TOKEN=$(extract_token "$UNIVERSITY_LOGIN")
echo "University logged in"

# Login individual
echo -e "\n${BLUE}Logging in individual...${NC}"
INDIVIDUAL_LOGIN=$(curl -s -X POST "$API_URL/auth/test-login" \
-H "Content-Type: application/json" \
-d '{
    "email": "individual@test.com",
    "password": "password123"
}')
INDIVIDUAL_TOKEN=$(extract_token "$INDIVIDUAL_LOGIN")
echo "Individual logged in"

# Login employer
echo -e "\n${BLUE}Logging in employer...${NC}"
EMPLOYER_LOGIN=$(curl -s -X POST "$API_URL/auth/test-login" \
-H "Content-Type: application/json" \
-d '{
    "email": "employer@test.com",
    "password": "password123"
}')
EMPLOYER_TOKEN=$(extract_token "$EMPLOYER_LOGIN")
echo "Employer logged in"

echo -e "\n${BLUE}3. University issues degree to individual...${NC}"
ISSUE_RESPONSE=$(curl -s -X POST "$API_URL/degree/issue" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $UNIVERSITY_TOKEN" \
-d "{
    \"individualId\": \"$INDIVIDUAL_ID\",
    \"base64File\": \"SGVsbG8gV29ybGQ=\"
}")
DOC_ID=$(extract_doc_id "$ISSUE_RESPONSE")
echo "Degree issued with ID: $DOC_ID"

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
echo "Access requested with ID: $REQUEST_ID"

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
