#!/bin/bash
# SynthStack Backup Script
# Creates backups of database and uploads to Cloudflare R2

set -e

# Configuration
BACKUP_DIR="/opt/synthstack/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "Starting backup: $TIMESTAMP"

# Database backup
echo "Backing up PostgreSQL database..."
docker compose -f /opt/synthstack/docker-compose.yml exec -T postgres pg_dump \
  -U synthstack \
  -d synthstack \
  --format=custom \
  --compress=9 \
  > "$BACKUP_DIR/db_$TIMESTAMP.dump"

# Compress
gzip -9 "$BACKUP_DIR/db_$TIMESTAMP.dump"

# Upload to R2 (if configured)
if [ -n "$CLOUDFLARE_R2_ACCESS_KEY" ]; then
  echo "Uploading to Cloudflare R2..."
  
  aws s3 cp \
    "$BACKUP_DIR/db_$TIMESTAMP.dump.gz" \
    "s3://$CLOUDFLARE_R2_BUCKET/backups/db_$TIMESTAMP.dump.gz" \
    --endpoint-url "https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com"
fi

# Cleanup old local backups
echo "Cleaning up old backups..."
find "$BACKUP_DIR" -name "db_*.dump.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "db_*.sql" -mtime +$RETENTION_DAYS -delete

echo "Backup complete: db_$TIMESTAMP.dump.gz"





