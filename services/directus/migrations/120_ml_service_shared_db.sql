-- Migration 120: ML Service Shared Database Integration
-- Created: 2026-01-08
-- Purpose: Add tables for ML service request logging, usage analytics, and caching
--
-- This migration enables all ML services (FastAPI, Django, NestJS) to share
-- a common PostgreSQL database for tracking requests, calculating analytics,
-- and implementing cross-service caching.

-- ==================================================
-- ML SERVICE REQUEST LOGGING
-- ==================================================
-- Tracks every request made to ML services through the API Gateway
-- Used for audit logs, debugging, analytics, and credit tracking

CREATE TABLE IF NOT EXISTS ml_service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User and Organization Context
    user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

    -- Service Information
    service_name VARCHAR(50) NOT NULL, -- 'fastapi', 'django', 'nestjs'
    endpoint VARCHAR(255) NOT NULL,     -- '/embeddings/generate', '/rag/query', etc.
    method VARCHAR(10) NOT NULL,        -- 'POST', 'GET', 'DELETE'

    -- Request/Response Data
    request_payload JSONB,              -- Full request body (may be large)
    response_payload JSONB,             -- Full response body (may be large)
    status_code INTEGER NOT NULL,       -- HTTP status code (200, 400, 500, etc.)
    error_message TEXT,                 -- Error details if status_code >= 400

    -- Performance Metrics
    duration_ms INTEGER NOT NULL,       -- Request duration in milliseconds
    credits_charged INTEGER DEFAULT 0,  -- Credits deducted for this request

    -- Request Metadata
    ip_address INET,                    -- Client IP address
    user_agent TEXT,                    -- User agent string
    request_id VARCHAR(255),            -- Correlation ID for distributed tracing

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT ml_service_requests_service_name_check
        CHECK (service_name IN ('fastapi', 'django', 'nestjs')),
    CONSTRAINT ml_service_requests_method_check
        CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD')),
    CONSTRAINT ml_service_requests_duration_check
        CHECK (duration_ms >= 0)
);

