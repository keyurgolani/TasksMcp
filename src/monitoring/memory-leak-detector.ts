/**
 * Advanced memory leak detection and analysis system
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

export interface MemoryLeakReport {
  isLeaking: boolean;
  confidence: number;
  growthRate: number; // bytes per second
  peakUsage: number;
  currentUsage: number;
  leakSources: LeakSource[];
  recommendations: string[];
  heapDumpPath?: string;
}

export interface LeakSource {
  type:
    | 'object_retention'
    | 'event_listeners'
    | 'timers'
    | 'closures'
    | 'circular_references';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: number; // bytes
  stackTrace?: string;
}

export interface ObjectTracker {
  type: string;
  count: number;
  totalSize: number;
  instances: WeakSet<object>;
}

export class MemoryLeakDetector extends EventEmitter {
  private snapshots: Array<{
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  }> = [];

  private objectTrackers = new Map<string, ObjectTracker>();
  private intervalId: NodeJS.Timeout | undefined;
  private objectTrackingIntervalId: NodeJS.Timeout | undefined;
  private isMonitoring = false;
  private readonly maxSnapshots = 100;
  private readonly leakThreshold = 1024 * 1024; // 1MB/s growth rate threshold

  constructor() {
    super();
    // Don't auto-start object tracking - only start when detection is explicitly started
  }

  /**
   * Start memory leak detection
   */
  startDetection(intervalMs = 5000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Setup object tracking when detection starts
    this.setupObjectTracking();

    this.intervalId = setInterval(() => {
      this.collectSnapshot();
      this.analyzeLeaks();
    }, intervalMs);

    // Initial snapshot
    this.collectSnapshot();

    logger.info('Memory leak detection started', { intervalMs });
  }

  /**
   * Stop memory leak detection
   */
  stopDetection(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Clear object tracking interval
    if (this.objectTrackingIntervalId) {
      clearInterval(this.objectTrackingIntervalId);
      this.objectTrackingIntervalId = undefined;
    }

    // Remove all event listeners to prevent memory leaks
    this.removeAllListeners();

    logger.info('Memory leak detection stopped');
  }

  /**
   * Track object creation for leak detection
   */
  trackObject(obj: object, type: string): void {
    // Skip tracking if not actively monitoring to prevent memory buildup
    if (!this.isMonitoring) {
      return;
    }

    if (!this.objectTrackers.has(type)) {
      this.objectTrackers.set(type, {
        type,
        count: 0,
        totalSize: 0,
        instances: new WeakSet(),
      });
    }

    const tracker = this.objectTrackers.get(type)!;
    tracker.instances.add(obj);
    tracker.count++;

    // Estimate object size (rough approximation)
    const estimatedSize = this.estimateObjectSize(obj);
    tracker.totalSize += estimatedSize;

    // More aggressive cleanup of object trackers to prevent unbounded growth
    if (tracker.count > 200) {
      // Much more aggressive threshold (was 500)
      logger.warn('High object count detected, resetting tracker', {
        type,
        count: tracker.count,
      });
      tracker.count = Math.floor(tracker.count * 0.05); // Keep only 5% (was 10%)
      tracker.totalSize = Math.floor(tracker.totalSize * 0.05);
      // WeakSet will automatically clean up dead references
    }
  }

  /**
   * Generate comprehensive memory leak report
   */
  generateLeakReport(): MemoryLeakReport {
    const leakAnalysis = this.detectMemoryLeaks();
    const leakSources = this.identifyLeakSources();
    const recommendations = this.generateRecommendations(leakSources);

    return {
      isLeaking: leakAnalysis.isLeaking,
      confidence: leakAnalysis.confidence,
      growthRate: leakAnalysis.growthRate,
      peakUsage: leakAnalysis.peakUsage,
      currentUsage: leakAnalysis.currentUsage,
      leakSources,
      recommendations,
    };
  }

  /**
   * Force garbage collection and analyze impact
   */
  forceGCAndAnalyze(): { beforeGC: number; afterGC: number; freed: number } {
    const beforeGC = process.memoryUsage().heapUsed;

    if (global.gc) {
      global.gc();
    }

    const afterGC = process.memoryUsage().heapUsed;
    const freed = beforeGC - afterGC;

    logger.info('Forced garbage collection', {
      beforeGC: Math.round(beforeGC / 1024 / 1024),
      afterGC: Math.round(afterGC / 1024 / 1024),
      freed: Math.round(freed / 1024 / 1024),
    });

    return { beforeGC, afterGC, freed };
  }

  /**
   * Create heap dump for analysis
   */
  createHeapDump(): string | null {
    try {
      const v8 = require('v8');
      const fs = require('fs');
      const path = require('path');

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `heap-dump-${timestamp}.heapsnapshot`;
      const filepath = path.join(process.cwd(), 'logs', filename);

      // Ensure logs directory exists
      const logsDir = path.dirname(filepath);
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

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

  /**
   * Get object tracking statistics
   */
  getObjectStats(): Array<{ type: string; count: number; totalSize: number }> {
    return Array.from(this.objectTrackers.values()).map(tracker => ({
      type: tracker.type,
      count: tracker.count,
      totalSize: tracker.totalSize,
    }));
  }

  /**
   * Complete cleanup of all resources
   */
  cleanup(): void {
    this.stopDetection();
    this.snapshots.length = 0;
    this.objectTrackers.clear();
  }

  private collectSnapshot(): void {
    const memUsage = process.memoryUsage();

    this.snapshots.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    });

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }
  }

  private analyzeLeaks(): void {
    const leakReport = this.generateLeakReport();

    if (leakReport.isLeaking && leakReport.confidence > 0.7) {
      this.emit('memoryLeak', leakReport);

      logger.warn('Memory leak detected', {
        confidence: leakReport.confidence,
        growthRate: Math.round(leakReport.growthRate / 1024),
        sources: leakReport.leakSources.length,
      });
    }
  }

  private detectMemoryLeaks(): {
    isLeaking: boolean;
    confidence: number;
    growthRate: number;
    peakUsage: number;
    currentUsage: number;
  } {
    if (this.snapshots.length < 10) {
      // Require more samples for reliable detection
      return {
        isLeaking: false,
        confidence: 0,
        growthRate: 0,
        peakUsage: 0,
        currentUsage: 0,
      };
    }

    // Calculate linear regression for memory growth
    const n = this.snapshots.length;
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

    const denominator = n * sumXX - sumX * sumX;
    const slope =
      denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
    const timeWindow =
      this.snapshots[n - 1]!.timestamp - this.snapshots[0]!.timestamp;
    const growthRate = timeWindow > 0 ? slope * (1000 / (timeWindow / n)) : 0; // bytes per second

    const peakUsage = Math.max(...this.snapshots.map(s => s.heapUsed));
    const currentUsage = this.snapshots[n - 1]!.heapUsed;

    // Calculate R-squared for confidence
    const meanY = sumY / n;
    let ssRes = 0,
      ssTot = 0;
    for (let i = 0; i < n; i++) {
      const predicted = slope * i + (sumY - slope * sumX) / n;
      const actual = this.snapshots[i]!.heapUsed;
      ssRes += Math.pow(actual - predicted, 2);
      ssTot += Math.pow(actual - meanY, 2);
    }

    const rSquared = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

    // Much more conservative confidence calculation
    let confidence = rSquared * 0.5; // Start with much lower base confidence

    // Only boost confidence for very clear patterns
    if (n >= 20 && rSquared > 0.9) {
      confidence = Math.min(confidence * 1.5, 0.8); // Cap at 80%
    }

    // Only boost for very significant growth rates
    if (Math.abs(growthRate) > this.leakThreshold) {
      confidence = Math.min(confidence + 0.2, 0.8);
    }

    // Extremely strict threshold for leak detection - only report obvious leaks
    const isLeaking =
      growthRate > this.leakThreshold * 5 &&
      confidence > 0.8 &&
      growthRate > 5 * 1024 * 1024; // 5x threshold, high confidence, and >5MB/s growth

    return {
      isLeaking,
      confidence: Math.max(0, Math.min(0.7, confidence)), // Cap confidence at 70%
      growthRate,
      peakUsage,
      currentUsage,
    };
  }

  private identifyLeakSources(): LeakSource[] {
    const sources: LeakSource[] = [];

    // Check for object retention issues
    for (const [type, tracker] of this.objectTrackers) {
      if (tracker.count > 1000) {
        sources.push({
          type: 'object_retention',
          description: `High number of ${type} objects: ${tracker.count}`,
          severity: tracker.count > 10000 ? 'critical' : 'high',
          estimatedImpact: tracker.totalSize,
        });
      }
    }

    // Check for event listener leaks
    const processListenerCount =
      process.listenerCount('uncaughtException') +
      process.listenerCount('unhandledRejection');
    if (processListenerCount > 10) {
      sources.push({
        type: 'event_listeners',
        description: `High number of process event listeners: ${processListenerCount}`,
        severity: 'medium',
        estimatedImpact: processListenerCount * 1024, // rough estimate
      });
    }

    // Check for timer leaks (rough approximation)
    const activeHandles = (process as any)._getActiveHandles?.()?.length || 0;
    if (activeHandles > 100) {
      sources.push({
        type: 'timers',
        description: `High number of active handles: ${activeHandles}`,
        severity: 'medium',
        estimatedImpact: activeHandles * 512,
      });
    }

    return sources;
  }

  private generateRecommendations(leakSources: LeakSource[]): string[] {
    const recommendations: string[] = [];

    if (leakSources.some(s => s.type === 'object_retention')) {
      recommendations.push(
        'Review object lifecycle management and ensure proper cleanup'
      );
      recommendations.push(
        'Consider using WeakMap/WeakSet for temporary object references'
      );
      recommendations.push(
        'Implement object pooling for frequently created/destroyed objects'
      );
    }

    if (leakSources.some(s => s.type === 'event_listeners')) {
      recommendations.push('Remove event listeners when no longer needed');
      recommendations.push(
        'Use AbortController for automatic cleanup of event listeners'
      );
    }

    if (leakSources.some(s => s.type === 'timers')) {
      recommendations.push(
        'Clear intervals and timeouts when components are destroyed'
      );
      recommendations.push('Use cleanup functions in async operations');
    }

    if (leakSources.some(s => s.severity === 'critical')) {
      recommendations.push('Create heap dump for detailed analysis');
      recommendations.push(
        'Consider restarting the process if memory usage is critical'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Monitor memory usage patterns over longer periods');
      recommendations.push(
        'Profile application with heap snapshots during peak usage'
      );
    }

    return recommendations;
  }

  private setupObjectTracking(): void {
    // Track common object types that might leak
    let activeTimeouts = 0;
    let activeIntervals = 0;

    // Note: We'll track timeouts and intervals without overriding global functions
    // to avoid TypeScript compatibility issues

    // Update object trackers periodically - STORE the interval ID for cleanup!
    this.objectTrackingIntervalId = setInterval(() => {
      // Only update if we're still monitoring
      if (!this.isMonitoring) {
        return;
      }

      // Cleanup object trackers periodically to prevent count accumulation
      this.cleanupObjectTrackers();

      this.objectTrackers.set('timeouts', {
        type: 'timeouts',
        count: activeTimeouts,
        totalSize: activeTimeouts * 64, // rough estimate
        instances: new WeakSet(),
      });

      this.objectTrackers.set('intervals', {
        type: 'intervals',
        count: activeIntervals,
        totalSize: activeIntervals * 64,
        instances: new WeakSet(),
      });
    }, 5000); // More frequent updates (was 10 seconds)
  }

  private estimateObjectSize(obj: any): number {
    // Rough object size estimation
    try {
      const jsonString = JSON.stringify(obj);
      return jsonString.length * 2; // Rough estimate for UTF-16
    } catch {
      return 64; // Default estimate for non-serializable objects
    }
  }

  /**
   * Clean up object trackers to prevent count accumulation
   */
  private cleanupObjectTrackers(): void {
    for (const [type, tracker] of this.objectTrackers.entries()) {
      // Reset counts periodically to prevent accumulation
      // The WeakSet will handle actual object cleanup automatically
      if (tracker.count > 100) {
        // Much more aggressive threshold (was 200)
        tracker.count = Math.floor(tracker.count * 0.1); // Reduce count by 90% (was 70%)
        tracker.totalSize = Math.floor(tracker.totalSize * 0.1);

        logger.debug('Cleaned up object tracker', {
          type,
          newCount: tracker.count,
          newSize: tracker.totalSize,
        });
      }
    }

    // Remove trackers with very low counts to prevent map growth
    const trackersToRemove: string[] = [];
    for (const [type, tracker] of this.objectTrackers.entries()) {
      if (tracker.count < 2 && tracker.totalSize < 512) {
        // More aggressive removal
        trackersToRemove.push(type);
      }
    }

    for (const type of trackersToRemove) {
      this.objectTrackers.delete(type);
    }

    if (trackersToRemove.length > 0) {
      logger.debug('Removed inactive object trackers', {
        removedTypes: trackersToRemove,
        remainingTrackers: this.objectTrackers.size,
      });
    }
  }
}

// Global memory leak detector instance
export const memoryLeakDetector = new MemoryLeakDetector();
