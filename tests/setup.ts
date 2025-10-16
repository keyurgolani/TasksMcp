/**
 * Vitest setup file to configure test environment
 * Addresses EventEmitter memory leak warnings during parallel test execution
 * Provides cleanup utilities for all test types
 */

import { EventEmitter } from 'events';

import { afterEach, beforeEach } from 'vitest';

// Increase the default max listeners for all EventEmitters during testing
// This prevents MaxListenersExceededWarning when running parallel integration tests
EventEmitter.defaultMaxListeners = 50;

// Set process-level max listeners to handle Node.js internal EventEmitters
process.setMaxListeners(50);

// Suppress specific warnings that are expected during testing
const originalEmit = process.emit;
process.emit = function (event: string, ...args: unknown[]) {
  // Suppress MaxListenersExceededWarning during tests as it's expected with parallel execution
  if (
    event === 'warning' &&
    args[0] &&
    typeof args[0] === 'object' &&
    'name' in args[0] &&
    args[0].name === 'MaxListenersExceededWarning'
  ) {
    return false;
  }
  return originalEmit.call(this, event, ...args);
} as typeof process.emit;

// Track test artifacts for cleanup
interface TestArtifacts {
  storageInstances: Array<{
    shutdown?: () => Promise<void>;
    cleanup?: () => Promise<void>;
  }>;
  serverInstances: Array<{
    stop?: () => Promise<void>;
    shutdown?: () => Promise<void>;
    close?: () => Promise<void>;
  }>;
  managerInstances: Array<{ shutdown?: () => Promise<void> }>;
  environmentVariables: Set<string>;
  timers: Set<NodeJS.Timeout>;
  intervals: Set<NodeJS.Timeout>;
  childProcesses: Set<any>;
}

// Global test artifacts registry
const testArtifacts: TestArtifacts = {
  storageInstances: [],
  serverInstances: [],
  managerInstances: [],
  environmentVariables: new Set(),
  timers: new Set(),
  intervals: new Set(),
  childProcesses: new Set(),
};

