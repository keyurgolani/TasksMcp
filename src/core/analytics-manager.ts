/**
 * Analytics manager for calculating real-time todo list analytics
 */

import {
  TaskStatus,
  type TodoItem,
  type ListAnalytics,
  type DependencyNode,
} from '../types/todo.js';
import { logger } from '../utils/logger.js';

export class AnalyticsManager {
  private readonly analyticsCache = new Map<
    string,
    { analytics: ListAnalytics; timestamp: number }
  >();
  private cacheTimeout: NodeJS.Timeout | undefined;
  private readonly CACHE_TTL = 300000; // 5 minutes

  constructor() {
    // Setup periodic cache cleanup - more frequent to prevent memory buildup
    this.cacheTimeout = setInterval(() => {
      this.cleanupCache();
    }, 60000); // Clean up every minute (was 5 minutes)
  }
  /**
   * Calculate comprehensive analytics for a todo list
   */
  calculateListAnalytics(items: TodoItem[]): ListAnalytics {
    try {
      logger.debug('Calculating list analytics', { itemCount: items.length });

      const totalItems = items.length;
      const completedItems = items.filter(
        item => item.status === TaskStatus.COMPLETED
      ).length;
      const inProgressItems = items.filter(
        item => item.status === TaskStatus.IN_PROGRESS
      ).length;
      const blockedItems = items.filter(
        item => item.status === TaskStatus.BLOCKED
      ).length;

      const progress =
        totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      // Calculate completion time metrics
      const completedItemsWithTime = items.filter(
        item =>
          item.status === TaskStatus.COMPLETED &&
          item.completedAt &&
          item.createdAt
      );

      const averageCompletionTime = this.calculateAverageCompletionTime(
        completedItemsWithTime
      );
      const estimatedTimeRemaining =
        this.calculateEstimatedTimeRemaining(items);

      // Calculate velocity metrics
      const velocityMetrics = this.calculateVelocityMetrics(items);

      // Calculate complexity distribution
      const complexityDistribution =
        this.calculateComplexityDistribution(items);

      // Calculate tag frequency
      const tagFrequency = this.calculateTagFrequency(items);

      // Build dependency graph
      const dependencyGraph = this.buildDependencyGraph(items);

      const analytics: ListAnalytics = {
        totalItems,
        completedItems,
        inProgressItems,
        blockedItems,
        progress,
        averageCompletionTime,
        estimatedTimeRemaining,
        velocityMetrics,
        complexityDistribution,
        tagFrequency,
        dependencyGraph,
      };

      logger.debug('List analytics calculated successfully', {
        totalItems,
        completedItems,
        progress,
        averageCompletionTime,
      });

      return analytics;
    } catch (error) {
      logger.error('Failed to calculate list analytics', { error });
      throw error;
    }
  }

  /**
   * Calculate average completion time in minutes
   */
  private calculateAverageCompletionTime(completedItems: TodoItem[]): number {
    if (completedItems.length === 0) {
      return 0;
    }

    const totalTime = completedItems.reduce((sum, item) => {
      if (item.completedAt != null && item.createdAt != null) {
        const completionTime =
          item.completedAt.getTime() - item.createdAt.getTime();
        return sum + completionTime / (1000 * 60); // Convert to minutes
      }
      return sum;
    }, 0);

    return Math.round(totalTime / completedItems.length);
  }

  /**
   * Calculate estimated time remaining based on pending items
   */
  private calculateEstimatedTimeRemaining(items: TodoItem[]): number {
    const pendingItems = items.filter(
      item =>
        item.status === TaskStatus.PENDING ||
        item.status === TaskStatus.IN_PROGRESS ||
        item.status === TaskStatus.BLOCKED
    );

    const totalEstimated = pendingItems.reduce((sum, item) => {
      return sum + (item.estimatedDuration ?? 60); // Default to 60 minutes if not specified
    }, 0);

    return totalEstimated;
  }

  /**
   * Calculate velocity metrics (items per day and completion rate)
   */
  private calculateVelocityMetrics(items: TodoItem[]): {
    itemsPerDay: number;
    completionRate: number;
  } {
    const completedItems = items.filter(
      item => item.status === TaskStatus.COMPLETED
    );

    if (completedItems.length === 0) {
      return { itemsPerDay: 0, completionRate: 0 };
    }

    // Calculate items per day based on the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCompletions = completedItems.filter(
      item => item.completedAt && item.completedAt >= thirtyDaysAgo
    );

    const itemsPerDay = recentCompletions.length / 30;

    // Calculate overall completion rate
    const completionRate =
      items.length > 0 ? (completedItems.length / items.length) * 100 : 0;

