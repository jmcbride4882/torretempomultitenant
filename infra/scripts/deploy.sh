#!/bin/bash
# Torre Tempo - VPS Deployment Script
# For Ubuntu 25.04 with Docker Compose
# Domains: time.lsltgroup.es, time.lsltapps.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAINS="time.lsltgroup.es time.lsltapps.com"
PRIMARY_DOMAIN="time.lsltgroup.es"
EMAIL="admin@lsltgroup.es"  # Change this to your email for Let's Encrypt
APP_DIR="/opt/torre-tempo"
REPO_URL="https://github.com/jmcbride4882/torretempomultitenant.git"

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
    ufw \
    fail2ban

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

# Step 4: Install Docker Compose
echo -e "\n${YELLOW}[4/8] Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}Docker Compose installed successfully${NC}"
else
    echo -e "${GREEN}Docker Compose already installed${NC}"
fi

# Step 5: Configure Firewall
echo -e "\n${YELLOW}[5/8] Configuring firewall...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo -e "${GREEN}Firewall configured${NC}"

# Step 6: Clone/Update Repository
echo -e "\n${YELLOW}[6/8] Setting up application...${NC}"
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

# Step 7: Create Environment File
echo -e "\n${YELLOW}[7/8] Configuring environment...${NC}"
ENV_FILE="$APP_DIR/infra/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Creating environment file..."
    DB_PASSWORD=$(generate_password)
    JWT_SECRET=$(generate_password)
    
    cat > $ENV_FILE << EOF
# Torre Tempo - Production Environment
# Generated on $(date)

# Database
DB_PASSWORD=${DB_PASSWORD}

# JWT
JWT_SECRET=${JWT_SECRET}

# Domains
PRIMARY_DOMAIN=${PRIMARY_DOMAIN}
DOMAINS=${DOMAINS}

# Email for Let's Encrypt
CERTBOT_EMAIL=${EMAIL}
EOF
    
    chmod 600 $ENV_FILE
    echo -e "${GREEN}Environment file created${NC}"
    echo -e "${YELLOW}IMPORTANT: Save these credentials securely!${NC}"
    echo -e "DB_PASSWORD: ${DB_PASSWORD}"
    echo -e "JWT_SECRET: ${JWT_SECRET}"
else
    echo -e "${GREEN}Environment file already exists${NC}"
fi

# Source environment
source $ENV_FILE

# Step 8: SSL Certificate Setup
echo -e "\n${YELLOW}[8/8] Setting up SSL certificates...${NC}"

# Create directories
mkdir -p $APP_DIR/infra/ssl/certbot/conf
mkdir -p $APP_DIR/infra/ssl/certbot/www
mkdir -p $APP_DIR/infra/backups

# Check if certificates exist
if [ ! -d "$APP_DIR/infra/ssl/certbot/conf/live/$PRIMARY_DOMAIN" ]; then
    echo "Obtaining SSL certificates..."
    
    # Create temporary nginx config for certificate challenge
    cat > $APP_DIR/infra/nginx/conf.d/torre-tempo.conf.temp << 'EOF'
server {
    listen 80;
    server_name time.lsltgroup.es time.lsltapps.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 'Torre Tempo - SSL Setup';
        add_header Content-Type text/plain;
    }
}
EOF
    
    # Backup original config
    mv $APP_DIR/infra/nginx/conf.d/torre-tempo.conf $APP_DIR/infra/nginx/conf.d/torre-tempo.conf.bak
    mv $APP_DIR/infra/nginx/conf.d/torre-tempo.conf.temp $APP_DIR/infra/nginx/conf.d/torre-tempo.conf
    
    # Start nginx for certificate challenge
    cd $APP_DIR/infra
    docker-compose -f docker-compose.prod.yml up -d nginx
    
    sleep 5
    
    # Get certificates
    docker run --rm \
        -v $APP_DIR/infra/ssl/certbot/conf:/etc/letsencrypt \
        -v $APP_DIR/infra/ssl/certbot/www:/var/www/certbot \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $PRIMARY_DOMAIN \
        -d time.lsltapps.com
    
    # Restore original config
    mv $APP_DIR/infra/nginx/conf.d/torre-tempo.conf.bak $APP_DIR/infra/nginx/conf.d/torre-tempo.conf
    
    # Stop temporary nginx
    docker-compose -f docker-compose.prod.yml down
    
    echo -e "${GREEN}SSL certificates obtained${NC}"
else
    echo -e "${GREEN}SSL certificates already exist${NC}"
fi

# Create cron job for backups
echo -e "\n${YELLOW}Setting up backup cron job...${NC}"
CRON_FILE="/etc/cron.d/torre-tempo-backup"
cat > $CRON_FILE << EOF
# Torre Tempo - Daily database backup at 3 AM
0 3 * * * root cd $APP_DIR/infra && docker-compose -f docker-compose.prod.yml exec -T backup /backup.sh >> /var/log/torre-tempo-backup.log 2>&1
EOF
chmod 644 $CRON_FILE

# Start application
echo -e "\n${YELLOW}Starting application...${NC}"
cd $APP_DIR/infra
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to start
echo "Waiting for services to start..."
sleep 30

# Check health
echo -e "\n${YELLOW}Checking service health...${NC}"
if curl -s http://localhost/api/health | grep -q "ok"; then
    echo -e "${GREEN}API is healthy!${NC}"
else
    echo -e "${RED}API health check failed - check logs with: docker-compose -f docker-compose.prod.yml logs api${NC}"
fi

# Final output
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e ""
echo -e "Your app is now available at:"
echo -e "  ${GREEN}https://time.lsltgroup.es${NC}"
echo -e "  ${GREEN}https://time.lsltapps.com${NC}"
echo -e ""
echo -e "Useful commands:"
echo -e "  View logs:      ${YELLOW}cd $APP_DIR/infra && docker-compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "  Restart:        ${YELLOW}cd $APP_DIR/infra && docker-compose -f docker-compose.prod.yml restart${NC}"
echo -e "  Stop:           ${YELLOW}cd $APP_DIR/infra && docker-compose -f docker-compose.prod.yml down${NC}"
echo -e "  Update:         ${YELLOW}cd $APP_DIR && git pull && cd infra && docker-compose -f docker-compose.prod.yml up -d --build${NC}"
echo -e "  Run migrations: ${YELLOW}docker exec torre-tempo-api npx prisma migrate deploy${NC}"
echo -e "  View backups:   ${YELLOW}ls -la $APP_DIR/infra/backups${NC}"
echo -e ""
echo -e "${YELLOW}IMPORTANT: Make sure your DNS records point to this server's IP!${NC}"
echo -e "  A record: time.lsltgroup.es  -> YOUR_SERVER_IP"
echo -e "  A record: time.lsltapps.com  -> YOUR_SERVER_IP"
