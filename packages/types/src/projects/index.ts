/**
 * Project types for SynthStack
 */

export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  ownerId: string;
  githubRepo?: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  settings?: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = 'active' | 'archived' | 'paused' | 'deleted';
export type ProjectVisibility = 'private' | 'team' | 'public';

export interface ProjectSettings {
  enableWorkflows: boolean;
  enableOrchestration: boolean;
  defaultAgents: string[];
  notificationPreferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  slack: boolean;
  discord: boolean;
}

export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  invitedBy?: string;
  invitedAt?: string;
  joinedAt: string;
  permissions: ProjectPermissions;
  profile: TeamMemberProfile;
  /** User display info (populated from directus_users) */
  displayName?: string;
  email?: string;
  avatarUrl?: string;
}

/**
 * Team member profile for AI-aware task assignment
 * Contains skills, availability, and preferences that AI agents reference
 */
export interface TeamMemberProfile {
  /** Job title/role description, e.g., "Lead Developer", "Marketing Manager" */
  roleTitle: string;
  /** List of skills, e.g., ["Vue", "TypeScript", "SEO"] */
  skills: string[];
  /** Areas of expertise, e.g., ["frontend", "marketing", "research"] */
  expertiseAreas: string[];
  /** Current availability status */
  availability: MemberAvailability;
  /** Current workload as percentage 0-100 */
  capacityPercent: number;
  /** Preferred types of tasks, e.g., ["development", "content-writing"] */
  preferredTaskTypes: string[];
  /** Short bio/description */
  bio?: string;
}

export type MemberAvailability = 'available' | 'busy' | 'away';

/**
 * Default empty profile for new members
 */
export const DEFAULT_MEMBER_PROFILE: TeamMemberProfile = {
  roleTitle: 'Team Member',
  skills: [],
  expertiseAreas: [],
  availability: 'available',
  capacityPercent: 100,
  preferredTaskTypes: [],
};

export interface ProjectPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canManageWorkflows: boolean;
  canManageAgents: boolean;
  canViewBilling: boolean;
}

export interface ProjectInvite {
  id: string;
  projectId: string;
  email: string;
  role: ProjectRole;
  invitedBy: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  createdBy: string;
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// ============================================
// Team Context for AI Agents
// ============================================

/**
 * Team context data passed to AI agents for team-aware responses
 */
export interface TeamContext {
  projectId: string;
  members: TeamContextMember[];
}

/**
 * Simplified member info for AI context injection
 */
export interface TeamContextMember {
  id: string;
  userId: string;
  displayName: string;
  role: ProjectRole;
  profile: TeamMemberProfile;
}

/**
 * AI-suggested assignee for a task
 */
export interface AssignmentSuggestion {
  memberId: string;
  userId: string;
  displayName: string;
  matchScore: number;
  matchReasons: string[];
}

/**
 * Request params for suggesting task assignee
 */
export interface SuggestAssigneeRequest {
  taskDescription?: string;
  requiredSkills?: string[];
  taskType?: string;
}

// ============================================
// Task Dependencies
// ============================================

/**
 * Dependency relationship type
 */
export type TaskDependencyType = 'blocks' | 'related' | 'subtask';

/**
 * Task dependency relationship
 */
export interface TaskDependency {
  id: string;
  /** The task that has the dependency */
  taskId: string;
  /** The task that must be completed first (blocks this task) */
  dependsOnId: string;
  /** Type of dependency relationship */
  dependencyType: TaskDependencyType;
  /** When the dependency was created */
  createdAt: string;
  /** User who created the dependency */
  createdBy?: string;
}

/**
 * Extended task with dependency information
 */
export interface ProjectTaskWithDependencies extends ProjectTask {
  /** Tasks that this task depends on (must be done first) */
  dependencies: TaskDependency[];
  /** Tasks that depend on this task (blocked by this task) */
  dependents: TaskDependency[];
  /** Whether this task is blocked by uncompleted dependencies */
  isBlocked: boolean;
  /** IDs of tasks blocking this one */
  blockedByIds: string[];
}

/**
 * Request to create a task dependency
 */
export interface CreateTaskDependencyRequest {
  /** The task that depends on another */
  taskId: string;
  /** The task that must be completed first */
  dependsOnId: string;
  /** Type of dependency (default: 'blocks') */
  dependencyType?: TaskDependencyType;
}

/**
 * Dependency graph for a project
 */
export interface TaskDependencyGraph {
  projectId: string;
  /** Map of task ID to list of tasks it depends on */
  dependencies: Record<string, string[]>;
  /** Map of task ID to list of tasks that depend on it */
  dependents: Record<string, string[]>;
  /** Tasks with no dependencies (can start immediately) */
  rootTasks: string[];
  /** Tasks with no dependents (final outcomes) */
  leafTasks: string[];
  /** Detected cycles (if any) */
  cycles: string[][];
}
