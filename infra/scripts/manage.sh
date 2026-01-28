#!/bin/bash
# Torre Tempo - Management Script
# Usage: ./manage.sh [command]

APP_DIR="/opt/torre-tempo"
cd $APP_DIR/infra

case "$1" in
    start)
        echo "Starting Torre Tempo..."
        docker-compose -f docker-compose.prod.yml up -d
        ;;
    stop)
        echo "Stopping Torre Tempo..."
        docker-compose -f docker-compose.prod.yml down
        ;;
    restart)
        echo "Restarting Torre Tempo..."
        docker-compose -f docker-compose.prod.yml restart
        ;;
    status)
        docker-compose -f docker-compose.prod.yml ps
        ;;
    logs)
        docker-compose -f docker-compose.prod.yml logs -f ${2:-}
        ;;
    logs-api)
        docker-compose -f docker-compose.prod.yml logs -f api
        ;;
    logs-web)
        docker-compose -f docker-compose.prod.yml logs -f web
        ;;
    shell-api)
        docker exec -it torre-tempo-api sh
        ;;
    shell-db)
        docker exec -it torre-tempo-db psql -U postgres -d torre_tempo
        ;;
    migrate)
        echo "Running database migrations..."
        docker exec torre-tempo-api npx prisma migrate deploy
        ;;
    backup)
        echo "Creating database backup..."
        docker exec torre-tempo-backup /backup.sh
        ;;
    restore)
        if [ -z "$2" ]; then
            echo "Usage: ./manage.sh restore <backup_file>"
            echo "Available backups:"
            ls -la $APP_DIR/infra/backups/
            exit 1
        fi
        echo "Restoring from $2..."
        gunzip -c $2 | docker exec -i torre-tempo-db psql -U postgres -d torre_tempo
        echo "Restore complete!"
        ;;
    ssl-renew)
        echo "Renewing SSL certificates..."
        docker-compose -f docker-compose.prod.yml exec certbot certbot renew
        docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
        ;;
    health)
        echo "Checking health..."
        curl -s http://localhost/api/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost/api/health
        ;;
    update)
        $APP_DIR/infra/scripts/update.sh
        ;;
    *)
        echo "Torre Tempo Management Script"
        echo ""
        echo "Usage: $0 {command}"
        echo ""
        echo "Commands:"
        echo "  start       - Start all services"
        echo "  stop        - Stop all services"
        echo "  restart     - Restart all services"
        echo "  status      - Show service status"
        echo "  logs        - View all logs (or: logs api, logs web, logs postgres)"
        echo "  logs-api    - View API logs"
        echo "  logs-web    - View web logs"
        echo "  shell-api   - Open shell in API container"
        echo "  shell-db    - Open PostgreSQL shell"
        echo "  migrate     - Run database migrations"
        echo "  backup      - Create database backup"
        echo "  restore     - Restore from backup (provide filename)"
        echo "  ssl-renew   - Renew SSL certificates"
        echo "  health      - Check API health"
        echo "  update      - Pull latest code and redeploy"
        ;;
esac
