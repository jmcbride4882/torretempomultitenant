#!/bin/bash
# Torre Tempo - Quick Deployment Script
# Run this on your VPS to deploy the latest version

set -e

echo "🚀 Torre Tempo Quick Deploy"
echo "==========================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Change to app directory
echo -e "${BLUE}[1/7]${NC} Navigating to app directory..."
cd /opt/torre-tempo

# Pull latest code
echo -e "${BLUE}[2/7]${NC} Pulling latest code from GitHub..."
git pull origin main

# Show what's new
echo -e "${YELLOW}Latest commits:${NC}"
git log --oneline -5

# Rebuild containers
echo -e "${BLUE}[3/7]${NC} Rebuilding Docker containers..."
docker compose -f infra/docker-compose.prod.yml up -d --build api web

# Wait for services
echo -e "${BLUE}[4/7]${NC} Waiting for services to start..."
sleep 15

# Run migrations
echo -e "${BLUE}[5/7]${NC} Running database migrations..."
docker exec torre-tempo-api npx prisma migrate deploy

# Check status
echo -e "${BLUE}[6/7]${NC} Checking service status..."
docker compose -f infra/docker-compose.prod.yml ps

# Test endpoints
echo -e "${BLUE}[7/7]${NC} Testing endpoints..."
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://time.lsltgroup.es/api/health 2>/dev/null || echo "000")

if [ "$API_HEALTH" = "200" ]; then
  echo -e "${GREEN}✅ API health check: OK${NC}"
else
  echo -e "${YELLOW}⚠️  API health check: HTTP $API_HEALTH${NC}"
fi

# Show recent logs
echo ""
echo -e "${BLUE}Recent API logs:${NC}"
docker compose -f infra/docker-compose.prod.yml logs --tail=10 api

echo ""
echo -e "${GREEN}==========================="
echo -e "✅ DEPLOYMENT COMPLETE!"
echo -e "===========================${NC}"
echo ""
echo -e "🌐 Web: ${GREEN}https://time.lsltgroup.es${NC}"
echo -e "🌐 API: ${GREEN}https://time.lsltgroup.es/api/health${NC}"
echo ""
echo -e "📋 View logs: ${YELLOW}docker compose -f infra/docker-compose.prod.yml logs -f${NC}"
echo ""
