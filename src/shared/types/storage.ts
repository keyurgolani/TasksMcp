/**
 * Storage backend interfaces and types
 *
 * Defines the contract for storage implementations including file, memory, and database backends.
 * Provides consistent interface for data persistence with options for backup, validation, and filtering.
 */

import type { TodoList, TodoListSummary } from './todo.js';

/**
 * Options for save operations
 * Controls backup creation and data validation during saves
 */
export interface SaveOptions {
  backup?: boolean; // Whether to create a backup before saving
  validate?: boolean; // Whether to validate data before saving
}

/**
 * Options for load operations
 * Controls which data to include when loading
 */
export interface LoadOptions {
  includeArchived?: boolean; // Whether to include archived lists
}

/**
 * Options for list operations
 * Controls filtering, pagination, and context for list queries
 */
export interface ListOptions {
  context?: string; // Deprecated: filter by context
  projectTag?: string; // Filter by project tag
  includeArchived?: boolean; // Include archived lists in results
  limit?: number; // Maximum number of results
  offset?: number; // Number of results to skip (pagination)
}

/**
 * Complete storage data structure
 * Used for bulk operations and data migration
 */
export interface StorageData {
  version: string; // Data format version for migration compatibility
  todoLists: TodoList[]; // All todo lists in storage
}

/**
 * Abstract base class for storage backends
 * Defines the contract that all storage implementations must follow
 *
 * Implementations include:
 * - FileStorage: JSON file-based storage
 * - MemoryStorage: In-memory storage for testing
 * - PostgreSQLStorage: Database storage (future)
 */
export abstract class StorageBackend {
  /**
   * Saves a todo list to storage
   * @param key - Unique identifier for the list
   * @param data - Todo list data to save
   * @param options - Save options (backup, validation)
   */
  abstract save(
    key: string,
    data: TodoList,
    options?: SaveOptions
  ): Promise<void>;

  /**
   * Loads a todo list from storage
   * @param key - Unique identifier for the list
   * @param options - Load options (include archived)
   * @returns Promise<TodoList | null> - The loaded list or null if not found
   */
  abstract load(key: string, options?: LoadOptions): Promise<TodoList | null>;

  /**
   * Deletes a todo list from storage
   * @param key - Unique identifier for the list
   * @param permanent - Whether to permanently delete (vs archive)
   */
  abstract delete(key: string, permanent?: boolean): Promise<void>;

  /**
   * Lists all todo lists with optional filtering
   * @param options - List options (filtering, pagination)
   * @returns Promise<TodoListSummary[]> - Array of list summaries
   */
  abstract list(options?: ListOptions): Promise<TodoListSummary[]>;

  /**
   * Initializes the storage backend
   * Sets up necessary resources, connections, or file structures
   */
  abstract initialize(): Promise<void>;

  /**
   * Performs a health check on the storage backend
   * @returns Promise<boolean> - True if storage is healthy
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Gracefully shuts down the storage backend
   * Closes connections and cleans up resources
   */
  abstract shutdown(): Promise<void>;

  /**
   * Loads all data from storage for bulk operations
   * @returns Promise<StorageData> - Complete storage data
   */
  abstract loadAllData(): Promise<StorageData>;

  /**
   * Saves all data to storage for bulk operations
   * @param data - Complete storage data to save
   * @param options - Save options (backup, validation)
   */
  abstract saveAllData(data: StorageData, options?: SaveOptions): Promise<void>;
}
