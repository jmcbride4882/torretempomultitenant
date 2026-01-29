#!/bin/bash
# Torre Tempo - Database Restore Script
# Restore database from a backup file

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
APP_DIR="${APP_DIR:-/opt/torre-tempo}"
BACKUP_DIR="$APP_DIR/infra/backups"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Torre Tempo - Database Restore${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# List available backups
echo -e "\n${YELLOW}Available backups:${NC}"
ls -lht "$BACKUP_DIR"/torre_tempo_*.sql.gz 2>/dev/null | head -10

# Prompt for backup file
echo -e "\n${YELLOW}Enter the backup filename to restore:${NC}"
echo -e "(e.g., torre_tempo_2026-01-29_02-00-00.sql.gz)"
read -p "> " BACKUP_FILE

# Validate backup file exists
if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_DIR/$BACKUP_FILE${NC}"
    exit 1
fi

# Confirm restoration
echo -e "\n${RED}WARNING: This will REPLACE all current database data!${NC}"
echo -e "Backup file: ${YELLOW}$BACKUP_FILE${NC}"
echo -e "Size: ${YELLOW}$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)${NC}"
echo ""
read -p "Are you sure you want to restore? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled.${NC}"
    exit 0
fi

# Create a backup of current database before restoring
echo -e "\n${YELLOW}Creating safety backup of current database...${NC}"
SAFETY_BACKUP="$BACKUP_DIR/pre-restore_$(date +%Y-%m-%d_%H-%M-%S).sql.gz"
docker exec torre-tempo-db pg_dump -U postgres torre_tempo | gzip > "$SAFETY_BACKUP"
echo -e "${GREEN}✓${NC} Safety backup created: $SAFETY_BACKUP"

# Stop API to prevent connections during restore
echo -e "\n${YELLOW}Stopping API container...${NC}"
cd "$APP_DIR/infra"
docker compose -f docker-compose.prod.yml stop api
echo -e "${GREEN}✓${NC} API stopped"

# Restore database
echo -e "\n${YELLOW}Restoring database from backup...${NC}"
gunzip -c "$BACKUP_DIR/$BACKUP_FILE" | docker exec -i torre-tempo-db psql -U postgres -d torre_tempo

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Database restored successfully"
else
    echo -e "${RED}✗${NC} Database restore failed!"
    echo -e "${YELLOW}Rolling back to safety backup...${NC}"
    gunzip -c "$SAFETY_BACKUP" | docker exec -i torre-tempo-db psql -U postgres -d torre_tempo
    echo -e "${GREEN}✓${NC} Rolled back to safety backup"
    exit 1
fi

# Restart API
echo -e "\n${YELLOW}Starting API container...${NC}"
docker compose -f docker-compose.prod.yml start api
echo -e "${GREEN}✓${NC} API started"

# Wait for API to be healthy
echo -e "\n${YELLOW}Waiting for API to be healthy...${NC}"
sleep 5

# Check API health
for i in {1..30}; do
    if curl -sf http://localhost:4000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} API is healthy"
        break
    fi
    echo -n "."
    sleep 2
done

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Restore Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Database has been restored from:"
echo -e "  ${YELLOW}$BACKUP_FILE${NC}"
echo ""
echo -e "Safety backup saved at:"
echo -e "  ${YELLOW}$SAFETY_BACKUP${NC}"
echo ""
echo -e "Verify the restoration:"
echo -e "  ${YELLOW}curl https://time.lsltgroup.es/api/health${NC}"
echo ""
