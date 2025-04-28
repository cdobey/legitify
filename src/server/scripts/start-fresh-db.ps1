#!/usr/bin/env pwsh

Write-Host "🔄 Setting up for Supabase database..."

# Load environment variables from server.env only if in local development
if (($env:IS_DEPLOYMENT -ne "true") -and (Test-Path "server.env")) {
    Write-Host "Loading environment variables from server.env"
    Get-Content "server.env" | ForEach-Object {
        if (-not $_.StartsWith("#") -and $_.Contains("=")) {
            $key, $value = $_.Split("=", 2)
            Set-Item -Path "env:$key" -Value $value
        }
    }
}
else {
    Write-Host "Using system environment variables (deployment mode)"
}

# Determine if running in CI/deployment environment
if ($null -eq $env:IS_DEPLOYMENT) { $env:IS_DEPLOYMENT = "false" }
if (($env:CI -eq "true") -or ($env:IS_DEPLOYMENT -eq "true")) {
    Write-Host "🤖 Running in automated deployment mode - confirmations will be skipped"
    $AUTO_CONFIRM = "y"
}
else {
    $AUTO_CONFIRM = ""
}

# Check if we're using local Supabase
if ($null -eq $env:IS_LOCAL_SUPABASE) { $env:IS_LOCAL_SUPABASE = "false" }
if ($env:IS_LOCAL_SUPABASE -eq "true") {
    Write-Host "🧪 Using local Supabase instance for testing"
    # Check if Supabase is running locally
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:54321/health" -UseBasicParsing -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Local Supabase is running"
        }
    }
    catch {
        Write-Host "❌ Local Supabase is not running. Please start it with 'supabase start'"
        Write-Host "If you haven't set up local Supabase, run:"
        Write-Host "1. npm install -g supabase (or scoop install supabase on Windows)"
        Write-Host "2. mkdir supabase-local; cd supabase-local"
        Write-Host "3. supabase init"
        Write-Host "4. supabase start"
        exit 1
    }
}

# Ask for confirmation before deleting remote data (skip in deployment)
Write-Host "⚠️  WARNING: This will DELETE ALL DATA in your Supabase database!"
Write-Host "⚠️  All tables will be cleared and recreated. This action cannot be undone."

if ([string]::IsNullOrEmpty($AUTO_CONFIRM)) {
    $REPLY = Read-Host -Prompt "Are you sure you want to continue? (y/n)"
    if ($REPLY -notmatch "^[Yy]$") {
        Write-Host "Operation cancelled"
        exit 1
    }
}
else {
    Write-Host "✅ Automatically confirmed data deletion (deployment mode)"
    $REPLY = "y"
}

# Check Fabric connectivity
Write-Host "🔌 Checking connectivity to Hyperledger Fabric network..."
# Support both new FABRIC_CONNECTION and legacy EC2_IP for backwards compatibility
if ([string]::IsNullOrEmpty($env:FABRIC_CONNECTION)) {
    if (-not [string]::IsNullOrEmpty($env:EC2_IP)) {
        $env:FABRIC_CONNECTION = $env:EC2_IP
    }
    else {
        $env:FABRIC_CONNECTION = "network.legitifyapp.com"
    }
}

if ([string]::IsNullOrEmpty($env:RESOURCE_SERVER_PORT)) {
    $env:RESOURCE_SERVER_PORT = "8080"
}

Write-Host "Using Fabric connection at $($env:FABRIC_CONNECTION):$($env:RESOURCE_SERVER_PORT)"

# Fetch Fabric resources from EC2 instance
Write-Host "🌐 Fetching Hyperledger Fabric resources from Fabric network..."

# Run the resource fetcher script
node ./scripts/fetch-fabric-resources.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to fetch Fabric resources from network"
    Write-Host "Please make sure the Fabric network and resource server are running"
    exit 1
}
Write-Host "✅ Successfully fetched Fabric resources"

