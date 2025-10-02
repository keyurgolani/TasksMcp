/**
 * TodoListRepository Implementation
 * 
 * Concrete implementation of ITodoListRepository that uses DataSourceRouter
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

import type {
  ITodoListRepository,
  FindOptions,
  SearchQuery,
  SearchResult,
} from './todo-list.repository.js';
import type {
  TodoList,
  TodoListSummary,
} from '../../shared/types/todo.js';
import type { DataSourceRouter, OperationContext } from '../../infrastructure/storage/data-source-router.js';
import type { MultiSourceAggregator } from '../../infrastructure/storage/multi-source-aggregator.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * TodoList with source metadata
 */
export interface TodoListWithSource extends TodoList {
  _source?: {
    id: string;
    name?: string;
    priority: number;
  };
}

/**
 * TodoListRepository implementation using DataSourceRouter and MultiSourceAggregator
 * 
 * This implementation provides:
 * - Multi-source data access with automatic routing
 * - Conflict resolution for duplicate lists across sources
 * - Source metadata tracking
 * - Fallback and error recovery
 * - Consistent query interface across all sources
 */
export class TodoListRepository implements ITodoListRepository {
  constructor(
    private readonly router: DataSourceRouter,
    private readonly aggregator: MultiSourceAggregator
  ) {
    logger.info('TodoListRepository initialized with multi-source support');
  }

