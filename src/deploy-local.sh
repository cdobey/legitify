#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BLUE='\033[0;34m'
YELLOW='\033[0;33m'

# Base directory
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "${BLUE}Current directory: ${BASE_DIR}${NC}"

# Global status flags
SERVER_RUNNING=false

# Function to check if a program is installed
check_dependency() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}Error: $1 is not installed. Please install it and try again.${NC}"
        exit 1
    fi
}

# Function to print section header
print_header() {
    echo -e "\n${BLUE}======================================================${NC}"
    echo -e "${BLUE}   $1${NC}"
    echo -e "${BLUE}======================================================${NC}"
}

# Function to start the Hyperledger Fabric network
start_fabric() {
    print_header "1. Starting Hyperledger Fabric Network"
    cd "${BASE_DIR}/ledger/legitify-network"
    
    if [ -f "scripts/startNetwork.sh" ]; then
        echo -e "${YELLOW}Starting Hyperledger Fabric network...${NC}"
        bash scripts/startNetwork.sh
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to start Hyperledger Fabric network. Exiting.${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}Hyperledger Fabric network started successfully!${NC}"
    else
        echo -e "${RED}startNetwork.sh script not found in ${BASE_DIR}/ledger/legitify-network/scripts${NC}"
        exit 1
    fi
    
    cd "${BASE_DIR}"
}

# Function to start local Supabase
start_supabase() {
    print_header "2. Starting Local Supabase Database"
    
    # Check if supabase CLI is installed
    check_dependency supabase
    
    # Check if we have a supabase directory, if not create one
    if [ ! -d "${BASE_DIR}/server/supabase-local" ]; then
        echo -e "${YELLOW}Creating local Supabase directory...${NC}"
        mkdir -p "${BASE_DIR}/server/supabase-local"
        cd "${BASE_DIR}/server/supabase-local"
        supabase init
    else
        cd "${BASE_DIR}/server/supabase-local"
    fi
    
    # Start Supabase
    echo -e "${YELLOW}Starting local Supabase...${NC}"
    supabase start
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to start local Supabase. Exiting.${NC}"
        exit 1
    fi
    
    # Get the Supabase URLs and keys
    SUPABASE_API_URL=$(supabase status | grep "API URL" | awk '{print $3}')
    SUPABASE_DB_URL=$(supabase status | grep "DB URL" | awk '{print $3}')
    SUPABASE_ANON_KEY=$(supabase status | grep "anon key" | awk '{print $3}')
    SUPABASE_SERVICE_KEY=$(supabase status | grep "service_role key" | awk '{print $3}')
    
    echo -e "${GREEN}Local Supabase started successfully!${NC}"
    echo -e "\n${YELLOW}Please add these values to your server.env file:${NC}"
    echo -e "${BLUE}POSTGRES_CONNECTION_URL=${SUPABASE_DB_URL}${NC}"
    echo -e "${BLUE}SUPABASE_API_URL=${SUPABASE_API_URL}${NC}"
    echo -e "${BLUE}SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}${NC}"
    echo -e "${BLUE}SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}${NC}"
    
    # Ask user to confirm they've updated server.env
    read -p "Have you updated server.env with these values? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Please update server.env before continuing. Exiting.${NC}"
        exit 1
    fi
    
    cd "${BASE_DIR}"
}

# Function to set up the database
setup_database() {
    print_header "3. Setting up the Database"
    cd "${BASE_DIR}/server"
    
    echo -e "${YELLOW}Setting up the database using start-fresh-db.sh...${NC}"
    IS_LOCAL_SUPABASE=true bash scripts/start-fresh-db.sh
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to set up the database. Exiting.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Database setup completed successfully!${NC}"
    
    cd "${BASE_DIR}"
}

