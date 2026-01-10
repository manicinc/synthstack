/**
 * E2E Tests for Lifetime License Checkout Flow
 * Tests the complete purchase journey from landing page to GitHub access
 *
 * TEST FLOW:
 * 1. Landing page → Click CTA button
 * 2. Stripe checkout (mocked)
 * 3. Success redirect with notification
 * 4. License access portal → Submit GitHub username
 * 5. GitHub invitation sent confirmation
 * 6. Mock invitation acceptance
 * 7. Access granted with repository clone instructions
 */

import { test, expect, Page } from '@playwright/test';
import {
  waitForAppReady,
  getByTestId,
  mockAuth,
  disableAnimations,
  setupErrorCapture,
  mockCommonAPIs,
} from './helpers/test-utils';

// Mock data
const mockStripeSessionId = 'cs_test_lifetime_license_12345';
const mockGithubUsername = 'testuser-synthstack';

interface LicenseData {
  email: string;
  github_username: string | null;
  github_access_status: string;
  github_username_submitted_at: string | null;
  github_invitation_sent_at: string | null;
  github_invitation_accepted_at: string | null;
}

const mockLicenseData: LicenseData = {
  email: 'test@example.com',
  github_username: null,
  github_access_status: 'pending',
  github_username_submitted_at: null,
  github_invitation_sent_at: null,
  github_invitation_accepted_at: null,
};

/**
 * Mock Stripe checkout redirect
 */
async function mockStripeCheckout(page: Page) {
  await page.route('**/api/v1/billing/lifetime-checkout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          checkoutUrl: `https://checkout.stripe.com/test?session_id=${mockStripeSessionId}`,
          sessionId: mockStripeSessionId,
        },
      }),
    });
  });

  // Mock Stripe checkout page (redirect)
  await page.route('**/checkout.stripe.com/**', async (route) => {
    // Simulate successful payment and redirect back
    await route.fulfill({
      status: 302,
      headers: {
        Location: `http://localhost:3050/?license=success&session_id=${mockStripeSessionId}`,
      },
    });
  });
}

/**
 * Mock license access portal APIs
 */
async function mockLicenseAccessAPIs(
  page: Page,
  licenseStatus: 'pending' | 'username_submitted' | 'invited' | 'active'
) {
  const licenseData: LicenseData = {
    ...mockLicenseData,
    github_access_status: licenseStatus,
  };

  if (licenseStatus === 'username_submitted' || licenseStatus === 'invited') {
    licenseData.github_username = mockGithubUsername;
    licenseData.github_username_submitted_at = new Date().toISOString();
  }

  if (licenseStatus === 'invited' || licenseStatus === 'active') {
    licenseData.github_invitation_sent_at = new Date().toISOString();
  }

  if (licenseStatus === 'active') {
    licenseData.github_invitation_accepted_at = new Date().toISOString();
  }

  // GET /status
  await page.route('**/api/v1/license-access/status**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: licenseData,
      }),
    });
  });

  // POST /submit-username
  await page.route('**/api/v1/license-access/submit-username', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'GitHub invitation sent! Check your email to accept.',
      }),
    });
  });

  // POST /check-acceptance
  await page.route('**/api/v1/license-access/check-acceptance', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        status: licenseStatus === 'active' ? 'active' : 'pending',
        message:
          licenseStatus === 'active'
            ? 'Access granted!'
            : 'Invitation not yet accepted',
      }),
    });
  });
}

/**
 * Mock landing page APIs
 */
async function mockLandingAPIs(page: Page) {
  await page.route('**/api/v1/pages**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'landing-page-1',
          title: 'Your Autonomous Agency in a Box',
          description: 'AI-Native. Cross-Platform.',
          content: 'Test landing page content',
        },
      }),
    });
  });

  await page.route('**/api/v1/promo/stats**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          maxRedemptions: 100,
          remaining: 42,
          discount: '33% off',
        },
      }),
    });
  });
}

