/**
 * TaskListRepository Implementation
 *
 * Concrete implementation of ITaskListRepository that uses DataSourceRouter
 * and MultiSourceAggregator to provide multi-source data access with
 * conflict resolution and aggregation capabilities.
 *
 * Key responsibilities:
 * - Route operations to appropriate data sources via DataSourceRouter
 * - Aggregate results from multiple sources via MultiSourceAggregator
 * - Add source metadata to returned entities
 * - Handle multi-source search operations with deduplication
 * - Provide consistent interface regardless of underlying storage
 *
 * Design decisions:
 * - Uses DataSourceRouter for single-entity operations (save, findById, delete)
 * - Uses MultiSourceAggregator for multi-entity operations (search, findAll)
 * - Attaches source metadata to all returned entities
 * - Delegates conflict resolution to MultiSourceAggregator
 * - Maintains backward compatibility with existing repository interface
 */

import { logger } from '../../shared/utils/logger.js';

import type {
  ITaskListRepository,
  FindOptions,
  SearchQuery,
  SearchResult,
} from './task-list.repository.js';
import type {
  DataSourceRouter,
  OperationContext,
} from '../../infrastructure/storage/data-source-router.js';
import type { MultiSourceAggregator } from '../../infrastructure/storage/multi-source-aggregator.js';
import type { TaskList, TaskListSummary } from '../../shared/types/task.js';

/**
 * TaskList with source metadata
 */
export interface TaskListWithSource extends TaskList {
  _source?: {
    id: string;
    name?: string;
    priority: number;
  };
}

/**
 * TaskListRepository implementation using DataSourceRouter and MultiSourceAggregator
 *
 * This implementation provides:
 * - Multi-source data access with automatic routing
 * - Conflict resolution for duplicate lists across sources
 * - Source metadata tracking
 * - Fallback and error recovery
 * - Consistent query interface across all sources
 */
export class TaskListRepository implements ITaskListRepository {
  constructor(
    private readonly router: DataSourceRouter,
    private readonly aggregator: MultiSourceAggregator
  ) {
    logger.info('TaskListRepository initialized with multi-source support');
  }

