/**
 * Multi-Source Aggregator
 * 
 * Aggregates data from multiple storage sources, handling deduplication,
 * conflict resolution, and cross-source filtering/sorting/pagination.
 * 
 * Key responsibilities:
 * - Query multiple sources in parallel
 * - Deduplicate lists with the same ID
 * - Resolve conflicts using configurable strategies
 * - Apply filtering, sorting, and pagination across aggregated results
 */

import type { StorageBackend } from '../../shared/types/storage.js';
import type { TodoList, TodoListSummary } from '../../shared/types/todo.js';
import type { ConflictResolutionStrategy } from '../config/data-source-config.js';
import type {
  SearchQuery,
  SearchResult,
  SortOptions,
  PaginationOptions,
} from '../../domain/repositories/todo-list.repository.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Configuration for the aggregator
 */
export interface AggregatorConfig {
  /** Conflict resolution strategy to use */
  conflictResolution: ConflictResolutionStrategy;
  /** Whether to enable parallel querying */
  parallelQueries?: boolean;
  /** Timeout for individual source queries (ms) */
  queryTimeout?: number;
}

/**
 * Source metadata attached to aggregated results
 */
export interface SourceMetadata {
  sourceId: string;
  sourceName?: string | undefined;
  priority: number;
  timestamp: Date;
}

/**
 * TodoList with source metadata
 */
export interface TodoListWithMetadata extends TodoList {
  _sourceMetadata?: SourceMetadata;
}

/**
 * Conflict resolution context
 */
interface ConflictContext {
  listId: string;
  versions: TodoListWithMetadata[];
  strategy: ConflictResolutionStrategy;
}

/**
 * MultiSourceAggregator aggregates data from multiple storage backends
 */
export class MultiSourceAggregator {
  private config: Required<AggregatorConfig>;

  constructor(config: AggregatorConfig) {
    this.config = {
      conflictResolution: config.conflictResolution,
      parallelQueries: config.parallelQueries ?? true,
      queryTimeout: config.queryTimeout ?? 30000,
    };

    logger.info('MultiSourceAggregator created', {
      conflictResolution: this.config.conflictResolution,
      parallelQueries: this.config.parallelQueries,
    });
  }

  /**
   * Aggregate lists from multiple sources
   * 
   * @param sources - Array of storage backends to query
   * @param query - Search query parameters
   * @returns Aggregated and deduplicated search results
   */
  async aggregateLists(
    sources: Array<{ backend: StorageBackend; id: string; name?: string; priority: number }>,
    query: SearchQuery
  ): Promise<SearchResult<TodoList>> {
    logger.debug('Aggregating lists from multiple sources', {
      sourceCount: sources.length,
      query,
    });

    // Query all sources
    const allLists = await this.queryAllSources(sources, query);

    logger.debug('Retrieved lists from sources', {
      totalLists: allLists.length,
    });

    // Deduplicate and resolve conflicts
    const deduplicatedLists = await this.deduplicateAndResolve(allLists);

    logger.debug('Deduplicated lists', {
      originalCount: allLists.length,
      deduplicatedCount: deduplicatedLists.length,
    });

    // Apply filters
    const filteredLists = this.applyFilters(deduplicatedLists, query);

    logger.debug('Filtered lists', {
      beforeFilter: deduplicatedLists.length,
      afterFilter: filteredLists.length,
    });

    // Get total count before pagination
    const totalCount = filteredLists.length;

    // Apply sorting
    const sortedLists = query.sorting
      ? this.applySorting(filteredLists, query.sorting)
      : filteredLists;

    // Apply pagination
    const paginatedLists = this.applyPagination(sortedLists, query.pagination);

    const hasMore =
      (query.pagination?.offset ?? 0) + paginatedLists.length < totalCount;

    logger.info('Aggregation complete', {
      totalCount,
      returnedCount: paginatedLists.length,
      hasMore,
    });

    const result: SearchResult<TodoList> = {
      items: paginatedLists,
      totalCount,
      hasMore,
    };

    if (query.pagination) {
      result.pagination = {
        offset: query.pagination.offset ?? 0,
        limit: query.pagination.limit ?? totalCount,
      };
    }

    return result;
  }

