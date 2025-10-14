/**
 * TaskListRepositoryAdapter
 *
 * Adapter that wraps the existing StorageBackend to implement ITaskListRepository.
 * This adapter provides backward compatibility while enabling the repository pattern.
 *
 * Key responsibilities:
 * - Translate repository interface calls to StorageBackend operations
 * - Handle error translation and logging
 * - Apply filters, sorting, and pagination
 * - Maintain backward compatibility with existing data format
 *
 * Design decisions:
 * - Uses composition over inheritance (wraps StorageBackend)
 * - Implements all ITaskListRepository methods
 * - Preserves existing storage behavior and data format
 * - Adds error handling and logging
 */

import { logger } from '../../shared/utils/logger.js';

import type {
  ITaskListRepository,
  FindOptions,
  SearchQuery,
  SearchResult,
  TaskFilters,
  SortOptions,
  PaginationOptions,
} from './task-list.repository.js';
import type { StorageBackend } from '../../shared/types/storage.js';
import type { TaskList, TaskListSummary } from '../../shared/types/task.js';

/**
 * Adapter that implements ITaskListRepository using an existing StorageBackend
 *
 * This adapter enables the repository pattern while maintaining backward
 * compatibility with the existing file-based storage system.
 */
export class TaskListRepositoryAdapter implements ITaskListRepository {
  constructor(private readonly storage: StorageBackend) {
    logger.debug('TaskListRepositoryAdapter initialized');
  }

