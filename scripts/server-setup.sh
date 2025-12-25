#!/bin/bash

# Server Setup Script for RIS API
# Run this script on your production server as root user

set -e

echo "🔧 RIS API Server Setup Script"
echo "================================"
echo ""

# Variables
APP_DIR="/home/ris_2/RIS-Backend"
DB_NAME="ris_db"
DB_USER="ris_user"
DB_PASSWORD="your_secure_password_here"  # CHANGE THIS!

echo "📦 Updating system packages..."
apt update && apt upgrade -y

echo "📦 Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    apt install postgresql postgresql-contrib -y
    systemctl start postgresql
    systemctl enable postgresql
    echo "✅ PostgreSQL installed"
else
    echo "✅ PostgreSQL already installed"
fi

echo "🗄️ Setting up database..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
sudo -u postgres psql <<EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
EOF

echo "✅ Database setup completed"

echo "📦 Installing Bun runtime..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    
    # Add to .bashrc for persistence
    echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
    
    source ~/.bashrc
    echo "✅ Bun installed"
else
    echo "✅ Bun already installed"
fi

echo "📦 Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    bun install -g pm2
    echo "✅ PM2 installed"
else
    echo "✅ PM2 already installed"
fi

echo "📁 Setting up application directory..."
cd $APP_DIR

if [ ! -f .env ]; then
    echo "⚙️ Creating .env file..."
    if [ -f .env.example ]; then
        cp .env.example .env
        
        # Update database URL in .env
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME|g" .env
        
        echo "⚠️  IMPORTANT: Please edit .env file and fill in:"
        echo "   - JWT_SECRET"
        echo "   - SATU_SEHAT credentials"
        echo "   - MAIL configuration"
        echo ""
        echo "   nano .env"
    else
        echo "❌ .env.example not found!"
        exit 1
    fi
else
    echo "✅ .env already exists"
fi

echo "📁 Creating logs directory..."
mkdir -p logs

echo "📦 Installing dependencies..."
bun install

echo "🏗️ Running database migrations..."
bun run db:push

echo "🌱 Seeding database (optional)..."
read -p "Do you want to seed the database? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    bun run db:seed
    echo "✅ Database seeded"
fi

echo "🔨 Building application..."
bun run build
chmod +x dist/ris-api

echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.cjs

echo "💾 Saving PM2 process list..."
pm2 save

echo "⚠️  SKIP PM2 startup setup (manual configuration required)..."
echo "If you need PM2 auto-start on boot, run manually:"
echo "  pm2 startup systemd"
echo "  pm2 save"

echo "🔥 Setting up firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp comment 'SSH'
    ufw allow 8001/tcp comment 'RIS API'
    ufw --force enable
    echo "✅ Firewall configured"
fi

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "📊 Application Status:"
pm2 status
echo ""
echo "🌐 Application is running on: http://localhost:8001"
echo ""
echo "⚠️  Don't forget to:"
echo "   1. Edit .env file and fill in all required credentials"
echo "   2. Restart the application: pm2 restart ris-api"
echo "   3. Setup GitHub Actions secrets for CI/CD"
echo ""
echo "📝 View logs: pm2 logs ris-api"
echo "📊 Monitor: pm2 monit"
