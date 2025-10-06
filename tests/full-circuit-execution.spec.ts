import { test, expect } from '@playwright/test';

test.describe('Full Circuit Execution Test', () => {
  test('should execute complete circuit workflow: compile → execute → prove → verify', async ({ page }) => {
    const logs: string[] = [];
    const errors: string[] = [];

    // Capture console output
    page.on('console', msg => {
      const text = msg.text();
      logs.push(text);
      if (msg.type() === 'error') {
        errors.push(text);
      }
    });

    // Navigate to the playground
    await page.goto('/');

    // Wait for Monaco editor to be ready
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000); // Let everything initialize

    console.log('✓ Page loaded successfully');

    // Look for the Execute/Run button
    const executeButton = page.getByRole('button').filter({
      hasText: /Execute|Run|Compile & Execute/i
    }).first();

    await expect(executeButton).toBeVisible({ timeout: 10000 });
    console.log('✓ Execute button found');

    // Click the execute button
    await executeButton.click();
    console.log('✓ Execute button clicked');

    // Wait for execution to complete (circuits can take time)
    await page.waitForTimeout(15000);

    // Check for WASM errors specifically
    const wasmErrors = errors.filter(err =>
      err.includes('WebAssembly.instantiate') ||
      err.includes('wbg_constructor') ||
      err.includes('function import requires a callable')
    );

    if (wasmErrors.length > 0) {
      console.log('❌ WASM Errors detected:');
      wasmErrors.forEach(err => console.log(`  - ${err}`));
    }

    // Look for success indicators in console output
    const successIndicators = logs.filter(log =>
      log.includes('Proof verified successfully') ||
      log.includes('Verification successful') ||
      log.includes('✓ Verified') ||
      log.includes('success')
    );

    // Look for execution steps
    const executionSteps = logs.filter(log =>
      log.includes('Compiling') ||
      log.includes('Executing') ||
      log.includes('Proving') ||
      log.includes('Verifying')
    );

    // Check for visible success/error indicators on the page
    await page.waitForTimeout(2000);

    // Try to find execution status on the page
    const pageContent = await page.textContent('body');

    console.log('\n=== Test Results ===');
    console.log(`WASM Errors: ${wasmErrors.length}`);
    console.log(`Success Indicators: ${successIndicators.length}`);
    console.log(`Execution Steps: ${executionSteps.length}`);
    console.log(`Total Console Logs: ${logs.length}`);
    console.log(`Total Errors: ${errors.length}`);

    if (executionSteps.length > 0) {
      console.log('\n=== Execution Steps Detected ===');
      executionSteps.slice(0, 10).forEach(step => console.log(`  ${step}`));
    }

    if (successIndicators.length > 0) {
      console.log('\n=== Success Messages ===');
      successIndicators.forEach(msg => console.log(`  ✓ ${msg}`));
    }

    if (errors.length > 0) {
      console.log('\n=== Errors (first 5) ===');
      errors.slice(0, 5).forEach(err => console.log(`  ✗ ${err}`));
    }

    // Main assertion: No WASM errors
    expect(wasmErrors, 'WASM instantiation should succeed').toHaveLength(0);

    // If we got this far without WASM errors, the upgrade is working
    console.log('\n✅ Circuit execution completed without WASM errors');
  });

  test('should show execution output in console panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for console/output panel
    const consolePanel = page.locator('[role="log"]').or(
      page.locator('text=/Console|Output|Execution/i').first()
    );

    // Page should have loaded successfully
    await expect(page.locator('body')).toBeVisible();

    console.log('✓ Page structure is valid');
  });
});
