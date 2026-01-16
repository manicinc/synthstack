/**
 * LLM Router Types
 * 
 * Centralized type definitions for the LLM routing system.
 */

// ============================================
// Provider Types
// ============================================

export type LLMProvider = 'openai' | 'anthropic' | 'openrouter';

// ============================================
// Model Tier Types
// ============================================

/**
 * Model tiers for cost/capability routing
 * - cheap: Fast, low-cost models for simple tasks (gpt-4o-mini, haiku)
 * - standard: Balanced models for general tasks (gpt-4o, sonnet-3.5)
 * - premium: Most capable models for complex tasks (opus-4)
 */
export type ModelTier = 'cheap' | 'standard' | 'premium';

/**
 * Task types for auto-routing decisions
 */
export type TaskType = 
  | 'classification'  // Simple categorization, tagging
  | 'generation'      // Content generation, writing
  | 'reasoning'       // Complex analysis, problem-solving
  | 'coding'          // Code generation, review
  | 'conversation'    // Chat, Q&A
  | 'summarization'   // Text summarization
  | 'extraction';     // Data/info extraction

// ============================================
// Model Configuration
// ============================================

export interface ModelConfig {
  /** Model identifier (e.g., 'gpt-4o', 'claude-3-5-sonnet-20241022') */
  id: string;
  /** Display name */
  name: string;
  /** Provider for this model */
  provider: LLMProvider;
  /** Cost tier */
  tier: ModelTier;
  /** Cost per 1K input tokens in USD */
  inputCostPer1kTokens: number;
  /** Cost per 1K output tokens in USD */
  outputCostPer1kTokens: number;
  /** Maximum context window */
  maxContextTokens: number;
  /** Maximum output tokens */
  maxOutputTokens: number;
  /** Supports streaming responses */
  supportsStreaming: boolean;
  /** Supports tool/function calling */
  supportsTools: boolean;
  /** Supports vision/images */
  supportsVision: boolean;
  /** Supports JSON mode */
  supportsJsonMode: boolean;
  /** Priority order within tier (lower = higher priority) */
  priority: number;
}

// ============================================
// Request/Response Types
// ============================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMRequestOptions {
  /** Messages for chat completion */
  messages: ChatMessage[];
  /** Explicit model to use (bypasses routing) */
  model?: string;
  /** Model tier for routing (if model not specified) */
  tier?: ModelTier;
  /** Task type hint for auto-routing */
  taskType?: TaskType;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Sampling temperature (0-2) */
  temperature?: number;
  /** Top-p sampling */
  topP?: number;
  /** Stream response */
  stream?: boolean;
  /** Available tools */
  tools?: ToolDefinition[];
  /** Force JSON response */
  jsonMode?: boolean;
  /** Custom stop sequences */
  stop?: string[];
  /** Request timeout in ms */
  timeout?: number;
  /** User identifier for tracking */
  userId?: string;
  /** Organization identifier for tracking */
  organizationId?: string;
  /** Session identifier for tracking */
  sessionId?: string;
  /** Request type for cost categorization */
  requestType?: string;
  /** Project identifier for tracking */
  projectId?: string;
  /** Agent slug for agent-based requests */
  agentSlug?: string;
}

export interface LLMResponse {
  /** Generated content */
  content: string;
  /** Model used */
  model: string;
  /** Provider used */
  provider: LLMProvider;
  /** Tool calls (if any) */
  toolCalls?: ToolCall[];
  /** Finish reason */
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
  /** Token usage */
  usage: TokenUsage;
  /** Response latency in ms */
  latencyMs: number;
  /** Estimated cost in USD */
  estimatedCost: number;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ============================================
// Streaming Types
// ============================================

export interface LLMStreamEvent {
  type: 'content' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolCall?: Partial<ToolCall>;
  error?: string;
  usage?: TokenUsage;
}

// ============================================
// Task Hints for Routing
// ============================================

export interface TaskHint {
  /** Explicit tier override */
  tier?: ModelTier;
  /** Task type for classification */
  taskType?: TaskType;
  /** Estimated complexity (for fine-grained routing) */
  estimatedComplexity?: 'low' | 'medium' | 'high';
  /** Require specific capabilities */
  requiresVision?: boolean;
  requiresTools?: boolean;
  requiresJsonMode?: boolean;
  /** Prefer specific provider */
  preferProvider?: LLMProvider;
  /** Maximum acceptable cost per request in USD */
  maxCost?: number;
}

// ============================================
// Error Types
// ============================================

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: LLMProvider,
    public readonly model: string,
    public readonly code: LLMErrorCode,
    public readonly retryable: boolean = false,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export type LLMErrorCode =
  | 'rate_limit'
  | 'quota_exceeded'
  | 'invalid_api_key'
  | 'model_not_found'
  | 'context_length_exceeded'
  | 'content_filter'
  | 'timeout'
  | 'network_error'
  | 'provider_error'
  | 'unknown';

// ============================================
// Adapter Interface
// ============================================

export interface LLMAdapter {
  /** Provider identifier */
  readonly provider: LLMProvider;
  
  /** Check if adapter is configured and ready */
  isAvailable(): boolean;
  
  /** Get supported models */
  getSupportedModels(): string[];
  
  /** Complete a chat request */
  chat(options: LLMRequestOptions, model: ModelConfig): Promise<LLMResponse>;
  
  /** Stream a chat request */
  streamChat(options: LLMRequestOptions, model: ModelConfig): AsyncGenerator<LLMStreamEvent>;
  
  /** Validate API key */
  validateApiKey(): Promise<boolean>;
}

// ============================================
// Router Configuration
// ============================================

export interface LLMRouterConfig {
  /** Default tier when not specified */
  defaultTier: ModelTier;
  /** Enable automatic task-based routing */
  autoRoute: boolean;
  /** Fallback chain enabled */
  enableFallbacks: boolean;
  /** Maximum fallback attempts */
  maxFallbackAttempts: number;
  /** Default timeout in ms */
  defaultTimeout: number;
  /** Log all requests */
  enableLogging: boolean;
  /** Track costs */
  enableCostTracking: boolean;
}

