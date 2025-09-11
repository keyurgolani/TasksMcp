/**
 * Advanced circuit breaker implementation for external dependencies
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  recoveryTimeout: number;
  halfOpenMaxCalls: number;
  monitoringWindow: number;
  errorThresholdPercentage: number;
  minimumThroughput: number;
}

export interface CircuitBreakerMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  timeouts: number;
  rejectedCalls: number;
  averageResponseTime: number;
  errorRate: number;
  throughput: number;
}

export interface CircuitBreakerState {
  name: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  metrics: CircuitBreakerMetrics;
  config: CircuitBreakerConfig;
}

export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly circuitBreakerName: string,
    public readonly state: string
  ) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitBreaker extends EventEmitter {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private nextAttemptTime = 0;
  private callHistory: Array<{
    timestamp: number;
    success: boolean;
    duration: number;
  }> = [];
  private readonly maxHistorySize = 1000;

  constructor(private readonly config: CircuitBreakerConfig) {
    super();
    logger.info('Circuit breaker initialized', { name: config.name });
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>, timeout?: number): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      if (Date.now() < this.nextAttemptTime) {
        const error = new CircuitBreakerError(
          `Circuit breaker is open for ${this.config.name}`,
          this.config.name,
          this.state
        );
        this.recordCall(false, 0);
        throw error;
      } else {
        // Transition to half-open
        this.transitionToHalfOpen();
      }
    }

    // Check if half-open and at max calls
    if (
      this.state === 'half-open' &&
      this.successCount >= this.config.halfOpenMaxCalls
    ) {
      const error = new CircuitBreakerError(
        `Circuit breaker is half-open and at max calls for ${this.config.name}`,
        this.config.name,
        this.state
      );
      this.recordCall(false, 0);
      throw error;
    }

    const startTime = Date.now();

    try {
      // Execute with timeout if specified
      const result =
        timeout !== undefined && timeout > 0
          ? await this.withTimeout(operation(), timeout)
          : await operation();

      const duration = Date.now() - startTime;
      this.onSuccess(duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.onFailure(error, duration);
      throw error;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return {
      name: this.config.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      metrics: this.calculateMetrics(),
      config: this.config,
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextAttemptTime = 0;
    this.callHistory = [];

    logger.info('Circuit breaker reset', { name: this.config.name });
    this.emit('reset', this.getState());
  }

  /**
   * Force circuit breaker to open state
   */
  forceOpen(): void {
    this.state = 'open';
    this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;

    logger.warn('Circuit breaker forced open', { name: this.config.name });
    this.emit('forceOpen', this.getState());
  }

  /**
   * Force circuit breaker to closed state
   */
  forceClosed(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.nextAttemptTime = 0;

    logger.info('Circuit breaker forced closed', { name: this.config.name });
    this.emit('forceClosed', this.getState());
  }

  private onSuccess(duration: number): void {
    this.recordCall(true, duration);

    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.config.halfOpenMaxCalls) {
        this.transitionToClosed();
      }
    } else if (this.state === 'closed') {
      // Reset failure count on success in closed state
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  private onFailure(error: unknown, duration: number): void {
    this.recordCall(false, duration);
    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.debug('Circuit breaker recorded failure', {
      name: this.config.name,
      failureCount: this.failureCount,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    if (this.state === 'half-open') {
      // Any failure in half-open state transitions back to open
      this.transitionToOpen();
    } else if (this.state === 'closed') {
      // Check if we should transition to open
      const metrics = this.calculateMetrics();

      if (this.shouldTransitionToOpen(metrics)) {
        this.transitionToOpen();
      }
    }
  }

  private shouldTransitionToOpen(metrics: CircuitBreakerMetrics): boolean {
    // Check failure threshold
    if (this.failureCount >= this.config.failureThreshold) {
      return true;
    }

    // Check error rate threshold (if we have enough throughput)
    if (
      metrics.throughput >= this.config.minimumThroughput &&
      metrics.errorRate >= this.config.errorThresholdPercentage
    ) {
      return true;
    }

    return false;
  }

  private transitionToOpen(): void {
    this.state = 'open';
    this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    this.successCount = 0;

    logger.warn('Circuit breaker opened', {
      name: this.config.name,
      failureCount: this.failureCount,
      nextAttemptTime: new Date(this.nextAttemptTime).toISOString(),
    });

    this.emit('open', this.getState());
  }

  private transitionToHalfOpen(): void {
    this.state = 'half-open';
    this.successCount = 0;

    logger.info('Circuit breaker transitioned to half-open', {
      name: this.config.name,
    });

    this.emit('halfOpen', this.getState());
  }

  private transitionToClosed(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = 0;

    logger.info('Circuit breaker closed', {
      name: this.config.name,
    });

    this.emit('closed', this.getState());
  }

  private recordCall(success: boolean, duration: number): void {
    const call = {
      timestamp: Date.now(),
      success,
      duration,
    };

    this.callHistory.push(call);

    // Keep history within limits
    if (this.callHistory.length > this.maxHistorySize) {
      this.callHistory = this.callHistory.slice(-this.maxHistorySize);
    }

    // Clean up old history outside monitoring window
    const cutoffTime = Date.now() - this.config.monitoringWindow;
    this.callHistory = this.callHistory.filter(c => c.timestamp > cutoffTime);
  }

  private calculateMetrics(): CircuitBreakerMetrics {
    const cutoffTime = Date.now() - this.config.monitoringWindow;
    const recentCalls = this.callHistory.filter(c => c.timestamp > cutoffTime);

    const totalCalls = recentCalls.length;
    const successfulCalls = recentCalls.filter(c => c.success).length;
    const failedCalls = totalCalls - successfulCalls;
    const timeouts = recentCalls.filter(
      c => !c.success && c.duration > 10000
    ).length;

    const averageResponseTime =
      totalCalls > 0
        ? recentCalls.reduce((sum, call) => sum + call.duration, 0) / totalCalls
        : 0;

    const errorRate = totalCalls > 0 ? (failedCalls / totalCalls) * 100 : 0;
    const throughput = totalCalls / (this.config.monitoringWindow / 1000); // calls per second

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      timeouts,
      rejectedCalls: 0, // This would be tracked separately
      averageResponseTime,
      errorRate,
      throughput,
    };
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
          timeoutMs
        );
      }),
    ]);
  }
}

