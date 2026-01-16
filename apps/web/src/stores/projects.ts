/**
 * @file projects.ts
 * @description Pinia store for managing projects, todos, milestones, and marketing plans.
 *
 * This store provides:
 * - State management for all project-related entities
 * - CRUD operations with API integration
 * - AI Copilot suggestions integration
 * - Computed getters for filtered/sorted data
 *
 * @module stores/projects
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { devLog, logError } from '@/utils/devLogger';
import {
  projects as projectsApi,
  type Project,
  type ProjectTag,
  type Todo,
  type Milestone,
  type MarketingPlan,
  type ProjectStatus,
  type TodoStatus,
  type TodoPriority
} from '@/services/api';

// =========================================
// Local (Guest) Storage
// =========================================

const LOCAL_PROJECTS_STORAGE_KEY = 'synthstack_local_projects_v1';
const LOCAL_PROJECTS_STORAGE_VERSION = 1;

// Session-only cache for demo mode (system project modifications)
// This resets on page reload - perfect for "try before you buy" experience
const DEMO_SESSION_KEY = 'synthstack_demo_session';

type LocalProjectData = {
  version: number;
  projects: Project[];
  todosByProject: Record<string, Todo[]>;
  milestonesByProject: Record<string, Milestone[]>;
  marketingPlansByProject: Record<string, MarketingPlan[]>;
};

type DemoSessionData = {
  todosByProject: Record<string, Todo[]>;
  milestonesByProject: Record<string, Milestone[]>;
  marketingPlansByProject: Record<string, MarketingPlan[]>;
  // Track which items have been deleted (so we don't show them)
  deletedTodos: Record<string, Set<string>>;
  deletedMilestones: Record<string, Set<string>>;
  deletedMarketingPlans: Record<string, Set<string>>;
};

function createDemoSessionData(): DemoSessionData {
  return {
    todosByProject: {},
    milestonesByProject: {},
    marketingPlansByProject: {},
    deletedTodos: {},
    deletedMilestones: {},
    deletedMarketingPlans: {},
  };
}

// In-memory demo session (clears on page reload)
let demoSession: DemoSessionData = createDemoSessionData();

function loadDemoSession(): DemoSessionData {
  // Try to load from sessionStorage (persists across tab refreshes within session)
  if (typeof window === 'undefined') return demoSession;

  try {
    const raw = sessionStorage.getItem(DEMO_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Convert deleted arrays back to Sets - ensure all fields are present
      demoSession = {
        // Start with defaults to ensure all fields exist
        todosByProject: parsed.todosByProject || {},
        milestonesByProject: parsed.milestonesByProject || {},
        marketingPlansByProject: parsed.marketingPlansByProject || {},
        // Convert deleted arrays back to Sets with defensive checks
        deletedTodos: Object.fromEntries(
          Object.entries(parsed.deletedTodos || {}).map(([k, v]) => [k, new Set(v as string[])])
        ),
        deletedMilestones: Object.fromEntries(
          Object.entries(parsed.deletedMilestones || {}).map(([k, v]) => [k, new Set(v as string[])])
        ),
        deletedMarketingPlans: Object.fromEntries(
          Object.entries(parsed.deletedMarketingPlans || {}).map(([k, v]) => [k, new Set(v as string[])])
        ),
      };
    }
  } catch {
    // Ignore parse errors - reset to defaults
    demoSession = createDemoSessionData();
  }

  // Extra safety: ensure all required fields exist
  if (!demoSession.deletedTodos) demoSession.deletedTodos = {};
  if (!demoSession.deletedMilestones) demoSession.deletedMilestones = {};
  if (!demoSession.deletedMarketingPlans) demoSession.deletedMarketingPlans = {};
  if (!demoSession.todosByProject) demoSession.todosByProject = {};
  if (!demoSession.milestonesByProject) demoSession.milestonesByProject = {};
  if (!demoSession.marketingPlansByProject) demoSession.marketingPlansByProject = {};

  return demoSession;
}

function saveDemoSession(): void {
  if (typeof window === 'undefined') return;

  try {
    // Convert Sets to arrays for JSON serialization
    const serializable = {
      ...demoSession,
      deletedTodos: Object.fromEntries(
        Object.entries(demoSession.deletedTodos).map(([k, v]) => [k, Array.from(v)])
      ),
      deletedMilestones: Object.fromEntries(
        Object.entries(demoSession.deletedMilestones).map(([k, v]) => [k, Array.from(v)])
      ),
      deletedMarketingPlans: Object.fromEntries(
        Object.entries(demoSession.deletedMarketingPlans).map(([k, v]) => [k, Array.from(v)])
      ),
    };
    sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(serializable));
  } catch {
    // Ignore storage errors
  }
}

function safeNowIso(): string {
  return new Date().toISOString();
}

function createLocalProjectData(): LocalProjectData {
  return {
    version: LOCAL_PROJECTS_STORAGE_VERSION,
    projects: [],
    todosByProject: {},
    milestonesByProject: {},
    marketingPlansByProject: {},
  };
}

function generateId(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return (crypto as any).randomUUID();
    }
  } catch {
    // ignore
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function loadLocalProjects(): LocalProjectData {
  if (typeof window === 'undefined') return createLocalProjectData();

  try {
    const raw = localStorage.getItem(LOCAL_PROJECTS_STORAGE_KEY);
    devLog('[Projects] Loading from localStorage, raw length:', raw?.length || 0);
    if (!raw) {
      devLog('[Projects] No localStorage data found');
      return createLocalProjectData();
    }

    const parsed = JSON.parse(raw) as LocalProjectData;
    devLog('[Projects] Parsed localStorage:', {
      version: parsed?.version,
      projectCount: parsed?.projects?.length || 0,
      projectNames: parsed?.projects?.map(p => p.name) || []
    });
    if (!parsed || parsed.version !== LOCAL_PROJECTS_STORAGE_VERSION) {
      devLog('[Projects] Version mismatch, expected:', LOCAL_PROJECTS_STORAGE_VERSION, 'got:', parsed?.version);
      return createLocalProjectData();
    }

    return {
      ...createLocalProjectData(),
      ...parsed,
    };
  } catch (err) {
    logError('[Projects] Failed to load localStorage:', err);
    return createLocalProjectData();
  }
}

function saveLocalProjects(data: LocalProjectData): void {
  if (typeof window === 'undefined') return;
  try {
    const json = JSON.stringify(data);
    localStorage.setItem(LOCAL_PROJECTS_STORAGE_KEY, json);
    devLog('[Projects] Saved to localStorage:', {
      projectCount: data.projects?.length || 0,
      projectNames: data.projects?.map(p => p.name) || [],
      jsonLength: json.length
    });
  } catch (err) {
    logError('[Projects] Failed to save localStorage:', err);
  }
}

function computeProjectCounts(data: LocalProjectData, projectId: string): {
  todoCount: number;
  completedTodoCount: number;
  milestoneCount: number;
} {
  const todos = data.todosByProject[projectId] || [];
  const milestones = data.milestonesByProject[projectId] || [];
  const completedTodoCount = todos.filter(t => t.status === 'completed').length;
  return {
    todoCount: todos.length,
    completedTodoCount,
    milestoneCount: milestones.length,
  };
}

function withComputedCounts(data: LocalProjectData): LocalProjectData {
  data.projects = data.projects.map((project) => {
    const counts = computeProjectCounts(data, project.id);
    return {
      ...project,
      todoCount: counts.todoCount,
      completedTodoCount: counts.completedTodoCount,
      milestoneCount: counts.milestoneCount,
    };
  });
  return data;
}

/**
 * Projects store for managing project lifecycle and related entities
 */
