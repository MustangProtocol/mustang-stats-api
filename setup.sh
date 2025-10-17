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

echo "Bun found: $(bun --version)"

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL client (psql) not found in PATH"
    echo "   Make sure PostgreSQL is installed and accessible"
fi

# Create database
echo ""
echo "Creating PostgreSQL database..."
DB_NAME="mustang_stats"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"

# Try to create database (ignore error if it already exists)
createdb -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" 2>/dev/null || echo "   Database already exists or couldn't connect to PostgreSQL"

# Install dependencies
echo ""
echo "Installing dependencies with Bun..."
bun install

# Initialize database schema
echo ""
echo "Initializing database schema..."
bun run db:init

# Seed data
echo ""
echo "Seeding initial data from Liquity..."
bun run src/db/seed.ts

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the server, run:"
echo "   bun run dev"
echo ""
echo "Then visit:"
echo "   http://localhost:3000/health"
echo "   http://localhost:3000/v2/saga.json"
echo ""
