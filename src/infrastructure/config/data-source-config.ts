/**
 * Data source configuration system for multi-source data delegation
 *
 * This module provides configuration management for pluggable storage backends,
 * supporting filesystem, PostgreSQL, MongoDB, and in-memory storage with
 * multi-source aggregation capabilities.
 */

import { z } from 'zod';

/**
 * Supported data source types
 */
export type DataSourceType = 'filesystem' | 'postgresql' | 'mongodb' | 'memory';

/**
 * Conflict resolution strategies for multi-source aggregation
 */
export type ConflictResolutionStrategy =
  | 'latest' // Use the most recently updated version
  | 'priority' // Use version from highest priority source
  | 'manual' // Require manual resolution
  | 'merge'; // Attempt to merge changes

/**
 * File system storage configuration
 */
export interface FileSystemConfig {
  dataDirectory: string;
  backupRetentionDays?: number | undefined;
  enableCompression?: boolean | undefined;
}

/**
 * PostgreSQL storage configuration
 */
export interface PostgreSQLConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | undefined;
  maxConnections?: number | undefined;
  connectionTimeout?: number | undefined;
  idleTimeout?: number | undefined;
}

/**
 * MongoDB storage configuration
 */
export interface MongoDBConfig {
  uri: string;
  database: string;
  collection?: string | undefined;
  maxPoolSize?: number | undefined;
  minPoolSize?: number | undefined;
  connectTimeout?: number | undefined;
  socketTimeout?: number | undefined;
}

/**
 * In-memory storage configuration
 */
export interface MemoryConfig {
  maxSize?: number | undefined;
  persistToDisk?: boolean | undefined;
  persistPath?: string | undefined;
}

/**
 * Data source configuration
 *
 * Defines a single data source with its connection parameters,
 * priority, access mode, and routing rules.
 */
export interface DataSourceConfig {
  /** Unique identifier for this data source */
  id: string;

  /** Display name for logging and UI */
  name: string;

  /** Type of storage backend */
  type: DataSourceType;

  /** Priority for conflict resolution (higher = preferred) */
  priority: number;

  /** Whether this source is read-only */
  readonly: boolean;

  /** Whether this source is currently enabled */
  enabled: boolean;

  /** Project tags for routing specific lists to this source */
  tags?: string[] | undefined;

  /** Type-specific configuration */
  config: FileSystemConfig | PostgreSQLConfig | MongoDBConfig | MemoryConfig;
}

/**
 * Multi-source configuration
 *
 * Defines how multiple data sources are aggregated and managed.
 */
export interface MultiSourceConfig {
  /** List of configured data sources */
  sources: DataSourceConfig[];

  /** Default conflict resolution strategy */
  conflictResolution: ConflictResolutionStrategy;

  /** Whether to enable multi-source aggregation */
  aggregationEnabled: boolean;

  /** Timeout for source operations (ms) */
  operationTimeout: number;

  /** Number of retries for failed operations */
  maxRetries: number;

  /** Whether to continue if some sources fail */
  allowPartialFailure: boolean;
}

/**
 * Zod schema for FileSystem configuration
 */
const FileSystemConfigSchema = z.object({
  dataDirectory: z.string().min(1),
  backupRetentionDays: z.number().int().positive().optional(),
  enableCompression: z.boolean().optional(),
});

/**
 * Zod schema for PostgreSQL configuration
 */
const PostgreSQLConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  database: z.string().min(1),
  user: z.string().min(1),
  password: z.string(),
  ssl: z.boolean().optional(),
  maxConnections: z.number().int().positive().optional(),
  connectionTimeout: z.number().int().positive().optional(),
  idleTimeout: z.number().int().positive().optional(),
});

/**
 * Zod schema for MongoDB configuration
 */
const MongoDBConfigSchema = z.object({
  uri: z.string().min(1),
  database: z.string().min(1),
  collection: z.string().optional(),
  maxPoolSize: z.number().int().positive().optional(),
  minPoolSize: z.number().int().nonnegative().optional(),
  connectTimeout: z.number().int().positive().optional(),
  socketTimeout: z.number().int().positive().optional(),
});

/**
 * Zod schema for Memory configuration
 */
const MemoryConfigSchema = z.object({
  maxSize: z.number().int().positive().optional(),
  persistToDisk: z.boolean().optional(),
  persistPath: z.string().optional(),
});

/**
 * Zod schema for DataSourceConfig
 */
const DataSourceConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['filesystem', 'postgresql', 'mongodb', 'memory']),
  priority: z.number().int().nonnegative(),
  readonly: z.boolean(),
  enabled: z.boolean(),
  tags: z.array(z.string()).optional(),
  config: z.union([
    FileSystemConfigSchema,
    PostgreSQLConfigSchema,
    MongoDBConfigSchema,
    MemoryConfigSchema,
  ]),
});

/**
 * Zod schema for MultiSourceConfig
 */
const MultiSourceConfigSchema = z.object({
  sources: z.array(DataSourceConfigSchema).min(1),
  conflictResolution: z.enum(['latest', 'priority', 'manual', 'merge']),
  aggregationEnabled: z.boolean(),
  operationTimeout: z.number().int().positive(),
  maxRetries: z.number().int().nonnegative(),
  allowPartialFailure: z.boolean(),
});

/**
 * Validate a data source configuration
 *
 * @param config - Configuration to validate
 * @returns Validated configuration
 * @throws ZodError if validation fails
 */
export function validateDataSourceConfig(config: unknown): DataSourceConfig {
  return DataSourceConfigSchema.parse(config);
}

/**
 * Validate a multi-source configuration
 *
 * @param config - Configuration to validate
 * @returns Validated configuration
 * @throws ZodError if validation fails
 */
export function validateMultiSourceConfig(config: unknown): MultiSourceConfig {
  return MultiSourceConfigSchema.parse(config);
}

/**
 * Get default multi-source configuration
 *
 * Provides sensible defaults for single file-based storage.
 */
export function getDefaultMultiSourceConfig(): MultiSourceConfig {
  return {
    sources: [
      {
        id: 'default-file',
        name: 'Default File Storage',
        type: 'filesystem',
        priority: 100,
        readonly: false,
        enabled: true,
        tags: undefined,
        config: {
          dataDirectory: './data',
          backupRetentionDays: 7,
          enableCompression: false,
        },
      },
    ],
    conflictResolution: 'latest',
    aggregationEnabled: false,
    operationTimeout: 30000,
    maxRetries: 3,
    allowPartialFailure: true,
  };
}

/**
 * Export schemas for external use
 */
export const schemas = {
  FileSystemConfig: FileSystemConfigSchema,
  PostgreSQLConfig: PostgreSQLConfigSchema,
  MongoDBConfig: MongoDBConfigSchema,
  MemoryConfig: MemoryConfigSchema,
  DataSourceConfig: DataSourceConfigSchema,
  MultiSourceConfig: MultiSourceConfigSchema,
};
