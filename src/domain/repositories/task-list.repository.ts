/**
 * Repository interface for TaskList aggregate
 *
 * Defines the contract for data access operations on TaskLists.
 * This interface is part of the domain layer and should not depend on
 * infrastructure concerns like specific storage implementations.
 *
 * Following the Repository pattern from Domain-Driven Design:
 * - Provides collection-like interface for domain aggregates
 * - Abstracts data access details from domain logic
 * - Enables testability through dependency injection
 * - Supports multiple storage backend implementations
 */

import type {
  TaskList,
  TaskListSummary,
  TaskStatus,
  Priority,
} from '../../shared/types/task.js';

/**
 * Options for finding a single TaskList
 */
export interface FindOptions {
  /** Whether to include completed tasks in the list items */
  includeCompleted?: boolean;
  /** Optional filters to apply to the list's tasks */
  filters?: TaskFilters;
  /** Optional sorting to apply to the list's tasks */
  sorting?: SortOptions;
  /** Optional pagination to apply to the list's tasks */
  pagination?: PaginationOptions;
}

/**
 * Filters for querying tasks within lists
 */
export interface TaskFilters {
  /** Filter by task status (single or multiple) */
  status?: TaskStatus | TaskStatus[];
  /** Filter by task priority (single or multiple) */
  priority?: Priority | Priority[];
  /** Filter by tags (tasks must have ALL specified tags) */
  tags?: string[];
  /** Filter by tag operator (AND = all tags, OR = any tag) */
  tagOperator?: 'AND' | 'OR';
  /** Filter by assignee (for future multi-user support) */
  assignee?: string;
  /** Filter by due date before this date */
  dueDateBefore?: Date;
  /** Filter by due date after this date */
  dueDateAfter?: Date;
  /** Filter by creation date before this date */
  createdBefore?: Date;
  /** Filter by creation date after this date */
  createdAfter?: Date;
  /** Filter by whether task has a description */
  hasDescription?: boolean;
  /** Filter by whether task has dependencies */
  hasDependencies?: boolean;
  /** Filter by minimum estimated duration (minutes) */
  estimatedDurationMin?: number;
  /** Filter by maximum estimated duration (minutes) */
  estimatedDurationMax?: number;
  /** Full-text search across title and description */
  searchText?: string;
}

/**
 * Sorting options for query results
 */
export interface SortOptions {
  /** Field to sort by */
  field:
    | 'title'
    | 'status'
    | 'priority'
    | 'createdAt'
    | 'updatedAt'
    | 'completedAt'
    | 'estimatedDuration';
  /** Sort direction */
  direction: 'asc' | 'desc';
}

/**
 * Pagination options for query results
 */
export interface PaginationOptions {
  /** Maximum number of results to return */
  limit?: number;
  /** Number of results to skip (for pagination) */
  offset?: number;
}

/**
 * Query parameters for searching TaskLists
 */
export interface SearchQuery {
  /** Full-text search across list title and description */
  text?: string;
  /** Filter by project tag */
  projectTag?: string;
  /** Filter by list status */
  status?: 'active' | 'completed' | 'all';

  /** Filter by task status within lists */
  taskStatus?: TaskStatus[];
  /** Filter by task priority within lists */
  taskPriority?: Priority[];
  /** Filter by task tags within lists */
  taskTags?: string[];
  /** Filter by date range */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Sorting options */
  sorting?: SortOptions;
  /** Pagination options */
  pagination?: PaginationOptions;
}

/**
 * Result of a search operation with metadata
 */
export interface SearchResult<T> {
  /** The items returned by the search */
  items: T[];
  /** Total number of items matching the query (before pagination) */
  totalCount: number;
  /** Whether there are more results available */
  hasMore: boolean;
  /** Pagination metadata */
  pagination?: {
    offset: number;
    limit: number;
  };
}

/**
 * Repository interface for TaskList aggregate
 *
 * This interface defines all data access operations for TaskLists.
 * Implementations must handle:
 * - Data persistence and retrieval
 * - Query optimization
 * - Transaction management (where applicable)
 * - Error handling and recovery
 * - Connection pooling (for database backends)
 *
 * Expected behaviors:
 * - save() should be idempotent (can be called multiple times with same data)
 * - findById() returns null if not found (does not throw)
 * - delete() permanently removes the list
 * - search() should support complex queries with filtering, sorting, pagination
 * - All operations should be atomic where possible
 * - Implementations should handle concurrent access safely
 */
export interface ITaskListRepository {
  /**
   * Saves a TaskList to the repository
   *
   * This operation should be idempotent - calling it multiple times
   * with the same data should have the same effect as calling it once.
   *
   * @param list - The TaskList to save
   * @throws Error if save operation fails
   */
  save(list: TaskList): Promise<void>;

  /**
   * Finds a TaskList by its unique identifier
   *
   * @param id - The unique identifier of the list
   * @param options - Optional parameters for the find operation
   * @returns The TaskList if found, null otherwise
   * @throws Error if the find operation fails (but not if list doesn't exist)
   */
  findById(id: string, options?: FindOptions): Promise<TaskList | null>;

  /**
   * Finds all TaskLists matching the given options
   *
   * @param options - Optional parameters for filtering and pagination
   * @returns Array of TaskLists matching the criteria
   * @throws Error if the find operation fails
   */
  findAll(options?: FindOptions): Promise<TaskList[]>;

  /**
   * Searches for TaskLists using complex query criteria
   *
   * Supports:
   * - Full-text search
   * - Multiple filter criteria
   * - Sorting by various fields
   * - Pagination
   *
   * @param query - Search query with filters, sorting, and pagination
   * @returns Search result with items and metadata
   * @throws Error if the search operation fails
   */
  search(query: SearchQuery): Promise<SearchResult<TaskList>>;

  /**
   * Searches for TaskList summaries (lightweight version)
   *
   * Returns only summary information without full task details.
   * Useful for list views and dashboards.
   *
   * @param query - Search query with filters, sorting, and pagination
   * @returns Search result with summaries and metadata
   * @throws Error if the search operation fails
   */
  searchSummaries(query: SearchQuery): Promise<SearchResult<TaskListSummary>>;

  /**
   * Deletes a TaskList from the repository permanently
   *
   * @param id - The unique identifier of the list to delete
   * @throws Error if the delete operation fails or list doesn't exist
   */
  delete(id: string): Promise<void>;

  /**
   * Checks if a TaskList exists in the repository
   *
   * @param id - The unique identifier to check
   * @returns true if the list exists, false otherwise
   * @throws Error if the check operation fails
   */
  exists(id: string): Promise<boolean>;

  /**
   * Counts TaskLists matching the given query
   *
   * @param query - Optional query to filter which lists to count
   * @returns The number of lists matching the query
   * @throws Error if the count operation fails
   */
  count(query?: SearchQuery): Promise<number>;

  /**
   * Performs a health check on the repository
   *
   * Verifies that the repository is operational and can access
   * its underlying storage.
   *
   * @returns true if healthy, false otherwise
   */
  healthCheck(): Promise<boolean>;
}