test.describe('Lifetime License Checkout Flow', () => {
  let getErrors: () => string[];

  test.beforeEach(async ({ page }) => {
    getErrors = setupErrorCapture(page);
    await mockAuth(page);
    await mockStripeCheckout(page);
    await mockLandingAPIs(page);
    await mockCommonAPIs(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== 'passed') {
      const errors = getErrors();
      if (errors.length > 0) {
        console.log('Captured errors:', errors);
      }
    }
  });

  test('should complete full checkout and username submission flow', async ({
    page,
  }) => {
    // 1. Start on landing page
    await page.goto('/en/');
    await waitForAppReady(page);
    await disableAnimations(page);

    // 2. Verify landing page loaded
    const landingPage = getByTestId(page, 'landing-page');
    await expect(landingPage).toBeAttached({ timeout: 15000 });

    // 3. Click "Get Early Bird Access" CTA button
    const ctaButton = getByTestId(page, 'hero-cta-primary');
    await expect(ctaButton).toBeAttached({ timeout: 10000 });

    // Mock the checkout redirect before clicking
    await page.route('**/billing/lifetime-checkout', async (route) => {
      // Immediately redirect to success page
      await route.abort();
      await page.goto(
        `/?license=success&session_id=${mockStripeSessionId}`
      );
    });

    await ctaButton.click();

    // 4. Wait for success notification
    await page.waitForTimeout(1000);
    const notification = page.locator('.q-notification', {
      hasText: /Purchase successful/i,
    });
    await expect(notification).toBeVisible({ timeout: 5000 });

    // 5. Navigate to license access portal
    await mockLicenseAccessAPIs(page, 'pending');
    await page.goto(
      `/license-access?session=${mockStripeSessionId}`
    );
    await waitForAppReady(page);

    // 6. Verify license access page loaded
    await expect(page.locator('h1', { hasText: /Get Your Source Code Access/i })).toBeVisible({
      timeout: 10000,
    });

    // 7. Verify we're on Step 1 (submit username)
    await expect(page.locator('text=Step 1 of 2')).toBeVisible();

    // 8. Submit GitHub username
    const usernameInput = page.locator('input[label="GitHub Username"]').or(
      page.locator('input[type="text"]').first()
    );
    await usernameInput.fill(mockGithubUsername);

    const submitButton = page.locator('button', {
      hasText: /Submit.*Get Invitation/i,
    });
    await submitButton.click();

    // 9. Wait for invitation sent success message
    await page.waitForTimeout(1000);
    const successNotification = page.locator('.q-notification', {
      hasText: /invitation sent/i,
    });
    await expect(successNotification).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid GitHub username', async ({ page }) => {
    await mockLicenseAccessAPIs(page, 'pending');
    await page.goto(`/license-access?session=${mockStripeSessionId}`);
    await waitForAppReady(page);

    // Mock username validation error
    await page.route('**/api/v1/license-access/submit-username', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'GitHub username not found',
        }),
      });
    });

    // Try to submit invalid username
    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.fill('nonexistent-user-123456789');

    const submitButton = page.locator('button', {
      hasText: /Submit/i,
    });
    await submitButton.click();

    // Verify error notification
    await page.waitForTimeout(1000);
    const errorNotification = page.locator('.q-notification', {
      hasText: /not found/i,
    });
    await expect(errorNotification).toBeVisible({ timeout: 5000 });
  });

  test('should display invitation sent state', async ({ page }) => {
    await mockLicenseAccessAPIs(page, 'invited');
    await page.goto(`/license-access?session=${mockStripeSessionId}`);
    await waitForAppReady(page);

    // Verify Step 2 displayed
    await expect(page.locator('text=Step 2 of 2')).toBeVisible({ timeout: 10000 });

    // Verify GitHub username shown
    await expect(
      page.locator(`text=@${mockGithubUsername}`)
    ).toBeVisible();

    // Verify instructions displayed
    await expect(page.locator('text=Check your email')).toBeVisible();
    await expect(page.locator('text=noreply@github.com')).toBeVisible();

    // Verify "I've Accepted" button present
    const acceptedButton = page.locator('button', {
      hasText: /I've Accepted/i,
    });
    await expect(acceptedButton).toBeVisible();
  });

  test('should detect invitation acceptance', async ({ page }) => {
    // Start in invited state
    await mockLicenseAccessAPIs(page, 'invited');
    await page.goto(`/license-access?session=${mockStripeSessionId}`);
    await waitForAppReady(page);

    // Mock acceptance check to return active
    await page.route('**/api/v1/license-access/check-acceptance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          status: 'active',
          message: 'Access granted!',
        }),
      });
    });

    // Click "I've Accepted" button
    const acceptedButton = page.locator('button', {
      hasText: /I've Accepted/i,
    });
    await acceptedButton.click();

    // Wait for success notification
    await page.waitForTimeout(1000);
    const successNotification = page.locator('.q-notification', {
      hasText: /Access confirmed|Welcome to SynthStack/i,
    });
    await expect(successNotification).toBeVisible({ timeout: 5000 });

    // Should now show success state
    await expect(page.locator('h2', { hasText: /You're All Set/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('should display access granted state with clone instructions', async ({
    page,
  }) => {
    await mockLicenseAccessAPIs(page, 'active');
    await page.goto(`/license-access?session=${mockStripeSessionId}`);
    await waitForAppReady(page);

    // Verify success state
    await expect(page.locator('h2', { hasText: /You're All Set/i })).toBeVisible({
      timeout: 10000,
    });

    // Verify git clone command present
    const cloneCommand = page.locator('code', {
      hasText: /git clone.*synthstack/i,
    });
    await expect(cloneCommand).toBeVisible();

    // Verify copy button present
    const copyButton = page.locator('button[icon="content_copy"]').or(
      page.locator('button', { hasText: /copy/i })
    );
    await expect(copyButton.first()).toBeVisible();

    // Verify essential resources links
    await expect(page.locator('h3', { hasText: /Essential Resources/i })).toBeVisible();
    await expect(page.locator('a[href*="github"]')).toBeVisible();
  });

  test('should handle already-granted access gracefully', async ({ page }) => {
    await mockLicenseAccessAPIs(page, 'pending');
    await page.goto(`/license-access?session=${mockStripeSessionId}`);
    await waitForAppReady(page);

    // Mock API to return "already granted" error
    await page.route('**/api/v1/license-access/submit-username', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'GitHub access already granted',
        }),
      });
    });

    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.fill(mockGithubUsername);

    const submitButton = page.locator('button', { hasText: /Submit/i });
    await submitButton.click();

    // Should show error notification
    await page.waitForTimeout(1000);
    const errorNotification = page.locator('.q-notification', {
      hasText: /already granted/i,
    });
    await expect(errorNotification).toBeVisible({ timeout: 5000 });
  });

  test('should show 404 for invalid session', async ({ page }) => {
    await page.route('**/api/v1/license-access/status**', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'License not found',
        }),
      });
    });

    await page.goto(`/license-access?session=invalid_session_123`);
    await waitForAppReady(page);

    // Should show error state
    await expect(page.locator('text=License not found')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should validate username format client-side', async ({ page }) => {
    await mockLicenseAccessAPIs(page, 'pending');
    await page.goto(`/license-access?session=${mockStripeSessionId}`);
    await waitForAppReady(page);

    // Try invalid username with spaces
    const usernameInput = page.locator('input[type="text"]').first();
    await usernameInput.fill('invalid username!@#');

    const submitButton = page.locator('button', { hasText: /Submit/i });
    await submitButton.click();

    // Should show validation error (either inline or notification)
    const hasInlineError = await page
      .locator('.q-field__messages', { hasText: /invalid/i })
      .isVisible()
      .catch(() => false);

    const hasNotificationError = await page
      .locator('.q-notification', { hasText: /invalid/i })
      .isVisible()
      .catch(() => false);

    expect(hasInlineError || hasNotificationError).toBe(true);
  });
});

