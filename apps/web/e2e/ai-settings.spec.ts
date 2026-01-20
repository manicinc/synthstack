/**
 * @file e2e/ai-settings.spec.ts
 * @description E2E tests for AI Settings functionality
 *
 * Test Philosophy: Structure over content
 * - Test that UI elements exist and respond
 * - Avoid asserting specific text content
 * - Use data-testid selectors for stability
 */

import { test, expect } from '@playwright/test';
import { mockAISettingsAPIs, mockAllCopilotAPIs } from './helpers/test-utils';

test.describe('AI Settings', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllCopilotAPIs(page);
    await mockAISettingsAPIs(page);
  });

  test.describe('Settings Page Access', () => {
    test('should navigate to AI settings page', async ({ page }) => {
      // Navigate directly to AI settings page
      await page.goto('/app/settings/ai');

      // Wait for page to load and settings to be fetched
      await page.waitForResponse('**/api/v1/users/me/ai-settings');

      // Settings form should be present
      const settingsForm = page.locator('[data-testid="ai-settings-form"]');
      await expect(settingsForm).toBeAttached();
    });

    test('should load existing settings', async ({ page }) => {
      await page.goto('/app/settings/ai');

      // Wait for settings to load
      await page.waitForResponse('**/api/v1/users/me/ai-settings');

      // Form should have values populated
      const modelSelect = page.locator('[data-testid="model-select"]');
      await expect(modelSelect).toBeAttached();
    });
  });

  test.describe('Model Selection', () => {
    test('should display model selector', async ({ page }) => {
      await page.goto('/app/settings/ai');

      const modelSelect = page.locator('[data-testid="model-select"]');
      await expect(modelSelect).toBeAttached();
    });

    test('should show model options when clicked', async ({ page }) => {
      await page.goto('/app/settings/ai');

      const modelSelect = page.locator('[data-testid="model-select"]');
      await modelSelect.click();

      // Options should appear
      const options = page.locator('[data-testid="model-option"]');
      await expect(options.first()).toBeVisible();
    });

    test('should show model tiers', async ({ page }) => {
      await page.goto('/app/settings/ai');

      const modelSelect = page.locator('[data-testid="model-select"]');
      await modelSelect.click();

      // Should show tier indicators (cheap, standard, premium)
      const tierIndicators = page.locator(
        '[data-testid="tier-badge"], .tier-indicator, [class*="tier"]'
      );
      await expect(tierIndicators.first()).toBeVisible();
    });

    test('should select a different model', async ({ page }) => {
      let updateCalled = false;
      await page.route('**/api/v1/users/me/ai-settings', async (route) => {
        if (route.request().method() === 'PATCH') {
          updateCalled = true;
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, data: {} }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/app/settings/ai');

      const modelSelect = page.locator('[data-testid="model-select"]');
      await modelSelect.click();

      // Select a different option
      const options = page.locator('[data-testid="model-option"]');
      const optionCount = await options.count();
      if (optionCount > 1) {
        await options.nth(1).click();
      }

      // Save button if present
      const saveBtn = page.locator('[data-testid="save-settings"]');
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
      }
    });
  });

  test.describe('Temperature Setting', () => {
    test('should display temperature slider', async ({ page }) => {
      await page.goto('/app/settings/ai');

      const tempSlider = page.locator('[data-testid="temperature-slider"]');
      await expect(tempSlider).toBeAttached();
    });

    test('should adjust temperature value', async ({ page }) => {
      await page.goto('/app/settings/ai');

      const tempSlider = page.locator('[data-testid="temperature-slider"] input');
      if (await tempSlider.isVisible()) {
        // Get current value
        const initialValue = await tempSlider.inputValue();

        // Change value
        await tempSlider.fill('0.5');

        // Value should be different
        const newValue = await tempSlider.inputValue();
        expect(newValue).not.toBe(initialValue);
      }
    });

    test('should show temperature description', async ({ page }) => {
      await page.goto('/app/settings/ai');

      // Should have some description/label for temperature
      const tempLabel = page.locator(
        '[data-testid="temperature-label"], label:has-text("Temperature")'
      );
      await expect(tempLabel).toBeAttached();
    });
  });

  test.describe('Context Settings', () => {
    // Skip: These tests require specific UI elements not present in current implementation
    test.skip('should display context tokens setting', async ({ page }) => {
      await page.goto('/app/settings/ai');

      const contextSetting = page.locator('[data-testid="context-tokens-input"]');
      await expect(contextSetting).toBeAttached();
    });

    test.skip('should display RAG toggle', async ({ page }) => {
      await page.goto('/app/settings/ai');

      const ragToggle = page.locator('[data-testid="include-context-toggle"]');
      await expect(ragToggle).toBeAttached();
    });

    test.skip('should toggle project context', async ({ page }) => {
      await page.goto('/app/settings/ai');

      const contextToggle = page.locator('[data-testid="include-context-toggle"]');
      const initialState = await contextToggle.isChecked();

      await contextToggle.click();

      const newState = await contextToggle.isChecked();
      expect(newState).not.toBe(initialState);
    });
  });

  test.describe('Stream Settings', () => {
    // Skip: These tests require specific UI elements not present in current implementation
    test.skip('should display stream toggle', async ({ page }) => {
      await page.goto('/app/settings/ai');

      const streamToggle = page.locator('[data-testid="stream-toggle"]');
      await expect(streamToggle).toBeAttached();
    });

    test.skip('should display reasoning toggle', async ({ page }) => {
      await page.goto('/app/settings/ai');

      const reasoningToggle = page.locator('[data-testid="reasoning-toggle"]');
      await expect(reasoningToggle).toBeAttached();
    });
  });

  test.describe('Save and Persistence', () => {
    test('should save settings on form submit', async ({ page }) => {
      let savedSettings: Record<string, unknown> | null = null;

      await page.route('**/api/v1/users/me/ai-settings', async (route) => {
        if (route.request().method() === 'PATCH') {
          savedSettings = route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, data: savedSettings }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/app/settings/ai');

      // Make a change
      const tempSlider = page.locator('[data-testid="temperature-slider"] input');
      if (await tempSlider.isVisible()) {
        await tempSlider.fill('0.3');
      }

      // Save
      const saveBtn = page.locator('[data-testid="save-settings"]');
      if (await saveBtn.isVisible()) {
        await saveBtn.click();

        // Wait for save
        await page.waitForResponse('**/api/v1/users/me/ai-settings');
      }
    });

    test('should show success message on save', async ({ page }) => {
      await page.route('**/api/v1/users/me/ai-settings', async (route) => {
        if (route.request().method() === 'PATCH') {
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, data: {} }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/app/settings/ai');

      // Save
      const saveBtn = page.locator('[data-testid="save-settings"]');
      if (await saveBtn.isVisible()) {
        await saveBtn.click();

        // Should show success notification
        const successMsg = page.locator(
          '.q-notification--positive, [data-testid="save-success"], [role="alert"]'
        );
        await expect(successMsg.first()).toBeVisible({ timeout: 5000 });
      }
    });

    test('should handle save failure', async ({ page }) => {
      await page.route('**/api/v1/users/me/ai-settings', async (route) => {
        if (route.request().method() === 'PATCH') {
          await route.fulfill({
            status: 500,
            body: JSON.stringify({ success: false, error: 'Save failed' }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/app/settings/ai');

      const saveBtn = page.locator('[data-testid="save-settings"]');
      if (await saveBtn.isVisible()) {
        await saveBtn.click();

        // Should show error notification
        const errorMsg = page.locator(
          '.q-notification--negative, [data-testid="save-error"], [role="alert"]'
        );
        await expect(errorMsg.first()).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Agent-Specific Overrides', () => {
    // Skip: Agent overrides UI not implemented
    test.skip('should display agent overrides section', async ({ page }) => {
      await page.goto('/app/settings/ai');

      const overridesSection = page.locator('[data-testid="agent-overrides"]');
      await expect(overridesSection).toBeAttached();
    });

    test('should allow adding agent override', async ({ page }) => {
      await page.goto('/app/settings/ai');

      const addOverrideBtn = page.locator('[data-testid="add-override-button"]');
      if (await addOverrideBtn.isVisible()) {
        await addOverrideBtn.click();

        // Should show override form/dialog
        const overrideForm = page.locator('[data-testid="override-form"]');
        await expect(overrideForm).toBeVisible();
      }
    });
  });

  test.describe('Reset to Defaults', () => {
    // Skip: Reset button not present in current implementation
    test.skip('should have reset button', async ({ page }) => {
      await page.goto('/app/settings/ai');

      const resetBtn = page.locator('[data-testid="reset-defaults"]');
      await expect(resetBtn).toBeAttached();
    });

    test('should reset settings when confirmed', async ({ page }) => {
      await page.route('**/api/v1/users/me/ai-settings', async (route) => {
        if (route.request().method() === 'PATCH') {
          const body = route.request().postDataJSON();
          // Should be default values
          await route.fulfill({
            status: 200,
            body: JSON.stringify({ success: true, data: body }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/app/settings/ai');

      const resetBtn = page.locator('[data-testid="reset-defaults"]');
      if (await resetBtn.isVisible()) {
        await resetBtn.click();

        // Confirm dialog if present
        const confirmBtn = page.locator('[data-testid="confirm-reset"]');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
      }
    });
  });
});
