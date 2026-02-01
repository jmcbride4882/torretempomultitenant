# Torre Tempo - Quick Reference

**Last Updated**: 2026-02-01  
**Developer**: John McBride (LSLT Group)

---

## 🚀 PRODUCTION HOSTING

### Primary Information
- **URL**: https://time.lsltgroup.es
- **Secondary URL**: https://time.lsltapps.com
- **SSH Access**: `ssh root@time.lsltgroup.es`
- **Install Location**: `/opt/torre-tempo`
- **Platform**: Ubuntu 25.04 VPS

### Quick Deploy
```bash
ssh root@time.lsltgroup.es "cd /opt/torre-tempo && bash infra/scripts/update.sh"
```

### Container Stack
- **Nginx**: torre-tempo-nginx (ports 80, 443)
- **Web**: torre-tempo-web (React 18 + Vite PWA)
- **API**: torre-tempo-api (NestJS + Prisma)
- **Database**: torre-tempo-db (PostgreSQL 16)
- **Cache**: torre-tempo-redis (Redis 7)

---

## 📦 GIT REPOSITORY

### Remote
```
https://github.com/jmcbride4882/torretempomultitenant.git
```

### Current Status (Local)
- **Branch**: main
- **Last Commit**: `f91395f` - fix(rbac): implement proper role-based access control and navigation filtering
- **Status**: ⚠️ **NOT DEPLOYED TO PRODUCTION**
- **Uncommitted Changes**: 5 files modified (AGENTS.md updates, package.json changes)

### Production Status
- ⚠️ **Out of Sync** - rbac fixes not deployed yet
- ❌ QA issues still present on production
- 🔴 **Action Required**: Deploy immediately to fix security issues

---

## ⚡ COMMON COMMANDS

### Deploy to Production
```bash
# Full deployment (recommended)
ssh root@time.lsltgroup.es
cd /opt/torre-tempo
bash infra/scripts/update.sh

# Manual deployment
git pull origin main
cd infra
docker compose -f docker-compose.prod.yml build --no-cache api web
docker compose -f docker-compose.prod.yml restart
```

### Check Production Status
```bash
# Health check
curl https://time.lsltgroup.es/api/health

# Current commit
ssh root@time.lsltgroup.es "cd /opt/torre-tempo && git log -1 --oneline"

# Container logs
ssh root@time.lsltgroup.es "cd /opt/torre-tempo/infra && docker compose -f docker-compose.prod.yml logs -f api"
```

### Local Development
```bash
npm run dev                 # Start both API + Web
npm run dev:api             # API only
npm run dev:web             # Web only
npm run build               # Build all
npm run db:migrate          # Run migrations
npm test                    # Run all tests
```

---

## 🐛 CRITICAL ISSUES (As of 2026-02-01 - Updated)

### P0 - Must Fix Immediately
1. ✅ **RBAC Violations** (FIXED and DEPLOYED)
   - Frontend route guards implemented (f91395f)
   - Role-based navigation filtering active
   - Deployed to production: commit 66c21f8
   - **Status**: RESOLVED

2. ✅ **Settings Page Redirect** (NOT A BUG)
   - Investigation shows code is correct
   - Settings properly restricts to ADMIN + GLOBAL_ADMIN only
   - MANAGER/EMPLOYEE redirect is expected behavior
   - **Status**: WORKING AS DESIGNED

3. ✅ **MANAGER Account Login Failure** (FIXED)
   - Root cause: Account didn't exist in database
   - Created qa-manager@test.com in production (2026-02-01)
   - Login verified working with JWT token
   - **Status**: RESOLVED

### P1 - High Priority
4. ❌ **Profile Page Translations** (NOT fixed)
   - Translation keys displayed instead of text (profile.*)

5. ❌ **Backend Authorization Checks** (NOT implemented)
   - Frontend guards exist, but API needs @UseGuards(RolesGuard)

---

## 👤 TEST ACCOUNTS

| Email | Password | Role | Status |
|-------|----------|------|--------|
| info@lsltgroup.es | Summer15 | GLOBAL_ADMIN | ✅ Working |
| qa-admin@test.com | TestPass123! | ADMIN | ✅ Working |
| qa-manager@test.com | TestPass123! | MANAGER | ❌ 401 Error |
| john@lsltgroup.es | (unknown) | EMPLOYEE | ✅ Working |

---

## 📊 QA STATUS

- **Last QA Run**: January 31, 2026
- **Result**: ❌ FAIL - Critical security issues
- **Issues Found**: 8 access control violations
- **Tests Passed**: 13/15 pages for GLOBAL_ADMIN
- **Production Ready**: ❌ NO - Deploy rbac fixes first

**QA Reports Location**: `qa-reports/FINAL-QA-REPORT.md`

---

## 🎯 NEXT ACTIONS

### Immediate (Today)
1. Deploy f91395f to production (fixes 4 RBAC violations)
2. Verify rbac fixes work via QA testing
3. Fix Settings redirect bug
4. Fix MANAGER login issue

### This Week
5. Implement backend authorization checks
6. Fix Profile page translations
7. Set up automated testing in CI/CD

---

## 📝 IMPORTANT FILES

| File | Purpose |
|------|---------|
| `AGENTS.md` | Project knowledge base (root + subdirs) |
| `qa-reports/FINAL-QA-REPORT.md` | Complete QA analysis (689 lines) |
| `DEPLOYMENT.md` | Deployment guide and procedures |
| `infra/scripts/update.sh` | Production deployment script |
| `infra/nginx/conf.d/torre-tempo.conf` | Nginx configuration |
| `.env` (local) | Local environment variables |
| `infra/.env` (production) | Production environment variables |

---

## 🔐 SECURITY NOTES

- SSL: Let's Encrypt auto-renewal configured
- Audit logs: 5-year retention (Spanish law compliance)
- Database backups: Daily at 2:00 AM, 30-day retention
- CORS: Configured for time.lsltgroup.es origin
- JWT: Secret stored in .env (production)

---

## 📞 QUICK HELP

**Can't access production?**
```bash
# Check SSH access
ssh root@time.lsltgroup.es

# Verify containers running
docker ps
```

**Deploy failed?**
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs api

# Manual restart
docker compose -f docker-compose.prod.yml restart api web
```

**Need to rollback?**
```bash
cd /opt/torre-tempo
git reset --hard <commit-hash>
docker compose -f docker-compose.prod.yml restart
```

---

**📌 Pin this file for quick reference in future sessions.**
