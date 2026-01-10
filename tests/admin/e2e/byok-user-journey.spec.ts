/**
 * BYOK End-to-End User Journey Tests
 *
 * Tests complete user flows from the frontend through to the backend:
 * - Configuring BYOK keys
 * - Using BYOK vs internal credits
 * - Error states and fallbacks
 * - UI feedback and indicators
 */

import { test, expect, type Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:8056';
const TEST_USER = {
  email: 'byok-test@example.com',
  password: 'test-password-123',
};

// Mock API keys (these won't actually work but will pass validation in test mode)
const MOCK_API_KEYS = {
  openai: {
    valid: 'sk-test-valid-openai-key-1234567890abcdef',
    invalid: 'sk-test-invalid-key',
  },
  anthropic: {
    valid: 'sk-ant-test-valid-anthropic-key-1234567890abcdef',
    invalid: 'sk-ant-test-invalid-key',
  },
};

// Helper functions
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/app/**');
}

async function navigateToApiKeys(page: Page) {
  await page.goto(`${BASE_URL}/app/settings/api-keys`);
  await page.waitForSelector('[data-testid="api-keys-page"]', { timeout: 10000 });
}

async function addApiKey(page: Page, provider: 'openai' | 'anthropic', apiKey: string) {
  // Select provider
  await page.click(`[data-testid="provider-card-${provider}"]`);

  // Enter API key
  await page.fill('[data-testid="api-key-input"]', apiKey);

  // Submit
  await page.click('[data-testid="add-key-button"]');

  // Wait for success message
  await page.waitForSelector('[data-testid="success-message"]', { timeout: 5000 });
}

async function deleteApiKey(page: Page, provider: string) {
  await page.click(`[data-testid="delete-key-${provider}"]`);
  await page.click('[data-testid="confirm-delete"]');
  await page.waitForSelector('[data-testid="delete-success"]');
}

// Test suites
test.describe('BYOK User Journey - Initial Setup', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('User can access API Keys page as Premium user', async ({ page }) => {
    await navigateToApiKeys(page);

    // Verify page loaded
    expect(await page.isVisible('[data-testid="api-keys-page"]')).toBeTruthy();

    // Verify provider cards are visible
    expect(await page.isVisible('[data-testid="provider-card-openai"]')).toBeTruthy();
    expect(await page.isVisible('[data-testid="provider-card-anthropic"]')).toBeTruthy();
  });

  test('User can add OpenAI API key', async ({ page }) => {
    await navigateToApiKeys(page);

    await addApiKey(page, 'openai', MOCK_API_KEYS.openai.valid);

    // Verify key appears in list
    expect(await page.isVisible('[data-testid="api-key-openai"]')).toBeTruthy();

    // Verify key hint shows
    const keyHint = await page.textContent('[data-testid="api-key-openai-hint"]');
    expect(keyHint).toContain('sk-...');
  });

  test('User can add Anthropic API key', async ({ page }) => {
    await navigateToApiKeys(page);

    await addApiKey(page, 'anthropic', MOCK_API_KEYS.anthropic.valid);

    // Verify key appears in list
    expect(await page.isVisible('[data-testid="api-key-anthropic"]')).toBeTruthy();

    // Verify key hint shows
    const keyHint = await page.textContent('[data-testid="api-key-anthropic-hint"]');
    expect(keyHint).toContain('sk-ant-...');
  });

  test('User sees validation error for invalid API key', async ({ page }) => {
    await navigateToApiKeys(page);

    // Attempt to add invalid key
    await page.click('[data-testid="provider-card-openai"]');
    await page.fill('[data-testid="api-key-input"]', MOCK_API_KEYS.openai.invalid);
    await page.click('[data-testid="add-key-button"]');

    // Wait for error message
    const errorMessage = await page.waitForSelector('[data-testid="error-message"]');
    const errorText = await errorMessage.textContent();
    expect(errorText).toContain('Invalid API key');
  });

  test('User can delete an API key', async ({ page }) => {
    await navigateToApiKeys(page);

    // Add a key first
    await addApiKey(page, 'openai', MOCK_API_KEYS.openai.valid);

    // Delete it
    await deleteApiKey(page, 'openai');

    // Verify key is removed
    expect(await page.isVisible('[data-testid="api-key-openai"]')).toBeFalsy();
  });
});

test.describe('BYOK User Journey - Status and Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToApiKeys(page);
  });

  test('User sees current routing mode banner (BYOK-first)', async ({ page }) => {
    // Add BYOK key
    await addApiKey(page, 'openai', MOCK_API_KEYS.openai.valid);

    // Verify BYOK-first banner shows
    const banner = await page.waitForSelector('[data-testid="routing-mode-banner"]');
    const bannerText = await banner.textContent();
    expect(bannerText).toContain('BYOK-first mode');
    expect(bannerText).toContain('Using your API keys');
  });

  test('User sees credit balance and BYOK status', async ({ page }) => {
    // Navigate to dashboard/credits page
    await page.goto(`${BASE_URL}/app/credits`);

    // Verify credit balance widget shows
    expect(await page.isVisible('[data-testid="credits-widget"]')).toBeTruthy();

    // Add BYOK key
    await navigateToApiKeys(page);
    await addApiKey(page, 'openai', MOCK_API_KEYS.openai.valid);

    // Go back to credits page
    await page.goto(`${BASE_URL}/app/credits`);

    // Verify BYOK tip banner shows
    const byokTip = await page.waitForSelector('[data-testid="byok-tip-banner"]');
    const tipText = await byokTip.textContent();
    expect(tipText).toContain('Using your own API keys');
  });

  test('User sees usage statistics for BYOK keys', async ({ page }) => {
    // Add key
    await addApiKey(page, 'openai', MOCK_API_KEYS.openai.valid);

    // Navigate to usage stats
    await page.click('[data-testid="view-usage-stats"]');

    // Verify stats page loaded
    await page.waitForSelector('[data-testid="usage-stats-page"]');

    // Verify usage metrics are visible
    expect(await page.isVisible('[data-testid="total-requests"]')).toBeTruthy();
    expect(await page.isVisible('[data-testid="total-tokens"]')).toBeTruthy();
    expect(await page.isVisible('[data-testid="estimated-cost"]')).toBeTruthy();
  });
});

test.describe('BYOK User Journey - Chat/Copilot Integration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('User with BYOK key uses their key for chat', async ({ page }) => {
    // Add BYOK key
    await navigateToApiKeys(page);
    await addApiKey(page, 'openai', MOCK_API_KEYS.openai.valid);

    // Navigate to copilot
    await page.goto(`${BASE_URL}/app/copilot`);

    // Verify BYOK status indicator shows in header
    const byokIndicator = await page.waitForSelector('[data-testid="byok-status-indicator"]');
    const indicatorText = await byokIndicator.textContent();
    expect(indicatorText).toContain('Using your API key');

    // Send a chat message
    await page.fill('[data-testid="chat-input"]', 'Hello, test message');
    await page.click('[data-testid="send-button"]');

    // Wait for response
    await page.waitForSelector('[data-testid="chat-message-assistant"]', { timeout: 15000 });

    // Verify response received (BYOK was used)
    const messages = await page.locator('[data-testid="chat-message-assistant"]').count();
    expect(messages).toBeGreaterThan(0);
  });

  test('User without BYOK key uses internal credits for chat', async ({ page }) => {
    // Navigate to copilot without adding BYOK
    await page.goto(`${BASE_URL}/app/copilot`);

    // Verify internal credits indicator shows
    const creditsIndicator = await page.waitForSelector(
      '[data-testid="internal-credits-indicator"]'
    );
    const indicatorText = await creditsIndicator.textContent();
    expect(indicatorText).toContain('Using platform credits');

    // Send a chat message
    await page.fill('[data-testid="chat-input"]', 'Hello, test message');
    await page.click('[data-testid="send-button"]');

    // Wait for response
    await page.waitForSelector('[data-testid="chat-message-assistant"]', { timeout: 15000 });

    // Verify credits were deducted
    await page.goto(`${BASE_URL}/app/credits`);
    const creditsRemaining = await page.textContent('[data-testid="credits-remaining"]');
    expect(creditsRemaining).toBeDefined();
  });

  test('User sees error when no credits and no BYOK', async ({ page }) => {
    // Assume user has 0 credits (set in test setup)
    // Navigate to copilot
    await page.goto(`${BASE_URL}/app/copilot`);

    // Try to send message
    await page.fill('[data-testid="chat-input"]', 'Hello, test message');
    await page.click('[data-testid="send-button"]');

    // Verify error message shows
    const errorBanner = await page.waitForSelector('[data-testid="insufficient-credits-error"]');
    const errorText = await errorBanner.textContent();
    expect(errorText).toContain('Insufficient credits');
    expect(errorText).toContain('configure BYOK');
  });
});

test.describe('BYOK User Journey - BYOK-Only Mode', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('User with BYOK in BYOK-only mode can use services', async ({ page }) => {
    // Add BYOK key
    await navigateToApiKeys(page);
    await addApiKey(page, 'anthropic', MOCK_API_KEYS.anthropic.valid);

    // Verify BYOK-only mode banner shows
    const banner = await page.waitForSelector('[data-testid="byok-only-banner"]');
    const bannerText = await banner.textContent();
    expect(bannerText).toContain('BYOK-only mode');
    expect(bannerText).toContain('must configure your own API keys');

    // Navigate to copilot
    await page.goto(`${BASE_URL}/app/copilot`);

    // Send message successfully
    await page.fill('[data-testid="chat-input"]', 'Hello');
    await page.click('[data-testid="send-button"]');
    await page.waitForSelector('[data-testid="chat-message-assistant"]', { timeout: 15000 });
  });

  test('User without BYOK in BYOK-only mode sees error', async ({ page }) => {
    await navigateToApiKeys(page);

    // Verify BYOK-only mode warning shows
    const warning = await page.waitForSelector('[data-testid="byok-required-warning"]');
    const warningText = await warning.textContent();
    expect(warningText).toContain('Action Required');
    expect(warningText).toContain('configure your own API keys');

    // Try to use copilot without BYOK
    await page.goto(`${BASE_URL}/app/copilot`);
    await page.fill('[data-testid="chat-input"]', 'Hello');
    await page.click('[data-testid="send-button"]');

    // Verify BYOK required error shows
    const error = await page.waitForSelector('[data-testid="byok-required-error"]');
    const errorText = await error.textContent();
    expect(errorText).toContain('BYOK required');
  });
});

test.describe('BYOK User Journey - Graceful Fallback', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Invalid BYOK key falls back to internal credits', async ({ page }) => {
    // Add an invalid key (will be marked invalid after first use)
    await navigateToApiKeys(page);
    await page.click('[data-testid="provider-card-openai"]');
    await page.fill('[data-testid="api-key-input"]', MOCK_API_KEYS.openai.invalid);
    await page.click('[data-testid="add-key-button"]');

    // Navigate to copilot
    await page.goto(`${BASE_URL}/app/copilot`);

    // Send message
    await page.fill('[data-testid="chat-input"]', 'Hello');
    await page.click('[data-testid="send-button"]');

    // Wait for fallback notification
    const fallbackNotice = await page.waitForSelector('[data-testid="fallback-notice"]');
    const noticeText = await fallbackNotice.textContent();
    expect(noticeText).toContain('BYOK key failed');
    expect(noticeText).toContain('using platform credits');

    // Message should still be sent successfully
    await page.waitForSelector('[data-testid="chat-message-assistant"]', { timeout: 15000 });
  });

  test('User can re-validate failed BYOK key', async ({ page }) => {
    await navigateToApiKeys(page);

    // Key marked as invalid
    const invalidBadge = await page.waitForSelector('[data-testid="key-status-invalid"]');
    expect(await invalidBadge.isVisible()).toBeTruthy();

    // Click re-test button
    await page.click('[data-testid="retest-key-openai"]');

    // Wait for validation
    await page.waitForSelector('[data-testid="validating-spinner"]');

    // Check result (should still be invalid in this test)
    await page.waitForSelector('[data-testid="validation-failed"]');
    const errorMsg = await page.textContent('[data-testid="validation-error"]');
    expect(errorMsg).toContain('Invalid API key');
  });
});

test.describe('BYOK User Journey - Settings and Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToApiKeys(page);
  });

  test('User can view BYOK settings and current mode', async ({ page }) => {
    // Click settings/info button
    await page.click('[data-testid="byok-settings-button"]');

    // Verify settings modal opens
    await page.waitForSelector('[data-testid="byok-settings-modal"]');

    // Verify current mode is displayed
    const currentMode = await page.textContent('[data-testid="current-routing-mode"]');
    expect(currentMode).toMatch(/BYOK-first mode|Credit-first mode|BYOK-only mode/);

    // Verify feature flags are displayed
    expect(await page.isVisible('[data-testid="flag-byok-enabled"]')).toBeTruthy();
    expect(await page.isVisible('[data-testid="flag-byok-uses-internal"]')).toBeTruthy();
    expect(await page.isVisible('[data-testid="flag-byok-only"]')).toBeTruthy();
  });

  test('User sees helpful tooltips on API Keys page', async ({ page }) => {
    // Hover over info icons
    await page.hover('[data-testid="tooltip-provider-info"]');
    await page.waitForSelector('[data-testid="tooltip-content"]');
    let tooltipText = await page.textContent('[data-testid="tooltip-content"]');
    expect(tooltipText).toContain('API provider');

    // Test rate limit info tooltip
    await page.hover('[data-testid="tooltip-rate-limit-info"]');
    await page.waitForSelector('[data-testid="tooltip-content"]');
    tooltipText = await page.textContent('[data-testid="tooltip-content"]');
    expect(tooltipText).toContain('rate limits are bypassed');

    // Test usage stats tooltip
    await page.hover('[data-testid="tooltip-usage-stats"]');
    await page.waitForSelector('[data-testid="tooltip-content"]');
    tooltipText = await page.textContent('[data-testid="tooltip-content"]');
    expect(tooltipText).toContain('track usage');
  });

  test('User can access BYOK FAQ from API Keys page', async ({ page }) => {
    // Click FAQ link
    await page.click('[data-testid="byok-faq-link"]');

    // Verify FAQ page opens
    await page.waitForURL('**/faq/byok**');

    // Verify FAQ content loaded
    expect(await page.isVisible('[data-testid="faq-byok-page"]')).toBeTruthy();

    // Verify key FAQ questions are visible
    const faqHeadings = await page.locator('h3').allTextContents();
    expect(faqHeadings.some((h) => h.includes('What is BYOK'))).toBeTruthy();
    expect(faqHeadings.some((h) => h.includes('How do I add'))).toBeTruthy();
  });
});

