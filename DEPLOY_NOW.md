# 🚀 DEPLOY TORRE TEMPO NOW

## ONE-COMMAND DEPLOYMENT

Copy and paste this into your VPS terminal:

```bash
ssh root@your-vps-ip << 'ENDSSH'
cd /opt/torre-tempo && \
git pull origin main && \
docker compose -f infra/docker-compose.prod.yml up -d --build && \
sleep 15 && \
docker exec torre-tempo-api npx prisma migrate deploy && \
docker compose -f infra/docker-compose.prod.yml ps && \
echo "✅ DEPLOYMENT COMPLETE!" && \
echo "🌐 Visit: https://time.lsltgroup.es"
ENDSSH
```

---

## STEP-BY-STEP (If you prefer manual control)

### Step 1: SSH into VPS
```bash
ssh root@your-vps-ip
```

### Step 2: Navigate to app directory
```bash
cd /opt/torre-tempo
```

### Step 3: Pull latest code
```bash
git pull origin main
```

### Step 4: Rebuild and restart containers
```bash
docker compose -f infra/docker-compose.prod.yml up -d --build
```

### Step 5: Wait for services to start
```bash
sleep 15
```

### Step 6: Run database migrations
```bash
docker exec torre-tempo-api npx prisma migrate deploy
```

### Step 7: Verify deployment
```bash
docker compose -f infra/docker-compose.prod.yml ps
curl https://time.lsltgroup.es/api/health
```

---

## WHAT'S BEING DEPLOYED

### New Features:
- ✅ Tenant Management API (settings, stats)
- ✅ User Management System (full CRUD for employees)
- ✅ Enhanced Clocking Page (QR scanner + geolocation)
- ✅ User Management UI (Admin/Manager interface)
- ✅ Tenant Settings Page (configure company and labor law settings)
- ✅ Complete i18n support (6 languages)

### Commits Being Deployed:
```
b88fb59 - feat(i18n): add translations for tenant settings
8844055 - feat(settings): add tenant settings page and routing
542bfd7 - chore: update dependencies and planning documentation
ddad3d7 - feat(i18n): add translations for new features
668bd2f - feat(web): enhance clocking page with QR and geolocation
aff7d9a - feat(web): add user management page
312cea8 - feat(api): register tenant and user modules in app
17f35b6 - feat(api): add user management module
0e0f7d6 - feat(api): add tenant management module
```

---

## VERIFICATION CHECKLIST

After deployment, verify these work:

- [ ] API Health: `curl https://time.lsltgroup.es/api/health`
- [ ] Web App loads: Open https://time.lsltgroup.es in browser
- [ ] Login page displays
- [ ] Can register new tenant (test with fake data)
- [ ] Dashboard loads after login
- [ ] User management page accessible (Admin role)
- [ ] Clocking page shows QR scanner button
- [ ] Locations page loads
- [ ] Settings page loads (Admin only)

---

## TROUBLESHOOTING

### If containers won't start:
```bash
# Check logs
docker compose -f infra/docker-compose.prod.yml logs -f

# Restart specific service
docker compose -f infra/docker-compose.prod.yml restart api
docker compose -f infra/docker-compose.prod.yml restart web
```

### If database migration fails:
```bash
# Check if database is accessible
docker compose -f infra/docker-compose.prod.yml ps postgres

# Try migration again
docker exec torre-tempo-api npx prisma migrate deploy

# If still failing, check migration status
docker exec torre-tempo-api npx prisma migrate status
```

### If API returns errors:
```bash
# Check API logs
docker logs torre-tempo-api --tail=100

# Check environment variables
docker exec torre-tempo-api env | grep -E "DATABASE_URL|JWT_SECRET"
```

---

## ROLLBACK (If needed)

If something goes wrong, rollback to previous version:

```bash
cd /opt/torre-tempo
git reset --hard 6ae141c  # Last known good commit
docker compose -f infra/docker-compose.prod.yml up -d --build
```

---

## NEXT STEPS AFTER DEPLOYMENT

1. **Create First Admin Account**
   - Go to https://time.lsltgroup.es
   - Click "Register Tenant"
   - Fill in company details
   - This creates your admin account

2. **Configure Tenant Settings**
   - Login as admin
   - Go to Settings (gear icon)
   - Set timezone, locale, labor law settings

3. **Add Locations**
   - Go to Locations
   - Click "Add Location"
   - Set coordinates and geofence radius
   - Generate QR code
   - Print QR code and post at location

4. **Add Employees**
   - Go to Users
   - Click "Add Employee"
   - Fill in details
   - Send credentials to employee

5. **Test Clocking**
   - Login as employee
   - Go to Clock page
   - Scan QR code (or click clock in)
   - Verify time entry is recorded

---

## 🎉 YOU'RE LIVE!

Once deployed, Torre Tempo will be available at:
- https://time.lsltgroup.es
- https://time.lsltapps.com

All 9 commits with full MVP features are now in production!
