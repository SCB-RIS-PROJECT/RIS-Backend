#!/bin/bash

# Quick Start Script for RIS API
# Run this after initial build to start the application

set -e

APP_DIR="/home/ris_2/RIS-Backend"
cd $APP_DIR

echo "🚀 Starting RIS API..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file first:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

# Check if build exists
if [ ! -f dist/ris-api ]; then
    echo "📦 Building application..."
    bun run build
fi

# Make executable
chmod +x dist/ris-api

# Create logs directory
mkdir -p logs

# Start with PM2
echo "🔄 Starting with PM2..."
pm2 start ecosystem.config.cjs

echo ""
echo "✅ Application started!"
echo ""
pm2 status
echo ""
echo "📝 View logs: pm2 logs ris-api"
echo "🛑 Stop app: pm2 stop ris-api"
echo "♻️  Restart: pm2 restart ris-api"
