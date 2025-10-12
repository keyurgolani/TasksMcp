/**
 * Comprehensive memory leak prevention system
 */

import { EventEmitter } from 'events';

import { logger } from './logger.js';
import { memoryCleanupManager } from './memory-cleanup.js';

export interface MemoryLeakPreventionConfig {
  enableAutoCleanup: boolean;
  cleanupIntervalMs: number;
  memoryThresholdMB: number;
  aggressiveCleanupThresholdMB: number;
  enableProfiling: boolean;
  enableLeakDetection: boolean;
  maxCacheSize: number;
  maxObjectTrackers: number;
}

export interface MemoryHealthReport {
  timestamp: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  isHealthy: boolean;
  warnings: string[];
  recommendations: string[];
  leakDetection: {
    isLeaking: boolean;
    confidence: number;
    growthRate: number;
  };
  cacheStats: {
    totalCaches: number;
    totalEntries: number;
    memoryEstimate: number;
  };
}

export class MemoryLeakPrevention extends EventEmitter {
  private readonly config: MemoryLeakPreventionConfig;
  private isActive = false;
  private healthCheckInterval?: NodeJS.Timeout | undefined;
  private cleanupInterval?: NodeJS.Timeout | undefined;
  private readonly registeredCaches = new Map<
    string,
    WeakRef<Map<unknown, unknown> | Set<unknown>>
  >();
  private readonly objectPools = new Map<string, unknown[]>();
  private memoryHistory: Array<{ timestamp: number; heapUsed: number }> = [];
  private readonly maxHistorySize = 100;

  constructor(config: Partial<MemoryLeakPreventionConfig> = {}) {
    super();

    this.config = {
      enableAutoCleanup: true,
      cleanupIntervalMs: 30000, // 30 seconds
      memoryThresholdMB: 512, // 512MB threshold
      aggressiveCleanupThresholdMB: 1024, // 1GB aggressive threshold
      enableProfiling: false, // Disabled by default for performance
      enableLeakDetection: true,
      maxCacheSize: 1000,
      maxObjectTrackers: 100,
      ...config,
    };
  }

  /**
   * Start memory leak prevention system
   */
  start(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;

    // Start health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 60000); // Every minute

    // Start cleanup if enabled
    if (this.config.enableAutoCleanup) {
      this.cleanupInterval = setInterval(() => {
        void this.performAutomaticCleanup();
      }, this.config.cleanupIntervalMs);
    }

    // Register process handlers
    this.setupProcessHandlers();

    logger.info('Memory leak prevention system started', {
      config: this.config,
    });
  }

  /**
   * Stop memory leak prevention system
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    // Stop cleanup
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    // Memory health checks disabled

    // Clear registered caches
    this.registeredCaches.clear();
    this.objectPools.clear();
    this.memoryHistory.length = 0;

    // Remove all listeners
    this.removeAllListeners();

    logger.info('Memory leak prevention system stopped');
  }

  /**
   * Register a cache for cleanup
   */
  registerCache(
    name: string,
    cache: Map<unknown, unknown> | Set<unknown>
  ): void {
    this.registeredCaches.set(name, new WeakRef(cache));
    logger.debug('Cache registered for cleanup', { name, size: cache.size });
  }

  /**
   * Create an object pool to reduce garbage collection pressure
   */
  createObjectPool<T>(
    name: string,
    factory: () => T,
    maxSize = 100
  ): {
    acquire: () => T;
    release: (obj: T) => void;
    clear: () => void;
  } {
    const pool: T[] = [];
    this.objectPools.set(name, pool);

    return {
      acquire: (): T => {
        const obj = pool.pop();
        return obj || factory();
      },
      release: (obj: T): void => {
        if (pool.length < maxSize) {
          // Reset object properties if it's an object
          if (typeof obj === 'object' && obj !== null) {
            // Basic object reset - in production you might want more sophisticated reset
            Object.keys(obj).forEach(key => {
              delete (obj as Record<string, unknown>)[key];
            });
          }
          pool.push(obj);
        }
      },
      clear: (): void => {
        pool.length = 0;
      },
    };
  }

  /**
   * Get comprehensive memory health report
   */
  getHealthReport(): MemoryHealthReport {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check memory thresholds
    if (heapUsedMB > this.config.aggressiveCleanupThresholdMB) {
      warnings.push(`Critical memory usage: ${heapUsedMB.toFixed(1)}MB`);
      recommendations.push(
        'Immediate cleanup required - consider restarting process'
      );
    } else if (heapUsedMB > this.config.memoryThresholdMB) {
      warnings.push(`High memory usage: ${heapUsedMB.toFixed(1)}MB`);
      recommendations.push('Perform cleanup and monitor closely');
    }

    // Check cache sizes
    let totalCaches = 0;
    let totalEntries = 0;
    let memoryEstimate = 0;

    for (const [name, cacheRef] of this.registeredCaches.entries()) {
      const cache = cacheRef.deref();
      if (cache) {
        totalCaches++;
        totalEntries += cache.size;
        memoryEstimate += cache.size * 64; // Rough estimate

        if (cache.size > this.config.maxCacheSize) {
          warnings.push(
            `Large cache detected: ${name} (${cache.size} entries)`
          );
          recommendations.push(`Consider reducing cache size for ${name}`);
        }
      } else {
        // Cache was garbage collected, remove the reference
        this.registeredCaches.delete(name);
      }
    }

    // Simple memory check
    const memUsage = process.memoryUsage();
    const isLeaking =
      memUsage.heapUsed > this.config.memoryThresholdMB * 1024 * 1024;

    if (isLeaking) {
      warnings.push(
        `Memory usage high: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`
      );
      recommendations.push(
        'Consider reducing memory usage or increasing memory limits'
      );
    }

    const isHealthy = warnings.length === 0 && !isLeaking;

    return {
      timestamp: Date.now(),
      memoryUsage,
      isHealthy,
      warnings,
      recommendations,
      leakDetection: {
        isLeaking: isLeaking,
        confidence: isLeaking ? 0.8 : 0.1,
        growthRate: 0,
      },
      cacheStats: {
        totalCaches,
        totalEntries,
        memoryEstimate,
      },
    };
  }

