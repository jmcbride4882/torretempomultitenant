#!/bin/bash
# Torre Tempo - VPS Deployment Script
# For Ubuntu with Docker Compose

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration - EDIT THESE FOR YOUR DEPLOYMENT
APP_DIR="/opt/torre-tempo"
REPO_URL="https://github.com/jmcbride4882/torretempomultitenant.git"
PRIMARY_DOMAIN="time.lsltgroup.es"
SECONDARY_DOMAIN="time.lsltapps.com"
CERTBOT_EMAIL="admin@lsltgroup.es"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Torre Tempo - Deployment Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Function to generate secure password
generate_password() {
    openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32
}

# Step 1: System Update
echo -e "\n${YELLOW}[1/8] Updating system...${NC}"
apt-get update && apt-get upgrade -y

# Step 2: Install Dependencies
echo -e "\n${YELLOW}[2/8] Installing dependencies...${NC}"
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw

# Step 3: Install Docker
echo -e "\n${YELLOW}[3/8] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}Docker installed successfully${NC}"
else
    echo -e "${GREEN}Docker already installed${NC}"
fi

# Step 4: Configure Firewall
echo -e "\n${YELLOW}[4/8] Configuring firewall...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo -e "${GREEN}Firewall configured${NC}"

# Step 5: Clone/Update Repository
echo -e "\n${YELLOW}[5/8] Setting up application...${NC}"
if [ -d "$APP_DIR" ]; then
    echo "Updating existing installation..."
    cd $APP_DIR
    git fetch origin
    git reset --hard origin/main
else
    echo "Cloning repository..."
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# Step 6: Create Environment File
echo -e "\n${YELLOW}[6/8] Configuring environment...${NC}"
ENV_FILE="$APP_DIR/infra/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Creating environment file..."
    DB_PASSWORD=$(generate_password)
    JWT_SECRET=$(generate_password)
    
    cat > "$ENV_FILE" << EOF
# Torre Tempo - Production Environment
# Generated on $(date)

# Database
DB_PASSWORD=${DB_PASSWORD}

# JWT
JWT_SECRET=${JWT_SECRET}
EOF
    
    chmod 600 "$ENV_FILE"
    echo -e "${GREEN}Environment file created${NC}"
    echo ""
    echo -e "${YELLOW}======================================${NC}"
    echo -e "${YELLOW}  SAVE THESE CREDENTIALS SECURELY!${NC}"
    echo -e "${YELLOW}======================================${NC}"
    echo -e "DB_PASSWORD: ${DB_PASSWORD}"
    echo -e "JWT_SECRET:  ${JWT_SECRET}"
    echo -e "${YELLOW}======================================${NC}"
    echo ""
else
    echo -e "${GREEN}Environment file already exists${NC}"
fi

# Create required directories
mkdir -p "$APP_DIR/infra/ssl/certbot/conf"
mkdir -p "$APP_DIR/infra/ssl/certbot/www"
mkdir -p "$APP_DIR/infra/backups"

# Step 7: Start Application (HTTP first for SSL cert generation)
echo -e "\n${YELLOW}[7/8] Starting application...${NC}"
cd "$APP_DIR/infra"

# Create temporary HTTP-only nginx config for cert generation
cat > "$APP_DIR/infra/nginx/conf.d/torre-tempo.conf" << 'NGINXEOF'
resolver 127.0.0.11 valid=10s ipv6=off;
server {
    listen 80;
    server_name time.lsltgroup.es time.lsltapps.com _;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }
    location /api {
        set $api http://api:4000;
        proxy_pass $api;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location / {
        set $web http://web:80;
        proxy_pass $web;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXEOF

# Stop any existing services
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# Wait for services to start
echo "Waiting for services to start..."
sleep 15

# Step 8: SSL Certificate
echo -e "\n${YELLOW}[8/8] Setting up SSL certificates...${NC}"

# Check if certs already exist
if [ -f "$APP_DIR/infra/ssl/certbot/conf/live/$PRIMARY_DOMAIN/fullchain.pem" ]; then
    echo -e "${GREEN}SSL certificates already exist${NC}"
else
    echo "Obtaining SSL certificates..."
    docker run --rm \
        -v "$APP_DIR/infra/ssl/certbot/conf:/etc/letsencrypt" \
        -v "$APP_DIR/infra/ssl/certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$CERTBOT_EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$PRIMARY_DOMAIN" \
        -d "$SECONDARY_DOMAIN" && \
    echo -e "${GREEN}SSL certificates obtained${NC}" || \
    echo -e "${YELLOW}SSL certificate generation failed - app will run on HTTP only${NC}"
fi

# Update nginx config with HTTPS if certs exist
if [ -f "$APP_DIR/infra/ssl/certbot/conf/live/$PRIMARY_DOMAIN/fullchain.pem" ]; then
    echo "Enabling HTTPS..."
    cat > "$APP_DIR/infra/nginx/conf.d/torre-tempo.conf" << 'NGINXEOF'
resolver 127.0.0.11 valid=10s ipv6=off;
server {
    listen 80;
    server_name time.lsltgroup.es time.lsltapps.com _;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}
server {
    listen 443 ssl;
    server_name time.lsltgroup.es time.lsltapps.com;
    ssl_certificate /etc/letsencrypt/live/time.lsltgroup.es/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/time.lsltgroup.es/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    add_header Strict-Transport-Security "max-age=63072000" always;
    location /api {
        set $api http://api:4000;
        proxy_pass $api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location / {
        set $web http://web:80;
        proxy_pass $web;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINXEOF
    docker restart torre-tempo-nginx
    echo -e "${GREEN}HTTPS enabled${NC}"
fi

# Check health
echo -e "\n${YELLOW}Checking service health...${NC}"
docker compose -f docker-compose.prod.yml ps

# Final output
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Your app is available at:"
echo -e "  ${GREEN}https://$PRIMARY_DOMAIN${NC}"
echo -e "  ${GREEN}https://$SECONDARY_DOMAIN${NC}"
echo ""
echo -e "Useful commands:"
echo -e "  View logs:      ${YELLOW}cd $APP_DIR/infra && docker compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "  Restart:        ${YELLOW}cd $APP_DIR/infra && docker compose -f docker-compose.prod.yml restart${NC}"
echo -e "  Stop:           ${YELLOW}cd $APP_DIR/infra && docker compose -f docker-compose.prod.yml down${NC}"
echo -e "  Update:         ${YELLOW}cd $APP_DIR && git pull && cd infra && docker compose -f docker-compose.prod.yml up -d --build${NC}"
echo -e "  Run migrations: ${YELLOW}docker exec torre-tempo-api npx prisma migrate deploy${NC}"
echo ""
