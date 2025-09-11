/**
 * Metrics collection system for MCP Task Manager
 */

import { ConfigManager } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

export interface MetricsSummary {
  timestamp: string;
  uptime: number;
  metrics: {
    operations: OperationMetrics;
    storage: StorageMetrics;
    system: SystemMetrics;
    business: BusinessMetrics;
  };
}

export interface OperationMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerMinute: number;
}

export interface StorageMetrics {
  totalReads: number;
  totalWrites: number;
  totalDeletes: number;
  averageReadTime: number;
  averageWriteTime: number;
  cacheHitRate: number;
}

export interface SystemMetrics {
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
  };
  cpuUsage: number;
  uptime: number;
}

export interface BusinessMetrics {
  totalLists: number;
  totalItems: number;
  completedItems: number;
  averageComplexity: number;
  listsCreatedToday: number;
  itemsCompletedToday: number;
}

export class MetricsCollector {
  private config = ConfigManager.getInstance().getConfig();
  private metrics = new Map<string, Metric>();
  private startTime = Date.now();
  private operationCounts = {
    total: 0,
    successful: 0,
    failed: 0,
  };
  private responseTimes: number[] = [];
  private storageCounts = {
    reads: 0,
    writes: 0,
    deletes: 0,
  };
  private storageResponseTimes = {
    reads: [] as number[],
    writes: [] as number[],
  };
  private cacheStats = {
    hits: 0,
    misses: 0,
  };

  recordOperation(operation: string, duration: number, success: boolean): void {
    if (!this.config.monitoring.enabled) {
      return;
    }

    this.operationCounts.total++;
    if (success) {
      this.operationCounts.successful++;
    } else {
      this.operationCounts.failed++;
    }

    this.responseTimes.push(duration);

    // Keep only last 1000 response times for memory efficiency
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    this.updateMetric('operation_duration', 'histogram', duration, {
      operation,
      success: success.toString(),
    });

    this.updateMetric('operation_count', 'counter', 1, {
      operation,
      status: success ? 'success' : 'error',
    });

    logger.debug('Operation recorded', {
      operation,
      duration,
      success,
      totalOperations: this.operationCounts.total,
    });
  }

  recordStorageOperation(
    operation: 'read' | 'write' | 'delete',
    duration: number
  ): void {
    if (!this.config.monitoring.enabled) {
      return;
    }

    this.storageCounts[
      operation === 'delete'
        ? 'deletes'
        : (`${operation}s` as keyof typeof this.storageCounts)
    ]++;

    if (operation !== 'delete') {
      this.storageResponseTimes[
        `${operation}s` as keyof typeof this.storageResponseTimes
      ].push(duration);

      // Keep only last 500 response times for memory efficiency
      const times =
        this.storageResponseTimes[
          `${operation}s` as keyof typeof this.storageResponseTimes
        ];
      if (times.length > 500) {
        this.storageResponseTimes[
          `${operation}s` as keyof typeof this.storageResponseTimes
        ] = times.slice(-500);
      }
    }

    this.updateMetric('storage_operation_duration', 'histogram', duration, {
      operation,
    });

    this.updateMetric('storage_operation_count', 'counter', 1, {
      operation,
    });
  }

  recordCacheHit(hit: boolean): void {
    if (!this.config.monitoring.enabled) {
      return;
    }

    if (hit) {
      this.cacheStats.hits++;
    } else {
      this.cacheStats.misses++;
    }

    this.updateMetric('cache_operations', 'counter', 1, {
      type: hit ? 'hit' : 'miss',
    });
  }

  recordBusinessMetric(
    metric: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    if (!this.config.monitoring.enabled) {
      return;
    }

    this.updateMetric(`business_${metric}`, 'gauge', value, labels);
  }

  async getMetricsSummary(): Promise<MetricsSummary> {
    const now = Date.now();
    const uptime = now - this.startTime;

    // Calculate averages
    const averageResponseTime =
      this.responseTimes.length > 0
        ? this.responseTimes.reduce((sum, time) => sum + time, 0) /
          this.responseTimes.length
        : 0;

    const averageReadTime =
      this.storageResponseTimes.reads.length > 0
        ? this.storageResponseTimes.reads.reduce((sum, time) => sum + time, 0) /
          this.storageResponseTimes.reads.length
        : 0;

    const averageWriteTime =
      this.storageResponseTimes.writes.length > 0
        ? this.storageResponseTimes.writes.reduce(
            (sum, time) => sum + time,
            0
          ) / this.storageResponseTimes.writes.length
        : 0;

    const cacheHitRate =
      this.cacheStats.hits + this.cacheStats.misses > 0
        ? this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)
        : 0;

    // Calculate requests per minute
    const requestsPerMinute =
      uptime > 0 ? this.operationCounts.total / (uptime / 1000 / 60) : 0;

    // Get system metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Get business metrics (simplified - in real implementation, query storage)
    const businessMetrics = await this.getBusinessMetrics();

    return {
      timestamp: new Date().toISOString(),
      uptime,
      metrics: {
        operations: {
          totalRequests: this.operationCounts.total,
          successfulRequests: this.operationCounts.successful,
          failedRequests: this.operationCounts.failed,
          averageResponseTime: Math.round(averageResponseTime),
          requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
        },
        storage: {
          totalReads: this.storageCounts.reads,
          totalWrites: this.storageCounts.writes,
          totalDeletes: this.storageCounts.deletes,
          averageReadTime: Math.round(averageReadTime),
          averageWriteTime: Math.round(averageWriteTime),
          cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        },
        system: {
          memoryUsage: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
            rss: Math.round(memUsage.rss / 1024 / 1024), // MB
            external: Math.round(memUsage.external / 1024 / 1024), // MB
          },
          cpuUsage: Math.round((cpuUsage.user + cpuUsage.system) / 1000), // microseconds to milliseconds
          uptime: Math.round(uptime / 1000), // seconds
        },
        business: businessMetrics,
      },
    };
  }

  getPrometheusMetrics(): string {
    if (!this.config.monitoring.enabled) {
      return '';
    }

    const lines: string[] = [];

    for (const [name, metric] of this.metrics) {
      const labels = metric.labels
        ? Object.entries(metric.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',')
        : '';

      const labelString = labels ? `{${labels}}` : '';
      lines.push(`${name}${labelString} ${metric.value} ${metric.timestamp}`);
    }

    return lines.join('\n');
  }

  private updateMetric(
    name: string,
    type: Metric['type'],
    value: number,
    labels?: Record<string, string>
  ): void {
    const key = `${name}_${JSON.stringify(labels || {})}`;

    this.metrics.set(key, {
      name,
      type,
      value,
      labels: labels || {},
      timestamp: Date.now(),
    });
  }

  private async getBusinessMetrics(): Promise<BusinessMetrics> {
    // In a real implementation, this would query the storage layer
    // For now, return placeholder values
    return {
      totalLists: 0,
      totalItems: 0,
      completedItems: 0,
      averageComplexity: 0,
      listsCreatedToday: 0,
      itemsCompletedToday: 0,
    };
  }

  reset(): void {
    this.metrics.clear();
    this.operationCounts = { total: 0, successful: 0, failed: 0 };
    this.responseTimes = [];
    this.storageCounts = { reads: 0, writes: 0, deletes: 0 };
    this.storageResponseTimes = { reads: [], writes: [] };
    this.cacheStats = { hits: 0, misses: 0 };
    this.startTime = Date.now();
  }
}

// Global metrics collector instance
export const metricsCollector = new MetricsCollector();
