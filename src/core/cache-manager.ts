/**
 * High-performance caching layer for todo list operations
 */

import { logger } from '../utils/logger.js';
import { memoryCleanupManager, MemoryUtils } from '../utils/memory-cleanup.js';
import { memoryLeakPrevention } from '../utils/memory-leak-prevention.js';
import type { TodoList, TodoListSummary } from '../types/todo.js';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated memory size in bytes
}

export interface CacheStats {
  totalEntries: number;
  totalMemoryUsage: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
}

export interface CacheConfig {
  maxEntries: number;
  maxMemoryMB: number;
  ttlMs: number;
  cleanupIntervalMs: number;
}

export class CacheManager {
  private readonly todoListCache = new Map<string, CacheEntry<TodoList>>();
  private readonly summaryCache = new Map<
    string,
    CacheEntry<TodoListSummary[]>
  >();
  private readonly searchCache = new Map<string, CacheEntry<unknown>>();

  private readonly config: CacheConfig;
  private cleanupInterval: NodeJS.Timeout | undefined;
  private isShuttingDown = false;
  private initialized = false;

  // Performance metrics
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxEntries: config.maxEntries ?? 1000,
      maxMemoryMB: config.maxMemoryMB ?? 50,
      ttlMs: config.ttlMs ?? 5 * 60 * 1000, // 5 minutes
      cleanupIntervalMs: config.cleanupIntervalMs ?? 30 * 1000, // 30 seconds
    };

    this.initialize();
  }

  /**
   * Initialize the cache manager
   */
  private initialize(): void {
    if (this.initialized) {
      return;
    }

    this.setupMemoryManagement();
    this.initialized = true;

    logger.debug('CacheManager initialized', {
      maxEntries: this.config.maxEntries,
      maxMemoryMB: this.config.maxMemoryMB,
      ttlMs: this.config.ttlMs,
    });
  }

  /**
   * Get todo list from cache
   */
  getTodoList(listId: string): TodoList | null {
    if (!this.initialized) {
      this.initialize();
    }

    const entry = this.todoListCache.get(listId);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if entry is expired
    if (this.isExpired(entry)) {
      this.todoListCache.delete(listId);
      this.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hits++;

    logger.debug('Cache hit for todo list', { listId });
    return entry.data;
  }

  /**
   * Cache todo list
   */
  setTodoList(listId: string, todoList: TodoList): void {
    if (!this.initialized) {
      this.initialize();
    }

    const size = this.estimateSize(todoList);
    const entry: CacheEntry<TodoList> = {
      data: todoList,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
    };

    // Check if we need to evict entries
    this.evictIfNecessary(size);

    this.todoListCache.set(listId, entry);

    logger.debug('Cached todo list', {
      listId,
      size: `${(size / 1024).toFixed(1)}KB`,
      totalEntries: this.todoListCache.size,
    });
  }

  /**
   * Get summary list from cache
   */
  getSummaryList(cacheKey: string): TodoListSummary[] | null {
    if (!this.initialized) {
      this.initialize();
    }

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

    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hits++;

    logger.debug('Cache hit for summary list', { cacheKey });
    return entry.data;
  }

  /**
   * Cache summary list
   */
  setSummaryList(cacheKey: string, summaries: TodoListSummary[]): void {
    if (!this.initialized) {
      this.initialize();
    }

    const size = this.estimateSize(summaries);
    const entry: CacheEntry<TodoListSummary[]> = {
      data: summaries,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
    };

    this.evictIfNecessary(size);
    this.summaryCache.set(cacheKey, entry);

    logger.debug('Cached summary list', {
      cacheKey,
      count: summaries.length,
      size: `${(size / 1024).toFixed(1)}KB`,
    });
  }

  /**
   * Get search results from cache
   */
  getSearchResults(searchKey: string): unknown {
    const entry = this.searchCache.get(searchKey);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.searchCache.delete(searchKey);
      this.misses++;
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hits++;

    logger.debug('Cache hit for search results', { searchKey });
    return entry.data;
  }

  /**
   * Cache search results
   */
  setSearchResults(searchKey: string, results: unknown): void {
    const size = this.estimateSize(results);
    const entry: CacheEntry<unknown> = {
      data: results,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
    };

    this.evictIfNecessary(size);
    this.searchCache.set(searchKey, entry);

    logger.debug('Cached search results', {
      searchKey,
      size: `${(size / 1024).toFixed(1)}KB`,
    });
  }

  /**
   * Invalidate cache entries for a specific list
   */
  invalidateTodoList(listId: string): void {
    this.todoListCache.delete(listId);

    // Invalidate related summary caches
    const summaryKeysToDelete: string[] = [];
    for (const [key] of this.summaryCache) {
      // Invalidate all summary caches as they might contain this list
      summaryKeysToDelete.push(key);
    }

    summaryKeysToDelete.forEach(key => this.summaryCache.delete(key));

    // Invalidate search caches
    this.searchCache.clear();

    logger.debug('Invalidated cache for todo list', { listId });
  }

  /**
   * Invalidate all caches
   */
  invalidateAll(): void {
    const totalEntries =
      this.todoListCache.size + this.summaryCache.size + this.searchCache.size;

    this.todoListCache.clear();
    this.summaryCache.clear();
    this.searchCache.clear();

    logger.debug('Invalidated all caches', { totalEntries });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalEntries =
      this.todoListCache.size + this.summaryCache.size + this.searchCache.size;
    const totalMemoryUsage = this.calculateTotalMemoryUsage();
    const totalRequests = this.hits + this.misses;

    return {
      totalEntries,
      totalMemoryUsage,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.misses / totalRequests : 0,
      evictionCount: this.evictions,
    };
  }

  /**
   * Reset cache statistics (useful for testing)
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    logger.debug('Cache statistics reset');
  }

  /**
   * Generate cache key for summary lists
   */
  generateSummaryKey(options: {
    context?: string;
    status?: string;
    includeArchived?: boolean;
    limit?: number;
    offset?: number;
  }): string {
    const parts = [
      'summary',
      options.context ?? 'all',
      options.status ?? 'all',
      options.includeArchived === true ? 'archived' : 'active',
      options.limit?.toString() ?? 'unlimited',
      options.offset?.toString() ?? '0',
    ];

    return parts.join(':');
  }

  /**
   * Generate cache key for search results
   */
  generateSearchKey(
    query: string,
    options: Record<string, unknown> = {}
  ): string {
    const optionsHash = this.hashObject(options);
    return `search:${query}:${optionsHash}`;
  }

  /**
   * Shutdown cache manager
   */
  shutdown(): void {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('CacheManager shutting down');

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.invalidateAll();
    logger.info('CacheManager shutdown completed');
  }

  // Private methods

  private setupMemoryManagement(): void {
    // Register caches with memory leak prevention
    memoryLeakPrevention.registerCache(
      'todo-list-cache',
      this.todoListCache as Map<unknown, unknown>
    );
    memoryLeakPrevention.registerCache(
      'summary-cache',
      this.summaryCache as Map<unknown, unknown>
    );
    memoryLeakPrevention.registerCache(
      'search-cache',
      this.searchCache as Map<unknown, unknown>
    );

    // Register cleanup tasks
    memoryCleanupManager.registerCleanupTask({
      name: 'cache-manager-cleanup',
      cleanup: () => this.performCleanup(),
      priority: 'high',
    });

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      if (!this.isShuttingDown) {
        this.performCleanup();
      }
    }, this.config.cleanupIntervalMs);
  }

  private performCleanup(): void {
    const beforeEntries =
      this.todoListCache.size + this.summaryCache.size + this.searchCache.size;
    const beforeMemory = this.calculateTotalMemoryUsage();

    // Clean expired entries
    this.cleanExpiredEntries();

    // Clean under memory pressure
    if (MemoryUtils.isMemoryPressure()) {
      this.aggressiveCleanup();
    }

    const afterEntries =
      this.todoListCache.size + this.summaryCache.size + this.searchCache.size;
    const afterMemory = this.calculateTotalMemoryUsage();

    if (beforeEntries !== afterEntries) {
      logger.debug('Cache cleanup completed', {
        entriesRemoved: beforeEntries - afterEntries,
        memoryFreed: `${((beforeMemory - afterMemory) / 1024 / 1024).toFixed(1)}MB`,
        totalEntries: afterEntries,
        totalMemory: `${(afterMemory / 1024 / 1024).toFixed(1)}MB`,
      });
    }
  }

  private cleanExpiredEntries(): void {
    const now = Date.now();

    // Clean todo list cache
    for (const [key, entry] of this.todoListCache) {
      if (this.isExpired(entry, now)) {
        this.todoListCache.delete(key);
        this.evictions++;
      }
    }

    // Clean summary cache
    for (const [key, entry] of this.summaryCache) {
      if (this.isExpired(entry, now)) {
        this.summaryCache.delete(key);
        this.evictions++;
      }
    }

    // Clean search cache
    for (const [key, entry] of this.searchCache) {
      if (this.isExpired(entry, now)) {
        this.searchCache.delete(key);
        this.evictions++;
      }
    }
  }

  private aggressiveCleanup(): void {
    const targetMemory = this.config.maxMemoryMB * 1024 * 1024 * 0.7; // Target 70% of max
    let currentMemory = this.calculateTotalMemoryUsage();

    if (currentMemory <= targetMemory) {
      return;
    }

    // Sort entries by LRU (least recently used)
    const allEntries: Array<{
      key: string;
      entry: CacheEntry<unknown>;
      cache: 'todo' | 'summary' | 'search';
    }> = [];

    for (const [key, entry] of this.todoListCache) {
      allEntries.push({ key, entry, cache: 'todo' });
    }
    for (const [key, entry] of this.summaryCache) {
      allEntries.push({ key, entry, cache: 'summary' });
    }
    for (const [key, entry] of this.searchCache) {
      allEntries.push({ key, entry, cache: 'search' });
    }

    // Sort by last accessed (oldest first)
    allEntries.sort((a, b) => a.entry.lastAccessed - b.entry.lastAccessed);

    // Remove entries until we're under the target memory
    for (const { key, entry, cache } of allEntries) {
      if (currentMemory <= targetMemory) {
        break;
      }

      switch (cache) {
        case 'todo':
          this.todoListCache.delete(key);
          break;
        case 'summary':
          this.summaryCache.delete(key);
          break;
        case 'search':
          this.searchCache.delete(key);
          break;
      }

      currentMemory -= entry.size;
      this.evictions++;
    }

    logger.info('Aggressive cache cleanup completed', {
      targetMemory: `${(targetMemory / 1024 / 1024).toFixed(1)}MB`,
      currentMemory: `${(currentMemory / 1024 / 1024).toFixed(1)}MB`,
      evictions: this.evictions,
    });
  }

  private evictIfNecessary(newEntrySize: number): void {
    const currentMemory = this.calculateTotalMemoryUsage();
    const maxMemory = this.config.maxMemoryMB * 1024 * 1024;
    const totalEntries =
      this.todoListCache.size + this.summaryCache.size + this.searchCache.size;

    // Check memory limit
    if (currentMemory + newEntrySize > maxMemory) {
      this.evictLRUEntries(newEntrySize);
    }

    // Check entry count limit
    if (totalEntries >= this.config.maxEntries) {
      this.evictLRUEntries(0);
    }
  }

  private evictLRUEntries(spaceNeeded: number): void {
    const allEntries: Array<{
      key: string;
      entry: CacheEntry<unknown>;
      cache: 'todo' | 'summary' | 'search';
    }> = [];

    for (const [key, entry] of this.todoListCache) {
      allEntries.push({ key, entry, cache: 'todo' });
    }
    for (const [key, entry] of this.summaryCache) {
      allEntries.push({ key, entry, cache: 'summary' });
    }
    for (const [key, entry] of this.searchCache) {
      allEntries.push({ key, entry, cache: 'search' });
    }

    // Sort by access frequency and recency (LRU with frequency consideration)
    allEntries.sort((a, b) => {
      const scoreA =
        a.entry.accessCount /
        Math.max(1, (Date.now() - a.entry.lastAccessed) / 1000);
      const scoreB =
        b.entry.accessCount /
        Math.max(1, (Date.now() - b.entry.lastAccessed) / 1000);
      return scoreA - scoreB; // Lower score = more likely to evict
    });

    let freedSpace = 0;
    const maxMemory = this.config.maxMemoryMB * 1024 * 1024;
    const currentMemory = this.calculateTotalMemoryUsage();
    const targetSpace = Math.max(spaceNeeded, currentMemory - maxMemory * 0.8); // Free to 80% capacity

    for (const { key, entry, cache } of allEntries) {
      if (freedSpace >= targetSpace) {
        break;
      }

      switch (cache) {
        case 'todo':
          this.todoListCache.delete(key);
          break;
        case 'summary':
          this.summaryCache.delete(key);
          break;
        case 'search':
          this.searchCache.delete(key);
          break;
      }

      freedSpace += entry.size;
      this.evictions++;
    }

    logger.debug('LRU eviction completed', {
      freedSpace: `${(freedSpace / 1024).toFixed(1)}KB`,
      evictions: this.evictions,
    });
  }

  private isExpired(
    entry: CacheEntry<unknown>,
    now: number = Date.now()
  ): boolean {
    return now - entry.timestamp > this.config.ttlMs;
  }

  private calculateTotalMemoryUsage(): number {
    let total = 0;

    for (const entry of this.todoListCache.values()) {
      total += entry.size;
    }
    for (const entry of this.summaryCache.values()) {
      total += entry.size;
    }
    for (const entry of this.searchCache.values()) {
      total += entry.size;
    }

    return total;
  }

  private estimateSize(obj: unknown): number {
    // Simple size estimation - in production, consider using a more accurate method
    const jsonString = JSON.stringify(obj);
    return jsonString.length * 2; // Rough estimate for UTF-16 encoding
  }

  private hashObject(obj: unknown): string {
    const str = JSON.stringify(
      obj,
      obj !== null && typeof obj === 'object'
        ? Object.keys(obj as Record<string, unknown>).sort()
        : undefined
    );
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}

