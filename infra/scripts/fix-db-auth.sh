#!/bin/bash
# Torre Tempo - Fix Database Authentication
# Run this if you get "authentication failed" errors from the API

set -e

APP_DIR="/opt/torre-tempo"
cd $APP_DIR/infra

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "ERROR: .env file not found"
    exit 1
fi

DB_PASS=${DB_PASSWORD:-postgres}

echo "========================================"
echo "  Fixing Database Authentication"
echo "========================================"

# Stop API temporarily
echo "[1/3] Stopping API container..."
docker compose -f docker-compose.prod.yml stop api

# Reset postgres password
echo "[2/3] Resetting postgres password..."
docker exec torre-tempo-db psql -U postgres -c "ALTER USER postgres WITH PASSWORD '$DB_PASS';"

# Test connection
echo "[3/3] Testing connection..."
docker run --rm --network infra_torre-tempo-network postgres:16-alpine \
    psql "postgresql://postgres:$DB_PASS@postgres:5432/torre_tempo" -c 'SELECT NOW();' && \
    echo "✅ Database authentication fixed!" || \
    echo "❌ Still unable to connect. Check your DB_PASSWORD in .env"

# Restart API
echo "Restarting API..."
docker compose -f docker-compose.prod.yml start api

echo ""
echo "========================================"
echo "  Done!"
echo "========================================"
echo ""
echo "Check API logs: docker compose -f docker-compose.prod.yml logs -f api"
