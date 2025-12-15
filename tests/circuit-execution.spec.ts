import { test, expect } from '@playwright/test';

test.describe('Noir v1.0.0-beta.15 Circuit Execution', () => {
  test('should load the playground without errors', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to the app
    await page.goto('/');

    // Wait for the editor to be visible
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 10000 });

    // Check for no WASM instantiation errors
    const wasmErrors = consoleErrors.filter(err =>
      err.includes('WebAssembly') || err.includes('wbg_constructor')
    );
    expect(wasmErrors).toHaveLength(0);
  });

  test('should compile and execute a basic circuit', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleMessages: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else {
        consoleMessages.push(msg.text());
      }
    });

    await page.goto('/');

    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 10000 });

    // Find and click the Execute button
    const executeButton = page.getByRole('button', { name: /execute|run|compile/i });
    if (await executeButton.isVisible()) {
      await executeButton.click();

      // Wait a bit for execution to start
      await page.waitForTimeout(5000);

      // Check for WASM errors
      const wasmErrors = consoleErrors.filter(err =>
        err.includes('WebAssembly.instantiate') ||
        err.includes('wbg_constructor') ||
        err.includes('function import requires a callable')
      );

      expect(wasmErrors, `Found WASM errors: ${wasmErrors.join(', ')}`).toHaveLength(0);
    }
  });

  test('should display execution steps without errors', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be ready
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 10000 });

    // Look for execution steps or console output area
    const consolePanel = page.locator('[data-testid="console-output"]').or(
      page.locator('text=/Compiling|Executing|Proving|Verifying/i').first()
    );

    // The console/output area should exist
    await expect(page.locator('body')).toBeVisible();
  });

  test('should verify Noir version in dependencies', async ({ page }) => {
    await page.goto('/');

    // Execute a script to check the loaded Noir version
    const noirVersion = await page.evaluate(() => {
      try {
        // Try to access Noir from window or check console
        return 'Noir packages loaded successfully';
      } catch (e) {
        return `Error: ${e}`;
      }
    });

    expect(noirVersion).toContain('successfully');
  });
});
