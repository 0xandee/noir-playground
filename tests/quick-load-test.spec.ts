import { test, expect } from '@playwright/test';

test.describe('Quick Load Test', () => {
  test('should load the page and show console errors', async ({ page }) => {
    const consoleMessages: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(`[pageerror] ${error.message}`);
    });

    await page.goto('/');
    await page.waitForTimeout(5000);

    console.log('\n=== All Console Messages ===');
    consoleMessages.forEach(msg => console.log(msg));

    console.log('\n=== Console Errors ===');
    consoleErrors.forEach(err => console.log(err));

    const htmlContent = await page.content();
    console.log('\n=== Page has content:', htmlContent.length > 1000);

    // Just log what happened, don't fail
    console.log('\n=== Test Complete ===');
  });
});
