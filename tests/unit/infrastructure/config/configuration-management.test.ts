/**
 * Unit tests for Configuration Management domain
 * Tests environment variable reading, JSON/YAML configuration, defaults, and feature gating
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ConfigurationManager } from '../../../../src/infrastructure/config/system-configuration.js';

describe('Configuration Management Domain', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear relevant environment variables
    delete process.env['DATA_STORE_TYPE'];
    delete process.env['DATA_STORE_LOCATION'];
    delete process.env['MCP_PORT'];
    delete process.env['MCP_HOST'];
    delete process.env['REST_PORT'];
    delete process.env['REST_HOST'];
    delete process.env['REST_CORS'];
    delete process.env['UI_PORT'];
    delete process.env['UI_HOST'];
    delete process.env['FEATURE_AGENT_PROMPT_TEMPLATES'];
    delete process.env['FEATURE_DEPENDENCY_VALIDATION'];
    delete process.env['FEATURE_CIRCULAR_DEPENDENCY_DETECTION'];
    delete process.env['TEMPLATE_RENDER_TIMEOUT'];
    delete process.env['SEARCH_RESULT_LIMIT'];
    delete process.env['DEPENDENCY_GRAPH_MAX_SIZE'];
    delete process.env['LOG_LEVEL'];
    delete process.env['LOG_FORMAT'];
    delete process.env['NODE_ENV'];
    delete process.env['VITEST'];
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Environment Variable Reading for MCP', () => {
    it('should read MCP configuration from environment variables', () => {
      // Arrange
      process.env['MCP_PORT'] = '8080';
      process.env['MCP_HOST'] = 'localhost';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.server.mcp.port).toBe(8080);
      expect(config.server.mcp.host).toBe('localhost');
    });

    it('should handle missing MCP environment variables gracefully', () => {
      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.server.mcp.port).toBeUndefined();
      expect(config.server.mcp.host).toBeUndefined();
    });

    it('should validate MCP port as number', () => {
      // Arrange
      process.env['MCP_PORT'] = 'invalid';

      // Act & Assert
      expect(() => new ConfigurationManager()).toThrow(
        'Invalid number value for environment variable MCP_PORT: invalid'
      );
    });
  });

  describe('JSON/YAML Configuration for REST API', () => {
    it('should read REST API configuration with defaults', () => {
      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.server.rest.port).toBe(3000);
      expect(config.server.rest.host).toBe('localhost');
      expect(config.server.rest.cors).toBe(true);
    });

    it('should override REST API defaults with environment variables', () => {
      // Arrange
      process.env['REST_PORT'] = '4000';
      process.env['REST_HOST'] = '0.0.0.0';
      process.env['REST_CORS'] = 'false';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.server.rest.port).toBe(4000);
      expect(config.server.rest.host).toBe('0.0.0.0');
      expect(config.server.rest.cors).toBe(false);
    });

    it('should read UI configuration with defaults', () => {
      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.server.ui.port).toBe(3001);
      expect(config.server.ui.host).toBe('localhost');
    });

    it('should override UI defaults with environment variables', () => {
      // Arrange
      process.env['UI_PORT'] = '5000';
      process.env['UI_HOST'] = '0.0.0.0';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.server.ui.port).toBe(5000);
      expect(config.server.ui.host).toBe('0.0.0.0');
    });
  });

  describe('Default Configuration Fallbacks', () => {
    it('should use /tmp/tasks-server as default directory for production', () => {
      // Arrange
      process.env['NODE_ENV'] = 'production';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.dataStore.location).toBe('/tmp/tasks-server');
    });

    it('should use /tmp/tasks-server-tests as default directory for tests', () => {
      // Arrange
      process.env['NODE_ENV'] = 'test';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.dataStore.location).toBe('/tmp/tasks-server-tests');
    });

    it('should use /tmp/tasks-server-tests when VITEST is true', () => {
      // Arrange
      process.env['VITEST'] = 'true';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.dataStore.location).toBe('/tmp/tasks-server-tests');
    });

    it('should use custom data store location when provided', () => {
      // Arrange
      process.env['DATA_STORE_LOCATION'] = '/custom/path';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.dataStore.location).toBe('/custom/path');
    });

    it('should default to filesystem data store type', () => {
      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.dataStore.type).toBe('filesystem');
    });
  });

  describe('Multiple Data Store Configuration Support', () => {
    it('should support filesystem data store configuration', () => {
      // Arrange
      process.env['DATA_STORE_TYPE'] = 'filesystem';
      process.env['DATA_STORE_LOCATION'] = '/custom/filesystem/path';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.dataStore.type).toBe('filesystem');
      expect(config.dataStore.location).toBe('/custom/filesystem/path');
    });

    it('should support database data store configuration', () => {
      // Arrange
      process.env['DATA_STORE_TYPE'] = 'database';
      process.env['DATA_STORE_LOCATION'] = 'postgresql://localhost:5432/tasks';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.dataStore.type).toBe('database');
      expect(config.dataStore.location).toBe(
        'postgresql://localhost:5432/tasks'
      );
    });

    it('should support memory data store configuration', () => {
      // Arrange
      process.env['DATA_STORE_TYPE'] = 'memory';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.dataStore.type).toBe('memory');
    });

    it('should support data store options as JSON', () => {
      // Arrange
      process.env['DATA_STORE_OPTIONS'] =
        '{"maxConnections": 10, "timeout": 5000}';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.dataStore.options).toEqual({
        maxConnections: 10,
        timeout: 5000,
      });
    });

    it('should handle invalid JSON in data store options', () => {
      // Arrange
      process.env['DATA_STORE_OPTIONS'] = 'invalid-json';

      // Act & Assert
      expect(() => new ConfigurationManager()).toThrow(
        'Invalid JSON value for environment variable DATA_STORE_OPTIONS: invalid-json'
      );
    });
  });

  describe('Feature Gating System', () => {
    it('should enable all features by default', () => {
      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.features.agentPromptTemplates).toBe(true);
      expect(config.features.dependencyValidation).toBe(true);
      expect(config.features.circularDependencyDetection).toBe(true);
    });

    it('should allow disabling agent prompt templates feature', () => {
      // Arrange
      process.env['FEATURE_AGENT_PROMPT_TEMPLATES'] = 'false';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.features.agentPromptTemplates).toBe(false);
    });

    it('should allow disabling dependency validation feature', () => {
      // Arrange
      process.env['FEATURE_DEPENDENCY_VALIDATION'] = 'false';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.features.dependencyValidation).toBe(false);
    });

    it('should allow disabling circular dependency detection feature', () => {
      // Arrange
      process.env['FEATURE_CIRCULAR_DEPENDENCY_DETECTION'] = 'false';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.features.circularDependencyDetection).toBe(false);
    });

    it('should handle feature flags with "1" as true', () => {
      // Arrange
      process.env['FEATURE_AGENT_PROMPT_TEMPLATES'] = '1';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.features.agentPromptTemplates).toBe(true);
    });

    it('should handle feature flags with "0" as false', () => {
      // Arrange
      process.env['FEATURE_DEPENDENCY_VALIDATION'] = '0';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.features.dependencyValidation).toBe(false);
    });
  });

  describe('Performance Configuration', () => {
    it('should set default performance values', () => {
      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.performance.templateRenderTimeout).toBe(50);
      expect(config.performance.searchResultLimit).toBe(100);
      expect(config.performance.dependencyGraphMaxSize).toBe(10000);
    });

    it('should allow overriding performance values', () => {
      // Arrange
      process.env['TEMPLATE_RENDER_TIMEOUT'] = '25';
      process.env['SEARCH_RESULT_LIMIT'] = '200';
      process.env['DEPENDENCY_GRAPH_MAX_SIZE'] = '5000';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.performance.templateRenderTimeout).toBe(25);
      expect(config.performance.searchResultLimit).toBe(200);
      expect(config.performance.dependencyGraphMaxSize).toBe(5000);
    });

    it('should handle invalid performance values', () => {
      // Arrange
      process.env['TEMPLATE_RENDER_TIMEOUT'] = 'invalid';

      // Act & Assert
      expect(() => new ConfigurationManager()).toThrow(
        'Invalid number value for environment variable TEMPLATE_RENDER_TIMEOUT: invalid'
      );
    });
  });

  describe('Logging Configuration', () => {
    it('should set default logging configuration', () => {
      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.logging.level).toBe('info');
      expect(config.logging.format).toBe('text');
    });

    it('should allow overriding logging configuration', () => {
      // Arrange
      process.env['LOG_LEVEL'] = 'debug';
      process.env['LOG_FORMAT'] = 'json';

      // Act
      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      // Assert
      expect(config.logging.level).toBe('debug');
      expect(config.logging.format).toBe('json');
    });
  });

  describe('Configuration Access Methods', () => {
    it('should provide access to data store configuration', () => {
      // Act
      const configManager = new ConfigurationManager();
      const dataStoreConfig = configManager.getDataStoreConfig();

      // Assert
      expect(dataStoreConfig).toHaveProperty('type');
      expect(dataStoreConfig).toHaveProperty('location');
      expect(dataStoreConfig).toHaveProperty('options');
    });

    it('should provide access to server configuration', () => {
      // Act
      const configManager = new ConfigurationManager();
      const serverConfig = configManager.getServerConfig();

      // Assert
      expect(serverConfig).toHaveProperty('mcp');
      expect(serverConfig).toHaveProperty('rest');
      expect(serverConfig).toHaveProperty('ui');
    });

    it('should provide access to features configuration', () => {
      // Act
      const configManager = new ConfigurationManager();
      const featuresConfig = configManager.getFeaturesConfig();

      // Assert
      expect(featuresConfig).toHaveProperty('agentPromptTemplates');
      expect(featuresConfig).toHaveProperty('dependencyValidation');
      expect(featuresConfig).toHaveProperty('circularDependencyDetection');
    });

    it('should provide access to performance configuration', () => {
      // Act
      const configManager = new ConfigurationManager();
      const performanceConfig = configManager.getPerformanceConfig();

      // Assert
      expect(performanceConfig).toHaveProperty('templateRenderTimeout');
      expect(performanceConfig).toHaveProperty('searchResultLimit');
      expect(performanceConfig).toHaveProperty('dependencyGraphMaxSize');
    });
  });

  describe('Configuration Immutability', () => {
    it('should return immutable configuration objects', () => {
      // Act
      const configManager = new ConfigurationManager();
      const config1 = configManager.getConfiguration();
      const config2 = configManager.getConfiguration();

      // Assert - should be different objects (defensive copies)
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it('should return immutable data store configuration', () => {
      // Act
      const configManager = new ConfigurationManager();
      const dataStore1 = configManager.getDataStoreConfig();
      const dataStore2 = configManager.getDataStoreConfig();

      // Assert - should be different objects (defensive copies)
      expect(dataStore1).not.toBe(dataStore2);
      expect(dataStore1).toEqual(dataStore2);
    });
  });
});
