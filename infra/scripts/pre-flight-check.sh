#!/bin/bash
# Torre Tempo - Pre-flight Check Script
# Validates system is ready for deployment before any changes are made
# 
# Exit Codes:
#   0 - All pre-flight checks passed, system ready for deployment
#   1 - One or more checks failed, system not ready for deployment
#
# Usage:
#   ./infra/scripts/pre-flight-check.sh
#   if [ $? -eq 0 ]; then echo "Ready to deploy"; fi

# ============================================================================
# SOURCE CONFIGURATION AND UTILITIES
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"
source "$SCRIPT_DIR/../lib/common.sh"

# ============================================================================
# INITIALIZE TRACKING VARIABLES
# ============================================================================
PREFLIGHT_STATUS=0
FAILED_CHECKS=()
WARNINGS=()

# ============================================================================
# DISK SPACE CHECK
# ============================================================================
check_disk_space() {
  log_info "Checking disk space at $APP_DIR..."
  
  # Check if directory exists, if not check parent
  local check_path="$APP_DIR"
  if [ ! -d "$check_path" ]; then
    check_path="$(dirname "$APP_DIR")"
  fi
  
  # Get available space in GB
  local available_gb
  available_gb=$(df -h "$check_path" 2>/dev/null | awk 'NR==2 {print $4}' | sed 's/G//')
  
  if [ -z "$available_gb" ]; then
    log_error "Could not determine disk space"
    FAILED_CHECKS+=("Disk space check failed")
    PREFLIGHT_STATUS=1
    return 1
  fi
  
  # Convert to numeric for comparison (handle decimals)
  local available_numeric
  available_numeric=$(printf "%.0f" "$available_gb" 2>/dev/null || echo "0")
  
  if [ "$available_numeric" -lt 5 ]; then
    log_error "Insufficient disk space: ${available_gb}GB available (minimum 5GB required)"
    FAILED_CHECKS+=("Disk space: ${available_gb}GB available (need 5GB)")
    PREFLIGHT_STATUS=1
    return 1
  fi
  
  log_success "Disk space: ${available_gb}GB available (>5GB required)"
  return 0
}

# ============================================================================
# DOCKER RUNNING CHECK
# ============================================================================
check_docker_running() {
  log_info "Checking Docker is running..."
  
  if ! docker info >/dev/null 2>&1; then
    log_error "Docker is not running or not accessible"
    FAILED_CHECKS+=("Docker is not running")
    PREFLIGHT_STATUS=1
    return 1
  fi
  
  log_success "Docker is running"
  return 0
}

# ============================================================================
# GIT STATUS CHECK
# ============================================================================
check_git_status() {
  log_info "Checking Git repository status..."
  
  # Check if we're in a git repository
  if ! git rev-parse --git-dir >/dev/null 2>&1; then
    log_warning "Not in a Git repository (this is OK for some deployments)"
    WARNINGS+=("Not in a Git repository")
    return 0
  fi
  
  # Check for uncommitted changes
  if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    log_warning "Uncommitted changes detected (this is OK, but be aware)"
    WARNINGS+=("Uncommitted changes in working directory")
    return 0
  fi
  
  # Check for untracked files
  if [ -n "$(git ls-files --others --exclude-standard 2>/dev/null)" ]; then
    log_warning "Untracked files detected (this is OK, but be aware)"
    WARNINGS+=("Untracked files in repository")
    return 0
  fi
  
  log_success "Git repository is clean"
  return 0
}

# ============================================================================
# REQUIRED COMMANDS CHECK
# ============================================================================
check_required_commands() {
  log_info "Checking required commands..."
  
  local commands=("docker" "git" "curl" "docker compose")
  local missing_commands=()
  
  for cmd in "${commands[@]}"; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
      log_error "Command not found: $cmd"
      missing_commands+=("$cmd")
    else
      log_success "Command '$cmd' found"
    fi
  done
  
  if [ ${#missing_commands[@]} -gt 0 ]; then
    FAILED_CHECKS+=("Missing commands: ${missing_commands[*]}")
    PREFLIGHT_STATUS=1
    return 1
  fi
  
  return 0
}

# ============================================================================
# PORT AVAILABILITY CHECK
# ============================================================================
check_port_available() {
  local port="$1"
  local port_name="$2"
  
  # Try to detect if port is in use
  # Use different methods depending on OS
  local in_use=0
  
  if command -v lsof >/dev/null 2>&1; then
    # lsof method (Linux/Mac)
    if lsof -i ":$port" >/dev/null 2>&1; then
      in_use=1
    fi
  elif command -v netstat >/dev/null 2>&1; then
    # netstat method (fallback)
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
      in_use=1
    fi
  else
    # Try nc (netcat) as last resort
    if nc -z localhost "$port" >/dev/null 2>&1; then
      in_use=1
    fi
  fi
  
  if [ $in_use -eq 1 ]; then
    log_error "Port $port ($port_name) is already in use"
    FAILED_CHECKS+=("Port $port ($port_name) is in use")
    PREFLIGHT_STATUS=1
    return 1
  fi
  
  log_success "Port $port ($port_name) is available"
  return 0
}

check_ports() {
  log_info "Checking port availability..."
  
  # Check critical ports
  check_port_available 80 "HTTP"
  check_port_available 443 "HTTPS"
  check_port_available "$API_PORT" "API"
  check_port_available "$DB_PORT" "Database"
  check_port_available "$REDIS_PORT" "Redis"
  
  return 0
}

# ============================================================================
# MAIN PRE-FLIGHT CHECK EXECUTION
# ============================================================================
main() {
  log_info "Running pre-flight checks..."
  echo ""
  
  # Run all checks (don't exit early)
  check_disk_space
  check_docker_running
  check_git_status
  check_required_commands
  check_ports
  
  echo ""
  
  # Report warnings
  if [ ${#WARNINGS[@]} -gt 0 ]; then
    log_warning "Warnings detected:"
    for warning in "${WARNINGS[@]}"; do
      echo "  - $warning"
    done
    echo ""
  fi
  
  # Report failures
  if [ ${#FAILED_CHECKS[@]} -gt 0 ]; then
    log_error "Pre-flight checks FAILED:"
    for failure in "${FAILED_CHECKS[@]}"; do
      echo "  - $failure"
    done
    echo ""
    log_error "System is NOT ready for deployment"
    return 1
  fi
  
  # All checks passed
  log_success "All pre-flight checks passed - system ready for deployment"
  return 0
}

# ============================================================================
# EXECUTE MAIN FUNCTION
# ============================================================================
main
exit $?
