# Torre Tempo - Deployment Guide

## Production Deployment on VPS

### Quick Start - Interactive Installer (Recommended)

The easiest way to deploy Torre Tempo is using the interactive installer:

```bash
# Download and run the interactive installer
sudo bash infra/scripts/deploy-interactive.sh
```

The installer will prompt you for:
- **Domain names** (primary and optional secondary)
- **Company/tenant information**
- **Admin credentials** (email, name, password)
- **SSL certificate email**
- **Installation directory**

All configuration is saved securely and the system is ready to use immediately.

### Advanced - Manual Setup

For advanced users or custom configurations, use the manual deployment script:

```bash
# Edit configuration in the script first
sudo bash infra/scripts/deploy.sh
```

**Note:** Manual setup requires editing hardcoded values in the script.

### Environment Configuration

After initial deployment, you need to configure the `.env` file:

1. Copy the example file:
   ```bash
   cd /opt/torre-tempo/infra
   cp .env.example .env
   ```

2. Edit `.env` and update:
   - `DB_PASSWORD` - Must match the postgres container password
   - `JWT_SECRET` - Generate a secure random string (32+ characters)

3. **Important**: If the database was already created, you must reset the postgres password:
   ```bash
   docker exec torre-tempo-db psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'your-password';"
   ```

   Or use the fix script:
   ```bash
   bash infra/scripts/fix-db-auth.sh
   ```

### Updating the Application

To deploy new code changes:

```bash
cd /opt/torre-tempo
bash infra/scripts/update.sh
```

This will:
1. Pull latest code from GitHub
2. Rebuild Docker containers
3. Restart services
4. Run database migrations
5. Fix database authentication if needed

### Common Issues

#### 1. API Container Keeps Restarting

**Symptom**: `docker compose logs api` shows "Authentication failed"

**Cause**: Database password mismatch between `.env` file and postgres container

**Fix**:
```bash
cd /opt/torre-tempo/infra
bash scripts/fix-db-auth.sh
```

#### 2. SSL Certificate Issues

**Symptom**: Website shows "Not Secure" or SSL errors

**Fix**: Re-run certbot:
```bash
cd /opt/torre-tempo/infra
docker run --rm \
  -v "$PWD/ssl/certbot/conf:/etc/letsencrypt" \
  -v "$PWD/ssl/certbot/www:/var/www/certbot" \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@lsltgroup.es \
  --agree-tos \
  --no-eff-email \
  -d time.lsltgroup.es \
  -d time.lsltapps.com
```

#### 3. Nginx Not Routing Correctly

**Fix**: Restart nginx container:
```bash
docker restart torre-tempo-nginx
```

### Default Admin Account

After initial deployment, a global admin account is created automatically:

- **Email**: info@lsltgroup.es
- **Password**: Summer15
- **Tenant**: LSLT Group (slug: lslt-group)

**⚠️ IMPORTANT**: Change this password immediately after first login!

To create the default admin (if not already created):
```bash
cd /opt/torre-tempo/infra
docker exec torre-tempo-api npm run db:seed
```

### Manual Deployment Steps (Reference)

If you need to deploy manually without scripts:

1. **Pull latest code**:
   ```bash
   cd /opt/torre-tempo
   git fetch origin
   git reset --hard origin/main
   ```

2. **Create/update .env file**:
   ```bash
   cd infra
   cat > .env << 'EOF'
   DB_PASSWORD=postgres
   JWT_SECRET=your-secure-random-string-here
   NODE_ENV=production
   EOF
   chmod 600 .env
   ```

3. **Fix database authentication**:
   ```bash
   docker exec torre-tempo-db psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'postgres';"
   ```

4. **Rebuild containers**:
   ```bash
   docker compose -f docker-compose.prod.yml build --no-cache api web
   ```

5. **Restart services**:
   ```bash
   docker compose -f docker-compose.prod.yml down
   docker compose -f docker-compose.prod.yml up -d
   ```

6. **Run migrations** (after API is healthy):
   ```bash
   docker run --rm --network infra_torre-tempo-network \
     -e DATABASE_URL='postgresql://postgres:postgres@postgres:5432/torre_tempo?schema=public' \
     infra-api sh -c 'cd /app/apps/api && node /app/node_modules/prisma/build/index.js migrate deploy'
   ```

### Monitoring

**Check container status**:
```bash
cd /opt/torre-tempo/infra
docker compose -f docker-compose.prod.yml ps
```

