/**
 * Memory profiling utilities for debugging memory leaks
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';
import { MemoryUtils } from './memory-cleanup.js';

export interface MemoryProfile {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  stackTrace?: string;
  context?: string;
}

export interface MemoryDiff {
  heapUsedDiff: number;
  heapTotalDiff: number;
  externalDiff: number;
  rssDiff: number;
  arrayBuffersDiff: number;
  timeDiff: number;
}

export class MemoryProfiler {
  private profiles: MemoryProfile[] = [];
  private readonly maxProfiles = 1000;
  private profilingInterval?: NodeJS.Timeout;
  private isActive = false;

  /**
   * Start memory profiling
   */
  startProfiling(intervalMs = 1000, context?: string): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.profiles = [];

    // Take initial profile
    this.takeProfile(context);

    // Start periodic profiling
    this.profilingInterval = setInterval(() => {
      this.takeProfile(context);
    }, intervalMs);

    logger.info('Memory profiling started', { intervalMs, context });
  }

  /**
   * Stop memory profiling
   */
  stopProfiling(): MemoryProfile[] {
    if (!this.isActive) {
      return [];
    }

    this.isActive = false;

    if (this.profilingInterval) {
      clearInterval(this.profilingInterval);
      this.profilingInterval = undefined as any;
    }

    logger.info('Memory profiling stopped', {
      profileCount: this.profiles.length,
    });
    return [...this.profiles];
  }

  /**
   * Take a memory profile snapshot
   */
  takeProfile(context?: string): MemoryProfile {
    const memUsage = process.memoryUsage();

    const profile: MemoryProfile = {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers,
      ...(context && { context }),
    };

    // Add stack trace for debugging (only in development)
    if (process.env['NODE_ENV'] === 'development') {
      const stack = new Error().stack;
      if (stack) {
        profile.stackTrace = stack.split('\n').slice(2, 5).join('\n');
      }
    }

    this.profiles.push(profile);

    // Keep only recent profiles
    if (this.profiles.length > this.maxProfiles) {
      this.profiles = this.profiles.slice(-this.maxProfiles);
    }

    return profile;
  }

  /**
   * Compare two memory profiles
   */
  compareProfiles(before: MemoryProfile, after: MemoryProfile): MemoryDiff {
    return {
      heapUsedDiff: after.heapUsed - before.heapUsed,
      heapTotalDiff: after.heapTotal - before.heapTotal,
      externalDiff: after.external - before.external,
      rssDiff: after.rss - before.rss,
      arrayBuffersDiff: after.arrayBuffers - before.arrayBuffers,
      timeDiff: after.timestamp - before.timestamp,
    };
  }

  /**
   * Analyze memory growth patterns
   */
  analyzeGrowthPattern(): {
    averageGrowthRate: number;
    peakUsage: number;
    currentUsage: number;
    isLeaking: boolean;
    confidence: number;
  } {
    if (this.profiles.length < 2) {
      return {
        averageGrowthRate: 0,
        peakUsage: 0,
        currentUsage: 0,
        isLeaking: false,
        confidence: 0,
      };
    }

    const first = this.profiles[0]!;
    const last = this.profiles[this.profiles.length - 1]!;
    const timeDiff = (last.timestamp - first.timestamp) / 1000; // seconds
    const heapDiff = last.heapUsed - first.heapUsed;

    const averageGrowthRate = timeDiff > 0 ? heapDiff / timeDiff : 0;
    const peakUsage = Math.max(...this.profiles.map(p => p.heapUsed));
    const currentUsage = last.heapUsed;

    // Simple leak detection based on consistent growth
    const isLeaking = averageGrowthRate > 1024 * 1024; // 1MB/s threshold
    const confidence = Math.min(this.profiles.length / 100, 1); // More samples = higher confidence

    return {
      averageGrowthRate,
      peakUsage,
      currentUsage,
      isLeaking,
      confidence,
    };
  }

  /**
   * Export profiles to JSON file
   */
  async exportProfiles(filename?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath =
      filename ||
      join(process.cwd(), 'logs', `memory-profile-${timestamp}.json`);

    // Ensure logs directory exists
    const logsDir = join(process.cwd(), 'logs');
    try {
      await fs.mkdir(logsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    const exportData = {
      metadata: {
        exportTime: new Date().toISOString(),
        profileCount: this.profiles.length,
        duration:
          this.profiles.length > 0
            ? this.profiles[this.profiles.length - 1]!.timestamp -
              this.profiles[0]!.timestamp
            : 0,
        analysis: this.analyzeGrowthPattern(),
      },
      profiles: this.profiles,
    };

    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));
    logger.info('Memory profiles exported', {
      filepath,
      profileCount: this.profiles.length,
    });

    return filepath;
  }

  /**
   * Create heap dump with profiling context
   */
  async createHeapDump(context?: string): Promise<string | null> {
    try {
      const v8 = require('v8');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const contextSuffix = context ? `-${context}` : '';
      const filename = `heap-dump-${timestamp}${contextSuffix}.heapsnapshot`;
      const filepath = join(process.cwd(), 'logs', filename);

      // Ensure logs directory exists
      const logsDir = join(process.cwd(), 'logs');
      try {
        await fs.mkdir(logsDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      // Force garbage collection before heap dump for cleaner snapshot
      if (global.gc) {
        global.gc();
        // Wait a bit for GC to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const heapSnapshot = v8.getHeapSnapshot();
      const writeStream = await fs.open(filepath, 'w');

      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let totalSize = 0;
        const maxSize = 100 * 1024 * 1024; // 100MB limit

        heapSnapshot.on('data', (chunk: Buffer) => {
          totalSize += chunk.length;
          if (totalSize > maxSize) {
            logger.warn('Heap dump size limit exceeded, truncating', {
              filepath,
              size: totalSize,
            });
            heapSnapshot.destroy();
            return;
          }
          chunks.push(chunk);
        });

        heapSnapshot.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            await writeStream.writeFile(buffer);
            await writeStream.close();

            logger.info('Heap dump created', {
              filepath,
              context,
              size: totalSize,
              sizeMB: (totalSize / 1024 / 1024).toFixed(2),
            });
            resolve(filepath);
          } catch (error) {
            await writeStream.close().catch(() => {});
            reject(error);
          }
        });

        heapSnapshot.on('error', async (error: Error) => {
          await writeStream.close().catch(() => {});
          reject(error);
        });
      });
    } catch (error) {
      logger.error('Failed to create heap dump', { error, context });
      return null;
    }
  }

  /**
   * Get current memory statistics
   */
  getCurrentStats(): {
    current: MemoryProfile;
    growth: ReturnType<MemoryProfiler['analyzeGrowthPattern']>;
    pressure: boolean;
    criticalPressure: boolean;
  } {
    const current = this.takeProfile('stats-check');
    const growth = this.analyzeGrowthPattern();

    return {
      current,
      growth,
      pressure: MemoryUtils.isMemoryPressure(),
      criticalPressure: MemoryUtils.isCriticalMemoryPressure(),
    };
  }

  /**
   * Clear all profiles
   */
  clearProfiles(): void {
    this.profiles = [];
    logger.debug('Memory profiles cleared');
  }

  /**
   * Get profiles within a time range
   */
  getProfilesInRange(startTime: number, endTime: number): MemoryProfile[] {
    return this.profiles.filter(
      profile => profile.timestamp >= startTime && profile.timestamp <= endTime
    );
  }

  /**
   * Cleanup profiler resources
   */
  cleanup(): void {
    this.stopProfiling();
    this.clearProfiles();
    logger.debug('Memory profiler cleaned up');
  }

  /**
   * Analyze memory leaks based on current profiles
   */
  analyzeMemoryLeaks(): {
    isLeaking: boolean;
    confidence: number;
    growthRate: number;
    recommendations: string[];
  } {
    const growth = this.analyzeGrowthPattern();

    const recommendations: string[] = [];

    if (growth.isLeaking) {
      recommendations.push(
        'Memory leak detected - investigate object retention'
      );
      recommendations.push(
        'Check for unclosed resources (files, connections, timers)'
      );
      recommendations.push(
        'Review event listeners and callbacks for proper cleanup'
      );
    }

    if (growth.peakUsage > 100 * 1024 * 1024) {
      // 100MB
      recommendations.push(
        'High memory usage detected - consider optimization'
      );
    }

    if (growth.averageGrowthRate > 512 * 1024) {
      // 512KB/s
      recommendations.push(
        'Rapid memory growth - check for memory-intensive operations'
      );
    }

    return {
      isLeaking: growth.isLeaking,
      confidence: growth.confidence,
      growthRate: growth.averageGrowthRate,
      recommendations,
    };
  }
}

// Global memory profiler instance
export const memoryProfiler = new MemoryProfiler();
