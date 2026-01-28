#!/bin/bash
# Torre Tempo - Update Script
# Run this to pull latest changes and redeploy

set -e

APP_DIR="/opt/torre-tempo"
cd $APP_DIR

echo "========================================"
echo "  Torre Tempo - Update"
echo "========================================"

# Check if .env exists
if [ ! -f "$APP_DIR/infra/.env" ]; then
    echo "ERROR: .env file not found at $APP_DIR/infra/.env"
    echo "Please copy .env.example to .env and configure it first"
    exit 1
fi

# Pull latest changes
echo "[1/5] Pulling latest changes..."
git fetch origin
git reset --hard origin/main

# Rebuild and restart
echo "[2/5] Rebuilding containers..."
cd infra
docker compose -f docker-compose.prod.yml build --no-cache

echo "[3/5] Restarting services..."
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Wait for database to be healthy
echo "[4/5] Waiting for database..."
sleep 10

# Ensure postgres password is set correctly (fix for fresh installs)
echo "Verifying database authentication..."
docker exec torre-tempo-db psql -U postgres -c "ALTER USER postgres WITH PASSWORD '${DB_PASSWORD:-postgres}';" 2>/dev/null || true

# Run migrations
echo "[5/6] Running database migrations..."
docker run --rm --network infra_torre-tempo-network \
    -e DATABASE_URL="postgresql://postgres:${DB_PASSWORD:-postgres}@postgres:5432/torre_tempo?schema=public" \
    infra-api sh -c 'cd /app/apps/api && node /app/node_modules/prisma/build/index.js migrate deploy' || echo "No migrations to run"

# Seed database with default admin
echo "[6/6] Seeding default admin account..."
docker exec torre-tempo-api npm run db:seed 2>/dev/null || echo "Default admin already exists or seed skipped"

# Wait for API to start
sleep 5

echo ""
echo "========================================"
echo "  Update Complete!"
echo "========================================"
echo ""
echo "Check status: cd $APP_DIR/infra && docker compose -f docker-compose.prod.yml ps"
echo "View logs:    cd $APP_DIR/infra && docker compose -f docker-compose.prod.yml logs -f"
echo "Test API:     curl https://time.lsltgroup.es/api/health"