// Global cache manager instance (lazy-initialized)
let _cacheManager: CacheManager | undefined;

export const cacheManager = {
  get instance(): CacheManager {
    if (!_cacheManager) {
      _cacheManager = new CacheManager();
    }
    return _cacheManager;
  },

  getTodoList(listId: string): TodoList | null {
    return this.instance.getTodoList(listId);
  },

  setTodoList(listId: string, todoList: TodoList): void {
    this.instance.setTodoList(listId, todoList);
  },

  getSummaryList(cacheKey: string): TodoListSummary[] | null {
    return this.instance.getSummaryList(cacheKey);
  },

  setSummaryList(cacheKey: string, summaries: TodoListSummary[]): void {
    this.instance.setSummaryList(cacheKey, summaries);
  },

  getSearchResults(searchKey: string): unknown {
    return this.instance.getSearchResults(searchKey);
  },

  setSearchResults(searchKey: string, results: unknown): void {
    this.instance.setSearchResults(searchKey, results);
  },

  invalidateTodoList(listId: string): void {
    this.instance.invalidateTodoList(listId);
  },

  invalidateAll(): void {
    this.instance.invalidateAll();
  },

  getStats(): CacheStats {
    return this.instance.getStats();
  },

  resetStats(): void {
    this.instance.resetStats();
  },

  generateSummaryKey(options: {
    context?: string;
    status?: string;
    includeArchived?: boolean;
    limit?: number;
    offset?: number;
  }): string {
    return this.instance.generateSummaryKey(options);
  },

  generateSearchKey(
    query: string,
    options: Record<string, unknown> = {}
  ): string {
    return this.instance.generateSearchKey(query, options);
  },

  shutdown(): void {
    if (_cacheManager) {
      _cacheManager.shutdown();
      _cacheManager = undefined;
    }
  },
};
