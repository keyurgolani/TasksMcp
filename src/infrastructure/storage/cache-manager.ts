/**
 * Simple cache manager for optimizing performance
 */

import { logger } from '../../shared/utils/logger.js';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheConfig {
  defaultTtl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  cleanupInterval: number; // Cleanup interval in milliseconds
}

export class CacheManager {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout | undefined;
  private readonly config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTtl: 300000, // 5 minutes
      maxSize: 1000,
      cleanupInterval: 60000, // 1 minute
      ...config,
    };

    this.startCleanup();
  }

  /**
   * Execute operation with caching
   */
  async executeWithCache<T>(
    key: string,
    operation: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check if we have a valid cached entry
    const cached = this.get<T>(key);
    if (cached !== null) {
      logger.debug('Cache hit', { key });
      return cached;
    }

    // Execute the operation and cache the result
    logger.debug('Cache miss, executing operation', { key });
    try {
      const result = await operation();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      logger.warn('Operation failed', { key, error });
      throw error;
    }
  }

  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached value
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Enforce max size
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.config.defaultTtl,
    };

    this.cache.set(key, entry as CacheEntry<unknown>);
  }

  /**
   * Delete cached value
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Could be implemented with hit/miss counters
    };
  }

  // TodoList-specific cache methods
  setTodoList(listId: string, todoList: any): void {
    this.set(`todolist:${listId}`, todoList);
  }

  getTodoList(listId: string): any | null {
    return this.get(`todolist:${listId}`);
  }

  invalidateTodoList(listId: string): void {
    this.delete(`todolist:${listId}`);
    // Also invalidate related summary caches
    const summaryKeys = Array.from(this.cache.keys()).filter(key => 
      key.startsWith('summary:') && key.includes(listId)
    );
    summaryKeys.forEach(key => this.delete(key));
  }

  // Summary list cache methods
  generateSummaryKey(options: any): string {
    const keyParts = ['summary'];
    if (options.includeArchived) keyParts.push('archived');
    if (options.context) keyParts.push(`context:${options.context}`);
    if (options.limit) keyParts.push(`limit:${options.limit}`);
    if (options.offset) keyParts.push(`offset:${options.offset}`);
    return keyParts.join(':');
  }

  getSummaryList(cacheKey: string): any[] | null {
    return this.get(cacheKey);
  }

  setSummaryList(cacheKey: string, summaries: any[]): void {
    this.set(cacheKey, summaries);
  }

  // Bulk operations
  invalidateAll(): void {
    this.clear();
  }

  shutdown(): void {
    this.stopCleanup();
    this.clear();
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined as NodeJS.Timeout | undefined;
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cache cleanup completed', { cleaned, remaining: this.cache.size });
    }
  }

  /**
   * Evict oldest entry when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug('Evicted oldest cache entry', { key: oldestKey });
    }
  }
}

// Global cache manager instance
export const cacheManager = new CacheManager();