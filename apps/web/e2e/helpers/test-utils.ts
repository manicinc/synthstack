/**
 * Shared E2E Test Utilities
 * Common helpers for authentication mocking, API interception, and wait utilities
 */

import { Page, expect } from '@playwright/test'

// Mock user for authenticated tests
export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: null,
  subscription_tier: 'free',
  created_at: new Date().toISOString(),
}

// Mock auth token
export const mockAuthToken = 'mock-auth-token-for-testing'

/**
 * Setup authentication mocking for protected routes
 * Intercepts auth API calls and sets localStorage
 */
export async function mockAuth(page: Page) {
  // Intercept auth verification endpoints
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: mockUser }),
    })
  })

  await page.route('**/api/v1/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ 
        user: mockUser,
        access_token: mockAuthToken,
        expires_at: Date.now() + 3600000,
      }),
    })
  })

  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ 
        access_token: mockAuthToken,
        expires_at: Date.now() + 3600000,
      }),
    })
  })

  // Auth providers endpoint - needed for app initialization
  await page.route('**/api/v1/auth/providers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          activeProvider: 'supabase',
          providers: {
            supabase: true,
            local: false,
            directus: false
          },
          features: {
            guestMode: true,
            emailVerification: false
          }
        }
      }),
    })
  })

  // User profile endpoint - called by auth store during initialization
  await page.route('**/api/v1/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: mockUser
      }),
    })
  })

  // User stats endpoint - called by auth store during initialization
  await page.route('**/api/v1/users/me/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          generationsThisMonth: 5,
          generationsLimit: 100,
          profilesCreated: 0,
          profilesDownloaded: 0
        }
      }),
    })
  })

  // Set localStorage before page loads
  await page.addInitScript((data) => {
    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    localStorage.setItem('auth_provider', 'supabase')
  }, { token: mockAuthToken, user: mockUser })
}

/**
 * Mock dashboard API endpoints with sample data
 */
export async function mockDashboardAPIs(page: Page) {
  await page.route('**/api/v1/dashboard/analytics/overview', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        workflows: {
          total: 15,
          executions: { today: 234, thisWeek: 1456, thisMonth: 5678 },
          successRate: 97.5,
          avgDuration: 2345,
          change: 12.5,
        },
        aiUsage: {
          tokensToday: 15000,
          tokensThisWeek: 75000,
          conversationsToday: 25,
          conversationsThisWeek: 120,
        },
        credits: {
          balance: 50000,
          used: { thisMonth: 5000, lastMonth: 4200 },
          change: 19,
        },
        recentActivity: [],
      }),
    })
  })

  await page.route('**/api/v1/dashboard/analytics/timeline**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { date: '2026-01-07', executions: 100, successful: 95, failed: 5 },
        { date: '2026-01-06', executions: 120, successful: 115, failed: 5 },
      ]),
    })
  })

  await page.route('**/api/v1/dashboard/analytics/top-workflows**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'flow-1', name: 'Data Sync Flow', executions: 500, successRate: 98.5 },
        { id: 'flow-2', name: 'Report Generator', executions: 250, successRate: 95.0 },
      ]),
    })
  })

  await page.route('**/api/v1/dashboard/analytics/activity**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'act-1', type: 'workflow_execution', title: 'Data Sync completed', status: 'success' },
      ]),
    })
  })

  await page.route('**/api/v1/dashboard/analytics/ai-usage', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        tokensToday: 15000,
        tokensThisWeek: 75000,
        conversationsToday: 25,
        trend: [],
        topAgents: [],
      }),
    })
  })
}

/**
 * Disable CSS animations and transitions for faster, more reliable tests.
 * This prevents elements from being "hidden" due to opacity: 0 initial states.
 */
