-- ============================================
-- Migration 086: Update Free Tier Credits
-- ============================================
-- Increases free tier from 3 to 10 credits per day
-- Updates existing free users to new limit
-- ============================================

BEGIN;

-- Update subscription_plans table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
        UPDATE subscription_plans
        SET
            credits_per_day = 10,
            updated_at = NOW()
        WHERE tier = 'free';

        RAISE NOTICE 'Updated subscription_plans: free tier credits 3 → 10';

        -- Update features JSON array to reflect new credit count
        UPDATE subscription_plans
        SET features = jsonb_set(
            features,
            '{2}',  -- Index of the credits feature
            '"10 generations per day"'
        )
        WHERE tier = 'free'
          AND features::text LIKE '%3 generations per day%';

        RAISE NOTICE 'Updated subscription_plans: features text updated';
    END IF;
END $$;

-- Update existing free users' credit balance if needed
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_users') THEN
        -- Give existing free users at least 10 credits
        -- (Don't reduce if they have more)
        UPDATE app_users
        SET
            credits_remaining = GREATEST(credits_remaining, 10),
            updated_at = NOW()
        WHERE subscription_tier = 'free'
          AND (subscription_status = 'active' OR subscription_status IS NULL)
          AND credits_remaining < 10;

        RAISE NOTICE 'Updated existing free users to have at least 10 credits';
    END IF;
END $$;

COMMIT;

-- ============================================
-- Notes:
-- - Free users now get 10 credits/day instead of 3
-- - This makes registration more attractive than guest mode (5 credits)
-- - Existing users get bumped up immediately
-- - Daily reset will continue to reset to 10 going forward
-- ============================================
