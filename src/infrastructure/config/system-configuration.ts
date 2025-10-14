/**
 * System configuration management
 * Handles environment variables and configuration files for different deployment scenarios
 */

import {
  FileConfigLoader,
  type FileConfiguration,
} from './file-config-loader.js';

export interface SystemConfiguration {
  dataStore: {
    type: 'filesystem' | 'database' | 'memory';
    location: string;
    options: Record<string, unknown>;
  };
  server: {
    mcp: {
      port?: number;
      host?: string;
    };
    rest: {
      port: number;
      host: string;
      cors: boolean;
    };
    ui: {
      port: number;
      host: string;
    };
  };
  features: {
    agentPromptTemplates: boolean;
    dependencyValidation: boolean;
    circularDependencyDetection: boolean;
  };
  performance: {
    templateRenderTimeout: number; // milliseconds
    searchResultLimit: number;
    dependencyGraphMaxSize: number;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    format: 'json' | 'text';
  };
}

export class ConfigurationManager {
  private config: SystemConfiguration;

  constructor() {
    this.config = this.loadConfiguration();
  }

  getConfiguration(): SystemConfiguration {
    return { ...this.config };
  }

  getDataStoreConfig() {
    return { ...this.config.dataStore };
  }

  getServerConfig() {
    return { ...this.config.server };
  }

  getFeaturesConfig() {
    return { ...this.config.features };
  }

  getPerformanceConfig() {
    return { ...this.config.performance };
  }

  private loadConfiguration(): SystemConfiguration {
    // Load from environment variables for MCP server
    const mcpConfig = this.loadMcpConfiguration();

    // Load from JSON/YAML files for REST API server
    const restConfig = this.loadRestConfiguration();

    // Load from JSON/YAML files for UI server
    const uiConfig = this.loadUiConfiguration();

    // Determine data store location
    const dataStoreLocation = this.getDataStoreLocation();

    return {
      dataStore: {
        type:
          (process.env['DATA_STORE_TYPE'] as
            | 'filesystem'
            | 'database'
            | 'memory') || 'filesystem',
        location: dataStoreLocation,
        options: this.parseJsonEnv('DATA_STORE_OPTIONS', {}),
      },
      server: {
        mcp: {
          ...(mcpConfig.port !== undefined && { port: mcpConfig.port }),
          ...(mcpConfig.host !== undefined && { host: mcpConfig.host }),
        },
        rest: {
          port: restConfig.port || 3000,
          host: restConfig.host || 'localhost',
          cors: restConfig.cors ?? true,
        },
        ui: {
          port: uiConfig.port || 3001,
          host: uiConfig.host,
        },
      },
      features: {
        agentPromptTemplates:
          this.parseBooleanEnv('FEATURE_AGENT_PROMPT_TEMPLATES', true) ?? true,
        dependencyValidation:
          this.parseBooleanEnv('FEATURE_DEPENDENCY_VALIDATION', true) ?? true,
        circularDependencyDetection:
          this.parseBooleanEnv('FEATURE_CIRCULAR_DEPENDENCY_DETECTION', true) ??
          true,
      },
      performance: {
        templateRenderTimeout:
          this.parseNumberEnv('TEMPLATE_RENDER_TIMEOUT', 50) || 50,
        searchResultLimit:
          this.parseNumberEnv('SEARCH_RESULT_LIMIT', 100) || 100,
        dependencyGraphMaxSize:
          this.parseNumberEnv('DEPENDENCY_GRAPH_MAX_SIZE', 10000) || 10000,
      },
      logging: {
        level:
          (process.env['LOG_LEVEL'] as 'error' | 'warn' | 'info' | 'debug') ||
          'info',
        format: (process.env['LOG_FORMAT'] as 'json' | 'text') || 'text',
      },
    };
  }

  private loadMcpConfiguration() {
    return {
      port: this.parseNumberEnv('MCP_PORT'),
      host: process.env['MCP_HOST'],
    };
  }

  private loadRestConfiguration() {
    // Load from JSON/YAML configuration files
    const fileConfig = this.loadFileConfiguration();

    // Merge file configuration with environment variables (env vars take precedence)
    return {
      port: this.parseNumberEnv('REST_PORT') || fileConfig.rest?.port || 3000,
      host: process.env['REST_HOST'] || fileConfig.rest?.host || 'localhost',
      cors:
        this.parseBooleanEnv('REST_CORS') !== undefined
          ? this.parseBooleanEnv('REST_CORS', true)
          : fileConfig.rest?.cors !== undefined
            ? fileConfig.rest.cors
            : true,
    };
  }

  private loadUiConfiguration() {
    // Load from JSON/YAML configuration files
    const fileConfig = this.loadFileConfiguration();

    // Merge file configuration with environment variables (env vars take precedence)
    return {
      port: this.parseNumberEnv('UI_PORT') || fileConfig.ui?.port || 3001,
      host: process.env['UI_HOST'] || fileConfig.ui?.host || 'localhost',
    };
  }

  private loadFileConfiguration(): FileConfiguration {
    // Try to load configuration from various file locations
    const configPaths = [
      process.env['CONFIG_FILE'], // Explicit config file path
      './config/server.json',
      './config/server.yaml',
      './config/server.yml',
      './server.json',
      './server.yaml',
      './server.yml',
    ].filter(Boolean) as string[];

    return FileConfigLoader.loadConfig({
      fallbackPaths: configPaths,
      required: false, // File configuration is optional
    });
  }

  private getDataStoreLocation(): string {
    // Use environment variable if provided
    if (process.env['DATA_STORE_LOCATION']) {
      return process.env['DATA_STORE_LOCATION'];
    }

    // Default based on environment
    const isTest =
      process.env['NODE_ENV'] === 'test' || process.env['VITEST'] === 'true';
    return isTest ? '/tmp/tasks-server-tests' : '/tmp/tasks-server';
  }

  private parseNumberEnv(
    key: string,
    defaultValue?: number
  ): number | undefined {
    const value = process.env[key];
    if (!value) {
      return defaultValue;
    }

    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(
        `Invalid number value for environment variable ${key}: ${value}`
      );
    }

    return parsed;
  }

  private parseBooleanEnv(
    key: string,
    defaultValue?: boolean
  ): boolean | undefined {
    const value = process.env[key];
    if (!value) {
      return defaultValue;
    }

    return value.toLowerCase() === 'true' || value === '1';
  }

  private parseJsonEnv(
    key: string,
    defaultValue: Record<string, unknown>
  ): Record<string, unknown> {
    const value = process.env[key];
    if (!value) {
      return defaultValue;
    }

    try {
      return JSON.parse(value);
    } catch (_error) {
      throw new Error(
        `Invalid JSON value for environment variable ${key}: ${value}`
      );
    }
  }
}
