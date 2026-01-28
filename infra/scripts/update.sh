#!/bin/bash
set -e

echo "🔄 Updating Torre Tempo..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install/update dependencies
echo "📦 Installing dependencies..."
npm install

# Build
echo "🔨 Building..."
npm run build

# Restart containers (no rebuild, faster)
echo "🔄 Restarting containers..."
docker compose -f infra/docker-compose.prod.yml restart api web

# Wait for containers
echo "⏳ Waiting for containers to restart..."
sleep 5

# Check status
echo "📊 Container status:"
docker compose -f infra/docker-compose.prod.yml ps

echo ""
echo "✅ Update complete!"
echo ""
echo "🌐 API: https://${DOMAIN}/api/health"
echo "🌐 Web: https://${DOMAIN}"
