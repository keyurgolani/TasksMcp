/**
 * Configuration management for MCP Task Manager
 */

import { z } from 'zod';
import {
  StorageFactory,
  type StorageConfiguration,
} from '../storage/storage-factory.js';
import { logger } from '../../shared/utils/logger.js';
import { baseConfig } from './base.js';

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


  
  // Feature-specific configuration
  MAX_ACTION_PLAN_STEPS: z.coerce.number().int().positive().default(250),
  MAX_IMPLEMENTATION_NOTES_PER_ENTITY: z.coerce.number().int().positive().default(500),
  MAX_NOTE_LENGTH: z.coerce.number().int().positive().default(50000),
  CLEANUP_SUGGESTION_DAYS: z.coerce.number().int().positive().default(7),
  CLEANUP_SUGGESTION_COOLDOWN_DAYS: z.coerce.number().int().positive().default(30),
  PRETTY_PRINT_MAX_WIDTH: z.coerce.number().int().positive().default(120),
  PROJECT_TAG_MAX_LENGTH: z.coerce.number().int().positive().default(250),
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
  // Enhanced features are now always enabled - configuration for limits only
  limits: {
    maxActionPlanSteps: number;
    maxImplementationNotesPerEntity: number;
    maxNoteLength: number;
    prettyPrintMaxWidth: number;
    cleanupSuggestionDays: number;
    cleanupSuggestionCooldownDays: number;
    projectTagMaxLength: number;
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

  /**
   * Load and validate complete server configuration
   * 
   * Orchestrates the configuration loading process by:
   * 1. Validating environment variables against schema
   * 2. Building storage-specific configuration
   * 3. Assembling complete server configuration with defaults
   * 
   * @returns ServerConfig - Complete validated server configuration
   * @throws Error - If configuration validation fails
   */
  private loadConfig(): ServerConfig {
    // Step 1: Validate and parse environment variables using Zod schema
    const env = this.validateEnvironment();

    // Step 2: Build storage-specific configuration based on storage type
    const storageConfig = this.buildStorageConfig(env);

    // Step 3: Validate storage configuration for consistency and completeness
    StorageFactory.validateConfig(storageConfig);

    const config: ServerConfig = {
      environment: env,
      storage: storageConfig,
      server: {
        name: baseConfig.server.name,
        version: baseConfig.server.version,
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
      // Enhanced features are now always enabled - configuration for limits only
      limits: {
        maxActionPlanSteps: env.MAX_ACTION_PLAN_STEPS,
        maxImplementationNotesPerEntity: env.MAX_IMPLEMENTATION_NOTES_PER_ENTITY,
        maxNoteLength: env.MAX_NOTE_LENGTH,
        prettyPrintMaxWidth: env.PRETTY_PRINT_MAX_WIDTH,
        cleanupSuggestionDays: env.CLEANUP_SUGGESTION_DAYS,
        cleanupSuggestionCooldownDays: env.CLEANUP_SUGGESTION_COOLDOWN_DAYS,
        projectTagMaxLength: env.PROJECT_TAG_MAX_LENGTH,
      },
    };

    // Only log configuration in non-MCP mode to avoid interfering with stdio protocol
    const isMcpMode = this.isMcpMode();
    if (!isMcpMode) {
      logger.info('Configuration loaded successfully', {
        nodeEnv: config.server.nodeEnv,
        storageType: config.storage.type,
        dataDirectory: this.getDataDirectory(config.storage),
        healthEnabled: config.health.enabled,
        backupEnabled: config.backup.enabled,
        metricsEnabled: config.monitoring.enabled,

      });
    }

    return config;
  }

  /**
   * Validate environment variables against schema
   * 
   * Uses Zod schema validation to ensure all required environment variables
   * are present and have valid values. Provides detailed error messages
   * for configuration issues.
   * 
   * @returns Environment - Validated environment configuration
   * @throws Error - If environment validation fails with detailed error messages
   */
  private validateEnvironment(): Environment {
    try {
      return EnvironmentSchema.parse(process.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format validation errors for better debugging
        const issues = error.issues
          .map(issue => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
        throw new Error(`Configuration validation failed: ${issues}`);
      }
      throw error;
    }
  }

  /**
   * Build storage configuration based on environment settings
   * 
   * Creates storage-specific configuration objects based on the selected storage type.
   * Validates required parameters for each storage type and provides appropriate defaults.
   * 
   * @param env - Validated environment configuration
   * @returns StorageConfiguration - Storage configuration for the selected backend
   * @throws Error - If required storage parameters are missing
   */
  private buildStorageConfig(env: Environment): StorageConfiguration {
    switch (env.STORAGE_TYPE) {
      case 'memory':
        // Memory storage: No additional configuration needed
        return { type: 'memory' };

      case 'file':
        // File storage: Configure directory and backup settings
        return {
          type: 'file',
          file: {
            dataDirectory: env.DATA_DIRECTORY,
            backupRetentionDays: env.BACKUP_RETENTION_DAYS,
            enableCompression: env.ENABLE_COMPRESSION,
          },
        };

      case 'postgresql':
        // PostgreSQL storage: Validate required connection parameters
        this.validatePostgreSQLConfig(env);
        
        return {
          type: 'postgresql',
          postgresql: {
            host: env.POSTGRES_HOST || 'localhost',
            port: env.POSTGRES_PORT ?? 5432, // Default PostgreSQL port
            database: env.POSTGRES_DB || 'task_manager',
            user: env.POSTGRES_USER || 'postgres',
            password: env.POSTGRES_PASSWORD || '',
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

  /**
   * Validate PostgreSQL configuration parameters
   * 
   * @param env - Environment configuration to validate
   * @throws Error - If required PostgreSQL parameters are missing
   */
  private validatePostgreSQLConfig(env: Environment): void {
    const requiredParams = ['POSTGRES_HOST', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'];
    const missingParams = requiredParams.filter(param => {
      const value = env[param as keyof Environment];
      return value == null || (typeof value === 'string' && value.trim() === '');
    });

    if (missingParams.length > 0) {
      throw new Error(
        `PostgreSQL configuration incomplete. Missing required parameters: ${missingParams.join(', ')}`
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

  /**
   * Detect if running in MCP mode (stdio communication)
   * MCP servers should not log to console as it interferes with protocol communication
   */
  private isMcpMode(): boolean {
    // Check if running with CLI flags that indicate non-MCP mode
    const args = process.argv.slice(2);
    const hasCliFlags = args.some(arg => 
      arg === '--help' || arg === '-h' || 
      arg === '--version' || arg === '-v' ||
      arg === '--verbose' || arg === '--quiet'
    );
    
    // If no CLI flags and not explicitly disabled, assume MCP mode
    return !hasCliFlags && process.env['MCP_DISABLE_STDIO_MODE'] !== 'true';
  }

  // Validate configuration without loading
  static validateEnvironment(): Environment {
    return EnvironmentSchema.parse(process.env);
  }
}
