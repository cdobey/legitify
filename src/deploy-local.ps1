# PowerShell deployment script for the Legitify project
# Pure PowerShell version - no WSL or Bash required

# Colors for output
$GREEN = [System.ConsoleColor]::Green
$RED = [System.ConsoleColor]::Red
$BLUE = [System.ConsoleColor]::Blue
$YELLOW = [System.ConsoleColor]::Yellow

# Base directory
$BASE_DIR = $PSScriptRoot
Write-Host "Current directory: $BASE_DIR" -ForegroundColor $BLUE

# Global status flags
$SCRIPT:SERVER_RUNNING = $false

# Function to check if a program is installed
function Check-Dependency {
    param (
        [string]$program
    )
    
    if (-not (Get-Command $program -ErrorAction SilentlyContinue)) {
        Write-Host "Error: $program is not installed. Please install it and try again." -ForegroundColor $RED
        exit 1
    }
}

# Function to print section header
function Print-Header {
    param (
        [string]$title
    )
    
    Write-Host "`n======================================================" -ForegroundColor $BLUE
    Write-Host "   $title" -ForegroundColor $BLUE
    Write-Host "======================================================" -ForegroundColor $BLUE
}

# Function to start local Supabase
function Start-Supabase {
    Print-Header "1. Starting Local Supabase Database"
    
    # Check if supabase CLI is installed
    Check-Dependency "supabase"
    
    # Check if we have a supabase directory, if not create one
    $supabasePath = Join-Path -Path $BASE_DIR -ChildPath "server\supabase-local"
    
    if (-not (Test-Path $supabasePath)) {
        Write-Host "Creating local Supabase directory..." -ForegroundColor $YELLOW
        New-Item -Path $supabasePath -ItemType Directory -Force
        Set-Location -Path $supabasePath
        supabase init
    } else {
        Set-Location -Path $supabasePath
    }
    
    # Start Supabase
    Write-Host "Starting local Supabase..." -ForegroundColor $YELLOW
    supabase start
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to start local Supabase. Exiting." -ForegroundColor $RED
        exit 1
    }
    
    # Get the Supabase URLs and keys
    $supabaseStatus = supabase status
    $SUPABASE_API_URL = ($supabaseStatus | Select-String -Pattern "API URL" | ForEach-Object { $_.ToString().Split(' ')[2] })
    $SUPABASE_DB_URL = ($supabaseStatus | Select-String -Pattern "DB URL" | ForEach-Object { $_.ToString().Split(' ')[2] })
    $SUPABASE_ANON_KEY = ($supabaseStatus | Select-String -Pattern "anon key" | ForEach-Object { $_.ToString().Split(' ')[2] })
    $SUPABASE_SERVICE_KEY = ($supabaseStatus | Select-String -Pattern "service_role key" | ForEach-Object { $_.ToString().Split(' ')[2] })
    
    Write-Host "Local Supabase started successfully!" -ForegroundColor $GREEN
    Write-Host "`nPlease add these values to your server.env file:" -ForegroundColor $YELLOW
    Write-Host "POSTGRES_CONNECTION_URL=$SUPABASE_DB_URL" -ForegroundColor $BLUE
    Write-Host "SUPABASE_API_URL=$SUPABASE_API_URL" -ForegroundColor $BLUE
    Write-Host "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" -ForegroundColor $BLUE
    Write-Host "SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY" -ForegroundColor $BLUE
    
    # Ask user to confirm they've updated server.env
    $reply = Read-Host "Have you updated server.env with these values? (y/n)"
    if ($reply -notmatch '^[Yy]$') {
        Write-Host "Please update server.env before continuing. Exiting." -ForegroundColor $RED
        exit 1
    }
    
    Set-Location -Path $BASE_DIR
}

