/**
 * Performance monitoring and benchmarking system
 * 
 * Provides comprehensive performance tracking, metrics collection, and alerting for the MCP Task Manager.
 * Features include:
 * - Real-time operation timing and benchmarking
 * - Circuit breaker pattern for fault tolerance
 * - Load testing capabilities with concurrent user simulation
 * - Performance alerts based on configurable thresholds
 * - Detailed metrics collection (percentiles, throughput, error rates)
 * - System resource monitoring (memory, CPU usage)
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { logger } from '../../shared/utils/logger.js';

export interface PerformanceBenchmark {
  name: string;
  duration: number;
  timestamp: number;
  metadata: Record<string, any>;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // operations per second
  errorRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

export interface OperationMetrics {
  operationName: string;
  totalCalls: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  lastCall: Date;
  firstCall: Date;
}

export interface PerformanceAlert {
  type: 'slow_operation' | 'high_error_rate' | 'memory_pressure' | 'throughput_drop';
  severity: 'low' | 'medium' | 'high' | 'critical';
  operationName: string;
  message: string;
  timestamp: Date;
  metrics: Partial<OperationMetrics>;
  threshold: number;
  actualValue: number;
}

export interface LoadTestConfig {
  concurrentUsers: number;
  duration: number; // milliseconds
  rampUpTime: number; // milliseconds
  operations: LoadTestOperation[];
}

export interface LoadTestOperation {
  name: string;
  weight: number; // relative frequency
  execute: () => Promise<void>;
}

export interface LoadTestResult {
  config: LoadTestConfig;
  startTime: number;
  endTime: number;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  metrics: PerformanceMetrics;
  errors: Array<{ timestamp: number; error: string; operation: string }>;
}

export class PerformanceMonitor extends EventEmitter {
  private benchmarks: PerformanceBenchmark[] = [];
  private operationMetrics = new Map<string, OperationMetrics>();
  private alerts: PerformanceAlert[] = [];
  
  private readonly maxBenchmarks = 10000;
  private readonly maxAlerts = 100;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | undefined;

  private readonly thresholds = {
    slowOperationMs: 2000,
    highErrorRatePercent: 5,
    lowThroughputOpsPerSec: 1,
    memoryPressureMB: 500,
  };

  constructor() {
    super();
    this.setMaxListeners(50); // Increase max listeners for testing scenarios
  }

  /**
   * Start performance monitoring with configurable collection interval
   * 
   * Initiates continuous monitoring of system performance metrics including:
   * - System resource collection (memory, CPU)
   * - Performance analysis and trend detection
   * - Threshold checking and alert generation
   * - Automatic cleanup of old performance data
   * 
   * @param intervalMs - Collection interval in milliseconds (default: 5000ms)
   */
  startMonitoring(intervalMs = 5000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.analyzePerformance();
      this.checkThresholds();
      this.cleanupOldData();
    }, intervalMs);

    logger.info('Performance monitoring started', { intervalMs });
  }

  /**
   * Stop performance monitoring
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

    logger.info('Performance monitoring stopped');
  }

  /**
   * Record a performance benchmark for an operation
   * 
   * Captures timing data for operations and automatically:
   * - Updates operation-specific metrics (averages, percentiles, throughput)
   * - Maintains a rolling window of recent benchmarks
   * - Emits real-time events for monitoring systems
   * - Logs warnings for operations exceeding performance thresholds
   * 
   * @param name - Unique identifier for the operation being benchmarked
   * @param duration - Operation duration in milliseconds
   * @param metadata - Additional context data (success status, error info, etc.)
   */
  recordBenchmark(
    name: string,
    duration: number,
    metadata: Record<string, any> = {}
  ): void {
    const benchmark: PerformanceBenchmark = {
      name,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.benchmarks.push(benchmark);

    // Keep only the most recent benchmarks
    if (this.benchmarks.length > this.maxBenchmarks) {
      this.benchmarks = this.benchmarks.slice(-this.maxBenchmarks);
    }

    // Update operation metrics
    this.updateOperationMetrics(benchmark);

    // Emit event for real-time monitoring
    this.emit('benchmark', benchmark);

    // Log slow operations
    if (duration > 1000) {
      logger.warn('Slow operation detected', {
        name,
        duration,
        metadata,
      });
    }
  }

  /**
   * Time an operation and automatically record benchmark data
   * 
   * Wraps an async operation with high-precision timing measurement using performance.now().
   * Automatically records success/failure status and preserves original errors while
   * ensuring performance data is captured regardless of operation outcome.
   * 
   * @param name - Operation identifier for metrics tracking
   * @param operation - Async function to execute and time
   * @param metadata - Additional context to include in benchmark data
   * @returns Promise<T> - Result of the operation (preserves original return type)
   * @throws Error - Re-throws original operation errors after recording timing data
   */
  async timeOperation<T>(
    name: string,
    operation: () => Promise<T>,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      this.recordBenchmark(name, duration, { ...metadata, success: true });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordBenchmark(name, duration, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get performance metrics for a specific operation
   */
  getOperationMetrics(
    operationName: string,
    timeWindowMs = 300000
  ): PerformanceMetrics {
    const cutoffTime = Date.now() - timeWindowMs;
    const relevantBenchmarks = this.benchmarks.filter(
      b => b.name === operationName && b.timestamp > cutoffTime
    );

    if (relevantBenchmarks.length === 0) {
      return this.getEmptyMetrics();
    }

    const durations = relevantBenchmarks
      .map(b => b.duration)
      .sort((a, b) => a - b);
    const failedOps = relevantBenchmarks.filter(
      b => b.metadata['success'] === false
    );

    return {
      averageResponseTime:
        durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p50ResponseTime: this.getPercentile(durations, 0.5),
      p95ResponseTime: this.getPercentile(durations, 0.95),
      p99ResponseTime: this.getPercentile(durations, 0.99),
      throughput: relevantBenchmarks.length / (timeWindowMs / 1000),
      errorRate: failedOps.length / relevantBenchmarks.length,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };
  }

  /**
   * Get enhanced metrics for a specific operation
   */
  getDetailedOperationMetrics(operationName: string): OperationMetrics | null {
    return this.operationMetrics.get(operationName) || null;
  }

  /**
   * Get all operation metrics
   */
  getAllOperationMetrics(): Map<string, OperationMetrics> {
    return new Map(this.operationMetrics);
  }

  /**
   * Get performance alerts
   */
  getAlerts(severity?: PerformanceAlert['severity']): PerformanceAlert[] {
    if (severity) {
      return this.alerts.filter(a => a.severity === severity);
    }
    return [...this.alerts];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalOperations: number;
    slowOperations: number;
    errorOperations: number;
    averageResponseTime: number;
    totalAlerts: number;
    criticalAlerts: number;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    let totalOperations = 0;
    let slowOperations = 0;
    let errorOperations = 0;
    let totalDuration = 0;

    for (const metrics of this.operationMetrics.values()) {
      totalOperations += metrics.totalCalls;
      totalDuration += metrics.totalDuration;
      
      if (metrics.averageDuration > this.thresholds.slowOperationMs) {
        slowOperations++;
      }
      
      if (metrics.errorRate > this.thresholds.highErrorRatePercent / 100) {
        errorOperations++;
      }
    }

    const averageResponseTime = totalOperations > 0 ? totalDuration / totalOperations : 0;
    const criticalAlerts = this.alerts.filter(a => a.severity === 'critical').length;

    return {
      totalOperations,
      slowOperations,
      errorOperations,
      averageResponseTime,
      totalAlerts: this.alerts.length,
      criticalAlerts,
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): string {
    const summary = this.getPerformanceSummary();
    const topOperations = Array.from(this.operationMetrics.values())
      .sort((a, b) => b.totalCalls - a.totalCalls)
      .slice(0, 10);

    const recentAlerts = this.alerts
      .filter(a => Date.now() - a.timestamp.getTime() < 3600000) // Last hour
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const report = [
      '# Performance Report',
      '',
      '## Summary',
      `- Total Operations: ${summary.totalOperations}`,
      `- Average Response Time: ${summary.averageResponseTime.toFixed(2)}ms`,
      `- Slow Operations: ${summary.slowOperations}`,
      `- Error Operations: ${summary.errorOperations}`,
      `- Total Alerts: ${summary.totalAlerts}`,
      `- Critical Alerts: ${summary.criticalAlerts}`,
      '',
      '## Memory Usage',
      `- Heap Used: ${(summary.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      `- Heap Total: ${(summary.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      `- RSS: ${(summary.memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      '',
      '## Top Operations by Call Count',
    ];

    for (const [index, op] of topOperations.entries()) {
      report.push(
        `${index + 1}. ${op.operationName}`,
        `   - Calls: ${op.totalCalls}`,
        `   - Avg Duration: ${op.averageDuration.toFixed(2)}ms`,
        `   - Success Rate: ${(op.successRate * 100).toFixed(1)}%`,
        `   - Throughput: ${op.throughput.toFixed(2)} ops/sec`,
        ''
      );
    }

    if (recentAlerts.length > 0) {
      report.push('## Recent Alerts (Last Hour)');
      for (const alert of recentAlerts.slice(0, 5)) {
        report.push(
          `- [${alert.severity.toUpperCase()}] ${alert.operationName}: ${alert.message}`,
          `  Time: ${alert.timestamp.toISOString()}`
        );
      }
      report.push('');
    }

    return report.join('\n');
  }

  /**
   * Run a load test
   */
  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    logger.info('Starting load test', {
      concurrentUsers: config.concurrentUsers,
      duration: config.duration,
      operations: config.operations.length,
    });

    const startTime = Date.now();
    const endTime = startTime + config.duration;
    const errors: Array<{
      timestamp: number;
      error: string;
      operation: string;
    }> = [];

    let totalOperations = 0;
    let successfulOperations = 0;
    let failedOperations = 0;

    // Create user simulation promises
    const userPromises: Promise<void>[] = [];

    for (let i = 0; i < config.concurrentUsers; i++) {
      const userPromise = this.simulateUser(
        config,
        startTime,
        endTime,
        i,
        (operation, success, error) => {
          totalOperations++;
          if (success) {
            successfulOperations++;
          } else {
            failedOperations++;
            errors.push({
              timestamp: Date.now(),
              error: error || 'Unknown error',
              operation,
            });
          }
        }
      );

      userPromises.push(userPromise);

      // Ramp up users gradually
      if (config.rampUpTime > 0 && i < config.concurrentUsers - 1) {
        const delay = config.rampUpTime / config.concurrentUsers;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Wait for all users to complete
    await Promise.allSettled(userPromises);

    const actualEndTime = Date.now();
    const metrics = this.getSystemMetrics(actualEndTime - startTime);

    const result: LoadTestResult = {
      config,
      startTime,
      endTime: actualEndTime,
      totalOperations,
      successfulOperations,
      failedOperations,
      metrics,
      errors: errors.slice(-100), // Keep only last 100 errors
    };

    logger.info('Load test completed', {
      duration: actualEndTime - startTime,
      totalOperations,
      successfulOperations,
      failedOperations,
      errorRate: failedOperations / totalOperations,
      throughput: totalOperations / ((actualEndTime - startTime) / 1000),
    });

    return result;
  }

  /**
   * Clear all benchmarks and metrics
   */
  clearData(): void {
    this.benchmarks = [];
    this.operationMetrics.clear();
    this.alerts = [];
    logger.debug('Performance monitor data cleared');
  }

  /**
   * Get benchmark history
   */
  getBenchmarkHistory(
    operationName?: string,
    limit = 1000
  ): PerformanceBenchmark[] {
    let benchmarks = this.benchmarks;

    if (operationName) {
      benchmarks = benchmarks.filter(b => b.name === operationName);
    }

    return benchmarks.slice(-limit);
  }

  // Private methods

  private updateOperationMetrics(benchmark: PerformanceBenchmark): void {
    const operationName = benchmark.name;
    let metrics = this.operationMetrics.get(operationName);

    if (!metrics) {
      metrics = {
        operationName,
        totalCalls: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        successRate: 0,
        errorRate: 0,
        throughput: 0,
        lastCall: new Date(benchmark.timestamp),
        firstCall: new Date(benchmark.timestamp),
      };
      this.operationMetrics.set(operationName, metrics);
    }

    // Update basic metrics
    metrics.totalCalls++;
    metrics.totalDuration += benchmark.duration;
    metrics.averageDuration = metrics.totalDuration / metrics.totalCalls;
    metrics.minDuration = Math.min(metrics.minDuration, benchmark.duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, benchmark.duration);
    metrics.lastCall = new Date(benchmark.timestamp);

    // Calculate percentiles from recent benchmarks for this operation
    const recentOperationBenchmarks = this.benchmarks
      .filter(b => b.name === operationName)
      .map(b => b.duration)
      .sort((a, b) => a - b);

    if (recentOperationBenchmarks.length > 0) {
      metrics.p50Duration = this.getPercentile(recentOperationBenchmarks, 0.5);
      metrics.p95Duration = this.getPercentile(recentOperationBenchmarks, 0.95);
      metrics.p99Duration = this.getPercentile(recentOperationBenchmarks, 0.99);
    }

    // Calculate success/error rates
    const recentOperationResults = this.benchmarks
      .filter(b => b.name === operationName && b.timestamp > Date.now() - 300000); // Last 5 minutes

    if (recentOperationResults.length > 0) {
      const successCount = recentOperationResults.filter(b => b.metadata?.['success'] !== false).length;
      metrics.successRate = successCount / recentOperationResults.length;
      metrics.errorRate = 1 - metrics.successRate;
      
      // Calculate throughput (operations per second over last 5 minutes)
      const timeSpan = Math.max(1, (Date.now() - recentOperationResults[0]!.timestamp) / 1000);
      metrics.throughput = recentOperationResults.length / timeSpan;
    }
  }

  private analyzePerformance(): void {
    const summary = this.getPerformanceSummary();
    this.emit('performanceAnalysis', {
      timestamp: new Date(),
      summary,
      topOperations: Array.from(this.operationMetrics.values())
        .sort((a, b) => b.totalCalls - a.totalCalls)
        .slice(0, 5),
    });
  }

  private checkThresholds(): void {
    for (const metrics of this.operationMetrics.values()) {
      // Check for slow operations
      if (metrics.averageDuration > this.thresholds.slowOperationMs) {
        this.addAlert({
          type: 'slow_operation',
          severity: metrics.averageDuration > this.thresholds.slowOperationMs * 2 ? 'high' : 'medium',
          operationName: metrics.operationName,
          message: `Slow operation detected: ${metrics.operationName} averaging ${metrics.averageDuration.toFixed(2)}ms`,
          timestamp: new Date(),
          metrics,
          threshold: this.thresholds.slowOperationMs,
          actualValue: metrics.averageDuration,
        });
      }

      // Check for high error rates
      if (metrics.errorRate > this.thresholds.highErrorRatePercent / 100) {
        this.addAlert({
          type: 'high_error_rate',
          severity: metrics.errorRate > 0.2 ? 'critical' : 'high',
          operationName: metrics.operationName,
          message: `High error rate detected: ${metrics.operationName} has ${(metrics.errorRate * 100).toFixed(1)}% error rate`,
          timestamp: new Date(),
          metrics,
          threshold: this.thresholds.highErrorRatePercent / 100,
          actualValue: metrics.errorRate,
        });
      }

      // Check for low throughput
      if (metrics.throughput < this.thresholds.lowThroughputOpsPerSec && metrics.totalCalls > 10) {
        this.addAlert({
          type: 'throughput_drop',
          severity: 'medium',
          operationName: metrics.operationName,
          message: `Low throughput detected: ${metrics.operationName} at ${metrics.throughput.toFixed(2)} ops/sec`,
          timestamp: new Date(),
          metrics,
          threshold: this.thresholds.lowThroughputOpsPerSec,
          actualValue: metrics.throughput,
        });
      }
    }

    // Check memory pressure
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    
    if (heapUsedMB > this.thresholds.memoryPressureMB) {
      this.addAlert({
        type: 'memory_pressure',
        severity: heapUsedMB > this.thresholds.memoryPressureMB * 1.5 ? 'critical' : 'high',
        operationName: 'system',
        message: `High memory usage detected: ${heapUsedMB.toFixed(2)} MB heap used`,
        timestamp: new Date(),
        metrics: {},
        threshold: this.thresholds.memoryPressureMB,
        actualValue: heapUsedMB,
      });
    }
  }

  private addAlert(alert: PerformanceAlert): void {
    // Avoid duplicate alerts for the same issue within 5 minutes
    const recentSimilarAlert = this.alerts.find(a => 
      a.type === alert.type &&
      a.operationName === alert.operationName &&
      Date.now() - a.timestamp.getTime() < 300000 // 5 minutes
    );

    if (recentSimilarAlert) {
      return;
    }

    this.alerts.push(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    // Emit alert event
    this.emit('performanceAlert', alert);

    // Log critical and high severity alerts
    if (alert.severity === 'critical' || alert.severity === 'high') {
      logger.warn('Performance alert', {
        type: alert.type,
        severity: alert.severity,
        operationName: alert.operationName,
        message: alert.message,
        threshold: alert.threshold,
        actualValue: alert.actualValue,
      });
    }
  }

  private cleanupOldData(): void {
    const cutoffTime = Date.now() - 3600000; // 1 hour ago

    // Clean old benchmarks
    this.benchmarks = this.benchmarks.filter(b => b.timestamp > cutoffTime);

    // Clean old alerts
    this.alerts = this.alerts.filter(a => a.timestamp.getTime() > cutoffTime);
  }

  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.emit('systemMetrics', {
      timestamp: Date.now(),
      memoryUsage: memUsage,
      cpuUsage: cpuUsage,
    });
  }

  private getSystemMetrics(timeWindowMs = 3600000): PerformanceMetrics {
    const cutoffTime = Date.now() - timeWindowMs;
    const relevantBenchmarks = this.benchmarks.filter(
      b => b.timestamp > cutoffTime
    );

    if (relevantBenchmarks.length === 0) {
      return this.getEmptyMetrics();
    }

    const durations = relevantBenchmarks
      .map(b => b.duration)
      .sort((a, b) => a - b);
    const failedOps = relevantBenchmarks.filter(
      b => b.metadata['success'] === false
    );

    return {
      averageResponseTime:
        durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p50ResponseTime: this.getPercentile(durations, 0.5),
      p95ResponseTime: this.getPercentile(durations, 0.95),
      p99ResponseTime: this.getPercentile(durations, 0.99),
      throughput: relevantBenchmarks.length / (timeWindowMs / 1000),
      errorRate: failedOps.length / relevantBenchmarks.length,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };
  }

  private async simulateUser(
    config: LoadTestConfig,
    _startTime: number,
    endTime: number,
    userId: number,
    onOperation: (operation: string, success: boolean, error?: string) => void
  ): Promise<void> {
    const totalWeight = config.operations.reduce(
      (sum, op) => sum + op.weight,
      0
    );

    while (Date.now() < endTime) {
      try {
        // Select operation based on weight
        const random = Math.random() * totalWeight;
        let currentWeight = 0;
        let selectedOperation: LoadTestOperation | undefined;

        for (const operation of config.operations) {
          currentWeight += operation.weight;
          if (random <= currentWeight) {
            selectedOperation = operation;
            break;
          }
        }

        if (!selectedOperation) {
          selectedOperation = config.operations[0];
        }

        if (selectedOperation) {
          const operationStartTime = performance.now();

          try {
            await selectedOperation.execute();
            const duration = performance.now() - operationStartTime;
            this.recordBenchmark(
              `load_test_${selectedOperation.name}`,
              duration,
              {
                userId,
                success: true,
              }
            );
            onOperation(selectedOperation.name, true);
          } catch (error) {
            const duration = performance.now() - operationStartTime;
            this.recordBenchmark(
              `load_test_${selectedOperation.name}`,
              duration,
              {
                userId,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
              }
            );
            onOperation(
              selectedOperation.name,
              false,
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
        }

        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      } catch (error) {
        logger.error('Error in user simulation', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return (
      sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))] || 0
    );
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      averageResponseTime: 0,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      throughput: 0,
      errorRate: 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();