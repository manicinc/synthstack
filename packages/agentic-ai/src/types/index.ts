/**
 * @synthstack/agentic-ai
 *
 * Core type definitions and dependency injection interfaces
 */

// ============================================================================
// Database Adapter
// ============================================================================

export interface DatabaseAdapter {
  /**
   * Execute a SQL query
   */
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }>;

  /**
   * Get a database client for transactions
   */
  getClient(): Promise<DatabaseClient>;
}

export interface DatabaseClient {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
  release(): void;
}

// ============================================================================
// User & Authentication
// ============================================================================

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  [key: string]: any;
}

export interface AuthDependencies {
  /**
   * Get user by ID
   */
  getUserById(userId: string): Promise<User | null>;

  /**
   * Check if user has permission for an action
   */
  checkPermission(userId: string, action: string): Promise<boolean>;
}

// ============================================================================
// Credits & Billing
// ============================================================================

export interface CreditsDependencies {
  /**
   * Charge credits to user
   */
  chargeCredits(userId: string, amount: number, reason: string): Promise<void>;

  /**
   * Get user's credit balance
   */
  getCreditsBalance(userId: string): Promise<number>;
}

// ============================================================================
// RAG (Retrieval-Augmented Generation)
// ============================================================================

export interface RAGOptions {
  collection?: string;
  limit?: number;
  minScore?: number;
  sourceTypes?: string[];
  projectId?: string;
  agentSlug?: string;
}

export interface RAGResult {
  content: string;
  source: string;
  sourceType: string;
  relevanceScore: number;
  metadata?: Record<string, any>;
  collection?: string;
}

export interface RAGDependencies {
  /**
   * Search RAG knowledge base
   */
  ragSearch(query: string, options: RAGOptions): Promise<RAGResult[]>;
}

// ============================================================================
// Workflow Execution
// ============================================================================

export interface WorkflowResult {
  success: boolean;
  executionId?: string;
  output?: any;
  error?: string;
  creditsUsed?: number;
}

export interface WorkflowDependencies {
  /**
   * Execute a Node-RED workflow
   */
  executeWorkflow(flowId: string, input: any): Promise<WorkflowResult>;

  /**
   * Validate workflow exists and is accessible
   */
  validateWorkflow(flowId: string): Promise<boolean>;

  /**
   * Estimate credits required for workflow
   */
  estimateWorkflowCost?(flowId: string): Promise<number>;
}

// ============================================================================
// Audit Logging
// ============================================================================