# Function to start the server
function Start-Server {
    Print-Header "2. Starting the Server"
    
    $serverPath = Join-Path -Path $BASE_DIR -ChildPath "server"
    Set-Location -Path $serverPath
    
    $serverPidFile = Join-Path -Path $BASE_DIR -ChildPath "server.pid"
    
    # Kill any existing server process
    if (Test-Path $serverPidFile) {
        $serverPid = Get-Content $serverPidFile
        Stop-Job -Id $serverPid -ErrorAction SilentlyContinue
        Remove-Job -Id $serverPid -Force -ErrorAction SilentlyContinue
        Remove-Item $serverPidFile -Force
    }
    
    Write-Host "Starting the server with npm run dev..." -ForegroundColor $YELLOW
    Write-Host "The server will run in the background. Logs will be saved to server.log" -ForegroundColor $YELLOW
    
    # Create log file path
    $serverLogFile = Join-Path -Path $BASE_DIR -ChildPath "server.log"
    
    # Start server as a background job avoiding environment variable issues
    $job = Start-Job -ScriptBlock {
        param($dir, $logFile)
        Set-Location $dir
        # Run npm directly without trying to set NODE_ENV
        npm run dev *> $logFile
    } -ArgumentList $serverPath, $serverLogFile
    
    # Save the job ID to a file for later teardown
    $job.Id | Out-File -FilePath $serverPidFile -Force
    
    # Wait a moment for the server to start
    Write-Host "Waiting for server to start..." -ForegroundColor $YELLOW
    Start-Sleep -Seconds 20
    
    # Check if job is running
    $jobStatus = Get-Job -Id $job.Id
    
    if ($jobStatus.State -eq "Running") {
        Write-Host "Server started successfully with Job ID: $($job.Id)" -ForegroundColor $GREEN
        $SCRIPT:SERVER_RUNNING = $true
    } else {
        Write-Host "Failed to start the server. Check server.log for details." -ForegroundColor $RED
        Write-Host "You can fix the issues and restart the server later using the 's' key." -ForegroundColor $YELLOW
        $reply = Read-Host "Would you like to continue with the rest of the deployment? (y/n)"
        if ($reply -notmatch '^[Yy]$') {
            Write-Host "Exiting deployment." -ForegroundColor $RED
            exit 1
        }
        $SCRIPT:SERVER_RUNNING = $false
    }
    
    Set-Location -Path $BASE_DIR
}

# Function to start the client
function Start-Client {
    Print-Header "3. Starting the Client"
    
    $clientPath = Join-Path -Path $BASE_DIR -ChildPath "client\legitify-project"
    Set-Location -Path $clientPath
    
    $clientPidFile = Join-Path -Path $BASE_DIR -ChildPath "client.pid"
    
    # Kill existing client process if any
    if (Test-Path $clientPidFile) {
        $clientPid = Get-Content $clientPidFile
        Stop-Job -Id $clientPid -ErrorAction SilentlyContinue
        Remove-Job -Id $clientPid -Force -ErrorAction SilentlyContinue
        Remove-Item $clientPidFile -Force
    }
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing client dependencies..." -ForegroundColor $YELLOW
        npm install
    }
    
    Write-Host "Starting the client with npm run dev..." -ForegroundColor $YELLOW
    Write-Host "The client will run in the background. Logs will be saved to client.log" -ForegroundColor $YELLOW
    
    # Create log file path
    $clientLogFile = Join-Path -Path $BASE_DIR -ChildPath "client.log"
    
    # Start client as a background job avoiding environment variable issues
    $job = Start-Job -ScriptBlock {
        param($dir, $logFile)
        Set-Location $dir
        # Run npm directly without trying to set NODE_ENV
        npm run dev *> $logFile
    } -ArgumentList $clientPath, $clientLogFile
    
    # Save the job ID to a file for later
    $job.Id | Out-File -FilePath $clientPidFile -Force
    
    # Wait a moment for the client to start
    Start-Sleep -Seconds 5
    
    # Check if job is running
    $jobStatus = Get-Job -Id $job.Id
    
    if ($jobStatus.State -eq "Running") {
        Write-Host "Client started successfully with Job ID: $($job.Id)" -ForegroundColor $GREEN
        # Print client URL
        Write-Host "Client should be available at: http://localhost:5173" -ForegroundColor $YELLOW
    } else {
        Write-Host "Failed to start the client. Check client.log for details." -ForegroundColor $RED
        Write-Host "Continuing anyway..." -ForegroundColor $YELLOW
    }
    
    Set-Location -Path $BASE_DIR
}

