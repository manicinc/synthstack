import { test } from '@playwright/test';

const baseURL = 'http://localhost:3050';

// Define viewports
const viewports = {
  'iPhone-SE': { width: 375, height: 667 },
  'iPhone-12-Pro': { width: 390, height: 844 },
  'iPad-Mini': { width: 768, height: 1024 },
  'Desktop': { width: 1280, height: 720 }
};

// Portal pages to test (without /dashboard suffix since path: '' maps to base /portal)
const portalPages = [
  { name: 'dashboard', path: '/portal' },
  { name: 'projects', path: '/portal/projects' },
  { name: 'invoices', path: '/portal/invoices' },
];

// Helper function to login (mock for now - can be extended with real auth)
async function loginIfNeeded(page: any) {
  // For now, we'll just navigate directly
  // In production, you'd add actual login flow here
  // await page.goto(`${baseURL}/auth/login`);
  // await page.fill('[name="email"]', 'test@example.com');
  // await page.fill('[name="password"]', 'password');
  // await page.click('button[type="submit"]');
  // await page.waitForNavigation();
}

// Mock API responses
async function setupMocks(page: any) {
  // Mock portal dashboard API
  await page.route('**/api/portal/dashboard', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          stats: {
            projects: 5,
            openTasks: 12,
            pendingInvoices: 2,
            pendingAmount: 3500,
            unreadMessages: 3
          },
          recentActivity: [
            { type: 'project_update', title: 'Project Alpha updated', timestamp: new Date().toISOString() },
            { type: 'task_completed', title: 'Homepage design completed', timestamp: new Date().toISOString() },
            { type: 'message', title: 'New message from team', timestamp: new Date().toISOString() }
          ]
        }
      })
    });
  });

  // Mock projects API
  await page.route('**/api/portal/projects*', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: '1',
            name: 'Website Redesign',
            description: 'Modern redesign of company website',
            status: 'active',
            role: 'owner',
            taskCount: 15,
            completedTaskCount: 8,
            updatedAt: new Date().toISOString(),
            canViewTasks: true,
            canViewFiles: true,
            canViewInvoices: true
          },
          {
            id: '2',
            name: 'Mobile App Development',
            description: 'iOS and Android app',
            status: 'active',
            role: 'viewer',
            taskCount: 24,
            completedTaskCount: 12,
            updatedAt: new Date().toISOString(),
            canViewTasks: true,
            canViewFiles: false,
            canViewInvoices: false
          }
        ]
      })
    });
  });

  // Mock invoices API
  await page.route('**/api/portal/invoices*', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          data: [
            {
              id: '1',
              invoice_number: 'INV-2024-001',
              status: 'sent',
              total: 2500,
              due_date: '2024-02-15',
              issue_date: '2024-01-15',
              project: { name: 'Website Redesign' },
              line_items: [
                { description: 'Design work', quantity: 20, unit_price: 100, total: 2000 },
                { description: 'Development', quantity: 5, unit_price: 100, total: 500 }
              ]
            },
            {
              id: '2',
              invoice_number: 'INV-2024-002',
              status: 'paid',
              total: 1000,
              due_date: '2024-01-30',
              issue_date: '2024-01-01',
              paid_at: '2024-01-28',
              project: { name: 'Mobile App Development' },
              line_items: []
            }
          ]
        }
      })
    });
  });
}

// Generate screenshots for all viewports and pages
for (const [deviceName, viewport] of Object.entries(viewports)) {
  test.describe(`${deviceName} screenshots`, () => {
    for (const portalPage of portalPages) {
      test(`${portalPage.name} page`, async ({ page }) => {
        await page.setViewportSize(viewport);

        // Setup API mocks
        await setupMocks(page);

        await page.goto(`${baseURL}${portalPage.path}`);
        await page.waitForTimeout(2000);

        await page.screenshot({
          path: `screenshots/${deviceName}-${portalPage.name}.png`,
          fullPage: true
        });
      });
    }
  });
}

// Special test for loading skeleton (iPhone SE)
test('iPhone SE - loading skeleton', async ({ page }) => {
  await page.setViewportSize(viewports['iPhone-SE']);
  await setupMocks(page);
  await page.goto(`${baseURL}/portal/projects`);
  await page.waitForTimeout(300); // Capture early to see skeleton

  await page.screenshot({
    path: 'screenshots/iPhone-SE-loading-skeleton.png',
    fullPage: true
  });
});

// Special test for mobile action button (iPhone 12 Pro)
test('iPhone 12 Pro - invoices action button', async ({ page }) => {
  await page.setViewportSize(viewports['iPhone-12-Pro']);
  await setupMocks(page);
  await page.goto(`${baseURL}/portal/invoices`);
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: 'screenshots/iPhone-12-Pro-invoices-actions.png',
    fullPage: true
  });
});
