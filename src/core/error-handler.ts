/**
 * Comprehensive error handling and graceful degradation system
 */

import { EventEmitter } from 'events';
// import { ConfigManager } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface ErrorContext {
  operation: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

export interface ErrorReport {
  id: string;
  error: Error;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category:
    | 'validation'
    | 'storage'
    | 'business'
    | 'system'
    | 'network'
    | 'unknown';
  recoverable: boolean;
  retryable: boolean;
  handled: boolean;
  timestamp: number;
  resolution?: string;
}

export interface CircuitBreakerState {
  name: string;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  successCount: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface FallbackConfig {
  enabled: boolean;
  strategy: 'cache' | 'default' | 'degraded' | 'offline';
  timeout: number;
}

export class ErrorHandler extends EventEmitter {
  // Configuration loaded on demand to avoid circular dependencies
  private errorReports: ErrorReport[] = [];
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();
  private readonly maxErrorReports = 1000;

  // Circuit breaker configuration
  private readonly circuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    halfOpenMaxCalls: 3,
  };

  // Default retry configuration
  private readonly defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
  };

  constructor() {
    super();
    this.setMaxListeners(100); // Increase max listeners for comprehensive testing and resilience
    this.setupGlobalErrorHandlers();
    this.setupErrorReporting();
  }

  /**
   * Handle an error with context and automatic categorization
   */
  handleError(error: Error, context: ErrorContext): ErrorReport {
    const errorReport: ErrorReport = {
      id: this.generateErrorId(),
      error,
      context,
      severity: this.categorizeErrorSeverity(error),
      category: this.categorizeError(error),
      recoverable: this.isRecoverable(error),
      retryable: this.isRetryable(error),
      handled: false,
      timestamp: Date.now(),
    };

    // Store error report
    this.errorReports.push(errorReport);
    if (this.errorReports.length > this.maxErrorReports) {
      this.errorReports = this.errorReports.slice(-this.maxErrorReports);
    }

    // Update circuit breaker
    this.updateCircuitBreaker(context.operation, false);

    // Emit error event only if there are listeners to prevent unhandled error crashes
    if (this.listenerCount('error') > 0) {
      this.emit('error', errorReport);
    }

    // Log error based on severity
    this.logError(errorReport);

    // Report error to external systems
    this.reportError(errorReport);

    // Attempt automatic recovery
    const resolution = this.attemptRecovery(errorReport);
    if (resolution != null && resolution !== '') {
      errorReport.resolution = resolution;
      errorReport.handled = true;
    }

    return errorReport;
  }

  /**
   * Execute operation with retry logic and circuit breaker
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    const circuitBreaker = this.getCircuitBreaker(context.operation);

    // Check circuit breaker
    if (circuitBreaker.state === 'open') {
      if (Date.now() < circuitBreaker.nextAttemptTime) {
        throw new Error(`Circuit breaker open for ${context.operation}`);
      } else {
        // Transition to half-open
        circuitBreaker.state = 'half-open';
        circuitBreaker.successCount = 0;
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();

        // Success - update circuit breaker
        this.updateCircuitBreaker(context.operation, true);

        if (attempt > 1) {
          logger.info('Operation succeeded after retry', {
            operation: context.operation,
            attempt,
            totalAttempts: config.maxAttempts,
          });
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Update circuit breaker on failure
        this.updateCircuitBreaker(context.operation, false);

        // Don't retry if not retryable or on last attempt
        if (!this.isRetryable(lastError) || attempt === config.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateRetryDelay(attempt, config);

        logger.warn('Operation failed, retrying', {
          operation: context.operation,
          attempt,
          totalAttempts: config.maxAttempts,
          delay,
          error: lastError.message,
        });

        await this.sleep(delay);
      }
    }

    // All attempts failed
    if (lastError) {
      this.handleError(lastError, {
        ...context,
        metadata: {
          ...context.metadata,
          attempts: config.maxAttempts,
          finalAttempt: true,
        },
      });
      throw lastError;
    }

    throw new Error('Operation failed without error');
  }

  /**
   * Execute operation with fallback strategy
   */
  async executeWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    context: ErrorContext,
    fallbackConfig: Partial<FallbackConfig> = {}
  ): Promise<T> {
    const config: FallbackConfig = {
      enabled: true,
      strategy: 'degraded',
      timeout: 10000,
      ...fallbackConfig,
    };

    try {
      // Try primary operation with timeout
      return await this.withTimeout(primaryOperation(), config.timeout);
    } catch (error) {
      const errorReport = this.handleError(
        error instanceof Error ? error : new Error(String(error)),
        context
      );

      if (!config.enabled) {
        throw error;
      }

      logger.warn('Primary operation failed, using fallback', {
        operation: context.operation,
        strategy: config.strategy,
        error: errorReport.error.message,
      });

      try {
        const result = await fallbackOperation();

        logger.info('Fallback operation succeeded', {
          operation: context.operation,
          strategy: config.strategy,
        });

        return result;
      } catch (fallbackError) {
        this.handleError(
          fallbackError instanceof Error
            ? fallbackError
            : new Error(String(fallbackError)),
          {
            ...context,
            operation: `${context.operation}_fallback`,
          }
        );

        // Throw original error, not fallback error
        throw error;
      }
    }
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(timeWindowMs = 3600000): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    topErrors: Array<{ message: string; count: number }>;
    recoveryRate: number;
  } {
    const cutoffTime = Date.now() - timeWindowMs;
    const recentErrors = this.errorReports.filter(
      e => e.timestamp > cutoffTime
    );

    const errorsByCategory: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    const errorCounts: Record<string, number> = {};

    let recoveredCount = 0;

    for (const report of recentErrors) {
      errorsByCategory[report.category] =
        (errorsByCategory[report.category] ?? 0) + 1;
      errorsBySeverity[report.severity] =
        (errorsBySeverity[report.severity] ?? 0) + 1;
      errorCounts[report.error.message] =
        (errorCounts[report.error.message] ?? 0) + 1;

      if (report.handled) {
        recoveredCount++;
      }
    }

    const topErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));

    return {
      totalErrors: recentErrors.length,
      errorsByCategory,
      errorsBySeverity,
      topErrors,
      recoveryRate:
        recentErrors.length > 0 ? recoveredCount / recentErrors.length : 0,
    };
  }

  /**
   * Get circuit breaker states
   */
  getCircuitBreakerStates(): CircuitBreakerState[] {
    return Array.from(this.circuitBreakers.values());
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(operationName: string): void {
    const circuitBreaker = this.circuitBreakers.get(operationName);
    if (circuitBreaker) {
      circuitBreaker.state = 'closed';
      circuitBreaker.failureCount = 0;
      circuitBreaker.successCount = 0;
      circuitBreaker.lastFailureTime = 0;
      circuitBreaker.nextAttemptTime = 0;

      logger.info('Circuit breaker reset', { operation: operationName });
    }
  }

  private categorizeError(error: Error): ErrorReport['category'] {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() ?? '';

    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation';
    }
    if (
      message.includes('storage') ||
      message.includes('database') ||
      message.includes('file')
    ) {
      return 'storage';
    }
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection')
    ) {
      return 'network';
    }
    if (
      message.includes('memory') ||
      message.includes('cpu') ||
      stack.includes('system')
    ) {
      return 'system';
    }
    if (error.name === 'BusinessLogicError' || message.includes('business')) {
      return 'business';
    }

    return 'unknown';
  }

  private categorizeErrorSeverity(error: Error): ErrorReport['severity'] {
    const message = error.message.toLowerCase();

    if (
      message.includes('critical') ||
      message.includes('fatal') ||
      message.includes('corruption')
    ) {
      return 'critical';
    }
    if (
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('storage')
    ) {
      return 'high';
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return 'medium';
    }

    return 'low';
  }

  private isRecoverable(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Non-recoverable errors
    if (
      message.includes('corruption') ||
      message.includes('fatal') ||
      message.includes('critical')
    ) {
      return false;
    }

    // Recoverable errors
    return (
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('temporary') ||
      message.includes('retry')
    );
  }

  private isRetryable(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Non-retryable errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return false;
    }

    // Retryable errors
    return (
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('temporary') ||
      message.includes('busy') ||
      message.includes('unavailable')
    );
  }

  private attemptRecovery(errorReport: ErrorReport): string | undefined {
    if (!errorReport.recoverable) {
      return undefined;
    }

    try {
      switch (errorReport.category) {
        case 'storage':
          return this.recoverStorageError(errorReport);
        case 'network':
          return this.recoverNetworkError();
        case 'system':
          return this.recoverSystemError(errorReport);
        default:
          return undefined;
      }
    } catch (recoveryError) {
      logger.error('Error recovery failed', {
        originalError: errorReport.error.message,
        recoveryError:
          recoveryError instanceof Error
            ? recoveryError.message
            : 'Unknown error',
      });
      return undefined;
    }
  }

  private recoverStorageError(errorReport: ErrorReport): string | undefined {
    const message = errorReport.error.message.toLowerCase();

    // File not found - attempt to recreate from backup
    if (message.includes('file not found') || message.includes('enoent')) {
      try {
        // Emit recovery event for storage layer to handle
        this.emit('storageRecovery', {
          type: 'file_not_found',
          context: errorReport.context,
          error: errorReport.error,
        });
        return 'Initiated file recovery from backup';
      } catch {
        return 'File recovery attempt failed';
      }
    }

    // Permission errors - attempt to fix permissions
    if (message.includes('permission') || message.includes('eacces')) {
      try {
        this.emit('storageRecovery', {
          type: 'permission_error',
          context: errorReport.context,
          error: errorReport.error,
        });
        return 'Initiated permission recovery';
      } catch {
        return 'Permission recovery attempt failed';
      }
    }

    // Disk space errors - attempt cleanup
    if (message.includes('enospc') || message.includes('disk full')) {
      try {
        this.emit('storageRecovery', {
          type: 'disk_space',
          context: errorReport.context,
          error: errorReport.error,
        });
        return 'Initiated disk space cleanup';
      } catch {
        return 'Disk space recovery attempt failed';
      }
    }

    // Lock errors - attempt to clear locks
    if (message.includes('lock') || message.includes('ebusy')) {
      try {
        this.emit('storageRecovery', {
          type: 'lock_error',
          context: errorReport.context,
          error: errorReport.error,
        });
        return 'Initiated lock cleanup';
      } catch {
        return 'Lock recovery attempt failed';
      }
    }

    // Corruption errors - attempt to restore from backup
    if (message.includes('corrupt') || message.includes('invalid json')) {
      try {
        this.emit('storageRecovery', {
          type: 'corruption',
          context: errorReport.context,
          error: errorReport.error,
        });
        return 'Initiated corruption recovery from backup';
      } catch {
        return 'Corruption recovery attempt failed';
      }
    }

    return undefined;
  }

  private recoverNetworkError(): string | undefined {
    try {
      // Emit network recovery event
      this.emit('networkRecovery', {
        type: 'network_error',
        timestamp: Date.now(),
      });

      // Network errors often resolve themselves with retry
      return 'Network error recovery initiated - will retry with backoff';
    } catch {
      return 'Network error noted for retry';
    }
  }

  private recoverSystemError(errorReport: ErrorReport): string | undefined {
    const message = errorReport.error.message.toLowerCase();

    // Memory errors - trigger cleanup
    if (message.includes('memory') || message.includes('heap')) {
      try {
        this.emit('systemRecovery', {
          type: 'memory_pressure',
          context: errorReport.context,
          error: errorReport.error,
        });
        return 'Initiated memory cleanup and monitoring';
      } catch {
        return 'Memory error noted for monitoring';
      }
    }

    // CPU errors - throttle operations
    if (message.includes('cpu') || message.includes('timeout')) {
      try {
        this.emit('systemRecovery', {
          type: 'cpu_pressure',
          context: errorReport.context,
          error: errorReport.error,
        });
        return 'Initiated CPU throttling';
      } catch {
        return 'CPU error noted for monitoring';
      }
    }

    // File descriptor errors - cleanup resources
    if (message.includes('emfile') || message.includes('enfile')) {
      try {
        this.emit('systemRecovery', {
          type: 'resource_exhaustion',
          context: errorReport.context,
          error: errorReport.error,
        });
        return 'Initiated resource cleanup';
      } catch {
        return 'Resource exhaustion noted for cleanup';
      }
    }

    return undefined;
  }

  private getCircuitBreaker(operationName: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(operationName)) {
      this.circuitBreakers.set(operationName, {
        name: operationName,
        state: 'closed',
        failureCount: 0,
        lastFailureTime: 0,
        nextAttemptTime: 0,
        successCount: 0,
      });
    }

    const circuitBreaker = this.circuitBreakers.get(operationName);
    if (circuitBreaker == null) {
      throw new Error(
        `Circuit breaker not found for operation: ${operationName}`
      );
    }
    return circuitBreaker;
  }

  private updateCircuitBreaker(operationName: string, success: boolean): void {
    const circuitBreaker = this.getCircuitBreaker(operationName);

    if (success) {
      if (circuitBreaker.state === 'half-open') {
        circuitBreaker.successCount++;
        if (
          circuitBreaker.successCount >=
          this.circuitBreakerConfig.halfOpenMaxCalls
        ) {
          circuitBreaker.state = 'closed';
          circuitBreaker.failureCount = 0;
        }
      } else if (circuitBreaker.state === 'closed') {
        circuitBreaker.failureCount = Math.max(
          0,
          circuitBreaker.failureCount - 1
        );
      }
    } else {
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = Date.now();

      if (
        circuitBreaker.failureCount >=
        this.circuitBreakerConfig.failureThreshold
      ) {
        circuitBreaker.state = 'open';
        circuitBreaker.nextAttemptTime =
          Date.now() + this.circuitBreakerConfig.recoveryTimeout;

        logger.warn('Circuit breaker opened', {
          operation: operationName,
          failureCount: circuitBreaker.failureCount,
        });
      }
    }
  }

  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    let delay =
      config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, config.maxDelay);

    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5); // Add 0-50% jitter
    }

    return Math.round(delay);
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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logError(errorReport: ErrorReport): void {
    const logData = {
      errorId: errorReport.id,
      operation: errorReport.context.operation,
      category: errorReport.category,
      severity: errorReport.severity,
      message: errorReport.error.message,
      recoverable: errorReport.recoverable,
      retryable: errorReport.retryable,
      metadata: errorReport.context.metadata,
    };

    switch (errorReport.severity) {
      case 'critical':
        logger.error('Critical error occurred', logData);
        break;
      case 'high':
        logger.error('High severity error', logData);
        break;
      case 'medium':
        logger.warn('Medium severity error', logData);
        break;
      case 'low':
        logger.info('Low severity error', logData);
        break;
    }
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      const error =
        reason instanceof Error ? reason : new Error(String(reason));
      void this.handleError(error, {
        operation: 'unhandled_promise_rejection',
        metadata: { promise: String(promise) },
        timestamp: Date.now(),
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', error => {
      void this.handleError(error, {
        operation: 'uncaught_exception',
        timestamp: Date.now(),
      });

      // Log and exit gracefully
      logger.error('Uncaught exception, shutting down', {
        error: error.message,
      });
      process.exit(1);
    });
  }

  /**
   * Setup error reporting integration
   */
  private setupErrorReporting(): void {
    // Import error reporting system dynamically to avoid circular dependencies
    import('../monitoring/error-reporting.js')
      .then(({ errorReportingSystem }) => {
        this.on('error', (errorReport: ErrorReport) => {
          errorReportingSystem
            .reportError(errorReport)
            .catch((error: unknown) => {
              logger.error('Failed to report error', { error });
            });
        });
      })
      .catch((error: unknown) => {
        logger.warn('Failed to setup error reporting', { error });
      });
  }

  /**
   * Report error to external systems
   */
  private reportError(errorReport: ErrorReport): void {
    // This will be handled by the error reporting system via events
    // but we can add immediate reporting for critical errors here
    if (errorReport.severity === 'critical') {
      logger.error('CRITICAL ERROR DETECTED', {
        errorId: errorReport.id,
        operation: errorReport.context.operation,
        message: errorReport.error.message,
        stack: errorReport.error.stack,
      });
    }
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandler();
