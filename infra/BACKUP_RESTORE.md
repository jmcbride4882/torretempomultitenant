# Torre Tempo - Backup & Restore Guide

## Overview

Torre Tempo implements a comprehensive backup strategy to ensure data protection and meet Spanish labor law requirements for 5-year data retention.

**Key Features:**
- ✅ Automated daily PostgreSQL database backups
- ✅ 30-day local retention with automatic cleanup
- ✅ Compressed backups (gzip) to save disk space
- ✅ One-command restore with safety backups
- ✅ Docker volume backup for uploaded files
- ✅ Audit trail of all backup operations

---

## Backup Strategy

### What Gets Backed Up

1. **PostgreSQL Database** (torre_tempo)
   - All tenant data (multi-tenant isolation)
   - Time entries, audit logs, schedules, reports
   - User accounts, locations, QR tokens
   - Complete schema with relationships

2. **Docker Volumes** (optional)
   - API logs (`api_logs` volume)
   - Redis data (`redis_data` volume)
   - Uploaded files (if S3 not configured)

3. **SSL Certificates** (handled by Certbot)
   - Let's Encrypt certificates auto-renewed
   - Stored in `infra/ssl/certbot/conf`

### Backup Schedule

| Component | Frequency | Retention | Time |
|-----------|-----------|-----------|------|
| Database | Daily | 30 days | 2:00 AM |
| Docker Volumes | On-demand | Manual | N/A |
| Audit Logs | 5 years | Automated | 3:00 AM |
| SSL Certs | Auto-renewed | Automatic | Daily |

### Storage Locations

- **Database Backups**: `/opt/torre-tempo/infra/backups/`
- **Backup Script**: `/opt/torre-tempo/infra/scripts/backup.sh`
- **Backup Logs**: `/var/log/torre-tempo-backup.log`
- **Docker Volumes**: `/var/lib/docker/volumes/`

---

## Automated Daily Backups

### Setup (One-Time)

Run the automated backup setup script:

```bash
cd /opt/torre-tempo
sudo bash infra/scripts/setup-backup-cron.sh
```

This will:
1. Create cron job to run daily at 2:00 AM
2. Configure log rotation
3. Set proper permissions
4. Verify backup script is executable

### Verify Automated Backups

Check cron configuration:
```bash
cat /etc/cron.d/torre-tempo-backup
```

View backup logs:
```bash
tail -f /var/log/torre-tempo-backup.log
```

List current backups:
```bash
ls -lh /opt/torre-tempo/infra/backups/
```

### Test Backup Manually

Run a backup manually to test:
```bash
cd /opt/torre-tempo/infra
docker exec torre-tempo-db sh /backups/backup.sh
```

Expected output:
```
[2026-01-29 02:00:00] Starting backup...
[2026-01-29 02:00:00] Database: torre_tempo
[2026-01-29 02:00:00] User: postgres
[2026-01-29 02:00:00] Creating backup: /backups/torre_tempo_2026-01-29_02-00-00.sql.gz
[2026-01-29 02:00:05] ✓ Backup created successfully
[2026-01-29 02:00:05] Size: 2.3M
[2026-01-29 02:00:05] Cleaning up old backups (older than 30 days)...
[2026-01-29 02:00:05] Removed 0 old backup(s)
[2026-01-29 02:00:05] Current backup count: 15
[2026-01-29 02:00:05] Total backup storage: 35M
[2026-01-29 02:00:05] ✓ Backup complete!
```

---

## Manual Backup

### Full Database Backup

Create an immediate backup:

```bash
cd /opt/torre-tempo/infra
docker exec torre-tempo-db pg_dump -U postgres torre_tempo | gzip > backups/manual_$(date +%Y-%m-%d_%H-%M-%S).sql.gz
```

### Single Tenant Backup

Backup a specific tenant's data:

```bash
# Export single tenant by filtering on tenantId
docker exec torre-tempo-db pg_dump -U postgres torre_tempo \
  --table=tenants --table=users --table=time_entries \
  --where="tenant_id='<TENANT_UUID>'" \
  | gzip > backups/tenant_<TENANT_SLUG>_$(date +%Y-%m-%d).sql.gz
```

**Note**: Multi-table export with WHERE clause requires PostgreSQL 13+

### Backup Docker Volumes

Backup API logs and Redis data:

```bash
cd /opt/torre-tempo/infra

# Backup API logs
docker run --rm -v infra_api_logs:/data -v "$PWD/backups:/backup" \
  alpine tar czf /backup/api_logs_$(date +%Y-%m-%d).tar.gz -C /data .

# Backup Redis data
docker run --rm -v infra_redis_data:/data -v "$PWD/backups:/backup" \
  alpine tar czf /backup/redis_data_$(date +%Y-%m-%d).tar.gz -C /data .
```

---

## Restore Procedures

### Full Database Restore

