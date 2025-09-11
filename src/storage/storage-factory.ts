/**
 * Factory for creating storage backend instances
 */

import type { StorageBackend } from '../types/storage.js';
import { MemoryStorageBackend } from './memory-storage.js';
import { FileStorageBackend, type FileStorageConfig } from './file-storage.js';
import { logger } from '../utils/logger.js';

export type StorageType = 'memory' | 'file' | 'postgresql';

export interface PostgreSQLStorageConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
}

export interface StorageConfiguration {
  type: StorageType;
  file?: FileStorageConfig;
  postgresql?: PostgreSQLStorageConfig;
}

export class StorageFactory {
  static async createStorage(
    config: StorageConfiguration
  ): Promise<StorageBackend> {
    logger.info('Creating storage backend', { type: config.type });

    let backend: StorageBackend;

    switch (config.type) {
      case 'memory':
        backend = new MemoryStorageBackend();
        break;

      case 'file':
        if (!config.file) {
          throw new Error(
            'File storage configuration is required when type is "file"'
          );
        }
        backend = new FileStorageBackend(config.file);
        break;

      case 'postgresql':
        if (!config.postgresql) {
          throw new Error(
            'PostgreSQL storage configuration is required when type is "postgresql"'
          );
        }
        // For now, fall back to file storage as PostgreSQL implementation is not complete
        logger.warn(
          'PostgreSQL storage not implemented, falling back to file storage'
        );
        backend = new FileStorageBackend({
          dataDirectory: './data',
          backupRetentionDays: 7,
          enableCompression: false,
        });
        break;

      default:
        throw new Error(`Unsupported storage type: ${String(config.type)}`);
    }

    // Initialize the storage backend
    if (typeof backend.initialize === 'function') {
      await backend.initialize();
    }

    return backend;
  }

  // Keep backward compatibility
  static async create(config: StorageConfiguration): Promise<StorageBackend> {
    return this.createStorage(config);
  }

  // Synchronous version for backward compatibility (deprecated)
  static createStorageSync(config: StorageConfiguration): StorageBackend {
    logger.warn(
      'Using deprecated createStorageSync - consider using async createStorage instead'
    );

    switch (config.type) {
      case 'memory':
        return new MemoryStorageBackend();

      case 'file':
        if (!config.file) {
          throw new Error(
            'File storage configuration is required when type is "file"'
          );
        }
        return new FileStorageBackend(config.file);

      case 'postgresql':
        if (!config.postgresql) {
          throw new Error(
            'PostgreSQL storage configuration is required when type is "postgresql"'
          );
        }
        // For now, fall back to file storage as PostgreSQL implementation is not complete
        logger.warn(
          'PostgreSQL storage not implemented, falling back to file storage'
        );
        return new FileStorageBackend({
          dataDirectory: './data',
          backupRetentionDays: 7,
          enableCompression: false,
        });

      default:
        throw new Error(`Unsupported storage type: ${String(config.type)}`);
    }
  }

  static getDefaultConfig(): StorageConfiguration {
    return {
      type: 'file',
      file: {
        dataDirectory: './data',
        backupRetentionDays: 7,
        enableCompression: false,
      },
    };
  }

  static validateConfig(config: StorageConfiguration): void {
    if (!config.type) {
      throw new Error('Storage type is required');
    }

    if (!['memory', 'file', 'postgresql'].includes(config.type)) {
      throw new Error(`Invalid storage type: ${config.type}`);
    }

    if (config.type === 'file') {
      if (!config.file) {
        throw new Error('File storage configuration is required');
      }

      if (!config.file.dataDirectory) {
        throw new Error('Data directory is required for file storage');
      }

      if (
        config.file.backupRetentionDays !== undefined &&
        config.file.backupRetentionDays < 0
      ) {
        throw new Error('Backup retention days must be non-negative');
      }
    }
  }
}
