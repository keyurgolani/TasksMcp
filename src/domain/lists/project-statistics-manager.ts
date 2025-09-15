/**
 * High-performance caching system for project statistics
 */

import { logger } from '../../shared/utils/logger.js';
import { performanceMonitor } from '../../infrastructure/monitoring/performance-monitor.js';
import type { ProjectSummary, ProjectStats } from './project-manager.js';
import type { TodoList } from '../../shared/types/todo.js';

export interface ProjectCacheEntry {
  data: ProjectSummary[] | ProjectStats;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  dependencies: Set<string>; // List IDs that affect this cache entry
}

export interface ProjectCacheConfig {
  maxEntries: number;
  ttlMs: number;
  cleanupIntervalMs: number;
  enableInvalidationTracking: boolean;
}

export interface ProjectCacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  invalidationCount: number;
  memoryUsage: number;
}

export class ProjectStatisticsCache {
  private readonly summaryCache = new Map<string, ProjectCacheEntry>();
  private readonly statsCache = new Map<string, ProjectCacheEntry>();
  private readonly listToProjectsMap = new Map<string, Set<string>>(); // listId -> projectTags
  
  private readonly config: ProjectCacheConfig;
  private cleanupInterval: NodeJS.Timeout | undefined;
  
  // Performance metrics
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private invalidations = 0;

  constructor(config: Partial<ProjectCacheConfig> = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 200,
      ttlMs: config.ttlMs ?? 5 * 60 * 1000, // 5 minutes
      cleanupIntervalMs: config.cleanupIntervalMs ?? 60 * 1000, // 1 minute
      enableInvalidationTracking: config.enableInvalidationTracking ?? true,
    };

