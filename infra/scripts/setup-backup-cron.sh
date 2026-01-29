#!/bin/bash
# Torre Tempo - Setup automated daily backups via cron
# Run this script ONCE after initial deployment to configure automated backups

set -e

# Configuration
APP_DIR="${APP_DIR:-/opt/torre-tempo}"
BACKUP_SCRIPT="$APP_DIR/infra/scripts/backup.sh"
CRON_FILE="/etc/cron.d/torre-tempo-backup"
LOG_FILE="/var/log/torre-tempo-backup.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Torre Tempo - Backup Cron Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Verify backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo -e "${RED}Error: Backup script not found at $BACKUP_SCRIPT${NC}"
    exit 1
fi

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"
echo -e "${GREEN}✓${NC} Backup script is executable"

# Create log file if it doesn't exist
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"
echo -e "${GREEN}✓${NC} Log file created: $LOG_FILE"

# Create cron job file
echo -e "\n${YELLOW}Creating cron job...${NC}"
cat > "$CRON_FILE" << EOF
# Torre Tempo - Automated Daily Database Backups
# Runs at 2:00 AM daily
# Logs output to $LOG_FILE
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Daily backup at 2:00 AM
0 2 * * * root cd $APP_DIR/infra && docker exec torre-tempo-db sh /backups/backup.sh >> $LOG_FILE 2>&1
EOF

chmod 644 "$CRON_FILE"
echo -e "${GREEN}✓${NC} Cron job created: $CRON_FILE"

# Reload cron
systemctl reload cron || service cron reload
echo -e "${GREEN}✓${NC} Cron daemon reloaded"

# Display the cron configuration
echo -e "\n${YELLOW}Cron Configuration:${NC}"
cat "$CRON_FILE"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Backups will run automatically:"
echo -e "  • Schedule: ${YELLOW}Daily at 2:00 AM${NC}"
echo -e "  • Location: ${YELLOW}$APP_DIR/infra/backups/${NC}"
echo -e "  • Retention: ${YELLOW}30 days${NC}"
echo -e "  • Logs: ${YELLOW}$LOG_FILE${NC}"
echo ""
echo -e "To test the backup manually:"
echo -e "  ${YELLOW}cd $APP_DIR/infra && docker exec torre-tempo-db sh /backups/backup.sh${NC}"
echo ""
echo -e "To view backup logs:"
echo -e "  ${YELLOW}tail -f $LOG_FILE${NC}"
echo ""
echo -e "To list current backups:"
echo -e "  ${YELLOW}ls -lh $APP_DIR/infra/backups/${NC}"
echo ""