test.describe('BYOK User Journey - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('User with both OpenAI and Anthropic keys can use both', async ({ page }) => {
    await navigateToApiKeys(page);

    // Add both keys
    await addApiKey(page, 'openai', MOCK_API_KEYS.openai.valid);
    await addApiKey(page, 'anthropic', MOCK_API_KEYS.anthropic.valid);

    // Verify both show in list
    expect(await page.isVisible('[data-testid="api-key-openai"]')).toBeTruthy();
    expect(await page.isVisible('[data-testid="api-key-anthropic"]')).toBeTruthy();

    // Verify routing status shows multiple providers
    const status = await page.textContent('[data-testid="byok-providers-list"]');
    expect(status).toContain('openai');
    expect(status).toContain('anthropic');
  });

  test('User can switch between providers in copilot', async ({ page }) => {
    await navigateToApiKeys(page);
    await addApiKey(page, 'openai', MOCK_API_KEYS.openai.valid);
    await addApiKey(page, 'anthropic', MOCK_API_KEYS.anthropic.valid);

    // Navigate to copilot
    await page.goto(`${BASE_URL}/app/copilot`);

    // Verify provider selector shows
    const providerSelect = await page.waitForSelector('[data-testid="provider-select"]');
    expect(await providerSelect.isVisible()).toBeTruthy();

    // Switch provider
    await page.selectOption('[data-testid="provider-select"]', 'anthropic');

    // Verify indicator updates
    const indicator = await page.textContent('[data-testid="current-provider"]');
    expect(indicator).toContain('Anthropic');
  });

  test('User sees rate limit bypass notice when using BYOK', async ({ page }) => {
    await navigateToApiKeys(page);
    await addApiKey(page, 'openai', MOCK_API_KEYS.openai.valid);

    // Verify rate limit bypass banner shows
    const banner = await page.waitForSelector('[data-testid="rate-limit-bypass-banner"]');
    const bannerText = await banner.textContent();
    expect(bannerText).toContain('Rate limits bypassed');
    expect(bannerText).toContain('using your own quota');
  });

  test('User can export usage data', async ({ page }) => {
    await navigateToApiKeys(page);
    await addApiKey(page, 'openai', MOCK_API_KEYS.openai.valid);

    // Click export button
    await page.click('[data-testid="export-usage-button"]');

    // Verify export modal opens
    await page.waitForSelector('[data-testid="export-modal"]');

    // Select date range
    await page.selectOption('[data-testid="export-period"]', '30');

    // Click export
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="confirm-export"]');
    const download = await downloadPromise;

    // Verify file downloaded
    expect(download.suggestedFilename()).toMatch(/byok-usage.*\.csv/);
  });
});

