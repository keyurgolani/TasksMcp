/**
 * Operation caching for performance optimization
 * 
 * Provides a high-level caching abstraction for expensive operations in the MCP Task Manager.
 * Features include:
 * - Domain-specific caching with automatic key generation
 * - TTL (Time To Live) support for cache expiration
 * - Convenience methods for common operation domains
 * - Cache statistics and monitoring capabilities
 * - Integration with the global cache manager for consistency
 */

import { cacheManager } from "./cache-manager.js";
import { logger } from "../../shared/utils/logger.js";

/**
 * Operation cache for wrapping expensive operations with caching
 */
export class OperationCache {
  private static instance: OperationCache;

  static getInstance(): OperationCache {
    if (!OperationCache.instance) {
      OperationCache.instance = new OperationCache();
    }
    return OperationCache.instance;
  }

  /**
   * Execute operation with intelligent caching
   * 
   * Wraps expensive operations with caching logic to improve performance.
   * Automatically generates cache keys based on domain and operation if not provided.
   * Integrates with the global cache manager for consistent cache behavior.
   * 
   * @param domain - Logical domain for the operation (e.g., 'action_plan', 'project_management')
   * @param operation - Specific operation name within the domain
   * @param primaryOperation - The expensive operation to cache
   * @param cacheKey - Optional custom cache key (auto-generated if not provided)
   * @param ttl - Optional time-to-live in milliseconds for cache expiration
   * @returns Promise<T> - Cached result or fresh result from primary operation
   */
  async executeWithCache<T>(
    domain: string,
    operation: string,
    primaryOperation: () => Promise<T>,
    cacheKey?: string,
    ttl?: number
  ): Promise<T> {
    const key = cacheKey ?? `${domain}:${operation}:${Date.now()}`;
    return cacheManager.executeWithCache(key, primaryOperation, ttl);
  }

  /**
   * Convenience methods for common operation domains
   * 
   * These methods provide domain-specific caching with pre-configured settings
   * for the most frequently used operation types in the task management system.
   */
  async executeActionPlan<T>(
    operation: string,
    primaryOperation: () => Promise<T>,
    cacheKey?: string,
    ttl?: number
  ): Promise<T> {
    return this.executeWithCache('action_plan', operation, primaryOperation, cacheKey, ttl);
  }

  async executeProject<T>(
    operation: string,
    primaryOperation: () => Promise<T>,
    cacheKey?: string,
    ttl?: number
  ): Promise<T> {
    return this.executeWithCache('project_management', operation, primaryOperation, cacheKey, ttl);
  }

  async executeNotes<T>(
    operation: string,
    primaryOperation: () => Promise<T>,
    cacheKey?: string,
    ttl?: number
  ): Promise<T> {
    return this.executeWithCache('notes_management', operation, primaryOperation, cacheKey, ttl);
  }

  async executePrettyPrint<T>(
    operation: string,
    primaryOperation: () => Promise<T>,
    cacheKey?: string,
    ttl?: number
  ): Promise<T> {
    return this.executeWithCache('pretty_print', operation, primaryOperation, cacheKey, ttl);
  }

  async executeCleanup<T>(
    operation: string,
    primaryOperation: () => Promise<T>,
    cacheKey?: string,
    ttl?: number
  ): Promise<T> {
    return this.executeWithCache('cleanup_suggestions', operation, primaryOperation, cacheKey, ttl);
  }

  /**
   * Clear cache for specific domain
   */
  clearDomainCache(domain: string): void {
    const keys = Array.from(cacheManager["cache"].keys()).filter((key) =>
      key.startsWith(`${domain}:`)
    );
    keys.forEach((key) => cacheManager.delete(key));
    logger.info("Cleared cache for domain", {
      domain,
      keysCleared: keys.length,
    });
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    cacheManager.clear();
    logger.info("Cleared all caches");
  }

  /**
   * Initialize the operation cache
   */
  initialize(): void {
    // No-op for now, cache is ready to use
    logger.debug('Operation cache initialized');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    return cacheManager.getStats();
  }
}

// Export singleton instance
export const operationCache = OperationCache.getInstance();