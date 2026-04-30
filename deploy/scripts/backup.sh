#!/usr/bin/env bash
# Daily backup script — добавь в cron:
# 0 3 * * * /opt/kmguard/deploy/scripts/backup.sh >> /var/log/kmguard-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups/kmguard}"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$DATE] Starting backup..."

# Postgres dump
docker compose -f /opt/kmguard/deploy/docker-compose.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip \
  > "$BACKUP_DIR/postgres_$DATE.sql.gz"

echo "[$DATE] Postgres backup done: postgres_$DATE.sql.gz"

# MinIO sync (если есть mc client)
if command -v mc &>/dev/null; then
  mc mirror \
    "minio/kmguard" \
    "$BACKUP_DIR/minio_$DATE/" \
    --quiet
  echo "[$DATE] MinIO backup done"
fi

# Cleanup old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
echo "[$DATE] Cleaned up backups older than $RETENTION_DAYS days"

echo "[$DATE] Backup complete."