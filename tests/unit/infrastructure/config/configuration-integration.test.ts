/**
 * Integration tests for Configuration Management with file loading
 * Tests the integration between ConfigurationManager and FileConfigLoader
 */

import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ConfigurationManager } from '../../../../src/infrastructure/config/system-configuration.js';

describe('Configuration Integration', () => {
  const testConfigDir = resolve('./config');
  const testJsonFile = resolve(testConfigDir, 'server.json');
  const testYamlFile = resolve(testConfigDir, 'server.yaml');
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };

    // Clear relevant environment variables
    delete process.env['REST_PORT'];
    delete process.env['REST_HOST'];
    delete process.env['REST_CORS'];
    delete process.env['UI_PORT'];
    delete process.env['UI_HOST'];
    delete process.env['CONFIG_FILE'];

    // Create test directory
    if (!existsSync(testConfigDir)) {
      mkdirSync(testConfigDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;

    // Clean up test files
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('JSON Configuration File Integration', () => {
    it('should load REST API configuration from JSON file', () => {
      // Arrange
      const config = {
        rest: {
          port: 4000,
          host: '0.0.0.0',
          cors: false,
        },
        ui: {
          port: 4001,
          host: '0.0.0.0',
        },
      };
      writeFileSync(testJsonFile, JSON.stringify(config, null, 2));

      // Act
      const configManager = new ConfigurationManager();
      const systemConfig = configManager.getConfiguration();

      // Assert
      expect(systemConfig.server.rest.port).toBe(4000);
      expect(systemConfig.server.rest.host).toBe('0.0.0.0');
      expect(systemConfig.server.rest.cors).toBe(false);
      expect(systemConfig.server.ui.port).toBe(4001);
      expect(systemConfig.server.ui.host).toBe('0.0.0.0');
    });

    it('should prioritize environment variables over JSON file configuration', () => {
      // Arrange
      const config = {
        rest: {
          port: 4000,
          host: '0.0.0.0',
          cors: false,
        },
      };
      writeFileSync(testJsonFile, JSON.stringify(config, null, 2));

      // Set environment variables that should override file config
      process.env['REST_PORT'] = '5000';
      process.env['REST_HOST'] = '127.0.0.1';
      process.env['REST_CORS'] = 'true';

      // Act
      const configManager = new ConfigurationManager();
      const systemConfig = configManager.getConfiguration();

      // Assert
      expect(systemConfig.server.rest.port).toBe(5000); // From env
      expect(systemConfig.server.rest.host).toBe('127.0.0.1'); // From env
      expect(systemConfig.server.rest.cors).toBe(true); // From env
    });
  });

  describe('YAML Configuration File Integration', () => {
    it('should load REST API configuration from YAML file', () => {
      // Arrange
      const yamlContent = `
rest:
  port: 6000
  host: "192.168.1.1"
  cors: true
ui:
  port: 6001
  host: "192.168.1.1"
`;
      writeFileSync(testYamlFile, yamlContent);

      // Act
      const configManager = new ConfigurationManager();
      const systemConfig = configManager.getConfiguration();

      // Assert
      expect(systemConfig.server.rest.port).toBe(6000);
      expect(systemConfig.server.rest.host).toBe('192.168.1.1');
      expect(systemConfig.server.rest.cors).toBe(true);
      expect(systemConfig.server.ui.port).toBe(6001);
      expect(systemConfig.server.ui.host).toBe('192.168.1.1');
    });

    it('should prioritize environment variables over YAML file configuration', () => {
      // Arrange
      const yamlContent = `
rest:
  port: 6000
  host: "192.168.1.1"
  cors: true
`;
      writeFileSync(testYamlFile, yamlContent);

      // Set environment variables that should override file config
      process.env['REST_PORT'] = '7000';
      process.env['REST_HOST'] = 'localhost';

      // Act
      const configManager = new ConfigurationManager();
      const systemConfig = configManager.getConfiguration();

      // Assert
      expect(systemConfig.server.rest.port).toBe(7000); // From env
      expect(systemConfig.server.rest.host).toBe('localhost'); // From env
      expect(systemConfig.server.rest.cors).toBe(true); // From file
    });
  });

  describe('Configuration File Precedence', () => {
    it('should prefer JSON over YAML when both exist', () => {
      // Arrange
      const jsonConfig = {
        rest: {
          port: 8000,
          host: 'json-host',
        },
      };
      const yamlContent = `
rest:
  port: 9000
  host: "yaml-host"
`;

      writeFileSync(testJsonFile, JSON.stringify(jsonConfig, null, 2));
      writeFileSync(testYamlFile, yamlContent);

      // Act
      const configManager = new ConfigurationManager();
      const systemConfig = configManager.getConfiguration();

      // Assert - JSON should take precedence
      expect(systemConfig.server.rest.port).toBe(8000);
      expect(systemConfig.server.rest.host).toBe('json-host');
    });
  });

  describe('Custom Configuration File Path', () => {
    it('should load configuration from custom file path', () => {
      // Arrange
      const customConfigPath = resolve('./custom-config.json');
      const config = {
        rest: {
          port: 9999,
          host: 'custom-host',
        },
      };
      writeFileSync(customConfigPath, JSON.stringify(config, null, 2));
      process.env['CONFIG_FILE'] = customConfigPath;

      // Act
      const configManager = new ConfigurationManager();
      const systemConfig = configManager.getConfiguration();

      // Assert
      expect(systemConfig.server.rest.port).toBe(9999);
      expect(systemConfig.server.rest.host).toBe('custom-host');

      // Cleanup
      rmSync(customConfigPath, { force: true });
    });
  });

  describe('Fallback to Defaults', () => {
    it('should use defaults when no configuration file exists', () => {
      // Act - no config files exist
      const configManager = new ConfigurationManager();
      const systemConfig = configManager.getConfiguration();

      // Assert - should use defaults
      expect(systemConfig.server.rest.port).toBe(3000);
      expect(systemConfig.server.rest.host).toBe('localhost');
      expect(systemConfig.server.rest.cors).toBe(true);
      expect(systemConfig.server.ui.port).toBe(3001);
      expect(systemConfig.server.ui.host).toBe('localhost');
    });
  });

  describe('Partial Configuration Files', () => {
    it('should merge partial configuration with defaults', () => {
      // Arrange - only specify REST port in config file
      const config = {
        rest: {
          port: 5555,
        },
      };
      writeFileSync(testJsonFile, JSON.stringify(config, null, 2));

      // Act
      const configManager = new ConfigurationManager();
      const systemConfig = configManager.getConfiguration();

      // Assert
      expect(systemConfig.server.rest.port).toBe(5555); // From file
      expect(systemConfig.server.rest.host).toBe('localhost'); // Default
      expect(systemConfig.server.rest.cors).toBe(true); // Default
      expect(systemConfig.server.ui.port).toBe(3001); // Default
      expect(systemConfig.server.ui.host).toBe('localhost'); // Default
    });
  });
});
