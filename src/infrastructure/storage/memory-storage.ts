/**
 * In-memory storage backend for development and testing
 */

import {
  StorageBackend,
  type SaveOptions,
  type LoadOptions,
  type ListOptions,
} from '../../shared/types/storage.js';
import { logger } from '../../shared/utils/logger.js';

import type {
  TaskList,
  TaskListSummary,
  Task,
} from '../../shared/types/task.js';

export class MemoryStorageBackend extends StorageBackend {
  private readonly data: Map<string, TaskList> = new Map();
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
    data: TaskList,
    options?: SaveOptions
  ): Promise<void> {
    if (!this.initialized) {
      throw new Error('Storage backend not initialized');
    }

    try {
      logger.debug('MemoryStorage.save called', { key, title: data.title });
      logger.debug('MemoryStorage data size before save', {
        size: this.data.size,
      });

      // Validate data if requested
      if (options?.validate === true) {
        this.validateTaskList(data);
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
      const clonedData = JSON.parse(JSON.stringify(data)) as TaskList;
      this.validateTaskList(clonedData);
      this.data.set(key, clonedData);

      logger.debug('MemoryStorage data size after save', {
        size: this.data.size,
      });
      logger.debug('MemoryStorage data keys after save', {
        keys: Array.from(this.data.keys()),
      });

      logger.debug('Task list saved to memory storage', {
        key,
        title: data.title,
      });

      return Promise.resolve();
    } catch (error) {
      logger.error('Failed to save task list to memory storage', {
        key,
        error,
      });
      throw error;
    }
  }

  async load(key: string, _options?: LoadOptions): Promise<TaskList | null> {
    if (!this.initialized) {
      throw new Error('Storage backend not initialized');
    }

    try {
      const data = this.data.get(key);
      if (data === undefined) {
        return Promise.resolve(null);
      }

      // Deep clone to prevent mutations
      const clonedData = JSON.parse(JSON.stringify(data)) as TaskList;

      // Convert date strings back to Date objects
      clonedData.createdAt = new Date(clonedData.createdAt);
      clonedData.updatedAt = new Date(clonedData.updatedAt);
      if (clonedData.completedAt !== undefined) {
        clonedData.completedAt = new Date(clonedData.completedAt);
      }

      // Convert dates in list-level implementation notes
      if (
        clonedData.implementationNotes &&
        Array.isArray(clonedData.implementationNotes)
      ) {
        clonedData.implementationNotes.forEach(note => {
          if (note.createdAt) {
            note.createdAt = new Date(note.createdAt);
          }
          if (note.updatedAt) {
            note.updatedAt = new Date(note.updatedAt);
          }
        });
      }

      clonedData.items.forEach((item: Task) => {
        item.createdAt = new Date(item.createdAt);
        item.updatedAt = new Date(item.updatedAt);
        if (item.completedAt !== undefined) {
          item.completedAt = new Date(item.completedAt);
        }

        // Convert dates in item-level implementation notes
        if (
          item.implementationNotes &&
          Array.isArray(item.implementationNotes)
        ) {
          item.implementationNotes.forEach(note => {
            if (note.createdAt) {
              note.createdAt = new Date(note.createdAt);
            }
            if (note.updatedAt) {
              note.updatedAt = new Date(note.updatedAt);
            }
          });
        }

        // Convert dates in action plan if present
        if (item.actionPlan) {
          if (item.actionPlan.createdAt) {
            item.actionPlan.createdAt = new Date(item.actionPlan.createdAt);
          }
          if (item.actionPlan.updatedAt) {
            item.actionPlan.updatedAt = new Date(item.actionPlan.updatedAt);
          }

          // Convert dates in action plan steps
          if (item.actionPlan.steps && Array.isArray(item.actionPlan.steps)) {
            item.actionPlan.steps.forEach(step => {
              if (step.completedAt) {
                step.completedAt = new Date(step.completedAt);
              }
            });
          }
        }
      });

      logger.debug('Task list loaded from memory storage', {
        key,
        title: clonedData.title,
      });
      return Promise.resolve(clonedData);
    } catch (error) {
      logger.error('Failed to load task list from memory storage', {
        key,
        error,
      });
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Storage backend not initialized');
    }

    try {
      const data = this.data.get(key);
      if (data === undefined) {
        throw new Error(`Task list not found: ${key}`);
      }

      this.data.delete(key);
      logger.info('Task list permanently deleted from memory storage', {
        key,
      });
    } catch (error) {
      logger.error('Failed to delete task list from memory storage', {
        key,
        error,
      });
      throw error;
    }
    return Promise.resolve();
  }

  async list(options?: ListOptions): Promise<TaskListSummary[]> {
    if (!this.initialized) {
      throw new Error('Storage backend not initialized');
    }

    try {
      logger.debug('MemoryStorage.list called', {
        options,
        dataSize: this.data.size,
      });
      logger.debug('MemoryStorage data keys', {
        keys: Array.from(this.data.keys()),
      });

      const summaries: TaskListSummary[] = [];

      for (const [key, data] of this.data.entries()) {
        logger.debug('Processing key', { key, id: data.id, title: data.title });

        // Skip backup entries
        if (key.includes('_backup_')) {
          logger.debug('Skipping backup entry', { key });
          continue;
        }

        // Filter by context if specified
        if (
          options?.context !== undefined &&
          data.context !== options.context
        ) {
          logger.debug('Skipping due to context filter', {
            key,
            expected: options.context,
            actual: data.context,
          });
          continue;
        }

        const summary = {
          id: data.id,
          title: data.title,
          progress: data.progress,
          totalItems: data.totalItems,
          completedItems: data.completedItems,
          lastUpdated: new Date(data.updatedAt),
          context: data.context,
          projectTag: data.projectTag || data.context || 'default',
        };
        logger.debug('Adding summary', { summary });
        summaries.push(summary);
      }

      // Apply pagination if specified
      let result = summaries;
      if (options?.offset !== undefined && options.offset > 0) {
        result = result.slice(options.offset);
      }
      if (options?.limit !== undefined && options.limit > 0) {
        result = result.slice(0, options.limit);
      }

      logger.debug('Task list summaries retrieved from memory storage', {
        count: result.length,
        total: summaries.length,
      });

      return Promise.resolve(result);
    } catch (error) {
      logger.error('Failed to list task lists from memory storage', { error });
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
  private validateTaskList(data: TaskList): void {
    if (!data.id || typeof data.id !== 'string') {
      throw new Error('Invalid task list: missing or invalid id');
    }
    if (!data.title || typeof data.title !== 'string') {
      throw new Error('Invalid task list: missing or invalid title');
    }
    if (!Array.isArray(data.items)) {
      throw new Error('Invalid task list: items must be an array');
    }
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

  async loadAllData(): Promise<
    import('../../shared/types/storage.js').StorageData
  > {
    const taskLists: TaskList[] = [];

    for (const [key, data] of this.data.entries()) {
      if (!key.includes('_backup_')) {
        taskLists.push(data);
      }
    }

    return {
      version: '1.0',
      taskLists,
    };
  }

  async saveAllData(
    data: import('../../shared/types/storage.js').StorageData
  ): Promise<void> {
    this.data.clear();

    for (const list of data.taskLists) {
      this.data.set(list.id, list);
    }
  }

  /**
   * Clear all data from memory storage
   * Useful for testing to ensure clean state between tests
   */
  async clear(): Promise<void> {
    this.data.clear();
  }
}
