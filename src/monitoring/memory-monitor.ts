/**
 * Memory usage monitoring and leak detection system
 */

import { EventEmitter } from 'events';
// import { ConfigManager } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

export interface MemoryTrend {
  timeWindow: number; // milliseconds
  samples: number;
  averageGrowthRate: number; // bytes per second
  peakUsage: number;
  currentUsage: number;
  isLeaking: boolean;
  confidence: number; // 0-1
}

export interface MemoryAlert {
  type: 'high_usage' | 'potential_leak' | 'rapid_growth' | 'gc_pressure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  data: Record<string, any>;
}

export interface MemoryStats {
  current: MemorySnapshot;
  trend: MemoryTrend;
  alerts: MemoryAlert[];
  gcStats: GCStats;
}

export interface GCStats {
  totalCollections: number;
  totalTime: number; // milliseconds
  averageTime: number;
  frequency: number; // collections per minute
  pressure: 'low' | 'medium' | 'high';
}

export class MemoryMonitor extends EventEmitter {
  // Configuration loaded on demand to avoid circular dependencies
  private snapshots: MemorySnapshot[] = [];
  private readonly maxSnapshots = 1000;
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private gcStats: GCStats = {
    totalCollections: 0,
    totalTime: 0,
    averageTime: 0,
    frequency: 0,
    pressure: 'low',
  };
  private lastGCTime = 0;
  private alerts: MemoryAlert[] = [];
  private readonly maxAlerts = 100;
  private gcMonitoringInterval?: NodeJS.Timeout;

  // Thresholds
  private readonly highUsageThreshold = 0.8; // 80% of heap limit
  private readonly leakThreshold = 1024 * 1024 * 10; // 10MB growth per minute
  private readonly rapidGrowthThreshold = 1024 * 1024 * 50; // 50MB growth in 30 seconds

  constructor() {
    super();
    // Don't start GC monitoring automatically - only when monitoring starts
  }

