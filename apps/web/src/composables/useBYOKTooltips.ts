import { inject } from 'vue';
import type { InjectionKey } from 'vue';

/**
 * BYOK Tooltip Content Type
 */
export interface BYOKTooltipContent {
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface BYOKTooltips {
  provider: BYOKTooltipContent;
  rateLimits: BYOKTooltipContent;
  usageStats: BYOKTooltipContent;
  fallback: BYOKTooltipContent;
  validation: BYOKTooltipContent;
  routingMode: BYOKTooltipContent;
  creditSavings: BYOKTooltipContent;
  keySource: BYOKTooltipContent;
  security: BYOKTooltipContent;
  costEstimation: BYOKTooltipContent;
}

export const byokTooltipsKey: InjectionKey<BYOKTooltips> = Symbol('byokTooltips');

/**
 * Composable to access BYOK tooltip content
 *
 * Must be used within a component wrapped by <BYOKTooltips>
 */
export function useBYOKTooltips() {
  const tooltips = inject(byokTooltipsKey);

  if (!tooltips) {
    throw new Error('useBYOKTooltips must be used within a BYOKTooltips component');
  }

  return tooltips;
}
