#!/bin/bash

# RIS API Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Starting deployment..."

# Variables
APP_DIR="/home/ris_2/RIS-Backend"
APP_NAME="ris-api"

# Navigate to app directory
cd $APP_DIR

echo "📦 Checking Bun installation..."
if ! command -v bun &> /dev/null; then
    echo "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    source ~/.bashrc
fi

echo "📦 Checking PM2 installation..."
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    bun install -g pm2
fi

echo "🔑 Checking environment file..."
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Please create .env file based on .env.example"
    exit 1
fi

echo "🔧 Making binary executable..."
chmod +x dist/ris-api

echo "🔄 Restarting application..."
pm2 describe $APP_NAME > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Application found, restarting..."
    pm2 restart $APP_NAME
else
    echo "Application not found, starting new..."
    pm2 start ecosystem.config.cjs
fi

echo "💾 Saving PM2 process list..."
pm2 save

echo "📊 Application status:"
pm2 status

echo "✅ Deployment completed successfully!"