# Check if required variables are set
if ([string]::IsNullOrEmpty($env:POSTGRES_CONNECTION_URL)) {
    Write-Host "❌ POSTGRES_CONNECTION_URL is not set"
    Write-Host "Please make sure it's defined in server.env for local development or in the deployment environment"
    exit 1
}

# Print connection info
Write-Host "🔌 Using Supabase at: $($env:SUPABASE_API_URL)"
Write-Host "🔌 Using PostgreSQL at: $($env:POSTGRES_CONNECTION_URL)"

# For backward compatibility during transition
$env:DATABASE_URL = $env:POSTGRES_CONNECTION_URL
Write-Host "Setting DATABASE_URL for backward compatibility: $($env:DATABASE_URL)"

# Check if global Prisma is available, otherwise use local
$PRISMA_CMD = ""
try {
    if (Get-Command prisma -ErrorAction SilentlyContinue) {
        Write-Host "Using globally installed Prisma"
        $PRISMA_CMD = "prisma"
    }
    else {
        Write-Host "Using local Prisma installation"
        $PRISMA_CMD = "npx prisma"
    }
}
catch {
    Write-Host "Using local Prisma installation"
    $PRISMA_CMD = "npx prisma"
}

# Regenerate Prisma client to ensure it uses the correct configuration
Write-Host "🔄 Regenerating Prisma client..."
try {
    Invoke-Expression "$PRISMA_CMD generate"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed with first method"
    }
}
catch {
    Write-Host "Failed to generate Prisma client. Attempting alternative method..."
    try {
        node ./node_modules/prisma/build/index.js generate
        if ($LASTEXITCODE -ne 0) {
            Write-Host "All Prisma client generation methods failed. Continuing anyway..."
        }
    }
    catch {
        Write-Host "All Prisma client generation methods failed. Continuing anyway..."
    }
}

# Delete all Supabase Auth users
Write-Host "🗑️  Clearing all authorized users from Supabase Auth..."
npx ts-node ./scripts/delete-auth-users.ts

# Delete all contents from storage buckets (empty them)
Write-Host "🗑️  Emptying all storage buckets in Supabase..."
node ./scripts/empty-storage-buckets.js

Write-Host "🗑️  Clearing all data from Supabase database..."

# Use Prisma to reset the database (drops all tables and recreates them)
Write-Host "🔄 Resetting database schema..."
try {
    Invoke-Expression "$PRISMA_CMD migrate reset --force"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed with first method"
    }
}
catch {
    Write-Host "Failed to reset database schema. Attempting alternative method..."
    try {
        node ./node_modules/prisma/build/index.js migrate reset --force
        if ($LASTEXITCODE -ne 0) {
            Write-Host "All reset methods failed. This may cause issues later."
        }
    }
    catch {
        Write-Host "All reset methods failed. This may cause issues later."
    }
}

Write-Host "🔧 Running Prisma migrations and generation..."

# Run Prisma migrations (with --force for non-interactive mode)
Write-Host "📝 Running Prisma migrations..."
try {
    Invoke-Expression "$PRISMA_CMD migrate deploy"
    if ($LASTEXITCODE -ne 0) {
        throw "Failed with first method"
    }
}
catch {
    Write-Host "Failed to deploy migrations. Attempting alternative method..."
    try {
        node ./node_modules/prisma/build/index.js migrate deploy
        if ($LASTEXITCODE -ne 0) {
            Write-Host "All migration methods failed. Database may not be properly initialized."
        }
    }
    catch {
        Write-Host "All migration methods failed. Database may not be properly initialized."
    }
}

# Set up Supabase storage bucket policies
Write-Host "🔒 Setting up Supabase storage bucket policies..."
try {
    node ./scripts/setup-storage-policies.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to set up storage bucket policies. File uploads may not work properly."
    }
}
catch {
    Write-Host "Failed to set up storage bucket policies. File uploads may not work properly."
}

Write-Host "🔑 Running enrollment script..."
npx ts-node ./scripts/enrollAdmin.ts

Write-Host "✅ Database setup completed successfully"