  /**
   * Start memory monitoring
   */
  startMonitoring(intervalMs = 10000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMemorySnapshot();
      this.analyzeMemoryTrends();
      this.checkForAlerts();
    }, intervalMs);

    // Setup GC monitoring when monitoring starts
    this.setupGCMonitoring();

    // Take initial snapshot
    this.collectMemorySnapshot();

    logger.info('Memory monitoring started', { intervalMs });
  }

  /**
   * Stop memory monitoring
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

    if (this.gcMonitoringInterval) {
      clearInterval(this.gcMonitoringInterval);
      this.gcMonitoringInterval = undefined as any;
    }

    logger.info('Memory monitoring stopped');
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC(): boolean {
    if (global.gc) {
      const startTime = Date.now();
      global.gc();
      const gcTime = Date.now() - startTime;

      this.gcStats.totalCollections++;
      this.gcStats.totalTime += gcTime;
      this.gcStats.averageTime =
        this.gcStats.totalTime / this.gcStats.totalCollections;

      logger.debug('Forced garbage collection', { duration: gcTime });
      return true;
    }

    logger.warn('Garbage collection not available (run with --expose-gc)');
    return false;
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    const current = this.getCurrentSnapshot();
    const trend = this.calculateMemoryTrend();
    const recentAlerts = this.alerts.slice(-10);

    return {
      current,
      trend,
      alerts: recentAlerts,
      gcStats: { ...this.gcStats },
    };
  }

  /**
   * Get memory usage history
   */
  getMemoryHistory(timeWindowMs = 3600000): MemorySnapshot[] {
    const cutoffTime = Date.now() - timeWindowMs;
    return this.snapshots.filter(s => s.timestamp > cutoffTime);
  }

  /**
   * Check if system is experiencing memory pressure
   */
  isMemoryPressure(): boolean {
    const current = this.getCurrentSnapshot();
    const heapLimit = this.getHeapLimit();
    const usageRatio = current.heapUsed / heapLimit;

    return (
      usageRatio > this.highUsageThreshold || this.gcStats.pressure === 'high'
    );
  }

  /**
   * Detect potential memory leaks
   */
  detectMemoryLeaks(): {
    isLeaking: boolean;
    confidence: number;
    details: string;
  } {
    if (this.snapshots.length < 10) {
      return { isLeaking: false, confidence: 0, details: 'Insufficient data' };
    }

    const trend = this.calculateMemoryTrend();
    const isLeaking = trend.isLeaking;
    const confidence = trend.confidence;

    let details = '';
    if (isLeaking) {
      details = `Memory growing at ${(trend.averageGrowthRate / 1024 / 1024).toFixed(2)} MB/s over ${Math.round(trend.timeWindow / 1000)}s`;
    } else {
      details = 'No significant memory growth detected';
    }

    return { isLeaking, confidence, details };
  }

  /**
   * Get memory optimization suggestions
   */
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    const current = this.getCurrentSnapshot();
    const heapLimit = this.getHeapLimit();
    const usageRatio = current.heapUsed / heapLimit;

    if (usageRatio > 0.9) {
      suggestions.push(
        'Critical: Memory usage above 90%, consider increasing heap size or optimizing memory usage'
      );
    } else if (usageRatio > 0.8) {
      suggestions.push('Warning: Memory usage above 80%, monitor closely');
    }

    if (this.gcStats.frequency > 10) {
      suggestions.push(
        'High GC frequency detected, consider optimizing object allocation patterns'
      );
    }

    if (this.gcStats.averageTime > 100) {
      suggestions.push(
        'Long GC pauses detected, consider reducing heap size or optimizing data structures'
      );
    }

    const leak = this.detectMemoryLeaks();
    if (leak.isLeaking && leak.confidence > 0.7) {
      suggestions.push(`Potential memory leak detected: ${leak.details}`);
    }

    if (current.external > current.heapUsed) {
      suggestions.push(
        'High external memory usage, check for large buffers or native modules'
      );
    }

    if (suggestions.length === 0) {
      suggestions.push('Memory usage appears healthy');
    }

    return suggestions;
  }

  /**
   * Create a memory heap dump (if available)
   */
  createHeapDump(): string | null {
    try {
      const v8 = require('v8');
      const fs = require('fs');
      const path = require('path');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `heap-dump-${timestamp}.heapsnapshot`;
      const filepath = path.join(process.cwd(), 'logs', filename);

      const heapSnapshot = v8.getHeapSnapshot();
      const writeStream = fs.createWriteStream(filepath);

      heapSnapshot.pipe(writeStream);

      logger.info('Heap dump created', { filepath });
      return filepath;
    } catch (error) {
      logger.error('Failed to create heap dump', { error });
      return null;
    }
  }

  private collectMemorySnapshot(): void {
    const memUsage = process.memoryUsage();

    const snapshot: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers,
    };

    this.snapshots.push(snapshot);

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }

    this.emit('memorySnapshot', snapshot);
  }

  private analyzeMemoryTrends(): void {
    const trend = this.calculateMemoryTrend();

    if (trend.isLeaking) {
      this.addAlert({
        type: 'potential_leak',
        severity: trend.confidence > 0.8 ? 'high' : 'medium',
        message: `Potential memory leak detected: ${(trend.averageGrowthRate / 1024 / 1024).toFixed(2)} MB/s growth`,
        timestamp: Date.now(),
        data: { trend },
      });
    }

    this.emit('memoryTrend', trend);
  }

  private checkForAlerts(): void {
    const current = this.getCurrentSnapshot();
    const heapLimit = this.getHeapLimit();
    const usageRatio = current.heapUsed / heapLimit;

    // High usage alert
    if (usageRatio > 0.95) {
      this.addAlert({
        type: 'high_usage',
        severity: 'critical',
        message: `Critical memory usage: ${(usageRatio * 100).toFixed(1)}%`,
        timestamp: Date.now(),
        data: { usageRatio, current },
      });
    } else if (usageRatio > 0.9) {
      this.addAlert({
        type: 'high_usage',
        severity: 'high',
        message: `High memory usage: ${(usageRatio * 100).toFixed(1)}%`,
        timestamp: Date.now(),
        data: { usageRatio, current },
      });
    }

    // Rapid growth alert
    if (this.snapshots.length >= 3) {
      const recent = this.snapshots.slice(-3);
      const growthRate =
        (recent[2]!.heapUsed - recent[0]!.heapUsed) /
        ((recent[2]!.timestamp - recent[0]!.timestamp) / 1000);

      if (growthRate > this.rapidGrowthThreshold / 30) {
        // 30 seconds
        this.addAlert({
          type: 'rapid_growth',
          severity: 'medium',
          message: `Rapid memory growth: ${(growthRate / 1024 / 1024).toFixed(2)} MB/s`,
          timestamp: Date.now(),
          data: { growthRate, recent },
        });
      }
    }

    // GC pressure alert
    if (this.gcStats.pressure === 'high') {
      this.addAlert({
        type: 'gc_pressure',
        severity: 'medium',
        message: `High GC pressure: ${this.gcStats.frequency.toFixed(1)} collections/min`,
        timestamp: Date.now(),
        data: { gcStats: this.gcStats },
      });
    }
  }

  private calculateMemoryTrend(): MemoryTrend {
    if (this.snapshots.length < 2) {
      return {
        timeWindow: 0,
        samples: this.snapshots.length,
        averageGrowthRate: 0,
        peakUsage: 0,
        currentUsage: 0,
        isLeaking: false,
        confidence: 0,
      };
    }

    const timeWindow =
      this.snapshots[this.snapshots.length - 1]!.timestamp -
      this.snapshots[0]!.timestamp;
    const samples = this.snapshots.length;

    // Calculate linear regression for growth rate
    const n = samples;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = this.snapshots[i]!.heapUsed;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const averageGrowthRate = slope * (1000 / (timeWindow / samples)); // bytes per second

    const peakUsage = Math.max(...this.snapshots.map(s => s.heapUsed));
    const currentUsage = this.snapshots[this.snapshots.length - 1]!.heapUsed;

    // Determine if leaking based on growth rate and consistency
    const isLeaking = averageGrowthRate > this.leakThreshold / 60; // per second threshold

    // Calculate confidence based on R-squared and sample size
    const meanY = sumY / n;
    let ssRes = 0,
      ssTot = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * i + (sumY - slope * sumX) / n;
      const actual = this.snapshots[i]!.heapUsed;
      ssRes += Math.pow(actual - predicted, 2);
      ssTot += Math.pow(actual - meanY, 2);
    }

    const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    const confidence = Math.min(rSquared * (samples / 10), 1); // Scale by sample size

    return {
      timeWindow,
      samples,
      averageGrowthRate,
      peakUsage,
      currentUsage,
      isLeaking,
      confidence,
    };
  }

  private getCurrentSnapshot(): MemorySnapshot {
    if (this.snapshots.length === 0) {
      this.collectMemorySnapshot();
    }
    return this.snapshots[this.snapshots.length - 1]!;
  }

  private getHeapLimit(): number {
    try {
      const v8 = require('v8');
      const heapStats = v8.getHeapStatistics();
      return heapStats.heap_size_limit;
    } catch {
      // Fallback to default Node.js heap limit
      return 1.4 * 1024 * 1024 * 1024; // ~1.4GB
    }
  }

  private setupGCMonitoring(): void {
    try {
      const v8 = require('v8');

      // Monitor GC events if available
      if (v8.getHeapStatistics) {
        this.gcMonitoringInterval = setInterval(() => {
          this.updateGCStats();
        }, 30000); // Check every 30 seconds
      }
    } catch (error) {
      logger.debug('GC monitoring not available', { error });
    }
  }

  private updateGCStats(): void {
    // This is a simplified GC monitoring
    // In production, you might want to use more sophisticated GC monitoring
    const now = Date.now();
    const timeSinceLastGC = now - this.lastGCTime;

    if (timeSinceLastGC > 0) {
      this.gcStats.frequency = 60000 / timeSinceLastGC; // per minute

      if (this.gcStats.frequency > 20) {
        this.gcStats.pressure = 'high';
      } else if (this.gcStats.frequency > 10) {
        this.gcStats.pressure = 'medium';
      } else {
        this.gcStats.pressure = 'low';
      }
    }

    this.lastGCTime = now;
  }

  private addAlert(alert: MemoryAlert): void {
    this.alerts.push(alert);

    // Keep only recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    this.emit('memoryAlert', alert);

    // Log critical alerts
    if (alert.severity === 'critical' || alert.severity === 'high') {
      logger.warn('Memory alert', alert);
    }
  }
}

// Global memory monitor instance
export const memoryMonitor = new MemoryMonitor();