  /**
   * Saves a TaskList to the appropriate data source
   *
   * The router will select the appropriate writable source based on:
   * - Project tag matching
   * - Source priority
   * - Source health status
   *
   * @param list - The TaskList to save
   * @throws Error if save operation fails
   */
  async save(list: TaskList): Promise<void> {
    try {
      logger.debug('Saving TaskList via router', {
        listId: list.id,
        title: list.title,
        projectTag: list.projectTag,
      });

      const context: OperationContext = {
        projectTag: list.projectTag,
        listId: list.id,
        requireWritable: true,
      };

      await this.router.routeOperation(
        {
          type: 'write',
          key: list.id,
          data: list,
          options: {
            backup: true,
            validate: true,
          },
        },
        context
      );

      logger.info('TaskList saved successfully', {
        listId: list.id,
        title: list.title,
        itemCount: list.items.length,
      });
    } catch (error) {
      logger.error('Failed to save TaskList', {
        listId: list.id,
        title: list.title,
        error,
      });
      throw new Error(
        `Failed to save TaskList ${list.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Finds a TaskList by its unique identifier
   *
   * The router will attempt to find the list from sources in priority order,
   * with automatic fallback if a source fails.
   *
   * @param id - The unique identifier of the list
   * @param options - Optional parameters for the find operation
   * @returns The TaskList if found, null otherwise
   * @throws Error if the find operation fails (but not if list doesn't exist)
   */
  async findById(id: string, options?: FindOptions): Promise<TaskList | null> {
    try {
      logger.debug('Finding TaskList by ID via router', {
        listId: id,
        options,
      });

      const context: OperationContext = {
        listId: id,
      };

      const list = await this.router.routeOperation<TaskList | null>(
        {
          type: 'read',
          key: id,
          options: {},
        },
        context
      );

      if (!list) {
        logger.debug('TaskList not found', { listId: id });
        return null;
      }

      logger.debug('TaskList found', {
        listId: id,
        title: list.title,
        itemCount: list.items.length,
      });

      return list;
    } catch (error) {
      logger.error('Failed to find TaskList by ID', { listId: id, error });
      throw new Error(
        `Failed to find TaskList ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Finds all TaskLists from all available sources
   *
   * Uses the aggregator to:
   * - Query all sources in parallel
   * - Deduplicate lists with the same ID
   * - Resolve conflicts using configured strategy
   * - Apply filters and sorting
   *
   * @param options - Optional parameters for filtering and pagination
   * @returns Array of TaskLists matching the criteria
   * @throws Error if the find operation fails
   */
  async findAll(options?: FindOptions): Promise<TaskList[]> {
    try {
      logger.debug('Finding all TaskLists via aggregator', { options });

      // Build search query from find options
      const query: SearchQuery = {
        ...(options?.sorting && { sorting: options.sorting }),
        ...(options?.pagination && { pagination: options.pagination }),
      };

      // Get all sources from router
      const backends = this.router.getAllSources();
      const sources = backends.map((backend, index) => ({
        backend,
        id: `source-${index}`,
        priority: index,
      }));

      // Use aggregator to get all lists
      const result = await this.aggregator.aggregateLists(sources, query);

      logger.info('Found TaskLists via aggregator', {
        count: result.items.length,
        totalCount: result.totalCount,
      });

      return result.items;
    } catch (error) {
      logger.error('Failed to find all TaskLists', { error });
      throw new Error(
        `Failed to find all TaskLists: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Searches for TaskLists using complex query criteria
   *
   * Leverages the aggregator to:
   * - Query multiple sources in parallel
   * - Deduplicate and resolve conflicts
   * - Apply filtering
   * - Sort and paginate results
   * - Track source metadata
   *
   * @param query - Search query with filters, sorting, and pagination
   * @returns Search result with items and metadata
   * @throws Error if the search operation fails
   */
  async search(query: SearchQuery): Promise<SearchResult<TaskList>> {
    try {
      logger.debug('Searching TaskLists via aggregator', { query });

      // Get all sources from router with metadata
      const backends = this.router.getAllSources();
      const routerStatus = this.router.getStatus();

      const sources = backends.map(backend => {
        // Find matching source info from router status
        const sourceInfo = routerStatus.sources.find(s => {
          // Match by checking if backend is the same instance
          const routerBackend = this.router.getBackend(s.id);
          return routerBackend === backend;
        });

        return {
          backend,
          id: sourceInfo?.id ?? 'unknown',
          ...(sourceInfo?.name && { name: sourceInfo.name }),
          priority: sourceInfo?.priority ?? 0,
        };
      });

      logger.debug('Querying sources for search', {
        sourceCount: sources.length,
        sources: sources.map(s => ({
          id: s.id,
          name: s.name,
          priority: s.priority,
        })),
      });

      // Use aggregator to search across all sources
      const result = await this.aggregator.aggregateLists(sources, query);

      logger.info('Search completed via aggregator', {
        totalCount: result.totalCount,
        returnedCount: result.items.length,
        hasMore: result.hasMore,
      });

      return result;
    } catch (error) {
      logger.error('Failed to search TaskLists', { query, error });
      throw new Error(
        `Failed to search TaskLists: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Searches for TaskList summaries (lightweight version)
   *
   * Uses the aggregator to query summaries from all sources,
   * providing faster results for list views and dashboards.
   *
   * @param query - Search query with filters, sorting, and pagination
   * @returns Search result with summaries and metadata
   * @throws Error if the search operation fails
   */
  async searchSummaries(
    query: SearchQuery
  ): Promise<SearchResult<TaskListSummary>> {
    try {
      logger.debug('Searching TaskList summaries via aggregator', { query });

      // Get all sources from router with metadata
      const backends = this.router.getAllSources();
      const routerStatus = this.router.getStatus();

      const sources = backends.map(backend => {
        const sourceInfo = routerStatus.sources.find(s => {
          const routerBackend = this.router.getBackend(s.id);
          return routerBackend === backend;
        });

        return {
          backend,
          id: sourceInfo?.id ?? 'unknown',
          ...(sourceInfo?.name && { name: sourceInfo.name }),
          priority: sourceInfo?.priority ?? 0,
        };
      });

      logger.debug('Querying sources for summaries', {
        sourceCount: sources.length,
      });

      // Use aggregator to search summaries across all sources
      const result = await this.aggregator.aggregateSummaries(sources, query);

      logger.info('Summary search completed via aggregator', {
        totalCount: result.totalCount,
        returnedCount: result.items.length,
        hasMore: result.hasMore,
      });

      return result;
    } catch (error) {
      logger.error('Failed to search TaskList summaries', { query, error });
      throw new Error(
        `Failed to search TaskList summaries: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Deletes a TaskList from the appropriate data source
   *
   * The router will select the appropriate writable source.
   * Note: This only deletes from one source. If the list exists in
   * multiple sources, it will only be deleted from the primary source.
   *
   * @param id - The unique identifier of the list to delete
   * @param permanent - If false, archives the list; if true, permanently deletes
   * @throws Error if the delete operation fails or list doesn't exist
   */
  async delete(id: string, permanent?: boolean): Promise<void> {
    try {
      logger.debug('Deleting TaskList via router', { listId: id, permanent });

      const context: OperationContext = {
        listId: id,
        requireWritable: true,
      };

      await this.router.routeOperation(
        {
          type: 'delete',
          key: id,
          permanent: permanent ?? false,
        },
        context
      );

      logger.info('TaskList deleted successfully', { listId: id });
    } catch (error) {
      logger.error('Failed to delete TaskList', {
        listId: id,
        error,
      });
      throw new Error(
        `Failed to delete TaskList ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Checks if a TaskList exists in any data source
   *
   * Queries all sources to determine if the list exists anywhere.
   *
   * @param id - The unique identifier to check
   * @returns true if the list exists in any source, false otherwise
   * @throws Error if the check operation fails
   */
  async exists(id: string): Promise<boolean> {
    try {
      logger.debug('Checking if TaskList exists', { listId: id });

      const list = await this.findById(id);
      const exists = list !== null;

      logger.debug('TaskList existence check', { listId: id, exists });

      return exists;
    } catch (error) {
      logger.error('Failed to check TaskList existence', { listId: id, error });
      throw new Error(
        `Failed to check if TaskList ${id} exists: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Counts TaskLists matching the given query across all sources
   *
   * Uses the aggregator to count deduplicated lists.
   *
   * @param query - Optional query to filter which lists to count
   * @returns The number of lists matching the query
   * @throws Error if the count operation fails
   */
  async count(query?: SearchQuery): Promise<number> {
    try {
      logger.debug('Counting TaskLists', { query });

      if (!query) {
        // Count of all lists
        query = {};
      }

      // Use searchSummaries to get count (more efficient than full search)
      const result = await this.searchSummaries(query);

      logger.debug('TaskList count', { count: result.totalCount });

      return result.totalCount;
    } catch (error) {
      logger.error('Failed to count TaskLists', { query, error });
      throw new Error(
        `Failed to count TaskLists: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Performs a health check on the repository
   *
   * Checks the health of the router and all configured sources.
   *
   * @returns true if at least one source is healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      logger.debug('Performing repository health check');

      const status = this.router.getStatus();
      const isHealthy = status.healthy > 0;

      logger.debug('Repository health check result', {
        isHealthy,
        healthySources: status.healthy,
        totalSources: status.total,
      });

      return isHealthy;
    } catch (error) {
      logger.error('Repository health check failed', { error });
      return false;
    }
  }

  /**
   * Get router status for debugging
   *
   * @returns Router status with source health information
   */
  getRouterStatus(): ReturnType<DataSourceRouter['getStatus']> {
    return this.router.getStatus();
  }

  /**
   * Shutdown the repository and all underlying connections
   */
  async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down TaskListRepository');
      await this.router.shutdown();
      logger.info('TaskListRepository shutdown complete');
    } catch (error) {
      logger.error('Failed to shutdown TaskListRepository', { error });
      throw error;
    }
  }
}
