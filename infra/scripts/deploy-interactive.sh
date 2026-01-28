#!/bin/bash
# Torre Tempo - Interactive Deployment Script
# Production-ready deployment for licensing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
DEFAULT_APP_DIR="/opt/torre-tempo"
DEFAULT_REPO_URL="https://github.com/jmcbride4882/torretempomultitenant.git"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Torre Tempo - Interactive Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}This script will guide you through deploying Torre Tempo${NC}"
echo -e "${BLUE}on your VPS server.${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo bash deploy-interactive.sh)${NC}"
    exit 1
fi

# Function to prompt for input with default
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " input
        eval "$var_name=\${input:-$default}"
    else
        read -p "$prompt: " input
        while [ -z "$input" ]; do
            echo -e "${RED}This field is required.${NC}"
            read -p "$prompt: " input
        done
        eval "$var_name=\"$input\""
    fi
}

# Function to prompt for password (hidden input)
prompt_password() {
    local prompt="$1"
    local var_name="$2"
    local password=""
    local password_confirm=""
    
    while true; do
        read -sp "$prompt: " password
        echo ""
        read -sp "Confirm password: " password_confirm
        echo ""
        
        if [ "$password" = "$password_confirm" ]; then
            if [ ${#password} -ge 8 ]; then
                eval "$var_name=\"$password\""
                break
            else
                echo -e "${RED}Password must be at least 8 characters.${NC}"
            fi
        else
            echo -e "${RED}Passwords do not match. Please try again.${NC}"
        fi
    done
}

# Function to generate secure password
generate_password() {
    openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32
}

# Collect configuration
echo -e "${YELLOW}=== Installation Directory ===${NC}"
prompt_with_default "Install directory" "$DEFAULT_APP_DIR" "APP_DIR"

echo ""
echo -e "${YELLOW}=== Domain Configuration ===${NC}"
prompt_with_default "Primary domain (e.g., tempo.yourcompany.com)" "" "PRIMARY_DOMAIN"
prompt_with_default "Secondary domain (optional, press Enter to skip)" "" "SECONDARY_DOMAIN"
prompt_with_default "Email for SSL certificates" "" "CERTBOT_EMAIL"

echo ""
echo -e "${YELLOW}=== Company/Tenant Information ===${NC}"
prompt_with_default "Company/Organization name" "" "COMPANY_NAME"
prompt_with_default "Tenant slug (lowercase, no spaces, e.g., 'mycompany')" "" "TENANT_SLUG"
prompt_with_default "Timezone" "Europe/Madrid" "TIMEZONE"
prompt_with_default "Locale (es, en, fr, de, pl, nl)" "es" "LOCALE"

echo ""
echo -e "${YELLOW}=== Default Admin Account ===${NC}"
prompt_with_default "Admin email" "" "ADMIN_EMAIL"
prompt_with_default "Admin first name" "" "ADMIN_FIRST_NAME"
prompt_with_default "Admin last name" "" "ADMIN_LAST_NAME"
prompt_password "Admin password (min 8 characters)" "ADMIN_PASSWORD"

echo ""
echo -e "${YELLOW}=== Database Configuration ===${NC}"
echo "Generating secure database password..."
DB_PASSWORD=$(generate_password)
echo "Database password generated: ${DB_PASSWORD:0:10}... (saved to .env)"

echo ""
echo -e "${YELLOW}=== JWT Configuration ===${NC}"
echo "Generating secure JWT secret..."
JWT_SECRET=$(generate_password)
echo "JWT secret generated (saved to .env)"

echo ""
echo -e "${YELLOW}=== Repository Configuration ===${NC}"
prompt_with_default "Git repository URL" "$DEFAULT_REPO_URL" "REPO_URL"

# Confirmation
echo ""
echo -e "${GREEN}=== Configuration Summary ===${NC}"
echo "Install directory: $APP_DIR"
echo "Primary domain: $PRIMARY_DOMAIN"
[ -n "$SECONDARY_DOMAIN" ] && echo "Secondary domain: $SECONDARY_DOMAIN"
echo "SSL email: $CERTBOT_EMAIL"
echo "Company: $COMPANY_NAME"
echo "Tenant slug: $TENANT_SLUG"
echo "Admin email: $ADMIN_EMAIL"
echo "Admin name: $ADMIN_FIRST_NAME $ADMIN_LAST_NAME"
echo "Repository: $REPO_URL"
echo ""
read -p "Continue with installation? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${RED}Installation cancelled.${NC}"
    exit 0
fi

# Step 1: System Update
echo -e "\n${YELLOW}[1/9] Updating system...${NC}"
apt-get update && apt-get upgrade -y

# Step 2: Install Dependencies
echo -e "\n${YELLOW}[2/9] Installing dependencies...${NC}"
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    jq

# Step 3: Install Docker
echo -e "\n${YELLOW}[3/9] Installing Docker...${NC}"
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
echo -e "\n${YELLOW}[4/9] Configuring firewall...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo -e "${GREEN}Firewall configured${NC}"

# Step 5: Clone/Update Repository
echo -e "\n${YELLOW}[5/9] Setting up application...${NC}"
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
echo -e "\n${YELLOW}[6/9] Configuring environment...${NC}"
ENV_FILE="$APP_DIR/infra/.env"

cat > "$ENV_FILE" << EOF
# Torre Tempo - Production Environment
# Generated on $(date)

# Database
DB_PASSWORD=${DB_PASSWORD}

# JWT
JWT_SECRET=${JWT_SECRET}

# Node Environment
NODE_ENV=production

# Company/Tenant Configuration
COMPANY_NAME=${COMPANY_NAME}
TENANT_SLUG=${TENANT_SLUG}
TIMEZONE=${TIMEZONE}
LOCALE=${LOCALE}

# Default Admin
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_FIRST_NAME=${ADMIN_FIRST_NAME}
ADMIN_LAST_NAME=${ADMIN_LAST_NAME}

# Domain Configuration
PRIMARY_DOMAIN=${PRIMARY_DOMAIN}
SECONDARY_DOMAIN=${SECONDARY_DOMAIN}
CERTBOT_EMAIL=${CERTBOT_EMAIL}
EOF

chmod 600 "$ENV_FILE"
echo -e "${GREEN}Environment file created at $ENV_FILE${NC}"

# Create required directories
mkdir -p "$APP_DIR/infra/ssl/certbot/conf"
mkdir -p "$APP_DIR/infra/ssl/certbot/www"
mkdir -p "$APP_DIR/infra/backups"

# Step 7: Start Application (HTTP first for SSL cert generation)
echo -e "\n${YELLOW}[7/9] Starting application...${NC}"
cd "$APP_DIR/infra"

# Create temporary HTTP-only nginx config for cert generation
DOMAINS="$PRIMARY_DOMAIN"
[ -n "$SECONDARY_DOMAIN" ] && DOMAINS="$DOMAINS $SECONDARY_DOMAIN"

cat > "$APP_DIR/infra/nginx/conf.d/torre-tempo.conf" << 'NGINXEOF'
resolver 127.0.0.11 valid=10s ipv6=off;
server {
    listen 80;
    server_name _;
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
sleep 20

# Step 8: SSL Certificate
echo -e "\n${YELLOW}[8/9] Setting up SSL certificates...${NC}"

# Check if certs already exist
if [ -f "$APP_DIR/infra/ssl/certbot/conf/live/$PRIMARY_DOMAIN/fullchain.pem" ]; then
    echo -e "${GREEN}SSL certificates already exist${NC}"
else
    echo "Obtaining SSL certificates..."
    
    CERT_DOMAINS="-d $PRIMARY_DOMAIN"
    [ -n "$SECONDARY_DOMAIN" ] && CERT_DOMAINS="$CERT_DOMAINS -d $SECONDARY_DOMAIN"
    
    docker run --rm \
        -v "$APP_DIR/infra/ssl/certbot/conf:/etc/letsencrypt" \
        -v "$APP_DIR/infra/ssl/certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email "$CERTBOT_EMAIL" \
        --agree-tos \
        --no-eff-email \
        $CERT_DOMAINS && \
    echo -e "${GREEN}SSL certificates obtained${NC}" || \
    echo -e "${YELLOW}SSL certificate generation failed - app will run on HTTP only${NC}"
fi

# Update nginx config with HTTPS if certs exist
if [ -f "$APP_DIR/infra/ssl/certbot/conf/live/$PRIMARY_DOMAIN/fullchain.pem" ]; then
    echo "Enabling HTTPS..."
    
    SERVER_NAMES="$PRIMARY_DOMAIN"
    [ -n "$SECONDARY_DOMAIN" ] && SERVER_NAMES="$SERVER_NAMES $SECONDARY_DOMAIN"
    
    cat > "$APP_DIR/infra/nginx/conf.d/torre-tempo.conf" << NGINXEOF
resolver 127.0.0.11 valid=10s ipv6=off;
server {
    listen 80;
    server_name $SERVER_NAMES;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }
    location / {
        return 301 https://\$host\$request_uri;
    }
}
server {
    listen 443 ssl;
    server_name $SERVER_NAMES;
    ssl_certificate /etc/letsencrypt/live/$PRIMARY_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$PRIMARY_DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    add_header Strict-Transport-Security "max-age=63072000" always;
    location /api {
        set \$api http://api:4000;
        proxy_pass \$api;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location / {
        set \$web http://web:80;
        proxy_pass \$web;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXEOF
    docker restart torre-tempo-nginx
    echo -e "${GREEN}HTTPS enabled${NC}"
fi

# Step 9: Initialize Database and Admin Account
echo -e "\n${YELLOW}[9/9] Setting up database and admin account...${NC}"

# Wait for database to be ready
sleep 10

# Reset database password
docker exec torre-tempo-db psql -U postgres -c "ALTER USER postgres WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true

# Push schema to database
echo "Creating database schema..."
docker run --rm --network infra_torre-tempo-network \
    -e DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@postgres:5432/torre_tempo?schema=public" \
    -v "$APP_DIR/apps/api/prisma:/app/prisma" \
    infra-api sh -c 'cd /app && npx prisma db push --schema=/app/prisma/schema.prisma --skip-generate' || \
    echo -e "${YELLOW}Schema push may have failed - will retry${NC}"

# Generate password hash
ADMIN_PASSWORD_HASH=$(docker run --rm infra-api node -e "const bcrypt = require('bcrypt'); bcrypt.hash('$ADMIN_PASSWORD', 12).then(hash => console.log(hash));")

# Create admin account
echo "Creating admin account..."
docker exec -i torre-tempo-db psql -U postgres -d torre_tempo << EOSQL
-- Create tenant
INSERT INTO tenants (id, name, slug, timezone, locale, "maxWeeklyHours", "maxAnnualHours", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '${COMPANY_NAME}',
  '${TENANT_SLUG}',
  '${TIMEZONE}',
  '${LOCALE}',
  40,
  1822,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
RETURNING id, name, slug;

-- Create admin user
INSERT INTO users (id, "tenantId", email, "passwordHash", "firstName", "lastName", role, "employeeCode", "isActive", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  t.id,
  '${ADMIN_EMAIL}',
  '${ADMIN_PASSWORD_HASH}',
  '${ADMIN_FIRST_NAME}',
  '${ADMIN_LAST_NAME}',
  'ADMIN',
  'ADMIN001',
  true,
  NOW(),
  NOW()
FROM tenants t
WHERE t.slug = '${TENANT_SLUG}'
ON CONFLICT ("tenantId", email) DO UPDATE SET "firstName" = EXCLUDED."firstName"
RETURNING id, email, "firstName", "lastName", role;
EOSQL

# Restart API to refresh Prisma client
docker restart torre-tempo-api
sleep 10

# Check health
echo -e "\n${YELLOW}Checking service health...${NC}"
docker compose -f docker-compose.prod.yml ps

# Final output
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Your app is available at:"
echo -e "  ${GREEN}https://$PRIMARY_DOMAIN${NC}"
[ -n "$SECONDARY_DOMAIN" ] && echo -e "  ${GREEN}https://$SECONDARY_DOMAIN${NC}"
echo ""
echo -e "${YELLOW}=== Admin Login Credentials ===${NC}"
echo -e "Email:    ${GREEN}$ADMIN_EMAIL${NC}"
echo -e "Password: ${GREEN}$ADMIN_PASSWORD${NC}"
echo -e "Tenant:   ${GREEN}$COMPANY_NAME${NC}"
echo ""
echo -e "${RED}⚠️  IMPORTANT: Save these credentials and change the password after first login!${NC}"
echo ""
echo -e "Useful commands:"
echo -e "  View logs:      ${YELLOW}cd $APP_DIR/infra && docker compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "  Restart:        ${YELLOW}cd $APP_DIR/infra && docker compose -f docker-compose.prod.yml restart${NC}"
echo -e "  Stop:           ${YELLOW}cd $APP_DIR/infra && docker compose -f docker-compose.prod.yml down${NC}"
echo -e "  Update:         ${YELLOW}cd $APP_DIR && bash infra/scripts/update.sh${NC}"
echo ""
echo -e "${GREEN}Credentials saved to: $APP_DIR/infra/.env${NC}"
echo ""