export const useProjectsStore = defineStore('projects', () => {
  const authStore = useAuthStore();

  // =========================================
  // State
  // =========================================

  /** List of all projects */
  const projects = ref<Project[]>([]);

  /** Currently selected/active project */
  const currentProject = ref<Project | null>(null);

  /** Todos for the current project */
  const todos = ref<Todo[]>([]);

  /** Milestones for the current project */
  const milestones = ref<Milestone[]>([]);

  /** Marketing plans for the current project */
  const marketingPlans = ref<MarketingPlan[]>([]);

  /** Loading states */
  const loading = ref({
    projects: false,
    project: false,
    todos: false,
    milestones: false,
    marketingPlans: false,
    copilot: false
  });

  /** Error state */
  const error = ref<string | null>(null);

  /** Pagination meta */
  const meta = ref({
    page: 1,
    limit: 20,
    total: 0
  });

  /** Count of locally-stored (pre-sync) projects */
  const localProjectsCount = ref(0);

  const hasLocalProjects = computed(() => localProjectsCount.value > 0);

  function loadLocalState(): LocalProjectData {
    const data = withComputedCounts(loadLocalProjects());
    localProjectsCount.value = data.projects.length;
    return data;
  }

  function persistLocal(data: LocalProjectData): void {
    const withCounts = withComputedCounts(data);
    saveLocalProjects(withCounts);
    localProjectsCount.value = withCounts.projects.length;
  }

  function isLocalProjectId(projectId: string): boolean {
    const local = loadLocalProjects();
    return Array.isArray(local.projects) && local.projects.some(p => p.id === projectId);
  }

  /**
   * Check if a project is a system project (demo mode)
   * System projects support session-only modifications that reset on reload
   */
  function isSystemProject(projectId: string): boolean {
    const fromList = projects.value.find(p => p.id === projectId);
    const project = fromList || currentProject.value;
    devLog('[isSystemProject] projectId:', projectId, 'fromList:', !!fromList, 'fromList.isSystem:', fromList?.isSystem, 'currentProject.isSystem:', currentProject.value?.isSystem, 'result:', project?.isSystem === true);
    return project?.isSystem === true;
  }

  // Initialize local counter
  localProjectsCount.value = loadLocalProjects().projects.length;

  // =========================================
  // Computed / Getters
  // =========================================

  /** Active projects only */
  const activeProjects = computed(() =>
    projects.value.filter(p => p.status === 'active')
  );

  /** Completed projects only */
  const completedProjects = computed(() =>
    projects.value.filter(p => p.status === 'completed')
  );

  /** Archived projects only */
  const archivedProjects = computed(() =>
    projects.value.filter(p => p.status === 'archived')
  );

  /** Pending todos for current project */
  const pendingTodos = computed(() =>
    todos.value.filter(t => t.status === 'pending')
  );

  /** In-progress todos for current project */
  const inProgressTodos = computed(() =>
    todos.value.filter(t => t.status === 'in_progress')
  );

  /** Completed todos for current project */
  const completedTodos = computed(() =>
    todos.value.filter(t => t.status === 'completed')
  );

  /** Upcoming milestones for current project */
  const upcomingMilestones = computed(() =>
    milestones.value.filter(m => m.status === 'upcoming' || m.status === 'in_progress')
  );

  /** Project completion percentage */
  const projectProgress = computed(() => {
    if (todos.value.length === 0) return 0;
    return Math.round((completedTodos.value.length / todos.value.length) * 100);
  });

  /** High priority todos */
  const urgentTodos = computed(() =>
    todos.value.filter(t => t.priority === 'urgent' || t.priority === 'high')
  );

  // =========================================
  // Actions - Projects
  // =========================================

  /**
   * Fetch all projects with optional filtering
   * @param status - Optional status filter
   * @param page - Page number for pagination
   */
  async function fetchProjects(status?: ProjectStatus, page = 1): Promise<void> {
    loading.value.projects = true;
    error.value = null;

    devLog('[Projects] fetchProjects called:', { status, page, isAuthenticated: authStore.isAuthenticated });

    try {
      const local = loadLocalState();
      const localFiltered = status ? local.projects.filter(p => p.status === status) : local.projects;

      devLog('[Projects] Local projects found:', {
        total: local.projects.length,
        filtered: localFiltered.length,
        names: localFiltered.map(p => p.name)
      });

      let remote: Project[] = [];
      if (authStore.isAuthenticated) {
        remote = await projectsApi.list({ status, page, limit: meta.value.limit });
        devLog('[Projects] Fetched remote (authenticated):', remote.length);
      } else {
        // Always fetch system projects for guest users (to show example project)
        try {
          remote = await projectsApi.list({ status, page, limit: meta.value.limit });
          devLog('[Projects] Fetched remote (guest):', remote.length, remote.map(p => p.name));
        } catch (err) {
          devLog('[Projects] Failed to fetch remote for guest:', err);
          remote = [];
        }
      }

      const merged = [...localFiltered, ...remote];

      // Deduplicate by id and keep most recent values.
      const byId = new Map<string, Project>();
      for (const project of merged) {
        byId.set(project.id, project);
      }

      const unique = Array.from(byId.values()).sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt).getTime();
        return bTime - aTime;
      });

      projects.value = unique;
      meta.value.page = page;
      meta.value.total = unique.length;

      persistLocal(local);
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch projects';
      throw e;
    } finally {
      loading.value.projects = false;
    }
  }

  /**
   * Fetch a single project by ID and set as current
   * @param id - Project UUID
   */
  async function fetchProject(id: string): Promise<Project> {
    loading.value.project = true;
    error.value = null;

    try {
      // Local projects remain accessible even after signing in (until uploaded).
      const isLocal = isLocalProjectId(id);
      if (isLocal) {
        const local = loadLocalState();
        const project = local.projects.find(p => p.id === id);
        if (!project) {
          throw new Error('Project not found');
        }

        currentProject.value = project;
        await Promise.all([
          fetchTodos(id),
          fetchMilestones(id),
          fetchMarketingPlans(id)
        ]);

        persistLocal(local);
        return project;
      }

      // Unauthenticated users may still access public/system projects.
      if (!authStore.isAuthenticated) {
        devLog('[fetchProject] Guest user loading project:', id);
        const project = await projectsApi.get(id);
        devLog('[fetchProject] Project loaded for guest:', { id: project.id, name: project.name, isSystem: project.isSystem });
        currentProject.value = project;
        devLog('[fetchProject] currentProject.value.isSystem:', currentProject.value?.isSystem);

        await Promise.all([
          fetchTodos(id),
          fetchMilestones(id),
          fetchMarketingPlans(id)
        ]);

        devLog('[fetchProject] After fetching data - todos count:', todos.value.length);
        return project;
      }

      const project = await projectsApi.get(id);
      currentProject.value = project;

      // Also fetch related data
      await Promise.all([
        fetchTodos(id),
        fetchMilestones(id),
        fetchMarketingPlans(id)
      ]);

      return project;
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch project';
      throw e;
    } finally {
      loading.value.project = false;
    }
  }

  /**
   * Create a new project
   * @param data - Project creation data
   */
  async function createProject(data: { name: string; description?: string; tags?: ProjectTag[] }): Promise<Project> {
    loading.value.projects = true;
    error.value = null;

    devLog('[Projects] createProject called:', { data, isAuthenticated: authStore.isAuthenticated });

    try {
      if (!authStore.isAuthenticated) {
        devLog('[Projects] Creating local project for guest user');
        const local = loadLocalState();
        const now = safeNowIso();
        const project: Project = {
          id: generateId('project'),
          name: data.name,
          description: data.description,
          status: 'active',
          isSystem: false,
          tags: data.tags || [],
          createdAt: now,
          updatedAt: now,
          todoCount: 0,
          completedTodoCount: 0,
          milestoneCount: 0,
        };

        devLog('[Projects] Created project object:', { id: project.id, name: project.name });

        local.projects.unshift(project);
        local.todosByProject[project.id] = [];
        local.milestonesByProject[project.id] = [];
        local.marketingPlansByProject[project.id] = [];
        persistLocal(local);

        devLog('[Projects] Persisted to localStorage, verifying...');
        const verify = loadLocalProjects();
        devLog('[Projects] Verification - projects in localStorage:', verify.projects.map(p => p.name));

        projects.value.unshift(project);
        currentProject.value = project;
        todos.value = [];
        milestones.value = [];
        marketingPlans.value = [];
        return project;
      }

      const project = await projectsApi.create(data);
      projects.value.unshift(project);
      return project;
    } catch (e: any) {
      error.value = e.message || 'Failed to create project';
      throw e;
    } finally {
      loading.value.projects = false;
    }
  }

  /**
   * Update a project
   * @param id - Project UUID
   * @param data - Update data
   */
  async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
    error.value = null;

    try {
      if (isLocalProjectId(id)) {
        const local = loadLocalState();
        const index = local.projects.findIndex(p => p.id === id);
        if (index === -1) throw new Error('Project not found');

        const updated: Project = {
          ...local.projects[index],
          ...data,
          updatedAt: safeNowIso(),
        };

        local.projects[index] = updated;
        persistLocal(local);

        // Update in list
        const listIndex = projects.value.findIndex(p => p.id === id);
        if (listIndex !== -1) {
          projects.value[listIndex] = updated;
        }

        // Update current if it's the same project
        if (currentProject.value?.id === id) {
          currentProject.value = updated;
        }

        return updated;
      }

      const updated = await projectsApi.update(id, data);

      // Update in list
      const index = projects.value.findIndex(p => p.id === id);
      if (index !== -1) {
        projects.value[index] = updated;
      }

      // Update current if it's the same project
      if (currentProject.value?.id === id) {
        currentProject.value = updated;
      }

      return updated;
    } catch (e: any) {
      error.value = e.message || 'Failed to update project';
      throw e;
    }
  }

  /**
   * Delete a project
   * @param id - Project UUID
   */
  async function deleteProject(id: string): Promise<void> {
    error.value = null;

    try {
      if (isLocalProjectId(id)) {
        const local = loadLocalState();
        local.projects = local.projects.filter(p => p.id !== id);
        delete local.todosByProject[id];
        delete local.milestonesByProject[id];
        delete local.marketingPlansByProject[id];
        persistLocal(local);

        // Remove from list
        projects.value = projects.value.filter(p => p.id !== id);

        // Clear current if it was this project
        if (currentProject.value?.id === id) {
          currentProject.value = null;
          todos.value = [];
          milestones.value = [];
          marketingPlans.value = [];
        }
        return;
      }

      await projectsApi.delete(id);

      // Remove from list
      projects.value = projects.value.filter(p => p.id !== id);

      // Clear current if it was this project
      if (currentProject.value?.id === id) {
        currentProject.value = null;
        todos.value = [];
        milestones.value = [];
        marketingPlans.value = [];
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to delete project';
      throw e;
    }
  }

  /**
   * Upload locally-stored projects to the cloud (authenticated users only).
   * After upload, local projects are cleared.
   */
  async function uploadLocalProjects(): Promise<void> {
    if (!authStore.isAuthenticated) {
      throw new Error('Sign in to upload local projects');
    }

    loading.value.projects = true;
    error.value = null;

    try {
      const local = loadLocalState();
      if (local.projects.length === 0) {
        return;
      }

      const idMap = new Map<string, string>();

      // 1) Create projects
      for (const project of local.projects) {
        const created = await projectsApi.create({
          name: project.name,
          description: project.description,
        });
        idMap.set(project.id, created.id);

        // Preserve status if not default
        if (project.status && project.status !== 'active') {
          await projectsApi.update(created.id, { status: project.status });
        }
      }

      // 2) Create related entities
      for (const [localProjectId, cloudProjectId] of idMap.entries()) {
        const localTodos = local.todosByProject[localProjectId] || [];
        for (const todo of localTodos) {
          const createdTodo = await projectsApi.todos.create(cloudProjectId, {
            title: todo.title,
            description: todo.description,
            priority: todo.priority,
            dueDate: todo.dueDate,
          });
          if (todo.status && todo.status !== 'pending') {
            await projectsApi.todos.update(cloudProjectId, createdTodo.id, { status: todo.status });
          }
        }

        const localMilestones = local.milestonesByProject[localProjectId] || [];
        for (const milestone of localMilestones) {
          const createdMilestone = await projectsApi.milestones.create(cloudProjectId, {
            title: milestone.title,
            description: milestone.description,
            targetDate: milestone.targetDate,
          });
          if (milestone.status && milestone.status !== 'upcoming') {
            await projectsApi.milestones.update(cloudProjectId, createdMilestone.id, { status: milestone.status });
          }
        }

        const localPlans = local.marketingPlansByProject[localProjectId] || [];
        for (const plan of localPlans) {
          const createdPlan = await projectsApi.marketingPlans.create(cloudProjectId, {
            title: plan.title,
            content: plan.content,
            budget: plan.budget,
          });
          if (plan.status && plan.status !== 'draft') {
            await projectsApi.marketingPlans.update(cloudProjectId, createdPlan.id, { status: plan.status });
          }
        }
      }

      // 3) Clear local data and refresh from cloud
      const shouldClearCurrent = !!currentProject.value && isLocalProjectId(currentProject.value.id);
      persistLocal(createLocalProjectData());
      if (shouldClearCurrent) {
        clearCurrentProject();
      }
      await fetchProjects(undefined, 1);
    } catch (e: any) {
      error.value = e.message || 'Failed to upload local projects';
      throw e;
    } finally {
      loading.value.projects = false;
    }
  }

  // =========================================
  // Actions - Todos
  // =========================================

  /**
   * Fetch todos for a project
   * @param projectId - Project UUID
   * @param status - Optional status filter
   */
  async function fetchTodos(projectId: string, status?: TodoStatus): Promise<void> {
    loading.value.todos = true;
    devLog('[fetchTodos] Starting fetch for projectId:', projectId);

    try {
      if (isLocalProjectId(projectId)) {
        const local = loadLocalState();
        const all = local.todosByProject[projectId] || [];
        todos.value = status ? all.filter(t => t.status === status) : all;
        devLog('[fetchTodos] Local project, todos:', all.length);

        const updatedCounts = computeProjectCounts(local, projectId);
        const localProjectIndex = local.projects.findIndex(p => p.id === projectId);
        if (localProjectIndex !== -1) {
          local.projects[localProjectIndex] = { ...local.projects[localProjectIndex], ...updatedCounts };
        }
        persistLocal(local);

        const projectIndex = projects.value.findIndex(p => p.id === projectId);
        if (projectIndex !== -1) {
          projects.value[projectIndex] = { ...projects.value[projectIndex], ...updatedCounts };
        }
        if (currentProject.value?.id === projectId) {
          currentProject.value = { ...currentProject.value, ...updatedCounts };
        }
        return;
      }

      // Fetch from API
      const result = await projectsApi.todos.list(projectId, { status });
      devLog('[fetchTodos] API returned:', result.length, 'todos');
      if (result.length > 0) {
        devLog('[fetchTodos] First todo sample:', { id: result[0].id, title: result[0].title });
      }

      // For system projects, apply demo session modifications
      const isSystem = isSystemProject(projectId);
      devLog('[fetchTodos] isSystemProject:', isSystem, 'currentProject.isSystem:', currentProject.value?.isSystem);

      if (isSystem) {
        const session = loadDemoSession();
        const deletedIds = session.deletedTodos[projectId] || new Set();
        const sessionTodos = session.todosByProject[projectId] || [];
        devLog('[fetchTodos] Demo session - deletedIds count:', deletedIds.size, 'sessionTodos:', sessionTodos.length);
        if (deletedIds.size > 0) {
          devLog('[fetchTodos] Deleted IDs in session:', Array.from(deletedIds));
        }

        // Filter out deleted items and merge with session-created items
        let merged = result.filter(t => !deletedIds.has(t.id));
        devLog('[fetchTodos] After filtering deleted:', merged.length, 'of', result.length);

        // Apply session updates to existing items
        merged = merged.map(todo => {
          const sessionUpdate = sessionTodos.find(st => st.id === todo.id);
          return sessionUpdate ? { ...todo, ...sessionUpdate } : todo;
        });

        // Add session-created items (those not in API results)
        const apiIds = new Set(result.map(t => t.id));
        const newSessionTodos = sessionTodos.filter(st => !apiIds.has(st.id));
        merged = [...merged, ...newSessionTodos];

        todos.value = status ? merged.filter(t => t.status === status) : merged;
        devLog('[fetchTodos] Final todos count (system project):', todos.value.length);
      } else {
        todos.value = result;
        devLog('[fetchTodos] Final todos count (regular project):', todos.value.length);
      }

      devLog('[fetchTodos] Store todos.value length:', todos.value.length);
    } catch (e: any) {
      logError('[fetchTodos] Error:', e);
      error.value = e.message || 'Failed to fetch todos';
    } finally {
      loading.value.todos = false;
    }
  }

  /**
   * Create a todo
   * @param projectId - Project UUID
   * @param data - Todo creation data
   */
  async function createTodo(
    projectId: string,
    data: { title: string; description?: string; priority?: TodoPriority; dueDate?: string }
  ): Promise<Todo> {
    try {
      if (isLocalProjectId(projectId)) {
        const local = loadLocalState();
        const now = safeNowIso();
        const todo: Todo = {
          id: generateId('todo'),
          projectId,
          title: data.title,
          description: data.description,
          status: 'pending',
          priority: data.priority || 'medium',
          dueDate: data.dueDate,
          createdAt: now,
          updatedAt: now,
        };

        local.todosByProject[projectId] = [...(local.todosByProject[projectId] || []), todo];
        persistLocal(local);

        todos.value.push(todo);

        // Update counts on current project/list
        const updatedCounts = computeProjectCounts(local, projectId);
        const projectIndex = projects.value.findIndex(p => p.id === projectId);
        if (projectIndex !== -1) {
          projects.value[projectIndex] = { ...projects.value[projectIndex], ...updatedCounts };
        }
        if (currentProject.value?.id === projectId) {
          currentProject.value = { ...currentProject.value, ...updatedCounts };
        }

        return todo;
      }

      // Demo mode for system projects - create in session only
      if (isSystemProject(projectId)) {
        const session = loadDemoSession();
        const now = safeNowIso();
        const todo: Todo = {
          id: generateId('demo_todo'),
          projectId,
          title: data.title,
          description: data.description,
          status: 'pending',
          priority: data.priority || 'medium',
          dueDate: data.dueDate,
          createdAt: now,
          updatedAt: now,
        };

        session.todosByProject[projectId] = [...(session.todosByProject[projectId] || []), todo];
        saveDemoSession();

        todos.value.push(todo);
        return todo;
      }

      const todo = await projectsApi.todos.create(projectId, data);
      todos.value.push(todo);
      return todo;
    } catch (e: any) {
      error.value = e.message || 'Failed to create todo';
      throw e;
    }
  }

  /**
   * Update a todo
   * @param projectId - Project UUID
   * @param todoId - Todo UUID
   * @param data - Update data
   */
  async function updateTodo(projectId: string, todoId: string, data: Partial<Todo>): Promise<Todo> {
    try {
      if (isLocalProjectId(projectId)) {
        const local = loadLocalState();
        const list = local.todosByProject[projectId] || [];
        const index = list.findIndex(t => t.id === todoId);
        if (index === -1) throw new Error('Todo not found');

        const updated: Todo = {
          ...list[index],
          ...data,
          updatedAt: safeNowIso(),
        };

        const next = [...list];
        next[index] = updated;
        local.todosByProject[projectId] = next;
        persistLocal(local);

        const stateIndex = todos.value.findIndex(t => t.id === todoId);
        if (stateIndex !== -1) {
          todos.value[stateIndex] = updated;
        }

        const updatedCounts = computeProjectCounts(local, projectId);
        const projectIndex = projects.value.findIndex(p => p.id === projectId);
        if (projectIndex !== -1) {
          projects.value[projectIndex] = { ...projects.value[projectIndex], ...updatedCounts };
        }
        if (currentProject.value?.id === projectId) {
          currentProject.value = { ...currentProject.value, ...updatedCounts };
        }

        return updated;
      }

      // Demo mode for system projects - update in session only
      if (isSystemProject(projectId)) {
        const session = loadDemoSession();
        const existingTodo = todos.value.find(t => t.id === todoId);
        if (!existingTodo) throw new Error('Todo not found');

        const updated: Todo = {
          ...existingTodo,
          ...data,
          updatedAt: safeNowIso(),
        };

        // Store in session (either as update to existing or as new entry)
        const sessionTodos = session.todosByProject[projectId] || [];
        const sessionIndex = sessionTodos.findIndex(t => t.id === todoId);
        if (sessionIndex !== -1) {
          sessionTodos[sessionIndex] = updated;
        } else {
          sessionTodos.push(updated);
        }
        session.todosByProject[projectId] = sessionTodos;
        saveDemoSession();

        // Update local state
        const stateIndex = todos.value.findIndex(t => t.id === todoId);
        if (stateIndex !== -1) {
          todos.value[stateIndex] = updated;
        }

        return updated;
      }

      const updated = await projectsApi.todos.update(projectId, todoId, data);

      const index = todos.value.findIndex(t => t.id === todoId);
      if (index !== -1) {
        todos.value[index] = updated;
      }

      return updated;
    } catch (e: any) {
      error.value = e.message || 'Failed to update todo';
      throw e;
    }
  }

  /**
   * Toggle todo status between pending/in_progress/completed
   * @param projectId - Project UUID
   * @param todo - Todo to toggle
   */
  async function toggleTodoStatus(projectId: string, todo: Todo): Promise<Todo> {
    const statusCycle: TodoStatus[] = ['pending', 'in_progress', 'completed'];
    const currentIndex = statusCycle.indexOf(todo.status);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];

    return updateTodo(projectId, todo.id, { status: nextStatus });
  }

  /**
   * Delete a todo
   * @param projectId - Project UUID
   * @param todoId - Todo UUID
   */
  async function deleteTodo(projectId: string, todoId: string): Promise<void> {
    try {
      if (isLocalProjectId(projectId)) {
        const local = loadLocalState();
        local.todosByProject[projectId] = (local.todosByProject[projectId] || []).filter(t => t.id !== todoId);
        persistLocal(local);

        todos.value = todos.value.filter(t => t.id !== todoId);

        const updatedCounts = computeProjectCounts(local, projectId);
        const projectIndex = projects.value.findIndex(p => p.id === projectId);
        if (projectIndex !== -1) {
          projects.value[projectIndex] = { ...projects.value[projectIndex], ...updatedCounts };
        }
        if (currentProject.value?.id === projectId) {
          currentProject.value = { ...currentProject.value, ...updatedCounts };
        }

        return;
      }

      // Demo mode for system projects - delete in session only
      if (isSystemProject(projectId)) {
        const session = loadDemoSession();

        // Track as deleted so it won't show up on next fetch
        if (!session.deletedTodos[projectId]) {
          session.deletedTodos[projectId] = new Set();
        }
        session.deletedTodos[projectId].add(todoId);

        // Also remove from session-created todos if it was created in this session
        if (session.todosByProject[projectId]) {
          session.todosByProject[projectId] = session.todosByProject[projectId].filter(t => t.id !== todoId);
        }

        saveDemoSession();

        // Update local state
        todos.value = todos.value.filter(t => t.id !== todoId);
        return;
      }

      await projectsApi.todos.delete(projectId, todoId);
      todos.value = todos.value.filter(t => t.id !== todoId);
    } catch (e: any) {
      error.value = e.message || 'Failed to delete todo';
      throw e;
    }
  }

  // =========================================
  // Actions - Milestones
  // =========================================

  /**
   * Fetch milestones for a project
   * @param projectId - Project UUID
   */
  async function fetchMilestones(projectId: string): Promise<void> {
    loading.value.milestones = true;

    try {
      if (isLocalProjectId(projectId)) {
        const local = loadLocalState();
        milestones.value = local.milestonesByProject[projectId] || [];

        const updatedCounts = computeProjectCounts(local, projectId);
        const localProjectIndex = local.projects.findIndex(p => p.id === projectId);
        if (localProjectIndex !== -1) {
          local.projects[localProjectIndex] = { ...local.projects[localProjectIndex], ...updatedCounts };
        }

        const projectIndex = projects.value.findIndex(p => p.id === projectId);
        if (projectIndex !== -1) {
          projects.value[projectIndex] = { ...projects.value[projectIndex], ...updatedCounts };
        }
        if (currentProject.value?.id === projectId) {
          currentProject.value = { ...currentProject.value, ...updatedCounts };
        }

        persistLocal(local);
        return;
      }

      // Fetch from API
      const result = await projectsApi.milestones.list(projectId);

      // For system projects, apply demo session modifications
      if (isSystemProject(projectId)) {
        const session = loadDemoSession();
        const deletedIds = session.deletedMilestones[projectId] || new Set();
        const sessionMilestones = session.milestonesByProject[projectId] || [];

        // Filter out deleted items and merge with session-created items
        let merged = result.filter(m => !deletedIds.has(m.id));

        // Apply session updates to existing items
        merged = merged.map(milestone => {
          const sessionUpdate = sessionMilestones.find(sm => sm.id === milestone.id);
          return sessionUpdate ? { ...milestone, ...sessionUpdate } : milestone;
        });

        // Add session-created items (those not in API results)
        const apiIds = new Set(result.map(m => m.id));
        const newSessionMilestones = sessionMilestones.filter(sm => !apiIds.has(sm.id));
        merged = [...merged, ...newSessionMilestones];

        milestones.value = merged;
      } else {
        milestones.value = result;
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch milestones';
    } finally {
      loading.value.milestones = false;
    }
  }

  /**
   * Create a milestone
   * @param projectId - Project UUID
   * @param data - Milestone creation data
   */
  async function createMilestone(
    projectId: string,
    data: { title: string; description?: string; targetDate?: string }
  ): Promise<Milestone> {
    try {
      if (isLocalProjectId(projectId)) {
        const local = loadLocalState();
        const now = safeNowIso();
        const milestone: Milestone = {
          id: generateId('milestone'),
          projectId,
          title: data.title,
          description: data.description,
          targetDate: data.targetDate,
          status: 'upcoming',
          createdAt: now,
          updatedAt: now,
        };

        local.milestonesByProject[projectId] = [...(local.milestonesByProject[projectId] || []), milestone];
        persistLocal(local);

        milestones.value.push(milestone);

        const updatedCounts = computeProjectCounts(local, projectId);
        const projectIndex = projects.value.findIndex(p => p.id === projectId);
        if (projectIndex !== -1) {
          projects.value[projectIndex] = { ...projects.value[projectIndex], ...updatedCounts };
        }
        if (currentProject.value?.id === projectId) {
          currentProject.value = { ...currentProject.value, ...updatedCounts };
        }

        return milestone;
      }

      // Demo mode for system projects - create in session only
      if (isSystemProject(projectId)) {
        const session = loadDemoSession();
        const now = safeNowIso();
        const milestone: Milestone = {
          id: generateId('demo_milestone'),
          projectId,
          title: data.title,
          description: data.description,
          targetDate: data.targetDate,
          status: 'upcoming',
          createdAt: now,
          updatedAt: now,
        };

        session.milestonesByProject[projectId] = [...(session.milestonesByProject[projectId] || []), milestone];
        saveDemoSession();

        milestones.value.push(milestone);
        return milestone;
      }

      const milestone = await projectsApi.milestones.create(projectId, data);
      milestones.value.push(milestone);
      return milestone;
    } catch (e: any) {
      error.value = e.message || 'Failed to create milestone';
      throw e;
    }
  }

  /**
   * Update a milestone
   * @param projectId - Project UUID
   * @param milestoneId - Milestone UUID
   * @param data - Update data
   */
  async function updateMilestone(
    projectId: string,
    milestoneId: string,
    data: Partial<Milestone>
  ): Promise<Milestone> {
    try {
      if (isLocalProjectId(projectId)) {
        const local = loadLocalState();
        const list = local.milestonesByProject[projectId] || [];
        const index = list.findIndex(m => m.id === milestoneId);
        if (index === -1) throw new Error('Milestone not found');

        const updated: Milestone = {
          ...list[index],
          ...data,
          updatedAt: safeNowIso(),
        };

        const next = [...list];
        next[index] = updated;
        local.milestonesByProject[projectId] = next;
        persistLocal(local);

        const stateIndex = milestones.value.findIndex(m => m.id === milestoneId);
        if (stateIndex !== -1) {
          milestones.value[stateIndex] = updated;
        }

        return updated;
      }

      // Demo mode for system projects - update in session only
      if (isSystemProject(projectId)) {
        const session = loadDemoSession();
        const existingMilestone = milestones.value.find(m => m.id === milestoneId);
        if (!existingMilestone) throw new Error('Milestone not found');

        const updated: Milestone = {
          ...existingMilestone,
          ...data,
          updatedAt: safeNowIso(),
        };

        // Store in session (either as update to existing or as new entry)
        const sessionMilestones = session.milestonesByProject[projectId] || [];
        const sessionIndex = sessionMilestones.findIndex(m => m.id === milestoneId);
        if (sessionIndex !== -1) {
          sessionMilestones[sessionIndex] = updated;
        } else {
          sessionMilestones.push(updated);
        }
        session.milestonesByProject[projectId] = sessionMilestones;
        saveDemoSession();

        // Update local state
        const stateIndex = milestones.value.findIndex(m => m.id === milestoneId);
        if (stateIndex !== -1) {
          milestones.value[stateIndex] = updated;
        }

        return updated;
      }

      const updated = await projectsApi.milestones.update(projectId, milestoneId, data);

      const index = milestones.value.findIndex(m => m.id === milestoneId);
      if (index !== -1) {
        milestones.value[index] = updated;
      }

      return updated;
    } catch (e: any) {
      error.value = e.message || 'Failed to update milestone';
      throw e;
    }
  }

  /**
   * Delete a milestone
   * @param projectId - Project UUID
   * @param milestoneId - Milestone UUID
   */
  async function deleteMilestone(projectId: string, milestoneId: string): Promise<void> {
    try {
      if (isLocalProjectId(projectId)) {
        const local = loadLocalState();
        local.milestonesByProject[projectId] = (local.milestonesByProject[projectId] || []).filter(m => m.id !== milestoneId);
        persistLocal(local);

        milestones.value = milestones.value.filter(m => m.id !== milestoneId);

        const updatedCounts = computeProjectCounts(local, projectId);
        const projectIndex = projects.value.findIndex(p => p.id === projectId);
        if (projectIndex !== -1) {
          projects.value[projectIndex] = { ...projects.value[projectIndex], ...updatedCounts };
        }
        if (currentProject.value?.id === projectId) {
          currentProject.value = { ...currentProject.value, ...updatedCounts };
        }

        return;
      }

      // Demo mode for system projects - delete in session only
      if (isSystemProject(projectId)) {
        const session = loadDemoSession();

        // Track as deleted so it won't show up on next fetch
        if (!session.deletedMilestones[projectId]) {
          session.deletedMilestones[projectId] = new Set();
        }
        session.deletedMilestones[projectId].add(milestoneId);

        // Also remove from session-created milestones if it was created in this session
        if (session.milestonesByProject[projectId]) {
          session.milestonesByProject[projectId] = session.milestonesByProject[projectId].filter(m => m.id !== milestoneId);
        }

        saveDemoSession();

        // Update local state
        milestones.value = milestones.value.filter(m => m.id !== milestoneId);
        return;
      }

      await projectsApi.milestones.delete(projectId, milestoneId);
      milestones.value = milestones.value.filter(m => m.id !== milestoneId);
    } catch (e: any) {
      error.value = e.message || 'Failed to delete milestone';
      throw e;
    }
  }

  // =========================================
  // Actions - Marketing Plans
  // =========================================

  /**
   * Fetch marketing plans for a project
   * @param projectId - Project UUID
   */
  async function fetchMarketingPlans(projectId: string): Promise<void> {
    loading.value.marketingPlans = true;

    try {
      if (isLocalProjectId(projectId)) {
        const local = loadLocalState();
        marketingPlans.value = local.marketingPlansByProject[projectId] || [];
        persistLocal(local);
        return;
      }

      // Fetch from API
      const result = await projectsApi.marketingPlans.list(projectId);

      // For system projects, apply demo session modifications
      if (isSystemProject(projectId)) {
        const session = loadDemoSession();
        const deletedIds = session.deletedMarketingPlans[projectId] || new Set();
        const sessionPlans = session.marketingPlansByProject[projectId] || [];

        // Filter out deleted items and merge with session-created items
        let merged = result.filter(p => !deletedIds.has(p.id));

        // Apply session updates to existing items
        merged = merged.map(plan => {
          const sessionUpdate = sessionPlans.find(sp => sp.id === plan.id);
          return sessionUpdate ? { ...plan, ...sessionUpdate } : plan;
        });

        // Add session-created items (those not in API results)
        const apiIds = new Set(result.map(p => p.id));
        const newSessionPlans = sessionPlans.filter(sp => !apiIds.has(sp.id));
        merged = [...merged, ...newSessionPlans];

        marketingPlans.value = merged;
      } else {
        marketingPlans.value = result;
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch marketing plans';
    } finally {
      loading.value.marketingPlans = false;
    }
  }

  /**
   * Create a marketing plan
   * @param projectId - Project UUID
   * @param data - Marketing plan creation data
   */
  async function createMarketingPlan(
    projectId: string,
    data: { title: string; content?: Record<string, unknown>; budget?: number }
  ): Promise<MarketingPlan> {
    try {
      if (isLocalProjectId(projectId)) {
        const local = loadLocalState();
        const now = safeNowIso();
        const plan: MarketingPlan = {
          id: generateId('marketing'),
          projectId,
          title: data.title,
          content: data.content,
          status: 'draft',
          budget: data.budget,
          createdAt: now,
          updatedAt: now,
        };

        local.marketingPlansByProject[projectId] = [...(local.marketingPlansByProject[projectId] || []), plan];
        persistLocal(local);

        marketingPlans.value.push(plan);
        return plan;
      }

      const plan = await projectsApi.marketingPlans.create(projectId, data);
      marketingPlans.value.push(plan);
      return plan;
    } catch (e: any) {
      error.value = e.message || 'Failed to create marketing plan';
      throw e;
    }
  }

  /**
   * Update a marketing plan
   * @param projectId - Project UUID
   * @param planId - Marketing plan UUID
   * @param data - Update data
   */
  async function updateMarketingPlan(
    projectId: string,
    planId: string,
    data: Partial<MarketingPlan>
  ): Promise<MarketingPlan> {
    try {
      if (isLocalProjectId(projectId)) {
        const local = loadLocalState();
        const list = local.marketingPlansByProject[projectId] || [];
        const index = list.findIndex(p => p.id === planId);
        if (index === -1) throw new Error('Marketing plan not found');

        const updated: MarketingPlan = {
          ...list[index],
          ...data,
          updatedAt: safeNowIso(),
        };

        const next = [...list];
        next[index] = updated;
        local.marketingPlansByProject[projectId] = next;
        persistLocal(local);

        const stateIndex = marketingPlans.value.findIndex(p => p.id === planId);
        if (stateIndex !== -1) {
          marketingPlans.value[stateIndex] = updated;
        }

        return updated;
      }

      const updated = await projectsApi.marketingPlans.update(projectId, planId, data);

      const index = marketingPlans.value.findIndex(p => p.id === planId);
      if (index !== -1) {
        marketingPlans.value[index] = updated;
      }

      return updated;
    } catch (e: any) {
      error.value = e.message || 'Failed to update marketing plan';
      throw e;
    }
  }

  /**
   * Delete a marketing plan
   * @param projectId - Project UUID
   * @param planId - Marketing plan UUID
   */
  async function deleteMarketingPlan(projectId: string, planId: string): Promise<void> {
    try {
      if (isLocalProjectId(projectId)) {
        const local = loadLocalState();
        local.marketingPlansByProject[projectId] = (local.marketingPlansByProject[projectId] || []).filter(p => p.id !== planId);
        persistLocal(local);

        marketingPlans.value = marketingPlans.value.filter(p => p.id !== planId);
        return;
      }

      await projectsApi.marketingPlans.delete(projectId, planId);
      marketingPlans.value = marketingPlans.value.filter(p => p.id !== planId);
    } catch (e: any) {
      error.value = e.message || 'Failed to delete marketing plan';
      throw e;
    }
  }

  // =========================================
  // Actions - AI Copilot Integration
  // =========================================

  /**
   * Get AI-suggested todos for a project
   * @param projectId - Project UUID
   * @param context - Optional additional context
   */
  async function suggestTodos(projectId: string, context?: string): Promise<string[]> {
    loading.value.copilot = true;

    try {
      const result = await projectsApi.copilot.suggestTodos(projectId, context);
      return result.suggestions;
    } catch (e: any) {
      error.value = e.message || 'Failed to get todo suggestions';
      throw e;
    } finally {
      loading.value.copilot = false;
    }
  }

  /**
   * Get AI-suggested milestones for a project
   * @param projectId - Project UUID
   * @param context - Optional additional context
   */
  async function suggestMilestones(projectId: string, context?: string): Promise<string[]> {
    loading.value.copilot = true;

    try {
      const result = await projectsApi.copilot.suggestMilestones(projectId, context);
      return result.suggestions;
    } catch (e: any) {
      error.value = e.message || 'Failed to get milestone suggestions';
      throw e;
    } finally {
      loading.value.copilot = false;
    }
  }

  /**
   * Generate a marketing plan using AI
   * @param projectId - Project UUID
   * @param goals - Marketing goals/objectives
   */
  async function generateMarketingPlan(projectId: string, goals?: string): Promise<MarketingPlan> {
    loading.value.copilot = true;

    try {
      return await projectsApi.copilot.generateMarketingPlan(projectId, goals);
    } catch (e: any) {
      error.value = e.message || 'Failed to generate marketing plan';
      throw e;
    } finally {
      loading.value.copilot = false;
    }
  }

  // =========================================
  // Utility Actions
  // =========================================

  /**
   * Clear current project and related data
   */
  function clearCurrentProject(): void {
    currentProject.value = null;
    todos.value = [];
    milestones.value = [];
    marketingPlans.value = [];
  }

  /**
   * Clear demo session data (for system projects)
   * Useful when demo mode data becomes stale or corrupted
   */
  function clearDemoSession(): void {
    demoSession = createDemoSessionData();
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(DEMO_SESSION_KEY);
        devLog('[Projects] Demo session cleared');
      } catch {
        // Ignore storage errors
      }
    }
  }

  /**
   * Clear any error state
   */
  function clearError(): void {
    error.value = null;
  }

  /**
   * Reset the entire store
   */
  function $reset(): void {
    projects.value = [];
    currentProject.value = null;
    todos.value = [];
    milestones.value = [];
    marketingPlans.value = [];
    error.value = null;
    meta.value = { page: 1, limit: 20, total: 0 };
  }

  return {
    // State
    projects,
    currentProject,
    todos,
    milestones,
    marketingPlans,
    loading,
    error,
    meta,
    localProjectsCount,

    // Computed
    activeProjects,
    completedProjects,
    archivedProjects,
    pendingTodos,
    inProgressTodos,
    completedTodos,
    upcomingMilestones,
    projectProgress,
    urgentTodos,
    hasLocalProjects,

    // Actions - Projects
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    uploadLocalProjects,

    // Actions - Todos
    fetchTodos,
    createTodo,
    updateTodo,
    toggleTodoStatus,
    deleteTodo,

    // Actions - Milestones
    fetchMilestones,
    createMilestone,
    updateMilestone,
    deleteMilestone,

    // Actions - Marketing Plans
    fetchMarketingPlans,
    createMarketingPlan,
    updateMarketingPlan,
    deleteMarketingPlan,

    // Actions - AI Copilot
    suggestTodos,
    suggestMilestones,
    generateMarketingPlan,

    // Utility
    clearCurrentProject,
    clearDemoSession,
    clearError,
    $reset
  };
});
