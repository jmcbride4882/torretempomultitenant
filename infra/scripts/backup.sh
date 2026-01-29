#!/bin/bash
# Torre Tempo - Database Backup Script
# Runs daily via cron, keeps 30 days of backups
# 
# This script runs INSIDE the postgres container
# Environment variables are automatically set by Docker
# 
# Features:
# - Sources config.sh and common.sh for centralized configuration
# - Generates SHA256 checksums for backup integrity verification
# - Tests gzip integrity with gzip -t
# - Improved error handling with die() function
# - Uses log_* functions for consistent output

# ============================================================================
# SOURCE CONFIGURATION AND UTILITIES
# ============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../config.sh"
source "$SCRIPT_DIR/../lib/common.sh"

# ============================================================================
# CONFIGURATION
# ============================================================================
# Default values if not set (from environment or config.sh)
PGHOST="${PGHOST:-localhost}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-torre_tempo}"

# ============================================================================
# MAIN BACKUP PROCESS
# ============================================================================

log_info "Starting database backup..."
log_info "Database: ${PGDATABASE}"
log_info "User: ${PGUSER}"
log_info "Backup directory: ${BACKUP_DIR}"

# Create backup directory if not exists
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR" || die "Failed to create backup directory: $BACKUP_DIR"
    log_success "Created backup directory: $BACKUP_DIR"
fi

# Generate timestamp
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/torre_tempo_${DATE}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

# Create compressed backup
log_info "Creating backup: ${BACKUP_FILE_GZ}"
if pg_dump -h "${PGHOST}" -U "${PGUSER}" -d "${PGDATABASE}" | gzip > "${BACKUP_FILE_GZ}"; then
    log_success "Backup file created"
else
    die "pg_dump failed"
fi

# ============================================================================
# BACKUP INTEGRITY VERIFICATION
# ============================================================================

log_info "Verifying backup integrity..."

# Check if backup file exists and is not empty
if [ ! -f "${BACKUP_FILE_GZ}" ]; then
    die "Backup file does not exist: ${BACKUP_FILE_GZ}"
fi

if [ ! -s "${BACKUP_FILE_GZ}" ]; then
    die "Backup file is empty: ${BACKUP_FILE_GZ}"
fi

log_success "Backup file exists and is not empty"

# Test gzip integrity
if ! gzip -t "${BACKUP_FILE_GZ}" 2>/dev/null; then
    die "Backup file is corrupted (gzip test failed)"
fi

log_success "Gzip integrity verified"

# Generate SHA256 checksum
log_info "Generating SHA256 checksum..."
CHECKSUM=$(sha256sum "${BACKUP_FILE_GZ}" | awk '{print $1}')
echo "${CHECKSUM}  $(basename "${BACKUP_FILE_GZ}")" > "${BACKUP_FILE_GZ}.sha256" || die "Failed to write checksum file"

log_success "Backup integrity verified (SHA256: ${CHECKSUM:0:16}...)"

# ============================================================================
# BACKUP INFORMATION
# ============================================================================

BACKUP_SIZE=$(du -h "${BACKUP_FILE_GZ}" | cut -f1)
log_info "Backup size: ${BACKUP_SIZE}"

# ============================================================================
# CLEANUP OLD BACKUPS
# ============================================================================

log_info "Cleaning up old backups (older than ${BACKUP_RETENTION_DAYS} days)..."
DELETED_COUNT=$(find "${BACKUP_DIR}" -name "torre_tempo_*.sql.gz" -type f -mtime +"${BACKUP_RETENTION_DAYS}" -delete -print | wc -l)
log_success "Removed ${DELETED_COUNT} old backup(s)"

# ============================================================================
# FINAL STATUS
# ============================================================================

# List remaining backups
BACKUP_COUNT=$(ls "${BACKUP_DIR}"/torre_tempo_*.sql.gz 2>/dev/null | wc -l)
log_info "Current backup count: ${BACKUP_COUNT}"

if [ "${BACKUP_COUNT}" -gt 0 ]; then
    log_info "Recent backups:"
    ls -lht "${BACKUP_DIR}"/torre_tempo_*.sql.gz | head -5
else
    log_warning "No backups found in ${BACKUP_DIR}"
fi

# Calculate total backup size
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
log_info "Total backup storage: ${TOTAL_SIZE}"

log_success "Backup complete!"
log_success "Location: ${BACKUP_FILE_GZ}"
log_success "Checksum: ${CHECKSUM}"

exit 0