    return {
      itemsPerDay: Math.round(itemsPerDay * 100) / 100, // Round to 2 decimal places
      completionRate: Math.round(completionRate * 100) / 100,
    };
  }

  /**
   * Calculate complexity distribution across priority levels
   */
  private calculateComplexityDistribution(
    items: TodoItem[]
  ): Record<number, number> {
    const distribution: Record<number, number> = {
      1: 0, // MINIMAL
      2: 0, // LOW
      3: 0, // MEDIUM
      4: 0, // HIGH
      5: 0, // CRITICAL
    };

    items.forEach(item => {
      distribution[item.priority] = (distribution[item.priority] ?? 0) + 1;
    });

    return distribution;
  }

  /**
   * Calculate tag frequency across all items
   */
  private calculateTagFrequency(items: TodoItem[]): Record<string, number> {
    const frequency: Record<string, number> = {};

    items.forEach(item => {
      item.tags.forEach(tag => {
        frequency[tag] = (frequency[tag] ?? 0) + 1;
      });
    });

    return frequency;
  }

  /**
   * Build dependency graph for visualization and analysis
   */
  private buildDependencyGraph(items: TodoItem[]): DependencyNode[] {
    const nodes: DependencyNode[] = [];

    // Create dependency map for finding dependents
    const dependentsMap = new Map<string, string[]>();
    items.forEach(item => {
      item.dependencies.forEach(depId => {
        if (!dependentsMap.has(depId)) {
          dependentsMap.set(depId, []);
        }
        const dependents = dependentsMap.get(depId);
        if (dependents != null) {
          dependents.push(item.id);
        }
      });
    });

    // Build nodes with dependency information
    items.forEach(item => {
      const dependents = dependentsMap.get(item.id) ?? [];
      const depth = this.calculateNodeDepth(item.id, items, new Set());
      const isBlocked = this.isItemBlocked(item, items);

      nodes.push({
        id: item.id,
        title: item.title,
        dependencies: item.dependencies,
        dependents,
        depth,
        isBlocked,
      });
    });

    return nodes;
  }

  /**
   * Calculate the depth of a node in the dependency graph
   */
  private calculateNodeDepth(
    itemId: string,
    items: TodoItem[],
    visited: Set<string>
  ): number {
    if (visited.has(itemId)) {
      return 0; // Circular dependency, return 0 to avoid infinite recursion
    }

    const item = items.find(i => i.id === itemId);
    if (!item || item.dependencies.length === 0) {
      return 0;
    }

    visited.add(itemId);

    const maxDepth = Math.max(
      ...item.dependencies.map(depId =>
        this.calculateNodeDepth(depId, items, new Set(visited))
      )
    );

    return maxDepth + 1;
  }

  /**
   * Check if an item is blocked by incomplete dependencies
   */
  private isItemBlocked(item: TodoItem, items: TodoItem[]): boolean {
    if (item.dependencies.length === 0) {
      return false;
    }

    return item.dependencies.some(depId => {
      const dependency = items.find(i => i.id === depId);
      return dependency && dependency.status !== TaskStatus.COMPLETED;
    });
  }

  /**
   * Calculate analytics for a filtered subset of items
   */
  calculateFilteredAnalytics(
    allItems: TodoItem[],
    filteredItems: TodoItem[]
  ): ListAnalytics {
    // Calculate analytics for filtered items but maintain context of full list
    const filteredAnalytics = this.calculateListAnalytics(filteredItems);

    return {
      ...filteredAnalytics,
      // Add metadata about filtering in the dependency graph
      dependencyGraph: filteredAnalytics.dependencyGraph.map(node => ({
        ...node,
        // Mark if this node has dependencies outside the filtered set
        isBlocked: ((): boolean => {
          const foundItem = filteredItems.find(item => item.id === node.id);
          return foundItem != null
            ? this.isItemBlocked(foundItem, allItems)
            : false;
        })(),
      })),
    };
  }

  /**
   * Clean up internal caches and resources
   */
  cleanup(): void {
    this.analyticsCache.clear();

    if (this.cacheTimeout) {
      clearInterval(this.cacheTimeout);
      this.cacheTimeout = undefined;
    }

    logger.debug('AnalyticsManager cleanup completed');
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;
    const maxCacheSize = 50; // Limit cache size to prevent memory growth

    // Remove expired entries
    for (const [key, entry] of this.analyticsCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.analyticsCache.delete(key);
        cleaned++;
      }
    }

    // If cache is still too large, remove oldest entries
    if (this.analyticsCache.size > maxCacheSize) {
      const entries = Array.from(this.analyticsCache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      ); // Sort by timestamp (oldest first)

      const toRemove = entries.slice(
        0,
        this.analyticsCache.size - maxCacheSize
      );
      for (const [key] of toRemove) {
        this.analyticsCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('AnalyticsManager cache cleaned', {
        clearedEntries: cleaned,
        remaining: this.analyticsCache.size,
        maxSize: maxCacheSize,
      });
    }
  }
}
