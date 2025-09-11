/**
 * Automated error reporting and alerting system
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { alertingManager } from './alerting-manager.js';
import type { ErrorReport } from '../core/error-handler.js';

export interface ErrorReportConfig {
  enableAutomaticReporting: boolean;
  reportingThreshold: 'low' | 'medium' | 'high' | 'critical';
  batchSize: number;
  batchTimeout: number;
  retryAttempts: number;
  enableStackTrace: boolean;
  enableSystemContext: boolean;
  enableUserContext: boolean;
}

export interface SystemContext {
  nodeVersion: string;
  platform: string;
  architecture: string;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  uptime: number;
  loadAverage: number[];
  environment: string;
  timestamp: number;
}

export interface ErrorReportPayload {
  id: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: {
    operation: string;
    userId?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  timestamp: number;
  systemContext?: SystemContext;
  userContext?: Record<string, unknown>;
  breadcrumbs: Array<{
    timestamp: number;
    message: string;
    level: string;
    data?: Record<string, unknown>;
  }>;
}

export interface ReportingStats {
  totalReports: number;
  reportsByCategory: Record<string, number>;
  reportsBySeverity: Record<string, number>;
  successfulReports: number;
  failedReports: number;
  averageReportingTime: number;
  lastReportTime: number;
}

export class ErrorReportingSystem extends EventEmitter {
  private config: ErrorReportConfig;
  private reportQueue: ErrorReportPayload[] = [];
  private breadcrumbs: Array<{
    timestamp: number;
    message: string;
    level: string;
    data?: Record<string, unknown>;
  }> = [];
  private readonly maxBreadcrumbs = 50;
  private batchTimer?: NodeJS.Timeout;
  private stats: ReportingStats = {
    totalReports: 0,
    reportsByCategory: {},
    reportsBySeverity: {},
    successfulReports: 0,
    failedReports: 0,
    averageReportingTime: 0,
    lastReportTime: 0,
  };
  private reportingTimes: number[] = [];
  private readonly maxReportingTimes = 100;

  constructor(config: Partial<ErrorReportConfig> = {}) {
    super();

    this.config = {
      enableAutomaticReporting: true,
      reportingThreshold: 'medium',
      batchSize: 10,
      batchTimeout: 30000, // 30 seconds
      retryAttempts: 3,
      enableStackTrace: true,
      enableSystemContext: true,
      enableUserContext: false,
      ...config,
    };

    this.setupBreadcrumbCollection();
    // Don't start batch processing automatically - only when needed
  }

  /**
   * Report an error
   */
  async reportError(errorReport: ErrorReport): Promise<void> {
    if (!this.config.enableAutomaticReporting) {
      return;
    }

    // Check if error meets reporting threshold
    if (!this.shouldReport(errorReport.severity)) {
      return;
    }

    try {
      const payload = await this.createReportPayload(errorReport);

      // Start batch processing if not already started
      if (!this.batchTimer && !this.isShuttingDown) {
        this.startBatchProcessing();
      }

      // Add to queue for batch processing
      this.reportQueue.push(payload);

      // Update stats
      this.updateStats(payload);

      // Process immediately for critical errors
      if (errorReport.severity === 'critical') {
        await this.processBatch([payload]);
      } else if (this.reportQueue.length >= this.config.batchSize) {
        await this.processBatch();
      }

      logger.debug('Error queued for reporting', {
        errorId: errorReport.id,
        severity: errorReport.severity,
        queueSize: this.reportQueue.length,
      });
    } catch (error) {
      logger.error('Failed to queue error for reporting', {
        originalError: errorReport.error.message,
        reportingError:
          error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Add breadcrumb for context
   */
  addBreadcrumb(
    message: string,
    level: 'debug' | 'info' | 'warn' | 'error' = 'info',
    data?: Record<string, unknown>
  ): void {
    const breadcrumb = {
      timestamp: Date.now(),
      message,
      level,
      ...(data && { data }),
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only recent breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  /**
   * Force process all queued reports
   */
  async flushReports(): Promise<void> {
    if (this.reportQueue.length === 0) {
      return;
    }

    logger.info('Flushing error reports', {
      queueSize: this.reportQueue.length,
    });
    await this.processBatch();
  }

  /**
   * Get reporting statistics
   */
  getStats(): ReportingStats {
    return { ...this.stats };
  }

  /**
   * Clear breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorReportConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Error reporting configuration updated', {
      config: this.config,
    });
  }

  /**
   * Shutdown error reporting system
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('Shutting down error reporting system');

    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined as any;
    }

    // Flush remaining reports
    await this.flushReports();

    logger.info('Error reporting system shutdown complete');
  }

  private isShuttingDown = false;

  private shouldReport(severity: string): boolean {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    const errorLevel =
      severityLevels[severity as keyof typeof severityLevels] || 1;
    const thresholdLevel = severityLevels[this.config.reportingThreshold];

    return errorLevel >= thresholdLevel;
  }

  private async createReportPayload(
    errorReport: ErrorReport
  ): Promise<ErrorReportPayload> {
    const payload: ErrorReportPayload = {
      id: errorReport.id,
      error: {
        name: errorReport.error.name,
        message: errorReport.error.message,
        ...(this.config.enableStackTrace &&
          errorReport.error.stack && { stack: errorReport.error.stack }),
      },
      context: {
        operation: errorReport.context.operation,
        ...(errorReport.context.userId && {
          userId: errorReport.context.userId,
        }),
        ...(errorReport.context.requestId && {
          requestId: errorReport.context.requestId,
        }),
        ...(errorReport.context.metadata && {
          metadata: errorReport.context.metadata,
        }),
      },
      severity: errorReport.severity,
      category: errorReport.category,
      timestamp: errorReport.timestamp,
      breadcrumbs: [...this.breadcrumbs],
    };

    // Add system context if enabled
    if (this.config.enableSystemContext) {
      payload.systemContext = this.getSystemContext();
    }

    // Add user context if enabled (would be populated from request context)
    if (this.config.enableUserContext && errorReport.context.metadata) {
      const userContext: Record<string, unknown> = {};
      if (errorReport.context.metadata['userAgent']) {
        userContext['userAgent'] = errorReport.context.metadata['userAgent'];
      }
      if (errorReport.context.metadata['ip']) {
        userContext['ip'] = errorReport.context.metadata['ip'];
      }
      if (errorReport.context.metadata['sessionId']) {
        userContext['sessionId'] = errorReport.context.metadata['sessionId'];
      }
      payload.userContext = userContext;
    }

    return payload;
  }

  private getSystemContext(): SystemContext {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      uptime: process.uptime(),
      loadAverage: process.platform === 'linux' ? require('os').loadavg() : [],
      environment: process.env['NODE_ENV'] || 'development',
      timestamp: Date.now(),
    };
  }

  private async processBatch(reports?: ErrorReportPayload[]): Promise<void> {
    const batch = reports || this.reportQueue.splice(0, this.config.batchSize);

    if (batch.length === 0) {
      return;
    }

    const startTime = Date.now();

    try {
      await this.sendReports(batch);

      const duration = Date.now() - startTime;
      this.recordReportingTime(duration);

      this.stats.successfulReports += batch.length;

      logger.debug('Error reports sent successfully', {
        batchSize: batch.length,
        duration,
      });
    } catch (error) {
      this.stats.failedReports += batch.length;

      logger.error('Failed to send error reports', {
        batchSize: batch.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Re-queue reports for retry (with limit)
      for (const report of batch) {
        const retryCount = (report as any).retryCount || 0;
        if (retryCount < this.config.retryAttempts) {
          (report as any).retryCount = retryCount + 1;
          this.reportQueue.unshift(report);
        }
      }
    }
  }

  private async sendReports(reports: ErrorReportPayload[]): Promise<void> {
    // In a real implementation, this would send to external error reporting service
    // For now, we'll log them and create alerts

    for (const report of reports) {
      // Log the error report
      logger.error('Error report', {
        reportId: report.id,
        error: report.error,
        context: report.context,
        severity: report.severity,
        category: report.category,
        systemContext: report.systemContext,
      });

      // Create alert for high severity errors
      if (report.severity === 'high' || report.severity === 'critical') {
        await alertingManager.createAlert(
          'error',
          report.severity,
          `Error Report: ${report.error.name}`,
          report.error.message,
          'error-reporting-system',
          {
            reportId: report.id,
            category: report.category,
            operation: report.context.operation,
            systemContext: report.systemContext,
          }
        );
      }

      // Emit event for external integrations
      this.emit('errorReported', report);
    }

    // In production, you would send to services like:
    // - Sentry
    // - Rollbar
    // - Bugsnag
    // - Custom webhook endpoints
    // - Slack/Teams notifications

    // Example webhook call (commented out):
    /*
    const webhookUrl = process.env.ERROR_WEBHOOK_URL;
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports }),
      });
    }
    */
  }

  private updateStats(payload: ErrorReportPayload): void {
    this.stats.totalReports++;
    this.stats.reportsByCategory[payload.category] =
      (this.stats.reportsByCategory[payload.category] || 0) + 1;
    this.stats.reportsBySeverity[payload.severity] =
      (this.stats.reportsBySeverity[payload.severity] || 0) + 1;
    this.stats.lastReportTime = Date.now();
  }

  private recordReportingTime(duration: number): void {
    this.reportingTimes.push(duration);

    if (this.reportingTimes.length > this.maxReportingTimes) {
      this.reportingTimes = this.reportingTimes.slice(-this.maxReportingTimes);
    }

    this.stats.averageReportingTime =
      this.reportingTimes.reduce((sum, time) => sum + time, 0) /
      this.reportingTimes.length;
  }

  private setupBreadcrumbCollection(): void {
    // Collect breadcrumbs from logger
    const originalLog = logger.log.bind(logger);
    (logger as any).log = (level: any, message: any, meta: any = {}) => {
      // Add breadcrumb for significant log entries
      if (['warn', 'error'].includes(level)) {
        this.addBreadcrumb(
          typeof message === 'string' ? message : JSON.stringify(message),
          level,
          meta
        );
      }

      return originalLog(level, message, meta);
    };
  }

  private startBatchProcessing(): void {
    const processBatchPeriodically = () => {
      if (this.isShuttingDown) {
        return;
      }

      this.batchTimer = setTimeout(async () => {
        if (!this.isShuttingDown && this.reportQueue.length > 0) {
          await this.processBatch();
        }
        if (!this.isShuttingDown) {
          processBatchPeriodically();
        }
      }, this.config.batchTimeout);
    };

    processBatchPeriodically();
  }
}

// Global error reporting system instance
export const errorReportingSystem = new ErrorReportingSystem();
