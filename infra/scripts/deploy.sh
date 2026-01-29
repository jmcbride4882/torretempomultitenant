#!/bin/bash
# Torre Tempo - VPS Deployment Script
# For Ubuntu with Docker Compose
# Integrates pre-flight checks, health checks, and rollback capability

# ============================================================================
# SOURCE CONFIGURATION AND UTILITIES
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"
source "$SCRIPT_DIR/../lib/common.sh"

# ============================================================================
# HEADER
# ============================================================================
log_success "========================================"
log_success "  Torre Tempo - Deployment Script"
log_success "========================================"

# ============================================================================
# VALIDATION
# ============================================================================

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    die "Please run as root (sudo)"
fi

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================
log_info "Running pre-flight checks..."
"$SCRIPT_DIR/pre-flight-check.sh" || die "Pre-flight checks failed"

# Function to generate secure password
generate_password() {
    openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32
}

# ============================================================================
# STEP 1: SYSTEM UPDATE
# ============================================================================
log_info "[1/8] Updating system..."
apt-get update && apt-get upgrade -y || die "System update failed"

# ============================================================================
# STEP 2: INSTALL DEPENDENCIES
# ============================================================================
log_info "[2/8] Installing dependencies..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw || die "Dependency installation failed"

# ============================================================================
# STEP 3: INSTALL DOCKER
# ============================================================================
log_info "[3/8] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh || die "Failed to download Docker installer"
    sh get-docker.sh || die "Docker installation failed"
    rm get-docker.sh
    systemctl enable docker || die "Failed to enable Docker service"
    systemctl start docker || die "Failed to start Docker service"
    log_success "Docker installed successfully"
else
    log_success "Docker already installed"
fi

# ============================================================================
# STEP 4: CONFIGURE FIREWALL
# ============================================================================
log_info "[4/8] Configuring firewall..."
ufw --force reset || die "Firewall reset failed"
ufw default deny incoming || die "Firewall configuration failed"
ufw default allow outgoing || die "Firewall configuration failed"
ufw allow ssh || die "Firewall SSH rule failed"
ufw allow 80/tcp || die "Firewall HTTP rule failed"
ufw allow 443/tcp || die "Firewall HTTPS rule failed"
ufw --force enable || die "Firewall enable failed"
log_success "Firewall configured"

# ============================================================================
# STEP 5: CLONE/UPDATE REPOSITORY
# ============================================================================
log_info "[5/8] Setting up application..."
if [ -d "$APP_DIR" ]; then
    log_info "Updating existing installation..."
    cd "$APP_DIR" || die "Failed to change to app directory"
    git fetch origin || die "Git fetch failed"
    git reset --hard origin/main || die "Git reset failed"
else
    log_info "Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR" || die "Git clone failed"
    cd "$APP_DIR" || die "Failed to change to app directory"
fi

# Store current Git SHA for potential rollback
CURRENT_SHA=$(git rev-parse HEAD) || die "Failed to get current Git SHA"
log_info "Current deployment SHA: $CURRENT_SHA"

# ============================================================================
# STEP 6: CREATE ENVIRONMENT FILE
# ============================================================================
log_info "[6/8] Configuring environment..."
ENV_FILE="$APP_DIR/infra/.env"

if [ ! -f "$ENV_FILE" ]; then
    log_info "Creating environment file..."
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
    
    chmod 600 "$ENV_FILE" || die "Failed to set environment file permissions"
    log_success "Environment file created"
    echo ""
    log_warning "========================================"
    log_warning "  SAVE THESE CREDENTIALS SECURELY!"
    log_warning "========================================"
    echo "DB_PASSWORD: ${DB_PASSWORD}"
    echo "JWT_SECRET:  ${JWT_SECRET}"
    log_warning "========================================"
    echo ""
else
    log_success "Environment file already exists"
fi

# Create required directories
mkdir -p "$APP_DIR/infra/ssl/certbot/conf" || die "Failed to create certbot conf directory"
mkdir -p "$APP_DIR/infra/ssl/certbot/www" || die "Failed to create certbot www directory"
mkdir -p "$APP_DIR/infra/backups" || die "Failed to create backups directory"

