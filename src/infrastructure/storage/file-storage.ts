/**
 * File-based storage backend with atomic operations and backup/rollback capabilities
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';

import {
  StorageBackend,
  type SaveOptions,
  type LoadOptions,
  type ListOptions,
} from '../../shared/types/storage.js';
import { FileLock } from '../../shared/utils/file-lock.js';
import { JsonOptimizer } from '../../shared/utils/json-optimizer.js';
import { logger } from '../../shared/utils/logger.js';
import {
  memoryCleanupManager,
  MemoryUtils,
} from '../../shared/utils/memory-cleanup.js';
import { memoryLeakPrevention } from '../../shared/utils/memory-leak-prevention.js';
import { RetryLogic } from '../../shared/utils/retry-logic.js';

import type { TaskList, TaskListSummary } from '../../shared/types/task.js';

export interface FileStorageConfig {
  dataDirectory: string;
  backupRetentionDays?: number;
  enableCompression?: boolean;
}

export class FileStorageBackend extends StorageBackend {
  private readonly config: Required<FileStorageConfig>;
  private initialized = false;
  private readonly indexCache = new Map<string, unknown>();
  private readonly contextIndex = new Map<string, Set<string>>(); // context -> set of list IDs
  private readonly listMetadataCache = new Map<string, TaskListSummary>(); // listId -> summary
  private cleanupInterval: NodeJS.Timeout | undefined;
  private isShuttingDown = false;
  private readonly MAX_INDEX_CACHE_SIZE = 5; // Further reduced cache size
  private readonly MAX_METADATA_CACHE_SIZE = 1000; // Cache for list summaries
  private readonly LOCK_TIMEOUT = 30000; // 30 seconds
  private readonly INDEX_RETRY_OPTIONS = {
    maxRetries: 3,
    initialDelay: 100,
    maxDelay: 2000,
    retryCondition: (error: Error): boolean =>
      RetryLogic.indexOperationRetryCondition(error),
  };

  constructor(config: FileStorageConfig) {
    super();
    this.config = {
      dataDirectory: config.dataDirectory,
      backupRetentionDays: config.backupRetentionDays ?? 7,
      enableCompression: config.enableCompression ?? false,
    };
    this.setupMemoryManagement();
    this.setupErrorRecovery();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing file storage backend', {
        dataDirectory: this.config.dataDirectory,
      });

      // Create data directory structure
      await this.ensureDirectoryExists(this.config.dataDirectory);
      await this.ensureDirectoryExists(this.getListsDirectory());
      await this.ensureDirectoryExists(this.getBackupsDirectory());
      await this.ensureDirectoryExists(this.getIndexesDirectory());

      // Clean up old backups
      await this.cleanupOldBackups();

      // Register caches with memory leak prevention
      memoryLeakPrevention.registerCache(
        'file-storage-index-cache',
        this.indexCache as Map<unknown, unknown>
      );

      // Load context index into memory for fast lookups
      await this.loadContextIndexIntoMemory();

      this.initialized = true;
      logger.info('File storage backend initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize file storage backend', { error });
      throw error;
    }
  }

  async save(
    key: string,
    data: TaskList,
    options?: SaveOptions
  ): Promise<void> {
    if (!this.initialized) {
      throw new Error('Storage backend not initialized');
    }

    // Batch operations disabled - they add overhead for concurrent operations

    // Fallback to individual operation for backup scenarios or when batch manager unavailable
    const filePath = this.getFilePath(key);
    const tempPath = `${filePath}.tmp`;
    const backupPath = `${filePath}.backup`;

    try {
      // Validate data if requested
      if (options?.validate === true) {
        this.validateTodoList(data);
      }

      // Create backup if file exists and backup is requested
      if (options?.backup === true && (await this.fileExists(filePath))) {
        await fs.copyFile(filePath, backupPath);
        logger.debug('Created backup before save', { key, backupPath });
      }

      // Ensure parent directory exists
      await this.ensureDirectoryExists(dirname(filePath));

      // Write to temporary file first (atomic operation) with serialization
      const jsonData = JsonOptimizer.serializeTodoList(data, {
        prettyPrint: false, // Skip pretty printing for performance
        includeMetadata: true,
      });
      await fs.writeFile(tempPath, jsonData, 'utf8');

      // Atomic rename to final location
      await fs.rename(tempPath, filePath);

      // Update indexes after successful save
      await this.updateIndexesSafely(key, data);

      // Clean up backup after successful write
      if (await this.fileExists(backupPath)) {
        await fs.unlink(backupPath);
      }

      logger.debug('Todo list saved to file storage', {
        key,
        title: data.title,
        filePath,
      });
    } catch (error) {
      // Rollback on failure
      try {
        if (await this.fileExists(backupPath)) {
          await fs.rename(backupPath, filePath);
          logger.debug('Restored backup after failed save', { key });
        }
        if (await this.fileExists(tempPath)) {
          await fs.unlink(tempPath);
        }
      } catch (rollbackError) {
        logger.error('Failed to rollback after save error', {
          key,
          rollbackError,
        });
      }

      logger.error('Failed to save todo list to file storage', {
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

    // Batch operations disabled - they add overhead for concurrent operations

    // Fallback to individual operation
    const filePath = this.getFilePath(key);

    try {
      if (!(await this.fileExists(filePath))) {
        return null;
      }

      const jsonData = await fs.readFile(filePath, 'utf8');
      const data = JsonOptimizer.deserializeTodoList(jsonData, {
        validateSchema: false, // Skip validation for performance
        convertDates: true,
      });

      logger.debug('Todo list loaded from file storage', {
        key,
        title: data.title,
        filePath,
      });

      return data;
    } catch (error) {
      logger.error('Failed to load todo list from file storage', {
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

    const filePath = this.getFilePath(key);

    try {
      if (!(await this.fileExists(filePath))) {
        throw new Error(`Task list not found: ${key}`);
      }

      if (permanent) {
        // Create backup before permanent deletion
        const backupPath = join(
          this.getBackupsDirectory(),
          `${key}_deleted_${Date.now()}.json`
        );
        await fs.copyFile(filePath, backupPath);

        // Permanently delete the file
        await fs.unlink(filePath);

        // Remove from indexes with retry logic and locking
        await this.removeFromIndexesSafely(key);

        logger.info('Todo list permanently deleted from file storage', {
          key,
          backupPath,
        });
      } else {
        // Archive instead of delete
        const data = await this.load(key, {});
        if (data) {
          data.isArchived = true;
          data.updatedAt = new Date();
          await this.save(key, data, { backup: true });
          logger.info('Todo list archived in file storage', { key });
        }
      }
    } catch (error) {
      logger.error('Failed to delete todo list from file storage', {
        key,
        error,
      });
      throw error;
    }
  }

  async list(options?: ListOptions): Promise<TaskListSummary[]> {
    if (!this.initialized) {
      throw new Error('Storage backend not initialized');
    }

    try {
      let targetListIds: string[] = [];

      // Use context index for fast filtering if context is specified
      if (options?.context !== undefined) {
        const contextListIds = this.contextIndex.get(options.context);
        if (!contextListIds || contextListIds.size === 0) {
          return []; // No lists in this context
        }
        targetListIds = Array.from(contextListIds);
      } else {
        // Get all list IDs from files if no context filter
        const listsDir = this.getListsDirectory();
        const files = await fs.readdir(listsDir);
        targetListIds = files
          .filter(
            file =>
              file.endsWith('.json') &&
              !file.includes('.tmp') &&
              !file.includes('.backup')
          )
          .map(file => file.replace('.json', ''));
      }

      const summaries: TaskListSummary[] = [];

      // Process lists in batches for better performance
      const batchSize = 50;
      for (let i = 0; i < targetListIds.length; i += batchSize) {
        const batch = targetListIds.slice(i, i + batchSize);
        const batchPromises = batch.map(async key => {
          try {
            // Try to get from metadata cache first
            let summary = this.listMetadataCache.get(key);

            if (!summary) {
              // Load from disk if not in cache
              const data = await this.load(key, {});

              if (!data) {
                return null;
              }

              // Create summary and cache it
              summary = {
                id: data.id,
                title: data.title,
                progress: data.progress,
                totalItems: data.totalItems,
                completedItems: data.completedItems,
                lastUpdated: new Date(data.updatedAt),
                context: data.context,
                projectTag: data.projectTag || data.context || 'default',
                isArchived: data.isArchived,
              };

              this.updateMetadataCache(key, data);
            }

            return summary;
          } catch (error) {
            logger.warn('Failed to load list summary', { key, error });
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        summaries.push(...batchResults.filter(s => s !== null));
      }

      // Sort by last updated (most recent first)
      summaries.sort(
        (a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()
      );

      // Apply pagination if specified
      let result = summaries;
      if (options?.offset !== undefined && options.offset > 0) {
        result = result.slice(options.offset);
      }
      if (options?.limit !== undefined && options.limit > 0) {
        result = result.slice(0, options.limit);
      }

      logger.debug('Todo list summaries retrieved from file storage', {
        count: result.length,
        total: summaries.length,
      });

      return result;
    } catch (error) {
      logger.error('Failed to list todo lists from file storage', { error });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.initialized) {
        return false;
      }

      // Check if data directory is accessible
      await fs.access(this.config.dataDirectory);

      // Try to write a test file
      const testPath = join(this.config.dataDirectory, '.health-check');
      await fs.writeFile(testPath, 'ok', 'utf8');
      await fs.unlink(testPath);

      return true;
    } catch (error) {
      logger.error('File storage health check failed', { error });
      return false;
    }
  }

  // Helper methods

  private getFilePath(key: string): string {
    return join(this.getListsDirectory(), `${key}.json`);
  }

  private getListsDirectory(): string {
    return join(this.config.dataDirectory, 'lists');
  }

  private getBackupsDirectory(): string {
    return join(this.config.dataDirectory, 'backups');
  }

  private getIndexesDirectory(): string {
    return join(this.config.dataDirectory, 'indexes');
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureDirectoryExists(path: string): Promise<void> {
    try {
      await fs.mkdir(path, { recursive: true });
    } catch (error: unknown) {
      // Only throw if it's not an EEXIST error (directory already exists)
      if (error instanceof Error && 'code' in error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code !== 'EEXIST') {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  private validateTodoList(data: TaskList): void {
    if (!data.id || typeof data.id !== 'string') {
      throw new Error('Invalid todo list: missing or invalid id');
    }
    if (!data.title || typeof data.title !== 'string') {
      throw new Error('Invalid todo list: missing or invalid title');
    }
    if (!Array.isArray(data.items)) {
      throw new Error('Invalid todo list: items must be an array');
    }
    if (
      typeof data.createdAt !== 'string' &&
      !(data.createdAt instanceof Date)
    ) {
      throw new Error('Invalid todo list: createdAt must be a date');
    }
    if (
      typeof data.updatedAt !== 'string' &&
      !(data.updatedAt instanceof Date)
    ) {
      throw new Error('Invalid todo list: updatedAt must be a date');
    }
  }

  /**
   * Update indexes safely with retry logic and file locking
   */
  private async updateIndexesSafely(
    key: string,
    data: TaskList
  ): Promise<void> {
    try {
      await RetryLogic.execute(
        () => this.updateIndexesWithLock(key, data),
        this.INDEX_RETRY_OPTIONS
      );
    } catch (error) {
      logger.error('Failed to update indexes after retries', { key, error });
      // Don't throw - index updates are not critical for data integrity
      // but log as error since this indicates a persistent problem
    }
  }

  /**
   * Update indexes with file locking to prevent concurrent modifications
   */
  private async updateIndexesWithLock(
    key: string,
    data: TaskList
  ): Promise<void> {
    const contextIndexPath = join(
      this.getIndexesDirectory(),
      'by-context.json'
    );

    await FileLock.withLock(
      contextIndexPath,
      async () => {
        await this.doUpdateIndexes(key, data, contextIndexPath);
      },
      { timeout: this.LOCK_TIMEOUT }
    );
  }

  /**
   * Perform atomic index update operation
   */
  private async doUpdateIndexes(
    key: string,
    data: TaskList,
    contextIndexPath: string
  ): Promise<void> {
    // Load current index (don't use cache during locked operation for consistency)
    let contextIndex: Record<string, string[]> = {};

    if (await this.fileExists(contextIndexPath)) {
      try {
        const indexData = await fs.readFile(contextIndexPath, 'utf8');
        contextIndex = JSON.parse(indexData) as Record<string, string[]>;
      } catch (error) {
        logger.warn('Failed to read context index, starting fresh', { error });
        contextIndex = {};
      }
    }

    const context = data.context || 'default';
    if (!contextIndex[context]) {
      contextIndex[context] = [];
    }

    // Add key if not already present
    if (!contextIndex[context].includes(key)) {
      contextIndex[context].push(key);
    }

    // Atomic write using temporary file
    const tempPath = `${contextIndexPath}.tmp`;
    const backupPath = `${contextIndexPath}.backup`;

    try {
      // Create backup if index exists
      if (await this.fileExists(contextIndexPath)) {
        await fs.copyFile(contextIndexPath, backupPath);
      }

      // Write to temporary file
      await fs.writeFile(
        tempPath,
        JSON.stringify(contextIndex, null, 2),
        'utf8'
      );

      // Atomic rename
      await fs.rename(tempPath, contextIndexPath);

      // Update cache after successful write
      this.indexCache.set('context', contextIndex);

      // Update in-memory context index for fast lookups
      this.updateInMemoryContextIndex(key, context);

      // Update metadata cache for fast list operations
      this.updateMetadataCache(key, data);

      // Clean up backup
      if (await this.fileExists(backupPath)) {
        await fs.unlink(backupPath);
      }

      logger.debug('Index updated successfully', { key, context });
    } catch (error) {
      // Rollback on failure
      try {
        if (await this.fileExists(backupPath)) {
          await fs.rename(backupPath, contextIndexPath);
        }
        if (await this.fileExists(tempPath)) {
          await fs.unlink(tempPath);
        }
      } catch (rollbackError) {
        logger.error('Failed to rollback index update', { key, rollbackError });
      }
      throw error;
    }
  }

  /**
   * Remove from indexes safely with retry logic and file locking
   */
  private async removeFromIndexesSafely(key: string): Promise<void> {
    try {
      await RetryLogic.execute(
        () => this.removeFromIndexesWithLock(key),
        this.INDEX_RETRY_OPTIONS
      );
    } catch (error) {
      logger.error('Failed to remove from indexes after retries', {
        key,
        error,
      });
      // Don't throw - index updates are not critical for data integrity
    }
  }

  /**
   * Remove from indexes with file locking to prevent concurrent modifications
   */
  private async removeFromIndexesWithLock(key: string): Promise<void> {
    const contextIndexPath = join(
      this.getIndexesDirectory(),
      'by-context.json'
    );

    await FileLock.withLock(
      contextIndexPath,
      async () => {
        await this.doRemoveFromIndexes(key, contextIndexPath);
      },
      { timeout: this.LOCK_TIMEOUT }
    );
  }

  /**
   * Perform atomic index removal operation
   */
  private async doRemoveFromIndexes(
    key: string,
    contextIndexPath: string
  ): Promise<void> {
    // Load current index (don't use cache during locked operation for consistency)
    let contextIndex: Record<string, string[]> = {};

    if (await this.fileExists(contextIndexPath)) {
      try {
        const indexData = await fs.readFile(contextIndexPath, 'utf8');
        contextIndex = JSON.parse(indexData) as Record<string, string[]>;
      } catch (error) {
        logger.warn('Failed to read context index for removal', { error });
        return; // If we can't read the index, there's nothing to remove
      }
    }

    // Remove key from all contexts
    let modified = false;
    for (const context in contextIndex) {
      const contextList = contextIndex[context];
      if (contextList?.includes(key) === true) {
        contextIndex[context] = contextList.filter(id => id !== key);
        if (contextIndex[context].length === 0) {
          delete contextIndex[context];
        }
        modified = true;
      }
    }

    // Only write if we actually modified something
    if (!modified) {
      logger.debug('No index modifications needed for removal', { key });
      return;
    }

    // Atomic write using temporary file
    const tempPath = `${contextIndexPath}.tmp`;
    const backupPath = `${contextIndexPath}.backup`;

    try {
      // Create backup
      if (await this.fileExists(contextIndexPath)) {
        await fs.copyFile(contextIndexPath, backupPath);
      }

      // Write to temporary file
      await fs.writeFile(
        tempPath,
        JSON.stringify(contextIndex, null, 2),
        'utf8'
      );

      // Atomic rename
      await fs.rename(tempPath, contextIndexPath);

      // Update cache after successful write
      this.indexCache.set('context', contextIndex);

      // Update in-memory indexes
      this.removeFromInMemoryContextIndex(key);
      this.removeFromMetadataCache(key);

      // Clean up backup
      if (await this.fileExists(backupPath)) {
        await fs.unlink(backupPath);
      }

      logger.debug('Index removal completed successfully', { key });
    } catch (error) {
      // Rollback on failure
      try {
        if (await this.fileExists(backupPath)) {
          await fs.rename(backupPath, contextIndexPath);
        }
        if (await this.fileExists(tempPath)) {
          await fs.unlink(tempPath);
        }
      } catch (rollbackError) {
        logger.error('Failed to rollback index removal', {
          key,
          rollbackError,
        });
      }
      throw error;
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backupsDir = this.getBackupsDirectory();
      const files = await fs.readdir(backupsDir);
      const cutoffTime =
        Date.now() - this.config.backupRetentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = join(backupsDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          logger.debug('Cleaned up old backup file', { file });
        }
      }
    } catch (error) {
      logger.warn('Failed to cleanup old backups', { error });
      // Don't throw - cleanup is not critical
    }
  }

  // Helper method to get storage statistics
  async getStats(): Promise<{
    totalLists: number;
    archivedLists: number;
    totalItems: number;
    diskUsage: number;
  }> {
    try {
      const summaries = await this.list({});
      let totalItems = 0;
      let archivedLists = 0;

      for (const summary of summaries) {
        totalItems += summary.totalItems;
        const data = await this.load(summary.id, {});
        if (data?.isArchived === true) {
          archivedLists++;
        }
      }

      // Calculate disk usage
      let diskUsage = 0;
      const listsDir = this.getListsDirectory();
      const files = await fs.readdir(listsDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const stats = await fs.stat(join(listsDir, file));
          diskUsage += stats.size;
        }
      }

      return {
        totalLists: summaries.length,
        archivedLists,
        totalItems,
        diskUsage,
      };
    } catch (error) {
      logger.error('Failed to get storage statistics', { error });
      throw error;
    }
  }

  /**
   * Setup memory management for file storage
   */
  private setupMemoryManagement(): void {
    // Register cleanup tasks
    memoryCleanupManager.registerCleanupTask({
      name: 'file-storage-cache',
      cleanup: () => this.cleanupCache(),
      priority: 'medium',
    });

    memoryCleanupManager.registerCleanupTask({
      name: 'file-storage-locks',
      cleanup: () => this.cleanupLocks(),
      priority: 'high',
    });

    memoryCleanupManager.registerCleanupTask({
      name: 'file-storage-shutdown',
      cleanup: () => this.shutdown(),
      priority: 'critical',
    });

    // Periodic cache cleanup with memory pressure detection
    this.cleanupInterval = setInterval(() => {
      if (!this.isShuttingDown) {
        this.cleanupCache();

        // Aggressive cleanup under memory pressure or when cache gets large
        if (this.indexCache.size > 3 || MemoryUtils.isMemoryPressure()) {
          this.aggressiveCleanup();
        }
      }
    }, 30000); // Clean up every 30 seconds (was 1 minute)
  }

  /**
   * Clean up cached indexes
   */
  private cleanupCache(): void {
    const cacheSize = this.indexCache.size;

    // Clear cache if it's getting large or under memory pressure
    if (
      cacheSize > this.MAX_INDEX_CACHE_SIZE ||
      MemoryUtils.isMemoryPressure()
    ) {
      this.indexCache.clear();
      logger.debug('Cleaned up file storage cache', {
        clearedEntries: cacheSize,
      });
    }
  }

  /**
   * Aggressive cleanup for memory pressure situations
   */
  private aggressiveCleanup(): void {
    const cacheSize = this.indexCache.size;
    const lockCount = FileLock.getLockCount();

    // Clear all caches
    this.indexCache.clear();

    // Clean up locks if there are too many
    if (lockCount > 10) {
      FileLock.cleanup().catch((error: unknown) => {
        logger.warn('Failed to cleanup locks during aggressive cleanup', {
          error,
        });
      });
    }

    logger.info('File storage aggressive cleanup completed', {
      clearedCacheEntries: cacheSize,
      activeLocks: lockCount,
    });
  }

  /**
   * Clean up file locks
   */
  private async cleanupLocks(): Promise<void> {
    const lockCount = FileLock.getLockCount();

    if (lockCount === 0) {
      return;
    }

    // Clean up any remaining locks
    await FileLock.cleanup();

    if (lockCount > 0) {
      logger.debug('Cleaned up file locks', { releasedLocks: lockCount });
    }
  }

  /**
   * Shutdown file storage and cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('FileStorageBackend shutting down');

    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    // Wait for locks to be released
    await this.cleanupLocks();

    // Clear caches
    this.indexCache.clear();

    logger.info('FileStorageBackend shutdown completed');
  }

  /**
   * Setup error recovery mechanisms
   */
  private setupErrorRecovery(): void {
    // Import errorHandler dynamically to avoid circular dependencies
    import('../../shared/errors/error-handler.js')
      .then(({ errorHandler }) => {
        // Listen for storage recovery events
        errorHandler.on(
          'storageRecovery',
          (event: { type: string; context: unknown; error: Error }): void => {
            void (async (): Promise<void> => {
              try {
                await this.handleStorageRecovery(event);
              } catch (error) {
                logger.error('Storage recovery failed', { event, error });
              }
            })();
          }
        );
      })
      .catch((error: unknown) => {
        logger.warn('Failed to setup error recovery', { error });
      });
  }

  /**
   * Handle storage recovery events
   */
  private async handleStorageRecovery(event: {
    type: string;
    context: unknown;
    error: Error;
  }): Promise<void> {
    logger.info('Handling storage recovery', { type: event.type });

    switch (event.type) {
      case 'file_not_found':
        await this.recoverMissingFile(event);
        break;
      case 'permission_error':
        await this.recoverPermissionError(event);
        break;
      case 'disk_space':
        await this.recoverDiskSpaceError(event);
        break;
      case 'lock_error':
        await this.recoverLockError(event);
        break;
      case 'corruption':
        await this.recoverCorruptionError(event);
        break;
      default:
        logger.warn('Unknown storage recovery type', { type: event.type });
    }
  }

  /**
   * Attempt to recover missing files from backups
   */
  private async recoverMissingFile(event: {
    context: unknown;
    error: Error;
  }): Promise<void> {
    const context = event.context as {
      operation?: string;
      metadata?: { key?: string };
    };
    const { operation } = context;

    if (
      typeof operation === 'string' &&
      operation.includes('load') &&
      context.metadata?.key !== undefined &&
      typeof context.metadata.key === 'string'
    ) {
      const { key } = context.metadata;
      // Look for backup files in the backups directory

      try {
        // Look for backup files
        const backupsDir = this.getBackupsDirectory();
        const files = await fs.readdir(backupsDir);
        const backupFiles = files.filter(
          f => f.startsWith(`${key}_`) && f.endsWith('.json')
        );

        if (backupFiles.length > 0) {
          // Use the most recent backup
          const mostRecent = backupFiles.sort().pop();
          if (typeof mostRecent !== 'string') {
            throw new Error('No backup files found after filtering');
          }
          const backupFilePath = join(backupsDir, mostRecent);
          const targetPath = this.getFilePath(key);

          await fs.copyFile(backupFilePath, targetPath);
          logger.info('Recovered file from backup', {
            key,
            backup: mostRecent,
          });
        }
      } catch (error) {
        logger.error('Failed to recover from backup', { key, error });
      }
    }
  }

  /**
   * Attempt to recover from permission errors
   */
  private async recoverPermissionError(_event: {
    context: unknown;
    error: Error;
  }): Promise<void> {
    // Event parameter is not used in this recovery method
    try {
      // Try to fix directory permissions
      await fs.chmod(this.config.dataDirectory, 0o755);
      await fs.chmod(this.getListsDirectory(), 0o755);
      await fs.chmod(this.getBackupsDirectory(), 0o755);
      await fs.chmod(this.getIndexesDirectory(), 0o755);

      logger.info('Attempted to fix directory permissions');
    } catch (error) {
      logger.error('Failed to fix permissions', { error });
    }
  }

  /**
   * Attempt to recover from disk space errors
   */
  private async recoverDiskSpaceError(_event: {
    context: unknown;
    error: Error;
  }): Promise<void> {
    // Event parameter is not used in this recovery method
    try {
      // Clean up old backup files
      await this.cleanupOldBackups();

      // Clean up temporary files
      const listsDir = this.getListsDirectory();
      const files = await fs.readdir(listsDir);
      const tempFiles = files.filter(
        f => f.endsWith('.tmp') || f.endsWith('.backup')
      );

      for (const tempFile of tempFiles) {
        try {
          await fs.unlink(join(listsDir, tempFile));
          logger.debug('Cleaned up temp file', { file: tempFile });
        } catch {
          // Ignore individual file cleanup errors
        }
      }

      logger.info('Attempted disk space cleanup', {
        cleanedFiles: tempFiles.length,
      });
    } catch (error) {
      logger.error('Failed to cleanup disk space', { error });
    }
  }

  /**
   * Attempt to recover from lock errors
   */
  private async recoverLockError(_event: {
    context: unknown;
    error: Error;
  }): Promise<void> {
    // Event parameter is not used in this recovery method
    try {
      // Clean up any stale locks
      await FileLock.cleanup();
      logger.info('Cleaned up file locks');
    } catch (error) {
      logger.error('Failed to cleanup locks', { error });
    }
  }

  /**
   * Attempt to recover from corruption errors
   */
  private async recoverCorruptionError(event: {
    context: unknown;
    error: Error;
  }): Promise<void> {
    const context = event.context as {
      operation?: string;
      metadata?: { key?: string };
    };
    const { operation } = context;

    if (
      typeof operation === 'string' &&
      operation.includes('load') &&
      context.metadata?.key !== undefined &&
      typeof context.metadata.key === 'string'
    ) {
      const { key } = context.metadata;

      try {
        // Try to recover from backup
        await this.recoverMissingFile(event);

        // If that fails, create a minimal valid file
        const filePath = this.getFilePath(key);
        if (!(await this.fileExists(filePath))) {
          const minimalList: TaskList = {
            id: key,
            title: 'Recovered List',
            description: 'This list was recovered from corruption',
            items: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            context: 'recovered',
            isArchived: false,
            totalItems: 0,
            completedItems: 0,
            progress: 0,
            analytics: {
              totalItems: 0,
              completedItems: 0,
              pendingItems: 0,
              inProgressItems: 0,
              blockedItems: 0,
              progress: 0,
              averageCompletionTime: 0,
              estimatedTimeRemaining: 0,
              velocityMetrics: {
                itemsPerDay: 0,
                completionRate: 0,
              },

              tagFrequency: {},
              dependencyGraph: [],
            },
            metadata: {},
            // v2 fields
            projectTag: 'recovered',
            implementationNotes: [],
          };

          await fs.writeFile(filePath, JSON.stringify(minimalList, null, 2));
          logger.info('Created minimal recovery file', { key });
        }
      } catch (error) {
        logger.error('Failed to recover from corruption', { key, error });
      }
    }
  }

  /**
   * Update in-memory context index for fast lookups
   */
  private updateInMemoryContextIndex(key: string, context: string): void {
    if (!this.contextIndex.has(context)) {
      this.contextIndex.set(context, new Set());
    }
    const contextSet = this.contextIndex.get(context);
    if (contextSet) {
      contextSet.add(key);
    }
  }

  /**
   * Remove from in-memory context index
   */
  private removeFromInMemoryContextIndex(key: string): void {
    for (const [context, listIds] of this.contextIndex.entries()) {
      if (listIds.has(key)) {
        listIds.delete(key);
        if (listIds.size === 0) {
          this.contextIndex.delete(context);
        }
      }
    }
  }

  /**
   * Update metadata cache for fast list operations
   */
  private updateMetadataCache(key: string, data: TaskList): void {
    const summary: TaskListSummary = {
      id: data.id,
      title: data.title,
      progress: data.progress,
      totalItems: data.totalItems,
      completedItems: data.completedItems,
      lastUpdated: new Date(data.updatedAt),
      context: data.context,
      projectTag: data.projectTag || data.context || 'default',
      isArchived: data.isArchived,
    };

    this.listMetadataCache.set(key, summary);

    // Evict old entries if cache is too large
    if (this.listMetadataCache.size > this.MAX_METADATA_CACHE_SIZE) {
      const oldestKey = this.listMetadataCache.keys().next().value;
      if (typeof oldestKey === 'string') {
        this.listMetadataCache.delete(oldestKey);
      }
    }
  }

  /**
   * Remove from metadata cache
   */
  private removeFromMetadataCache(key: string): void {
    this.listMetadataCache.delete(key);
  }

  /**
   * Load context index into memory for fast lookups
   */
  private async loadContextIndexIntoMemory(): Promise<void> {
    try {
      const contextIndexPath = join(
        this.getIndexesDirectory(),
        'by-context.json'
      );

      if (await this.fileExists(contextIndexPath)) {
        const indexData = await fs.readFile(contextIndexPath, 'utf8');
        const contextIndex = JSON.parse(indexData) as Record<string, string[]>;

        // Convert to in-memory format
        this.contextIndex.clear();
        for (const [context, listIds] of Object.entries(contextIndex)) {
          this.contextIndex.set(context, new Set(listIds));
        }

        logger.debug('Loaded context index into memory', {
          contexts: this.contextIndex.size,
        });
      }
    } catch (error) {
      logger.warn('Failed to load context index into memory', { error });
    }
  }

  async loadAllData(): Promise<
    import('../../shared/types/storage.js').StorageData
  > {
    const lists = await this.list({});
    const todoLists: TaskList[] = [];

    for (const summary of lists) {
      const list = await this.load(summary.id);
      if (list) {
        todoLists.push(list);
      }
    }

    return {
      version: '1.0',
      todoLists,
    };
  }

  async saveAllData(
    data: import('../../shared/types/storage.js').StorageData,
    options?: SaveOptions
  ): Promise<void> {
    for (const list of data.todoLists) {
      await this.save(list.id, list, options);
    }
  }
}
