/**
 * Cost calculation constants
 */
export const COST_CONSTANTS = {
  /** Minimum 1 credit per execution */
  BASE_COST: 1,
  /** Duration threshold in milliseconds (30 seconds) */
  DURATION_THRESHOLD_MS: 30000,
  /** Credits charged per duration unit (30s) */
  DURATION_COST_PER_UNIT: 1,
  /** Node count threshold */
  NODES_THRESHOLD: 10,
  /** Credits charged per complexity unit (10 nodes) */
  COMPLEXITY_COST_PER_UNIT: 1,
  /** Maximum credits per execution */
  MAX_COST_CAP: 100,
} as const;

export type CostConstants = typeof COST_CONSTANTS;
