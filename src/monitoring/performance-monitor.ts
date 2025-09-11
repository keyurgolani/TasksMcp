/**
 * Performance monitoring and benchmarking system
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
// import { ConfigManager } from '../config/index.js';
import { logger } from '../utils/logger.js';

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
  // Configuration loaded on demand to avoid circular dependencies
  private benchmarks: PerformanceBenchmark[] = [];
  private readonly maxBenchmarks = 10000;
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    super();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs = 5000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
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
      this.monitoringInterval = undefined as any;
    }

    logger.info('Performance monitoring stopped');
  }

  /**
   * Record a performance benchmark
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

    // Emit event for real-time monitoring
    this.emit('benchmark', benchmark);

    // Log slow operations
    if (duration > 1000) {
      // > 1 second
      logger.warn('Slow operation detected', {
        name,
        duration,
        metadata,
      });
    }
  }

  /**
   * Time an operation and record benchmark
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
   * Get overall system performance metrics
   */
  getSystemMetrics(timeWindowMs = 300000): PerformanceMetrics {
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
   * Clear all benchmarks
   */
  clearBenchmarks(): void {
    this.benchmarks = [];
    logger.debug('Performance benchmarks cleared');
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

  private collectSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.emit('systemMetrics', {
      timestamp: Date.now(),
      memoryUsage: memUsage,
      cpuUsage: cpuUsage,
    });
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
