#!/bin/bash
# Torre Tempo - Health Check Script
# Validates all services are healthy and operational
# Exit code 0 if all healthy, exit code 1 if any unhealthy

# Source configuration and utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"
source "$SCRIPT_DIR/../lib/common.sh"

# ============================================================================
# HEALTH CHECK EXECUTION
# ============================================================================

# Track overall health status
HEALTH_STATUS=0
FAILED_CHECKS=()

# ============================================================================
# API HEALTH CHECK
# ============================================================================
log_info "Checking API health at ${HEALTH_CHECK_URL}..."
if wait_for_service "$HEALTH_CHECK_URL" "$HEALTH_CHECK_TIMEOUT" "$HEALTH_CHECK_RETRIES"; then
  log_success "API is healthy"
else
  log_error "API health check failed"
  HEALTH_STATUS=1
  FAILED_CHECKS+=("API")
fi

# ============================================================================
# DATABASE HEALTH CHECK
# ============================================================================
log_info "Checking database connection..."
if docker_is_running "$CONTAINER_DB"; then
  if docker exec "$CONTAINER_DB" pg_isready -U postgres >/dev/null 2>&1; then
    log_success "Database is accepting connections"
  else
    log_error "Database is not accepting connections"
    HEALTH_STATUS=1
    FAILED_CHECKS+=("Database")
  fi
else
  log_error "Database container is not running"
  HEALTH_STATUS=1
  FAILED_CHECKS+=("Database")
fi

# ============================================================================
# REDIS HEALTH CHECK
# ============================================================================
log_info "Checking Redis connection..."
if docker_is_running "$CONTAINER_REDIS"; then
  if docker exec "$CONTAINER_REDIS" redis-cli ping >/dev/null 2>&1; then
    log_success "Redis is responding"
  else
    log_error "Redis is not responding"
    HEALTH_STATUS=1
    FAILED_CHECKS+=("Redis")
  fi
else
  log_error "Redis container is not running"
  HEALTH_STATUS=1
  FAILED_CHECKS+=("Redis")
fi

# ============================================================================
# DOCKER CONTAINER HEALTH CHECKS
# ============================================================================
log_info "Checking container health..."

# Array of containers to check
CONTAINERS=(
  "$CONTAINER_API"
  "$CONTAINER_WEB"
  "$CONTAINER_DB"
  "$CONTAINER_REDIS"
  "$CONTAINER_NGINX"
)

for container in "${CONTAINERS[@]}"; do
  if docker_is_running "$container"; then
    local status
    status=$(docker_health "$container")
    
    if [ "$status" = "healthy" ]; then
      log_success "Container '$container' is healthy"
    elif [ "$status" = "starting" ]; then
      log_warning "Container '$container' is starting"
    elif [ "$status" = "unhealthy" ]; then
      log_error "Container '$container' is unhealthy"
      HEALTH_STATUS=1
      FAILED_CHECKS+=("Container: $container")
    else
      # Status is "unknown" - container may not have health check configured
      log_warning "Container '$container' health status unknown (no health check configured)"
    fi
  else
    log_error "Container '$container' is not running"
    HEALTH_STATUS=1
    FAILED_CHECKS+=("Container: $container")
  fi
done

# ============================================================================
# FINAL REPORT
# ============================================================================
echo ""
if [ $HEALTH_STATUS -eq 0 ]; then
  log_success "All health checks passed"
else
  log_error "Health check failed for: ${FAILED_CHECKS[*]}"
  echo ""
fi

exit $HEALTH_STATUS
