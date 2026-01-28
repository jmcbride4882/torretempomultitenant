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

# Function to show menu and get selection
show_menu() {
    local prompt="$1"
    shift
    local options=("$@")
    
    echo ""
    echo -e "${BLUE}$prompt${NC}"
    for i in "${!options[@]}"; do
        echo "  $((i+1))) ${options[$i]}"
    done
    echo ""
    
    while true; do
        read -p "Enter choice [1-${#options[@]}]: " choice
        if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#options[@]}" ]; then
            echo "${options[$((choice-1))]}"
            return
        else
            echo -e "${RED}Invalid choice. Please enter a number between 1 and ${#options[@]}.${NC}"
        fi
    done
}

# Collect configuration
echo -e "${YELLOW}╔════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   INSTALLATION CONFIGURATION WIZARD    ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}This wizard will guide you through setting up Torre Tempo.${NC}"
echo -e "${BLUE}You can press Ctrl+C at any time to cancel.${NC}"
echo ""
read -p "Press Enter to continue..."

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  STEP 1: Installation Directory${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}This is where Torre Tempo will be installed.${NC}"
echo -e "${BLUE}Default: $DEFAULT_APP_DIR${NC}"
echo ""
prompt_with_default "Install directory" "$DEFAULT_APP_DIR" "APP_DIR"

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  STEP 2: Domain Configuration${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Enter your domain name(s) where Torre Tempo will be accessible.${NC}"
echo -e "${BLUE}Example: tempo.yourcompany.com${NC}"
echo -e "${BLUE}Make sure DNS A records point to this server's IP address.${NC}"
echo ""
prompt_with_default "Primary domain" "" "PRIMARY_DOMAIN"
prompt_with_default "Secondary domain (optional, press Enter to skip)" "" "SECONDARY_DOMAIN"
echo ""
echo -e "${BLUE}Email for SSL certificate notifications (Let's Encrypt):${NC}"
prompt_with_default "Email for SSL certificates" "" "CERTBOT_EMAIL"

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  STEP 3: Company/Tenant Information${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}This creates your organization's tenant in the system.${NC}"
echo -e "${BLUE}Example: 'ACME Corporation'${NC}"
echo ""
prompt_with_default "Company/Organization name" "" "COMPANY_NAME"

echo ""
echo -e "${BLUE}Tenant slug is used in URLs and must be unique.${NC}"
echo -e "${BLUE}Use lowercase letters, numbers, and hyphens only.${NC}"
echo -e "${BLUE}Example: 'acme-corp' or 'my-company'${NC}"
echo ""
prompt_with_default "Tenant slug" "" "TENANT_SLUG"

echo ""
echo -e "${BLUE}Select your timezone:${NC}"
TIMEZONE=$(show_menu "Choose timezone:" \
    "Europe/Madrid (Spain)" \
    "Europe/London (UK)" \
    "Europe/Paris (France)" \
    "Europe/Berlin (Germany)" \
    "Europe/Amsterdam (Netherlands)" \
    "Europe/Brussels (Belgium)" \
    "Europe/Warsaw (Poland)" \
    "America/New_York (US Eastern)" \
    "America/Los_Angeles (US Pacific)" \
    "America/Chicago (US Central)")
TIMEZONE=$(echo "$TIMEZONE" | awk '{print $1}')

echo ""
echo -e "${BLUE}Select your default language:${NC}"
LOCALE=$(show_menu "Choose language:" \
    "es - Spanish (Español)" \
    "en - English" \
    "fr - French (Français)" \
    "de - German (Deutsch)" \
    "pl - Polish (Polski)" \
    "nl - Dutch (Nederlands)")
LOCALE=$(echo "$LOCALE" | awk '{print $1}')

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  STEP 4: Administrator Account${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Create the initial administrator account.${NC}"
echo -e "${BLUE}This account will have full access to the system.${NC}"
echo ""
prompt_with_default "Admin email" "" "ADMIN_EMAIL"
prompt_with_default "Admin first name" "" "ADMIN_FIRST_NAME"
prompt_with_default "Admin last name" "" "ADMIN_LAST_NAME"
echo ""
echo -e "${BLUE}Choose a strong password (minimum 8 characters).${NC}"
prompt_password "Admin password" "ADMIN_PASSWORD"

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  STEP 5: Security Configuration${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Generating secure passwords for database and JWT...${NC}"
echo -e "${BLUE}These will be saved to .env file and are not shown.${NC}"
echo ""
DB_PASSWORD=$(generate_password)
JWT_SECRET=$(generate_password)
echo -e "${GREEN}✓ Database password generated (32 characters)${NC}"
echo -e "${GREEN}✓ JWT secret generated (32 characters)${NC}"

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}  STEP 6: Source Code${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Git repository URL (leave default for standard installation):${NC}"
prompt_with_default "Repository URL" "$DEFAULT_REPO_URL" "REPO_URL"

# Confirmation
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              CONFIGURATION SUMMARY                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Installation:${NC}"
echo "  Directory:        $APP_DIR"
echo "  Repository:       $REPO_URL"
echo ""
echo -e "${YELLOW}Domain & SSL:${NC}"
echo "  Primary domain:   $PRIMARY_DOMAIN"
[ -n "$SECONDARY_DOMAIN" ] && echo "  Secondary domain: $SECONDARY_DOMAIN"
echo "  SSL email:        $CERTBOT_EMAIL"
echo ""
echo -e "${YELLOW}Organization:${NC}"
echo "  Company:          $COMPANY_NAME"
echo "  Tenant slug:      $TENANT_SLUG"
echo "  Timezone:         $TIMEZONE"
echo "  Language:         $LOCALE"
echo ""
echo -e "${YELLOW}Administrator:${NC}"
echo "  Email:            $ADMIN_EMAIL"
echo "  Name:             $ADMIN_FIRST_NAME $ADMIN_LAST_NAME"
echo ""
echo -e "${YELLOW}Security:${NC}"
echo "  Database:         ✓ Auto-generated 32-char password"
echo "  JWT Secret:       ✓ Auto-generated 32-char secret"
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""
read -p "Everything looks correct? Type 'yes' to continue: " confirm

if [ "$confirm" != "yes" ]; then
    echo ""
    echo -e "${RED}Installation cancelled.${NC}"
    echo -e "${YELLOW}Run the script again to start over.${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}Starting installation...${NC}"
echo ""

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
