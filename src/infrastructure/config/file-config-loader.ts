/**
 * File-based configuration loader for JSON and YAML files
 * Supports loading configuration from files for REST API and UI servers
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

import yaml from 'js-yaml';

import { logger } from '../../shared/utils/logger.js';

export interface FileConfigOptions {
  configPath?: string;
  fallbackPaths?: string[];
  required?: boolean;
}

export interface RestApiConfig {
  port?: number;
  host?: string;
  cors?: boolean;
  middleware?: {
    compression?: boolean;
    helmet?: boolean;
    rateLimit?: {
      enabled?: boolean;
      windowMs?: number;
      maxRequests?: number;
    };
  };
  ssl?: {
    enabled?: boolean;
    keyPath?: string;
    certPath?: string;
  };
}

export interface UiConfig {
  port?: number;
  host?: string;
  publicPath?: string;
  staticFiles?: {
    enabled?: boolean;
    path?: string;
    maxAge?: number;
  };
  proxy?: {
    enabled?: boolean;
    target?: string;
  };
}

export interface FileConfiguration {
  rest?: RestApiConfig;
  ui?: UiConfig;
  environment?: string | undefined;
  version?: string | undefined;
}

export class FileConfigLoader {
  /**
   * Load configuration from JSON or YAML file
   *
   * @param options - Configuration loading options
   * @returns Parsed configuration object
   */
  static loadConfig(options: FileConfigOptions = {}): FileConfiguration {
    const { configPath, fallbackPaths = [], required = false } = options;

    // Build list of paths to try
    const pathsToTry = [
      configPath,
      ...fallbackPaths,
      // Default paths
      './config/server.json',
      './config/server.yaml',
      './config/server.yml',
      './server.json',
      './server.yaml',
      './server.yml',
    ].filter(Boolean) as string[];

    for (const path of pathsToTry) {
      const resolvedPath = resolve(path);

      if (existsSync(resolvedPath)) {
        try {
          const config = this.loadConfigFile(resolvedPath);
          logger.info('Configuration loaded from file', { path: resolvedPath });
          return config;
        } catch (error) {
          logger.warn('Failed to load configuration file', {
            path: resolvedPath,
            error: error instanceof Error ? error.message : String(error),
          });

          if (required) {
            // Re-throw the original error to preserve specific error messages
            throw error;
          }
        }
      }
    }

    if (required) {
      throw new Error(
        `No configuration file found in paths: ${pathsToTry.join(', ')}`
      );
    }

    // Return empty configuration if no file found and not required
    return {};
  }

  /**
   * Load and parse a specific configuration file
   *
   * @param filePath - Path to configuration file
   * @returns Parsed configuration object
   */
  private static loadConfigFile(filePath: string): FileConfiguration {
    const content = readFileSync(filePath, 'utf8');
    const extension = filePath.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'json':
        return this.parseJson(content, filePath);

      case 'yaml':
      case 'yml':
        return this.parseYaml(content, filePath);

      default:
        throw new Error(`Unsupported configuration file format: ${extension}`);
    }
  }

  /**
   * Parse JSON configuration content
   *
   * @param content - JSON content string
   * @param filePath - File path for error reporting
   * @returns Parsed configuration object
   */
  private static parseJson(
    content: string,
    filePath: string
  ): FileConfiguration {
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Invalid JSON in configuration file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Parse YAML configuration content
   *
   * @param content - YAML content string
   * @param filePath - File path for error reporting
   * @returns Parsed configuration object
   */
  private static parseYaml(
    content: string,
    filePath: string
  ): FileConfiguration {
    try {
      const parsed = yaml.load(content);

      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('YAML content must be an object');
      }

      return parsed as FileConfiguration;
    } catch (error) {
      throw new Error(
        `Invalid YAML in configuration file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate configuration structure
   *
   * @param config - Configuration to validate
   * @returns Validated configuration
   */
  static validateConfig(config: FileConfiguration): FileConfiguration {
    // Validate REST API configuration
    if (config.rest) {
      if (
        config.rest.port !== undefined &&
        (config.rest.port < 1 || config.rest.port > 65535)
      ) {
        throw new Error('REST API port must be between 1 and 65535');
      }

      if (
        config.rest.host !== undefined &&
        typeof config.rest.host !== 'string'
      ) {
        throw new Error('REST API host must be a string');
      }
    }

    // Validate UI configuration
    if (config.ui) {
      if (
        config.ui.port !== undefined &&
        (config.ui.port < 1 || config.ui.port > 65535)
      ) {
        throw new Error('UI port must be between 1 and 65535');
      }

      if (config.ui.host !== undefined && typeof config.ui.host !== 'string') {
        throw new Error('UI host must be a string');
      }
    }

    return config;
  }

  /**
   * Merge configuration with defaults
   *
   * @param config - Configuration to merge
   * @param defaults - Default values
   * @returns Merged configuration
   */
  static mergeWithDefaults(
    config: FileConfiguration,
    defaults: FileConfiguration
  ): FileConfiguration {
    return {
      environment: config.environment ?? defaults.environment,
      version: config.version ?? defaults.version,
      rest: {
        ...defaults.rest,
        ...config.rest,
        middleware: {
          ...defaults.rest?.middleware,
          ...config.rest?.middleware,
          rateLimit: {
            ...defaults.rest?.middleware?.rateLimit,
            ...config.rest?.middleware?.rateLimit,
          },
        },
        ssl: {
          ...defaults.rest?.ssl,
          ...config.rest?.ssl,
        },
      },
      ui: {
        ...defaults.ui,
        ...config.ui,
        staticFiles: {
          ...defaults.ui?.staticFiles,
          ...config.ui?.staticFiles,
        },
        proxy: {
          ...defaults.ui?.proxy,
          ...config.ui?.proxy,
        },
      },
    };
  }
}
