/**
 * Application Initialization Module
 *
 * Handles initialization of the data delegation layer including:
 * - DataSourceRouter configuration and setup
 * - MultiSourceAggregator creation
 * - TaskListRepository instantiation
 * - Health checks for all configured sources
 *
 * This module provides a clean separation between configuration loading
 * and application startup, making it easier to test and maintain.
 */

import { TaskListRepository } from '../domain/repositories/task-list-repository-impl.js';
import {
  getDefaultMultiSourceConfig,
  type MultiSourceConfig,
  type DataSourceConfig,
} from '../infrastructure/config/data-source-config.js';
import { DATA_SOURCE_CONFIG_LOADER } from '../infrastructure/config/data-source-loader.js';
import {
  DataSourceRouter,
  type DataSourceConfig as RouterDataSourceConfig,
} from '../infrastructure/storage/data-source-router.js';
import { MultiSourceAggregator } from '../infrastructure/storage/multi-source-aggregator.js';
import { LOGGER } from '../shared/utils/logger.js';

import type { StorageConfiguration } from '../infrastructure/storage/storage-factory.js';

/**
 * Initialization options
 */
export interface InitializationOptions {
  /** Path to data source configuration file */
  configPath?: string;

  /** Whether to use environment variables for configuration */
  useEnvironment?: boolean;

  /** Whether to require a configuration file */
  requireConfigFile?: boolean;

  /** Fallback to single storage configuration if multi-source config not found */
  fallbackStorage?: StorageConfiguration;

  /** Whether to enable multi-source aggregation */
  enableAggregation?: boolean;
}

/**
 * Initialization result containing all initialized components
 */
export interface InitializationResult {
  /** Data source router for operation routing */
  router: DataSourceRouter;

  /** Multi-source aggregator for data aggregation */
  aggregator: MultiSourceAggregator;

  /** TaskList repository implementation */
  repository: TaskListRepository;

  /** Configuration used for initialization */
  config: MultiSourceConfig;

  /** Health check results for all sources */
  healthStatus: {
    healthy: number;
    unhealthy: number;
    total: number;
    sources: Array<{
      id: string;
      name: string;
      healthy: boolean;
    }>;
  };
}

/**
 * Application initializer class
 */