# Function to restart client
function Restart-Client {
    Print-Header "Restarting Client"
    
    $clientPidFile = Join-Path -Path $BASE_DIR -ChildPath "client.pid"
    
    # Kill existing client process
    if (Test-Path $clientPidFile) {
        $clientPid = Get-Content $clientPidFile
        Write-Host "Stopping client with Job ID: $clientPid..." -ForegroundColor $YELLOW
        Stop-Job -Id $clientPid -ErrorAction SilentlyContinue
        Remove-Job -Id $clientPid -Force -ErrorAction SilentlyContinue
        Remove-Item $clientPidFile -Force
    }
    
    # Find and stop any processes using port 5173
    Write-Host "Ensuring port 5173 is free..." -ForegroundColor $YELLOW
    $process = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | ForEach-Object { Get-Process -Id $_.OwningProcess }
    if ($process) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Wait a moment to ensure the port is released
    Write-Host "Waiting for port to be released..." -ForegroundColor $YELLOW
    Start-Sleep -Seconds 3
    
    # Start the client
    Start-Client
}

# Function to restart server
function Restart-Server {
    Print-Header "Restarting Server"
    
    $serverPidFile = Join-Path -Path $BASE_DIR -ChildPath "server.pid"
    
    # Kill existing server process
    if (Test-Path $serverPidFile) {
        $serverPid = Get-Content $serverPidFile
        Write-Host "Stopping server with Job ID: $serverPid..." -ForegroundColor $YELLOW
        Stop-Job -Id $serverPid -ErrorAction SilentlyContinue
        Remove-Job -Id $serverPid -Force -ErrorAction SilentlyContinue
        Remove-Item $serverPidFile -Force
    }
    
    # Find and stop any processes using port 3001
    Write-Host "Ensuring port 3001 is free..." -ForegroundColor $YELLOW
    $process = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | ForEach-Object { Get-Process -Id $_.OwningProcess }
    if ($process) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Wait a moment to ensure the port is released
    Write-Host "Waiting for port to be released..." -ForegroundColor $YELLOW
    Start-Sleep -Seconds 3
    
    # Start the server
    Start-Server
}

# Function to restart Supabase
function Restart-Supabase {
    Print-Header "Restarting Supabase Database"
    
    $supabasePath = Join-Path -Path $BASE_DIR -ChildPath "server\supabase-local"
    
    # Stop Supabase
    if (Test-Path $supabasePath) {
        Set-Location -Path $supabasePath
        
        Write-Host "Stopping Supabase..." -ForegroundColor $YELLOW
        supabase stop
        
        # Start it again
        Write-Host "Starting Supabase..." -ForegroundColor $YELLOW
        supabase start
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Failed to restart Supabase." -ForegroundColor $RED
            return $false
        }
        
        Write-Host "Supabase restarted successfully!" -ForegroundColor $GREEN
    } else {
        Write-Host "Supabase directory not found." -ForegroundColor $RED
        return $false
    }
    
    # And restart the server
    Restart-Server
    
    return $true
}

