/**
 * Data source configuration loader
 *
 * Loads and validates data source configurations from files and environment variables.
 * Supports JSON and YAML formats with environment variable substitution for credentials.
 */

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

import { LOGGER } from '../../shared/utils/logger.js';

import {
  type MultiSourceConfig,
  type DataSourceConfig,
  validateMultiSourceConfig,
  getDefaultMultiSourceConfig,
} from './data-source-config.js';

/**
 * Configuration loader options
 */
export interface LoaderOptions {
  /** Path to configuration file */
  configPath?: string;

  /** Whether to use environment variables */
  useEnvironment?: boolean;

  /** Custom environment variable prefix */
  envPrefix?: string;

  /** Whether to fail if config file is missing */
  requireConfigFile?: boolean;
}

/**
 * Data source configuration loader
 */
export class DataSourceConfigLoader {
  private readonly defaultConfigPaths = [
    './config/data-sources.json',
    './config/data-sources.yaml',
    './config/data-sources.yml',
    './.kiro/config/data-sources.json',
    './.kiro/config/data-sources.yaml',
  ];

  /**
   * Load data source configuration
   *
   * Attempts to load configuration from:
   * 1. Specified config file
   * 2. Default config file locations
   * 3. Environment variables
   * 4. Default configuration
   *
   * @param options - Loader options
   * @returns Validated multi-source configuration
   */
  async load(options: LoaderOptions = {}): Promise<MultiSourceConfig> {
    const {
      configPath,
      useEnvironment = true,
      envPrefix = 'DATASOURCE',
      requireConfigFile = false,
    } = options;

    let config: MultiSourceConfig | null = null;

    // Try to load from specified config file
    if (configPath) {
      config = await this.loadFromFile(configPath);
      if (!config && requireConfigFile) {
        throw new Error(`Required configuration file not found: ${configPath}`);
      }
    }

    // Try to load from default locations
    if (!config) {
      config = await this.loadFromDefaultLocations();
    }

    // Try to load from environment variables
    if (!config && useEnvironment) {
      config = this.loadFromEnvironment(envPrefix);
    }

    // Fall back to default configuration
    if (!config) {
      LOGGER.info('No configuration found, using defaults');
      config = getDefaultMultiSourceConfig();
    }

    // Apply environment variable overrides for credentials
    if (useEnvironment) {
      config = this.applyEnvironmentOverrides(config, envPrefix);
    }

    // Validate final configuration
    const validatedConfig = validateMultiSourceConfig(config);

    LOGGER.info('Data source configuration loaded', {
      sourceCount: validatedConfig.sources.length,
      enabledSources: validatedConfig.sources.filter(s => s.enabled).length,
      aggregationEnabled: validatedConfig.aggregationEnabled,
    });

    return validatedConfig;
  }

