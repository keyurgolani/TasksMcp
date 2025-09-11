/**
 * Retry logic utility with exponential backoff
 */

import { logger } from './logger.js';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  retryCondition?: (error: any) => boolean;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

export class RetryLogic {
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_INITIAL_DELAY = 100; // 100ms
  private static readonly DEFAULT_MAX_DELAY = 5000; // 5 seconds
  private static readonly DEFAULT_BACKOFF_FACTOR = 2;

  /**
   * Execute a function with retry logic and exponential backoff
   */
  static async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = RetryLogic.DEFAULT_MAX_RETRIES,
      initialDelay = RetryLogic.DEFAULT_INITIAL_DELAY,
      maxDelay = RetryLogic.DEFAULT_MAX_DELAY,
      backoffFactor = RetryLogic.DEFAULT_BACKOFF_FACTOR,
      jitter = true,
      retryCondition = () => true,
    } = options;

    let lastError: Error;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry this error
        if (!retryCondition(lastError)) {
          throw lastError;
        }

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with jitter
        let actualDelay = Math.min(delay, maxDelay);
        if (jitter) {
          // Add random jitter (±25%)
          const jitterAmount = actualDelay * 0.25;
          actualDelay += (Math.random() - 0.5) * 2 * jitterAmount;
        }

        logger.debug('Retrying operation after error', {
          attempt: attempt + 1,
          maxRetries,
          delay: actualDelay,
          error: lastError.message,
        });

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, actualDelay));

        // Increase delay for next attempt
        delay *= backoffFactor;
      }
    }

    throw new RetryError(
      `Operation failed after ${maxRetries + 1} attempts: ${lastError!.message}`,
      maxRetries + 1,
      lastError!
    );
  }

  /**
   * Check if an error is retryable (common patterns)
   */
  static isRetryableError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code;

    // File system errors that are typically retryable
    const retryableCodes = [
      'EBUSY', // Resource busy
      'EAGAIN', // Try again
      'ENOENT', // No such file (might be temporary)
      'EMFILE', // Too many open files
      'ENFILE', // File table overflow
      'EACCES', // Permission denied (might be temporary)
    ];

    if (retryableCodes.includes(errorCode)) {
      return true;
    }

    // Common retryable error patterns
    const retryablePatterns = [
      'timeout',
      'connection reset',
      'connection refused',
      'network error',
      'temporary failure',
      'resource temporarily unavailable',
      'lock',
    ];

    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Create a retry condition function for file operations
   */
  static fileOperationRetryCondition(error: any): boolean {
    return RetryLogic.isRetryableError(error);
  }

  /**
   * Create a retry condition function for index operations
   */
  static indexOperationRetryCondition(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message?.toLowerCase() || '';

    // Retry on common index operation errors
    const indexRetryablePatterns = [
      'failed to update indexes',
      'index corruption',
      'concurrent modification',
      'file locked',
      'permission denied',
      'resource busy',
    ];

    return (
      indexRetryablePatterns.some(pattern => errorMessage.includes(pattern)) ||
      RetryLogic.isRetryableError(error)
    );
  }
}

/**
 * Decorator for adding retry logic to methods
 */
export function withRetry(options: RetryOptions = {}) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return RetryLogic.execute(
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}
