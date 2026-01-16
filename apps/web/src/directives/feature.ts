/**
 * @file feature.ts
 * @description Vue directive for feature-gated content.
 *
 * Usage:
 *
 * 1. Show element only if user has feature:
 *    <AgentPanel v-feature="'ai_cofounders'" />
 *
 * 2. Hide element if user has feature (show upgrade prompt):
 *    <UpgradePrompt v-feature:hidden="'ai_cofounders'" />
 *
 * 3. Multiple features (requires ALL):
 *    <Panel v-feature="['ai_cofounders', 'ai_suggestions']" />
 *
 * 4. Check tier instead of feature:
 *    <Panel v-feature:tier="'premium'" />
 *
 * 5. Show disabled/teaser state (element visible but grayed out):
 *    <Button v-feature:teaser="'ai_cofounders'" />
 */

import type { Directive, DirectiveBinding } from 'vue'
import { useFeatureStore, type UserTier } from '../stores/features'

// ============================================
// Types
// ============================================

type FeatureValue = string | string[]

interface FeatureModifiers {
  hidden?: boolean  // Invert logic (show when NOT having feature)
  tier?: boolean    // Check tier instead of feature
  teaser?: boolean  // Show as disabled/teaser instead of hiding
}

// ============================================
// Directive Implementation
// ============================================

const featureDirective: Directive<HTMLElement, FeatureValue> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<FeatureValue>) {
    updateElement(el, binding)
  },

  updated(el: HTMLElement, binding: DirectiveBinding<FeatureValue>) {
    updateElement(el, binding)
  },
}

function updateElement(el: HTMLElement, binding: DirectiveBinding<FeatureValue>) {
  const featureStore = useFeatureStore()
  const modifiers = binding.modifiers as FeatureModifiers
  const value = binding.value

  let hasAccess = false

  if (modifiers.tier) {
    // Check tier level
    hasAccess = checkTier(featureStore.tier, value as UserTier)
  } else {
    // Check feature(s)
    hasAccess = checkFeatures(featureStore, value)
  }

  // Invert if using :hidden modifier
  if (modifiers.hidden) {
    hasAccess = !hasAccess
  }

  // Apply visibility
  if (modifiers.teaser) {
    // Teaser mode: show but style as disabled
    applyTeaserStyle(el, !hasAccess)
  } else {
    // Normal mode: show/hide
    el.style.display = hasAccess ? '' : 'none'
  }
}

function checkFeatures(store: ReturnType<typeof useFeatureStore>, value: FeatureValue): boolean {
  const features = Array.isArray(value) ? value : [value]
  return features.every(feature => store.hasFeature(feature))
}

function checkTier(userTier: UserTier, requiredTier: UserTier): boolean {
  const tierOrder: Record<UserTier, number> = {
    community: 0,
    subscriber: 1,
    premium: 2,
    lifetime: 3,
  }
  return tierOrder[userTier] >= tierOrder[requiredTier]
}

function applyTeaserStyle(el: HTMLElement, isTeaser: boolean): void {
  if (isTeaser) {
    el.classList.add('feature-teaser')
    el.style.opacity = '0.5'
    el.style.pointerEvents = 'none'
    el.setAttribute('data-feature-locked', 'true')
    el.setAttribute('title', 'Upgrade to Premium to unlock this feature')
  } else {
    el.classList.remove('feature-teaser')
    el.style.opacity = ''
    el.style.pointerEvents = ''
    el.removeAttribute('data-feature-locked')
    el.removeAttribute('title')
  }
}

// ============================================
// Plugin Export
// ============================================

export const featurePlugin = {
  install(app: any) {
    app.directive('feature', featureDirective)
  },
}

export default featureDirective
