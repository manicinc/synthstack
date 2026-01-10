/**
 * Migration 123: BYOK Feature Flags
 *
 * Adds three admin-configurable feature flags for BYOK (Bring Your Own Keys):
 * 1. byok_enabled - Controls UI visibility of BYOK settings (user-level, premium)
 * 2. byok_uses_internal_credits - Credit-first vs BYOK-first routing (system-level)
 * 3. byok_only_mode - Force BYOK-only, disable internal keys (system-level)
 *
 * User Flows:
 * - Flow A (Credit-First): byok_uses_internal_credits=true, byok_only_mode=false
 * - Flow B (BYOK-First):  byok_uses_internal_credits=false, byok_only_mode=false
 * - Flow C (BYOK-Only):   byok_only_mode=true
 */

-- Insert BYOK feature flags
INSERT INTO feature_flags (
  id,
  key,
  name,
  description,
  category,
  is_enabled,
  is_premium,
  min_tier,
  sort_order,
  created_at,
  updated_at
) VALUES
-- Flag 1: BYOK Enabled (User-level, Premium only)
(
  gen_random_uuid(),
  'byok_enabled',
  'BYOK Enabled',
  'Controls whether Bring Your Own Key feature is visible in user settings. Premium users only. When enabled, users can configure their own OpenAI/Anthropic API keys to use instead of internal credits.',
  'system',
  true,
  true,
  'premium',
  200,
  NOW(),
  NOW()
),
-- Flag 2: BYOK Uses Internal Credits First (System-level)
(
  gen_random_uuid(),
  'byok_uses_internal_credits',
  'Credit-First Mode',
  'When true: use internal credits first, fallback to BYOK when out. When false: use BYOK first (if configured), fallback to internal credits. Default: false (BYOK-first mode).',
  'system',
  false,
  false,
  null,
  201,
  NOW(),
  NOW()
),
-- Flag 3: BYOK-Only Mode (System-level, overrides flag #2)
(
  gen_random_uuid(),
  'byok_only_mode',
  'BYOK-Only Mode',
  'When true: NEVER use internal API keys, ONLY accept user BYOK. Forces all users to configure their own keys. Credits system effectively disabled. Default: false.',
  'system',
  false,
  false,
  null,
  202,
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_premium = EXCLUDED.is_premium,
  min_tier = EXCLUDED.min_tier,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Create index for system category flags (optimize queries for system flags)
CREATE INDEX IF NOT EXISTS idx_feature_flags_system
  ON feature_flags(category)
  WHERE category = 'system';

-- Add comment explaining the system category
COMMENT ON COLUMN feature_flags.category IS 'Categories: ai, integration, premium, experimental, system. System flags control platform-level behaviors.';

-- Add comments for BYOK flags
COMMENT ON TABLE feature_flags IS 'Feature flags for controlling access to features based on subscription tier and admin configuration. Includes per-user and system-level flags.';

-- Log migration success
DO $$
BEGIN
  RAISE NOTICE 'Migration 123: BYOK Feature Flags - Completed successfully';
  RAISE NOTICE '  - Added 3 BYOK feature flags';
  RAISE NOTICE '  - Added system category index';
  RAISE NOTICE '  - Default: BYOK-first mode (byok_uses_internal_credits=false, byok_only_mode=false)';
END $$;
