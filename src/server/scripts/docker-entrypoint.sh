#!/bin/sh
set -e

echo "🚀 Starting Legitify Backend..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
max_retries=30
retry_count=0

# Extract host and port from connection URL
# Default to postgres:5432 if not specified
DB_HOST=$(echo "$POSTGRES_CONNECTION_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
DB_PORT=$(echo "$POSTGRES_CONNECTION_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')

if [ -z "$DB_HOST" ]; then DB_HOST="postgres"; fi
if [ -z "$DB_PORT" ]; then DB_PORT="5432"; fi

echo "   Connecting to database at $DB_HOST:$DB_PORT..."

while ! nc -z "$DB_HOST" "$DB_PORT" > /dev/null 2>&1; do
    retry_count=$((retry_count + 1))
    if [ $retry_count -ge $max_retries ]; then
        echo "❌ Database connection timeout after ${max_retries} attempts"
        exit 1
    fi
    echo "   Attempt ${retry_count}/${max_retries}..."
    sleep 2
done

echo "✅ Database connected!"

# Run database migrations
echo "📦 Resyncing database schema..."
npx prisma generate
npx prisma db push --accept-data-loss

echo "✅ Database ready!"

# Execute the main command
echo "🌐 Starting server..."
exec "$@"