# Function to start the server
start_server() {
    print_header "4. Starting the Server"
    cd "${BASE_DIR}/server"
    
    # Kill any existing server process
    if [ -f "${BASE_DIR}/server.pid" ]; then
        SERVER_PID=$(cat "${BASE_DIR}/server.pid")
        kill -9 $SERVER_PID 2>/dev/null || true
        rm "${BASE_DIR}/server.pid"
    fi
    
    echo -e "${YELLOW}Starting the server with npm run dev...${NC}"
    echo -e "${YELLOW}The server will run in the background. Logs will be saved to server.log${NC}"
    
    # Start server in the background and redirect output to server.log
    npm run dev > server.log 2>&1 &
    SERVER_PID=$!
    
    # Save the PID to a file for later teardown
    echo $SERVER_PID > "${BASE_DIR}/server.pid"
    
    # Wait a moment for the server to start
    echo -e "${YELLOW}Waiting for server to start...${NC}"
    sleep 20
    
    # Check if server is running
    if ps -p $SERVER_PID > /dev/null; then
        echo -e "${GREEN}Server started successfully with PID: ${SERVER_PID}${NC}"
        SERVER_RUNNING=true
    else
        echo -e "${RED}Failed to start the server. Check server.log for details.${NC}"
        echo -e "${YELLOW}You can fix the issues and restart the server later using the 's' key.${NC}"
        echo -e "${YELLOW}Would you like to continue with the rest of the deployment? (y/n)${NC}"
        read -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}Exiting deployment.${NC}"
            exit 1
        fi
        SERVER_RUNNING=false
    fi
    
    cd "${BASE_DIR}"
}

# Function to run the test flow
run_test_flow() {
    print_header "5. Running Test Flow"
    cd "${BASE_DIR}/server"
    
    echo -e "${YELLOW}Running test flow script...${NC}"
    bash scripts/test-flow.sh
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Test flow failed. Check the logs above for errors.${NC}"
        echo -e "${YELLOW}Continuing anyway...${NC}"
    else
        echo -e "${GREEN}Test flow completed successfully!${NC}"
    fi
    
    cd "${BASE_DIR}"
}

# Function to start the client
start_client() {
    print_header "6. Starting the Client"
    cd "${BASE_DIR}/client/legitify-project"
    
    # Kill existing client process if any
    if [ -f "${BASE_DIR}/client.pid" ]; then
        CLIENT_PID=$(cat "${BASE_DIR}/client.pid")
        kill -9 $CLIENT_PID 2>/dev/null || true
        rm "${BASE_DIR}/client.pid"
    fi
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing client dependencies...${NC}"
        npm install
    fi
    
    echo -e "${YELLOW}Starting the client with npm run dev...${NC}"
    echo -e "${YELLOW}The client will run in the background. Logs will be saved to client.log${NC}"
    
    # Start client in the background
    npm run dev > "${BASE_DIR}/client.log" 2>&1 &
    CLIENT_PID=$!
    
    # Save PID for later
    echo $CLIENT_PID > "${BASE_DIR}/client.pid"
    
    # Wait a moment for the client to start
    sleep 5
    
    # Check if client is running
    if ps -p $CLIENT_PID > /dev/null; then
        echo -e "${GREEN}Client started successfully with PID: ${CLIENT_PID}${NC}"
        # Print client URL
        echo -e "${BLUE}Client should be available at: ${YELLOW}http://localhost:5173${NC}"
    else
        echo -e "${RED}Failed to start the client. Check client.log for details.${NC}"
        echo -e "${YELLOW}Continuing anyway...${NC}"
    fi
    
    cd "${BASE_DIR}"
}

# Function to restart client
restart_client() {
    print_header "Restarting Client"
    
    # Kill existing client process
    if [ -f "${BASE_DIR}/client.pid" ]; then
        CLIENT_PID=$(cat "${BASE_DIR}/client.pid")
        echo -e "${YELLOW}Stopping client with PID: ${CLIENT_PID}...${NC}"
        kill -9 $CLIENT_PID 2>/dev/null || true
        rm "${BASE_DIR}/client.pid"
    fi
    
    # Find and kill any processes using port 3000
    echo -e "${YELLOW}Ensuring port 5173 is free...${NC}"
    lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true
    
    # Wait a moment to ensure the port is released
    echo -e "${YELLOW}Waiting for port to be released...${NC}"
    sleep 3
    
    # Start the client
    start_client
}

