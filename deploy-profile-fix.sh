#!/bin/bash
# Torre Tempo - Profile Fix Deployment Script
# Deploys the TopNav profile navigation fix to production

set -e

echo "🔧 Torre Tempo - Profile Fix Deployment"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
APP_DIR="${APP_DIR:-/opt/torre-tempo}"
BACKUP_DIR="${APP_DIR}/infra/backups"

# Check if running on VPS
if [ ! -d "$APP_DIR" ]; then
    echo -e "${RED}Error: Not running on VPS. App directory not found: $APP_DIR${NC}"
    echo ""
    echo "To deploy from local machine, run:"
    echo "  ssh user@your-vps 'bash -s' < deploy-profile-fix.sh"
    exit 1
fi

# Navigate to app directory
echo -e "${BLUE}[1/8]${NC} Navigating to app directory..."
cd "$APP_DIR"

# Show current commit
echo -e "${BLUE}[2/8]${NC} Current version:"
git log --oneline -1

# Create backup of current state
echo -e "${BLUE}[3/8]${NC} Creating backup..."
BACKUP_NAME="pre-profile-fix-$(date +%Y%m%d-%H%M%S)"
git rev-parse HEAD > "${BACKUP_DIR}/${BACKUP_NAME}.commit"
echo -e "${GREEN}✓ Backup created: ${BACKUP_NAME}${NC}"

# Pull latest code
echo -e "${BLUE}[4/8]${NC} Pulling latest code from GitHub..."
git fetch origin main
git pull origin main

# Show what changed
echo -e "${YELLOW}Changes included:${NC}"
git log --oneline -3

# Check if TopNav.tsx was modified
if git diff HEAD~1 HEAD --name-only | grep -q "TopNav.tsx"; then
    echo -e "${GREEN}✓ TopNav.tsx updated${NC}"
else
    echo -e "${YELLOW}⚠ TopNav.tsx not in latest commit - may already be deployed${NC}"
fi

# Rebuild web container only
echo -e "${BLUE}[5/8]${NC} Rebuilding web container..."
docker compose -f infra/docker-compose.prod.yml build web

echo -e "${BLUE}[6/8]${NC} Restarting web container..."
docker compose -f infra/docker-compose.prod.yml up -d web

# Wait for service to be healthy
echo -e "${BLUE}[7/8]${NC} Waiting for service to be ready..."
sleep 10

# Verify deployment
echo -e "${BLUE}[8/8]${NC} Verifying deployment..."

# Check container status
WEB_STATUS=$(docker inspect -f '{{.State.Status}}' torre-tempo-web 2>/dev/null || echo "unknown")
API_STATUS=$(docker inspect -f '{{.State.Status}}' torre-tempo-api 2>/dev/null || echo "unknown")

echo ""
echo "Container Status:"
echo "  Web: $WEB_STATUS"
echo "  API: $API_STATUS"

# Test web endpoint
WEB_HTTP=$(curl -s -o /dev/null -w "%{http_code}" https://time.lsltgroup.es/ 2>/dev/null || echo "000")
API_HTTP=$(curl -s -o /dev/null -w "%{http_code}" https://time.lsltgroup.es/api/health 2>/dev/null || echo "000")

echo ""
echo "HTTP Status:"
echo "  Web: $WEB_HTTP"
echo "  API: $API_HTTP"

# Check if deployment was successful
if [ "$WEB_STATUS" = "running" ] && [ "$API_STATUS" = "running" ] && [ "$WEB_HTTP" = "200" ] && [ "$API_HTTP" = "200" ]; then
    echo ""
    echo -e "${GREEN}========================================"
    echo -e "✅ DEPLOYMENT SUCCESSFUL!"
    echo -e "========================================${NC}"
    echo ""
    echo -e "🎯 Profile Fix Deployed:"
    echo -e "   ${GREEN}User menu Profile button now navigates to /app/profile${NC}"
    echo ""
    echo -e "🌐 Application URLs:"
    echo -e "   Web: ${GREEN}https://time.lsltgroup.es${NC}"
    echo -e "   API: ${GREEN}https://time.lsltgroup.es/api/health${NC}"
    echo ""
    echo -e "📋 Testing Steps:"
    echo "   1. Visit https://time.lsltgroup.es"
    echo "   2. Log in with your credentials"
    echo "   3. Click your avatar in top-right corner"
    echo "   4. Click 'Profile' in the dropdown"
    echo "   5. Verify you land on the profile page"
    echo ""
    echo -e "📊 View logs:"
    echo -e "   ${YELLOW}docker compose -f infra/docker-compose.prod.yml logs -f web${NC}"
    echo ""
    echo -e "🔄 Rollback (if needed):"
    echo -e "   ${YELLOW}git checkout \$(cat ${BACKUP_DIR}/${BACKUP_NAME}.commit)${NC}"
    echo -e "   ${YELLOW}docker compose -f infra/docker-compose.prod.yml up -d --build web${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}========================================"
    echo -e "⚠️  DEPLOYMENT ISSUES DETECTED"
    echo -e "========================================${NC}"
    echo ""
    echo "Some services may not be healthy. Please investigate:"
    echo ""
    echo "View logs:"
    echo "  docker compose -f infra/docker-compose.prod.yml logs -f"
    echo ""
    echo "Check container status:"
    echo "  docker compose -f infra/docker-compose.prod.yml ps"
    echo ""
    echo "Restart services:"
    echo "  docker compose -f infra/docker-compose.prod.yml restart"
    echo ""
    exit 1
fi
