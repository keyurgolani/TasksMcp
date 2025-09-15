/**
 * Operation caching for performance optimization
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
   * Execute operation with caching
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
   * Convenience methods for common domains
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