# Function to restart server
restart_server() {
    print_header "Restarting Server"
    
    # Kill existing server process
    if [ -f "${BASE_DIR}/server.pid" ]; then
        SERVER_PID=$(cat "${BASE_DIR}/server.pid")
        echo -e "${YELLOW}Stopping server with PID: ${SERVER_PID}...${NC}"
        kill -9 $SERVER_PID 2>/dev/null || true
        rm "${BASE_DIR}/server.pid"
    fi
    
    # Find and kill any processes using port 3001
    echo -e "${YELLOW}Ensuring port 3001 is free...${NC}"
    lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true
    
    # Wait a moment to ensure the port is released
    echo -e "${YELLOW}Waiting for port to be released...${NC}"
    sleep 3
    
    # Start the server
    cd "${BASE_DIR}/server"
    
    echo -e "${YELLOW}Starting the server with npm run dev...${NC}"
    echo -e "${YELLOW}The server will run in the background. Logs will be saved to server.log${NC}"
    
    # Start server in the background and redirect output to server.log
    npm run dev > server.log 2>&1 &
    SERVER_PID=$!
    
    # Save the PID to a file for later teardown
    echo $SERVER_PID > "${BASE_DIR}/server.pid"
    
    # Wait a moment for the server to start
    echo -e "${YELLOW}Waiting for server to start...${NC}"
    sleep 20
    
    # Check if server is running
    if ps -p $SERVER_PID > /dev/null; then
        echo -e "${GREEN}Server started successfully with PID: ${SERVER_PID}${NC}"
        SERVER_RUNNING=true
    else
        echo -e "${RED}Failed to start the server. Check server.log for details.${NC}"
        echo -e "${YELLOW}You can fix the issues and restart the server again using the 's' key.${NC}"
        SERVER_RUNNING=false
    fi
    
    cd "${BASE_DIR}"
}

# Function to restart Hyperledger Fabric network
restart_fabric() {
    print_header "Restarting Hyperledger Fabric Network"
    
    # Stop the network first
    cd "${BASE_DIR}/ledger/legitify-network"
    echo -e "${YELLOW}Stopping Hyperledger Fabric network...${NC}"
    ./network.sh down
    
    # Then start it again
    start_fabric
    
    # We need to update the database after restarting the network
    setup_database
    
    # And restart the server to connect to the new network
    restart_server
}

# Function to restart Supabase
restart_supabase() {
    print_header "Restarting Supabase Database"
    
    # Stop Supabase
    if [ -d "${BASE_DIR}/server/supabase-local" ]; then
        cd "${BASE_DIR}/server/supabase-local"
        echo -e "${YELLOW}Stopping Supabase...${NC}"
        supabase stop
        
        # Start it again
        echo -e "${YELLOW}Starting Supabase...${NC}"
        supabase start
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to restart Supabase.${NC}"
            return 1
        fi
        
        echo -e "${GREEN}Supabase restarted successfully!${NC}"
    else
        echo -e "${RED}Supabase directory not found.${NC}"
        return 1
    fi
    
    # We should reset the database after restarting Supabase
    setup_database
    
    # And restart the server
    restart_server
}

