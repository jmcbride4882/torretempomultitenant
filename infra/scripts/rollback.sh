#!/bin/bash
# Torre Tempo - Rollback Script
# Rollback deployment to a previous Git commit and rebuild containers
#
# Usage:
#   ./rollback.sh <git-sha>  # Rollback to specific commit
#   ./rollback.sh            # Rollback to previous commit (HEAD~1)
#
# Exit Codes:
#   0 - Rollback completed successfully
#   1 - Rollback failed (system restored to original state)

# Source configuration and utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"
source "$SCRIPT_DIR/../lib/common.sh"

# ============================================================================
# VALIDATION
# ============================================================================

# Verify we're in a git repository
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  die "Not in a git repository. Cannot proceed with rollback."
fi

# Verify docker compose is available
require_command docker
require_command git

# ============================================================================
# DETERMINE TARGET SHA
# ============================================================================

# Get current SHA before any changes
CURRENT_SHA=$(git rev-parse HEAD)
if [ -z "$CURRENT_SHA" ]; then
  die "Failed to determine current Git commit SHA"
fi

log_info "Current commit: $CURRENT_SHA"

# Determine target SHA
if [ -n "$1" ]; then
  TARGET_SHA="$1"
else
  # Auto-detect previous commit (HEAD~1)
  TARGET_SHA=$(git rev-parse HEAD~1)
  if [ -z "$TARGET_SHA" ]; then
    die "Failed to determine previous commit (HEAD~1). Cannot auto-detect rollback target."
  fi
fi

log_info "Target commit: $TARGET_SHA"

# Validate target SHA exists
if ! git cat-file -e "$TARGET_SHA^{commit}" 2>/dev/null; then
  die "Target commit '$TARGET_SHA' does not exist in repository"
fi

# Prevent rolling back to the same commit
if [ "$CURRENT_SHA" = "$TARGET_SHA" ]; then
  die "Target commit is the same as current commit. Nothing to rollback."
fi

# ============================================================================
# ROLLBACK EXECUTION
# ============================================================================

log_info "Starting rollback process..."

# Step 1: Stop containers
log_info "Stopping containers..."
if docker compose -f "$SCRIPT_DIR/../../docker-compose.prod.yml" down >/dev/null 2>&1; then
  log_success "Containers stopped"
else
  die "Failed to stop containers"
fi

# Step 2: Checkout target commit
log_info "Checking out commit $TARGET_SHA..."
if git checkout "$TARGET_SHA" >/dev/null 2>&1; then
  log_success "Checked out commit $TARGET_SHA"
else
  log_error "Failed to checkout commit $TARGET_SHA"
  log_error "Restoring original state..."
  git checkout "$CURRENT_SHA" >/dev/null 2>&1
  die "Rollback aborted - original state restored"
fi

# Step 3: Rebuild containers
log_info "Rebuilding containers..."
if docker compose -f "$SCRIPT_DIR/../../docker-compose.prod.yml" build >/dev/null 2>&1; then
  log_success "Containers rebuilt"
else
  log_error "Failed to rebuild containers"
  log_error "Restoring original state..."
  git checkout "$CURRENT_SHA" >/dev/null 2>&1
  die "Rollback aborted - original state restored"
fi

# Step 4: Start containers
log_info "Starting containers..."
if docker compose -f "$SCRIPT_DIR/../../docker-compose.prod.yml" up -d >/dev/null 2>&1; then
  log_success "Containers started"
else
  log_error "Failed to start containers"
  log_error "Restoring original state..."
  git checkout "$CURRENT_SHA" >/dev/null 2>&1
  die "Rollback aborted - original state restored"
fi

# Step 5: Wait for containers to be healthy
log_info "Waiting for containers to be healthy..."
CONTAINERS=(
  "$CONTAINER_API"
  "$CONTAINER_WEB"
  "$CONTAINER_DB"
  "$CONTAINER_REDIS"
  "$CONTAINER_NGINX"
)

CONTAINERS_HEALTHY=true
for container in "${CONTAINERS[@]}"; do
  if ! docker_wait_healthy "$container" 60; then
    log_error "Container '$container' failed to become healthy"
    CONTAINERS_HEALTHY=false
  fi
done

if [ "$CONTAINERS_HEALTHY" = false ]; then
  log_error "One or more containers failed to become healthy"
  log_error "Restoring original state..."
  docker compose -f "$SCRIPT_DIR/../../docker-compose.prod.yml" down >/dev/null 2>&1
  git checkout "$CURRENT_SHA" >/dev/null 2>&1
  docker compose -f "$SCRIPT_DIR/../../docker-compose.prod.yml" build >/dev/null 2>&1
  docker compose -f "$SCRIPT_DIR/../../docker-compose.prod.yml" up -d >/dev/null 2>&1
  die "Rollback aborted - original state restored"
fi

log_success "All containers healthy"

# Step 6: Run health checks
log_info "Running health checks..."
if "$SCRIPT_DIR/health-check.sh"; then
  log_success "Health checks passed"
else
  log_error "Health checks failed"
  log_error "Restoring original state..."
  docker compose -f "$SCRIPT_DIR/../../docker-compose.prod.yml" down >/dev/null 2>&1
  git checkout "$CURRENT_SHA" >/dev/null 2>&1
  docker compose -f "$SCRIPT_DIR/../../docker-compose.prod.yml" build >/dev/null 2>&1
  docker compose -f "$SCRIPT_DIR/../../docker-compose.prod.yml" up -d >/dev/null 2>&1
  die "Rollback aborted - original state restored"
fi

# ============================================================================
# SUCCESS
# ============================================================================

log_success "Rollback completed successfully"
log_info "Rolled back from $CURRENT_SHA to $TARGET_SHA"

exit 0
