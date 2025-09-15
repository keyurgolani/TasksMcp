/**
 * Memory profiler for tracking memory usage patterns
 */

import { EventEmitter } from 'events';
import { logger } from '../../shared/utils/logger.js';

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

export interface MemoryProfile {
  id: string;
  startTime: number;
  endTime?: number;
  snapshots: MemorySnapshot[];
  duration?: number;
  peakMemory: number;
  averageMemory: number;
}

export class MemoryProfiler extends EventEmitter {
  private profiles = new Map<string, MemoryProfile>();
  private activeProfiles = new Set<string>();

  /**
   * Start profiling memory usage
   */
  startProfiling(profileId: string): void {
    if (this.activeProfiles.has(profileId)) {
      logger.warn('Profile already active', { profileId });
      return;
    }

    const profile: MemoryProfile = {
      id: profileId,
      startTime: Date.now(),
      snapshots: [this.takeSnapshot()],
      peakMemory: 0,
      averageMemory: 0,
    };

    this.profiles.set(profileId, profile);
    this.activeProfiles.add(profileId);

    logger.debug('Started memory profiling', { profileId });
  }

  /**
   * Stop profiling and return results
   */
  stopProfiling(profileId: string): MemoryProfile | null {
    if (!this.activeProfiles.has(profileId)) {
      logger.warn('Profile not active', { profileId });
      return null;
    }

    const profile = this.profiles.get(profileId);
    if (!profile) {
      return null;
    }

    profile.endTime = Date.now();
    profile.duration = profile.endTime - profile.startTime;
    profile.snapshots.push(this.takeSnapshot());

    // Calculate statistics
    const memoryValues = profile.snapshots.map(s => s.heapUsed);
    profile.peakMemory = Math.max(...memoryValues);
    profile.averageMemory = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;

    this.activeProfiles.delete(profileId);

    logger.debug('Stopped memory profiling', {
      profileId,
      duration: profile.duration,
      peakMemory: profile.peakMemory,
      averageMemory: profile.averageMemory,
    });

    return profile;
  }

  /**
   * Take a memory snapshot for active profiles
   */
  takeSnapshotForActiveProfiles(): void {
    const snapshot = this.takeSnapshot();
    
    for (const profileId of this.activeProfiles) {
      const profile = this.profiles.get(profileId);
      if (profile) {
        profile.snapshots.push(snapshot);
      }
    }
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage(): MemorySnapshot {
    return this.takeSnapshot();
  }

  /**
   * Get profile by ID
   */
  getProfile(profileId: string): MemoryProfile | null {
    return this.profiles.get(profileId) || null;
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): MemoryProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Clear old profiles
   */
  clearProfiles(olderThanMs?: number): void {
    const cutoff = olderThanMs ? Date.now() - olderThanMs : 0;
    
    for (const [profileId, profile] of this.profiles.entries()) {
      if (profile.endTime && profile.endTime < cutoff) {
        this.profiles.delete(profileId);
      }
    }
  }

  /**
   * Take a memory snapshot
   */
  private takeSnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    
    return {
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    };
  }
}

// Export singleton instance
export const memoryProfiler = new MemoryProfiler();