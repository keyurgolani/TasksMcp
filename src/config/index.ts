/**
 * Configuration management for MCP Task Manager
 */

import { z } from 'zod';
import {
  StorageFactory,
  type StorageConfiguration,
} from '../storage/storage-factory.js';
import { logger } from '../utils/logger.js';

// Custom boolean parser for environment variables
const booleanFromString = z
  .string()
  .transform(val => {
    if (val === 'true' || val === '1') return true;
    if (val === 'false' || val === '0') return false;
    return val; // Let zod handle the error
  })
  .pipe(z.boolean());

// Environment validation schema
const EnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  STORAGE_TYPE: z.enum(['memory', 'file', 'postgresql']).default('file'),
  DATA_DIRECTORY: z.string().default('./data'),
  BACKUP_RETENTION_DAYS: z.coerce.number().int().positive().default(7),
  ENABLE_COMPRESSION: booleanFromString.default('false'),
  MAX_LISTS_PER_CONTEXT: z.coerce.number().int().positive().default(100),
  MAX_ITEMS_PER_LIST: z.coerce.number().int().positive().default(1000),

  // Health check configuration
  HEALTH_CHECK_ENABLED: booleanFromString.default('true'),
  HEALTH_CHECK_INTERVAL: z.coerce.number().int().positive().default(30000),

  // Monitoring configuration
  METRICS_ENABLED: booleanFromString.default('false'),
  METRICS_PORT: z.coerce.number().int().positive().default(9090),

  // Backup configuration
  BACKUP_ENABLED: booleanFromString.default('true'),
  BACKUP_SCHEDULE: z.string().default('0 2 * * *'), // Daily at 2 AM
  BACKUP_MAX_FILES: z.coerce.number().int().positive().default(30),

  // PostgreSQL configuration (optional)
  POSTGRES_HOST: z.string().optional(),
  POSTGRES_PORT: z.coerce.number().int().positive().optional(),
  POSTGRES_DB: z.string().optional(),
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_SSL: z
    .string()
    .optional()
    .transform(val => {
      if (val === undefined) return false;
      if (val === 'true' || val === '1') return true;
      if (val === 'false' || val === '0') return false;
      throw new Error('Invalid boolean value');
    }),
  POSTGRES_MAX_CONNECTIONS: z.coerce.number().int().positive().default(10),

  // Security configuration
  RATE_LIMIT_ENABLED: booleanFromString.default('true'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),

  // Logging configuration
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug', 'silent'])
    .default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),
  LOG_FILE_ENABLED: booleanFromString.default('true'),
  LOG_FILE_PATH: z.string().default('./logs/combined.log'),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

export interface ServerConfig {
  environment: Environment;
  storage: StorageConfiguration;
  server: {
    name: string;
    version: string;
    nodeEnv: string;
  };
  features: {
    maxListsPerContext: number;
    maxItemsPerList: number;
  };
  health: {
    enabled: boolean;
    interval: number;
  };
  monitoring: {
    enabled: boolean;
    port: number;
    performanceInterval?: number;
    memoryInterval?: number;
    metricsRetention?: number;
    alerting?: {
      enabled: boolean;
      escalationTime: number;
      cooldownTime: number;
    };
  };
  backup: {
    enabled: boolean;
    schedule: string;
    maxFiles: number;
    retentionDays: number;
  };
  security: {
    rateLimit: {
      enabled: boolean;
      windowMs: number;
      maxRequests: number;
    };
  };
  logging: {
    level: string;
    format: string;
    fileEnabled: boolean;
    filePath: string;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: ServerConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (ConfigManager.instance === undefined) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  getConfig(): ServerConfig {
    return this.config;
  }

  getStorageConfig(): StorageConfiguration {
    return this.config.storage;
  }

  getEnvironment(): Environment {
    return this.config.environment;
  }

  private loadConfig(): ServerConfig {
    // Validate environment variables
    const env = this.validateEnvironment();

    // Build storage configuration
    const storageConfig = this.buildStorageConfig(env);

    // Validate storage configuration
    StorageFactory.validateConfig(storageConfig);

    const config: ServerConfig = {
      environment: env,
      storage: storageConfig,
      server: {
        name: 'task-list-mcp',
        version: '1.0.0',
        nodeEnv: env.NODE_ENV,
      },
      features: {
        maxListsPerContext: env.MAX_LISTS_PER_CONTEXT,
        maxItemsPerList: env.MAX_ITEMS_PER_LIST,
      },
      health: {
        enabled: env.HEALTH_CHECK_ENABLED,
        interval: env.HEALTH_CHECK_INTERVAL,
      },
      monitoring: {
        enabled: env.METRICS_ENABLED,
        port: env.METRICS_PORT,
      },
      backup: {
        enabled: env.BACKUP_ENABLED,
        schedule: env.BACKUP_SCHEDULE,
        maxFiles: env.BACKUP_MAX_FILES,
        retentionDays: env.BACKUP_RETENTION_DAYS,
      },
      security: {
        rateLimit: {
          enabled: env.RATE_LIMIT_ENABLED,
          windowMs: env.RATE_LIMIT_WINDOW_MS,
          maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
        },
      },
      logging: {
        level: env.LOG_LEVEL,
        format: env.LOG_FORMAT,
        fileEnabled: env.LOG_FILE_ENABLED,
        filePath: env.LOG_FILE_PATH,
      },
    };

    logger.info('Configuration loaded successfully', {
      nodeEnv: config.server.nodeEnv,
      storageType: config.storage.type,
      dataDirectory: this.getDataDirectory(config.storage),
      healthEnabled: config.health.enabled,
      backupEnabled: config.backup.enabled,
      metricsEnabled: config.monitoring.enabled,
    });

    return config;
  }

  private validateEnvironment(): Environment {
    try {
      return EnvironmentSchema.parse(process.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
        throw new Error(`Configuration validation failed: ${issues}`);
      }
      throw error;
    }
  }

  private buildStorageConfig(env: Environment): StorageConfiguration {
    switch (env.STORAGE_TYPE) {
      case 'memory':
        return { type: 'memory' };

      case 'file':
        return {
          type: 'file',
          file: {
            dataDirectory: env.DATA_DIRECTORY,
            backupRetentionDays: env.BACKUP_RETENTION_DAYS,
            enableCompression: env.ENABLE_COMPRESSION,
          },
        };

      case 'postgresql':
        if (
          env.POSTGRES_HOST == null ||
          env.POSTGRES_DB == null ||
          env.POSTGRES_USER == null ||
          env.POSTGRES_PASSWORD == null
        ) {
          throw new Error(
            'PostgreSQL configuration incomplete. Required: POSTGRES_HOST, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD'
          );
        }
        return {
          type: 'postgresql',
          postgresql: {
            host: env.POSTGRES_HOST,
            port: env.POSTGRES_PORT ?? 5432,
            database: env.POSTGRES_DB,
            user: env.POSTGRES_USER,
            password: env.POSTGRES_PASSWORD,
            ssl: env.POSTGRES_SSL,
            maxConnections: env.POSTGRES_MAX_CONNECTIONS,
          },
        };

      default:
        throw new Error(
          `Unsupported storage type: ${String(env.STORAGE_TYPE)}`
        );
    }
  }

  private getDataDirectory(storage: StorageConfiguration): string {
    if (storage.type === 'file' && storage.file) {
      return storage.file.dataDirectory;
    }
    return 'N/A';
  }

  // Method to reload configuration (useful for testing)
  reload(): void {
    this.config = this.loadConfig();
  }

  // Validate configuration without loading
  static validateEnvironment(): Environment {
    return EnvironmentSchema.parse(process.env);
  }
}
