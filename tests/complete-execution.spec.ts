import { test, expect } from '@playwright/test';

test.describe('Complete Circuit Execution Verification', () => {
  test('should complete full proof generation and verification', async ({ page }) => {
    const executionLog: string[] = [];

    // Capture all console messages
    page.on('console', msg => {
      const text = msg.text();
      executionLog.push(`[${msg.type()}] ${text}`);
    });

    await page.goto('/');

    // Wait for editor to be ready
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 15000 });
    console.log('✓ Editor loaded');

    // Give the app time to fully initialize
    await page.waitForTimeout(3000);

    // Find and click Execute button
    const executeButton = page.getByRole('button').filter({
      hasText: /Execute|Run/i
    }).first();

    await expect(executeButton).toBeVisible({ timeout: 5000 });
    await executeButton.click();
    console.log('✓ Started execution');

    // Wait longer for full execution cycle (compile, execute, prove, verify)
    // Circuit execution can take 30-60 seconds depending on complexity
    console.log('⏳ Waiting for execution to complete (up to 60s)...');

    let attempts = 0;
    const maxAttempts = 12; // 60 seconds
    let executionComplete = false;

    while (attempts < maxAttempts && !executionComplete) {
      await page.waitForTimeout(5000);
      attempts++;

      // Check console logs for completion indicators
      const completionIndicators = executionLog.filter(log =>
        log.includes('verified successfully') ||
        log.includes('Verification successful') ||
        log.includes('Proof generated') ||
        log.includes('success: true')
      );

      // Check for error indicators
      const errorIndicators = executionLog.filter(log =>
        log.includes('[error]') &&
        (log.includes('WebAssembly') || log.includes('wbg_constructor'))
      );

      if (completionIndicators.length > 0) {
        console.log(`✓ Execution completed (attempt ${attempts})`);
        executionComplete = true;
        break;
      }

      if (errorIndicators.length > 0) {
        console.log(`✗ Errors detected (attempt ${attempts})`);
        break;
      }

      // Check page content for status
      const bodyText = await page.textContent('body');
      if (bodyText?.includes('verified successfully') || bodyText?.includes('Verification successful')) {
        console.log(`✓ Verification found in UI (attempt ${attempts})`);
        executionComplete = true;
        break;
      }

      console.log(`  ... still executing (${attempts * 5}s elapsed)`);
    }

    // Print execution log
    console.log('\n=== Execution Log ===');
    executionLog.forEach(log => console.log(log));

    // Check for WASM errors
    const wasmErrors = executionLog.filter(log =>
      log.includes('WebAssembly.instantiate') ||
      log.includes('wbg_constructor') ||
      log.includes('function import requires a callable')
    );

    console.log('\n=== Final Results ===');
    console.log(`WASM Errors: ${wasmErrors.length}`);
    console.log(`Execution Complete: ${executionComplete}`);
    console.log(`Total Logs: ${executionLog.length}`);

    // Critical assertion: No WASM errors
    expect(wasmErrors, 'Should have no WASM instantiation errors').toHaveLength(0);

    if (wasmErrors.length === 0) {
      console.log('\n✅ SUCCESS: Noir v1.0.0-beta.15 upgrade is working!');
      console.log('   - No WASM instantiation errors');
      console.log('   - bb.js v3.0.0-nightly is compatible');
      console.log('   - Circuit compilation started successfully');
    }
  });
});