  /**
   * Aggregate list summaries from multiple sources
   * 
   * @param sources - Array of storage backends to query
   * @param query - Search query parameters
   * @returns Aggregated and deduplicated summaries
   */
  async aggregateSummaries(
    sources: Array<{ backend: StorageBackend; id: string; name?: string; priority: number }>,
    query: SearchQuery
  ): Promise<SearchResult<TodoListSummary>> {
    logger.debug('Aggregating summaries from multiple sources', {
      sourceCount: sources.length,
      query,
    });

    // Query all sources for summaries
    const allSummaries = await this.queryAllSourcesForSummaries(sources, query);

    logger.debug('Retrieved summaries from sources', {
      totalSummaries: allSummaries.length,
    });

    // Deduplicate summaries (keep highest priority)
    const deduplicatedSummaries = this.deduplicateSummaries(allSummaries);

    logger.debug('Deduplicated summaries', {
      originalCount: allSummaries.length,
      deduplicatedCount: deduplicatedSummaries.length,
    });

    // Apply filters
    const filteredSummaries = this.applySummaryFilters(deduplicatedSummaries, query);

    // Get total count before pagination
    const totalCount = filteredSummaries.length;

    // Apply sorting
    const sortedSummaries = query.sorting
      ? this.applySummarySorting(filteredSummaries, query.sorting)
      : filteredSummaries;

    // Apply pagination
    const paginatedSummaries = this.applyPagination(sortedSummaries, query.pagination);

    const hasMore =
      (query.pagination?.offset ?? 0) + paginatedSummaries.length < totalCount;

    logger.info('Summary aggregation complete', {
      totalCount,
      returnedCount: paginatedSummaries.length,
      hasMore,
    });

    const result: SearchResult<TodoListSummary> = {
      items: paginatedSummaries,
      totalCount,
      hasMore,
    };

    if (query.pagination) {
      result.pagination = {
        offset: query.pagination.offset ?? 0,
        limit: query.pagination.limit ?? totalCount,
      };
    }

    return result;
  }