    this.startCleanupInterval();
    logger.debug('ProjectStatisticsCache initialized', this.config);
  }

  /**
   * Get cached project summaries
   */
  getProjectSummaries(cacheKey: string): ProjectSummary[] | null {
    const entry = this.summaryCache.get(cacheKey);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.summaryCache.delete(cacheKey);
      this.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hits++;

    logger.debug('Project summaries cache hit', { cacheKey });
    return entry.data as ProjectSummary[];
  }

  async getProjectSummariesAsync(cacheKey: string): Promise<ProjectSummary[] | null> {
    return performanceMonitor.timeOperation(
      'project_cache_get_summaries',
      async () => {
        const entry = this.summaryCache.get(cacheKey);
        
        if (!entry) {
          this.misses++;
          return null;
        }

        if (this.isExpired(entry)) {
          this.summaryCache.delete(cacheKey);
          this.misses++;
          return null;
        }

        // Update access statistics
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        this.hits++;

        logger.debug('Project summaries cache hit', { cacheKey });
        return entry.data as ProjectSummary[];
      },
      { cacheKey }
    );
  }

  /**
   * Cache project summaries
   */
  setProjectSummaries(
    cacheKey: string,
    summaries: ProjectSummary[],
    dependencies: string[] = []
  ): void {
    performanceMonitor.timeOperation(
      'project_cache_set_summaries',
      async () => {
        const entry: ProjectCacheEntry = {
          data: summaries,
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          accessCount: 1,
          dependencies: new Set(dependencies),
        };

        // Track dependencies for invalidation
        if (this.config.enableInvalidationTracking) {
          this.updateDependencyTracking(dependencies, cacheKey);
        }

        this.evictIfNecessary();
        this.summaryCache.set(cacheKey, entry);

        logger.debug('Project summaries cached', {
          cacheKey,
          summaryCount: summaries.length,
          dependencies: dependencies.length,
        });
      },
      { cacheKey, summaryCount: summaries.length }
    );
  }

  /**
   * Get cached project statistics
   */
  getProjectStats(projectTag: string): ProjectStats | null {
    const entry = this.statsCache.get(projectTag);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.statsCache.delete(projectTag);
      this.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hits++;

    logger.debug('Project stats cache hit', { projectTag });
    return entry.data as ProjectStats;
  }

  async getProjectStatsAsync(projectTag: string): Promise<ProjectStats | null> {
    return performanceMonitor.timeOperation(
      'project_cache_get_stats',
      async () => {
        const entry = this.statsCache.get(projectTag);
        
        if (!entry) {
          this.misses++;
          return null;
        }

        if (this.isExpired(entry)) {
          this.statsCache.delete(projectTag);
          this.misses++;
          return null;
        }

        entry.accessCount++;
        entry.lastAccessed = Date.now();
        this.hits++;

        logger.debug('Project stats cache hit', { projectTag });
        return entry.data as ProjectStats;
      },
      { projectTag }
    );
  }

  /**
   * Cache project statistics
   */
  setProjectStats(
    projectTag: string,
    stats: ProjectStats,
    dependencies: string[] = []
  ): void {
    performanceMonitor.timeOperation(
      'project_cache_set_stats',
      async () => {
        const entry: ProjectCacheEntry = {
          data: stats,
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          accessCount: 1,
          dependencies: new Set(dependencies),
        };

        if (this.config.enableInvalidationTracking) {
          this.updateDependencyTracking(dependencies, `stats:${projectTag}`);
        }

        this.evictIfNecessary();
        this.statsCache.set(projectTag, entry);

        logger.debug('Project stats cached', {
          projectTag,
          totalLists: stats.totalLists,
          dependencies: dependencies.length,
        });
      },
      { projectTag }
    );
  }

  /**
   * Invalidate cache entries when a todo list changes
   */
  invalidateForList(listId: string, projectTag?: string): void {
    performanceMonitor.timeOperation(
      'project_cache_invalidate_list',
      async () => {
        let invalidatedCount = 0;

        // Get all project tags affected by this list
        const affectedProjects = this.listToProjectsMap.get(listId) || new Set();
        if (projectTag) {
          affectedProjects.add(projectTag);
        }

        // Invalidate summary caches
        for (const [cacheKey, entry] of this.summaryCache) {
          if (entry.dependencies.has(listId)) {
            this.summaryCache.delete(cacheKey);
            invalidatedCount++;
          }
        }

        // Invalidate stats caches for affected projects
        for (const tag of affectedProjects) {
          if (this.statsCache.has(tag)) {
            this.statsCache.delete(tag);
            invalidatedCount++;
          }
        }

        // Update dependency tracking
        if (projectTag) {
          this.updateListProjectMapping(listId, projectTag);
        }

        this.invalidations += invalidatedCount;

        if (invalidatedCount > 0) {
          logger.debug('Project cache invalidated for list', {
            listId,
            projectTag,
            invalidatedCount,
            affectedProjects: Array.from(affectedProjects),
          });
        }
      },
      { listId, projectTag }
    );
  }

  /**
   * Invalidate all cache entries for a specific project
   */
  invalidateForProject(projectTag: string): void {
    performanceMonitor.timeOperation(
      'project_cache_invalidate_project',
      async () => {
        let invalidatedCount = 0;

        // Invalidate project stats
        if (this.statsCache.has(projectTag)) {
          this.statsCache.delete(projectTag);
          invalidatedCount++;
        }

        // Invalidate summary caches that might include this project
        for (const [cacheKey] of this.summaryCache) {
          this.summaryCache.delete(cacheKey);
          invalidatedCount++;
        }

        this.invalidations += invalidatedCount;

        logger.debug('Project cache invalidated for project', {
          projectTag,
          invalidatedCount,
        });
      },
      { projectTag }
    );
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    const totalEntries = this.summaryCache.size + this.statsCache.size;
    
    this.summaryCache.clear();
    this.statsCache.clear();
    this.listToProjectsMap.clear();
    
    this.invalidations += totalEntries;

    logger.debug('All project cache entries invalidated', { totalEntries });
  }

  /**
   * Preload cache with frequently accessed data
   */
  async preloadCache(
    lists: TodoList[],
    getProjectSummaries: () => Promise<ProjectSummary[]>,
    getProjectStats: (tag: string) => Promise<ProjectStats>
  ): Promise<void> {
    return performanceMonitor.timeOperation(
      'project_cache_preload',
      async () => {
        logger.debug('Starting project cache preload', { listCount: lists.length });

        // Extract unique project tags
        const projectTags = new Set<string>();
        const listDependencies: string[] = [];

        for (const list of lists) {
          const projectTag = list.projectTag || list.context || 'default';
          projectTags.add(projectTag);
          listDependencies.push(list.id);
          
          // Update dependency tracking
          this.updateListProjectMapping(list.id, projectTag);
        }

        // Preload project summaries
        try {
          const summaries = await getProjectSummaries();
          const summaryKey = this.generateSummaryKey({ includeAll: true });
          this.setProjectSummaries(summaryKey, summaries, listDependencies);
        } catch (error) {
          logger.warn('Failed to preload project summaries', { error });
        }

        // Preload individual project stats
        const preloadPromises = Array.from(projectTags).map(async (tag) => {
          try {
            const stats = await getProjectStats(tag);
            const tagDependencies = lists
              .filter(l => (l.projectTag || l.context || 'default') === tag)
              .map(l => l.id);
            this.setProjectStats(tag, stats, tagDependencies);
          } catch (error) {
            logger.warn('Failed to preload project stats', { projectTag: tag, error });
          }
        });

        await Promise.allSettled(preloadPromises);

        logger.info('Project cache preload completed', {
          projectCount: projectTags.size,
          listCount: lists.length,
          cacheEntries: this.summaryCache.size + this.statsCache.size,
        });
      },
      { listCount: lists.length, projectCount: new Set(lists.map(l => l.projectTag || l.context || 'default')).size }
    );
  }

  /**
   * Get cache statistics
   */
  getStats(): ProjectCacheStats {
    const totalEntries = this.summaryCache.size + this.statsCache.size;
    const totalRequests = this.hits + this.misses;
    
    // Estimate memory usage
    let memoryUsage = 0;
    for (const entry of this.summaryCache.values()) {
      memoryUsage += this.estimateEntrySize(entry);
    }
    for (const entry of this.statsCache.values()) {
      memoryUsage += this.estimateEntrySize(entry);
    }

    return {
      totalEntries,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.misses / totalRequests : 0,
      evictionCount: this.evictions,
      invalidationCount: this.invalidations,
      memoryUsage,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.invalidations = 0;
    logger.debug('Project cache statistics reset');
  }

  /**
   * Generate cache key for project summaries
   */
  generateSummaryKey(options: {
    includeArchived?: boolean;
    projectFilter?: string;
    includeAll?: boolean;
  }): string {
    const parts = [
      'summaries',
      options.includeArchived ? 'archived' : 'active',
      options.projectFilter || 'all',
      options.includeAll ? 'full' : 'filtered',
    ];

    return parts.join(':');
  }

  /**
   * Shutdown cache
   */
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.invalidateAll();
    logger.info('ProjectStatisticsCache shutdown completed');
  }

  // Private methods

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupIntervalMs);
  }

  private performCleanup(): void {
    const beforeEntries = this.summaryCache.size + this.statsCache.size;
    
    // Clean expired entries
    this.cleanExpiredEntries();
    
    const afterEntries = this.summaryCache.size + this.statsCache.size;
    
    if (beforeEntries !== afterEntries) {
      logger.debug('Project cache cleanup completed', {
        entriesRemoved: beforeEntries - afterEntries,
        totalEntries: afterEntries,
      });
    }
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();

    // Clean summary cache
    for (const [key, entry] of this.summaryCache) {
      if (this.isExpired(entry, now)) {
        this.summaryCache.delete(key);
        this.evictions++;
      }
    }

    // Clean stats cache
    for (const [key, entry] of this.statsCache) {
      if (this.isExpired(entry, now)) {
        this.statsCache.delete(key);
        this.evictions++;
      }
    }
  }

  private evictIfNecessary(): void {
    const totalEntries = this.summaryCache.size + this.statsCache.size;
    
    if (totalEntries >= this.config.maxEntries) {
      this.evictLRUEntries();
    }
  }

  private evictLRUEntries(): void {
    const allEntries: Array<{
      key: string;
      entry: ProjectCacheEntry;
      cache: 'summary' | 'stats';
    }> = [];

    for (const [key, entry] of this.summaryCache) {
      allEntries.push({ key, entry, cache: 'summary' });
    }
    for (const [key, entry] of this.statsCache) {
      allEntries.push({ key, entry, cache: 'stats' });
    }

    // Sort by access frequency and recency (LRU with frequency consideration)
    allEntries.sort((a, b) => {
      const scoreA = a.entry.accessCount / Math.max(1, (Date.now() - a.entry.lastAccessed) / 1000);
      const scoreB = b.entry.accessCount / Math.max(1, (Date.now() - b.entry.lastAccessed) / 1000);
      return scoreA - scoreB; // Lower score = more likely to evict
    });

    // Evict 25% of entries
    const evictCount = Math.ceil(allEntries.length * 0.25);
    
    for (let i = 0; i < evictCount && i < allEntries.length; i++) {
      const { key, cache } = allEntries[i]!;
      
      switch (cache) {
        case 'summary':
          this.summaryCache.delete(key);
          break;
        case 'stats':
          this.statsCache.delete(key);
          break;
      }
      
      this.evictions++;
    }

    logger.debug('Project cache LRU eviction completed', { evictCount });
  }

  private updateDependencyTracking(dependencies: string[], _cacheKey: string): void {
    for (const listId of dependencies) {
      if (!this.listToProjectsMap.has(listId)) {
        this.listToProjectsMap.set(listId, new Set());
      }
      // The cacheKey might contain project info, but we'll track it separately
    }
  }

  private updateListProjectMapping(listId: string, projectTag: string): void {
    if (!this.listToProjectsMap.has(listId)) {
      this.listToProjectsMap.set(listId, new Set());
    }
    this.listToProjectsMap.get(listId)!.add(projectTag);
  }

  private isExpired(entry: ProjectCacheEntry, now: number = Date.now()): boolean {
    return now - entry.timestamp > this.config.ttlMs;
  }

  private estimateEntrySize(entry: ProjectCacheEntry): number {
    // Simple size estimation
    const jsonString = JSON.stringify(entry.data);
    return jsonString.length * 2 + 100; // Rough estimate including metadata
  }
}

