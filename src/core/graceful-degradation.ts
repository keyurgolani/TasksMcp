/**
 * Graceful degradation system for non-critical operations
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { circuitBreakerManager } from './circuit-breaker.js';

export interface DegradationConfig {
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  fallbackStrategy: 'disable' | 'cache' | 'simplified' | 'default';
  healthCheckInterval: number;
  recoveryThreshold: number;
  maxDegradationTime: number;
}

export interface DegradationState {
  name: string;
  isDegraded: boolean;
  degradationLevel: 'none' | 'partial' | 'full';
  degradedSince?: number;
  lastHealthCheck: number;
  healthScore: number;
  config: DegradationConfig;
}

export interface FeatureHealth {
  name: string;
  isHealthy: boolean;
  healthScore: number; // 0-100
  lastCheck: number;
  errorRate: number;
  responseTime: number;
  availability: number;
}

export class GracefulDegradationManager extends EventEmitter {
  private readonly features = new Map<string, DegradationState>();
  private readonly healthChecks = new Map<
    string,
    () => Promise<FeatureHealth>
  >();
  private readonly fallbackHandlers = new Map<
    string,
    (operation: string, ...args: unknown[]) => Promise<unknown>
  >();
  private monitoringInterval?: NodeJS.Timeout | undefined;
  private isMonitoring = false;

  private readonly defaultConfig: Partial<DegradationConfig> = {
    priority: 'medium',
    fallbackStrategy: 'simplified',
    healthCheckInterval: 30000, // 30 seconds
    recoveryThreshold: 80, // 80% health score
    maxDegradationTime: 3600000, // 1 hour
  };

  /**
   * Register a feature for graceful degradation
   */
  registerFeature(
    name: string,
    config: Partial<DegradationConfig>,
    healthCheck: () => Promise<FeatureHealth>,
    fallbackHandler?: (
      operation: string,
      ...args: unknown[]
    ) => Promise<unknown>
  ): void {
    const fullConfig: DegradationConfig = {
      name,
      ...this.defaultConfig,
      ...config,
    } as DegradationConfig;

    const state: DegradationState = {
      name,
      isDegraded: false,
      degradationLevel: 'none',
      lastHealthCheck: 0,
      healthScore: 100,
      config: fullConfig,
    };

    this.features.set(name, state);
    this.healthChecks.set(name, healthCheck);

    if (fallbackHandler) {
      this.fallbackHandlers.set(name, fallbackHandler);
    }

    logger.info('Feature registered for graceful degradation', {
      name,
      priority: fullConfig.priority,
      fallbackStrategy: fullConfig.fallbackStrategy,
    });
  }

  /**
   * Execute operation with graceful degradation
   */
  async executeWithDegradation<T>(
    featureName: string,
    operation: string,
    primaryOperation: () => Promise<T>,
    ...args: unknown[]
  ): Promise<T> {
    const state = this.features.get(featureName);

    if (!state) {
      // Feature not registered, execute normally
      return primaryOperation();
    }

    // Check if feature is degraded
    if (state.isDegraded) {
      return this.executeFallback(
        featureName,
        operation,
        primaryOperation,
        args
      );
    }

    try {
      // Execute with circuit breaker protection
      return await circuitBreakerManager.execute(
        `degradation_${featureName}`,
        primaryOperation,
        {
          name: `degradation_${featureName}`,
          failureThreshold: 3,
          recoveryTimeout: 30000,
        }
      );
    } catch (error) {
      logger.warn('Primary operation failed, checking for degradation', {
        featureName,
        operation,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Check if we should degrade this feature
      await this.checkFeatureHealth(featureName);

      const updatedState = this.features.get(featureName);
      if (updatedState?.isDegraded === true) {
        return this.executeFallback(
          featureName,
          operation,
          primaryOperation,
          args
        );
      }

      // If not degraded, re-throw the error
      throw error;
    }
  }

  /**
   * Manually degrade a feature
   */
  degradeFeature(
    featureName: string,
    level: 'partial' | 'full' = 'partial',
    reason?: string
  ): boolean {
    const state = this.features.get(featureName);

    if (!state) {
      return false;
    }

    state.isDegraded = true;
    state.degradationLevel = level;
    state.degradedSince = Date.now();

    logger.warn('Feature manually degraded', {
      featureName,
      level,
      reason,
    });

    this.emit('featureDegraded', {
      name: featureName,
      level,
      reason,
      automatic: false,
    });

    return true;
  }

  /**
   * Manually recover a feature
   */
  recoverFeature(featureName: string, reason?: string): boolean {
    const state = this.features.get(featureName);

    if (state?.isDegraded !== true) {
      return false;
    }

    state.isDegraded = false;
    state.degradationLevel = 'none';
    delete state.degradedSince;
    state.healthScore = 100;

    logger.info('Feature manually recovered', {
      featureName,
      reason,
    });

    this.emit('featureRecovered', {
      name: featureName,
      reason,
      automatic: false,
    });

    return true;
  }

  /**
   * Get feature state
   */
  getFeatureState(featureName: string): DegradationState | undefined {
    return this.features.get(featureName);
  }

  /**
   * Get all feature states
   */
  getAllFeatureStates(): DegradationState[] {
    return Array.from(this.features.values());
  }

  /**
   * Start health monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      void this.performHealthChecks();
    }, 30000); // Check every 30 seconds

    logger.info('Graceful degradation monitoring started');
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    logger.info('Graceful degradation monitoring stopped');
  }

  /**
   * Get system degradation status
   */
  getSystemStatus(): {
    totalFeatures: number;
    healthyFeatures: number;
    degradedFeatures: number;
    criticalDegraded: number;
    overallHealth: number;
  } {
    const states = this.getAllFeatureStates();
    const totalFeatures = states.length;
    const healthyFeatures = states.filter(s => !s.isDegraded).length;
    const degradedFeatures = states.filter(s => s.isDegraded).length;
    const criticalDegraded = states.filter(
      s => s.isDegraded && s.config.priority === 'critical'
    ).length;

    const overallHealth =
      totalFeatures > 0
        ? Math.round((healthyFeatures / totalFeatures) * 100)
        : 100;

    return {
      totalFeatures,
      healthyFeatures,
      degradedFeatures,
      criticalDegraded,
      overallHealth,
    };
  }

  private async executeFallback<T>(
    featureName: string,
    operation: string,
    primaryOperation: () => Promise<T>,
    args: unknown[]
  ): Promise<T> {
    const state = this.features.get(featureName);
    if (!state) {
      throw new Error(`Feature ${featureName} not found`);
    }
    const fallbackHandler = this.fallbackHandlers.get(featureName);

    logger.info('Executing fallback for degraded feature', {
      featureName,
      operation,
      strategy: state.config.fallbackStrategy,
      degradationLevel: state.degradationLevel,
    });

    switch (state.config.fallbackStrategy) {
      case 'disable':
        throw new Error(
          `Feature ${featureName} is disabled due to degradation`
        );

      case 'cache':
        // Try to use cached data
        if (fallbackHandler) {
          const result = await fallbackHandler(operation, ...args);
          return result as T;
        }
        throw new Error(`No cache fallback available for ${featureName}`);

      case 'simplified':
        // Use simplified version
        if (fallbackHandler) {
          const result = await fallbackHandler(operation, ...args);
          return result as T;
        }
        // If no fallback handler, try primary with reduced expectations
        try {
          return await primaryOperation();
        } catch (error) {
          throw new Error(
            `Simplified fallback failed for ${featureName}: ${error instanceof Error ? error.message : String(error)}`
          );
        }

      case 'default':
        // Return default/empty response
        if (fallbackHandler) {
          const result = await fallbackHandler(operation, ...args);
          return result as T;
        }
        // Return appropriate default based on operation type
        return this.getDefaultResponse(operation) as T;

      default:
        throw new Error(
          `Unknown fallback strategy: ${String(state.config.fallbackStrategy)}`
        );
    }
  }

  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.features.keys()).map(featureName =>
      this.checkFeatureHealth(featureName).catch((error: unknown) => {
        logger.error('Health check failed', { featureName, error });
      })
    );

    await Promise.allSettled(promises);
  }

  private async checkFeatureHealth(featureName: string): Promise<void> {
    const state = this.features.get(featureName);
    const healthCheck = this.healthChecks.get(featureName);

    if (!state || !healthCheck) {
      return;
    }

    try {
      const health = await healthCheck();
      state.lastHealthCheck = Date.now();
      state.healthScore = health.healthScore;

      // Check if we should degrade or recover
      if (!state.isDegraded && health.healthScore < 50) {
        // Degrade feature
        state.isDegraded = true;
        state.degradationLevel = health.healthScore < 25 ? 'full' : 'partial';
        state.degradedSince = Date.now();

        logger.warn('Feature automatically degraded due to poor health', {
          featureName,
          healthScore: health.healthScore,
          level: state.degradationLevel,
        });

        this.emit('featureDegraded', {
          name: featureName,
          level: state.degradationLevel,
          reason: `Health score: ${health.healthScore}`,
          automatic: true,
        });
      } else if (
        state.isDegraded &&
        health.healthScore !== null &&
        health.healthScore >= state.config.recoveryThreshold
      ) {
        // Recover feature
        state.isDegraded = false;
        state.degradationLevel = 'none';
        const degradationDuration =
          state.degradedSince !== undefined
            ? Date.now() - state.degradedSince
            : 0;
        delete state.degradedSince;

        logger.info('Feature automatically recovered', {
          featureName,
          healthScore: health.healthScore,
          degradationDuration,
        });

        this.emit('featureRecovered', {
          name: featureName,
          reason: `Health score: ${health.healthScore}`,
          automatic: true,
          degradationDuration,
        });
      }

      // Check for max degradation time
      if (
        state.isDegraded &&
        typeof state.degradedSince === 'number' &&
        Date.now() - state.degradedSince > state.config.maxDegradationTime
      ) {
        logger.error(
          'Feature has been degraded for too long, forcing recovery',
          {
            featureName,
            degradationTime: Date.now() - state.degradedSince,
            maxTime: state.config.maxDegradationTime,
          }
        );

        this.recoverFeature(featureName, 'Max degradation time exceeded');
      }
    } catch (error) {
      logger.error('Health check failed for feature', {
        featureName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Health check failure might indicate degradation
      if (!state.isDegraded) {
        state.healthScore = Math.max(0, state.healthScore - 20);

        if (state.healthScore < 30) {
          this.degradeFeature(featureName, 'full', 'Health check failures');
        }
      }
    }
  }

  private getDefaultResponse(operation: string): unknown {
    // Return appropriate defaults based on operation type
    if (operation.includes('list') || operation.includes('search')) {
      return [];
    }
    if (operation.includes('get') || operation.includes('load')) {
      return null;
    }
    if (operation.includes('count') || operation.includes('total')) {
      return 0;
    }
    if (operation.includes('create') || operation.includes('update')) {
      return { success: false, message: 'Feature temporarily unavailable' };
    }

    return null;
  }
}

// Global graceful degradation manager instance
export const gracefulDegradationManager = new GracefulDegradationManager();
