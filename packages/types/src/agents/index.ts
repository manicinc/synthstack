/**
 * AI Agent types for SynthStack
 */

export type AgentSlug =
  | 'ceo'
  | 'cto'
  | 'cmo'
  | 'cfo'
  | 'designer'
  | 'developer'
  | 'analyst'
  | 'writer'
  | 'marketer'
  | 'support';

export interface Agent {
  id: string;
  slug: AgentSlug;
  name: string;
  title: string;
  description: string;
  avatar: string;
  systemPrompt: string;
  capabilities: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface AgentSession {
  id: string;
  userId: string;
  agentSlug: AgentSlug;
  projectId?: string;
  title?: string;
  messages: AgentMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AgentRequest {
  agentSlug: AgentSlug;
  message: string;
  sessionId?: string;
  projectId?: string;
  context?: AgentContext;
}

export interface AgentContext {
  projectFiles?: string[];
  previousMessages?: AgentMessage[];
  userPreferences?: Record<string, unknown>;
}

export interface AgentResponse {
  message: string;
  sessionId: string;
  suggestions?: AgentSuggestion[];
  actions?: AgentAction[];
  creditsUsed: number;
}

export interface AgentSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export type SuggestionType =
  | 'code_improvement'
  | 'documentation'
  | 'security'
  | 'performance'
  | 'feature'
  | 'bug_fix';

export interface AgentAction {
  type: AgentActionType;
  payload: Record<string, unknown>;
}

export type AgentActionType =
  | 'create_file'
  | 'edit_file'
  | 'create_task'
  | 'send_notification'
  | 'schedule_meeting';
