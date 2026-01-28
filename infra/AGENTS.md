# infra - Torre Tempo Infrastructure

**Generated:** 2026-01-28 21:43
**Commit:** 0255da4
**Branch:** main

## OVERVIEW
Docker Compose for dev/prod, nginx reverse proxy, and deployment scripts.

## STRUCTURE

```
infra/
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile.web
├── Dockerfile.api
├── nginx/conf.d/torre-tempo.conf
├── scripts/
│   ├── deploy.sh
│   ├── update.sh
│   ├── manage.sh
│   └── backup.sh
└── ssl/
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Dev DB services | `docker-compose.yml` | postgres + redis |
| Prod stack | `docker-compose.prod.yml` | web/api/postgres/redis/nginx |
| Reverse proxy | `nginx/conf.d/torre-tempo.conf` | `/` → web, `/api` → api |
| Deploy script | `scripts/deploy.sh` | pull/build/migrate/restart |

## CONVENTIONS
- Env vars live in `.env` files or compose overrides.
- Multi-stage Docker builds for web/api.

## ANTI-PATTERNS
- No secrets in compose files.
- No `latest` tags.
- No root user in containers.
- No exposed postgres/redis ports in prod.

## NOTES
- TLS certs go in `infra/ssl/` (`cert.pem` + `key.pem`).
- Scripts assume `docker compose` v2.
