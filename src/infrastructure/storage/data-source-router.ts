/**
 * Data Source Router
 * 
 * Routes storage operations to appropriate data sources based on configuration.
 * Implements source selection logic, connection pooling, lifecycle management,
 * and fallback/error recovery mechanisms.
 */

import type { StorageBackend } from '../../shared/types/storage.js';
import type { TodoList } from '../../shared/types/todo.js';
import { StorageFactory, type StorageConfiguration } from './storage-factory.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Configuration for a single data source
 */
export interface DataSourceConfig {
  id: string;
  name: string;
  type: 'filesystem' | 'postgresql' | 'mongodb' | 'memory';
  priority: number;
  readonly: boolean;
  enabled: boolean;
  tags?: string[];
  config: StorageConfiguration;
}

/**
 * Context for routing operations
 */
export interface OperationContext {
  projectTag?: string;
  listId?: string;
  requireWritable?: boolean;
}

/**
 * Types of data operations
 */
export type OperationType = 'read' | 'write' | 'delete';

/**
 * Data operation descriptor
 */
export interface DataOperation {
  type: OperationType;
  key?: string;
  data?: TodoList;
  permanent?: boolean;
  options?: Record<string, unknown>;
}

/**
 * Connection pool entry
 */
interface ConnectionPoolEntry {
  backend: StorageBackend;
  config: DataSourceConfig;
  healthy: boolean;
  lastHealthCheck: Date;
  failureCount: number;
}

/**
 * Router configuration
 */
export interface RouterConfig {
  healthCheckInterval?: number; // ms between health checks
  maxFailures?: number; // max failures before marking unhealthy
  operationTimeout?: number; // ms timeout for operations
  enableFallback?: boolean; // enable fallback to other sources
}

/**
 * DataSourceRouter routes operations to appropriate storage backends
 * based on configuration, priority, tags, and health status.
 */
export class DataSourceRouter {
  private connectionPool: Map<string, ConnectionPoolEntry> = new Map();
  private config: DataSourceConfig[];
  private routerConfig: Required<RouterConfig>;
  private healthCheckInterval: NodeJS.Timeout | undefined;
  private isShuttingDown = false;

  constructor(
    config: DataSourceConfig[],
    routerConfig: RouterConfig = {}
  ) {
    // Sort by priority (higher priority first)
    this.config = config
      .filter(c => c.enabled)
      .sort((a, b) => b.priority - a.priority);

    this.routerConfig = {
      healthCheckInterval: routerConfig.healthCheckInterval ?? 60000, // 1 minute
      maxFailures: routerConfig.maxFailures ?? 3,
      operationTimeout: routerConfig.operationTimeout ?? 30000, // 30 seconds
      enableFallback: routerConfig.enableFallback ?? true,
    };

    logger.info('DataSourceRouter created', {
      sources: this.config.length,
      config: this.routerConfig,
    });
  }

  /**
   * Initialize all configured data sources
   */
  async initialize(): Promise<void> {
    logger.info('Initializing DataSourceRouter', {
      sources: this.config.length,
    });

    const initPromises = this.config.map(async (sourceConfig) => {
      try {
        const backend = await this.createBackend(sourceConfig);
        
        // Initialize the backend
        if (typeof backend.initialize === 'function') {
          await backend.initialize();
        }

        // Perform initial health check
        const healthy = await this.performHealthCheck(backend);

        this.connectionPool.set(sourceConfig.id, {
          backend,
          config: sourceConfig,
          healthy,
          lastHealthCheck: new Date(),
          failureCount: 0,
        });

        logger.info('Data source initialized', {
          id: sourceConfig.id,
          name: sourceConfig.name,
          type: sourceConfig.type,
          healthy,
        });
      } catch (error) {
        logger.error('Failed to initialize data source', {
          id: sourceConfig.id,
          name: sourceConfig.name,
          error,
        });

        // Add to pool as unhealthy so we can retry later
        this.connectionPool.set(sourceConfig.id, {
          backend: null as unknown as StorageBackend,
          config: sourceConfig,
          healthy: false,
          lastHealthCheck: new Date(),
          failureCount: this.routerConfig.maxFailures,
        });
      }
    });

    await Promise.allSettled(initPromises);

    // Start periodic health checks
    this.startHealthChecks();

    logger.info('DataSourceRouter initialized', {
      healthy: this.getHealthySources().length,
      total: this.connectionPool.size,
    });
  }

