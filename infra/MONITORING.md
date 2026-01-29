# Torre Tempo - Monitoring & Logging Guide

## Overview

Torre Tempo implements comprehensive monitoring and logging for audit compliance and operational visibility. This guide covers log management, health checks, metrics, and troubleshooting.

---

## Table of Contents

- [Logging System](#logging-system)
- [Health Checks](#health-checks)
- [Metrics](#metrics)
- [Log Locations](#log-locations)
- [Data Retention](#data-retention)
- [Troubleshooting](#troubleshooting)
- [Alerts & Monitoring](#alerts--monitoring)

---

## Logging System

### Technology Stack

- **Winston** - Structured logging library
- **nest-winston** - NestJS integration
- **winston-daily-rotate-file** - Automatic log rotation

### Log Format

All logs are written in JSON format for easy parsing:

```json
{
  "timestamp": "2026-01-29 14:30:45",
  "level": "info",
  "message": "User authenticated successfully",
  "context": "AuthService",
  "service": "torre-tempo-api",
  "environment": "production",
  "userId": "abc-123",
  "tenantId": "xyz-789"
}
```

### Log Levels

- **error** - Application errors, exceptions, failures
- **warn** - Warning conditions, deprecated features
- **info** - General informational messages (default)
- **debug** - Detailed debugging information (development only)

### Log Types

Torre Tempo generates several types of logs:

1. **Application Logs** (`app-YYYY-MM-DD.log`)
   - General application activity
   - API requests and responses
   - Business logic events
   - Retention: 30 days

2. **Error Logs** (`error-YYYY-MM-DD.log`)
   - Application errors and exceptions
   - Stack traces
   - Failed operations
   - Retention: 30 days

3. **Audit Logs** (`audit/audit-YYYY-MM-DD.log`)
   - User authentication/authorization
   - Data modifications (time entries, approvals)
   - Admin actions
   - Retention: **5 years** (Spanish labor law compliance)

4. **Exception Logs** (`exceptions-YYYY-MM-DD.log`)
   - Unhandled exceptions
   - Process crashes
   - Retention: 30 days

5. **Rejection Logs** (`rejections-YYYY-MM-DD.log`)
   - Unhandled promise rejections
   - Async errors
   - Retention: 30 days

### Configuration

Log configuration is defined in `apps/api/src/config/logger.config.ts`.

**Environment Variables:**

```bash
# Log level (default: info)
LOG_LEVEL=info

# Log directory (default: logs)
LOG_DIR=/app/logs

# Node environment
NODE_ENV=production
```

---

## Health Checks

### Endpoints

#### 1. Health Check - `/api/health`

Basic health check with database connectivity test.

**Request:**
```bash
curl https://time.lsltgroup.es/api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-29T14:30:45.123Z",
  "service": "torre-tempo-api",
  "version": "0.1.0",
  "uptime": 86400.5,
  "environment": "production",
  "checks": {
    "database": {
      "status": "connected",
      "latency": "15ms"
    },
    "memory": {
      "used": "245MB",
      "total": "512MB"
    }
  },
  "responseTime": "18ms"
}
```

**Status Values:**
- `ok` - All systems operational
- `degraded` - Some systems have issues (e.g., database disconnected)

#### 2. Metrics - `/api/health/metrics`

Detailed system metrics for monitoring tools.

**Request:**
```bash
curl https://time.lsltgroup.es/api/health/metrics
```

**Response:**
```json
{
  "timestamp": "2026-01-29T14:30:45.123Z",
  "process": {
    "uptime": 86400.5,
    "pid": 123,
    "version": "v20.11.0",
    "platform": "linux"
  },
  "memory": {
    "rss": 524288000,
    "heapTotal": 268435456,
    "heapUsed": 257698032,
    "external": 8388608
  },
  "cpu": {
    "user": 12345678,
    "system": 1234567
  }
}
```

### Health Check Schedule

Docker Compose includes automated health checks:

- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3
- **Start Period**: 30 seconds (API), 40 seconds (nginx)

---

## Metrics

### Available Metrics

1. **Process Metrics**
   - Uptime
   - Process ID
   - Node.js version
   - Platform

2. **Memory Metrics**
   - RSS (Resident Set Size)
   - Heap Total
   - Heap Used
   - External Memory

3. **CPU Metrics**
   - User CPU time
   - System CPU time

4. **Database Metrics**
   - Connection status
   - Query latency

### Monitoring Integration

Health check and metrics endpoints are compatible with:

- **Prometheus** - Scrape `/api/health/metrics`
- **Grafana** - Visualize metrics
- **Uptime Kuma** - Monitor `/api/health`
- **Nagios/Zabbix** - Poll health endpoint

---

## Log Locations

### Docker Containers

Logs are stored in Docker volumes and can be accessed via:

```bash
# API logs (inside container)
docker exec torre-tempo-api ls -lh /app/logs/

# View live logs
docker compose -f docker-compose.prod.yml logs -f api

# View specific service logs
docker logs torre-tempo-api
docker logs torre-tempo-db
docker logs torre-tempo-nginx
```

### Host System

Logs are persisted in Docker volumes:

```bash
# Find volume location
docker volume inspect infra_api_logs

# Access logs (requires root)
cd /var/lib/docker/volumes/infra_api_logs/_data/
```

### Log Files

```
logs/
├── app-2026-01-29.log          # Application logs
├── error-2026-01-29.log        # Error logs
├── exceptions-2026-01-29.log   # Unhandled exceptions
├── rejections-2026-01-29.log   # Promise rejections
└── audit/
    └── audit-2026-01-29.log    # Audit logs (5-year retention)
```

---

## Data Retention

### Spanish Labor Law Compliance

Torre Tempo complies with Spanish labor law (RD-Ley 8/2019) requiring **5-year retention** of time tracking records.

### Retention Policies

| Data Type | Retention Period | Storage | Notes |
|-----------|------------------|---------|-------|
| Audit Logs | **5 years** | `logs/audit/` | Required by law |
| Application Logs | 30 days | `logs/` | Operational logs |
| Error Logs | 30 days | `logs/` | Debugging |
| Database Backups | 30 days | `infra/backups/` | Daily backups |
| Time Entry Records | **5 years** | Database | Required by law |

### Automated Retention Enforcement

A scheduled job runs daily at 3:00 AM to check retention policies:

```typescript
// apps/api/src/audit/retention.service.ts
@Cron(CronExpression.EVERY_DAY_AT_3AM)
async enforceRetentionPolicy() {
  // Checks for records older than 5 years
  // Marks for archival (does not delete)
}
```

**Important**: Audit logs and time entry records are NEVER automatically deleted. They are marked as archived for performance optimization while maintaining compliance.

---

## Troubleshooting

### Common Issues

#### 1. No Logs Appearing

**Symptoms:**
- Log directory is empty
- No files in `/app/logs/`

**Solutions:**
```bash
# Check log directory permissions
docker exec torre-tempo-api ls -la /app/logs/

# Check Winston configuration
docker exec torre-tempo-api cat /app/apps/api/dist/config/logger.config.js

# Restart API container
docker compose -f docker-compose.prod.yml restart api
```

#### 2. Logs Growing Too Large

**Symptoms:**
- Disk space warnings
- Large log files

**Solutions:**
```bash
# Check current log sizes
docker exec torre-tempo-api du -sh /app/logs/*

# Manual cleanup (if needed)
docker exec torre-tempo-api find /app/logs -name "*.log" -mtime +30 -delete

# Verify rotation is working
docker exec torre-tempo-api ls -lh /app/logs/
```

#### 3. Health Check Failing

**Symptoms:**
- `/api/health` returns 500 error
- Docker health check shows unhealthy

**Solutions:**
```bash
# Check API logs
docker logs torre-tempo-api --tail 100

# Check database connectivity
docker exec torre-tempo-db psql -U postgres -d torre_tempo -c "SELECT 1;"

# Check database password
docker exec torre-tempo-api env | grep DATABASE_URL

# Restart unhealthy services
docker compose -f docker-compose.prod.yml restart api postgres
```

#### 4. High Memory Usage

**Symptoms:**
- `/api/health/metrics` shows high heap usage
- Container OOM (Out of Memory) errors

**Solutions:**
```bash
# Check current memory usage
docker stats torre-tempo-api

# Increase memory limit in docker-compose.prod.yml
docker compose -f docker-compose.prod.yml up -d

# Restart API to clear memory
docker compose -f docker-compose.prod.yml restart api
```

---

## Alerts & Monitoring

### Recommended Alerts

Set up alerts for the following conditions:

#### Critical Alerts

1. **API Down**
   - Check: `/api/health` returns non-200 status
   - Frequency: Every 1 minute
   - Action: Immediate response required

2. **Database Disconnected**
   - Check: `/api/health` shows `database.status != "connected"`
   - Frequency: Every 1 minute
   - Action: Check database container

3. **Backup Failed**
   - Check: `/var/log/torre-tempo-backup.log` contains "ERROR"
   - Frequency: Daily at 3:00 AM
   - Action: Verify backup script and database connectivity

#### Warning Alerts

1. **High Memory Usage**
   - Check: `/api/health/metrics` shows heap > 80% of total
   - Frequency: Every 5 minutes
   - Action: Consider restarting API or increasing memory

2. **Slow Database**
   - Check: `/api/health` shows `database.latency > 100ms`
   - Frequency: Every 5 minutes
   - Action: Check database performance

3. **High Error Rate**
   - Check: `error-*.log` file size growing rapidly
   - Frequency: Every 10 minutes
   - Action: Review error logs

### Monitoring Tools

#### Option 1: Uptime Kuma (Self-Hosted)

Simple, Docker-based monitoring:

```bash
docker run -d \
  --name uptime-kuma \
  -p 3001:3001 \
  -v uptime-kuma:/app/data \
  --restart always \
  louislam/uptime-kuma:1
```

**Configure:**
- Add HTTP monitor for `https://time.lsltgroup.es/api/health`
- Set check interval: 60 seconds
- Set up email/Slack notifications

#### Option 2: Prometheus + Grafana (Advanced)

For detailed metrics and dashboards:

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
```

**Prometheus Config:**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'torre-tempo'
    metrics_path: '/api/health/metrics'
    static_configs:
      - targets: ['api:4000']
```

#### Option 3: Log Aggregation (ELK Stack)

For centralized log management:

- **Elasticsearch** - Log storage
- **Logstash** - Log processing
- **Kibana** - Log visualization

Not recommended for small deployments due to resource requirements.

---

## Best Practices

### Development

- Use `LOG_LEVEL=debug` for detailed debugging
- Check logs regularly during development
- Test health endpoints after changes

### Production

- Use `LOG_LEVEL=info` (default)
- Monitor `/api/health` endpoint continuously
- Set up alerts for critical conditions
- Review error logs weekly
- Test backup restoration quarterly

### Security

- Logs may contain sensitive information
- Restrict access to log files (root only)
- Do not expose `/api/health/metrics` publicly
- Use HTTPS for all monitoring endpoints

### Performance

- Log rotation prevents disk space issues
- JSON format enables fast log parsing
- Health checks are lightweight (<50ms)
- Audit logs separate from application logs

---

## Additional Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [NestJS Logging](https://docs.nestjs.com/techniques/logger)
- [Spanish Labor Law (RD-Ley 8/2019)](https://www.boe.es/buscar/act.php?id=BOE-A-2019-3481)
- [Docker Logging Best Practices](https://docs.docker.com/config/containers/logging/)

---

## Support

For monitoring issues or questions:

- **Email**: support@lsltgroup.es
- **Deployment Docs**: [DEPLOYMENT.md](../DEPLOYMENT.md)
- **GitHub Issues**: [Report an issue](https://github.com/jmcbride4882/torretempomultitenant/issues)

---

**Last Updated**: 2026-01-29  
**Version**: 1.0.0