**⚠️ WARNING**: This will REPLACE all current database data!

Use the interactive restore script:

```bash
cd /opt/torre-tempo
sudo bash infra/scripts/restore-backup.sh
```

The script will:
1. List available backups
2. Prompt for backup file selection
3. Create a safety backup of current data
4. Stop API container
5. Restore database from backup
6. Restart API container
7. Verify API health

### Manual Database Restore

For advanced users, restore manually:

```bash
cd /opt/torre-tempo/infra

# 1. Stop API to prevent connections
docker compose -f docker-compose.prod.yml stop api

# 2. Drop and recreate database (DESTRUCTIVE!)
docker exec -i torre-tempo-db psql -U postgres -c "DROP DATABASE IF EXISTS torre_tempo;"
docker exec -i torre-tempo-db psql -U postgres -c "CREATE DATABASE torre_tempo;"

# 3. Restore from backup
gunzip -c backups/torre_tempo_2026-01-29_02-00-00.sql.gz | \
  docker exec -i torre-tempo-db psql -U postgres -d torre_tempo

# 4. Restart API
docker compose -f docker-compose.prod.yml start api

# 5. Verify health
curl https://time.lsltgroup.es/api/health
```

### Restore Docker Volumes

Restore API logs or Redis data:

```bash
cd /opt/torre-tempo/infra

# Restore API logs
docker run --rm -v infra_api_logs:/data -v "$PWD/backups:/backup" \
  alpine sh -c "cd /data && tar xzf /backup/api_logs_2026-01-29.tar.gz"

# Restore Redis data (requires Redis restart)
docker compose -f docker-compose.prod.yml stop redis
docker run --rm -v infra_redis_data:/data -v "$PWD/backups:/backup" \
  alpine sh -c "cd /data && tar xzf /backup/redis_data_2026-01-29.tar.gz"
docker compose -f docker-compose.prod.yml start redis
```

---

## Data Retention Policy

### Spanish Labor Law Compliance

Torre Tempo implements a **5-year data retention policy** as required by Spanish labor law (RD-Ley 8/2019).

**Retention Requirements:**
- ✅ Time entries retained for 5 years minimum
- ✅ Audit logs retained for 5 years minimum
- ✅ Reports and signatures retained for 5 years minimum
- ✅ Automatic archival after 5 years (no deletion)

### Automated Retention Job

The `RetentionService` runs daily at 3:00 AM to:
1. Count audit logs older than 5 years
2. Mark old records as archived (future: move to cold storage)
3. Log retention statistics

**Implementation**: `apps/api/src/audit/retention.service.ts`

View retention logs:
```bash
docker compose -f docker-compose.prod.yml logs api | grep RetentionService
```

Manual retention check:
```bash
curl -X POST https://time.lsltgroup.es/api/audit/retention/run \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

---

## Disaster Recovery

### Full System Recovery

In case of complete server failure:

1. **Provision new Ubuntu VPS** (25.04 or later)
2. **Install Docker**:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   ```

3. **Clone repository**:
   ```bash
   cd /opt
   git clone https://github.com/jmcbride4882/torretempomultitenant.git torre-tempo
   cd torre-tempo
   ```

4. **Run deployment script**:
   ```bash
   sudo bash infra/scripts/deploy-interactive.sh
   ```

5. **Restore database** from backup (copy from old server):
   ```bash
   scp old-server:/opt/torre-tempo/infra/backups/latest.sql.gz /opt/torre-tempo/infra/backups/
   sudo bash infra/scripts/restore-backup.sh
   ```

6. **Update DNS** to point to new server IP

7. **Regenerate SSL certificates**:
   ```bash
   docker run --rm \
     -v /opt/torre-tempo/infra/ssl/certbot/conf:/etc/letsencrypt \
     -v /opt/torre-tempo/infra/ssl/certbot/www:/var/www/certbot \
     certbot/certbot certonly --webroot \
     --webroot-path=/var/www/certbot \
     --email admin@lsltgroup.es --agree-tos --no-eff-email \
     -d time.lsltgroup.es -d time.lsltapps.com
   ```

8. **Restart services**:
   ```bash
   cd /opt/torre-tempo/infra
   docker compose -f docker-compose.prod.yml restart
   ```

### Recovery Time Objective (RTO)

- **Database restore**: ~10 minutes (depends on backup size)
- **Full system rebuild**: ~30 minutes (includes SSL cert generation)
- **DNS propagation**: 5 minutes to 24 hours (depends on TTL)

### Recovery Point Objective (RPO)

- **Database**: Up to 24 hours of data loss (daily backups at 2 AM)
- **Mitigation**: Increase backup frequency to hourly if needed

---

## Backup Best Practices

### Off-Site Backups (Recommended)

For production systems, ship backups to off-site storage:

**Option 1: S3-Compatible Storage** (Wasabi, Backblaze B2)
```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure rclone (one-time setup)
rclone config

# Sync backups to S3 (add to cron)
rclone sync /opt/torre-tempo/infra/backups/ wasabi:torre-tempo-backups/
```

**Option 2: SFTP/Rsync** (to remote server)
```bash
# Setup SSH key authentication
ssh-keygen -t ed25519 -f ~/.ssh/torre-tempo-backup

# Add to cron (daily at 3 AM)
0 3 * * * rsync -avz -e "ssh -i ~/.ssh/torre-tempo-backup" \
  /opt/torre-tempo/infra/backups/ backup@remote-server:/backups/torre-tempo/
```

### Backup Verification

Test restores regularly (quarterly recommended):

```bash
# 1. Create test restore environment
docker network create test-network
docker run -d --name test-postgres --network test-network \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=test_restore \
  postgres:16-alpine

# 2. Restore latest backup to test database
gunzip -c /opt/torre-tempo/infra/backups/torre_tempo_latest.sql.gz | \
  docker exec -i test-postgres psql -U postgres -d test_restore

# 3. Verify data integrity
docker exec test-postgres psql -U postgres -d test_restore -c "SELECT COUNT(*) FROM tenants;"
docker exec test-postgres psql -U postgres -d test_restore -c "SELECT COUNT(*) FROM time_entries;"

# 4. Cleanup
docker stop test-postgres && docker rm test-postgres
docker network rm test-network
```

### Monitoring Backup Health

Add monitoring alerts for:
- ✅ Backup failures (check log for errors)
- ✅ Backup file size anomalies (sudden drop = data loss)
- ✅ Missing backups (no new file in 24+ hours)
- ✅ Disk space warnings (backups can fill disk)

**Example monitoring script** (`infra/scripts/check-backup-health.sh`):
```bash
#!/bin/bash
BACKUP_DIR="/opt/torre-tempo/infra/backups"
LATEST_BACKUP=$(ls -t $BACKUP_DIR/torre_tempo_*.sql.gz | head -1)
AGE_HOURS=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600 ))

if [ $AGE_HOURS -gt 25 ]; then
  echo "CRITICAL: Latest backup is $AGE_HOURS hours old!"
  # Send alert (email, Slack, etc.)
  exit 1
fi

echo "OK: Latest backup is $AGE_HOURS hours old"
exit 0
```

---

## Backup Security

### Encryption at Rest

For sensitive production data, encrypt backups:

```bash
# Encrypt backup with GPG
gpg --symmetric --cipher-algo AES256 \
  /opt/torre-tempo/infra/backups/torre_tempo_2026-01-29.sql.gz

# Decrypt for restore
gpg --decrypt torre_tempo_2026-01-29.sql.gz.gpg | \
  docker exec -i torre-tempo-db psql -U postgres -d torre_tempo
```

### Access Control

Restrict backup file permissions:
```bash
chmod 600 /opt/torre-tempo/infra/backups/*.sql.gz
chown root:root /opt/torre-tempo/infra/backups/*.sql.gz
```

Only root and postgres container can access backups.

---

## Troubleshooting

### Backup Fails with "Permission Denied"

**Cause**: Backup script not executable or wrong permissions

**Fix**:
```bash
chmod +x /opt/torre-tempo/infra/scripts/backup.sh
docker restart torre-tempo-db
```

### Backup File is Empty (0 bytes)

**Cause**: Database password mismatch or connection failure

**Fix**:
```bash
# Reset postgres password
docker exec torre-tempo-db psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# Update .env file
echo "DB_PASSWORD=postgres" >> /opt/torre-tempo/infra/.env

# Restart API
docker compose -f docker-compose.prod.yml restart api
```

### Restore Fails with "Database Already Exists"

**Cause**: Trying to restore into non-empty database

**Fix** (nuclear option - drops all data):
```bash
docker exec -i torre-tempo-db psql -U postgres -c "DROP DATABASE torre_tempo;"
docker exec -i torre-tempo-db psql -U postgres -c "CREATE DATABASE torre_tempo;"
# Then retry restore
```

### Cron Job Not Running

**Cause**: Cron daemon not reloaded or syntax error

**Fix**:
```bash
# Verify cron syntax
cat /etc/cron.d/torre-tempo-backup

# Reload cron
sudo systemctl reload cron

# Check cron logs
sudo grep CRON /var/log/syslog | grep torre-tempo
```

---

## Support & Contact

For backup/restore issues:
- **Documentation**: `/opt/torre-tempo/DEPLOYMENT.md`
- **Logs**: `/var/log/torre-tempo-backup.log`
- **Support**: info@lsltgroup.es

**Emergency Restore**: Contact support immediately if you need to restore from backup and encounter issues.

---

**Last Updated**: 2026-01-29  
**Version**: 1.0  
**Compliance**: RD-Ley 8/2019 (Spanish labor law)