test.describe('BYOK User Journey - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('User sees clear error when API key validation fails', async ({ page }) => {
    await navigateToApiKeys(page);

    // Try invalid key
    await page.click('[data-testid="provider-card-openai"]');
    await page.fill('[data-testid="api-key-input"]', 'invalid-key-format');
    await page.click('[data-testid="add-key-button"]');

    // Verify validation error shows immediately
    const error = await page.waitForSelector('[data-testid="validation-error"]');
    const errorText = await error.textContent();
    expect(errorText).toContain('Invalid key format');
    expect(errorText).toContain('must start with sk-');
  });

  test('User is warned before deleting API key in use', async ({ page }) => {
    await navigateToApiKeys(page);
    await addApiKey(page, 'openai', MOCK_API_KEYS.openai.valid);

    // Attempt to delete
    await page.click('[data-testid="delete-key-openai"]');

    // Verify warning modal
    const warning = await page.waitForSelector('[data-testid="delete-warning-modal"]');
    const warningText = await warning.textContent();
    expect(warningText).toContain('currently in use');
    expect(warningText).toContain('will switch to internal credits');

    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');

    // Verify key deleted
    expect(await page.isVisible('[data-testid="api-key-openai"]')).toBeFalsy();
  });

  test('User sees network error handling', async ({ page }) => {
    // Simulate network error by going offline
    await page.context().setOffline(true);

    await navigateToApiKeys(page);

    // Try to add key (should fail gracefully)
    await page.click('[data-testid="provider-card-openai"]');
    await page.fill('[data-testid="api-key-input"]', MOCK_API_KEYS.openai.valid);
    await page.click('[data-testid="add-key-button"]');

    // Verify network error message
    const error = await page.waitForSelector('[data-testid="network-error"]');
    const errorText = await error.textContent();
    expect(errorText).toContain('Network error');
    expect(errorText).toContain('try again');

    // Go back online
    await page.context().setOffline(false);
  });
});
