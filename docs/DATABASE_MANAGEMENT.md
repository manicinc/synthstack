# Database Management Guide

**Schema overview, migrations, backups, and optimization for SynthStack databases**

---

## Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Schema Overview](#schema-overview)
4. [Migration Strategy](#migration-strategy)
5. [Backup & Recovery](#backup--recovery)
6. [Query Optimization](#query-optimization)
7. [Indexing Strategy](#indexing-strategy)
8. [Connection Pooling](#connection-pooling)
9. [Monitoring & Maintenance](#monitoring--maintenance)
10. [Common Operations](#common-operations)

---

## Overview

SynthStack uses PostgreSQL 16+ as the primary database for all services. This guide covers database management best practices.

### Database Instances

| Database | Purpose | Tables | Size (typical) |
|----------|---------|--------|----------------|
| **Main (Directus)** | Application data | 60+ | 1-10 GB |
| **Shared ML** | ML service logs | 3 | 500 MB - 5 GB |

**Note:** Both databases can be in the same PostgreSQL instance or separated for scaling.

---

## Database Architecture

### Connection Architecture

```
API Gateway (Fastify)
  ├─→ PostgreSQL (Main)
  │    ├─ Directus schema (app_users, organizations, projects, etc.)
  │    └─ Referrals schema (referral_codes, credit_transactions, etc.)
  │
  └─→ PostgreSQL (ML Database)
       ├─ ml_service_requests (request logging)
       ├─ ml_service_usage (daily analytics)
       └─ ml_service_cache (response caching)

ML Services (FastAPI/Django/NestJS)
  └─→ PostgreSQL (ML Database)
       └─ Shared access to same 3 tables
```

### Connection Pooling

```typescript
// API Gateway
{
  min: 5,           // Minimum connections
  max: 20,          // Maximum connections
  idleTimeout: 30000, // 30s idle timeout
}

// ML Services
{
  min: 2,           // Minimum connections
  max: 10,          // Maximum connections
  idleTimeout: 30000,
}
```

---

## Schema Overview

### Main Database Tables (Key Tables)

#### Core Tables

**`app_users`** - User accounts
```sql
CREATE TABLE app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'free',
    credits_remaining INTEGER DEFAULT 50,
    lifetime_credits_used INTEGER DEFAULT 0,
    referral_code VARCHAR(20) UNIQUE,
    is_banned BOOLEAN DEFAULT false,
    is_moderator BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON app_users(email);
CREATE INDEX idx_users_referral_code ON app_users(referral_code);
CREATE INDEX idx_users_tier ON app_users(subscription_tier);
```

**`organizations`** - Multi-tenant organizations
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    owner_id UUID REFERENCES app_users(id),
    subscription_tier VARCHAR(50) DEFAULT 'free',
    credits_remaining INTEGER DEFAULT 50,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orgs_slug ON organizations(slug);
CREATE INDEX idx_orgs_owner ON organizations(owner_id);
```

#### Referral System Tables

**`referral_codes`** - User referral codes
```sql
CREATE TABLE referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
    code VARCHAR(20) UNIQUE NOT NULL,
    season_id UUID REFERENCES referral_seasons(id),
    clicks INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_referral_codes_user ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_season ON referral_codes(season_id);
```

**`referrals`** - Referral tracking
```sql
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES app_users(id),
    referred_user_id UUID REFERENCES app_users(id),
    referred_email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'clicked',
    click_date TIMESTAMPTZ,
    signup_date TIMESTAMPTZ,
    conversion_date TIMESTAMPTZ,
    conversion_type VARCHAR(50),
    conversion_value DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_user_id);
CREATE INDEX idx_referrals_status ON referrals(status);
```

**`credit_transactions`** - Credit ledger
```sql
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES app_users(id),
    organization_id UUID REFERENCES organizations(id),
    amount INTEGER NOT NULL,
    balance_before INTEGER,
    balance_after INTEGER,
    transaction_type VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50),
    reference_id VARCHAR(255),
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_tx_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_tx_org ON credit_transactions(organization_id);
CREATE INDEX idx_credit_tx_ref ON credit_transactions(reference_type, reference_id);
CREATE INDEX idx_credit_tx_created ON credit_transactions(created_at);
```

### ML Database Tables

**`ml_service_requests`** - Request logging
```sql
CREATE TABLE ml_service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    organization_id UUID,
    service_name VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_payload JSONB,
    response_payload JSONB,
    status_code INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    credits_charged INTEGER DEFAULT 0,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ml_req_user ON ml_service_requests(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ml_req_org ON ml_service_requests(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_ml_req_service ON ml_service_requests(service_name);
CREATE INDEX idx_ml_req_endpoint ON ml_service_requests(endpoint);
CREATE INDEX idx_ml_req_created ON ml_service_requests(created_at);
CREATE INDEX idx_ml_req_status ON ml_service_requests(status_code);
CREATE INDEX idx_ml_req_request_id ON ml_service_requests(request_id);
```

**`ml_service_usage`** - Daily analytics
```sql
CREATE TABLE ml_service_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    organization_id UUID,
    date DATE NOT NULL,
    service_name VARCHAR(50) NOT NULL,
    endpoint_category VARCHAR(50) NOT NULL,
    total_requests INTEGER DEFAULT 0,
    total_credits INTEGER DEFAULT 0,
    total_duration_ms BIGINT DEFAULT 0,
    avg_duration_ms INTEGER,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, organization_id, date, service_name, endpoint_category)
);

CREATE INDEX idx_ml_usage_user ON ml_service_usage(user_id);
CREATE INDEX idx_ml_usage_org ON ml_service_usage(organization_id);
CREATE INDEX idx_ml_usage_date ON ml_service_usage(date);
CREATE INDEX idx_ml_usage_service ON ml_service_usage(service_name);
CREATE INDEX idx_ml_usage_category ON ml_service_usage(endpoint_category);
```

**`ml_service_cache`** - Response caching
```sql
CREATE TABLE ml_service_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    service_name VARCHAR(50),
    response_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    hit_count INTEGER DEFAULT 0,
    last_hit_at TIMESTAMPTZ,
    size_bytes INTEGER
);

CREATE INDEX idx_ml_cache_key ON ml_service_cache(cache_key);
CREATE INDEX idx_ml_cache_hash ON ml_service_cache(request_hash);
CREATE INDEX idx_ml_cache_expires ON ml_service_cache(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_ml_cache_endpoint ON ml_service_cache(endpoint);
CREATE INDEX idx_ml_cache_created ON ml_service_cache(created_at);
CREATE INDEX idx_ml_cache_last_hit ON ml_service_cache(last_hit_at) WHERE last_hit_at IS NOT NULL;
CREATE INDEX idx_ml_cache_hot ON ml_service_cache(hit_count, last_hit_at) WHERE hit_count > 10;
```

---

## Migration Strategy

### Migration File Structure

```
services/directus/migrations/
├── 001_initial_schema.sql
├── 002_add_organizations.sql
├── 003_add_credits_system.sql
├── 100_referral_system.sql
├── 110_referral_tiers.sql
├── 120_ml_service_shared_db.sql    # ML database tables
└── ...
```

### Migration Naming Convention

```
[number]_[description].sql

Examples:
- 001_initial_schema.sql
- 120_ml_service_shared_db.sql
- 130_add_user_preferences.sql
```

### How Migrations Are Applied (Recommended)

SynthStack uses a one-shot Docker service (`directus-migrate`) that:

- waits for Directus to initialize its schema
- applies each `*.sql` migration in lexicographic order
- tracks applied migrations in `synthstack_migrations` (so each file runs once)

**Local dev:** `docker compose up -d` runs `directus-migrate` automatically (after Directus is healthy).  
After pulling updates, run:

```bash
docker compose up -d directus-migrate
```

**Production (Community deploy):**

```bash
docker compose -f deploy/docker-compose.yml up -d directus-migrate
```

### Where Migration Files Live

- Source of truth: `services/directus/migrations/*.sql` (used by both dev and production deploy)

### Creating a New Migration

1. Create a new file in `services/directus/migrations/` (never edit old migration files once shipped).
2. Keep it **additive + idempotent** (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, etc.).

Example skeleton:

```sql
-- Migration: 125_add_example_table.sql
-- Description: Add example table for feature X

BEGIN;

CREATE TABLE IF NOT EXISTS example (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
```

### Migration Best Practices

1. **Always use transactions** (`BEGIN;` ... `COMMIT;`)
2. **Use IF NOT EXISTS** for idempotency
3. **Test rollback** procedures
4. **Backup before major migrations**
5. **Run during maintenance window**
6. **Monitor performance impact**

---

## Backup & Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup-all-databases.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
S3_BUCKET="s3://synthstack-backups"

# Backup main database
echo "Backing up main database..."
pg_dump -h localhost -U synthstack -d synthstack \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_DIR/main_$TIMESTAMP.dump"

# Backup ML database
echo "Backing up ML database..."
pg_dump -h localhost -U synthstack -d synthstack \
  --schema=public \
  --table=ml_service_requests \
  --table=ml_service_usage \
  --table=ml_service_cache \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_DIR/ml_$TIMESTAMP.dump"

# Upload to S3
aws s3 sync "$BACKUP_DIR" "$S3_BUCKET/database/"

# Cleanup old backups (keep last 30 days)
find "$BACKUP_DIR" -name "*.dump" -mtime +30 -delete

# Verify backup
pg_restore --list "$BACKUP_DIR/main_$TIMESTAMP.dump" > /dev/null
if [ $? -eq 0 ]; then
  echo "✅ Backup verified successfully"
else
  echo "❌ Backup verification failed!"
  exit 1
fi

echo "Backup completed: main_$TIMESTAMP.dump, ml_$TIMESTAMP.dump"
```

### Point-in-Time Recovery (PITR)

**Enable WAL archiving:**

```sql
-- postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /wal_archive/%f && cp %p /wal_archive/%f'
max_wal_senders = 10
wal_keep_size = 1GB
```

**Restore to specific timestamp:**

```bash
# Stop database
systemctl stop postgresql

# Restore base backup
pg_restore -d synthstack /backups/main_20240115_020000.dump

# Create recovery.signal
touch /var/lib/postgresql/data/recovery.signal

# Configure recovery target
cat > /var/lib/postgresql/data/postgresql.auto.conf << EOF
restore_command = 'cp /wal_archive/%f %p'
recovery_target_time = '2024-01-15 14:30:00'
EOF

# Start database (will replay WAL to target time)
systemctl start postgresql
```

### Restore Procedure

```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE=$1
DATABASE=${2:-synthstack}

# Confirm restore
read -p "⚠️  This will OVERWRITE database '$DATABASE'. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled"
  exit 0
fi

# Stop application
echo "Stopping application..."
kubectl scale deployment/api-gateway --replicas=0
kubectl scale deployment/ml-service --replicas=0

# Drop existing connections
psql -h localhost -U postgres -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE datname = '$DATABASE' AND pid <> pg_backend_pid();
"

# Drop and recreate database
psql -h localhost -U postgres -c "DROP DATABASE IF EXISTS $DATABASE;"
psql -h localhost -U postgres -c "CREATE DATABASE $DATABASE;"

# Restore backup
echo "Restoring backup..."
pg_restore -h localhost -U synthstack -d $DATABASE --verbose "$BACKUP_FILE"

# Verify
TABLES=$(psql -h localhost -U synthstack -d $DATABASE -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
echo "Restored $TABLES tables"

# Restart application
echo "Restarting application..."
kubectl scale deployment/api-gateway --replicas=3
kubectl scale deployment/ml-service --replicas=2

echo "✅ Restore completed successfully"
```

---

## Query Optimization

### Identifying Slow Queries

**Enable pg_stat_statements:**

```sql
-- postgresql.conf
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all
pg_stat_statements.max = 10000

-- Create extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

**Find slowest queries:**

```sql
SELECT
    calls,
    mean_exec_time::INT AS avg_ms,
    max_exec_time::INT AS max_ms,
    total_exec_time::INT AS total_ms,
    (total_exec_time / sum(total_exec_time) OVER ()) * 100 AS pct_total,
    LEFT(query, 100) AS query_preview
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### Explain Analyze

```sql
-- Analyze query execution
EXPLAIN ANALYZE
SELECT u.*, COUNT(r.id) AS referral_count
FROM app_users u
LEFT JOIN referrals r ON u.id = r.referrer_id
WHERE u.subscription_tier = 'pro'
GROUP BY u.id
ORDER BY referral_count DESC
LIMIT 10;

-- Output interpretation:
-- Seq Scan → needs index
-- Index Scan → good
-- Nested Loop → might be slow for large datasets
-- Hash Join → good for large datasets
```

### Common Optimization Techniques

#### 1. Add Missing Indexes

```sql
-- Before (slow)
SELECT * FROM ml_service_requests WHERE user_id = 'xxx';
-- Seq Scan on ml_service_requests (cost=0.00..10000.00 rows=1000)

-- Add index
CREATE INDEX idx_ml_req_user ON ml_service_requests(user_id);

-- After (fast)
-- Index Scan using idx_ml_req_user (cost=0.42..8.44 rows=1)
```

#### 2. Use Partial Indexes

```sql
-- Index only non-null values
CREATE INDEX idx_ml_req_user_nonnull ON ml_service_requests(user_id)
WHERE user_id IS NOT NULL;

-- Index only active records
CREATE INDEX idx_users_active ON app_users(id)
WHERE is_banned = false;
```

#### 3. Composite Indexes

```sql
-- Query: WHERE user_id = ? AND created_at > ?
CREATE INDEX idx_ml_req_user_created ON ml_service_requests(user_id, created_at);

-- Query: WHERE created_at > ? AND status_code = ?
CREATE INDEX idx_ml_req_created_status ON ml_service_requests(created_at, status_code);
```

#### 4. Denormalization

```sql
-- Add computed column to avoid joins
ALTER TABLE app_users ADD COLUMN total_referrals INTEGER DEFAULT 0;

-- Update with trigger
CREATE OR REPLACE FUNCTION update_referral_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE app_users
    SET total_referrals = (
        SELECT COUNT(*) FROM referrals WHERE referrer_id = NEW.referrer_id
    )
    WHERE id = NEW.referrer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_referral_count
AFTER INSERT ON referrals
FOR EACH ROW EXECUTE FUNCTION update_referral_count();
```

---

## Indexing Strategy

### Index Types

| Type | Use Case | Example |
|------|----------|---------|
| **B-tree** | General purpose, equality/range | `CREATE INDEX ON users(email)` |
| **Hash** | Exact match only | `CREATE INDEX ON users USING hash(id)` |
| **GiST** | Geometric, full-text | `CREATE INDEX ON docs USING gist(content)` |
| **GIN** | JSONB, arrays, full-text | `CREATE INDEX ON requests USING gin(metadata)` |
| **BRIN** | Large sequential data | `CREATE INDEX ON logs USING brin(created_at)` |

### JSONB Indexing

```sql
-- GIN index for JSONB queries
CREATE INDEX idx_ml_req_metadata ON ml_service_requests USING gin(metadata);

-- Query with JSONB operators
SELECT * FROM ml_service_requests
WHERE metadata @> '{"tier": "pro"}';

-- Partial GIN index
CREATE INDEX idx_ml_req_meta_tier ON ml_service_requests USING gin(metadata)
WHERE metadata ? 'tier';
```

### Index Maintenance

```sql
-- Find unused indexes
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS index_scans,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Rebuild bloated indexes
REINDEX INDEX CONCURRENTLY idx_ml_req_user;

-- Analyze tables after bulk operations
ANALYZE ml_service_requests;
```

---

## Connection Pooling

### PgBouncer Configuration

**Install and configure:**

```bash
# Install
sudo apt-get install pgbouncer

# Configure
sudo nano /etc/pgbouncer/pgbouncer.ini
```

**pgbouncer.ini:**

```ini
[databases]
synthstack = host=localhost port=5432 dbname=synthstack

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
server_lifetime = 1200
server_idle_timeout = 60
```

### Application Connection Pooling

```typescript
// API Gateway (Fastify)
await server.register(fastifyPostgres, {
  connectionString: process.env.DATABASE_URL,
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// ML Service (FastAPI + AsyncPG)
pool = await asyncpg.create_pool(
    dsn=settings.DATABASE_URL,
    min_size=2,
    max_size=10,
    max_inactive_connection_lifetime=300,
)
```

---

## Monitoring & Maintenance

### Key Metrics to Monitor

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('synthstack'));

-- Table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Connection count
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

-- Cache hit ratio (should be > 99%)
SELECT
    sum(heap_blks_read) AS heap_read,
    sum(heap_blks_hit) AS heap_hit,
    sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) * 100 AS cache_hit_ratio
FROM pg_statio_user_tables;

-- Bloat check
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    CASE WHEN pg_total_relation_size(schemaname||'.'||tablename) > 0
        THEN (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename))::FLOAT /
             pg_total_relation_size(schemaname||'.'||tablename) * 100
        ELSE 0
    END AS bloat_pct
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY bloat_pct DESC;
```

### Vacuum & Analyze

```bash
# Auto-vacuum settings (postgresql.conf)
autovacuum = on
autovacuum_max_workers = 3
autovacuum_naptime = 1min

# Manual vacuum (full)
VACUUM FULL ANALYZE ml_service_requests;

# Vacuum without locking
VACUUM ANALYZE ml_service_requests;

# Analyze only
ANALYZE ml_service_requests;
```

---

## Common Operations

### Add Column

```sql
-- Add column with default
ALTER TABLE app_users ADD COLUMN last_login TIMESTAMPTZ DEFAULT NOW();

-- Add column without default (faster for large tables)
ALTER TABLE app_users ADD COLUMN preferences JSONB;
UPDATE app_users SET preferences = '{}' WHERE preferences IS NULL;
ALTER TABLE app_users ALTER COLUMN preferences SET DEFAULT '{}';
ALTER TABLE app_users ALTER COLUMN preferences SET NOT NULL;
```

### Drop Table Safely

```sql
-- Rename first (allows quick rollback)
ALTER TABLE old_table RENAME TO old_table_deprecated;

-- If no issues after 24h, drop
DROP TABLE old_table_deprecated CASCADE;
```

### Archive Old Data

```sql
-- Create archive table
CREATE TABLE ml_service_requests_archive (LIKE ml_service_requests INCLUDING ALL);

-- Move old data
INSERT INTO ml_service_requests_archive
SELECT * FROM ml_service_requests
WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete archived data
DELETE FROM ml_service_requests
WHERE created_at < NOW() - INTERVAL '90 days';

-- Vacuum to reclaim space
VACUUM FULL ml_service_requests;
```

---

## Summary

### Best Practices Checklist

✅ **Performance:**
- [ ] All frequently queried columns have indexes
- [ ] Composite indexes for multi-column WHERE clauses
- [ ] Partial indexes for filtered queries
- [ ] JSONB indexes for metadata queries
- [ ] Connection pooling configured (20-50 connections)
- [ ] Query performance monitored (pg_stat_statements)

✅ **Reliability:**
- [ ] Daily automated backups
- [ ] Backup verification runs weekly
- [ ] Point-in-time recovery enabled (WAL archiving)
- [ ] Disaster recovery plan documented
- [ ] Restore tested monthly

✅ **Maintenance:**
- [ ] Auto-vacuum enabled
- [ ] Manual vacuum scheduled weekly
- [ ] Unused indexes identified and dropped
- [ ] Table bloat monitored
- [ ] Old data archived quarterly

✅ **Monitoring:**
- [ ] Database size tracked
- [ ] Connection count monitored
- [ ] Cache hit ratio > 99%
- [ ] Slow queries identified and optimized
- [ ] Alerts configured for anomalies

---

**Need help?** Open an issue at [github.com/manicinc/synthstack](https://github.com/manicinc/synthstack/issues)