  /**
   * Load configuration from a specific file
   *
   * @param filePath - Path to configuration file
   * @returns Parsed configuration or null if file doesn't exist
   */
  private async loadFromFile(
    filePath: string
  ): Promise<MultiSourceConfig | null> {
    const resolvedPath = resolve(filePath);

    if (!existsSync(resolvedPath)) {
      LOGGER.debug('Configuration file not found', { path: resolvedPath });
      return null;
    }

    try {
      const content = await readFile(resolvedPath, 'utf-8');
      const config = this.parseConfigContent(content, filePath);

      LOGGER.info('Configuration loaded from file', { path: resolvedPath });
      return config;
    } catch (error) {
      LOGGER.error('Failed to load configuration file', {
        path: resolvedPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Failed to load configuration from ${filePath}: ${error}`
      );
    }
  }

  /**
   * Load configuration from default locations
   *
   * @returns Parsed configuration or null if no default file exists
   */
  private async loadFromDefaultLocations(): Promise<MultiSourceConfig | null> {
    for (const path of this.defaultConfigPaths) {
      const config = await this.loadFromFile(path);
      if (config) {
        return config;
      }
    }
    return null;
  }

  /**
   * Parse configuration file content
   *
   * @param content - File content
   * @param filePath - File path (for format detection)
   * @returns Parsed configuration
   */
  private parseConfigContent(
    content: string,
    filePath: string
  ): MultiSourceConfig {
    const isYaml = filePath.endsWith('.yaml') || filePath.endsWith('.yml');

    if (isYaml) {
      // For YAML support, we would need a YAML parser library
      // For now, we'll throw an error recommending JSON
      throw new Error(
        'YAML configuration not yet supported. Please use JSON format or convert your YAML to JSON.'
      );
    }

    // Parse JSON
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON in configuration file: ${error}`);
    }
  }

  /**
   * Load configuration from environment variables
   *
   * Supports defining data sources through environment variables:
   * - DATASOURCE_COUNT: Number of data sources
   * - DATASOURCE_0_ID, DATASOURCE_0_TYPE, etc.
   *
   * @param prefix - Environment variable prefix
   * @returns Configuration or null if not defined in environment
   */
  private loadFromEnvironment(prefix: string): MultiSourceConfig | null {
    const countKey = `${prefix}_COUNT`;
    const count = process.env[countKey];

    if (!count) {
      return null;
    }

    const sourceCount = parseInt(count, 10);
    if (isNaN(sourceCount) || sourceCount < 1) {
      throw new Error(`Invalid ${countKey}: must be a positive integer`);
    }

    const sources: DataSourceConfig[] = [];

    for (let i = 0; i < sourceCount; i++) {
      const source = this.loadSourceFromEnvironment(prefix, i);
      sources.push(source);
    }

    return {
      sources,
      conflictResolution: this.getEnvValue(
        `${prefix}_CONFLICT_RESOLUTION`,
        'latest'
      ) as 'latest' | 'priority' | 'merge',
      aggregationEnabled: this.getEnvBoolean(
        `${prefix}_AGGREGATION_ENABLED`,
        false
      ),
      operationTimeout: this.getEnvNumber(`${prefix}_OPERATION_TIMEOUT`, 30000),
      maxRetries: this.getEnvNumber(`${prefix}_MAX_RETRIES`, 3),
      allowPartialFailure: this.getEnvBoolean(
        `${prefix}_ALLOW_PARTIAL_FAILURE`,
        true
      ),
    };
  }

  /**
   * Load a single data source from environment variables
   *
   * @param prefix - Environment variable prefix
   * @param index - Source index
   * @returns Data source configuration
   */
  private loadSourceFromEnvironment(
    prefix: string,
    index: number
  ): DataSourceConfig {
    const sourcePrefix = `${prefix}_${index}`;

    const id = this.getEnvValue(`${sourcePrefix}_ID`, `source-${index}`);
    const name = this.getEnvValue(`${sourcePrefix}_NAME`, `Source ${index}`);
    const type = this.getEnvValue(`${sourcePrefix}_TYPE`, 'filesystem') as
      | 'filesystem'
      | 'memory'
      | 'postgresql'
      | 'mongodb';
    const priority = this.getEnvNumber(`${sourcePrefix}_PRIORITY`, 100);
    const readonly = this.getEnvBoolean(`${sourcePrefix}_READONLY`, false);
    const enabled = this.getEnvBoolean(`${sourcePrefix}_ENABLED`, true);
    const tags = this.getEnvArray(`${sourcePrefix}_TAGS`);

    let config: Record<string, unknown>;

    switch (type) {
      case 'filesystem':
        config = {
          dataDirectory: this.getEnvValue(
            `${sourcePrefix}_DATA_DIRECTORY`,
            './data'
          ),
          backupRetentionDays: this.getEnvNumber(
            `${sourcePrefix}_BACKUP_RETENTION_DAYS`,
            7
          ),
          enableCompression: this.getEnvBoolean(
            `${sourcePrefix}_ENABLE_COMPRESSION`,
            false
          ),
        };
        break;

      case 'postgresql':
        config = {
          host: this.getEnvValue(`${sourcePrefix}_HOST`, 'localhost'),
          port: this.getEnvNumber(`${sourcePrefix}_PORT`, 5432),
          database: this.getEnvValue(
            `${sourcePrefix}_DATABASE`,
            'task_manager'
          ),
          user: this.getEnvValue(`${sourcePrefix}_USER`, 'postgres'),
          password: this.getEnvValue(`${sourcePrefix}_PASSWORD`, ''),
          ssl: this.getEnvBoolean(`${sourcePrefix}_SSL`, false),
          maxConnections: this.getEnvNumber(
            `${sourcePrefix}_MAX_CONNECTIONS`,
            10
          ),
        };
        break;

      case 'mongodb':
        config = {
          uri: this.getEnvValue(
            `${sourcePrefix}_URI`,
            'mongodb://localhost:27017'
          ),
          database: this.getEnvValue(
            `${sourcePrefix}_DATABASE`,
            'task_manager'
          ),
          collection: this.getEnvValue(`${sourcePrefix}_COLLECTION`, 'tasks'),
          maxPoolSize: this.getEnvNumber(`${sourcePrefix}_MAX_POOL_SIZE`, 10),
        };
        break;

      case 'memory':
        config = {
          maxSize: this.getEnvNumber(`${sourcePrefix}_MAX_SIZE`, undefined),
          persistToDisk: this.getEnvBoolean(
            `${sourcePrefix}_PERSIST_TO_DISK`,
            false
          ),
          persistPath: this.getEnvValue(
            `${sourcePrefix}_PERSIST_PATH`,
            undefined
          ),
        };
        break;

      default:
        throw new Error(`Unsupported data source type: ${type}`);
    }

    return {
      id,
      name,
      type,
      priority,
      readonly,
      enabled,
      tags,
      config,
    };
  }

  /**
   * Apply environment variable overrides for sensitive credentials
   *
   * Allows overriding credentials in config files with environment variables
   * for security. Supports patterns like:
   * - DATASOURCE_<ID>_PASSWORD
   * - DATASOURCE_<ID>_USER
   *
   * @param config - Base configuration
   * @param prefix - Environment variable prefix
   * @returns Configuration with environment overrides applied
   */
  private applyEnvironmentOverrides(
    config: MultiSourceConfig,
    prefix: string
  ): MultiSourceConfig {
    const sources = config.sources.map(source => {
      const sourcePrefix = `${prefix}_${source.id
        .toUpperCase()
        .replace(/-/g, '_')}`;
      const overriddenConfig = { ...source.config };

      // PostgreSQL credential overrides
      if (source.type === 'postgresql') {
        const pgConfig = overriddenConfig as Record<string, unknown>;

        const host = process.env[`${sourcePrefix}_HOST`];
        if (host) pgConfig['host'] = host;

        const port = process.env[`${sourcePrefix}_PORT`];
        if (port) pgConfig['port'] = parseInt(port, 10);

        const database = process.env[`${sourcePrefix}_DATABASE`];
        if (database) pgConfig['database'] = database;

        const user = process.env[`${sourcePrefix}_USER`];
        if (user) pgConfig['user'] = user;

        const password = process.env[`${sourcePrefix}_PASSWORD`];
        if (password) pgConfig['password'] = password;

        const ssl = process.env[`${sourcePrefix}_SSL`];
        if (ssl) pgConfig['ssl'] = ssl === 'true';
      }

      // MongoDB credential overrides
      if (source.type === 'mongodb') {
        const mongoConfig = overriddenConfig as Record<string, unknown>;

        const uri = process.env[`${sourcePrefix}_URI`];
        if (uri) mongoConfig['uri'] = uri;

        const database = process.env[`${sourcePrefix}_DATABASE`];
        if (database) mongoConfig['database'] = database;
      }

      return {
        ...source,
        config: overriddenConfig,
      };
    });

    return {
      ...config,
      sources,
    };
  }

  /**
   * Get environment variable value with default
   */
  private getEnvValue(key: string, defaultValue?: string): string {
    return process.env[key] ?? defaultValue ?? '';
  }

  /**
   * Get environment variable as number
   */
  private getEnvNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (!value) return defaultValue ?? 0;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Invalid number for ${key}: ${value}`);
    }
    return parsed;
  }

  /**
   * Get environment variable as boolean
   */
  private getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value === 'true' || value === '1';
  }

  /**
   * Get environment variable as array (comma-separated)
   */
  private getEnvArray(key: string): string[] | undefined {
    const value = process.env[key];
    if (!value) return undefined;
    return value
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Save configuration to file
   *
   * @param config - Configuration to save
   * @param filePath - Destination file path
   */
  async save(config: MultiSourceConfig, filePath: string): Promise<void> {
    const { writeFile, mkdir } = await import('fs/promises');
    const { dirname } = await import('path');

    // Validate before saving
    validateMultiSourceConfig(config);

    // Ensure directory exists
    const dir = dirname(filePath);
    await mkdir(dir, { recursive: true });

    // Write configuration
    const content = JSON.stringify(config, null, 2);
    await writeFile(filePath, content, 'utf-8');

    LOGGER.info('Configuration saved', { path: filePath });
  }
}

/**
 * Singleton instance for convenience
 */
export const DATA_SOURCE_CONFIG_LOADER = new DataSourceConfigLoader();