export class ApplicationInitializer {
  /**
   * Initialize the data delegation layer
   *
   * This method:
   * 1. Loads data source configuration from file or environment
   * 2. Creates and initializes DataSourceRouter
   * 3. Creates MultiSourceAggregator with conflict resolution
   * 4. Creates TaskListRepository with router and aggregator
   * 5. Performs health checks on all configured sources
   *
   * @param options - Initialization options
   * @returns Initialization result with all components
   * @throws Error if initialization fails
   */
  static async initialize(
    options: InitializationOptions = {}
  ): Promise<InitializationResult> {
    LOGGER.info('Starting application initialization', { options });

    try {
      // Step 1: Load data source configuration
      const config = await this.loadConfiguration(options);

      LOGGER.info('Configuration loaded', {
        sourceCount: config.sources.length,
        enabledSources: config.sources.filter(s => s.enabled).length,
        aggregationEnabled: config.aggregationEnabled,
      });

      // Step 2: Create and initialize DataSourceRouter
      const router = await this.createRouter(config);

      LOGGER.info('DataSourceRouter initialized', {
        sources: router.getStatus().total,
      });

      // Step 3: Create MultiSourceAggregator
      const aggregator = this.createAggregator(config);

      LOGGER.info('MultiSourceAggregator created', {
        conflictResolution: config.conflictResolution,
      });

      // Step 4: Create TaskListRepository
      const repository = new TaskListRepository(router, aggregator);

      LOGGER.info('TaskListRepository created');

      // Step 5: Perform health checks
      const healthStatus = await this.performHealthChecks(router);

      LOGGER.info('Health checks completed', {
        healthy: healthStatus.healthy,
        unhealthy: healthStatus.unhealthy,
        total: healthStatus.total,
      });

      // Warn if no healthy sources
      if (healthStatus.healthy === 0) {
        LOGGER.warn('No healthy data sources available!', {
          sources: healthStatus.sources,
        });
      }

      LOGGER.info('Application initialization complete', {
        healthySources: healthStatus.healthy,
        totalSources: healthStatus.total,
      });

      return {
        router,
        aggregator,
        repository,
        config,
        healthStatus,
      };
    } catch (error) {
      LOGGER.error('Application initialization failed', { error });
      throw new Error(
        `Failed to initialize application: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load data source configuration
   *
   * Attempts to load configuration from:
   * 1. Specified config file
   * 2. Default config file locations
   * 3. Environment variables
   * 4. Fallback storage configuration
   * 5. Default configuration
   *
   * @param options - Initialization options
   * @returns Multi-source configuration
   */
  private static async loadConfiguration(
    options: InitializationOptions
  ): Promise<MultiSourceConfig> {
    // If we have a fallback storage configuration and not requiring config file, use it directly
    if (options.fallbackStorage && !options.requireConfigFile) {
      LOGGER.info('Using fallback storage configuration', {
        type: options.fallbackStorage.type,
      });

      const config = this.createConfigFromStorage(options.fallbackStorage);

      // Override aggregation setting if specified
      if (options.enableAggregation !== undefined) {
        config.aggregationEnabled = options.enableAggregation;
      }

      return config;
    }

    const loader = DATA_SOURCE_CONFIG_LOADER;

    try {
      // Try to load from file or environment
      const loaderOptions: {
        configPath?: string;
        useEnvironment?: boolean;
        requireConfigFile?: boolean;
      } = {
        useEnvironment: options.useEnvironment ?? true,
        requireConfigFile: options.requireConfigFile ?? false,
      };

      if (options.configPath !== undefined) {
        loaderOptions.configPath = options.configPath;
      }

      const config = await loader.load(loaderOptions);

      // Override aggregation setting if specified
      if (options.enableAggregation !== undefined) {
        config.aggregationEnabled = options.enableAggregation;
      }

      return config;
    } catch (error) {
      // If we have a fallback storage configuration, use it
      if (options.fallbackStorage) {
        LOGGER.info('Using fallback storage configuration after load failure', {
          type: options.fallbackStorage.type,
        });

        const config = this.createConfigFromStorage(options.fallbackStorage);

        // Override aggregation setting if specified
        if (options.enableAggregation !== undefined) {
          config.aggregationEnabled = options.enableAggregation;
        }

        return config;
      }

      // Otherwise, use default configuration
      LOGGER.warn('Failed to load configuration, using defaults', { error });
      const config = getDefaultMultiSourceConfig();

      // Override aggregation setting if specified
      if (options.enableAggregation !== undefined) {
        config.aggregationEnabled = options.enableAggregation;
      }

      return config;
    }
  }

  /**
   * Create multi-source configuration from single storage configuration
   *
   * This provides backward compatibility with the existing single-storage setup.
   *
   * @param storage - Storage configuration
   * @returns Multi-source configuration with single source
   */
  private static createConfigFromStorage(
    storage: StorageConfiguration
  ): MultiSourceConfig {
    // Convert StorageConfiguration to DataSourceConfig format
    let config: DataSourceConfig['config'];

    if (storage.type === 'file' && storage.file) {
      config = {
        dataDirectory: storage.file.dataDirectory,
        backupRetentionDays: storage.file.backupRetentionDays,
        enableCompression: storage.file.enableCompression,
      };
    } else if (storage.type === 'postgresql' && storage.postgresql) {
      config = {
        host: storage.postgresql.host,
        port: storage.postgresql.port,
        database: storage.postgresql.database,
        user: storage.postgresql.user,
        password: storage.postgresql.password,
        ssl: storage.postgresql.ssl,
        maxConnections: storage.postgresql.maxConnections,
      };
    } else if (storage.type === 'memory') {
      config = {
        maxSize: undefined,
        persistToDisk: false,
        persistPath: undefined,
      };
    } else {
      // Default to file storage
      config = {
        dataDirectory: './data',
        backupRetentionDays: 7,
        enableCompression: false,
      };
    }

    const dataSourceConfig: DataSourceConfig = {
      id: 'default',
      name: 'Default Storage',
      type:
        storage.type === 'file'
          ? 'filesystem'
          : (storage.type as 'postgresql' | 'mongodb' | 'memory'),
      priority: 100,
      readonly: false,
      enabled: true,
      config,
    };

    return {
      sources: [dataSourceConfig],
      conflictResolution: 'latest',
      aggregationEnabled: false,
      operationTimeout: 30000,
      maxRetries: 3,
      allowPartialFailure: true,
    };
  }

  /**
   * Convert DataSourceConfig to StorageConfiguration format
   *
   * @param source - Data source configuration
   * @returns Storage configuration for StorageFactory
   */
  private static convertToStorageConfiguration(
    source: DataSourceConfig
  ): StorageConfiguration {
    const config = source.config;

    switch (source.type) {
      case 'filesystem':
        return {
          type: 'file',
          file: config as {
            dataDirectory: string;
            backupRetentionDays?: number;
            enableCompression?: boolean;
          },
        };

      case 'postgresql':
        return {
          type: 'postgresql',
          postgresql: config as {
            host: string;
            port: number;
            database: string;
            user: string;
            password: string;
            ssl: boolean;
            maxConnections: number;
          },
        };

      case 'memory':
        return {
          type: 'memory',
        };

      case 'mongodb':
        // MongoDB not yet implemented, fall back to memory
        LOGGER.warn('MongoDB storage not implemented, using memory storage', {
          sourceId: source.id,
        });
        return {
          type: 'memory',
        };

      default:
        throw new Error(`Unsupported data source type: ${source.type}`);
    }
  }

  /**
   * Create and initialize DataSourceRouter
   *
   * @param config - Multi-source configuration
   * @returns Initialized DataSourceRouter
   */
  private static async createRouter(
    config: MultiSourceConfig
  ): Promise<DataSourceRouter> {
    // Convert MultiSourceConfig to RouterDataSourceConfig array
    const dataSourceConfigs: RouterDataSourceConfig[] = config.sources.map(
      source => {
        // Convert DataSourceConfig.config to StorageConfiguration format
        const storageConfig = this.convertToStorageConfiguration(source);

        const routerConfig: RouterDataSourceConfig = {
          id: source.id,
          name: source.name,
          type: source.type,
          priority: source.priority,
          readonly: source.readonly,
          enabled: source.enabled,
          config: storageConfig,
        };

        if (source.tags !== undefined) {
          routerConfig.tags = source.tags;
        }

        return routerConfig;
      }
    );

    // Create router with configuration
    const router = new DataSourceRouter(dataSourceConfigs, {
      healthCheckInterval: 60000, // 1 minute
      maxFailures: config.maxRetries ?? 3,
      operationTimeout: config.operationTimeout ?? 30000,
      enableFallback: config.allowPartialFailure ?? true,
    });

    // Initialize all data sources
    await router.initialize();

    return router;
  }

  /**
   * Create MultiSourceAggregator
   *
   * @param config - Multi-source configuration
   * @returns MultiSourceAggregator instance
   */
  private static createAggregator(
    config: MultiSourceConfig
  ): MultiSourceAggregator {
    return new MultiSourceAggregator({
      conflictResolution: config.conflictResolution,
      parallelQueries: true,
      queryTimeout: config.operationTimeout ?? 30000,
    });
  }

  /**
   * Perform health checks on all configured sources
   *
   * @param router - DataSourceRouter to check
   * @returns Health status summary
   */
  private static async performHealthChecks(
    router: DataSourceRouter
  ): Promise<InitializationResult['healthStatus']> {
    const status = router.getStatus();

    return {
      healthy: status.healthy,
      unhealthy: status.unhealthy,
      total: status.total,
      sources: status.sources.map(s => ({
        id: s.id,
        name: s.name,
        healthy: s.healthy,
      })),
    };
  }

  /**
   * Validate initialization result
   *
   * Checks that all required components are properly initialized
   * and at least one data source is healthy.
   *
   * @param result - Initialization result to validate
   * @throws Error if validation fails
   */
  static validateInitialization(result: InitializationResult): void {
    if (!result.router) {
      throw new Error('DataSourceRouter not initialized');
    }

    if (!result.aggregator) {
      throw new Error('MultiSourceAggregator not initialized');
    }

    if (!result.repository) {
      throw new Error('TaskListRepository not initialized');
    }

    if (result.healthStatus.healthy === 0) {
      throw new Error('No healthy data sources available');
    }

    LOGGER.info('Initialization validation passed', {
      healthySources: result.healthStatus.healthy,
      totalSources: result.healthStatus.total,
    });
  }

  /**
   * Shutdown all initialized components
   *
   * @param result - Initialization result to shutdown
   */
  static async shutdown(result: InitializationResult): Promise<void> {
    LOGGER.info('Shutting down application components');

    try {
      // Shutdown repository (which will shutdown router)
      if (result.repository) {
        await result.repository.shutdown();
      }

      LOGGER.info('Application shutdown complete');
    } catch (error) {
      LOGGER.error('Error during application shutdown', { error });
      throw error;
    }
  }
}

/**
 * Convenience function to initialize the application
 *
 * @param options - Initialization options
 * @returns Initialization result
 */
export async function initializeApplication(
  options: InitializationOptions = {}
): Promise<InitializationResult> {
  return ApplicationInitializer.initialize(options);
}

/**
 * Convenience function to shutdown the application
 *
 * @param result - Initialization result to shutdown
 */
export async function shutdownApplication(
  result: InitializationResult
): Promise<void> {
  return ApplicationInitializer.shutdown(result);
}