  /**
   * Route an operation to appropriate data source(s)
   */
  async routeOperation<T>(
    operation: DataOperation,
    context: OperationContext = {}
  ): Promise<T> {
    if (this.isShuttingDown) {
      throw new Error('DataSourceRouter is shutting down');
    }

    const sources = this.selectSources(operation, context);

    if (sources.length === 0) {
      throw new Error('No available data sources for operation');
    }

    logger.debug('Routing operation', {
      type: operation.type,
      key: operation.key,
      sources: sources.map(s => s.config.id),
    });

    if (operation.type === 'read') {
      return await this.executeRead<T>(operation, sources);
    } else if (operation.type === 'write') {
      return await this.executeWrite<T>(operation, sources);
    } else if (operation.type === 'delete') {
      return await this.executeDelete<T>(operation, sources);
    }

    throw new Error(`Unknown operation type: ${operation.type}`);
  }

  /**
   * Select appropriate sources for an operation
   */
  private selectSources(
    operation: DataOperation,
    context: OperationContext
  ): ConnectionPoolEntry[] {
    let candidates = Array.from(this.connectionPool.values());

    // Filter by health status
    candidates = candidates.filter(entry => entry.healthy);

    // Filter by project tag if specified
    if (context.projectTag) {
      const taggedSources = candidates.filter(entry =>
        entry.config.tags?.includes(context.projectTag!)
      );

      if (taggedSources.length > 0) {
        candidates = taggedSources;
      }
    }

    // Filter by read/write requirements
    if (operation.type === 'write' || operation.type === 'delete') {
      candidates = candidates.filter(entry => !entry.config.readonly);
    }

    // Sort by priority (already sorted in config, but re-sort in case of filtering)
    candidates.sort((a, b) => b.config.priority - a.config.priority);

    return candidates;
  }

  /**
   * Execute a read operation with fallback
   */
  private async executeRead<T>(
    operation: DataOperation,
    sources: ConnectionPoolEntry[]
  ): Promise<T> {
    const errors: Error[] = [];

    for (const source of sources) {
      try {
        const result = await this.executeWithTimeout(
          () => this.performRead<T>(source.backend, operation),
          this.routerConfig.operationTimeout
        );

        // Reset failure count on success
        source.failureCount = 0;

        return result;
      } catch (error) {
        logger.warn('Read operation failed on source, trying next', {
          sourceId: source.config.id,
          error,
        });

        errors.push(error as Error);
        await this.handleOperationFailure(source);

        // Continue to next source if fallback is enabled
        if (!this.routerConfig.enableFallback) {
          break;
        }
      }
    }

    // All sources failed
    throw new Error(
      `Read operation failed on all sources: ${errors.map(e => e.message).join(', ')}`
    );
  }

