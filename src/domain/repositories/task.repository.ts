/**
 * Repository interface for Task (TodoItem) operations
 * 
 * Provides task-specific query and manipulation operations that work
 * across TodoLists. This interface complements ITodoListRepository by
 * focusing on individual task operations rather than list-level operations.
 * 
 * Use cases:
 * - Global task search across all lists
 * - Task dependency analysis across lists
 * - Task analytics and reporting
 * - Bulk task operations
 */

import type {
  TodoItem,
  TaskStatus,
  Priority,
  ExitCriteria,
  ActionPlan,
  ImplementationNote,
} from '../../shared/types/todo.js';
import type {
  TaskFilters,
  SortOptions,
  PaginationOptions,
  SearchResult,
} from './todo-list.repository.js';

/**
 * Query parameters for searching tasks across lists
 */
export interface TaskSearchQuery {
  /** Full-text search across task title and description */
  text?: string;
  /** Filter by list ID (search within specific list) */
  listId?: string;
  /** Filter by project tag (search within specific project) */
  projectTag?: string;
  /** Task-specific filters */
  filters?: TaskFilters;
  /** Sorting options */
  sorting?: SortOptions;
  /** Pagination options */
  pagination?: PaginationOptions;
  /** Include list context in results */
  includeListContext?: boolean;
}

/**
 * Task with its parent list context
 */
export interface TaskWithContext {
  /** The task itself */
  task: TodoItem;
  /** ID of the list containing this task */
  listId: string;
  /** Title of the list containing this task */
  listTitle: string;
  /** Project tag of the list */
  projectTag: string;
}

/**
 * Options for updating a task
 */
export interface UpdateTaskOptions {
  /** The list ID containing the task */
  listId: string;
  /** The task ID to update */
  taskId: string;
  /** Fields to update */
  updates: Partial<{
    title: string;
    description: string;
    status: TaskStatus;
    priority: Priority;
    dependencies: string[];
    estimatedDuration: number;
    tags: string[];
    actionPlan: ActionPlan;
    exitCriteria: ExitCriteria[];
    implementationNotes: ImplementationNote[];
  }>;
}

/**
 * Options for creating a task
 */
export interface CreateTaskOptions {
  /** The list ID to add the task to */
  listId: string;
  /** Task title */
  title: string;
  /** Optional task description */
  description?: string;
  /** Task priority (defaults to MEDIUM) */
  priority?: Priority;
  /** Task dependencies (task IDs) */
  dependencies?: string[];
  /** Estimated duration in minutes */
  estimatedDuration?: number;
  /** Task tags */
  tags?: string[];
  /** Initial action plan */
  actionPlan?: string;
  /** Initial exit criteria */
  exitCriteria?: string[];
  /** Initial implementation notes */
  implementationNotes?: Array<{
    content: string;
    type: 'general' | 'technical' | 'decision' | 'learning';
  }>;
}

/**
 * Result of a bulk operation
 */
export interface BulkOperationResult {
  /** Number of successful operations */
  successCount: number;
  /** Number of failed operations */
  failureCount: number;
  /** Details of failures */
  failures: Array<{
    taskId: string;
    error: string;
  }>;
}

/**
 * Repository interface for Task operations
 * 
 * This interface provides task-centric operations that may span
 * multiple TodoLists. It complements ITodoListRepository by focusing
 * on individual task queries and operations.
 * 
 * Expected behaviors:
 * - Operations should maintain referential integrity with parent lists
 * - Dependency validation should be enforced
 * - All operations should be atomic where possible
 * - Search operations should be optimized for performance
 */
export interface ITaskRepository {
  /**
   * Finds a task by its ID across all lists
   * 
   * @param taskId - The unique identifier of the task
   * @param includeListContext - Whether to include parent list information
   * @returns The task with optional context, or null if not found
   * @throws Error if the find operation fails
   */
  findById(
    taskId: string,
    includeListContext?: boolean
  ): Promise<TaskWithContext | null>;

  /**
   * Searches for tasks across all lists
   * 
   * Supports:
   * - Full-text search
   * - Multiple filter criteria
   * - Sorting by various fields
   * - Pagination
   * - Optional list context inclusion
   * 
   * @param query - Search query with filters, sorting, and pagination
   * @returns Search result with tasks and metadata
   * @throws Error if the search operation fails
   */
  search(query: TaskSearchQuery): Promise<SearchResult<TaskWithContext>>;

  /**
   * Creates a new task in a list
   * 
   * @param options - Task creation options including list ID and task data
   * @returns The created task with its context
   * @throws Error if creation fails or list doesn't exist
   */
  create(options: CreateTaskOptions): Promise<TaskWithContext>;

  /**
   * Updates an existing task
   * 
   * @param options - Update options including list ID, task ID, and updates
   * @returns The updated task with its context
   * @throws Error if update fails or task doesn't exist
   */
  update(options: UpdateTaskOptions): Promise<TaskWithContext>;

  /**
   * Deletes a task from its list
   * 
   * @param listId - The list ID containing the task
   * @param taskId - The task ID to delete
   * @throws Error if deletion fails or task doesn't exist
   */
  delete(listId: string, taskId: string): Promise<void>;

  /**
   * Finds all tasks that depend on a given task
   * 
   * Useful for understanding the impact of changes to a task.
   * 
   * @param taskId - The task ID to find dependents for
   * @returns Array of tasks that depend on this task
   * @throws Error if the operation fails
   */
  findDependents(taskId: string): Promise<TaskWithContext[]>;

  /**
   * Finds all tasks that a given task depends on
   * 
   * @param taskId - The task ID to find dependencies for
   * @returns Array of tasks that this task depends on
   * @throws Error if the operation fails
   */
  findDependencies(taskId: string): Promise<TaskWithContext[]>;

  /**
   * Finds all tasks that are ready to work on (no incomplete dependencies)
   * 
   * @param listId - Optional list ID to scope the search
   * @param projectTag - Optional project tag to scope the search
   * @returns Array of tasks that are ready to start
   * @throws Error if the operation fails
   */
  findReadyTasks(
    listId?: string,
    projectTag?: string
  ): Promise<TaskWithContext[]>;

  /**
   * Finds all tasks that are blocked by incomplete dependencies
   * 
   * @param listId - Optional list ID to scope the search
   * @param projectTag - Optional project tag to scope the search
   * @returns Array of tasks that are blocked
   * @throws Error if the operation fails
   */
  findBlockedTasks(
    listId?: string,
    projectTag?: string
  ): Promise<TaskWithContext[]>;

  /**
   * Counts tasks matching the given query
   * 
   * @param query - Optional query to filter which tasks to count
   * @returns The number of tasks matching the query
   * @throws Error if the count operation fails
   */
  count(query?: TaskSearchQuery): Promise<number>;

  /**
   * Performs bulk status updates on multiple tasks
   * 
   * @param taskIds - Array of task IDs to update
   * @param status - New status to set
   * @returns Result of the bulk operation
   * @throws Error if the operation fails
   */
  bulkUpdateStatus(
    taskIds: Array<{ listId: string; taskId: string }>,
    status: TaskStatus
  ): Promise<BulkOperationResult>;

  /**
   * Performs bulk deletion of multiple tasks
   * 
   * @param taskIds - Array of task IDs to delete
   * @returns Result of the bulk operation
   * @throws Error if the operation fails
   */
  bulkDelete(
    taskIds: Array<{ listId: string; taskId: string }>
  ): Promise<BulkOperationResult>;
}