-- Indexes for efficient querying
CREATE INDEX idx_ml_requests_user ON ml_service_requests(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ml_requests_org ON ml_service_requests(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_ml_requests_created ON ml_service_requests(created_at DESC);
CREATE INDEX idx_ml_requests_service_endpoint ON ml_service_requests(service_name, endpoint);
CREATE INDEX idx_ml_requests_status ON ml_service_requests(status_code);
CREATE INDEX idx_ml_requests_user_created ON ml_service_requests(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Partial index for error tracking
CREATE INDEX idx_ml_requests_errors ON ml_service_requests(created_at DESC)
    WHERE status_code >= 400;

-- Comment for documentation
COMMENT ON TABLE ml_service_requests IS
    'Logs all requests to ML services (FastAPI, Django, NestJS) for audit, analytics, and debugging';
COMMENT ON COLUMN ml_service_requests.service_name IS
    'Which ML service backend handled this request';
COMMENT ON COLUMN ml_service_requests.credits_charged IS
    'Credits deducted from user balance for this request (0 if free tier or failed request)';
COMMENT ON COLUMN ml_service_requests.request_id IS
    'Correlation ID for distributed tracing across services';

-- ==================================================
-- ML SERVICE USAGE ANALYTICS (AGGREGATED)
-- ==================================================
-- Pre-aggregated daily usage statistics per user/org for performance
-- Updated by background job or trigger

CREATE TABLE IF NOT EXISTS ml_service_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Scope
    user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,                 -- Aggregation date (YYYY-MM-DD)

    -- Service and Endpoint
    service_name VARCHAR(50) NOT NULL,  -- 'fastapi', 'django', 'nestjs'
    endpoint_category VARCHAR(50) NOT NULL, -- 'embeddings', 'rag', 'analysis', 'complexity', 'transcription'

    -- Aggregated Metrics
    total_requests INTEGER NOT NULL DEFAULT 0,
    total_credits INTEGER NOT NULL DEFAULT 0,
    total_duration_ms BIGINT NOT NULL DEFAULT 0,
    avg_duration_ms INTEGER,            -- Calculated: total_duration_ms / total_requests
    success_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: one row per user/org/date/service/category
    CONSTRAINT ml_usage_unique
        UNIQUE(user_id, organization_id, date, service_name, endpoint_category),

    -- Constraints
    CONSTRAINT ml_usage_service_name_check
        CHECK (service_name IN ('fastapi', 'django', 'nestjs')),
    CONSTRAINT ml_usage_endpoint_category_check
        CHECK (endpoint_category IN ('embeddings', 'rag', 'analysis', 'complexity', 'transcription', 'other')),
    CONSTRAINT ml_usage_counts_check
        CHECK (total_requests >= 0 AND success_count >= 0 AND error_count >= 0),
    CONSTRAINT ml_usage_success_error_check
        CHECK (success_count + error_count = total_requests)
);

-- Indexes for analytics queries
CREATE INDEX idx_ml_usage_user_date ON ml_service_usage(user_id, date DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ml_usage_org_date ON ml_service_usage(organization_id, date DESC) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_ml_usage_date ON ml_service_usage(date DESC);
CREATE INDEX idx_ml_usage_service_category ON ml_service_usage(service_name, endpoint_category);

-- Comment for documentation
COMMENT ON TABLE ml_service_usage IS
    'Daily aggregated usage statistics for ML services per user/organization';
COMMENT ON COLUMN ml_service_usage.endpoint_category IS
    'High-level category of ML endpoint (embeddings, rag, analysis, etc.)';
COMMENT ON COLUMN ml_service_usage.avg_duration_ms IS
    'Average request duration for this day/category (updated on insert/update)';

-- Trigger to automatically update avg_duration_ms
CREATE OR REPLACE FUNCTION update_ml_usage_avg_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.total_requests > 0 THEN
        NEW.avg_duration_ms := (NEW.total_duration_ms / NEW.total_requests)::INTEGER;
    ELSE
        NEW.avg_duration_ms := 0;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ml_usage_avg_duration
    BEFORE INSERT OR UPDATE ON ml_service_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_ml_usage_avg_duration();

-- ==================================================
-- ML SERVICE CACHE (SHARED ACROSS SERVICES)
-- ==================================================
-- Caches ML service responses to reduce costs and improve performance
-- Shared cache across all three ML service implementations

CREATE TABLE IF NOT EXISTS ml_service_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Cache Key
    cache_key VARCHAR(255) UNIQUE NOT NULL, -- Human-readable cache key
    request_hash VARCHAR(64) NOT NULL,       -- SHA-256 hash of normalized request

    -- Request Context
    endpoint VARCHAR(255) NOT NULL,          -- Which endpoint was called
    service_name VARCHAR(50),                -- Which service generated this (optional)

    -- Cached Response
    response_data JSONB NOT NULL,            -- The cached response

    -- Cache Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,                  -- Optional expiration time (NULL = no expiration)
    hit_count INTEGER NOT NULL DEFAULT 0,    -- Number of times this cache entry was used
    last_hit_at TIMESTAMPTZ,                 -- Last time this cache was accessed

    -- Size tracking (for cache eviction strategies)
    size_bytes INTEGER,                      -- Approximate size of response_data

    -- Constraints
    CONSTRAINT ml_cache_service_name_check
        CHECK (service_name IS NULL OR service_name IN ('fastapi', 'django', 'nestjs')),
    CONSTRAINT ml_cache_hit_count_check
        CHECK (hit_count >= 0)
);

-- Indexes for fast cache lookups
CREATE INDEX idx_ml_cache_key ON ml_service_cache(cache_key);
CREATE INDEX idx_ml_cache_hash ON ml_service_cache(request_hash);
CREATE INDEX idx_ml_cache_expires ON ml_service_cache(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_ml_cache_endpoint ON ml_service_cache(endpoint);
CREATE INDEX idx_ml_cache_created ON ml_service_cache(created_at DESC);
CREATE INDEX idx_ml_cache_last_hit ON ml_service_cache(last_hit_at DESC) WHERE last_hit_at IS NOT NULL;

-- Partial index for frequently accessed cache entries
CREATE INDEX idx_ml_cache_hot ON ml_service_cache(hit_count DESC, last_hit_at DESC)
    WHERE hit_count > 10;

-- Comment for documentation
COMMENT ON TABLE ml_service_cache IS
    'Shared response cache for ML services to reduce costs and improve performance';
COMMENT ON COLUMN ml_service_cache.cache_key IS
    'Human-readable cache key (e.g., "embeddings:sha256:abc123")';
COMMENT ON COLUMN ml_service_cache.request_hash IS
    'SHA-256 hash of normalized request payload for collision detection';
COMMENT ON COLUMN ml_service_cache.hit_count IS
    'Number of times this cache entry was reused (for LRU/LFU eviction)';

-- ==================================================
-- CACHE CLEANUP FUNCTION
-- ==================================================
-- Function to remove expired cache entries
-- Should be called periodically by a cron job or background worker

CREATE OR REPLACE FUNCTION cleanup_expired_ml_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ml_service_cache
    WHERE expires_at IS NOT NULL
      AND expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_ml_cache IS
    'Removes expired cache entries. Returns number of deleted rows. Call periodically via cron.';

-- ==================================================
-- CACHE UPDATE TRIGGER
-- ==================================================
-- Automatically update last_hit_at and increment hit_count when cache is accessed

CREATE OR REPLACE FUNCTION update_ml_cache_hit()
RETURNS TRIGGER AS $$
BEGIN
    -- This function should be called by application code, not a trigger
    -- Left here for documentation of expected behavior
    RAISE NOTICE 'Cache hit tracking should be done via UPDATE query, not trigger';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Applications should update cache hits using:
-- UPDATE ml_service_cache
-- SET hit_count = hit_count + 1, last_hit_at = NOW()
-- WHERE cache_key = ?

-- ==================================================
-- HELPER FUNCTIONS FOR ANALYTICS
-- ==================================================

-- Get total ML requests for a user in a date range
CREATE OR REPLACE FUNCTION get_user_ml_request_count(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
    total_count INTEGER;
BEGIN
    SELECT COALESCE(SUM(total_requests), 0) INTO total_count
    FROM ml_service_usage
    WHERE user_id = p_user_id
      AND date >= p_start_date
      AND date <= p_end_date;

    RETURN total_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get total credits spent by user on ML services in date range
CREATE OR REPLACE FUNCTION get_user_ml_credits_spent(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
    total_credits INTEGER;
BEGIN
    SELECT COALESCE(SUM(total_credits), 0) INTO total_credits
    FROM ml_service_usage
    WHERE user_id = p_user_id
      AND date >= p_start_date
      AND date <= p_end_date;

    RETURN total_credits;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get ML service usage breakdown by endpoint category
CREATE OR REPLACE FUNCTION get_user_ml_usage_breakdown(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    endpoint_category VARCHAR(50),
    total_requests BIGINT,
    total_credits BIGINT,
    avg_duration_ms NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        msu.endpoint_category,
        SUM(msu.total_requests)::BIGINT AS total_requests,
        SUM(msu.total_credits)::BIGINT AS total_credits,
        AVG(msu.avg_duration_ms)::NUMERIC AS avg_duration_ms
    FROM ml_service_usage msu
    WHERE msu.user_id = p_user_id
      AND msu.date >= p_start_date
      AND msu.date <= p_end_date
    GROUP BY msu.endpoint_category
    ORDER BY total_requests DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==================================================
-- GRANTS AND PERMISSIONS
-- ==================================================
-- Grant necessary permissions to application user
-- Adjust these based on your actual database user setup

-- Grant SELECT, INSERT, UPDATE on ml_service_requests
GRANT SELECT, INSERT, UPDATE ON ml_service_requests TO postgres;

-- Grant SELECT, INSERT, UPDATE, DELETE on ml_service_usage
GRANT SELECT, INSERT, UPDATE, DELETE ON ml_service_usage TO postgres;

-- Grant SELECT, INSERT, UPDATE, DELETE on ml_service_cache
GRANT SELECT, INSERT, UPDATE, DELETE ON ml_service_cache TO postgres;

-- Grant EXECUTE on helper functions
GRANT EXECUTE ON FUNCTION cleanup_expired_ml_cache() TO postgres;
GRANT EXECUTE ON FUNCTION get_user_ml_request_count(UUID, DATE, DATE) TO postgres;
GRANT EXECUTE ON FUNCTION get_user_ml_credits_spent(UUID, DATE, DATE) TO postgres;
GRANT EXECUTE ON FUNCTION get_user_ml_usage_breakdown(UUID, DATE, DATE) TO postgres;

-- ==================================================
-- MIGRATION COMPLETE
-- ==================================================

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration 120: ML Service Shared Database Integration completed successfully';
    RAISE NOTICE 'Created tables: ml_service_requests, ml_service_usage, ml_service_cache';
    RAISE NOTICE 'Created functions: cleanup_expired_ml_cache, get_user_ml_*, update_ml_usage_avg_duration';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Configure ML services with DATABASE_URL';
    RAISE NOTICE '  2. Add request logging middleware to each ML service';
    RAISE NOTICE '  3. Set up cron job to call cleanup_expired_ml_cache() daily';
    RAISE NOTICE '  4. Set up background job to aggregate ml_service_requests into ml_service_usage';
END $$;
