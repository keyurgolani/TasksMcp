/**
 * Structured logging utility using Winston
 * Provides consistent logging across the application with debugging capabilities
 */

import { mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import winston from 'winston';

/**
 * Logger configuration based on environment
 */
const logLevel = process.env['LOG_LEVEL'] ?? 'info';
const nodeEnv = process.env['NODE_ENV'] ?? 'development';
const enableDebugLogging = process.env['ENABLE_DEBUG_LOGGING'] === 'true';
const enablePerformanceLogging =
  process.env['ENABLE_PERFORMANCE_LOGGING'] === 'true';

/**
 * Detect if running in MCP mode (stdio communication)
 *
 * MCP servers communicate via stdio and should not log to console as it
 * interferes with the protocol communication. This function detects when
 * the server is running in MCP mode vs CLI mode.
 *
 * @returns boolean - True if running in MCP mode, false for CLI mode
 */
const isMcpMode = (): boolean => {
  // Check if running with CLI flags that indicate non-MCP mode
  const args = process.argv.slice(2);
  const hasCliFlags = args.some(
    arg =>
      arg === '--help' ||
      arg === '-h' ||
      arg === '--version' ||
      arg === '-v' ||
      arg === '--verbose' ||
      arg === '--quiet'
  );

  // If no CLI flags and not explicitly disabled, assume MCP mode
  return !hasCliFlags && process.env['MCP_DISABLE_STDIO_MODE'] !== 'true';
};

/**
 * Custom log format for production debugging
 */
const debugFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      service,
      message,
      ...meta,
    };

    // Add correlation ID if available
    if (
      typeof meta['correlationId'] === 'string' ||
      typeof meta['requestId'] === 'string'
    ) {
      (logEntry as Record<string, unknown>)['correlationId'] =
        (meta['correlationId'] as string) || (meta['requestId'] as string);
    }

    // Add performance metrics if available
    if (typeof meta['duration'] === 'number') {
      (logEntry as Record<string, unknown>)['performance'] = {
        duration: meta['duration'],
        operation: meta['operation'],
      };
    }

    // Add memory info for debugging
    if (enableDebugLogging && level === 'debug') {
      const memUsage = process.memoryUsage();
      (logEntry as Record<string, unknown>)['memory'] = {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
      };
    }

    return JSON.stringify(logEntry);
  })
);

/**
 * Create Winston logger instance with formatting
 */
const transports: winston.transport[] = [];

// Only add console transport if not in MCP mode
if (!isMcpMode()) {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message }) => `${level}: ${message}`)
      ),
    })
  );
}

// In test environment, add a silent console transport to prevent Winston warnings
if (nodeEnv === 'test' && transports.length === 0) {
  transports.push(
    new winston.transports.Console({
      silent: true, // Silent transport to prevent Winston warnings
    })
  );
}

export const LOGGER = winston.createLogger({
  level: enableDebugLogging ? 'debug' : logLevel,
  format: debugFormat,
  defaultMeta: {
    service: 'task-list-mcp',
    environment: nodeEnv,
    pid: process.pid,
  },
  transports,
});

/**
 * Add file transport for production environments or when in MCP mode
 * Enable file logging if explicitly requested OR if in MCP mode (to ensure logs are captured)
 */
if (
  (nodeEnv === 'production' && process.env['ENABLE_FILE_LOGGING'] === 'true') ||
  (isMcpMode() && process.env['DISABLE_FILE_LOGGING'] !== 'true')
) {
  try {
    // Get the project root directory (where package.json is located)
    // Use PROJECT_ROOT env var if available, otherwise derive from current file location
    let projectRoot: string;

    if (process.env['PROJECT_ROOT']) {
      projectRoot = process.env['PROJECT_ROOT'];
    } else {
      // Fallback: derive from current file location
      const currentFileUrl = import.meta.url;
      const currentFilePath = fileURLToPath(currentFileUrl);
      // Current file is at src/shared/utils/LOGGER.ts
      // Go up 3 levels: utils -> shared -> src -> project root
      const utilsDir = dirname(currentFilePath);
      const sharedDir = dirname(utilsDir);
      const srcDir = dirname(sharedDir);
      projectRoot = dirname(srcDir);
    }

    const logsDir = join(projectRoot, 'logs');

    // Check if directory exists, create if it doesn't
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    // Verify directory was created successfully
    if (existsSync(logsDir)) {
      // Error log
      LOGGER.add(
        new winston.transports.File({
          filename: join(logsDir, 'error.log'),
          level: 'error',
          format: debugFormat,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
        })
      );

      // Combined log
      LOGGER.add(
        new winston.transports.File({
          filename: join(logsDir, 'combined.log'),
          format: debugFormat,
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10,
        })
      );

      // Debug log (if debug logging is enabled)
      if (enableDebugLogging) {
        LOGGER.add(
          new winston.transports.File({
            filename: join(logsDir, 'debug.log'),
            level: 'debug',
            format: debugFormat,
            maxsize: 100 * 1024 * 1024, // 100MB
            maxFiles: 3,
          })
        );
      }

      // Performance log (if performance logging is enabled)
      if (enablePerformanceLogging) {
        LOGGER.add(
          new winston.transports.File({
            filename: join(logsDir, 'performance.log'),
            level: 'info',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
              winston.format.printf(
                ({
                  timestamp,
                  level,
                  message,
                  duration,
                  operation,
                  ...meta
                }) => {
                  if (duration !== undefined) {
                    return JSON.stringify({
                      timestamp,
                      level,
                      message,
                      operation,
                      duration,
                      ...meta,
                    });
                  }
                  return '';
                }
              )
            ),
            maxsize: 20 * 1024 * 1024, // 20MB
            maxFiles: 5,
          })
        );
      }
    } else {
      throw new Error('Failed to create logs directory');
    }
  } catch (error) {
    // Use process.stderr here as this is logger initialization failure
    process.stderr.write(
      `Warning: Failed to set up file logging: ${
        error instanceof Error ? error.message : 'Unknown error'
      } Working directory: ${process.cwd()}\n`
    );

    // If file logging fails and we're in MCP mode (no console transport),
    // add a minimal console transport to prevent Winston warnings
    if (isMcpMode() && LOGGER.transports.length === 0) {
      LOGGER.add(
        new winston.transports.Console({
          level: 'error', // Only log errors to avoid interfering with MCP protocol
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(
              ({ timestamp, level, message }) =>
                `${timestamp} ${level}: ${message}`
            )
          ),
          silent: false,
        })
      );
    }
  }
}

