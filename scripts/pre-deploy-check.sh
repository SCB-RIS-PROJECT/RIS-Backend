#!/bin/bash

# Pre-Deployment Verification Script
# Run this BEFORE deploying to check if it's safe

set +e  # Don't exit on error

echo "🔍 Pre-Deployment Safety Check"
echo "================================"
echo ""

SAFE_TO_DEPLOY=true

# Check 1: PM2 is installed
echo "1️⃣ Checking PM2 installation..."
if command -v pm2 &> /dev/null; then
    echo "   ✅ PM2 is installed"
else
    echo "   ⚠️  PM2 not installed yet (will be installed)"
fi

# Check 2: Existing PM2 apps
echo ""
echo "2️⃣ Checking existing PM2 applications..."
if command -v pm2 &> /dev/null; then
    PM2_APPS=$(pm2 jlist 2>/dev/null | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$PM2_APPS" ]; then
        echo "   📋 Found existing applications:"
        echo "$PM2_APPS" | while read app; do
            echo "      - $app"
        done
        
        # Check if ris-api already exists
        if echo "$PM2_APPS" | grep -q "ris-api"; then
            echo "   ⚠️  'ris-api' already exists - will be restarted"
        else
            echo "   ✅ 'ris-api' not found - will be created new"
        fi
    else
        echo "   ✅ No PM2 applications running (fresh install)"
    fi
else
    echo "   ⚠️  PM2 not available to check"
fi

# Check 3: Port 8001 availability
echo ""
echo "3️⃣ Checking port 8001..."
if netstat -tulpn 2>/dev/null | grep -q ":8001 " || ss -tulpn 2>/dev/null | grep -q ":8001 "; then
    PORT_USED_BY=$(netstat -tulpn 2>/dev/null | grep ":8001 " | awk '{print $7}' | cut -d'/' -f2)
    if [ -z "$PORT_USED_BY" ]; then
        PORT_USED_BY=$(ss -tulpn 2>/dev/null | grep ":8001 " | awk '{print $7}')
    fi
    echo "   ⚠️  Port 8001 is already in use by: $PORT_USED_BY"
    echo "   💡 Solution: Change PORT in .env file"
    SAFE_TO_DEPLOY=false
else
    echo "   ✅ Port 8001 is available"
fi

# Check 4: Database connection
echo ""
echo "4️⃣ Checking database..."
if command -v psql &> /dev/null; then
    echo "   ✅ PostgreSQL is installed"
else
    echo "   ⚠️  PostgreSQL not found (will be installed)"
fi

# Check 5: Environment file
echo ""
echo "5️⃣ Checking .env file..."
if [ -f /home/ris_2/RIS-Backend/.env ]; then
    echo "   ✅ .env file exists"
    
    # Check critical env vars
    if grep -q "DATABASE_URL=" /home/ris_2/RIS-Backend/.env && \
       grep -q "JWT_SECRET=" /home/ris_2/RIS-Backend/.env; then
        echo "   ✅ Critical variables found"
    else
        echo "   ⚠️  Some critical variables may be missing"
        SAFE_TO_DEPLOY=false
    fi
else
    echo "   ⚠️  .env file not found"
    echo "   💡 Solution: Create .env from .env.example"
    SAFE_TO_DEPLOY=false
fi

# Check 6: Disk space
echo ""
echo "6️⃣ Checking disk space..."
DISK_USAGE=$(df -h /home | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 90 ]; then
    echo "   ✅ Disk space OK ($DISK_USAGE% used)"
else
    echo "   ⚠️  Disk space low ($DISK_USAGE% used)"
    SAFE_TO_DEPLOY=false
fi

# Check 7: Bun installation
echo ""
echo "7️⃣ Checking Bun runtime..."
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    echo "   ✅ Bun is installed (v$BUN_VERSION)"
else
    echo "   ⚠️  Bun not installed yet (will be installed)"
fi

# Summary
echo ""
echo "================================"
if [ "$SAFE_TO_DEPLOY" = true ]; then
    echo "✅ SAFE TO DEPLOY"
    echo ""
    echo "Next steps:"
    echo "  1. Run: cd /home/ris_2/RIS-Backend"
    echo "  2. Run: bun run build"
    echo "  3. Run: ./scripts/deploy.sh"
    exit 0
else
    echo "⚠️  NOT SAFE TO DEPLOY"
    echo ""
    echo "Please fix the issues above before deploying."
    echo "Read SAFETY_CHECKLIST.md for more details."
    exit 1
fi
