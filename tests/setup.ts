/**
 * Vitest setup file to configure test environment
 * Addresses EventEmitter memory leak warnings during parallel test execution
 * Provides comprehensive cleanup utilities for all test types
 */

import { EventEmitter } from "events";
import { afterEach, beforeEach } from "vitest";

// Increase the default max listeners for all EventEmitters during testing
// This prevents MaxListenersExceededWarning when running parallel integration tests
EventEmitter.defaultMaxListeners = 50;

// Set process-level max listeners to handle Node.js internal EventEmitters
process.setMaxListeners(50);

// Suppress specific warnings that are expected during testing
const originalEmit = process.emit;
process.emit = function (event: string, ...args: any[]) {
  // Suppress MaxListenersExceededWarning during tests as it's expected with parallel execution
  if (event === "warning" && args[0]?.name === "MaxListenersExceededWarning") {
    return false;
  }
  return originalEmit.call(this, event, ...args);
} as any;

// Track test artifacts for cleanup
interface TestArtifacts {
  storageInstances: Array<{
    shutdown?: () => Promise<void>;
    cleanup?: () => Promise<void>;
  }>;
  serverInstances: Array<{
    stop?: () => Promise<void>;
    shutdown?: () => Promise<void>;
  }>;
  managerInstances: Array<{ shutdown?: () => Promise<void> }>;
  environmentVariables: Set<string>;
  timers: Set<NodeJS.Timeout>;
  intervals: Set<NodeJS.Timeout>;
}

// Global test artifacts registry
const testArtifacts: TestArtifacts = {
  storageInstances: [],
  serverInstances: [],
  managerInstances: [],
  environmentVariables: new Set(),
  timers: new Set(),
  intervals: new Set(),
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
  registerEnvVar(key: string, value: string) {
    testArtifacts.environmentVariables.add(key);
    process.env[key] = value;
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

    // If there were errors, log them but don't fail the test
    if (errors.length > 0) {
      console.warn(
        "Test cleanup encountered errors:",
        errors.map((e) => e.message).join(", ")
      );
    }
  },
};

// Ensure clean environment for each test
beforeEach(() => {
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
});

// Comprehensive cleanup after each test
afterEach(async () => {
  await TestCleanup.cleanupAll();
});
