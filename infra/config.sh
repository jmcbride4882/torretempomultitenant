#!/bin/bash
# Torre Tempo - Centralized Configuration
# Source this file in all deployment scripts: source "$(dirname "$0")/config.sh"

# ============================================================================
# APPLICATION CONFIGURATION
# ============================================================================
export APP_NAME="${APP_NAME:-torre-tempo}"
export APP_DIR="${APP_DIR:-/opt/torre-tempo}"
export REPO_URL="${REPO_URL:-https://github.com/jmcbride4882/torretempomultitenant.git}"

# ============================================================================
# DOMAIN CONFIGURATION
# ============================================================================
export PRIMARY_DOMAIN="${PRIMARY_DOMAIN:-time.lsltgroup.es}"
export SECONDARY_DOMAIN="${SECONDARY_DOMAIN:-time.lsltapps.com}"
export CERTBOT_EMAIL="${CERTBOT_EMAIL:-admin@lsltgroup.es}"

# ============================================================================
# CONTAINER NAMES
# ============================================================================
export CONTAINER_API="${CONTAINER_API:-torre-tempo-api}"
export CONTAINER_WEB="${CONTAINER_WEB:-torre-tempo-web}"
export CONTAINER_DB="${CONTAINER_DB:-torre-tempo-db}"
export CONTAINER_REDIS="${CONTAINER_REDIS:-torre-tempo-redis}"
export CONTAINER_NGINX="${CONTAINER_NGINX:-torre-tempo-nginx}"

# ============================================================================
# NETWORK CONFIGURATION
# ============================================================================
export NETWORK_NAME="${NETWORK_NAME:-infra_torre-tempo-network}"

# ============================================================================
# PORT CONFIGURATION
# ============================================================================
export API_PORT="${API_PORT:-4000}"
export DB_PORT="${DB_PORT:-5432}"
export REDIS_PORT="${REDIS_PORT:-6379}"

# ============================================================================
# BACKUP CONFIGURATION
# ============================================================================
export BACKUP_DIR="${BACKUP_DIR:-/opt/torre-tempo/infra/backups}"
export BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# ============================================================================
# HEALTH CHECK CONFIGURATION
# ============================================================================
export HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-https://${PRIMARY_DOMAIN}/api/health}"
export HEALTH_CHECK_TIMEOUT="${HEALTH_CHECK_TIMEOUT:-30}"
export HEALTH_CHECK_RETRIES="${HEALTH_CHECK_RETRIES:-3}"

# ============================================================================
# OUTPUT COLORS
# ============================================================================
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export NC='\033[0m' # No Color