  /**
   * Saves a TodoList to the appropriate data source
   * 
   * The router will select the appropriate writable source based on:
   * - Project tag matching
   * - Source priority
   * - Source health status
   * 
   * @param list - The TodoList to save
   * @throws Error if save operation fails
   */
  async save(list: TodoList): Promise<void> {
    try {
      logger.debug('Saving TodoList via router', {
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

      logger.info('TodoList saved successfully', {
        listId: list.id,
        title: list.title,
        itemCount: list.items.length,
      });
    } catch (error) {
      logger.error('Failed to save TodoList', {
        listId: list.id,
        title: list.title,
        error,
      });
      throw new Error(
        `Failed to save TodoList ${list.id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Finds a TodoList by its unique identifier
   * 
   * The router will attempt to find the list from sources in priority order,
   * with automatic fallback if a source fails.
   * 
   * @param id - The unique identifier of the list
   * @param options - Optional parameters for the find operation
   * @returns The TodoList if found, null otherwise
   * @throws Error if the find operation fails (but not if list doesn't exist)
   */
  async findById(id: string, options?: FindOptions): Promise<TodoList | null> {
    try {
      logger.debug('Finding TodoList by ID via router', { listId: id, options });

      const context: OperationContext = {
        listId: id,
      };

      const list = await this.router.routeOperation<TodoList | null>(
        {
          type: 'read',
          key: id,
          options: {
            includeArchived: options?.includeArchived ?? false,
          },
        },
        context
      );

      if (!list) {
        logger.debug('TodoList not found', { listId: id });
        return null;
      }

      logger.debug('TodoList found', {
        listId: id,
        title: list.title,
        itemCount: list.items.length,
      });

      return list;
    } catch (error) {
      logger.error('Failed to find TodoList by ID', { listId: id, error });
      throw new Error(
        `Failed to find TodoList ${id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Finds all TodoLists from all available sources
   * 
   * Uses the aggregator to:
   * - Query all sources in parallel
   * - Deduplicate lists with the same ID
   * - Resolve conflicts using configured strategy
   * - Apply filters and sorting
   * 
   * @param options - Optional parameters for filtering and pagination
   * @returns Array of TodoLists matching the criteria
   * @throws Error if the find operation fails
   */
  async findAll(options?: FindOptions): Promise<TodoList[]> {
    try {
      logger.debug('Finding all TodoLists via aggregator', { options });

      // Build search query from find options
      const query: SearchQuery = {
        includeArchived: options?.includeArchived ?? false,
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

      logger.info('Found TodoLists via aggregator', {
        count: result.items.length,
        totalCount: result.totalCount,
      });

      return result.items;
    } catch (error) {
      logger.error('Failed to find all TodoLists', { error });
      throw new Error(
        `Failed to find all TodoLists: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Searches for TodoLists using complex query criteria
   * 
   * Leverages the aggregator to:
   * - Query multiple sources in parallel
   * - Deduplicate and resolve conflicts
   * - Apply comprehensive filtering
   * - Sort and paginate results
   * - Track source metadata
   * 
   * @param query - Search query with filters, sorting, and pagination
   * @returns Search result with items and metadata
   * @throws Error if the search operation fails
   */
  async search(query: SearchQuery): Promise<SearchResult<TodoList>> {
    try {
      logger.debug('Searching TodoLists via aggregator', { query });

      // Get all sources from router with metadata
      const backends = this.router.getAllSources();
      const routerStatus = this.router.getStatus();
      
      const sources = backends.map((backend) => {
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
        sources: sources.map(s => ({ id: s.id, name: s.name, priority: s.priority })),
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
      logger.error('Failed to search TodoLists', { query, error });
      throw new Error(
        `Failed to search TodoLists: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Searches for TodoList summaries (lightweight version)
   * 
   * Uses the aggregator to query summaries from all sources,
   * providing faster results for list views and dashboards.
   * 
   * @param query - Search query with filters, sorting, and pagination
   * @returns Search result with summaries and metadata
   * @throws Error if the search operation fails
   */
  async searchSummaries(query: SearchQuery): Promise<SearchResult<TodoListSummary>> {
    try {
      logger.debug('Searching TodoList summaries via aggregator', { query });

      // Get all sources from router with metadata
      const backends = this.router.getAllSources();
      const routerStatus = this.router.getStatus();
      
      const sources = backends.map((backend) => {
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
      logger.error('Failed to search TodoList summaries', { query, error });
      throw new Error(
        `Failed to search TodoList summaries: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Deletes a TodoList from the appropriate data source
   * 
   * The router will select the appropriate writable source.
   * Note: This only deletes from one source. If the list exists in
   * multiple sources, it will only be deleted from the primary source.
   * 
   * @param id - The unique identifier of the list to delete
   * @param permanent - If false, archives the list; if true, permanently deletes
   * @throws Error if the delete operation fails or list doesn't exist
   */
  async delete(id: string, permanent: boolean): Promise<void> {
    try {
      logger.debug('Deleting TodoList via router', { listId: id, permanent });

      const context: OperationContext = {
        listId: id,
        requireWritable: true,
      };

      await this.router.routeOperation(
        {
          type: 'delete',
          key: id,
          permanent,
        },
        context
      );

      logger.info('TodoList deleted successfully', { listId: id, permanent });
    } catch (error) {
      logger.error('Failed to delete TodoList', { listId: id, permanent, error });
      throw new Error(
        `Failed to delete TodoList ${id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Checks if a TodoList exists in any data source
   * 
   * Queries all sources to determine if the list exists anywhere.
   * 
   * @param id - The unique identifier to check
   * @returns true if the list exists in any source, false otherwise
   * @throws Error if the check operation fails
   */
  async exists(id: string): Promise<boolean> {
    try {
      logger.debug('Checking if TodoList exists', { listId: id });

      const list = await this.findById(id, { includeArchived: true });
      const exists = list !== null;

      logger.debug('TodoList existence check', { listId: id, exists });

      return exists;
    } catch (error) {
      logger.error('Failed to check TodoList existence', { listId: id, error });
      throw new Error(
        `Failed to check if TodoList ${id} exists: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Counts TodoLists matching the given query across all sources
   * 
   * Uses the aggregator to count deduplicated lists.
   * 
   * @param query - Optional query to filter which lists to count
   * @returns The number of lists matching the query
   * @throws Error if the count operation fails
   */
  async count(query?: SearchQuery): Promise<number> {
    try {
      logger.debug('Counting TodoLists', { query });

      if (!query) {
        // Simple count of all lists
        query = { includeArchived: false };
      }

      // Use searchSummaries to get count (more efficient than full search)
      const result = await this.searchSummaries(query);

      logger.debug('TodoList count', { count: result.totalCount });

      return result.totalCount;
    } catch (error) {
      logger.error('Failed to count TodoLists', { query, error });
      throw new Error(
        `Failed to count TodoLists: ${error instanceof Error ? error.message : String(error)}`
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
   * Get router status for monitoring and debugging
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
      logger.info('Shutting down TodoListRepository');
      await this.router.shutdown();
      logger.info('TodoListRepository shutdown complete');
    } catch (error) {
      logger.error('Failed to shutdown TodoListRepository', { error });
      throw error;
    }
  }
}
