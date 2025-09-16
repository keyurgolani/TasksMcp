/**
 * Vitest setup file to configure test environment
 * Addresses EventEmitter memory leak warnings during parallel test execution
 */

import { EventEmitter } from 'events';

// Increase the default max listeners for all EventEmitters during testing
// This prevents MaxListenersExceededWarning when running parallel integration tests
EventEmitter.defaultMaxListeners = 50;

// Set process-level max listeners to handle Node.js internal EventEmitters
process.setMaxListeners(50);

// Suppress specific warnings that are expected during testing
const originalEmit = process.emit;
process.emit = function (event: string, ...args: any[]) {
  // Suppress MaxListenersExceededWarning during tests as it's expected with parallel execution
  if (event === 'warning' && args[0]?.name === 'MaxListenersExceededWarning') {
    return false;
  }
  return originalEmit.call(this, event, ...args);
} as any;

// Ensure clean environment for each test
beforeEach(() => {
  // Reset any test-specific environment variables
  delete process.env.STORAGE_TYPE;
  delete process.env.METRICS_ENABLED;
  delete process.env.NODE_ENV;
});