#!/bin/bash
set -e

# Create a marker file to determine if this is first run after deployment
FIRST_RUN_MARKER="/app/.first_run_completed"

if [ ! -f "$FIRST_RUN_MARKER" ]; then
    echo "🔄 First container run detected - performing full setup..."
    
    # Run the full setup (DB reset, server start, test flow)
    bash scripts/startup.sh
    
    # Create marker file to indicate first run is complete
    touch "$FIRST_RUN_MARKER"
    echo "✅ First run setup completed and marked"
else
    echo "🔄 Container restarting after sleep - preserving existing database..."
    
    # Skip DB reset and test flow, just start the server
    echo "🚀 Starting the server..."
    npm run start
fi
