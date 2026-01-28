#!/bin/bash
# Torre Tempo - Update Script
# Run this to pull latest changes and redeploy

set -e

APP_DIR="/opt/torre-tempo"
cd $APP_DIR

echo "========================================"
echo "  Torre Tempo - Update"
echo "========================================"

# Pull latest changes
echo "[1/4] Pulling latest changes..."
git fetch origin
git reset --hard origin/main

# Rebuild and restart
echo "[2/4] Rebuilding containers..."
cd infra
docker-compose -f docker-compose.prod.yml build --no-cache

echo "[3/4] Restarting services..."
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
echo "[4/4] Running database migrations..."
sleep 10
docker exec torre-tempo-api npx prisma migrate deploy || echo "No migrations to run"

echo ""
echo "========================================"
echo "  Update Complete!"
echo "========================================"
echo ""
echo "Check status: docker-compose -f docker-compose.prod.yml ps"
echo "View logs:    docker-compose -f docker-compose.prod.yml logs -f"
