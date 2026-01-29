#!/bin/bash
# Torre Tempo - Database Restore Script
# Restore database from a backup file with validation and health checks
# Exit code 0 if restore successful, exit code 1 if failed

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
log_success "  Torre Tempo - Database Restore"
log_success "========================================"

# ============================================================================
# VALIDATION
# ============================================================================
if [ "$EUID" -ne 0 ]; then
    die "Please run as root (sudo)"
fi

require_dir "$BACKUP_DIR"
require_command docker
require_command git

# ============================================================================
# LIST AVAILABLE BACKUPS
# ============================================================================
log_info "Available backups:"
ls -lht "$BACKUP_DIR"/torre_tempo_*.sql.gz 2>/dev/null | head -10 || log_warning "No backups found"

# ============================================================================
# PROMPT FOR BACKUP FILE
# ============================================================================
log_info "Enter the backup filename to restore:"
log_info "(e.g., torre_tempo_2026-01-29_02-00-00.sql.gz)"
read -p "> " BACKUP_FILE

if [ -z "$BACKUP_FILE" ]; then
    die "No backup file specified"
fi

BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

# ============================================================================
# VALIDATE BACKUP FILE
# ============================================================================
log_info "Validating backup file..."

# Check exists and not empty
if [ ! -s "$BACKUP_PATH" ]; then
    die "Backup file is empty or does not exist: $BACKUP_PATH"
fi

# Test gzip integrity
if ! gzip -t "$BACKUP_PATH" 2>/dev/null; then
    die "Backup file is corrupted (gzip test failed): $BACKUP_PATH"
fi

# Verify checksum if available
if [ -f "${BACKUP_PATH}.sha256" ]; then
    log_info "Verifying SHA256 checksum..."
    if ! sha256sum -c "${BACKUP_PATH}.sha256" >/dev/null 2>&1; then
        die "Checksum verification failed - backup may be corrupted"
    fi
    log_success "Checksum verified"
fi

log_success "Backup validation passed"

# ============================================================================
# CONFIRM RESTORATION
# ============================================================================
log_warning "WARNING: This will REPLACE all current database data!"
log_info "Backup file: $BACKUP_FILE"
log_info "Size: $(du -h "$BACKUP_PATH" | cut -f1)"
echo ""
read -p "Are you sure you want to restore? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_warning "Restore cancelled"
    exit 0
fi

# ============================================================================
# CREATE SAFETY BACKUP
# ============================================================================
log_info "Creating safety backup of current database..."
SAFETY_BACKUP="$BACKUP_DIR/pre-restore_$(date +%Y-%m-%d_%H-%M-%S).sql.gz"

if docker_is_running "$CONTAINER_DB"; then
    docker exec "$CONTAINER_DB" pg_dump -U postgres torre_tempo 2>/dev/null | gzip > "$SAFETY_BACKUP" || {
        die "Failed to create safety backup"
    }
    log_success "Safety backup created: $SAFETY_BACKUP"
else
    die "Database container is not running: $CONTAINER_DB"
fi

# ============================================================================
# STOP API CONTAINER
# ============================================================================
log_info "Stopping API container..."
cd "$APP_DIR/infra" || die "Failed to change to infra directory"
docker compose -f docker-compose.prod.yml stop api >/dev/null 2>&1 || log_warning "API container stop had issues"
log_success "API stopped"

# ============================================================================
# RESTORE DATABASE
# ============================================================================
log_info "Restoring database from backup..."
if gunzip -c "$BACKUP_PATH" | docker exec -i "$CONTAINER_DB" psql -U postgres -d torre_tempo >/dev/null 2>&1; then
    log_success "Database restored successfully"
else
    log_error "Database restore failed!"
    log_info "Rolling back to safety backup..."
    if gunzip -c "$SAFETY_BACKUP" | docker exec -i "$CONTAINER_DB" psql -U postgres -d torre_tempo >/dev/null 2>&1; then
        log_success "Rolled back to safety backup"
    else
        log_error "Rollback failed - manual intervention required"
    fi
    die "Restore failed and was rolled back"
fi

# ============================================================================
# RESTART API CONTAINER
# ============================================================================
log_info "Starting API container..."
docker compose -f docker-compose.prod.yml start api >/dev/null 2>&1 || die "Failed to start API container"
log_success "API started"

# ============================================================================
# WAIT FOR CONTAINER TO BE HEALTHY
# ============================================================================
log_info "Waiting for containers to be healthy..."
docker_wait_healthy "$CONTAINER_API" 60 || die "API failed to become healthy"

# ============================================================================
# RUN COMPREHENSIVE HEALTH CHECKS
# ============================================================================
log_info "Running comprehensive health checks..."
if "$SCRIPT_DIR/health-check.sh"; then
    log_success "All health checks passed"
else
    log_error "Health checks failed after restore, rolling back..."
    
    # Rollback to safety backup
    log_info "Rolling back database to safety backup..."
    if gunzip -c "$SAFETY_BACKUP" | docker exec -i "$CONTAINER_DB" psql -U postgres -d torre_tempo >/dev/null 2>&1; then
        log_success "Database rolled back to safety backup"
    else
        log_error "Rollback failed - manual intervention required"
    fi
    
    # Restart API
    log_info "Restarting API container..."
    docker compose -f docker-compose.prod.yml restart api >/dev/null 2>&1 || log_warning "API restart had issues"
    
    die "Restore failed and was rolled back to safety backup"
fi

# ============================================================================
# SUCCESS OUTPUT
# ============================================================================
log_success "========================================"
log_success "  Restore Complete!"
log_success "========================================"
echo ""
log_info "Database has been restored from:"
log_info "  $BACKUP_FILE"
echo ""
log_info "Safety backup saved at:"
log_info "  $SAFETY_BACKUP"
echo ""
log_info "Verify the restoration:"
log_info "  curl https://$PRIMARY_DOMAIN/api/health"
echo ""