# ============================================================================
# STEP 7: START APPLICATION (HTTP FIRST FOR SSL CERT GENERATION)
# ============================================================================
log_info "[7/8] Starting application..."
cd "$APP_DIR/infra" || die "Failed to change to infra directory"

# Create temporary HTTP-only nginx config for cert generation
log_info "Creating temporary HTTP-only nginx configuration..."
mkdir -p "$APP_DIR/infra/nginx/conf.d" || die "Failed to create nginx conf.d directory"
cat > "$APP_DIR/infra/nginx/conf.d/torre-tempo.conf" << NGINXEOF
resolver 127.0.0.11 valid=10s ipv6=off;
server {
    listen 80;
    server_name $PRIMARY_DOMAIN $SECONDARY_DOMAIN _;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
        allow all;
    }
    location /api {
        set \$api http://api:4000;
        proxy_pass \$api;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    location / {
        set \$web http://web:80;
        proxy_pass \$web;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXEOF

# Stop any existing services
log_info "Stopping any existing services..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build and start
log_info "Building and starting containers..."
docker compose -f docker-compose.prod.yml up -d --build || die "Docker compose up failed"

# Wait for services to start
log_info "Waiting for services to start..."
sleep 15

# ============================================================================
# STEP 8: SSL CERTIFICATE SETUP
# ============================================================================
log_info "[8/8] Setting up SSL certificates..."

# Check if certs already exist
if [ -f "$APP_DIR/infra/ssl/certbot/conf/live/$PRIMARY_DOMAIN/fullchain.pem" ]; then
    log_success "SSL certificates already exist"
else
    log_info "Obtaining SSL certificates..."
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
    log_success "SSL certificates obtained" || \
    log_warning "SSL certificate generation failed - app will run on HTTP only"
fi

# Update nginx config with HTTPS if certs exist
if [ -f "$APP_DIR/infra/ssl/certbot/conf/live/$PRIMARY_DOMAIN/fullchain.pem" ]; then
    log_info "Enabling HTTPS..."
    cat > "$APP_DIR/infra/nginx/conf.d/torre-tempo.conf" << NGINXEOF
resolver 127.0.0.11 valid=10s ipv6=off;
server {
    listen 80;
    server_name $PRIMARY_DOMAIN $SECONDARY_DOMAIN _;
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
    server_name $PRIMARY_DOMAIN $SECONDARY_DOMAIN;
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
    docker restart "$CONTAINER_NGINX" || die "Failed to restart nginx container"
    log_success "HTTPS enabled"
fi

# ============================================================================
# HEALTH CHECKS AND ROLLBACK
# ============================================================================
log_info "Running health checks..."
if "$SCRIPT_DIR/health-check.sh"; then
    log_success "All health checks passed"
else
    log_error "Health checks failed, rolling back deployment..."
    "$SCRIPT_DIR/rollback.sh" "$CURRENT_SHA" || log_error "Rollback failed - manual intervention required"
    die "Deployment failed and was rolled back"
fi

# ============================================================================
# FINAL OUTPUT
# ============================================================================
echo ""
log_success "========================================"
log_success "  Deployment Complete!"
log_success "========================================"
echo ""
log_info "Your app is available at:"
echo "  https://$PRIMARY_DOMAIN"
echo "  https://$SECONDARY_DOMAIN"
echo ""
log_info "Useful commands:"
echo "  View logs:      cd $APP_DIR/infra && docker compose -f docker-compose.prod.yml logs -f"
echo "  Restart:        cd $APP_DIR/infra && docker compose -f docker-compose.prod.yml restart"
echo "  Stop:           cd $APP_DIR/infra && docker compose -f docker-compose.prod.yml down"
echo "  Update:         cd $APP_DIR && git pull && cd infra && docker compose -f docker-compose.prod.yml up -d --build"
echo "  Run migrations: docker exec $CONTAINER_API npx prisma migrate deploy"
echo ""
