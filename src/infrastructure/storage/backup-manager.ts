/**
 * Backup and recovery system for MCP Task Manager
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { ConfigManager } from '../config/index.js';
import { StorageFactory } from '../storage/storage-factory.js';
import { logger } from '../../shared/utils/logger.js';
import type { TodoList } from '../../shared/types/todo.js';
import type { StorageBackend } from '../../shared/types/storage.js';

export interface BackupMetadata {
  id: string;
  timestamp: string;
  type: 'full' | 'incremental';
  size: number;
  itemCount: number;
  listCount: number;
  checksum: string;
  version: string;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  metadata: BackupMetadata;
  duration: number;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  restoredLists: number;
  restoredItems: number;
  duration: number;
  error?: string;
}

export class BackupManager {
  private readonly config = ConfigManager.getInstance().getConfig();
  private storage: StorageBackend | null = null;

  private async getStorage(): Promise<StorageBackend> {
    if (!this.storage) {
      this.storage = await StorageFactory.createStorage(this.config.storage);
    }
    return this.storage;
  }

  async createBackup(
    type: 'full' | 'incremental' = 'full'
  ): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = `${type}-${new Date().toISOString().replace(/[:.]/g, '-')}`;

    try {
      logger.info('Starting backup', { type, backupId });

      const storage = await this.getStorage();

      // Get all todo lists
      const lists = await storage.list();
      const allLists: TodoList[] = [];

      for (const summary of lists) {
        const list = await storage.load(summary.id);
        if (list) {
          allLists.push(list);
        }
      }

      // Create backup data
      const backupData = {
        metadata: {
          id: backupId,
          timestamp: new Date().toISOString(),
          type,
          version: this.config.server.version,
          environment: this.config.server.nodeEnv,
        },
        lists: allLists,
      };

      // Calculate statistics
      const totalItems = allLists.reduce(
        (sum, list) => sum + list.items.length,
        0
      );
      const backupJson = JSON.stringify(backupData, null, 2);
      const checksum = await this.calculateChecksum(backupJson);

      // Save backup file
      const backupPath = this.getBackupPath(backupId);
      await this.ensureBackupDirectory(dirname(backupPath));
      await fs.writeFile(backupPath, backupJson, 'utf8');

      // Create metadata
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp: backupData.metadata.timestamp,
        type,
        size: backupJson.length,
        itemCount: totalItems,
        listCount: allLists.length,
        checksum,
        version: this.config.server.version,
      };

      // Save metadata file
      const metadataPath = backupPath.replace('.json', '.meta.json');
      await fs.writeFile(
        metadataPath,
        JSON.stringify(metadata, null, 2),
        'utf8'
      );

      const duration = Date.now() - startTime;

      logger.info('Backup completed successfully', {
        backupId,
        type,
        listCount: allLists.length,
        itemCount: totalItems,
        size: metadata.size,
        duration,
      });

      // Clean up old backups
      await this.cleanupOldBackups();

      return {
        success: true,
        backupId,
        metadata,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error('Backup failed', {
        backupId,
        type,
        error: errorMessage,
        duration,
      });

      return {
        success: false,
        backupId,
        metadata: {
          id: backupId,
          timestamp: new Date().toISOString(),
          type,
          size: 0,
          itemCount: 0,
          listCount: 0,
          checksum: '',
          version: this.config.server.version,
        },
        duration,
        error: errorMessage,
      };
    }
  }

  async restoreBackup(backupId: string): Promise<RestoreResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting restore', { backupId });

      // Load backup file
      const backupPath = this.getBackupPath(backupId);
      const backupContent = await fs.readFile(backupPath, 'utf8');
      const backupData = JSON.parse(backupContent) as Record<string, unknown>;

      // Verify backup integrity
      const checksum = await this.calculateChecksum(backupContent);
      const metadataPath = backupPath.replace('.json', '.meta.json');

      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataContent) as BackupMetadata;

        if (metadata.checksum !== checksum) {
          throw new Error('Backup integrity check failed - checksum mismatch');
        }
      } catch (metaError) {
        logger.warn('Could not verify backup integrity', {
          backupId,
          error: metaError,
        });
      }

      // Clear existing data (create backup first)
      const currentBackupResult = await this.createBackup('incremental');
      if (!currentBackupResult.success) {
        throw new Error('Failed to create safety backup before restore');
      }

      // Restore lists
      const lists = (backupData['lists'] as TodoList[]) ?? [];
      let restoredLists = 0;
      let restoredItems = 0;

      const storage = await this.getStorage();

      for (const list of lists) {
        try {
          await storage.save(list.id, list);
          restoredLists++;
          restoredItems += list.items.length;
        } catch (error) {
          logger.warn('Failed to restore list', {
            listId: list.id,
            title: list.title,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      const duration = Date.now() - startTime;

      logger.info('Restore completed successfully', {
        backupId,
        restoredLists,
        restoredItems,
        duration,
        safetyBackup: currentBackupResult.backupId,
      });

      return {
        success: true,
        restoredLists,
        restoredItems,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      logger.error('Restore failed', {
        backupId,
        error: errorMessage,
        duration,
      });

      return {
        success: false,
        restoredLists: 0,
        restoredItems: 0,
        duration,
        error: errorMessage,
      };
    }
  }

  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const backupDir = this.getBackupDirectory();

      try {
        await fs.access(backupDir);
      } catch {
        return []; // No backup directory exists
      }

      const files = await fs.readdir(backupDir);
      const metadataFiles = files.filter(file => file.endsWith('.meta.json'));

      const backups: BackupMetadata[] = [];

      for (const metaFile of metadataFiles) {
        try {
          const metaPath = join(backupDir, metaFile);
          const content = await fs.readFile(metaPath, 'utf8');
          const metadata = JSON.parse(content) as BackupMetadata;
          backups.push(metadata);
        } catch (error) {
          logger.warn('Failed to read backup metadata', {
            file: metaFile,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Sort by timestamp (newest first)
      return backups.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      logger.error('Failed to list backups', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const backupPath = this.getBackupPath(backupId);
      const metadataPath = backupPath.replace('.json', '.meta.json');

      // Delete backup file
      try {
        await fs.unlink(backupPath);
      } catch (error) {
        logger.warn('Failed to delete backup file', { backupPath, error });
      }

      // Delete metadata file
      try {
        await fs.unlink(metadataPath);
      } catch (error) {
        logger.warn('Failed to delete metadata file', { metadataPath, error });
      }

      logger.info('Backup deleted', { backupId });
      return true;
    } catch (error) {
      logger.error('Failed to delete backup', {
        backupId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    if (!this.config.backup.enabled) {
      return;
    }

    try {
      const backups = await this.listBackups();
      const maxBackups = this.config.backup.maxFiles;
      const { retentionDays } = this.config.backup;
      const cutoffDate = new Date(
        Date.now() - retentionDays * 24 * 60 * 60 * 1000
      );

      // Delete backups that exceed the maximum count
      if (backups.length > maxBackups) {
        const toDelete = backups.slice(maxBackups);
        for (const backup of toDelete) {
          await this.deleteBackup(backup.id);
        }
        logger.info('Cleaned up excess backups', { deleted: toDelete.length });
      }

      // Delete backups older than retention period
      const oldBackups = backups.filter(
        backup => new Date(backup.timestamp) < cutoffDate
      );
      for (const backup of oldBackups) {
        await this.deleteBackup(backup.id);
      }

      if (oldBackups.length > 0) {
        logger.info('Cleaned up old backups', { deleted: oldBackups.length });
      }
    } catch (error) {
      logger.error('Failed to cleanup old backups', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private getBackupDirectory(): string {
    const baseDir =
      this.config.storage.type === 'file' && this.config.storage.file
        ? this.config.storage.file.dataDirectory
        : './data';

    return join(baseDir, 'backups');
  }

  private getBackupPath(backupId: string): string {
    const backupDir = this.getBackupDirectory();
    return join(backupDir, `${backupId}.json`);
  }

  private async ensureBackupDirectory(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create backup directory', {
        directory: dir,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async calculateChecksum(content: string): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }
}

// Scheduled backup functionality
export class ScheduledBackupManager {
  private readonly backupManager = new BackupManager();
  private readonly config = ConfigManager.getInstance().getConfig();
  private intervalId: NodeJS.Timeout | null = null;

  start(): void {
    if (!this.config.backup.enabled) {
      logger.info('Scheduled backups disabled');
      return;
    }

    // For simplicity, run backup every hour in production
    // In a real implementation, you'd use a proper cron scheduler
    const interval =
      this.config.server.nodeEnv === 'production'
        ? 60 * 60 * 1000
        : 5 * 60 * 1000; // 1 hour or 5 minutes

    this.intervalId = setInterval((): void => {
      void (async (): Promise<void> => {
        try {
          logger.info('Running scheduled backup');
          const result = await this.backupManager.createBackup('incremental');

          if (result.success) {
            logger.info('Scheduled backup completed', {
              backupId: result.backupId,
              duration: result.duration,
            });
          } else {
            logger.error('Scheduled backup failed', {
              error: result.error,
            });
          }
        } catch (error) {
          logger.error('Scheduled backup error', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      })();
    }, interval);

    logger.info('Scheduled backup started', {
      interval: interval / 1000 / 60, // minutes
      enabled: this.config.backup.enabled,
    });
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Scheduled backup stopped');
    }
  }
}