  /**
   * Force immediate cleanup
   */
  async forceCleanup(): Promise<void> {
    logger.info('Forcing immediate memory cleanup');

    // Clean up registered caches
    for (const [name, cacheRef] of this.registeredCaches.entries()) {
      const cache = cacheRef.deref();
      if (cache) {
        const originalSize = cache.size;
        cache.clear();
        logger.debug('Cleared cache during force cleanup', {
          name,
          originalSize,
        });
      }
    }

    // Clear object pools
    for (const [name, pool] of this.objectPools.entries()) {
      const originalSize = pool.length;
      pool.length = 0;
      logger.debug('Cleared object pool during force cleanup', {
        name,
        originalSize,
      });
    }

    // Run memory cleanup manager
    await memoryCleanupManager.emergencyCleanup();

    // Force garbage collection
    if (global.gc) {
      global.gc();
      logger.debug('Forced garbage collection during cleanup');
    }

    this.emit('forceCleanup', { timestamp: Date.now() });
  }

  /**
   * Create a memory-safe timer that automatically cleans up
   */
  createSafeTimer(
    callback: () => void,
    intervalMs: number
  ): {
    start: () => void;
    stop: () => void;
    isActive: () => boolean;
  } {
    let timerId: NodeJS.Timeout | undefined;
    let isTimerActive = false;

    const timer = {
      start: () => {
        if (!isTimerActive) {
          timerId = setInterval(callback, intervalMs);
          isTimerActive = true;
        }
      },
      stop: () => {
        if (timerId) {
          clearInterval(timerId);
          timerId = undefined;
          isTimerActive = false;
        }
      },
      isActive: () => isTimerActive,
    };

    // Register for automatic cleanup
    memoryCleanupManager.registerCleanupTask({
      name: `safe-timer-${Date.now()}`,
      cleanup: () => timer.stop(),
      priority: 'medium',
    });

    return timer;
  }

  private performHealthCheck(): void {
    const report = this.getHealthReport();

    // Update memory history
    this.memoryHistory.push({
      timestamp: report.timestamp,
      heapUsed: report.memoryUsage.heapUsed,
    });

    // Keep only recent history
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory = this.memoryHistory.slice(-this.maxHistorySize);
    }

    // Emit health report
    this.emit('healthCheck', report);

    // Log warnings
    if (report.warnings.length > 0) {
      logger.warn('Memory health warnings detected', {
        warnings: report.warnings,
        recommendations: report.recommendations,
      });
    }

    // Trigger cleanup if needed
    const heapUsedMB = report.memoryUsage.heapUsed / 1024 / 1024;
    if (heapUsedMB > this.config.aggressiveCleanupThresholdMB) {
      logger.warn('Critical memory usage detected, forcing cleanup');
      this.forceCleanup().catch(error => {
        logger.error('Failed to force cleanup', { error });
      });
    }
  }

  private async performAutomaticCleanup(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

    // Only perform cleanup if memory usage is above threshold
    if (heapUsedMB < this.config.memoryThresholdMB) {
      return;
    }

    logger.debug('Performing automatic memory cleanup', { heapUsedMB });

    // Clean up caches that are too large
    for (const [name, cacheRef] of this.registeredCaches.entries()) {
      const cache = cacheRef.deref();
      if (cache && cache.size > this.config.maxCacheSize) {
        const originalSize = cache.size;

        // Remove oldest entries (if it's a Map with insertion order)
        if (cache instanceof Map) {
          const entriesToRemove =
            cache.size - Math.floor(this.config.maxCacheSize * 0.8);
          let removed = 0;
          for (const key of cache.keys()) {
            if (removed >= entriesToRemove) break;
            cache.delete(key);
            removed++;
          }
        } else if (cache instanceof Set) {
          // For Set, clear a portion
          const entriesToRemove =
            cache.size - Math.floor(this.config.maxCacheSize * 0.8);
          let removed = 0;
          for (const value of cache.values()) {
            if (removed >= entriesToRemove) break;
            cache.delete(value);
            removed++;
          }
        }

        logger.debug('Cleaned up large cache', {
          name,
          originalSize,
          newSize: cache.size,
        });
      }
    }

    // Run low-priority cleanup tasks
    await memoryCleanupManager.runLowPriorityCleanup();

    this.emit('automaticCleanup', { timestamp: Date.now(), heapUsedMB });
  }

  private setupProcessHandlers(): void {
    // Handle memory warnings (if available)
    if (process.listenerCount('warning') === 0) {
      process.on('warning', warning => {
        if (
          warning.name === 'MaxListenersExceededWarning' ||
          warning.message.includes('memory')
        ) {
          logger.warn('Process warning detected', { warning: warning.message });
          this.emit('processWarning', warning);
        }
      });
    }

    // Handle uncaught exceptions with cleanup
    if (process.listenerCount('uncaughtException') === 0) {
      process.on('uncaughtException', async error => {
        logger.error('Uncaught exception, performing emergency cleanup', {
          error,
        });
        await this.forceCleanup();
        process.exit(1);
      });
    }
  }
}

// Global memory leak prevention instance
export const memoryLeakPrevention = new MemoryLeakPrevention();
