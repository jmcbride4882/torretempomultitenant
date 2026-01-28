#!/bin/bash
set -e

echo "🔄 Updating Torre Tempo..."

# Change to repository root
cd /opt/torre-tempo

# Load environment variables
if [ -f infra/.env ]; then
  set -a
  source infra/.env
  set +a
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Rebuild Docker containers (builds happen inside Docker)
echo "🔨 Rebuilding containers with latest code..."
docker compose -f infra/docker-compose.prod.yml up -d --build api web

# Wait for containers to be healthy
echo "⏳ Waiting for containers to start..."
sleep 10

# Check status
echo "📊 Container status:"
docker compose -f infra/docker-compose.prod.yml ps

# Test endpoints
echo ""
echo "🧪 Testing endpoints..."
sleep 3
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>/dev/null || echo "000")
if [ "$API_HEALTH" = "200" ]; then
  echo "✅ API health check: OK"
else
  echo "⚠️  API health check: Failed (HTTP $API_HEALTH)"
fi

# Show logs for debugging
echo ""
echo "📋 Recent API logs:"
docker compose -f infra/docker-compose.prod.yml logs --tail=20 api

echo ""
echo "✅ Update complete!"
echo ""
echo "🌐 Web: https://time.lsltgroup.es"
echo "🌐 API: https://time.lsltgroup.es/api/health"
echo ""
echo "💡 View logs: docker compose -f infra/docker-compose.prod.yml logs -f"