/**
 * Circuit breaker manager for handling multiple circuit breakers
 */
export class CircuitBreakerManager extends EventEmitter {
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();
  private readonly defaultConfig: Partial<CircuitBreakerConfig> = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    halfOpenMaxCalls: 3,
    monitoringWindow: 300000, // 5 minutes
    errorThresholdPercentage: 50,
    minimumThroughput: 10,
  };

  /**
   * Create or get a circuit breaker
   */
  getCircuitBreaker(
    name: string,
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      const fullConfig: CircuitBreakerConfig = {
        name,
        ...this.defaultConfig,
        ...config,
      } as CircuitBreakerConfig;

      const circuitBreaker = new CircuitBreaker(fullConfig);

      // Forward events
      circuitBreaker.on('open', state =>
        this.emit('circuitBreakerOpen', state)
      );
      circuitBreaker.on('closed', state =>
        this.emit('circuitBreakerClosed', state)
      );
      circuitBreaker.on('halfOpen', state =>
        this.emit('circuitBreakerHalfOpen', state)
      );

      this.circuitBreakers.set(name, circuitBreaker);
    }

    const breaker = this.circuitBreakers.get(name);
    if (!breaker) {
      throw new Error(`Circuit breaker ${name} not found after creation`);
    }
    return breaker;
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(
    name: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
    timeout?: number
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(name, config);
    return circuitBreaker.execute(operation, timeout);
  }

  /**
   * Get all circuit breaker states
   */
  getAllStates(): CircuitBreakerState[] {
    return Array.from(this.circuitBreakers.values()).map(cb => cb.getState());
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.reset();
    }
    logger.info('All circuit breakers reset');
  }

  /**
   * Get circuit breaker by name
   */
  getByName(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name);
  }

  /**
   * Remove circuit breaker
   */
  remove(name: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(name);
    if (circuitBreaker) {
      circuitBreaker.removeAllListeners();
      this.circuitBreakers.delete(name);
      logger.info('Circuit breaker removed', { name });
      return true;
    }
    return false;
  }

  /**
   * Get health status of all circuit breakers
   */
  getHealthStatus(): {
    healthy: number;
    degraded: number;
    unhealthy: number;
    total: number;
  } {
    const states = this.getAllStates();
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;

    for (const state of states) {
      if (state.state === 'closed') {
        healthy++;
      } else if (state.state === 'half-open') {
        degraded++;
      } else {
        unhealthy++;
      }
    }

    return {
      healthy,
      degraded,
      unhealthy,
      total: states.length,
    };
  }
}

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager();
