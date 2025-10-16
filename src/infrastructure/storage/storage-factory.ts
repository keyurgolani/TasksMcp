/**
 * Factory for creating storage backend instances
 */

import { LOGGER } from '../../shared/utils/logger.js';

import { FileStorageBackend, type FileStorageConfig } from './file-storage.js';
import { MemoryStorageBackend } from './memory-storage.js';

import type { StorageBackend } from '../../shared/types/storage.js';

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
  /**
   * Create and initialize a storage backend instance
   *
   * Factory method that creates the appropriate storage backend based on configuration.
   * Handles initialization and validation of storage backends.
   *
   * @param config - Storage configuration specifying type and parameters
   * @returns Promise<StorageBackend> - Initialized storage backend instance
   * @throws Error - If storage type is unsupported or configuration is invalid
   */
  static async createStorage(
    config: StorageConfiguration
  ): Promise<StorageBackend> {
    LOGGER.info('Creating storage backend', { type: config.type });

    let backend: StorageBackend;

    switch (config.type) {
      case 'memory':
        // In-memory storage for development and testing
        backend = new MemoryStorageBackend();
        break;

      case 'file':
        // File-based storage for production use
        if (!config.file) {
          throw new Error(
            'File storage configuration is required when type is "file"'
          );
        }
        backend = new FileStorageBackend(config.file);
        break;

      case 'postgresql':
        // PostgreSQL storage for enterprise deployments
        if (!config.postgresql) {
          throw new Error(
            'PostgreSQL storage configuration is required when type is "postgresql"'
          );
        }
        // PostgreSQL storage backend is not implemented in this version
        // Fall back to file storage for compatibility
        LOGGER.warn(
          'PostgreSQL storage not implemented, falling back to file storage'
        );
        backend = new FileStorageBackend({
          dataDirectory: './data',
          backupRetentionDays: 7,
          enableCompression: false,
        });
        break;

      default:
        throw new Error(
          `Unsupported storage type: "${String(
            config.type
          )}". Supported types are: memory, file, postgresql`
        );
    }

    // Initialize the storage backend if it supports initialization
    if (typeof backend.initialize === 'function') {
      await backend.initialize();
      LOGGER.info('Storage backend initialized successfully', {
        type: config.type,
      });
    }

    return backend;
  }

  /**
   * Legacy method for backward compatibility
   *
   * This method is maintained for backward compatibility with existing code.
   * New implementations should use createStorage() for better clarity and consistency.
   *
   * @deprecated Use createStorage() instead - this method will be removed in v2.0
   * @param config - Storage configuration specifying type and parameters
   * @returns Promise<StorageBackend> - Initialized storage backend instance
   */
  static async create(config: StorageConfiguration): Promise<StorageBackend> {
    LOGGER.warn(
      'Using deprecated StorageFactory.create() method. Please migrate to createStorage()'
    );
    return this.createStorage(config);
  }

  /**
   * Synchronous storage creation (deprecated)
   *
   * Creates storage backend synchronously without proper initialization.
   * This method is deprecated and should not be used in new code.
   *
   * @deprecated Use async createStorage() instead for proper initialization
   * @param config - Storage configuration
   * @returns StorageBackend - Storage backend instance (not initialized)
   */
  static createStorageSync(config: StorageConfiguration): StorageBackend {
    LOGGER.warn(
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
        LOGGER.warn(
          'PostgreSQL storage not implemented, falling back to file storage'
        );
        return new FileStorageBackend({
          dataDirectory: './data',
          backupRetentionDays: 7,
          enableCompression: false,
        });

      default:
        throw new Error(
          `Unsupported storage type: "${String(
            config.type
          )}". Supported types are: memory, file, postgresql`
        );
    }
  }

  /**
   * Get default storage configuration
   *
   * Provides sensible defaults for file-based storage suitable for most deployments.
   *
   * @returns StorageConfiguration - Default file storage configuration
   */
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

  /**
   * Validate storage configuration for completeness and correctness
   *
   * Performs validation of storage configuration to ensure
   * all required parameters are present and valid.
   *
   * @param config - Storage configuration to validate
   * @throws Error - If configuration is invalid or incomplete
   */
  static validateConfig(config: StorageConfiguration): void {
    // Validate storage type is specified
    if (!config.type) {
      throw new Error('Storage type is required');
    }

    // Validate storage type is supported
    if (!['memory', 'file', 'postgresql'].includes(config.type)) {
      throw new Error(`Invalid storage type: ${config.type}`);
    }

    // Validate file storage specific configuration
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

    // PostgreSQL configuration validation will be added when PostgreSQL backend is implemented
  }
}
