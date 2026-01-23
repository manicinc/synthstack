/**
 * Test fixtures for user AI settings functionality
 */

// ============================================
// AI SETTINGS FIXTURES
// ============================================

export interface TestAISettings {
  id?: string;
  userId: string;
  globalModel: string | null;
  globalModelTier: 'cheap' | 'standard' | 'premium';
  agentModelOverrides: Record<string, string>;
  defaultTemperature: number;
  maxContextTokens: number;
  includeProjectContext: boolean;
  streamResponses: boolean;
  showReasoning: boolean;
}

export const TEST_AI_SETTINGS: Record<string, TestAISettings> = {
  defaults: {
    userId: '00000000-0000-0000-0000-000000000002',
    globalModel: null,
    globalModelTier: 'standard',
    agentModelOverrides: {},
    defaultTemperature: 0.7,
    maxContextTokens: 8000,
    includeProjectContext: true,
    streamResponses: true,
    showReasoning: false,
  },

  customModel: {
    userId: '00000000-0000-0000-0000-000000000005',
    globalModel: 'claude-opus-4-20250514',
    globalModelTier: 'premium',
    agentModelOverrides: {},
    defaultTemperature: 0.7,
    maxContextTokens: 8000,
    includeProjectContext: true,
    streamResponses: true,
    showReasoning: false,
  },

  withOverrides: {
    userId: '00000000-0000-0000-0000-000000000003',
    globalModel: 'claude-sonnet-4-20250514',
    globalModelTier: 'standard',
    agentModelOverrides: {
      developer: 'claude-opus-4-20250514',
      researcher: 'gpt-4o',
      analyst: 'claude-3-haiku-20240307',
    },
    defaultTemperature: 0.5,
    maxContextTokens: 16000,
    includeProjectContext: true,
    streamResponses: true,
    showReasoning: true,
  },

  lowCost: {
    userId: '00000000-0000-0000-0000-000000000004',
    globalModel: 'gpt-4o-mini',
    globalModelTier: 'cheap',
    agentModelOverrides: {},
    defaultTemperature: 0.3,
    maxContextTokens: 4000,
    includeProjectContext: false,
    streamResponses: false,
    showReasoning: false,
  },

  premium: {
    userId: '00000000-0000-0000-0000-000000000006',
    globalModel: 'claude-opus-4-20250514',
    globalModelTier: 'premium',
    agentModelOverrides: {
      developer: 'o1',
      strategist: 'claude-opus-4-20250514',
    },
    defaultTemperature: 0.8,
    maxContextTokens: 32000,
    includeProjectContext: true,
    streamResponses: true,
    showReasoning: true,
  },
};

// ============================================
// AI SETTINGS UPDATE FIXTURES
// ============================================

export interface TestAISettingsUpdate {
  globalModel?: string | null;
  globalModelTier?: 'cheap' | 'standard' | 'premium';
  agentModelOverrides?: Record<string, string>;
  defaultTemperature?: number;
  maxContextTokens?: number;
  includeProjectContext?: boolean;
  streamResponses?: boolean;
  showReasoning?: boolean;
}

export const TEST_AI_SETTINGS_UPDATES: Record<string, TestAISettingsUpdate> = {
  changeModel: {
    globalModel: 'gpt-4o',
    globalModelTier: 'standard',
  },

  updateTemperature: {
    defaultTemperature: 0.9,
  },

  addOverride: {
    agentModelOverrides: {
      developer: 'claude-opus-4-20250514',
    },
  },

  toggleFeatures: {
    includeProjectContext: false,
    streamResponses: false,
    showReasoning: true,
  },

  fullUpdate: {
    globalModel: 'claude-opus-4-20250514',
    globalModelTier: 'premium',
    agentModelOverrides: {
      developer: 'o1',
      researcher: 'gpt-4o',
    },
    defaultTemperature: 0.6,
    maxContextTokens: 24000,
    includeProjectContext: true,
    streamResponses: true,
    showReasoning: true,
  },

  resetToDefaults: {
    globalModel: null,
    globalModelTier: 'standard',
    agentModelOverrides: {},
    defaultTemperature: 0.7,
    maxContextTokens: 8000,
    includeProjectContext: true,
    streamResponses: true,
    showReasoning: false,
  },

  invalidTemperature: {
    defaultTemperature: 2.5, // Invalid: should be 0-1
  },

  invalidTokens: {
    maxContextTokens: -100, // Invalid: should be positive
  },
};

// ============================================
// DATABASE ROW FIXTURES
// ============================================

export interface TestAISettingsDBRow {
  id: string;
  user_id: string;
  global_model: string | null;
  global_model_tier: string;
  agent_model_overrides: object;
  default_temperature: number;
  max_context_tokens: number;
  include_project_context: boolean;
  stream_responses: boolean;
  show_reasoning: boolean;
  date_created: Date;
  date_updated: Date;
}

export const TEST_AI_SETTINGS_DB_ROWS: Record<string, TestAISettingsDBRow> = {
  existing: {
    id: '00000000-0000-0000-0000-000000000301',
    user_id: '00000000-0000-0000-0000-000000000002',
    global_model: 'claude-sonnet-4-20250514',
    global_model_tier: 'standard',
    agent_model_overrides: { developer: 'claude-opus-4-20250514' },
    default_temperature: 0.7,
    max_context_tokens: 8000,
    include_project_context: true,
    stream_responses: true,
    show_reasoning: false,
    date_created: new Date('2024-01-01'),
    date_updated: new Date('2024-01-15'),
  },

  premium: {
    id: '00000000-0000-0000-0000-000000000302',
    user_id: '00000000-0000-0000-0000-000000000005',
    global_model: 'claude-opus-4-20250514',
    global_model_tier: 'premium',
    agent_model_overrides: {},
    default_temperature: 0.5,
    max_context_tokens: 16000,
    include_project_context: true,
    stream_responses: true,
    show_reasoning: true,
    date_created: new Date('2024-02-01'),
    date_updated: new Date('2024-02-01'),
  },
};