/**
 * Logging utilities for debugging production issues
 *
 * Provides advanced logging capabilities including:
 * - Correlation ID tracking for related operations
 * - Performance timing and metrics
 * - System state snapshots for debugging
 * - Critical event logging
 */
export class DebugLogger {
  private static correlationId = 0;

  /**
   * Generate a unique correlation ID for tracking related log entries
   *
   * Creates a unique identifier that can be used to correlate log entries
   * across multiple operations or components for easier debugging.
   *
   * @returns string - Unique correlation ID in format "corr_timestamp_sequence"
   */
  static generateCorrelationId(): string {
    return `corr_${Date.now()}_${++this.correlationId}`;
  }

  /**
   * Log with correlation ID
   */
  static logWithCorrelation(
    level: string,
    message: string,
    correlationId: string,
    meta: Record<string, unknown> = {}
  ): void {
    const logMethod = (LOGGER as unknown as Record<string, unknown>)[level];
    if (typeof logMethod === 'function') {
      logMethod.call(LOGGER, message, { correlationId, ...meta });
    }
  }

  /**
   * Log performance metrics
   */
  static logPerformance(
    operation: string,
    duration: number,
    meta: Record<string, unknown> = {}
  ): void {
    if (enablePerformanceLogging) {
      LOGGER.info('Performance metric', {
        operation,
        duration,
        ...meta,
      });
    }
  }

  /**
   * Log with stack trace for debugging
   */
  static logWithStack(
    level: string,
    message: string,
    meta: Record<string, unknown> = {}
  ): void {
    const { stack } = new Error();
    const logMethod = (LOGGER as unknown as Record<string, unknown>)[level];
    if (typeof logMethod === 'function') {
      logMethod.call(LOGGER, message, {
        ...meta,
        stack: stack?.split('\n').slice(2, 6), // Include relevant stack frames
      });
    }
  }

  /**
   * Log system state for debugging
   */
  static logSystemState(
    context: string,
    additionalInfo: Record<string, unknown> = {}
  ): void {
    if (enableDebugLogging) {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      LOGGER.debug('System state snapshot', {
        context,
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024),
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        uptime: process.uptime(),
        ...additionalInfo,
      });
    }
  }

  /**
   * Log operation timing
   */
  static async timeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    meta: Record<string, unknown> = {}
  ): Promise<T> {
    const startTime = Date.now();
    const correlationId = this.generateCorrelationId();

    LOGGER.debug('Operation started', { operation, correlationId, ...meta });

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      LOGGER.info('Operation completed', {
        operation,
        duration,
        correlationId,
        success: true,
        ...meta,
      });

      this.logPerformance(operation, duration, { correlationId, ...meta });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      LOGGER.error('Operation failed', {
        operation,
        duration,
        correlationId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...meta,
      });

      throw error;
    }
  }

  /**
   * Log critical system events
   */
  static logCriticalEvent(
    event: string,
    details: Record<string, unknown> = {},
    shouldLog = true
  ): void {
    LOGGER.error('Critical system event', {
      event,
      critical: true,
      shouldLog,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  /**
   * Log security events
   */
  static logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, unknown> = {}
  ): void {
    LOGGER.warn('Security event', {
      event,
      severity,
      security: true,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  /**
   * Log business events for analytics
   */
  static logBusinessEvent(
    event: string,
    details: Record<string, unknown> = {}
  ): void {
    LOGGER.info('Business event', {
      event,
      business: true,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }
}

/**
 * Performance timing decorator
 */
export function logTiming(operation?: string): MethodDecorator {
  return function (
    target: unknown,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => unknown;
    const operationName =
      operation ??
      `${
        (target as { constructor: { name: string } }).constructor.name
      }.${String(propertyKey)}`;

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      return DebugLogger.timeOperation(
        operationName,
        () => originalMethod.apply(this, args) as Promise<unknown>,
        {
          method: String(propertyKey),
          class: (target as { constructor: { name: string } }).constructor.name,
        }
      );
    };

    return descriptor;
  };
}
