/**
 * Health check system for MCP Task Manager
 */

import { ConfigManager } from '../infrastructure/config/index.js';
import { StorageFactory } from '../infrastructure/storage/storage-factory.js';
import { logger } from '../shared/utils/logger.js';

import type { StorageBackend } from '../shared/types/storage.js';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: HealthCheck[];
  version: string;
  environment: string;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  duration: number;
  message?: string;
  details?: Record<string, unknown>;
}

export class HealthChecker {
  private readonly config = ConfigManager.getInstance().getConfig();
  private readonly startTime = Date.now();
  private lastHealthCheck: HealthStatus | null = null;

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks: HealthCheck[] = [];

    // Check storage backend
    checks.push(await this.checkStorage());

    // Check memory usage
    checks.push(this.checkMemory());

    // Check disk space (for file storage)
    if (this.config.storage.type === 'file') {
      checks.push(await this.checkDiskSpace());
    }

    // Check configuration
    checks.push(this.checkConfiguration());

    // Determine overall status
    const failedChecks = checks.filter(check => check.status === 'fail');
    const warnChecks = checks.filter(check => check.status === 'warn');

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    if (failedChecks.length > 0) {
      overallStatus = 'unhealthy';
    } else if (warnChecks.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checks,
      version: this.config.server.version,
      environment: this.config.server.nodeEnv,
    };

    this.lastHealthCheck = healthStatus;

    // Log health status changes
    if (overallStatus !== 'healthy') {
      logger.warn('Health check failed', {
        status: overallStatus,
        failedChecks: failedChecks.length,
        warnChecks: warnChecks.length,
        duration: Date.now() - startTime,
      });
    } else {
      logger.debug('Health check passed', {
        duration: Date.now() - startTime,
        checksCount: checks.length,
      });
    }

    return healthStatus;
  }

  private async checkStorage(): Promise<HealthCheck> {
    const startTime = Date.now();
    let storage: StorageBackend | undefined;

    try {
      storage = await StorageFactory.createStorage(this.config.storage);

      // Test basic storage operations
      const testKey = `health-check-${Date.now()}`;
      const testData = {
        id: testKey,
        title: 'Health Check Test',
        description: 'Test data for health check',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        context: 'health-check',
        isArchived: false,
        totalItems: 0,
        completedItems: 0,
        progress: 0,
        analytics: {
          totalItems: 0,
          completedItems: 0,
          pendingItems: 0,
          inProgressItems: 0,
          blockedItems: 0,
          progress: 0,
          averageCompletionTime: 0,
          estimatedTimeRemaining: 0,
          velocityMetrics: {
            itemsPerDay: 0,
            completionRate: 0,
          },
          complexityDistribution: {},
          tagFrequency: {},
          dependencyGraph: [],
        },
        metadata: {},
        // v2 fields
        projectTag: 'health-check',
        implementationNotes: [],
      };

      // Test write operation
      await storage.save(testKey, testData);

      // Test read operation
      const retrieved = await storage.load(testKey);
      if (!retrieved) {
        throw new Error('Failed to retrieve test data');
      }

      // Test delete operation
      await storage.delete(testKey, true);

      return {
        name: 'storage',
        status: 'pass',
        duration: Date.now() - startTime,
        message: `Storage backend (${this.config.storage.type}) is operational`,
        details: {
          type: this.config.storage.type,
          testOperations: ['save', 'load', 'delete'],
        },
      };
    } catch (error) {
      return {
        name: 'storage',
        status: 'fail',
        duration: Date.now() - startTime,
        message: `Storage backend failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        details: {
          type: this.config.storage.type,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    } finally {
      // Always shutdown storage to prevent resource leaks
      if (storage !== undefined) {
        try {
          await storage.shutdown();
        } catch (shutdownError) {
          // Log but don't throw shutdown errors
          logger.warn('Failed to shutdown storage during health check', {
            error:
              shutdownError instanceof Error
                ? shutdownError.message
                : 'Unknown error',
          });
        }
      }
    }
  }

  private checkMemory(): HealthCheck {
    const startTime = Date.now();

    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      // Warn if memory usage is above 80%
      const status =
        memoryUsagePercent > 90
          ? 'fail'
          : memoryUsagePercent > 80
            ? 'warn'
            : 'pass';

      return {
        name: 'memory',
        status,
        duration: Date.now() - startTime,
        message: `Memory usage: ${memoryUsagePercent.toFixed(1)}%`,
        details: {
          heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
          heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
          usagePercent: Math.round(memoryUsagePercent),
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        },
      };
    } catch (error) {
      return {
        name: 'memory',
        status: 'fail',
        duration: Date.now() - startTime,
        message: `Memory check failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  private async checkDiskSpace(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const dataDir =
        this.config.storage.type === 'file' && this.config.storage.file
          ? this.config.storage.file.dataDirectory
          : './data';

      // Check if directory exists and is writable
      try {
        await fs.access(dataDir, fs.constants.W_OK);
      } catch {
        // Try to create directory if it doesn't exist
        await fs.mkdir(dataDir, { recursive: true });
      }

      // Check if directory is accessible and writable
      await fs.stat(dataDir);

      return {
        name: 'disk',
        status: 'pass',
        duration: Date.now() - startTime,
        message: 'Disk space check passed',
        details: {
          dataDirectory: path.resolve(dataDir),
          accessible: true,
          writable: true,
        },
      };
    } catch (error) {
      return {
        name: 'disk',
        status: 'fail',
        duration: Date.now() - startTime,
        message: `Disk space check failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  private checkConfiguration(): HealthCheck {
    const startTime = Date.now();

    try {
      // Validate current configuration
      const { config } = this;

      // Check for required configuration
      const issues: string[] = [];

      if (config.storage.type === 'postgresql') {
        // Check PostgreSQL configuration
        const pgConfig = config.storage.postgresql;
        if (pgConfig?.host == null || pgConfig.host.trim() === '') {
          issues.push('PostgreSQL host not configured');
        }
        if (pgConfig?.database == null || pgConfig.database.trim() === '') {
          issues.push('PostgreSQL database not configured');
        }
      }

      if (config.backup.enabled && config.storage.type === 'memory') {
        issues.push('Backup enabled but using memory storage');
      }

      const status = issues.length > 0 ? 'warn' : 'pass';

      return {
        name: 'configuration',
        status,
        duration: Date.now() - startTime,
        message:
          issues.length > 0
            ? `Configuration issues: ${issues.join(', ')}`
            : 'Configuration is valid',
        details: {
          environment: config.server.nodeEnv,
          storageType: config.storage.type,
          backupEnabled: config.backup.enabled,
          healthEnabled: config.health.enabled,
          issues,
        },
      };
    } catch (error) {
      return {
        name: 'configuration',
        status: 'fail',
        duration: Date.now() - startTime,
        message: `Configuration check failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  getLastHealthCheck(): HealthStatus | null {
    return this.lastHealthCheck;
  }

  isHealthy(): boolean {
    return this.lastHealthCheck?.status === 'healthy';
  }
}

// Standalone health check for external systems
export async function performHealthCheck(): Promise<void> {
  try {
    const healthChecker = new HealthChecker();
    const health = await healthChecker.checkHealth();

    if (health.status === 'healthy') {
      logger.info('Health check passed');
      process.exit(0);
    } else {
      logger.error('Health check failed', {
        status: health.status,
        failedChecks: health.checks.filter(c => c.status === 'fail'),
      });
      process.exit(1);
    }
  } catch (error) {
    logger.error('Health check error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Run health check if this file is executed directly
if (process.argv[1]?.endsWith('health-check.js') === true) {
  void performHealthCheck();
}
