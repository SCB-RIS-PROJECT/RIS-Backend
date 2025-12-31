#!/bin/bash

# Manual migration runner for 0010
# Use this when drizzle-kit migrate fails due to existing enum types

echo "Running manual migration 0010..."

# Get DATABASE_URL from .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not found in .env"
    exit 1
fi

# Run migration
psql "$DATABASE_URL" -f scripts/manual-migration-0010.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration 0010 applied successfully!"
else
    echo "❌ Migration failed. Check errors above."
    exit 1
fi
