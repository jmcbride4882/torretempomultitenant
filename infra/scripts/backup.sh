#!/bin/sh
# Torre Tempo - Database Backup Script
# Runs daily via cron, keeps 30 days of backups

set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="${BACKUP_DIR}/torre_tempo_${DATE}.sql.gz"
RETENTION_DAYS=30

echo "[$(date)] Starting backup..."

# Create backup directory if not exists
mkdir -p ${BACKUP_DIR}

# Create compressed backup
pg_dump -h ${PGHOST} -U ${PGUSER} -d ${PGDATABASE} | gzip > ${BACKUP_FILE}

# Check if backup was successful
if [ -f "${BACKUP_FILE}" ] && [ -s "${BACKUP_FILE}" ]; then
    echo "[$(date)] Backup created: ${BACKUP_FILE}"
    echo "[$(date)] Size: $(du -h ${BACKUP_FILE} | cut -f1)"
else
    echo "[$(date)] ERROR: Backup failed!"
    exit 1
fi

# Remove old backups
echo "[$(date)] Removing backups older than ${RETENTION_DAYS} days..."
find ${BACKUP_DIR} -name "torre_tempo_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete

# List remaining backups
echo "[$(date)] Current backups:"
ls -lh ${BACKUP_DIR}/torre_tempo_*.sql.gz 2>/dev/null || echo "No backups found"

echo "[$(date)] Backup complete!"