  /**
   * Execute a write operation
   */
  private async executeWrite<T>(
    operation: DataOperation,
    sources: ConnectionPoolEntry[]
  ): Promise<T> {
    if (sources.length === 0) {
      throw new Error('No writable sources available');
    }

    // Use the highest priority writable source
    const primarySource = sources[0];
    if (!primarySource) {
      throw new Error('No primary source available');
    }

    try {
      const result = await this.executeWithTimeout(
        () => this.performWrite<T>(primarySource.backend, operation),
        this.routerConfig.operationTimeout
      );

      // Reset failure count on success
      primarySource.failureCount = 0;

      return result;
    } catch (error) {
      logger.error('Write operation failed on primary source', {
        sourceId: primarySource.config.id,
        error,
      });

      await this.handleOperationFailure(primarySource);

      // Try fallback sources if enabled
      if (this.routerConfig.enableFallback && sources.length > 1) {
        logger.info('Attempting write on fallback source');
        
        for (let i = 1; i < sources.length; i++) {
          const fallbackSource = sources[i];
          if (!fallbackSource) continue;
          
          try {
            const result = await this.executeWithTimeout(
              () => this.performWrite<T>(fallbackSource.backend, operation),
              this.routerConfig.operationTimeout
            );

            fallbackSource.failureCount = 0;
            
            logger.info('Write succeeded on fallback source', {
              sourceId: fallbackSource.config.id,
            });

            return result;
          } catch (fallbackError) {
            logger.warn('Write failed on fallback source', {
              sourceId: fallbackSource.config.id,
              error: fallbackError,
            });

            await this.handleOperationFailure(fallbackSource);
          }
        }
      }

      throw error;
    }
  }

  /**
   * Execute a delete operation
   */
  private async executeDelete<T>(
    operation: DataOperation,
    sources: ConnectionPoolEntry[]
  ): Promise<T> {
    if (sources.length === 0) {
      throw new Error('No writable sources available for delete');
    }

    // Use the highest priority writable source
    const primarySource = sources[0];
    if (!primarySource) {
      throw new Error('No primary source available');
    }

    try {
      const result = await this.executeWithTimeout(
        () => this.performDelete<T>(primarySource.backend, operation),
        this.routerConfig.operationTimeout
      );

      // Reset failure count on success
      primarySource.failureCount = 0;

      return result;
    } catch (error) {
      logger.error('Delete operation failed on primary source', {
        sourceId: primarySource.config.id,
        error,
      });

      await this.handleOperationFailure(primarySource);
      throw error;
    }
  }

  /**
   * Perform read operation on a backend
   */
  private async performRead<T>(
    backend: StorageBackend,
    operation: DataOperation
  ): Promise<T> {
    if (!operation.key) {
      throw new Error('Read operation requires a key');
    }

    const result = await backend.load(operation.key, operation.options);
    return result as T;
  }

  /**
   * Perform write operation on a backend
   */
  private async performWrite<T>(
    backend: StorageBackend,
    operation: DataOperation
  ): Promise<T> {
    if (!operation.key || !operation.data) {
      throw new Error('Write operation requires key and data');
    }

    await backend.save(operation.key, operation.data, operation.options);
    return undefined as T;
  }

