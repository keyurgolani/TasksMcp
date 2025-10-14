/**
 * Unit tests for File Configuration Loader
 * Tests JSON and YAML configuration file loading capabilities
 */

import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  FileConfigLoader,
  type FileConfiguration,
} from '../../../../src/infrastructure/config/file-config-loader.js';

describe('FileConfigLoader', () => {
  const testConfigDir = resolve('./test-config');
  const testJsonFile = resolve(testConfigDir, 'test.json');
  const testYamlFile = resolve(testConfigDir, 'test.yaml');
  const testYmlFile = resolve(testConfigDir, 'test.yml');

  beforeEach(() => {
    // Create test directory
    if (!existsSync(testConfigDir)) {
      mkdirSync(testConfigDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('JSON Configuration Loading', () => {
    it('should load valid JSON configuration', () => {
      // Arrange
      const config: FileConfiguration = {
        rest: {
          port: 4000,
          host: '127.0.0.1',
          cors: false,
        },
        ui: {
          port: 4001,
          host: '127.0.0.1',
        },
      };
      writeFileSync(testJsonFile, JSON.stringify(config, null, 2));

      // Act
      const result = FileConfigLoader.loadConfig({
        configPath: testJsonFile,
        required: true,
      });

      // Assert
      expect(result).toEqual(config);
    });

    it('should handle invalid JSON gracefully', () => {
      // Arrange
      writeFileSync(testJsonFile, '{ invalid json }');

      // Act & Assert
      expect(() =>
        FileConfigLoader.loadConfig({
          configPath: testJsonFile,
          required: true,
        })
      ).toThrow(/Invalid JSON in configuration file/);
    });
  });

  describe('YAML Configuration Loading', () => {
    it('should load valid YAML configuration', () => {
      // Arrange
      const yamlContent = `
rest:
  port: 5000
  host: "0.0.0.0"
  cors: true
ui:
  port: 5001
  host: "0.0.0.0"
environment: "test"
`;
      writeFileSync(testYamlFile, yamlContent);

      // Act
      const result = FileConfigLoader.loadConfig({
        configPath: testYamlFile,
        required: true,
      });

      // Assert
      expect(result.rest?.port).toBe(5000);
      expect(result.rest?.host).toBe('0.0.0.0');
      expect(result.rest?.cors).toBe(true);
      expect(result.ui?.port).toBe(5001);
      expect(result.ui?.host).toBe('0.0.0.0');
      expect(result.environment).toBe('test');
    });

    it('should load .yml extension files', () => {
      // Arrange
      const yamlContent = `
rest:
  port: 6000
`;
      writeFileSync(testYmlFile, yamlContent);

      // Act
      const result = FileConfigLoader.loadConfig({
        configPath: testYmlFile,
        required: true,
      });

      // Assert
      expect(result.rest?.port).toBe(6000);
    });

    it('should handle invalid YAML gracefully', () => {
      // Arrange
      writeFileSync(testYamlFile, 'invalid: yaml: content: [');

      // Act & Assert
      expect(() =>
        FileConfigLoader.loadConfig({
          configPath: testYamlFile,
          required: true,
        })
      ).toThrow(/Invalid YAML in configuration file/);
    });
  });

  describe('Fallback Path Handling', () => {
    it('should try fallback paths when primary path does not exist', () => {
      // Arrange
      const config: FileConfiguration = {
        rest: { port: 7000 },
      };
      writeFileSync(testJsonFile, JSON.stringify(config));

      // Act
      const result = FileConfigLoader.loadConfig({
        configPath: './non-existent.json',
        fallbackPaths: [testJsonFile],
        required: true,
      });

      // Assert
      expect(result.rest?.port).toBe(7000);
    });

    it('should return empty config when no files found and not required', () => {
      // Act
      const result = FileConfigLoader.loadConfig({
        configPath: './non-existent.json',
        fallbackPaths: ['./also-non-existent.json'],
        required: false,
      });

      // Assert
      expect(result).toEqual({});
    });

    it('should throw error when no files found and required', () => {
      // Act & Assert
      expect(() =>
        FileConfigLoader.loadConfig({
          configPath: './non-existent.json',
          fallbackPaths: ['./also-non-existent.json'],
          required: true,
        })
      ).toThrow(/No configuration file found in paths/);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      // Arrange
      const config: FileConfiguration = {
        rest: {
          port: 3000,
          host: 'localhost',
          cors: true,
        },
        ui: {
          port: 3001,
          host: 'localhost',
        },
      };

      // Act & Assert
      expect(() => FileConfigLoader.validateConfig(config)).not.toThrow();
    });

    it('should reject invalid REST port', () => {
      // Arrange
      const config: FileConfiguration = {
        rest: {
          port: 70000, // Invalid port
        },
      };

      // Act & Assert
      expect(() => FileConfigLoader.validateConfig(config)).toThrow(
        'REST API port must be between 1 and 65535'
      );
    });

    it('should reject invalid UI port', () => {
      // Arrange
      const config: FileConfiguration = {
        ui: {
          port: 0, // Invalid port
        },
      };

      // Act & Assert
      expect(() => FileConfigLoader.validateConfig(config)).toThrow(
        'UI port must be between 1 and 65535'
      );
    });

    it('should reject invalid REST host type', () => {
      // Arrange
      const config: FileConfiguration = {
        rest: {
          host: 123 as any, // Invalid host type
        },
      };

      // Act & Assert
      expect(() => FileConfigLoader.validateConfig(config)).toThrow(
        'REST API host must be a string'
      );
    });
  });

  describe('Configuration Merging', () => {
    it('should merge configuration with defaults', () => {
      // Arrange
      const defaults: FileConfiguration = {
        rest: {
          port: 3000,
          host: 'localhost',
          cors: true,
          middleware: {
            compression: false,
            rateLimit: {
              enabled: false,
              windowMs: 60000,
            },
          },
        },
        ui: {
          port: 3001,
          host: 'localhost',
        },
      };

      const config: FileConfiguration = {
        rest: {
          port: 4000,
          middleware: {
            compression: true,
            rateLimit: {
              enabled: true,
            },
          },
        },
      };

      // Act
      const result = FileConfigLoader.mergeWithDefaults(config, defaults);

      // Assert
      expect(result.rest?.port).toBe(4000); // Overridden
      expect(result.rest?.host).toBe('localhost'); // From defaults
      expect(result.rest?.cors).toBe(true); // From defaults
      expect(result.rest?.middleware?.compression).toBe(true); // Overridden
      expect(result.rest?.middleware?.rateLimit?.enabled).toBe(true); // Overridden
      expect(result.rest?.middleware?.rateLimit?.windowMs).toBe(60000); // From defaults
      expect(result.ui?.port).toBe(3001); // From defaults
    });
  });

  describe('Unsupported File Formats', () => {
    it('should reject unsupported file extensions', () => {
      // Arrange
      const testTxtFile = resolve(testConfigDir, 'test.txt');
      writeFileSync(testTxtFile, 'some content');

      // Act & Assert
      expect(() =>
        FileConfigLoader.loadConfig({
          configPath: testTxtFile,
          required: true,
        })
      ).toThrow('Unsupported configuration file format: txt');
    });
  });
});
