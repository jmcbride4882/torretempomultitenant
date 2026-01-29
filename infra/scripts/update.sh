#!/bin/bash
# Torre Tempo - Update Script
# Updates the application with latest code, handles migrations, and validates health
#
# Usage:
#   ./infra/scripts/update.sh
#
# Exit Codes:
#   0 - Update completed successfully
#   1 - Update failed (system rolled back to previous state)

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
log_success "  Torre Tempo - Update Script"
log_success "========================================"
echo ""

# ============================================================================
# VALIDATION
# ============================================================================
require_dir "$APP_DIR" || die "Application directory not found: $APP_DIR"
require_command git
require_command docker

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================
log_info "Running pre-flight checks..."
"$SCRIPT_DIR/pre-flight-check.sh" || die "Pre-flight checks failed"
echo ""

# ============================================================================
# STORE CURRENT STATE FOR ROLLBACK
# ============================================================================
cd "$APP_DIR" || die "Failed to change to application directory"
CURRENT_SHA=$(git rev-parse HEAD) || die "Failed to get current Git SHA"
log_info "Current commit: $CURRENT_SHA"

# ============================================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================================
if [ -f infra/.env ]; then
  log_info "Loading environment variables from infra/.env..."
  set -a
  source infra/.env
  set +a
  log_success "Environment variables loaded"
else
  log_warning "No infra/.env file found, using defaults"
fi

# ============================================================================
# PULL LATEST CHANGES
# ============================================================================
log_info "Pulling latest changes from origin/main..."
git pull origin main || die "Git pull failed"
log_success "Latest changes pulled"

# ============================================================================
# CHECK FOR DATABASE MIGRATIONS
# ============================================================================
if [ -d "apps/api/prisma/migrations" ]; then
  log_info "Checking for database migrations..."
  
  # Run migrations in the API container
  if docker_is_running "$CONTAINER_API"; then
    log_info "Running database migrations..."
    docker exec "$CONTAINER_API" npx prisma migrate deploy || {
      log_error "Database migration failed, rolling back..."
      git checkout "$CURRENT_SHA" >/dev/null 2>&1
      die "Update failed - migrations failed, rolled back to previous commit"
    }
    log_success "Database migrations applied"
  else
    log_warning "API container not running, migrations will run on container start"
  fi
else
  log_info "No migrations directory found, skipping migration check"
fi

# ============================================================================
# REBUILD DOCKER CONTAINERS
# ============================================================================
log_info "Rebuilding containers with latest code..."
docker compose -f infra/docker-compose.prod.yml up -d --build api web || {
  log_error "Docker compose up failed, rolling back..."
  git checkout "$CURRENT_SHA" >/dev/null 2>&1
  die "Update failed - container rebuild failed, rolled back to previous commit"
}
log_success "Containers rebuilt and started"

# ============================================================================
# WAIT FOR CONTAINERS TO BE HEALTHY
# ============================================================================
log_info "Waiting for containers to be healthy..."
docker_wait_healthy "$CONTAINER_API" 60 || {
  log_error "API container failed to become healthy, rolling back..."
  git checkout "$CURRENT_SHA" >/dev/null 2>&1
  docker compose -f infra/docker-compose.prod.yml down >/dev/null 2>&1
  die "Update failed - API container unhealthy, rolled back to previous commit"
}
docker_wait_healthy "$CONTAINER_WEB" 60 || {
  log_error "Web container failed to become healthy, rolling back..."
  git checkout "$CURRENT_SHA" >/dev/null 2>&1
  docker compose -f infra/docker-compose.prod.yml down >/dev/null 2>&1
  die "Update failed - Web container unhealthy, rolled back to previous commit"
}
log_success "All containers are healthy"

# ============================================================================
# RUN COMPREHENSIVE HEALTH CHECKS
# ============================================================================
echo ""
log_info "Running comprehensive health checks..."
if "$SCRIPT_DIR/health-check.sh"; then
  log_success "All health checks passed"
else
  log_error "Health checks failed, rolling back update..."
  git checkout "$CURRENT_SHA" >/dev/null 2>&1
  docker compose -f infra/docker-compose.prod.yml down >/dev/null 2>&1
  docker compose -f infra/docker-compose.prod.yml up -d >/dev/null 2>&1
  die "Update failed and was rolled back to previous commit"
fi

# ============================================================================
# SHOW CONTAINER STATUS AND LOGS
# ============================================================================
echo ""
log_info "Container status:"
docker compose -f infra/docker-compose.prod.yml ps
echo ""

log_info "Recent API logs:"
docker compose -f infra/docker-compose.prod.yml logs --tail=20 api

# ============================================================================
# SUCCESS
# ============================================================================
echo ""
log_success "========================================"
log_success "  Update Complete!"
log_success "========================================"
echo ""
log_success "Web: https://$PRIMARY_DOMAIN"
log_success "API: https://$PRIMARY_DOMAIN/api/health"
echo ""
log_info "View logs: docker compose -f infra/docker-compose.prod.yml logs -f"
echo ""

exit 0