  /**
   * Perform delete operation on a backend
   */
  private async performDelete<T>(
    backend: StorageBackend,
    operation: DataOperation
  ): Promise<T> {
    if (!operation.key) {
      throw new Error('Delete operation requires a key');
    }

    await backend.delete(operation.key, operation.permanent);
    return undefined as T;
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeout)
      ),
    ]);
  }

  /**
   * Handle operation failure
   */
  private async handleOperationFailure(
    source: ConnectionPoolEntry
  ): Promise<void> {
    source.failureCount++;

    if (source.failureCount >= this.routerConfig.maxFailures) {
      logger.warn('Data source marked as unhealthy due to failures', {
        sourceId: source.config.id,
        failures: source.failureCount,
      });

      source.healthy = false;

      // Schedule immediate health check to try recovery
      setTimeout(() => {
        void this.checkSourceHealth(source);
      }, 5000); // Check again in 5 seconds
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      return; // Already started
    }

    this.healthCheckInterval = setInterval(() => {
      if (!this.isShuttingDown) {
        void this.performAllHealthChecks();
      }
    }, this.routerConfig.healthCheckInterval);

    logger.debug('Health check interval started', {
      interval: this.routerConfig.healthCheckInterval,
    });
  }

  /**
   * Perform health checks on all sources
   */
  private async performAllHealthChecks(): Promise<void> {
    const checks = Array.from(this.connectionPool.values()).map(source =>
      this.checkSourceHealth(source)
    );

    await Promise.allSettled(checks);
  }

  /**
   * Check health of a single source
   */
  private async checkSourceHealth(
    source: ConnectionPoolEntry
  ): Promise<void> {
    try {
      const healthy = await this.performHealthCheck(source.backend);

      const wasHealthy = source.healthy;
      source.healthy = healthy;
      source.lastHealthCheck = new Date();

      if (healthy && !wasHealthy) {
        logger.info('Data source recovered', {
          sourceId: source.config.id,
        });
        source.failureCount = 0;
      } else if (!healthy && wasHealthy) {
        logger.warn('Data source became unhealthy', {
          sourceId: source.config.id,
        });
      }
    } catch (error) {
      logger.error('Health check failed', {
        sourceId: source.config.id,
        error,
      });
      source.healthy = false;
    }
  }

  /**
   * Perform health check on a backend
   */
  private async performHealthCheck(backend: StorageBackend): Promise<boolean> {
    if (!backend || typeof backend.healthCheck !== 'function') {
      return false;
    }

    try {
      return await backend.healthCheck();
    } catch (error) {
      logger.debug('Health check threw error', { error });
      return false;
    }
  }

  /**
   * Create a storage backend from configuration
   */
  private async createBackend(
    config: DataSourceConfig
  ): Promise<StorageBackend> {
    return await StorageFactory.createStorage(config.config);
  }

  /**
   * Get all healthy sources
   */
  private getHealthySources(): ConnectionPoolEntry[] {
    return Array.from(this.connectionPool.values()).filter(
      entry => entry.healthy
    );
  }

  /**
   * Get all configured sources
   */
  getAllSources(): StorageBackend[] {
    return Array.from(this.connectionPool.values())
      .filter(entry => entry.healthy && entry.backend)
      .map(entry => entry.backend);
  }

  /**
   * Get a specific backend by source ID (for testing)
   */
  getBackend(sourceId: string): StorageBackend | undefined {
    return this.connectionPool.get(sourceId)?.backend;
  }

  /**
   * Get router status
   */
  getStatus(): {
    total: number;
    healthy: number;
    unhealthy: number;
    sources: Array<{
      id: string;
      name: string;
      type: 'filesystem' | 'postgresql' | 'mongodb' | 'memory';
      healthy: boolean;
      readonly: boolean;
      priority: number;
      failureCount: number;
      lastHealthCheck: Date;
      tags?: string[];
    }>;
  } {
    const sources = Array.from(this.connectionPool.values());

    return {
      total: sources.length,
      healthy: sources.filter(s => s.healthy).length,
      unhealthy: sources.filter(s => !s.healthy).length,
      sources: sources.map(s => ({
        id: s.config.id,
        name: s.config.name,
        type: s.config.type,
        healthy: s.healthy,
        readonly: s.config.readonly,
        priority: s.config.priority,
        failureCount: s.failureCount,
        lastHealthCheck: s.lastHealthCheck,
        ...(s.config.tags && { tags: s.config.tags }),
      })),
    };
  }

  /**
   * Shutdown the router and all connections
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('DataSourceRouter shutting down');

    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    // Shutdown all backends
    const shutdownPromises = Array.from(this.connectionPool.values()).map(
      async (entry) => {
        if (entry.backend && typeof entry.backend.shutdown === 'function') {
          try {
            await entry.backend.shutdown();
            logger.debug('Backend shutdown complete', {
              sourceId: entry.config.id,
            });
          } catch (error) {
            logger.error('Backend shutdown failed', {
              sourceId: entry.config.id,
              error,
            });
          }
        }
      }
    );

    await Promise.allSettled(shutdownPromises);

    // Clear connection pool
    this.connectionPool.clear();

    logger.info('DataSourceRouter shutdown complete');
  }
}