# Interactive mode - allows user to restart components while the app is running
function Start-InteractiveMode {
    Print-Header "Interactive Mode"
    
    Write-Host "The application is now running." -ForegroundColor $BLUE
    
    if (-not $SCRIPT:SERVER_RUNNING) {
        Write-Host "WARNING: The server is not running! Fix any issues and press 's' to restart it." -ForegroundColor $RED
        Write-Host "Check server.log for error details." -ForegroundColor $YELLOW
    }
    
    Write-Host "You can interact with it in your browser." -ForegroundColor $YELLOW
    Write-Host "`nInteractive Controls:" -ForegroundColor $BLUE
    Write-Host "Press 'c' to restart the client" -ForegroundColor $YELLOW
    Write-Host "Press 's' to restart the server" -ForegroundColor $YELLOW
    Write-Host "Press 'd' to restart the Supabase database" -ForegroundColor $YELLOW
    Write-Host "Press 'l' to view the last 20 lines of server.log" -ForegroundColor $YELLOW
    Write-Host "Press 'q' to quit and teardown everything" -ForegroundColor $YELLOW
    
    # Main interactive loop
    while ($true) {
        if ([Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true)
            
            switch ($key.KeyChar) {
                'c' {
                    Restart-Client
                    break
                }
                's' {
                    Restart-Server
                    break
                }
                'd' {
                    Restart-Supabase
                    break
                }
                'l' {
                    Print-Header "Last 20 lines of server.log"
                    $serverLogPath = Join-Path -Path $BASE_DIR -ChildPath "server.log"
                    if (Test-Path $serverLogPath) {
                        Get-Content $serverLogPath -Tail 20
                    } else {
                        Write-Host "server.log not found." -ForegroundColor $RED
                    }
                    break
                }
                'q' {
                    Print-Header "Quitting and tearing down"
                    Stop-Environment
                    return
                }
            }
            
            # Remind user if server is down after any operation
            if (-not $SCRIPT:SERVER_RUNNING) {
                Write-Host "REMINDER: The server is not running! Fix any issues and press 's' to restart it." -ForegroundColor $RED
            }
        }
        
        # Sleep to reduce CPU usage
        Start-Sleep -Milliseconds 100
    }
}

# Function to teardown everything
function Stop-Environment {
    Print-Header "Tearing down the entire application"
    
    $clientPidFile = Join-Path -Path $BASE_DIR -ChildPath "client.pid"
    $serverPidFile = Join-Path -Path $BASE_DIR -ChildPath "server.pid"
    
    # Stop the client if it's running
    if (Test-Path $clientPidFile) {
        $clientPid = Get-Content $clientPidFile
        Write-Host "Stopping client with Job ID: $clientPid..." -ForegroundColor $YELLOW
        Stop-Job -Id $clientPid -ErrorAction SilentlyContinue
        Remove-Job -Id $clientPid -Force -ErrorAction SilentlyContinue
        Remove-Item $clientPidFile -Force
        Write-Host "Client stopped." -ForegroundColor $GREEN
    }
    
    # Stop the server if it's running
    if (Test-Path $serverPidFile) {
        $serverPid = Get-Content $serverPidFile
        Write-Host "Stopping server with Job ID: $serverPid..." -ForegroundColor $YELLOW
        Stop-Job -Id $serverPid -ErrorAction SilentlyContinue
        Remove-Job -Id $serverPid -Force -ErrorAction SilentlyContinue
        Remove-Item $serverPidFile -Force
        Write-Host "Server stopped." -ForegroundColor $GREEN
    }
    
    # Stop Supabase
    Write-Host "Stopping local Supabase..." -ForegroundColor $YELLOW
    $supabasePath = Join-Path -Path $BASE_DIR -ChildPath "server\supabase-local"
    
    if (Test-Path $supabasePath) {
        Set-Location -Path $supabasePath
        supabase stop
        Write-Host "Local Supabase stopped." -ForegroundColor $GREEN
        Set-Location -Path $BASE_DIR
    } else {
        Write-Host "Supabase directory not found, skipping..." -ForegroundColor $YELLOW
    }
    
    Write-Host "Application teardown completed!" -ForegroundColor $GREEN
}

# Main execution
if ($args -contains "--teardown") {
    Stop-Environment
    exit 0
}

# Kill any existing Node.js processes first
Print-Header "Cleaning up existing Node.js processes"
Write-Host "Stopping any running Node.js processes..." -ForegroundColor $YELLOW
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "Node.js processes stopped." -ForegroundColor $GREEN

# Check for dependencies
Check-Dependency "docker"
Check-Dependency "supabase"

# Deploy steps - Pure PowerShell version without Hyperledger Fabric for now
Write-Host "NOTE: This pure PowerShell version skips the Hyperledger Fabric network setup" -ForegroundColor $YELLOW
Write-Host "      since it requires Bash scripts. Only Supabase and application components will be started." -ForegroundColor $YELLOW

Start-Supabase
Start-Server
Start-Client

# Enter interactive mode
Start-InteractiveMode

# If we get here, we've exited interactive mode
Write-Host "`nTo restart the application, run:" -ForegroundColor $YELLOW
Write-Host ".\deploy-local.ps1" -ForegroundColor $BLUE