**View logs**:
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f api
```

**Test API**:
```bash
curl https://time.lsltgroup.es/api/health
```

**Test Auth Endpoint**:
```bash
curl -X POST https://time.lsltgroup.es/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
```

### Backup & Restore

#### Automated Backups

Torre Tempo includes automated daily backups. To set up:

```bash
cd /opt/torre-tempo/infra
sudo bash scripts/setup-backup-cron.sh
```

This creates a cron job that runs daily at 2:00 AM.

**Backup Details:**
- **Schedule**: Daily at 2:00 AM
- **Location**: `/opt/torre-tempo/infra/backups/`
- **Retention**: 30 days
- **Format**: Compressed PostgreSQL dump (`.sql.gz`)
- **Logs**: `/var/log/torre-tempo-backup.log`

**Manual Backup:**
```bash
cd /opt/torre-tempo/infra
docker exec torre-tempo-db sh /backups/backup.sh
```

**List Backups:**
```bash
ls -lh /opt/torre-tempo/infra/backups/
```

#### Restore from Backup

Use the interactive restore script:

```bash
cd /opt/torre-tempo/infra
sudo bash scripts/restore-backup.sh
```

The script will:
1. List available backups
2. Prompt for the backup to restore
3. Create a safety backup of current data
4. Stop the API during restoration
5. Restore the database
6. Restart the API
7. Verify the API is healthy

**Manual Restore:**
```bash
# Uncompress and restore
gunzip -c /opt/torre-tempo/infra/backups/torre_tempo_YYYY-MM-DD_HH-MM-SS.sql.gz | \
  docker exec -i torre-tempo-db psql -U postgres -d torre_tempo
```

### Monitoring & Logging

Torre Tempo includes comprehensive monitoring and logging for audit compliance.

#### Health Checks

**Basic Health Check:**
```bash
curl https://time.lsltgroup.es/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-29T14:30:45.123Z",
  "service": "torre-tempo-api",
  "version": "0.1.0",
  "uptime": 86400.5,
  "environment": "production",
  "checks": {
    "database": { "status": "connected", "latency": "15ms" },
    "memory": { "used": "245MB", "total": "512MB" }
  },
  "responseTime": "18ms"
}
```

**Detailed Metrics:**
```bash
curl https://time.lsltgroup.es/api/health/metrics
```

#### Application Logs

Logs are stored in Docker volumes and rotated daily:

**View Live Logs:**
```bash
cd /opt/torre-tempo/infra
docker compose -f docker-compose.prod.yml logs -f api
```

**View Specific Log Files:**
```bash
docker exec torre-tempo-api ls -lh /app/logs/
```

**Log Types:**
- `app-YYYY-MM-DD.log` - Application logs (30-day retention)
- `error-YYYY-MM-DD.log` - Error logs (30-day retention)
- `audit/audit-YYYY-MM-DD.log` - Audit logs (5-year retention, required by Spanish labor law)

For detailed monitoring documentation, see [infra/MONITORING.md](infra/MONITORING.md).

#### Data Retention Policy

Torre Tempo complies with Spanish labor law (RD-Ley 8/2019) requiring **5-year retention** of time tracking records:

- **Audit Logs**: 5 years (automated, never deleted)
- **Time Entry Records**: 5 years (database)
- **Application Logs**: 30 days
- **Database Backups**: 30 days

A scheduled job runs daily at 3:00 AM to enforce retention policies.

### Server Information

- **Domain**: time.lsltgroup.es (primary), time.lsltapps.com (secondary)
- **SSL**: Let's Encrypt certificates (auto-renewed)
- **App Directory**: /opt/torre-tempo
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Repository**: https://github.com/jmcbride4882/torretempomultitenant
- **Monitoring**: [infra/MONITORING.md](infra/MONITORING.md)

### Support

For issues, check:
1. Health endpoint: `curl https://time.lsltgroup.es/api/health`
2. Docker container logs: `docker compose -f docker-compose.prod.yml logs`
3. Application logs: `docker exec torre-tempo-api cat /app/logs/app-$(date +%Y-%m-%d).log`
4. Nginx logs: `docker compose -f docker-compose.prod.yml logs nginx`
5. Backup logs: `tail -f /var/log/torre-tempo-backup.log`

For detailed monitoring and troubleshooting, see [infra/MONITORING.md](infra/MONITORING.md).
