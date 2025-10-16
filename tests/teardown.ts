/**
 * Global teardown for vitest to ensure all processes are cleaned up
 */

import { execSync } from 'child_process';

export default async function teardown() {
  console.log('Running global teardown...');

  try {
    // Only kill test-spawned processes, not vitest itself
    execSync('pkill -f "node.*mcp\\.js|node.*rest\\.js" || true', {
      timeout: 3000,
      stdio: 'ignore',
    });

    // Kill any long-running tool processes that might have been spawned by tests
    execSync(
      'pkill -f "eslint.*--format|tsc.*--noEmit|prettier.*--check" || true',
      {
        timeout: 3000,
        stdio: 'ignore',
      }
    );

    // Kill any orphaned npx processes
    execSync('pkill -f "npx.*eslint|npx.*prettier|npx.*tsc" || true', {
      timeout: 3000,
      stdio: 'ignore',
    });

    // Wait a moment for processes to die
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('Global teardown completed');
  } catch (error) {
    console.warn('Error during global teardown:', error);
  }
}