test.describe('License Access Portal - Landing Page Integration', () => {
  let getErrors: () => string[];

  test.beforeEach(async ({ page }) => {
    getErrors = setupErrorCapture(page);
    await mockAuth(page);
    await mockLandingAPIs(page);
    await mockCommonAPIs(page);
  });

  test('should show checkout explainer on landing page', async ({ page }) => {
    await page.goto('/en/');
    await waitForAppReady(page);
    await disableAnimations(page);

    const heroSection = getByTestId(page, 'hero-section');
    await expect(heroSection).toBeAttached({ timeout: 15000 });

    // Verify checkout explainer is visible
    const explainer = page.locator('.checkout-explainer');
    await expect(explainer).toBeVisible({ timeout: 10000 });

    // Verify key benefits are shown
    await expect(explainer.locator('text=GitHub repo')).toBeVisible();
    await expect(explainer.locator('text=Lifetime updates')).toBeVisible();
    await expect(explainer.locator('text=No monthly fees')).toBeVisible();
  });

  test('should display early bird promo with stats', async ({ page }) => {
    await page.goto('/en/');
    await waitForAppReady(page);

    // Verify promo note is visible
    const promoNote = page.locator('.early-bird-note');
    await expect(promoNote).toBeVisible({ timeout: 10000 });

    // Should show remaining count
    await expect(promoNote.locator('text=/42|remaining/i')).toBeVisible();
  });
});
