/**
 * Premium nodes that incur additional credit costs
 * These nodes typically make external API calls or use AI services
 */
export const PREMIUM_NODES: Record<string, number> = {
  // AI/LLM nodes - highest cost
  'synthstack-agent': 3,
  'synthstack-openai': 2,
  'synthstack-anthropic': 2,
  'synthstack-gemini': 2,

  // External API integrations - medium cost
  'synthstack-slack': 1,
  'synthstack-discord': 1,
  'synthstack-twilio': 2,
  'synthstack-gmail': 1,
  'synthstack-notion': 1,
  'synthstack-github': 1,
  'synthstack-jira': 1,
  'synthstack-sheets': 1,
  'synthstack-drive': 1,

  // Payment/financial - higher cost due to sensitivity
  'synthstack-stripe': 2,

  // Directus operations - base cost (included)
  'synthstack-directus': 0,

  // Knowledge base - medium cost (vector search)
  'synthstack-kb': 1,
};

/**
 * Get the credit cost for a node type
 */
export function getNodeCreditCost(nodeType: string): number {
  return PREMIUM_NODES[nodeType] ?? 0;
}

/**
 * Check if a node type is a premium node (cost > 0)
 */
export function isPremiumNode(nodeType: string): boolean {
  return nodeType in PREMIUM_NODES && PREMIUM_NODES[nodeType] > 0;
}

/**
 * Get all premium node types
 */
export function getPremiumNodeTypes(): string[] {
  return Object.entries(PREMIUM_NODES)
    .filter(([, cost]) => cost > 0)
    .map(([type]) => type);
}
