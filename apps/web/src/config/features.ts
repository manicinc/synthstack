/**
 * @file config/features.ts
 * @description Feature flags for COMMUNITY vs PRO versions
 *
 * SynthStack Community Edition:
 * - Core features: CMS, Billing, Auth, Projects
 * - NO AI Copilot, Workflows, or Referrals
 *
 * These flags are hardcoded to false in Community Edition.
 * In PRO edition, they are controlled via environment variables.
 */

/**
 * Feature flags - COMMUNITY EDITION: All PRO features disabled
 */
export const FEATURES = {
  /**
   * AI Copilot & Agentic AI System (PRO only)
   * COMMUNITY: Disabled - feature not available
   */
  COPILOT: false,

  /**
   * Referral & Rewards System (PRO only)
   * COMMUNITY: Disabled - feature not available
   */
  REFERRALS: false,

  /**
   * Node-RED Workflow System (PRO only)
   * COMMUNITY: Disabled - feature not available
   */
  WORKFLOWS: false,
} as const;

/**
 * COMMUNITY EDITION: Always false
 */
export const isPro = false;

/**
 * COMMUNITY EDITION: Always true
 */
export const isCommunity = true;

/**
 * Get version name
 */
export const versionName = 'COMMUNITY';

/**
 * Log feature configuration (useful for debugging)
 */
if (import.meta.env.DEV) {
  console.log('🎯 SynthStack Community Edition');
  console.log('   PRO features (Copilot, Referrals, Workflows) are not available.');
}