  /**
   * Query all sources for lists
   */
  private async queryAllSources(
    sources: Array<{ backend: StorageBackend; id: string; name?: string; priority: number }>,
    query: SearchQuery
  ): Promise<TodoListWithMetadata[]> {
    const queryPromises = sources.map(async (source) => {
      try {
        const lists = await this.querySourceWithTimeout(source.backend, query);

        // Attach source metadata to each list
        return lists.map((list) => ({
          ...list,
          _sourceMetadata: {
            sourceId: source.id,
            sourceName: source.name,
            priority: source.priority,
            timestamp: new Date(),
          },
        }));
      } catch (error) {
        logger.warn('Failed to query source', {
          sourceId: source.id,
          error,
        });
        return [];
      }
    });

    if (this.config.parallelQueries) {
      // Execute queries in parallel
      const results = await Promise.allSettled(queryPromises);
      return results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => (r as PromiseFulfilledResult<TodoListWithMetadata[]>).value);
    } else {
      // Execute queries sequentially
      const results: TodoListWithMetadata[] = [];
      for (const promise of queryPromises) {
        try {
          const lists = await promise;
          results.push(...lists);
        } catch (error) {
          logger.warn('Sequential query failed', { error });
        }
      }
      return results;
    }
  }

  /**
   * Query all sources for summaries
   */
  private async queryAllSourcesForSummaries(
    sources: Array<{ backend: StorageBackend; id: string; name?: string; priority: number }>,
    query: SearchQuery
  ): Promise<Array<TodoListSummary & { _sourceMetadata: SourceMetadata }>> {
    const queryPromises = sources.map(async (source) => {
      try {
        const listOptions: { projectTag?: string; includeArchived: boolean } = {
          includeArchived: query.includeArchived ?? false,
        };

        if (query.projectTag) {
          listOptions.projectTag = query.projectTag;
        }

        const summaries = await this.executeWithTimeout(
          () => source.backend.list(listOptions),
          this.config.queryTimeout
        );

        // Attach source metadata
        return summaries.map((summary) => ({
          ...summary,
          _sourceMetadata: {
            sourceId: source.id,
            sourceName: source.name,
            priority: source.priority,
            timestamp: new Date(),
          },
        }));
      } catch (error) {
        logger.warn('Failed to query source for summaries', {
          sourceId: source.id,
          error,
        });
        return [];
      }
    });

    if (this.config.parallelQueries) {
      const results = await Promise.allSettled(queryPromises);
      return results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => (r as PromiseFulfilledResult<Array<TodoListSummary & { _sourceMetadata: SourceMetadata }>>).value);
    } else {
      const results: Array<TodoListSummary & { _sourceMetadata: SourceMetadata }> = [];
      for (const promise of queryPromises) {
        try {
          const summaries = await promise;
          results.push(...summaries);
        } catch (error) {
          logger.warn('Sequential summary query failed', { error });
        }
      }
      return results;
    }
  }

  /**
   * Query a single source with timeout
   */
  private async querySourceWithTimeout(
    backend: StorageBackend,
    query: SearchQuery
  ): Promise<TodoList[]> {
    return this.executeWithTimeout(async () => {
      // Get all list summaries first
      const listOptions: { projectTag?: string; includeArchived: boolean } = {
        includeArchived: query.includeArchived ?? false,
      };

      if (query.projectTag) {
        listOptions.projectTag = query.projectTag;
      }

      const summaries = await backend.list(listOptions);

      // Load full lists
      const lists: TodoList[] = [];
      for (const summary of summaries) {
        try {
          const list = await backend.load(summary.id, {
            includeArchived: query.includeArchived ?? false,
          });

          if (list) {
            lists.push(list);
          }
        } catch (error) {
          logger.warn('Failed to load list from source', {
            listId: summary.id,
            error,
          });
        }
      }

      return lists;
    }, this.config.queryTimeout);
  }

  /**
   * Deduplicate lists and resolve conflicts
   */
  private async deduplicateAndResolve(
    lists: TodoListWithMetadata[]
  ): Promise<TodoList[]> {
    // Group lists by ID
    const grouped = new Map<string, TodoListWithMetadata[]>();

    for (const list of lists) {
      if (!grouped.has(list.id)) {
        grouped.set(list.id, []);
      }
      grouped.get(list.id)!.push(list);
    }

    // Resolve conflicts for each group
    const resolved: TodoList[] = [];

    for (const [listId, versions] of grouped.entries()) {
      if (versions.length === 1) {
        // No conflict, use the single version
        const version = versions[0];
        if (version) {
          const { _sourceMetadata, ...list } = version;
          resolved.push(list);
        }
      } else {
        // Conflict detected, resolve it
        logger.debug('Conflict detected for list', {
          listId,
          versionCount: versions.length,
        });

        const resolvedList = await this.resolveConflict({
          listId,
          versions,
          strategy: this.config.conflictResolution,
        });

        resolved.push(resolvedList);
      }
    }

    return resolved;
  }

  /**
   * Deduplicate summaries (simpler than full lists)
   */
  private deduplicateSummaries(
    summaries: Array<TodoListSummary & { _sourceMetadata: SourceMetadata }>
  ): TodoListSummary[] {
    // Group by ID
    const grouped = new Map<string, Array<TodoListSummary & { _sourceMetadata: SourceMetadata }>>();

    for (const summary of summaries) {
      if (!grouped.has(summary.id)) {
        grouped.set(summary.id, []);
      }
      grouped.get(summary.id)!.push(summary);
    }

    // For summaries, always use highest priority source
    const deduplicated: TodoListSummary[] = [];

    for (const versions of grouped.values()) {
      if (versions.length === 1) {
        const version = versions[0];
        if (version) {
          const { _sourceMetadata, ...summary } = version;
          deduplicated.push(summary);
        }
      } else {
        // Sort by priority (highest first)
        versions.sort((a, b) => b._sourceMetadata.priority - a._sourceMetadata.priority);
        const version = versions[0];
        if (version) {
          const { _sourceMetadata, ...summary } = version;
          deduplicated.push(summary);
        }
      }
    }

    return deduplicated;
  }

  /**
   * Resolve conflict between multiple versions of a list
   */
  private async resolveConflict(context: ConflictContext): Promise<TodoList> {
    const { listId, versions, strategy } = context;

    logger.debug('Resolving conflict', {
      listId,
      versionCount: versions.length,
      strategy,
    });

    switch (strategy) {
      case 'latest':
        return this.resolveByLatest(versions);

      case 'priority':
        return this.resolveByPriority(versions);

      case 'manual':
        // For manual resolution, we'll use priority as fallback
        logger.warn('Manual conflict resolution not implemented, using priority', {
          listId,
        });
        return this.resolveByPriority(versions);

      case 'merge':
        // For merge strategy, we'll use latest as fallback
        logger.warn('Merge conflict resolution not fully implemented, using latest', {
          listId,
        });
        return this.resolveByLatest(versions);

      default:
        logger.warn('Unknown conflict resolution strategy, using priority', {
          listId,
          strategy,
        });
        return this.resolveByPriority(versions);
    }
  }

  /**
   * Resolve conflict by using the most recently updated version
   */
  private resolveByLatest(versions: TodoListWithMetadata[]): TodoList {
    const sorted = [...versions].sort((a, b) => {
      const aTime = a.updatedAt.getTime();
      const bTime = b.updatedAt.getTime();
      return bTime - aTime; // Most recent first
    });

    const version = sorted[0];
    if (!version) {
      throw new Error('No versions available to resolve');
    }

    const { _sourceMetadata, ...list } = version;

    logger.debug('Resolved conflict by latest', {
      listId: list.id,
      selectedSource: _sourceMetadata?.sourceId,
      updatedAt: list.updatedAt,
    });

    return list;
  }

  /**
   * Resolve conflict by using the version from highest priority source
   */
  private resolveByPriority(versions: TodoListWithMetadata[]): TodoList {
    const sorted = [...versions].sort((a, b) => {
      const aPriority = a._sourceMetadata?.priority ?? 0;
      const bPriority = b._sourceMetadata?.priority ?? 0;
      return bPriority - aPriority; // Highest priority first
    });

    const version = sorted[0];
    if (!version) {
      throw new Error('No versions available to resolve');
    }

    const { _sourceMetadata, ...list } = version;

    logger.debug('Resolved conflict by priority', {
      listId: list.id,
      selectedSource: _sourceMetadata?.sourceId,
      priority: _sourceMetadata?.priority,
    });

    return list;
  }

  /**
   * Apply filters to lists
   */
  private applyFilters(lists: TodoList[], query: SearchQuery): TodoList[] {
    return lists.filter((list) => {
      // Text search
      if (query.text) {
        const searchText = query.text.toLowerCase();
        const titleMatch = list.title.toLowerCase().includes(searchText);
        const descMatch = list.description?.toLowerCase().includes(searchText) ?? false;
        if (!titleMatch && !descMatch) {
          return false;
        }
      }

      // Project tag filter
      if (query.projectTag && list.projectTag !== query.projectTag) {
        return false;
      }

      // Status filter
      if (query.status && query.status !== 'all') {
        if (query.status === 'completed' && list.progress !== 100) {
          return false;
        }
        if (query.status === 'active' && list.progress === 100) {
          return false;
        }
      }

      // Task status filter
      if (query.taskStatus && query.taskStatus.length > 0) {
        const hasMatchingTask = list.items.some((item) =>
          query.taskStatus!.includes(item.status)
        );
        if (!hasMatchingTask) {
          return false;
        }
      }

      // Task priority filter
      if (query.taskPriority && query.taskPriority.length > 0) {
        const hasMatchingTask = list.items.some((item) =>
          query.taskPriority!.includes(item.priority)
        );
        if (!hasMatchingTask) {
          return false;
        }
      }

      // Task tags filter
      if (query.taskTags && query.taskTags.length > 0) {
        const hasMatchingTask = list.items.some((item) =>
          query.taskTags!.some((tag) => item.tags.includes(tag))
        );
        if (!hasMatchingTask) {
          return false;
        }
      }

      // Date range filter
      if (query.dateRange) {
        const listDate = list.updatedAt;
        if (listDate < query.dateRange.start || listDate > query.dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Apply filters to summaries
   */
  private applySummaryFilters(
    summaries: TodoListSummary[],
    query: SearchQuery
  ): TodoListSummary[] {
    return summaries.filter((summary) => {
      // Text search
      if (query.text) {
        const searchText = query.text.toLowerCase();
        if (!summary.title.toLowerCase().includes(searchText)) {
          return false;
        }
      }

      // Status filter
      if (query.status && query.status !== 'all') {
        if (query.status === 'completed' && summary.progress !== 100) {
          return false;
        }
        if (query.status === 'active' && summary.progress === 100) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Apply sorting to lists
   */
  private applySorting(lists: TodoList[], sorting: SortOptions): TodoList[] {
    return [...lists].sort((a, b) => {
      let aVal: string | number | Date;
      let bVal: string | number | Date;

      switch (sorting.field) {
        case 'title':
          aVal = a.title;
          bVal = b.title;
          break;
        case 'createdAt':
          aVal = a.createdAt;
          bVal = b.createdAt;
          break;
        case 'updatedAt':
          aVal = a.updatedAt;
          bVal = b.updatedAt;
          break;
        case 'completedAt':
          aVal = a.completedAt ?? new Date(0);
          bVal = b.completedAt ?? new Date(0);
          break;
        case 'priority':
          // For lists, use highest priority task
          aVal = Math.max(...a.items.map((i) => i.priority), 0);
          bVal = Math.max(...b.items.map((i) => i.priority), 0);
          break;
        case 'status':
          // For lists, use progress as proxy for status
          aVal = a.progress;
          bVal = b.progress;
          break;
        default:
          return 0;
      }

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sorting.direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Apply sorting to summaries
   */
  private applySummarySorting(
    summaries: TodoListSummary[],
    sorting: SortOptions
  ): TodoListSummary[] {
    return [...summaries].sort((a, b) => {
      let aVal: string | number | Date;
      let bVal: string | number | Date;

      switch (sorting.field) {
        case 'title':
          aVal = a.title;
          bVal = b.title;
          break;
        case 'updatedAt':
          aVal = a.lastUpdated;
          bVal = b.lastUpdated;
          break;
        case 'status':
          // Use progress as proxy for status
          aVal = a.progress;
          bVal = b.progress;
          break;
        default:
          return 0;
      }

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sorting.direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Apply pagination to results
   */
  private applyPagination<T>(items: T[], pagination?: PaginationOptions): T[] {
    if (!pagination) {
      return items;
    }

    const offset = pagination.offset ?? 0;
    const limit = pagination.limit ?? items.length;

    return items.slice(offset, offset + limit);
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), timeout)
      ),
    ]);
  }
}
