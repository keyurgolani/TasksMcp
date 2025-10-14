/**
 * Storage backend interfaces and types
 *
 * Defines the contract for storage implementations including file, memory, and database backends.
 * Provides consistent interface for data persistence with options for backup, validation, and filtering.
 */

import type { TaskList, TaskListSummary } from './task.js';

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
export interface LoadOptions {}

/**
 * Options for list operations
 * Controls filtering, pagination, and context for list queries
 */
export interface ListOptions {
  context?: string; // Deprecated: filter by context
  projectTag?: string; // Filter by project tag
  limit?: number; // Maximum number of results
  offset?: number; // Number of results to skip (pagination)
}

/**
 * Complete storage data structure
 * Used for bulk operations and data migration
 */
export interface StorageData {
  version: string; // Data format version for migration compatibility
  taskLists: TaskList[]; // All task lists in storage
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
   * Saves a task list to storage
   * @param key - Unique identifier for the list
   * @param data - Task list data to save
   * @param options - Save options (backup, validation)
   */
  abstract save(
    key: string,
    data: TaskList,
    options?: SaveOptions
  ): Promise<void>;

  /**
   * Loads a task list from storage
   * @param key - Unique identifier for the list
   * @param options - Load options (include archived)
   * @returns Promise<TaskList | null> - The loaded list or null if not found
   */
  abstract load(key: string, options?: LoadOptions): Promise<TaskList | null>;

  /**
   * Deletes a task list from storage
   * @param key - Unique identifier for the list
   */
  abstract delete(key: string): Promise<void>;

  /**
   * Lists all task lists with optional filtering
   * @param options - List options (filtering, pagination)
   * @returns Promise<TaskListSummary[]> - Array of list summaries
   */
  abstract list(options?: ListOptions): Promise<TaskListSummary[]>;

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
