#!/bin/sh
# Torre Tempo - Database Backup Script
# Runs daily via cron, keeps 30 days of backups
# 
# This script runs INSIDE the postgres container
# Environment variables are automatically set by Docker

set -e

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/torre_tempo_${DATE}.sql.gz"
RETENTION_DAYS=30

# Default values if not set
PGHOST="${PGHOST:-localhost}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-torre_tempo}"

echo "[$(date)] Starting backup..."
echo "[$(date)] Database: ${PGDATABASE}"
echo "[$(date)] User: ${PGUSER}"

# Create backup directory if not exists
mkdir -p ${BACKUP_DIR}

# Create compressed backup
echo "[$(date)] Creating backup: ${BACKUP_FILE}"
if pg_dump -h ${PGHOST} -U ${PGUSER} -d ${PGDATABASE} | gzip > ${BACKUP_FILE}; then
    # Check if backup was successful
    if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
        echo "[$(date)] ✓ Backup created successfully"
        echo "[$(date)] Size: $(du -h ${BACKUP_FILE} | cut -f1)"
    else
        echo "[$(date)] ✗ ERROR: Backup file is empty or missing!"
        exit 1
    fi
else
    echo "[$(date)] ✗ ERROR: pg_dump failed!"
    exit 1
fi

# Remove old backups
echo "[$(date)] Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
DELETED_COUNT=$(find ${BACKUP_DIR} -name "torre_tempo_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete -print | wc -l)
echo "[$(date)] Removed ${DELETED_COUNT} old backup(s)"

# List remaining backups
BACKUP_COUNT=$(ls ${BACKUP_DIR}/torre_tempo_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date)] Current backup count: ${BACKUP_COUNT}"

if [ ${BACKUP_COUNT} -gt 0 ]; then
    echo "[$(date)] Recent backups:"
    ls -lht ${BACKUP_DIR}/torre_tempo_*.sql.gz | head -5
else
    echo "[$(date)] Warning: No backups found in ${BACKUP_DIR}"
fi

# Calculate total backup size
TOTAL_SIZE=$(du -sh ${BACKUP_DIR} 2>/dev/null | cut -f1)
echo "[$(date)] Total backup storage: ${TOTAL_SIZE}"

echo "[$(date)] ✓ Backup complete!"
exit 0