export async function disableAnimations(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      .title-line, .hero-subtitle, .hero-cta, .theming-badge,
      .landing-page, .hero-section, [data-testid] {
        opacity: 1 !important;
        visibility: visible !important;
        transform: none !important;
      }
    `
  })
}

/**
 * Setup console error capture for debugging test failures
 * Returns a function to get captured errors
 */
export function setupErrorCapture(page: Page): () => string[] {
  const errors: string[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`[Console Error] ${msg.text()}`)
    }
  })

  page.on('pageerror', (err) => {
    errors.push(`[Page Error] ${err.message}`)
  })

  return () => errors
}

/**
 * Wait for the app to be fully loaded and ready
 *
 * This function waits for Vue to complete its initialization by checking
 * the __APP_READY__ signal set in App.vue after all stores are initialized.
 * This is more reliable than waiting for DOM elements which might exist
 * before Vue components are fully mounted.
 */
export async function waitForAppReady(page: Page, options: { timeout?: number } = {}) {
  const timeout = options.timeout || 20000

  // Wait for DOM content to be loaded
  await page.waitForLoadState('domcontentloaded', { timeout })

  // Wait for Vue to signal that the app is fully initialized
  // App.vue sets window.__APP_READY__ = true after auth and theme stores initialize
  await page.waitForFunction(
    () => (window as unknown as { __APP_READY__?: boolean }).__APP_READY__ === true,
    { timeout }
  ).catch(async () => {
    // Fallback: wait for landing page element if __APP_READY__ never fires
    // This handles cases where the signal might not work (e.g., older code)
    console.log('Warning: __APP_READY__ signal not received, falling back to element detection')
    await page.waitForSelector('#q-app, .q-page, .landing-page, [data-testid="landing-page"]', {
      state: 'attached',
      timeout: 10000,
    }).catch(() => {})
  })

  // Small extra wait for Quasar components to fully render
  await page.waitForTimeout(500)
}

/**
 * Wait for a specific element with data-testid
 */
export async function waitForTestId(page: Page, testId: string, options: { timeout?: number } = {}) {
  const timeout = options.timeout || 10000
  await page.waitForSelector(`[data-testid="${testId}"]`, { 
    state: 'visible',
    timeout,
  })
}

/**
 * Get element by data-testid
 */
export function getByTestId(page: Page, testId: string) {
  return page.locator(`[data-testid="${testId}"]`)
}

/**
 * Soft assertion that logs warning instead of failing
 */
export async function softExpect(
  assertion: () => Promise<void>,
  description: string
): Promise<boolean> {
  try {
    await assertion()
    return true
  } catch (error) {
    console.warn(`Soft assertion failed: ${description}`)
    return false
  }
}

/**
 * Check if element exists without failing test
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    const element = page.locator(selector)
    return await element.count() > 0
  } catch {
    return false
  }
}

/**
 * Mock all common API endpoints to prevent network errors
 * MUST be called LAST after specific mocks to catch any unmocked endpoints
 * This prevents page hangs in CI when API calls are made but not mocked
 */
export async function mockCommonAPIs(page: Page) {
  // Auth providers endpoint - MUST be before generic catch-all
  // App.vue calls authService.initialize() which fetches this endpoint
  await page.route('**/api/v1/auth/providers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          activeProvider: 'supabase',
          providers: {
            supabase: true,
            local: false,
            directus: false
          },
          features: {
            guestMode: true,
            emailVerification: false
          }
        }
      }),
    })
  })

  // Features list endpoint - called by feature store during initialization
  // MUST come before the generic /api/v1/** catch-all to ensure it's intercepted
  await page.route('**/api/v1/features/list', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          features: [
            { name: 'ai-copilot', enabled: true, description: 'AI Copilot feature' },
            { name: 'workflows', enabled: true, description: 'Workflow automation' },
            { name: 'projects', enabled: true, description: 'Project management' },
            { name: 'analytics', enabled: true, description: 'Analytics and reporting' }
          ]
        }
      }),
    })
  })

  // Themes endpoint - called by theme store during initialization
  // Without this mock, fetchCustomThemes() could hang waiting for API response
  await page.route('**/api/v1/themes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { themes: [] }
      }),
    })
  })

  // Billing endpoints (landing page promo, checkout, etc.)
  await page.route('**/api/v1/billing/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {} }),
    })
  })

  // User settings/preferences
  await page.route('**/api/v1/users/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {} }),
    })
  })

  // Feature flags
  await page.route('**/api/v1/feature-flags/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { flags: {} } }),
    })
  })

  // Catch-all for any remaining /api/v1/* endpoints
  await page.route('**/api/v1/**', async (route) => {
    if (!route.request().isNavigationRequest()) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} }),
      })
    } else {
      await route.continue()
    }
  })

  // Directus CMS catch-all (if not already mocked)
  await page.route('**/*.directus.app/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })
}

/**
 * Take screenshot with consistent naming
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: false,
  })
}

/**
 * Mock Projects API endpoints
 * Note: API expects { success: true, data: [...] } response format
 */
export async function mockProjectsAPIs(page: Page) {
  // Projects list
  await page.route('**/api/v1/projects**', async (route) => {
    const url = route.request().url()
    const method = route.request().method()

    // Check if this is a specific project request (e.g., /projects/proj-1)
    const projectIdMatch = url.match(/\/projects\/([^/]+)(?:\/|$)/)
    const isSpecificProject = projectIdMatch && !url.includes('/todos') && !url.includes('/milestones') && !url.includes('/marketing')

    if (method === 'GET') {
      if (isSpecificProject) {
        // Single project
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: projectIdMatch[1],
              name: 'Test Project',
              description: 'A test project',
              status: 'active',
              date_created: new Date().toISOString(),
              date_updated: new Date().toISOString(),
              todo_count: 2,
              completed_todo_count: 1,
              milestone_count: 1,
            },
          }),
        })
      } else {
        // Projects list
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'proj-1',
                name: 'Test Project 1',
                description: 'A test project',
                status: 'active',
                date_created: new Date().toISOString(),
                date_updated: new Date().toISOString(),
                todo_count: 2,
                completed_todo_count: 1,
                milestone_count: 1,
              },
              {
                id: 'proj-2',
                name: 'Test Project 2',
                description: 'Another test project',
                status: 'completed',
                date_created: new Date().toISOString(),
                date_updated: new Date().toISOString(),
                todo_count: 3,
                completed_todo_count: 3,
                milestone_count: 2,
              },
            ],
          }),
        })
      }
    } else if (method === 'POST') {
      // Create project
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: `proj-${Date.now()}`,
            name: 'New Test Project',
            description: 'Created via test',
            status: 'active',
            date_created: new Date().toISOString(),
            date_updated: new Date().toISOString(),
          },
        }),
      })
    } else {
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true, data: {} }) })
    }
  })

  // Todos
  await page.route('**/api/v1/projects/*/todos**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })

  // Milestones
  await page.route('**/api/v1/projects/*/milestones**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })

  // Marketing plans
  await page.route('**/api/v1/projects/*/marketing**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })
}

/**
 * Mock Catalog/Community API endpoints
 */
export async function mockCatalogAPIs(page: Page) {
  // Mock community stats endpoint - specific data structure required
  await page.route('**/api/v1/community/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          modelsShared: 125,
          creators: 45,
          downloads: 3450
        }
      }),
    })
  })

  // Mock community models endpoint - array of model objects
  await page.route('**/api/v1/community/models**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'test-model-1',
            title: 'Test AI Model',
            author: 'Test Author',
            creator: 'Test Creator',
            material: 'PLA',
            license: 'CC-BY',
            downloads: 100,
            likes: 50,
            votes: 50,
            comments: 5,
            tags: ['test', 'ai']
          }
        ]
      }),
    })
  })

  // Catch-all for other community endpoints
  await page.route('**/api/v1/community/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    })
  })

  // Mock catalog endpoints
  await page.route('**/api/v1/catalog/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          templates: [],
          models: [],
          stats: { templates: 10, models: 25, downloads: 1000 },
        },
      }),
    })
  })
}

/**
 * Mock Copilot Hub / App APIs
 */
export async function mockAppAPIs(page: Page) {
  await page.route('**/api/v1/copilot/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { messages: [], conversation_id: 'test-conv' },
      }),
    })
  })

  await page.route('**/api/v1/credits/balance', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { balance: 50000, used: 1000 },
      }),
    })
  })

  await page.route('**/api/v1/credits**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { balance: 50000, used: 1000, transactions: [] },
      }),
    })
  })

  await page.route('**/api/v1/generate/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: {} }),
    })
  })
}

/**
 * Mock Team Members API endpoints for project member profiles
 */
export async function mockTeamMembersAPIs(page: Page) {
  // Team members list for a project
  await page.route('**/api/v1/projects/*/members**', async (route) => {
    const method = route.request().method()
    const url = route.request().url()

    // Check if this is a profile update
    const profileMatch = url.match(/\/members\/([^/]+)\/profile/)

    if (method === 'PATCH' && profileMatch) {
      // Profile update
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Profile updated successfully',
        }),
      })
    } else if (method === 'GET') {
      // List members
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'member-001',
              user_id: 'test-user-123',
              project_id: 'proj-1',
              role: 'owner',
              status: 'active',
              joined_at: new Date().toISOString(),
              profile: {
                role_title: 'Lead Developer',
                skills: ['Vue', 'TypeScript', 'Node.js'],
                expertise_areas: ['Frontend', 'Backend'],
                availability: 'available',
                capacity_percent: 60,
                preferred_task_types: ['Development', 'Code Review'],
                bio: 'Full-stack developer with 10 years of experience',
              },
              display_name: 'Test User',
              email: 'test@example.com',
            },
            {
              id: 'member-002',
              user_id: 'user-002',
              project_id: 'proj-1',
              role: 'member',
              status: 'active',
              joined_at: new Date().toISOString(),
              profile: {
                role_title: 'Marketing Manager',
                skills: ['SEO', 'Content Writing'],
                expertise_areas: ['Marketing'],
                availability: 'busy',
                capacity_percent: 80,
                preferred_task_types: ['Marketing', 'Content'],
                bio: 'Digital marketing specialist',
              },
              display_name: 'Jane Marketer',
              email: 'jane@example.com',
            },
          ],
        }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} }),
      })
    }
  })

  // Team context endpoint
  await page.route('**/api/v1/projects/*/team-context', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          projectId: 'proj-1',
          members: [
            {
              id: 'member-001',
              userId: 'test-user-123',
              displayName: 'Test User',
              role: 'owner',
              profile: {
                roleTitle: 'Lead Developer',
                skills: ['Vue', 'TypeScript', 'Node.js'],
                expertiseAreas: ['Frontend', 'Backend'],
                availability: 'available',
                capacityPercent: 60,
                preferredTaskTypes: ['Development', 'Code Review'],
                bio: 'Full-stack developer',
              },
            },
            {
              id: 'member-002',
              userId: 'user-002',
              displayName: 'Jane Marketer',
              role: 'member',
              profile: {
                roleTitle: 'Marketing Manager',
                skills: ['SEO', 'Content Writing'],
                expertiseAreas: ['Marketing'],
                availability: 'busy',
                capacityPercent: 80,
                preferredTaskTypes: ['Marketing', 'Content'],
                bio: 'Digital marketing specialist',
              },
            },
          ],
        },
      }),
    })
  })

  // Suggest assignee endpoint
  await page.route('**/api/v1/projects/*/suggest-assignee', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          suggestions: [
            {
              memberId: 'member-001',
              userId: 'test-user-123',
              displayName: 'Test User',
              matchScore: 85,
              matchReasons: [
                'Has skills: Vue, TypeScript',
                'Currently available',
                'Has capacity (60%)',
              ],
            },
          ],
          query: { taskDescription: 'Frontend development task' },
        },
      }),
    })
  })
}

/**
 * Mock Landing Page CMS content
 */
export async function mockLandingAPIs(page: Page) {
  // Directus pages endpoint - used by fetchPage()
  await page.route('**/directus/items/pages**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: 1,
          status: 'published',
          title: 'Home',
          slug: 'home',
          description: 'Landing page content',
          content: '<p>Welcome to SynthStack</p>',
          meta_title: 'SynthStack - Your AI Co-Founders',
          meta_description: 'AI-native platform',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]
      }),
    })
  })

  await page.route('**/api/cms/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: null }),
    })
  })

  await page.route('**/items/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })

  // Directus CMS routes
  await page.route('**/*.directus.app/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })
}

/**
 * Mock AI Settings API endpoints
 */
export async function mockAISettingsAPIs(page: Page) {
  await page.route('**/api/v1/users/me/ai-settings', async (route) => {
    const method = route.request().method()

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            globalModel: null,
            globalModelTier: 'standard',
            agentModelOverrides: {},
            defaultTemperature: 0.7,
            maxContextTokens: 8000,
            includeProjectContext: true,
            streamResponses: true,
            showReasoning: false,
          },
        }),
      })
      return
    }

    if (method === 'PATCH') {
      const body = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            globalModel: body?.globalModel ?? null,
            globalModelTier: body?.globalModelTier ?? 'standard',
            agentModelOverrides: body?.agentModelOverrides ?? {},
            defaultTemperature: body?.defaultTemperature ?? 0.7,
            maxContextTokens: body?.maxContextTokens ?? 8000,
            includeProjectContext: body?.includeProjectContext ?? true,
            streamResponses: body?.streamResponses ?? true,
            showReasoning: body?.showReasoning ?? false,
          },
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })
}

/**
 * Mock all Copilot-related APIs (minimal set for Community Edition tests)
 */
export async function mockAllCopilotAPIs(page: Page) {
  await mockAuth(page)
  await mockAppAPIs(page)
  await mockAISettingsAPIs(page)
}
