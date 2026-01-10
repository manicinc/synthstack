-- ============================================
-- Migration 085: Update Agency Tier Pricing
-- ============================================
-- Changes Agency tier from $79.99/mo to $49.99/mo
-- Yearly changes from $799.90 to $499.90 (~17% savings)
-- ============================================

BEGIN;

-- Update subscription_plans table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscription_plans') THEN
        UPDATE subscription_plans
        SET
            monthly_price = 4999,  -- $49.99 in cents
            yearly_price = 49990,  -- $499.90 in cents
            updated_at = NOW()
        WHERE tier = 'agency';

        RAISE NOTICE 'Updated subscription_plans: agency tier pricing';
    END IF;
END $$;

-- Update pricing_tiers table if it exists (Directus CMS)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pricing_tiers') THEN
        UPDATE pricing_tiers
        SET
            price = 4999,
            yearly_price = 49990,
            updated_at = NOW()
        WHERE slug = 'agency';

        RAISE NOTICE 'Updated pricing_tiers: agency tier pricing';
    END IF;
END $$;

COMMIT;

-- ============================================
-- Notes:
-- - Stripe Price IDs are NOT changed here
-- - Update environment variables separately:
--   STRIPE_PRICE_AGENCY=<new_monthly_price_id>
--   STRIPE_PRICE_AGENCY_YEARLY=<new_yearly_price_id>
-- - Create new prices in Stripe dashboard first
-- ============================================
