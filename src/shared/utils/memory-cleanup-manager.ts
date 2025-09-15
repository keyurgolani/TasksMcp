/**
 * Memory cleanup utilities and best practices
 */

import { logger } from '../utils/logger.js';

export interface CleanupTask {
  name: string;
  cleanup: () => void | Promise<void>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export class MemoryCleanupManager {
  private readonly cleanupTasks: CleanupTask[] = [];
  private isShuttingDown = false;
  private cleanupInterval: NodeJS.Timeout | undefined;

  constructor() {
    this.setupProcessHandlers();
  }

  /**
   * Register a cleanup task
   */
  registerCleanupTask(task: CleanupTask): void {
    this.cleanupTasks.push(task);

    // Sort by priority
    this.cleanupTasks.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    logger.debug('Cleanup task registered', {
      name: task.name,
      priority: task.priority,
    });
  }

  /**
   * Start periodic cleanup
   */
  startPeriodicCleanup(intervalMs = 30000): void {
    if (this.cleanupInterval) {
      return;
    }

    this.cleanupInterval = setInterval(() => {
      void this.runLowPriorityCleanup();
    }, intervalMs);

    logger.info('Periodic cleanup started', { intervalMs });
  }

  /**
   * Stop periodic cleanup
   */
  stopPeriodicCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
      logger.info('Periodic cleanup stopped');
    }
  }

  /**
   * Run all cleanup tasks
   */
  async runAllCleanup(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    logger.info('Running all cleanup tasks', {
      taskCount: this.cleanupTasks.length,
    });

    for (const task of this.cleanupTasks) {
      try {
        await task.cleanup();
        logger.debug('Cleanup task completed', { name: task.name });
      } catch (error) {
        logger.error('Cleanup task failed', { name: task.name, error });
      }
    }
  }

  /**
   * Run only low priority cleanup tasks
   */
  async runLowPriorityCleanup(): Promise<void> {
    const lowPriorityTasks = this.cleanupTasks.filter(
      task => task.priority === 'low' || task.priority === 'medium'
    );

    for (const task of lowPriorityTasks) {
      try {
        await task.cleanup();
      } catch (error) {
        logger.warn('Low priority cleanup task failed', {
          name: task.name,
          error,
        });
      }
    }
  }

  /**
   * Emergency cleanup for critical memory situations
   */
  async emergencyCleanup(): Promise<void> {
    logger.warn('Running emergency cleanup');

    const criticalTasks = this.cleanupTasks.filter(
      task => task.priority === 'critical' || task.priority === 'high'
    );

    for (const task of criticalTasks) {
      try {
        await task.cleanup();
        logger.info('Emergency cleanup task completed', { name: task.name });
      } catch (error) {
        logger.error('Emergency cleanup task failed', {
          name: task.name,
          error,
        });
      }
    }

    // Force garbage collection
    if (global.gc) {
      global.gc();
      logger.info('Forced garbage collection during emergency cleanup');
    }
  }

  /**
   * Graceful shutdown cleanup
   */
  async gracefulShutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('Starting graceful shutdown cleanup');

    // Stop periodic cleanup
    this.stopPeriodicCleanup();

    // Run all cleanup tasks
    await this.runAllCleanup();

    logger.info('Graceful shutdown cleanup completed');
  }

  private setupProcessHandlers(): void {
    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, starting graceful shutdown');
      await this.gracefulShutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, starting graceful shutdown');
      await this.gracefulShutdown();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async error => {
      logger.error('Uncaught exception, running emergency cleanup', { error });
      await this.emergencyCleanup();
      process.exit(1);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', async reason => {
      logger.error('Unhandled rejection, running emergency cleanup', {
        reason,
      });
      await this.emergencyCleanup();
      process.exit(1);
    });
  }
}

/**
 * Utility functions for memory management
 */
export class MemoryUtils {
  /**
   * Create a weak reference that automatically cleans up
   */
  static createWeakRef<T extends object>(
    obj: T,
    cleanup?: () => void
  ): WeakRef<T> {
    const ref = new WeakRef(obj);

    if (cleanup) {
      // Use FinalizationRegistry for cleanup when object is garbage collected
      const registry = new FinalizationRegistry(cleanup);
      registry.register(obj, undefined);
    }

    return ref;
  }

  /**
   * Create a map that automatically cleans up entries
   */
  static createAutoCleanupMap<K, V extends object>(): Map<K, WeakRef<V>> {
    const map = new Map<K, WeakRef<V>>();

    // Periodically clean up dead references
    setInterval(() => {
      for (const [key, ref] of map.entries()) {
        if (ref.deref() === undefined) {
          map.delete(key);
        }
      }
    }, 60000); // Clean up every minute

    return map;
  }

  /**
   * Deep clone an object without creating circular references
   */
  static safeDeepClone<T>(obj: T, seen = new WeakSet<object>()): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (seen.has(obj as object)) {
      return {} as T; // Break circular reference
    }

    seen.add(obj as object);

    if (obj instanceof Date) {
      return new Date(obj.getTime()) as T;
    }

    if (obj instanceof Array) {
      return obj.map(item => this.safeDeepClone(item, seen)) as T;
    }

    if (typeof obj === 'object') {
      const cloned = {} as T;
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          (cloned as Record<string, unknown>)[key] = this.safeDeepClone(
            (obj as Record<string, unknown>)[key],
            seen
          );
        }
      }
      return cloned;
    }

    return obj;
  }

  /**
   * Get current memory usage in a readable format
   */
  static getMemoryUsage(): {
    heapUsed: string;
    heapTotal: string;
    external: string;
    rss: string;
  } {
    const usage = process.memoryUsage();

    return {
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
      external: `${Math.round(usage.external / 1024 / 1024)} MB`,
      rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
    };
  }

  /**
   * Check if memory usage is approaching limits
   */
  static isMemoryPressure(): boolean {
    const usage = process.memoryUsage();
    const heapLimit = this.getHeapLimit();
    const heapUsageRatio = usage.heapUsed / heapLimit;

    // More aggressive threshold for leak detection
    return heapUsageRatio > 0.7; // 70% threshold
  }

  /**
   * Check if memory is in critical state
   */
  static isCriticalMemoryPressure(): boolean {
    const usage = process.memoryUsage();
    const heapLimit = this.getHeapLimit();
    const heapUsageRatio = usage.heapUsed / heapLimit;

    return heapUsageRatio > 0.9; // 90% threshold
  }

  /**
   * Get Node.js heap size limit
   */
  static getHeapLimit(): number {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const v8 = require('v8') as {
        getHeapStatistics(): { heap_size_limit: number };
      };
      const heapStats = v8.getHeapStatistics();
      return heapStats.heap_size_limit;
    } catch {
      // Fallback to default Node.js heap limit
      return 1.4 * 1024 * 1024 * 1024; // ~1.4GB
    }
  }

  /**
   * Force garbage collection if available
   */
  static forceGC(): boolean {
    if (global.gc) {
      global.gc();
      return true;
    }
    return false;
  }
}

// Global cleanup manager instance
export const memoryCleanupManager = new MemoryCleanupManager();