export interface AuditEvent {
  userId: string;
  action: string;
  resource: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export interface AuditDependencies {
  /**
   * Log an audit event
   */
  logAuditEvent(event: AuditEvent): Promise<void>;
}

// ============================================================================
// LLM Client
// ============================================================================

/**
 * LLM Client interface compatible with OpenAI SDK
 * Using 'any' for flexible params to support all SDK overloads
 */
export interface LLMClient {
  chat: {
    completions: {
      create(params: any): Promise<any>;
    };
  };
}

// ============================================================================
// Logger
// ============================================================================

export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

// ============================================================================
// Complete Dependencies Interface
// ============================================================================

export interface AgenticAIDependencies
  extends AuthDependencies,
    CreditsDependencies,
    RAGDependencies,
    WorkflowDependencies,
    AuditDependencies {
  /**
   * Database adapter for queries and transactions
   */
  db: DatabaseAdapter;

  /**
   * LLM client (OpenAI or Anthropic compatible)
   */
  llmClient: LLMClient;

  /**
   * Optional logger (defaults to console)
   */
  logger?: Logger;
}

// ============================================================================
// Agent Configuration
// ============================================================================

export interface AgentConfig {
  slug: string;
  name: string;
  description: string;
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
  capabilities: string[];
  expertise: string[];
}

// ============================================================================
// Thread & Conversation
// ============================================================================

export interface Thread {
  id: string;
  userId: string;
  agentSlug: string;
  scope: 'global' | 'project';
  projectId?: string;
  title?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  threadId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface CreateThreadParams {
  userId: string;
  agentSlug: string;
  scope?: 'global' | 'project';
  projectId?: string;
  title?: string;
  metadata?: Record<string, any>;
}

export interface SendMessageParams {
  threadId: string;
  message: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface MessageResponse {
  success: boolean;
  answer: string;
  sources?: RAGResult[];
  memories?: Memory[];
  metadata?: Record<string, any>;
}

// ============================================================================
// Memory System
// ============================================================================

export type MemoryType =
  | 'insight'
  | 'decision'
  | 'fact'
  | 'action_item'
  | 'research'
  | 'preference'
  | 'feedback';

export interface Memory {
  id: string;
  threadId: string;
  userId: string;
  agentSlug: string;
  type: MemoryType;
  content: string;
  context?: string;
  confidence: number;
  importance: number;
  embedding?: number[];
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface CreateMemoryParams {
  threadId: string;
  userId: string;
  agentSlug: string;
  type: MemoryType;
  content: string;
  context?: string;
  confidence?: number;
  importance?: number;
}

// ============================================================================
// Approvals (Human-in-the-Loop)
// ============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ApprovalActionType =
  | 'workflow_execute'
  | 'external_api_call'
  | 'data_modification'
  | 'payment_process'
  | 'send_email'
  | 'create_resource'
  | 'delete_resource'
  | 'grant_permission'
  | 'integration_connect'
  | 'custom';

export interface Approval {
  id: string;
  threadId: string;
  userId: string;
  agentSlug: string;
  actionType: ApprovalActionType;
  riskLevel: RiskLevel;
  description: string;
  details: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  expiresAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  createdAt: Date;
}

export interface RequestApprovalParams {
  threadId: string;
  userId: string;
  agentSlug: string;
  actionType: ApprovalActionType;
  riskLevel: RiskLevel;
  description: string;
  details: Record<string, any>;
  expiresInMinutes?: number;
}

export interface ReviewApprovalParams {
  approvalId: string;
  approved: boolean;
  reviewedBy: string;
  notes?: string;
}

// ============================================================================
// Tool Execution
// ============================================================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  requiresApproval: boolean;
  riskLevel: RiskLevel;
  creditsRequired?: number;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  creditsUsed?: number;
  requiresApproval?: boolean;
  approvalId?: string;
}

// ============================================================================
// Orchestration
// ============================================================================

export interface DelegationPlan {
  agents: string[];
  reasoning: string;
  parallel: boolean;
}

export interface AgentResponse {
  agentSlug: string;
  response: string;
  confidence: number;
  sources?: RAGResult[];
  toolsUsed?: string[];
}

export interface OrchestratedResponse {
  answer: string;
  responses: AgentResponse[];
  delegationPlan: DelegationPlan;
  synthesisReasoning: string;
}

// ============================================================================
// Service Interface
// ============================================================================

export interface AgenticAIService {
  // Thread Management
  createThread(params: CreateThreadParams): Promise<Thread>;
  listThreads(params: { userId: string; limit?: number }): Promise<Thread[]>;
  getThread(params: { threadId: string }): Promise<Thread | null>;
  deleteThread(params: { threadId: string }): Promise<void>;
  getThreadHistory(params: {
    threadId: string;
    limit?: number;
  }): Promise<Message[]>;

  // Messaging
  sendMessage(params: SendMessageParams): Promise<MessageResponse>;
  streamMessage(
    params: SendMessageParams
  ): AsyncGenerator<{ content: string; done: boolean }>;

  // Memory
  listMemories(params: {
    threadId?: string;
    userId?: string;
    types?: MemoryType[];
    limit?: number;
  }): Promise<Memory[]>;
  searchMemories(params: {
    query: string;
    userId?: string;
    agentSlug?: string;
    types?: MemoryType[];
    limit?: number;
  }): Promise<Memory[]>;
  createMemory(params: CreateMemoryParams): Promise<Memory>;

  // Approvals
  listPendingApprovals(params: { userId: string }): Promise<Approval[]>;
  getApproval(params: { approvalId: string }): Promise<Approval | null>;
  reviewApproval(params: ReviewApprovalParams): Promise<void>;

  // Tools
  listAvailableTools(): ToolDefinition[];
  executeTool(params: {
    threadId: string;
    toolName: string;
    parameters: Record<string, any>;
  }): Promise<ToolExecutionResult>;
}
