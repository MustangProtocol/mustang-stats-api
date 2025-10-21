#!/bin/bash

# Mustang Stats API Setup Script
set -e

echo "Mustang Stats API Setup"
echo "========================="

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install it first:"
    echo "   brew install oven-sh/bun/bun"
    exit 1
fi

echo "✅ Bun found: $(bun --version)"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install it first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker found: $(docker --version)"

# PostgreSQL container configuration
DB_CONTAINER_NAME="mustang-stats-postgres"
DB_NAME="mustang_stats"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_HOST="localhost"

# Check if container already exists and is running
echo ""
echo "Setting up PostgreSQL Docker container..."

if docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER_NAME}$"; then
    echo "   Container '$DB_CONTAINER_NAME' already exists"
    
    if docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER_NAME}$"; then
        echo "   ✅ Container is running"
    else
        echo "   Starting existing container..."
        docker start "$DB_CONTAINER_NAME"
        echo "   ✅ Container started"
        sleep 2
    fi
else
    echo "   Creating new PostgreSQL container..."
    docker run -d \
        --name "$DB_CONTAINER_NAME" \
        -e POSTGRES_DB="$DB_NAME" \
        -e POSTGRES_USER="$DB_USER" \
        -e POSTGRES_PASSWORD="$DB_PASSWORD" \
        -p "${DB_PORT}:5432" \
        -v mustang-stats-postgres-data:/var/lib/postgresql/data \
        postgres:16-alpine
    
    echo "   ✅ Container created and started"
    sleep 3
fi

# Export database connection info for use in the application
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
export DB_HOST="$DB_HOST"
export DB_PORT="$DB_PORT"
export DB_USER="$DB_USER"
export DB_PASSWORD="$DB_PASSWORD"

echo "   📌 Database URL: postgresql://${DB_USER}:***@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Wait for PostgreSQL to be ready
echo ""
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker exec "$DB_CONTAINER_NAME" pg_isready -U "$DB_USER" &> /dev/null; then
        echo "✅ PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL failed to start after 30 seconds"
        exit 1
    fi
    echo -n "."
    sleep 1
done

# Install dependencies
echo ""
echo "Installing dependencies with Bun..."
bun install

# Initialize database schema
echo ""
echo "Migrating database schema..."
bun run db:migrate

# Seed data
echo ""
echo "Seeding database with initial data..."
bun run src/db/seed.ts

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server, run:"
echo "   bun run dev"
echo ""
echo "PostgreSQL Connection Details:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""
echo "To connect using psql:"
echo "   psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
echo ""
echo "To view Docker container logs:"
echo "   docker logs -f $DB_CONTAINER_NAME"
echo ""
echo "To stop the container:"
echo "   docker stop $DB_CONTAINER_NAME"
echo ""