// Helper functions for test artifact management
export const TestCleanup = {
  /**
   * Register a storage instance for cleanup
   */
  registerStorage(storage: {
    shutdown?: () => Promise<void>;
    cleanup?: () => Promise<void>;
  }) {
    testArtifacts.storageInstances.push(storage);
    return storage;
  },

  /**
   * Register a server instance for cleanup
   */
  registerServer(server: {
    stop?: () => Promise<void>;
    shutdown?: () => Promise<void>;
    close?: () => Promise<void>;
  }) {
    testArtifacts.serverInstances.push(server);
    return server;
  },

  /**
   * Register a manager instance for cleanup
   */
  registerManager(manager: { shutdown?: () => Promise<void> }) {
    testArtifacts.managerInstances.push(manager);
    return manager;
  },

  /**
   * Register an environment variable for cleanup
   */
  async registerEnvVar(key: string, value: string) {
    testArtifacts.environmentVariables.add(key);
    process.env[key] = value;

    // Reload ConfigManager to pick up the new environment variable
    try {
      const { ConfigManager } = await import(
        '../src/infrastructure/config/index.js'
      );
      ConfigManager.getInstance().reload();
    } catch (_error) {
      // Ignore errors if ConfigManager hasn't been loaded yet
    }
  },

  /**
   * Register a timer for cleanup
   */
  registerTimer(timer: NodeJS.Timeout) {
    testArtifacts.timers.add(timer);
    return timer;
  },

  /**
   * Register an interval for cleanup
   */
  registerInterval(interval: NodeJS.Timeout) {
    testArtifacts.intervals.add(interval);
    return interval;
  },

  /**
   * Register a child process for cleanup
   */
  registerProcess(process: any) {
    testArtifacts.childProcesses.add(process);

    // Remove from registry when process exits naturally
    process.on('close', () => {
      testArtifacts.childProcesses.delete(process);
    });

    process.on('exit', () => {
      testArtifacts.childProcesses.delete(process);
    });

    // Also remove when process is killed
    process.on('disconnect', () => {
      testArtifacts.childProcesses.delete(process);
    });

    return process;
  },

  /**
   * Manually clean up all registered artifacts
   */
  async cleanupAll() {
    const errors: Error[] = [];

    // Clean up timers and intervals first
    for (const timer of testArtifacts.timers) {
      try {
        clearTimeout(timer);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    testArtifacts.timers.clear();

    for (const interval of testArtifacts.intervals) {
      try {
        clearInterval(interval);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    testArtifacts.intervals.clear();

    // Clean up child processes more aggressively
    const processCleanupPromises: Promise<void>[] = [];
    testArtifacts.childProcesses.forEach(process => {
      const cleanupPromise = (async () => {
        try {
          // Check if process is still alive before trying to kill it
          if (process && process.pid) {
            try {
              // Check if process exists by sending signal 0
              process.kill(0);

              // If we get here, process exists, so kill it
              if (!process.killed) {
                // Try graceful shutdown first
                process.kill('SIGTERM');

                // Wait a shorter time for graceful shutdown
                await new Promise(resolve => setTimeout(resolve, 100));

                // Force kill if still running
                if (!process.killed) {
                  process.kill('SIGKILL');
                }
              }
            } catch (killError: any) {
              // Process doesn't exist or already killed (ESRCH error)
              if (killError.code !== 'ESRCH') {
                // Some other error occurred
                errors.push(killError);
              }
            }
          }
        } catch (error) {
          errors.push(
            error instanceof Error ? error : new Error(String(error))
          );
        }
      })();
      processCleanupPromises.push(cleanupPromise);
    });

    // Wait for all process cleanup to complete with timeout
    await Promise.race([
      Promise.all(processCleanupPromises),
      new Promise(resolve => setTimeout(resolve, 2000)), // 2 second timeout
    ]);
    testArtifacts.childProcesses.clear();

    // Clean up managers
    for (const manager of testArtifacts.managerInstances) {
      try {
        if (manager.shutdown) {
          await manager.shutdown();
        }
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    testArtifacts.managerInstances.length = 0;

    // Clean up servers
    for (const server of testArtifacts.serverInstances) {
      try {
        if (server.stop) {
          await server.stop();
        } else if (server.shutdown) {
          await server.shutdown();
        } else if (server.close) {
          await server.close();
        }
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    testArtifacts.serverInstances.length = 0;

    // Clean up storage instances
    for (const storage of testArtifacts.storageInstances) {
      try {
        if (storage.shutdown) {
          await storage.shutdown();
        }
        if (storage.cleanup) {
          await storage.cleanup();
        }
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
    testArtifacts.storageInstances.length = 0;

    // Clean up environment variables
    for (const key of testArtifacts.environmentVariables) {
      delete process.env[key];
    }
    testArtifacts.environmentVariables.clear();

    // Additional cleanup: kill any lingering test-spawned processes (not vitest itself)
    try {
      const { execSync } = await import('child_process');
      // Kill any test-spawned server processes
      execSync('pkill -f "node.*mcp\\.js|node.*rest\\.js" || true', {
        timeout: 2000,
        stdio: 'ignore',
      });
      // Kill any long-running tool processes spawned by tests
      execSync(
        'pkill -f "eslint.*--format|tsc.*--noEmit|prettier.*--check" || true',
        {
          timeout: 2000,
          stdio: 'ignore',
        }
      );
      // Kill any orphaned npx processes that might be left behind
      execSync('pkill -f "npx.*eslint|npx.*prettier|npx.*tsc" || true', {
        timeout: 2000,
        stdio: 'ignore',
      });
    } catch {
      // Ignore cleanup errors
    }

    // If there were errors, log them but don't fail the test
    if (errors.length > 0) {
      console.warn(
        'Test cleanup encountered errors:',
        errors.map(e => e.message).join(', ')
      );
    }
  },
};

// Ensure clean environment for each test
beforeEach(async () => {
  // Reset any test-specific environment variables
  delete process.env.STORAGE_TYPE;
  delete process.env.METRICS_ENABLED;
  delete process.env.NODE_ENV;
  delete process.env.LOG_LEVEL;
  delete process.env.DATA_DIRECTORY;
  delete process.env.BACKUP_RETENTION_DAYS;
  delete process.env.ENABLE_COMPRESSION;

  // Disable file logging during tests to prevent log file creation
  process.env.DISABLE_FILE_LOGGING = 'true';

  // Reset ConfigManager singleton to pick up new environment variables
  try {
    const { ConfigManager } = await import(
      '../src/infrastructure/config/index.js'
    );
    ConfigManager.getInstance().reload();
  } catch (_error) {
    // Ignore errors if ConfigManager hasn't been loaded yet
  }
});

// Cleanup after each test
afterEach(async () => {
  await TestCleanup.cleanupAll();

  // Additional aggressive cleanup after each test
  try {
    const { execSync } = await import('child_process');
    // Kill any processes that might have been missed
    execSync('pkill -f "npx.*eslint|npx.*prettier|npx.*tsc" || true', {
      timeout: 1000,
      stdio: 'ignore',
    });
  } catch {
    // Ignore cleanup errors
  }
});

// Global cleanup when test process exits
process.on('exit', () => {
  try {
    const { execSync } = require('child_process');
    // Kill test-spawned processes
    execSync('pkill -f "node.*mcp\\.js|node.*rest\\.js" || true', {
      timeout: 1000,
      stdio: 'ignore',
    });
    // Kill orphaned npx processes
    execSync('pkill -f "npx.*eslint|npx.*prettier|npx.*tsc" || true', {
      timeout: 1000,
      stdio: 'ignore',
    });
  } catch {
    // Ignore cleanup errors on exit
  }
});

// Handle process termination signals
process.on('SIGTERM', async () => {
  await TestCleanup.cleanupAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await TestCleanup.cleanupAll();
  process.exit(0);
});

// Handle uncaught exceptions to ensure cleanup
process.on('uncaughtException', async error => {
  console.error('Uncaught exception:', error);
  await TestCleanup.cleanupAll();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  await TestCleanup.cleanupAll();
  process.exit(1);
});
