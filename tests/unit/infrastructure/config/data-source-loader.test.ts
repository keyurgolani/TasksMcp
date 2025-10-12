/**
 * Tests for data source configuration loader
 */

import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

import { describe, it, expect, beforeEach, afterEach, vi as _vi } from 'vitest';

import { DataSourceConfigLoader } from '../../../../src/infrastructure/config/data-source-loader.js';

import type { MultiSourceConfig } from '../../../../src/infrastructure/config/data-source-config.js';

describe('DataSourceConfigLoader', () => {
  let loader: DataSourceConfigLoader;
  let testConfigDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    loader = new DataSourceConfigLoader();
    testConfigDir = join(process.cwd(), 'test-config-' + Date.now());
    originalEnv = { ...process.env };
  });

  afterEach(async () => {
    // Restore environment
    process.env = originalEnv;

    // Clean up test directory
    try {
      await rm(testConfigDir, { recursive: true, force: true });
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('load', () => {
    it('should load configuration from file', async () => {
      const config: MultiSourceConfig = {
        sources: [
          {
            id: 'test-source',
            name: 'Test Source',
            type: 'filesystem',
            priority: 100,
            readonly: false,
            enabled: true,
            config: {
              dataDirectory: './data',
            },
          },
        ],
        conflictResolution: 'latest',
        aggregationEnabled: false,
        operationTimeout: 30000,
        maxRetries: 3,
        allowPartialFailure: true,
      };

      await mkdir(testConfigDir, { recursive: true });
      const configPath = join(testConfigDir, 'data-sources.json');
      await writeFile(configPath, JSON.stringify(config, null, 2));

      const result = await loader.load({ configPath });

      expect(result).toEqual(config);
    });

    it('should return default configuration if no file exists', async () => {
      const result = await loader.load({
        configPath: join(testConfigDir, 'nonexistent.json'),
        requireConfigFile: false,
      });

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].type).toBe('filesystem');
    });

    it('should throw error if required config file is missing', async () => {
      await expect(
        loader.load({
          configPath: join(testConfigDir, 'nonexistent.json'),
          requireConfigFile: true,
        })
      ).rejects.toThrow('Required configuration file not found');
    });

    it('should apply environment variable overrides', async () => {
      const config: MultiSourceConfig = {
        sources: [
          {
            id: 'pg-source',
            name: 'PostgreSQL',
            type: 'postgresql',
            priority: 100,
            readonly: false,
            enabled: true,
            config: {
              host: 'localhost',
              port: 5432,
              database: 'test',
              user: 'test',
              password: 'original-password',
            },
          },
        ],
        conflictResolution: 'latest',
        aggregationEnabled: false,
        operationTimeout: 30000,
        maxRetries: 3,
        allowPartialFailure: true,
      };

      await mkdir(testConfigDir, { recursive: true });
      const configPath = join(testConfigDir, 'data-sources.json');
      await writeFile(configPath, JSON.stringify(config, null, 2));

      // Set environment override
      process.env.DATASOURCE_PG_SOURCE_PASSWORD = 'overridden-password';

      const result = await loader.load({ configPath });

      const pgConfig = result.sources[0].config as any;
      expect(pgConfig.password).toBe('overridden-password');
    });

    it('should load from environment variables', async () => {
      process.env.DATASOURCE_COUNT = '1';
      process.env.DATASOURCE_0_ID = 'env-source';
      process.env.DATASOURCE_0_NAME = 'Environment Source';
      process.env.DATASOURCE_0_TYPE = 'filesystem';
      process.env.DATASOURCE_0_PRIORITY = '100';
      process.env.DATASOURCE_0_READONLY = 'false';
      process.env.DATASOURCE_0_ENABLED = 'true';
      process.env.DATASOURCE_0_DATA_DIRECTORY = './env-data';

      const result = await loader.load({
        configPath: join(testConfigDir, 'nonexistent.json'),
        requireConfigFile: false,
      });

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].id).toBe('env-source');
      expect(result.sources[0].name).toBe('Environment Source');
      expect(result.sources[0].type).toBe('filesystem');
    });

    it('should load multiple sources from environment', async () => {
      process.env.DATASOURCE_COUNT = '2';

      // First source (filesystem)
      process.env.DATASOURCE_0_ID = 'fs-source';
      process.env.DATASOURCE_0_TYPE = 'filesystem';
      process.env.DATASOURCE_0_PRIORITY = '100';
      process.env.DATASOURCE_0_READONLY = 'false';
      process.env.DATASOURCE_0_ENABLED = 'true';
      process.env.DATASOURCE_0_DATA_DIRECTORY = './data';

      // Second source (PostgreSQL)
      process.env.DATASOURCE_1_ID = 'pg-source';
      process.env.DATASOURCE_1_TYPE = 'postgresql';
      process.env.DATASOURCE_1_PRIORITY = '200';
      process.env.DATASOURCE_1_READONLY = 'false';
      process.env.DATASOURCE_1_ENABLED = 'true';
      process.env.DATASOURCE_1_HOST = 'localhost';
      process.env.DATASOURCE_1_PORT = '5432';
      process.env.DATASOURCE_1_DATABASE = 'test';
      process.env.DATASOURCE_1_USER = 'test';
      process.env.DATASOURCE_1_PASSWORD = 'test';

      const result = await loader.load({
        configPath: join(testConfigDir, 'nonexistent.json'),
        requireConfigFile: false,
      });

      expect(result.sources).toHaveLength(2);
      expect(result.sources[0].type).toBe('filesystem');
      expect(result.sources[1].type).toBe('postgresql');
    });

    it('should handle tags from environment', async () => {
      process.env.DATASOURCE_COUNT = '1';
      process.env.DATASOURCE_0_ID = 'tagged-source';
      process.env.DATASOURCE_0_TYPE = 'filesystem';
      process.env.DATASOURCE_0_PRIORITY = '100';
      process.env.DATASOURCE_0_READONLY = 'false';
      process.env.DATASOURCE_0_ENABLED = 'true';
      process.env.DATASOURCE_0_DATA_DIRECTORY = './data';
      process.env.DATASOURCE_0_TAGS = 'development,local,test';

      const result = await loader.load({
        configPath: join(testConfigDir, 'nonexistent.json'),
        requireConfigFile: false,
      });

      expect(result.sources[0].tags).toEqual(['development', 'local', 'test']);
    });

    it('should reject invalid JSON in config file', async () => {
      await mkdir(testConfigDir, { recursive: true });
      const configPath = join(testConfigDir, 'invalid.json');
      await writeFile(configPath, '{ invalid json }');

      await expect(loader.load({ configPath })).rejects.toThrow('Invalid JSON');
    });

    it('should reject invalid configuration schema', async () => {
      const invalidConfig = {
        sources: [], // Empty sources array is invalid
        conflictResolution: 'latest',
        aggregationEnabled: false,
        operationTimeout: 30000,
        maxRetries: 3,
        allowPartialFailure: true,
      };

      await mkdir(testConfigDir, { recursive: true });
      const configPath = join(testConfigDir, 'invalid-schema.json');
      await writeFile(configPath, JSON.stringify(invalidConfig));

      await expect(loader.load({ configPath })).rejects.toThrow();
    });
  });

  describe('save', () => {
    it('should save configuration to file', async () => {
      const config: MultiSourceConfig = {
        sources: [
          {
            id: 'save-test',
            name: 'Save Test',
            type: 'filesystem',
            priority: 100,
            readonly: false,
            enabled: true,
            config: {
              dataDirectory: './data',
            },
          },
        ],
        conflictResolution: 'latest',
        aggregationEnabled: false,
        operationTimeout: 30000,
        maxRetries: 3,
        allowPartialFailure: true,
      };

      await mkdir(testConfigDir, { recursive: true });
      const configPath = join(testConfigDir, 'saved-config.json');

      await loader.save(config, configPath);

      // Load it back and verify
      const loaded = await loader.load({ configPath });
      expect(loaded).toEqual(config);
    });

    it('should create directory if it does not exist', async () => {
      const config: MultiSourceConfig = {
        sources: [
          {
            id: 'mkdir-test',
            name: 'Mkdir Test',
            type: 'filesystem',
            priority: 100,
            readonly: false,
            enabled: true,
            config: {
              dataDirectory: './data',
            },
          },
        ],
        conflictResolution: 'latest',
        aggregationEnabled: false,
        operationTimeout: 30000,
        maxRetries: 3,
        allowPartialFailure: true,
      };

      const nestedDir = join(testConfigDir, 'nested', 'dir');
      const configPath = join(nestedDir, 'config.json');

      await loader.save(config, configPath);

      // Verify file was created
      const loaded = await loader.load({ configPath });
      expect(loaded).toEqual(config);
    });

    it('should reject invalid configuration', async () => {
      const invalidConfig = {
        sources: [],
        conflictResolution: 'latest',
        aggregationEnabled: false,
        operationTimeout: 30000,
        maxRetries: 3,
        allowPartialFailure: true,
      } as any;

      const configPath = join(testConfigDir, 'invalid.json');

      await expect(loader.save(invalidConfig, configPath)).rejects.toThrow();
    });
  });

  describe('environment variable parsing', () => {
    it('should parse boolean values correctly', async () => {
      process.env.DATASOURCE_COUNT = '1';
      process.env.DATASOURCE_0_ID = 'bool-test';
      process.env.DATASOURCE_0_TYPE = 'filesystem';
      process.env.DATASOURCE_0_PRIORITY = '100';
      process.env.DATASOURCE_0_READONLY = 'true';
      process.env.DATASOURCE_0_ENABLED = 'false';
      process.env.DATASOURCE_0_DATA_DIRECTORY = './data';

      const result = await loader.load({
        configPath: join(testConfigDir, 'nonexistent.json'),
        requireConfigFile: false,
      });

      expect(result.sources[0].readonly).toBe(true);
      expect(result.sources[0].enabled).toBe(false);
    });

    it('should parse number values correctly', async () => {
      process.env.DATASOURCE_COUNT = '1';
      process.env.DATASOURCE_0_ID = 'num-test';
      process.env.DATASOURCE_0_TYPE = 'postgresql';
      process.env.DATASOURCE_0_PRIORITY = '250';
      process.env.DATASOURCE_0_READONLY = 'false';
      process.env.DATASOURCE_0_ENABLED = 'true';
      process.env.DATASOURCE_0_HOST = 'localhost';
      process.env.DATASOURCE_0_PORT = '5433';
      process.env.DATASOURCE_0_DATABASE = 'test';
      process.env.DATASOURCE_0_USER = 'test';
      process.env.DATASOURCE_0_PASSWORD = 'test';
      process.env.DATASOURCE_0_MAX_CONNECTIONS = '20';

      const result = await loader.load({
        configPath: join(testConfigDir, 'nonexistent.json'),
        requireConfigFile: false,
      });

      expect(result.sources[0].priority).toBe(250);

      const pgConfig = result.sources[0].config as any;
      expect(pgConfig.port).toBe(5433);
      expect(pgConfig.maxConnections).toBe(20);
    });

    it('should throw error for invalid number values', async () => {
      process.env.DATASOURCE_COUNT = '1';
      process.env.DATASOURCE_0_ID = 'invalid-num';
      process.env.DATASOURCE_0_TYPE = 'filesystem';
      process.env.DATASOURCE_0_PRIORITY = 'not-a-number';
      process.env.DATASOURCE_0_READONLY = 'false';
      process.env.DATASOURCE_0_ENABLED = 'true';
      process.env.DATASOURCE_0_DATA_DIRECTORY = './data';

      await expect(
        loader.load({
          configPath: join(testConfigDir, 'nonexistent.json'),
          requireConfigFile: false,
        })
      ).rejects.toThrow();
    });
  });
});
