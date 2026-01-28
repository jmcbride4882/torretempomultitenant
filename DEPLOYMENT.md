# Torre Tempo - Deployment Guide

## Production Deployment on VPS

### Initial Setup

The initial deployment is handled by `infra/scripts/deploy.sh`. This script:
- Installs Docker and dependencies
- Configures firewall
- Clones the repository
- Creates environment files
- Obtains SSL certificates
- Starts all services

```bash
sudo bash infra/scripts/deploy.sh
```

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

### Backup

**Database backup**:
```bash
docker exec torre-tempo-db pg_dump -U postgres torre_tempo > backup.sql
```

**Restore**:
```bash
docker exec -i torre-tempo-db psql -U postgres torre_tempo < backup.sql
```

### Server Information

- **Domain**: time.lsltgroup.es (primary), time.lsltapps.com (secondary)
- **SSL**: Let's Encrypt certificates (auto-renewed)
- **App Directory**: /opt/torre-tempo
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Repository**: https://github.com/jmcbride4882/torretempomultitenant

### Support

For issues, check:
1. Docker container logs: `docker compose -f docker-compose.prod.yml logs`
2. Nginx logs: `docker compose -f docker-compose.prod.yml logs nginx`
3. API health: `curl https://time.lsltgroup.es/api/health`