  /**
   * Saves a TaskList to storage
   *
   * @param list - The TaskList to save
   * @throws Error if save operation fails
   */
  async save(list: TaskList): Promise<void> {
    try {
      logger.debug('Saving TaskList', { listId: list.id, title: list.title });

      await this.storage.save(list.id, list, {
        backup: true,
        validate: true,
      });

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
        `Failed to save TaskList ${list.id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Finds a TaskList by its unique identifier
   *
   * @param id - The unique identifier of the list
   * @param options - Optional parameters for the find operation
   * @returns The TaskList if found, null otherwise
   * @throws Error if the find operation fails (but not if list doesn't exist)
   */
  async findById(id: string, options?: FindOptions): Promise<TaskList | null> {
    try {
      logger.debug('Finding TaskList by ID', { listId: id, options });

      const list = await this.storage.load(id, {});

      if (!list) {
        logger.debug('TaskList not found', { listId: id });
        return null;
      }

      // Apply filters to tasks if specified
      let filteredList = list;
      if (options?.filters) {
        filteredList = this.applyTaskFilters(list, options.filters);
      }

      // Apply sorting to tasks if specified
      if (options?.sorting) {
        filteredList = this.applyTaskSorting(filteredList, options.sorting);
      }

      // Apply pagination to tasks if specified
      if (options?.pagination) {
        filteredList = this.applyTaskPagination(
          filteredList,
          options.pagination
        );
      }

      logger.debug('TaskList found', {
        listId: id,
        title: filteredList.title,
        itemCount: filteredList.items.length,
      });

      return filteredList;
    } catch (error) {
      logger.error('Failed to find TaskList by ID', { listId: id, error });
      throw new Error(
        `Failed to find TaskList ${id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Finds all TaskLists matching the given options
   *
   * @param options - Optional parameters for filtering and pagination
   * @returns Array of TaskLists matching the criteria
   * @throws Error if the find operation fails
   */
  async findAll(options?: FindOptions): Promise<TaskList[]> {
    try {
      logger.debug('Finding all TaskLists', { options });

      // Get all list summaries first
      const summaries = await this.storage.list({});

      // Load full lists
      const lists: TaskList[] = [];
      for (const summary of summaries) {
        const list = await this.storage.load(summary.id, {});

        if (list) {
          lists.push(list);
        }
      }

      logger.info('Found TaskLists', { count: lists.length });

      return lists;
    } catch (error) {
      logger.error('Failed to find all TaskLists', { error });
      throw new Error(
        `Failed to find all TaskLists: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Searches for TaskLists using complex query criteria
   *
   * @param query - Search query with filters, sorting, and pagination
   * @returns Search result with items and metadata
   * @throws Error if the search operation fails
   */
  async search(query: SearchQuery): Promise<SearchResult<TaskList>> {
    try {
      logger.debug('Searching TaskLists', { query });

      // Get all lists first
      const allLists = await this.findAll({});

      // Apply filters
      let filteredLists = this.applyListFilters(allLists, query);

      // Get total count before pagination
      const totalCount = filteredLists.length;

      // Apply sorting
      if (query.sorting) {
        filteredLists = this.applyListSorting(filteredLists, query.sorting);
      }

      // Apply pagination
      const pagination = query.pagination;
      const offset = pagination?.offset ?? 0;
      const limit = pagination?.limit ?? filteredLists.length;

      const paginatedLists = filteredLists.slice(offset, offset + limit);
      const hasMore = offset + paginatedLists.length < totalCount;

      logger.info('Search completed', {
        totalCount,
        returnedCount: paginatedLists.length,
        hasMore,
      });

      const result: SearchResult<TaskList> = {
        items: paginatedLists,
        totalCount,
        hasMore,
      };

      if (pagination) {
        result.pagination = { offset, limit };
      }

      return result;
    } catch (error) {
      logger.error('Failed to search TaskLists', { query, error });
      throw new Error(
        `Failed to search TaskLists: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Searches for TaskList summaries (lightweight version)
   *
   * @param query - Search query with filters, sorting, and pagination
   * @returns Search result with summaries and metadata
   * @throws Error if the search operation fails
   */
  async searchSummaries(
    query: SearchQuery
  ): Promise<SearchResult<TaskListSummary>> {
    try {
      logger.debug('Searching TaskList summaries', { query });

      // Get all summaries from storage
      const listOptions: { projectTag?: string } = {};

      if (query.projectTag) {
        listOptions.projectTag = query.projectTag;
      }

      let summaries = await this.storage.list(listOptions);

      // Apply text search if specified
      if (query.text) {
        const searchText = query.text.toLowerCase();
        summaries = summaries.filter(summary =>
          summary.title.toLowerCase().includes(searchText)
        );
      }

      // Apply status filter if specified
      if (query.status && query.status !== 'all') {
        summaries = summaries.filter(summary => {
          if (query.status === 'completed') {
            return summary.progress === 100;
          } else if (query.status === 'active') {
            return summary.progress < 100;
          }
          return true;
        });
      }

      // Get total count before pagination
      const totalCount = summaries.length;

      // Apply sorting
      if (query.sorting) {
        summaries = this.applySummarySorting(summaries, query.sorting);
      }

      // Apply pagination
      const pagination = query.pagination;
      const offset = pagination?.offset ?? 0;
      const limit = pagination?.limit ?? summaries.length;

      const paginatedSummaries = summaries.slice(offset, offset + limit);
      const hasMore = offset + paginatedSummaries.length < totalCount;

      logger.info('Summary search completed', {
        totalCount,
        returnedCount: paginatedSummaries.length,
        hasMore,
      });

      const result: SearchResult<TaskListSummary> = {
        items: paginatedSummaries,
        totalCount,
        hasMore,
      };

      if (pagination) {
        result.pagination = { offset, limit };
      }

      return result;
    } catch (error) {
      logger.error('Failed to search TaskList summaries', { query, error });
      throw new Error(
        `Failed to search TaskList summaries: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Deletes a TaskList from storage permanently
   *
   * @param id - The unique identifier of the list to delete
   * @throws Error if the delete operation fails or list doesn't exist
   */
  async delete(id: string): Promise<void> {
    try {
      logger.debug('Deleting TaskList', { listId: id });

      await this.storage.delete(id);

      logger.info('TaskList deleted successfully', { listId: id });
    } catch (error) {
      logger.error('Failed to delete TaskList', {
        listId: id,
        error,
      });
      throw new Error(
        `Failed to delete TaskList ${id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Checks if a TaskList exists in storage
   *
   * @param id - The unique identifier to check
   * @returns true if the list exists, false otherwise
   * @throws Error if the check operation fails
   */
  async exists(id: string): Promise<boolean> {
    try {
      logger.debug('Checking if TaskList exists', { listId: id });

      const list = await this.storage.load(id, {});
      const exists = list !== null;

      logger.debug('TaskList existence check', { listId: id, exists });

      return exists;
    } catch (error) {
      logger.error('Failed to check TaskList existence', { listId: id, error });
      throw new Error(
        `Failed to check if TaskList ${id} exists: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Counts TaskLists matching the given query
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
        const summaries = await this.storage.list({});
        return summaries.length;
      }

      // Use search to get filtered count
      const result = await this.searchSummaries(query);

      logger.debug('TaskList count', { count: result.totalCount });

      return result.totalCount;
    } catch (error) {
      logger.error('Failed to count TaskLists', { query, error });
      throw new Error(
        `Failed to count TaskLists: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Performs a health check on the repository
   *
   * @returns true if healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      logger.debug('Performing repository health check');

      const isHealthy = await this.storage.healthCheck();

      logger.debug('Repository health check result', { isHealthy });

      return isHealthy;
    } catch (error) {
      logger.error('Repository health check failed', { error });
      return false;
    }
  }

  // Private helper methods for filtering, sorting, and pagination

  /**
   * Applies task filters to a TaskList
   */
  private applyTaskFilters(list: TaskList, filters: TaskFilters): TaskList {
    const filteredItems = list.items.filter(item => {
      // Status filter
      if (filters.status) {
        const statuses = Array.isArray(filters.status)
          ? filters.status
          : [filters.status];
        if (!statuses.includes(item.status)) {
          return false;
        }
      }

      // Priority filter
      if (filters.priority) {
        const priorities = Array.isArray(filters.priority)
          ? filters.priority
          : [filters.priority];
        if (!priorities.includes(item.priority)) {
          return false;
        }
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const operator = filters.tagOperator ?? 'AND';
        if (operator === 'AND') {
          // Task must have ALL specified tags
          if (!filters.tags.every(tag => item.tags.includes(tag))) {
            return false;
          }
        } else {
          // Task must have ANY specified tag
          if (!filters.tags.some(tag => item.tags.includes(tag))) {
            return false;
          }
        }
      }

      // Description filter
      if (filters.hasDescription !== undefined) {
        const hasDesc = !!item.description && item.description.length > 0;
        if (hasDesc !== filters.hasDescription) {
          return false;
        }
      }

      // Dependencies filter
      if (filters.hasDependencies !== undefined) {
        const hasDeps = item.dependencies.length > 0;
        if (hasDeps !== filters.hasDependencies) {
          return false;
        }
      }

      // Estimated duration filters
      if (
        filters.estimatedDurationMin !== undefined &&
        item.estimatedDuration
      ) {
        if (item.estimatedDuration < filters.estimatedDurationMin) {
          return false;
        }
      }
      if (
        filters.estimatedDurationMax !== undefined &&
        item.estimatedDuration
      ) {
        if (item.estimatedDuration > filters.estimatedDurationMax) {
          return false;
        }
      }

      // Date filters
      if (filters.createdBefore && item.createdAt > filters.createdBefore) {
        return false;
      }
      if (filters.createdAfter && item.createdAt < filters.createdAfter) {
        return false;
      }

      // Text search
      if (filters.searchText) {
        const searchText = filters.searchText.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(searchText);
        const descMatch =
          item.description?.toLowerCase().includes(searchText) ?? false;
        if (!titleMatch && !descMatch) {
          return false;
        }
      }

      return true;
    });

    return {
      ...list,
      items: filteredItems,
    };
  }

  /**
   * Applies sorting to tasks within a TaskList
   */
  private applyTaskSorting(list: TaskList, sorting: SortOptions): TaskList {
    const sortedItems = [...list.items].sort((a, b) => {
      let aVal: string | number | Date;
      let bVal: string | number | Date;

      switch (sorting.field) {
        case 'title':
          aVal = a.title;
          bVal = b.title;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'priority':
          aVal = a.priority;
          bVal = b.priority;
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
        case 'estimatedDuration':
          aVal = a.estimatedDuration ?? 0;
          bVal = b.estimatedDuration ?? 0;
          break;
        default:
          return 0;
      }

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sorting.direction === 'asc' ? comparison : -comparison;
    });

    return {
      ...list,
      items: sortedItems,
    };
  }

  /**
   * Applies pagination to tasks within a TaskList
   */
  private applyTaskPagination(
    list: TaskList,
    pagination: PaginationOptions
  ): TaskList {
    const offset = pagination.offset ?? 0;
    const limit = pagination.limit ?? list.items.length;

    const paginatedItems = list.items.slice(offset, offset + limit);

    return {
      ...list,
      items: paginatedItems,
    };
  }

  /**
   * Applies filters to a list of TaskLists
   */
  private applyListFilters(lists: TaskList[], query: SearchQuery): TaskList[] {
    return lists.filter(list => {
      // Text search
      if (query.text) {
        const searchText = query.text.toLowerCase();
        const titleMatch = list.title.toLowerCase().includes(searchText);
        const descMatch =
          list.description?.toLowerCase().includes(searchText) ?? false;
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

      // Task status filter (lists must have tasks with specified statuses)
      if (query.taskStatus && query.taskStatus.length > 0) {
        const hasMatchingTask = list.items.some(item =>
          query.taskStatus!.includes(item.status)
        );
        if (!hasMatchingTask) {
          return false;
        }
      }

      // Task priority filter
      if (query.taskPriority && query.taskPriority.length > 0) {
        const hasMatchingTask = list.items.some(item =>
          query.taskPriority!.includes(item.priority)
        );
        if (!hasMatchingTask) {
          return false;
        }
      }

      // Task tags filter
      if (query.taskTags && query.taskTags.length > 0) {
        const hasMatchingTask = list.items.some(item =>
          query.taskTags!.some(tag => item.tags.includes(tag))
        );
        if (!hasMatchingTask) {
          return false;
        }
      }

      // Date range filter
      if (query.dateRange) {
        const listDate = list.updatedAt;
        if (
          listDate < query.dateRange.start ||
          listDate > query.dateRange.end
        ) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Applies sorting to a list of TaskLists
   */
  private applyListSorting(
    lists: TaskList[],
    sorting: SortOptions
  ): TaskList[] {
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
          aVal = Math.max(...a.items.map(i => i.priority), 0);
          bVal = Math.max(...b.items.map(i => i.priority), 0);
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
   * Applies sorting to a list of TaskListSummaries
   */
  private applySummarySorting(
    summaries: TaskListSummary[],
    sorting: SortOptions
  ): TaskListSummary[] {
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
}