# Interactive mode - allows user to restart components while the app is running
interactive_mode() {
    print_header "Interactive Mode"
    echo -e "${BLUE}The application is now running.${NC}"
    if [ "$SERVER_RUNNING" = false ]; then
        echo -e "${RED}WARNING: The server is not running! Fix any issues and press 's' to restart it.${NC}"
        echo -e "${YELLOW}Check server.log for error details.${NC}"
    fi
    echo -e "${YELLOW}You can interact with it in your browser.${NC}"
    echo -e "\n${BLUE}Interactive Controls:${NC}"
    echo -e "${YELLOW}Press 'c' to restart the client${NC}"
    echo -e "${YELLOW}Press 's' to restart the server${NC}"
    echo -e "${YELLOW}Press 'n' to restart the Hyperledger Fabric network${NC}"
    echo -e "${YELLOW}Press 'd' to restart the Supabase database${NC}"
    echo -e "${YELLOW}Press 'l' to view the last 20 lines of server.log${NC}"
    echo -e "${YELLOW}Press 'q' to quit and teardown everything${NC}"
    
    # Main interactive loop
    while true; do
        # Read a single character without requiring Enter key
        read -rsn1 key
        
        case "$key" in
            c)
                restart_client
                ;;
            s)
                restart_server
                ;;
            n)
                restart_fabric
                ;;
            d)
                restart_supabase
                ;;
            l)
                print_header "Last 20 lines of server.log"
                tail -n 20 "${BASE_DIR}/server.log"
                ;;
            q)
                print_header "Quitting and tearing down"
                teardown
                break
                ;;
            *)
                # Do nothing for other keys
                ;;
        esac
        
        # Remind user if server is down after any operation
        if [ "$SERVER_RUNNING" = false ]; then
            echo -e "${RED}REMINDER: The server is not running! Fix any issues and press 's' to restart it.${NC}"
        fi
    done
}

# Function to teardown everything
teardown() {
    print_header "Tearing down the entire application"
    
    # Stop the client if it's running
    if [ -f "${BASE_DIR}/client.pid" ]; then
        CLIENT_PID=$(cat "${BASE_DIR}/client.pid")
        echo -e "${YELLOW}Stopping client with PID: ${CLIENT_PID}...${NC}"
        kill -9 $CLIENT_PID 2>/dev/null || true
        rm "${BASE_DIR}/client.pid"
        echo -e "${GREEN}Client stopped.${NC}"
    fi
    
    # Stop the server if it's running
    if [ -f "${BASE_DIR}/server.pid" ]; then
        SERVER_PID=$(cat "${BASE_DIR}/server.pid")
        echo -e "${YELLOW}Stopping server with PID: ${SERVER_PID}...${NC}"
        kill -9 $SERVER_PID 2>/dev/null || true
        rm "${BASE_DIR}/server.pid"
        echo -e "${GREEN}Server stopped.${NC}"
    fi
    
    # Stop Supabase
    echo -e "${YELLOW}Stopping local Supabase...${NC}"
    if [ -d "${BASE_DIR}/server/supabase-local" ]; then
        cd "${BASE_DIR}/server/supabase-local"
        supabase stop
        echo -e "${GREEN}Local Supabase stopped.${NC}"
        cd "${BASE_DIR}"
    else
        echo -e "${YELLOW}Supabase directory not found, skipping...${NC}"
    fi
    
    # Stop Hyperledger Fabric network
    echo -e "${YELLOW}Stopping Hyperledger Fabric network...${NC}"
    cd "${BASE_DIR}/ledger/legitify-network"
    if [ -f "network.sh" ]; then
        ./network.sh down
        echo -e "${GREEN}Hyperledger Fabric network stopped.${NC}"
    else
        echo -e "${YELLOW}network.sh script not found, skipping...${NC}"
    fi
    
    echo -e "${GREEN}Application teardown completed!${NC}"
    exit 0
}

# Main execution
if [ "$1" == "--teardown" ]; then
    teardown
    exit 0
fi

# Kill any existing Node.js processes first
print_header "Cleaning up existing Node.js processes"
echo -e "${YELLOW}Stopping any running Node.js processes...${NC}"
pkill node || true
echo -e "${GREEN}Node.js processes stopped.${NC}"

# Check for dependencies
check_dependency docker
check_dependency supabase

# Deploy steps
start_fabric
start_supabase
setup_database
start_server
run_test_flow
start_client

# Enter interactive mode instead of blocking on client
interactive_mode

# If we get here, we've exited interactive mode
echo -e "\n${YELLOW}To restart the application, run:${NC}"
echo -e "${BLUE}./deploy-local.sh${NC}"
