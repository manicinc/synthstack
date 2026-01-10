/**
 * Feature Flags Boot File
 *
 * Registers the v-feature directive for conditional rendering
 * based on user feature access and subscription tier.
 *
 * Usage in templates:
 *   <AgentPanel v-feature="'ai_cofounders'" />
 *   <UpgradePrompt v-feature:hidden="'ai_cofounders'" />
 *   <Panel v-feature:tier="'premium'" />
 *   <Button v-feature:teaser="'ai_cofounders'" />
 */
import { boot } from 'quasar/wrappers';
import { featurePlugin } from '../directives/feature';
import { useFeatureStore } from '../stores/features';

export default boot(async ({ app }): Promise<void> => {
  // Register the v-feature directive
  app.use(featurePlugin);

  // Note: Feature store initialization is handled by the store's
  // auth watcher and should be triggered after auth is ready.
  // We don't initialize here to avoid race conditions with auth boot.
});