// Global project statistics cache instance
let _projectStatsCache: ProjectStatisticsCache | undefined;

export const projectStatsCache = {
  get instance(): ProjectStatisticsCache {
    if (!_projectStatsCache) {
      _projectStatsCache = new ProjectStatisticsCache();
    }
    return _projectStatsCache;
  },

  getProjectSummaries(cacheKey: string): ProjectSummary[] | null {
    return this.instance.getProjectSummaries(cacheKey);
  },

  setProjectSummaries(cacheKey: string, summaries: ProjectSummary[], dependencies: string[] = []): void {
    this.instance.setProjectSummaries(cacheKey, summaries, dependencies);
  },

  getProjectStats(projectTag: string): ProjectStats | null {
    return this.instance.getProjectStats(projectTag);
  },

  setProjectStats(projectTag: string, stats: ProjectStats, dependencies: string[] = []): void {
    this.instance.setProjectStats(projectTag, stats, dependencies);
  },

  invalidateForList(listId: string, projectTag?: string): void {
    this.instance.invalidateForList(listId, projectTag);
  },

  invalidateForProject(projectTag: string): void {
    this.instance.invalidateForProject(projectTag);
  },

  invalidateAll(): void {
    this.instance.invalidateAll();
  },

  async preloadCache(
    lists: TodoList[],
    getProjectSummaries: () => Promise<ProjectSummary[]>,
    getProjectStats: (tag: string) => Promise<ProjectStats>
  ): Promise<void> {
    return this.instance.preloadCache(lists, getProjectSummaries, getProjectStats);
  },

  getStats(): ProjectCacheStats {
    return this.instance.getStats();
  },

  resetStats(): void {
    this.instance.resetStats();
  },

  generateSummaryKey(options: {
    includeArchived?: boolean;
    projectFilter?: string;
    includeAll?: boolean;
  }): string {
    return this.instance.generateSummaryKey(options);
  },

  shutdown(): void {
    if (_projectStatsCache) {
      _projectStatsCache.shutdown();
      _projectStatsCache = undefined;
    }
  },
};