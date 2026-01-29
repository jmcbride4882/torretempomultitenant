#!/bin/bash
# Torre Tempo - Shared Utility Library
# Source this file in deployment scripts: source "$(dirname "$0")/../lib/common.sh"

# ============================================================================
# SOURCE CONFIGURATION
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

# Log info message (blue)
log_info() {
  echo -e "${BLUE}ℹ${NC} $*"
}

# Log success message (green)
log_success() {
  echo -e "${GREEN}✓${NC} $*"
}

# Log error message (red) to stderr
log_error() {
  echo -e "${RED}✗${NC} $*" >&2
}

# Log warning message (yellow)
log_warning() {
  echo -e "${YELLOW}⚠${NC} $*"
}

# ============================================================================
# ERROR HANDLING
# ============================================================================

# Exit with error message
die() {
  log_error "$*"
  exit 1
}

# ============================================================================
# COMMAND CHECKS
# ============================================================================

# Require a command to exist, die if not found
require_command() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || die "Required command not found: $cmd"
}

# ============================================================================
# SERVICE HEALTH CHECKS
# ============================================================================

# Wait for a service to be available via HTTP
# Usage: wait_for_service <url> [timeout] [retries]
wait_for_service() {
  local url="$1"
  local timeout="${2:-30}"
  local retries="${3:-3}"
  local attempt=0
  
  log_info "Waiting for service at $url (timeout: ${timeout}s, retries: $retries)..."
  
  while [ $attempt -lt "$retries" ]; do
    attempt=$((attempt + 1))
    
    if curl -sf --max-time "$timeout" "$url" >/dev/null 2>&1; then
      log_success "Service is healthy"
      return 0
    fi
    
    if [ $attempt -lt "$retries" ]; then
      log_warning "Service not ready (attempt $attempt/$retries), retrying in 5s..."
      sleep 5
    fi
  done
  
  log_error "Service failed to become healthy after $retries attempts"
  return 1
}

# ============================================================================
# DOCKER HELPERS
# ============================================================================

# Execute command in Docker container with error handling
# Usage: docker_exec <container> <command>
docker_exec() {
  local container="$1"
  shift
  
  docker exec "$container" "$@" || die "Docker exec failed in container '$container': $*"
}

# Get Docker container health status
# Usage: docker_health <container>
# Returns: "healthy", "unhealthy", "starting", or "unknown"
docker_health() {
  local container="$1"
  docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown"
}

# Wait for Docker container to be healthy
# Usage: docker_wait_healthy <container> [timeout]
docker_wait_healthy() {
  local container="$1"
  local timeout="${2:-60}"
  local elapsed=0
  local interval=2
  
  log_info "Waiting for container '$container' to be healthy (timeout: ${timeout}s)..."
  
  while [ $elapsed -lt "$timeout" ]; do
    local status
    status=$(docker_health "$container")
    
    if [ "$status" = "healthy" ]; then
      log_success "Container '$container' is healthy"
      return 0
    fi
    
    if [ "$status" = "unhealthy" ]; then
      log_error "Container '$container' is unhealthy"
      return 1
    fi
    
    log_info "Container status: $status (${elapsed}s/${timeout}s)"
    sleep "$interval"
    elapsed=$((elapsed + interval))
  done
  
  log_error "Container '$container' failed to become healthy within ${timeout}s"
  return 1
}

# Check if Docker container is running
# Usage: docker_is_running <container>
docker_is_running() {
  local container="$1"
  docker ps --filter "name=$container" --filter "status=running" --quiet | grep -q . 2>/dev/null
}

# ============================================================================
# VALIDATION HELPERS
# ============================================================================

# Check if variable is set and not empty
# Usage: require_var VAR_NAME
require_var() {
  local var_name="$1"
  local var_value="${!var_name}"
  
  if [ -z "$var_value" ]; then
    die "Required variable not set: $var_name"
  fi
}

# Check if file exists
# Usage: require_file /path/to/file
require_file() {
  local file="$1"
  
  if [ ! -f "$file" ]; then
    die "Required file not found: $file"
  fi
}

# Check if directory exists
# Usage: require_dir /path/to/dir
require_dir() {
  local dir="$1"
  
  if [ ! -d "$dir" ]; then
    die "Required directory not found: $dir"
  fi
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

# Run command with logging
# Usage: run_cmd "description" command args...
run_cmd() {
  local description="$1"
  shift
  
  log_info "$description..."
  if "$@"; then
    log_success "$description completed"
    return 0
  else
    die "$description failed"
  fi
}

# Retry a command with exponential backoff
# Usage: retry_cmd <max_attempts> <command> [args...]
retry_cmd() {
  local max_attempts="$1"
  shift
  local attempt=0
  local wait_time=1
  
  while [ $attempt -lt "$max_attempts" ]; do
    attempt=$((attempt + 1))
    
    if "$@"; then
      return 0
    fi
    
    if [ $attempt -lt "$max_attempts" ]; then
      log_warning "Command failed (attempt $attempt/$max_attempts), retrying in ${wait_time}s..."
      sleep "$wait_time"
      wait_time=$((wait_time * 2))
    fi
  done
  
  log_error "Command failed after $max_attempts attempts"
  return 1
}

# ============================================================================
# EXPORT FUNCTIONS FOR USE IN SOURCING SCRIPTS
# ============================================================================
export -f log_info
export -f log_success
export -f log_error
export -f log_warning
export -f die
export -f require_command
export -f wait_for_service
export -f docker_exec
export -f docker_health
export -f docker_wait_healthy
export -f docker_is_running
export -f require_var
export -f require_file
export -f require_dir
export -f run_cmd
export -f retry_cmd
