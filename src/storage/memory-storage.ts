/**
 * In-memory storage backend for development and testing
 */

import type { TodoList, TodoListSummary, TodoItem } from '../types/todo.js';
import {
  StorageBackend,
  type SaveOptions,
  type LoadOptions,
  type ListOptions,
} from '../types/storage.js';
import { logger } from '../utils/logger.js';

export class MemoryStorageBackend extends StorageBackend {
  private readonly data: Map<string, TodoList> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      return Promise.resolve();
    }

    logger.info('Initializing memory storage backend');
    this.data.clear();
    this.initialized = true;
    logger.info('Memory storage backend initialized successfully');
    return Promise.resolve();
  }

  async save(
    key: string,
    data: TodoList,
    options?: SaveOptions
  ): Promise<void> {
    if (!this.initialized) {
      throw new Error('Storage backend not initialized');
    }

    try {
      // Validate data if requested
      if (options?.validate === true) {
        this.validateTodoList(data);
      }

      // Create backup if requested (but limit backup retention)
      if (options?.backup === true && this.data.has(key)) {
        const backupKey = `${key}_backup_${Date.now()}`;
        const existing = this.data.get(key);
        if (existing !== undefined) {
          this.data.set(backupKey, { ...existing });

          // Clean up old backups to prevent memory leaks
          this.cleanupOldBackups(key);
        }
      }

      // Deep clone to prevent mutations
      const clonedData = JSON.parse(JSON.stringify(data)) as TodoList;
      this.validateTodoList(clonedData);
      this.data.set(key, clonedData);

      logger.debug('Todo list saved to memory storage', {
        key,
        title: data.title,
      });

      return Promise.resolve();
    } catch (error) {
      logger.error('Failed to save todo list to memory storage', {
        key,
        error,
      });
      throw error;
    }
  }

  async load(key: string, options?: LoadOptions): Promise<TodoList | null> {
    if (!this.initialized) {
      throw new Error('Storage backend not initialized');
    }

    try {
      const data = this.data.get(key);
      if (data === undefined) {
        return Promise.resolve(null);
      }

      // Filter archived lists if requested
      if (options?.includeArchived !== true && data.isArchived) {
        return Promise.resolve(null);
      }

      // Deep clone to prevent mutations
      const clonedData = JSON.parse(JSON.stringify(data)) as TodoList;

      // Convert date strings back to Date objects
      clonedData.createdAt = new Date(clonedData.createdAt);
      clonedData.updatedAt = new Date(clonedData.updatedAt);
      if (clonedData.completedAt !== undefined) {
        clonedData.completedAt = new Date(clonedData.completedAt);
      }

      clonedData.items.forEach((item: TodoItem) => {
        item.createdAt = new Date(item.createdAt);
        item.updatedAt = new Date(item.updatedAt);
        if (item.completedAt !== undefined) {
          item.completedAt = new Date(item.completedAt);
        }
      });

      logger.debug('Todo list loaded from memory storage', {
        key,
        title: clonedData.title,
      });
      return Promise.resolve(clonedData);
    } catch (error) {
      logger.error('Failed to load todo list from memory storage', {
        key,
        error,
      });
      throw error;
    }
  }

  async delete(key: string, permanent = false): Promise<void> {
    if (!this.initialized) {
      throw new Error('Storage backend not initialized');
    }

    try {
      const data = this.data.get(key);
      if (data === undefined) {
        throw new Error(`Todo list not found: ${key}`);
      }

      if (permanent) {
        this.data.delete(key);
        logger.info('Todo list permanently deleted from memory storage', {
          key,
        });
      } else {
        // Archive instead of delete
        data.isArchived = true;
        data.updatedAt = new Date();
        this.data.set(key, data);
        logger.info('Todo list archived in memory storage', { key });
      }
    } catch (error) {
      logger.error('Failed to delete todo list from memory storage', {
        key,
        error,
      });
      throw error;
    }
    return Promise.resolve();
  }

  async list(options?: ListOptions): Promise<TodoListSummary[]> {
    if (!this.initialized) {
      throw new Error('Storage backend not initialized');
    }

    try {
      const summaries: TodoListSummary[] = [];

      for (const [key, data] of this.data.entries()) {
        // Skip backup entries
        if (key.includes('_backup_')) {
          continue;
        }

        // Filter by context if specified
        if (
          options?.context !== undefined &&
          data.context !== options.context
        ) {
          continue;
        }

        // Filter archived lists if requested
        if (options?.includeArchived !== true && data.isArchived) {
          continue;
        }

        summaries.push({
          id: data.id,
          title: data.title,
          progress: data.progress,
          totalItems: data.totalItems,
          completedItems: data.completedItems,
          lastUpdated: new Date(data.updatedAt),
          context: data.context,
        });
      }

      // Apply pagination if specified
      let result = summaries;
      if (options?.offset !== undefined && options.offset > 0) {
        result = result.slice(options.offset);
      }
      if (options?.limit !== undefined && options.limit > 0) {
        result = result.slice(0, options.limit);
      }

      logger.debug('Todo list summaries retrieved from memory storage', {
        count: result.length,
        total: summaries.length,
      });

      return Promise.resolve(result);
    } catch (error) {
      logger.error('Failed to list todo lists from memory storage', { error });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      return Promise.resolve(this.initialized);
    } catch (error) {
      logger.error('Memory storage health check failed', { error });
      return Promise.resolve(false);
    }
  }

  // Helper method for data validation
  private validateTodoList(data: TodoList): void {
    if (!data.id || typeof data.id !== 'string') {
      throw new Error('Invalid todo list: missing or invalid id');
    }
    if (!data.title || typeof data.title !== 'string') {
      throw new Error('Invalid todo list: missing or invalid title');
    }
    if (!Array.isArray(data.items)) {
      throw new Error('Invalid todo list: items must be an array');
    }
  }

  // Helper method to get storage statistics (useful for testing)
  getStats(): {
    totalLists: number;
    archivedLists: number;
    totalItems: number;
  } {
    let totalLists = 0;
    let archivedLists = 0;
    let totalItems = 0;

    for (const [key, data] of this.data.entries()) {
      if (key.includes('_backup_')) {
        continue;
      }
      totalLists++;
      if (data.isArchived) {
        archivedLists++;
      }
      totalItems += data.items.length;
    }

    return { totalLists, archivedLists, totalItems };
  }

  /**
   * Clean up old backup entries to prevent memory leaks
   */
  private cleanupOldBackups(key: string): void {
    const backupKeys = Array.from(this.data.keys())
      .filter(k => k.startsWith(`${key}_backup_`))
      .sort(); // Sort by timestamp (oldest first)

    // Keep only the 3 most recent backups
    const maxBackups = 3;
    if (backupKeys.length > maxBackups) {
      const toDelete = backupKeys.slice(0, backupKeys.length - maxBackups);
      for (const backupKey of toDelete) {
        this.data.delete(backupKey);
      }
    }
  }

  /**
   * Periodic cleanup of all old backups
   */
  private cleanupAllOldBackups(): void {
    const backupKeys = Array.from(this.data.keys()).filter(k =>
      k.includes('_backup_')
    );

    // Group by original key
    const backupGroups = new Map<string, string[]>();
    for (const backupKey of backupKeys) {
      const [originalKey] = backupKey.split('_backup_');
      if (
        originalKey != null &&
        originalKey !== '' &&
        originalKey !== backupKey
      ) {
        // Ensure we have a valid original key
        if (!backupGroups.has(originalKey)) {
          backupGroups.set(originalKey, []);
        }
        const backupList = backupGroups.get(originalKey);
        if (backupList != null) {
          backupList.push(backupKey);
        }
      }
    }

    // Clean up each group
    for (const [, backups] of backupGroups) {
      if (backups.length > 3) {
        const sorted = backups.sort();
        const toDelete = sorted.slice(0, sorted.length - 3);
        for (const backupKey of toDelete) {
          this.data.delete(backupKey);
        }
      }
    }
  }

  /**
   * Shutdown memory storage and cleanup resources
   */
  async shutdown(): Promise<void> {
    logger.info('MemoryStorageBackend shutting down');

    // Clean up old backups before shutdown
    this.cleanupAllOldBackups();

    // Add a minimal async operation to satisfy linter
    await Promise.resolve();

    // Clear all data
    this.data.clear();
    this.initialized = false;

    logger.info('MemoryStorageBackend shutdown completed');
  }
}
