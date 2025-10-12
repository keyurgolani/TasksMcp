/**
 * Tests for data source configuration system
 */

import { describe, it, expect } from 'vitest';

import {
  type DataSourceConfig,
  type MultiSourceConfig,
  validateDataSourceConfig,
  validateMultiSourceConfig,
  getDefaultMultiSourceConfig,
  schemas,
} from '../../../../src/infrastructure/config/data-source-config.js';

describe('DataSourceConfig', () => {
  describe('validateDataSourceConfig', () => {
    it('should validate a valid filesystem configuration', () => {
      const config: DataSourceConfig = {
        id: 'test-fs',
        name: 'Test Filesystem',
        type: 'filesystem',
        priority: 100,
        readonly: false,
        enabled: true,
        config: {
          dataDirectory: './data',
          backupRetentionDays: 7,
          enableCompression: false,
        },
      };

      const result = validateDataSourceConfig(config);
      expect(result).toEqual(config);
    });

    it('should validate a valid PostgreSQL configuration', () => {
      const config: DataSourceConfig = {
        id: 'test-pg',
        name: 'Test PostgreSQL',
        type: 'postgresql',
        priority: 200,
        readonly: false,
        enabled: true,
        config: {
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          user: 'test_user',
          password: 'test_pass',
          ssl: true,
          maxConnections: 10,
        },
      };

      const result = validateDataSourceConfig(config);
      expect(result).toEqual(config);
    });

    it('should validate a valid MongoDB configuration', () => {
      const config: DataSourceConfig = {
        id: 'test-mongo',
        name: 'Test MongoDB',
        type: 'mongodb',
        priority: 150,
        readonly: true,
        enabled: true,
        config: {
          uri: 'mongodb://localhost:27017',
          database: 'test_db',
          collection: 'tasks',
          maxPoolSize: 10,
        },
      };

      const result = validateDataSourceConfig(config);
      expect(result).toEqual(config);
    });

    it('should validate a valid memory configuration', () => {
      const config: DataSourceConfig = {
        id: 'test-mem',
        name: 'Test Memory',
        type: 'memory',
        priority: 300,
        readonly: false,
        enabled: true,
        config: {
          maxSize: 1000,
          persistToDisk: false,
        },
      };

      const result = validateDataSourceConfig(config);
      expect(result).toEqual(config);
    });

    it('should validate configuration with tags', () => {
      const config: DataSourceConfig = {
        id: 'test-tagged',
        name: 'Test Tagged',
        type: 'filesystem',
        priority: 100,
        readonly: false,
        enabled: true,
        tags: ['development', 'local'],
        config: {
          dataDirectory: './data',
        },
      };

      const result = validateDataSourceConfig(config);
      expect(result).toEqual(config);
    });

    it('should reject invalid data source type', () => {
      const config = {
        id: 'test-invalid',
        name: 'Test Invalid',
        type: 'invalid-type',
        priority: 100,
        readonly: false,
        enabled: true,
        config: {},
      };

      expect(() => validateDataSourceConfig(config)).toThrow();
    });

    it('should reject missing required fields', () => {
      const config = {
        id: 'test-incomplete',
        type: 'filesystem',
        priority: 100,
        // Missing name, readonly, enabled, config
      };

      expect(() => validateDataSourceConfig(config)).toThrow();
    });

    it('should reject invalid priority', () => {
      const config = {
        id: 'test-priority',
        name: 'Test Priority',
        type: 'filesystem',
        priority: -1, // Invalid negative priority
        readonly: false,
        enabled: true,
        config: {
          dataDirectory: './data',
        },
      };

      expect(() => validateDataSourceConfig(config)).toThrow();
    });

    it('should validate PostgreSQL config directly with schema', () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
      };

      const result = schemas.PostgreSQLConfig.parse(config);
      expect(result).toEqual(config);

      // Test that invalid port is rejected
      expect(() =>
        schemas.PostgreSQLConfig.parse({ ...config, port: 0 })
      ).toThrow();
      expect(() =>
        schemas.PostgreSQLConfig.parse({ ...config, port: 99999 })
      ).toThrow();
    });
  });

  describe('validateMultiSourceConfig', () => {
    it('should validate a valid multi-source configuration', () => {
      const config: MultiSourceConfig = {
        sources: [
          {
            id: 'source-1',
            name: 'Source 1',
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

      const result = validateMultiSourceConfig(config);
      expect(result).toEqual(config);
    });

    it('should validate configuration with multiple sources', () => {
      const config: MultiSourceConfig = {
        sources: [
          {
            id: 'fs-source',
            name: 'Filesystem',
            type: 'filesystem',
            priority: 100,
            readonly: false,
            enabled: true,
            config: {
              dataDirectory: './data',
            },
          },
          {
            id: 'pg-source',
            name: 'PostgreSQL',
            type: 'postgresql',
            priority: 200,
            readonly: false,
            enabled: true,
            config: {
              host: 'localhost',
              port: 5432,
              database: 'test',
              user: 'test',
              password: 'test',
            },
          },
        ],
        conflictResolution: 'priority',
        aggregationEnabled: true,
        operationTimeout: 30000,
        maxRetries: 3,
        allowPartialFailure: true,
      };

      const result = validateMultiSourceConfig(config);
      expect(result).toEqual(config);
    });

    it('should reject empty sources array', () => {
      const config = {
        sources: [],
        conflictResolution: 'latest',
        aggregationEnabled: false,
        operationTimeout: 30000,
        maxRetries: 3,
        allowPartialFailure: true,
      };

      expect(() => validateMultiSourceConfig(config)).toThrow();
    });

    it('should reject invalid conflict resolution strategy', () => {
      const config = {
        sources: [
          {
            id: 'source-1',
            name: 'Source 1',
            type: 'filesystem',
            priority: 100,
            readonly: false,
            enabled: true,
            config: {
              dataDirectory: './data',
            },
          },
        ],
        conflictResolution: 'invalid-strategy',
        aggregationEnabled: false,
        operationTimeout: 30000,
        maxRetries: 3,
        allowPartialFailure: true,
      };

      expect(() => validateMultiSourceConfig(config)).toThrow();
    });

    it('should reject negative operation timeout', () => {
      const config = {
        sources: [
          {
            id: 'source-1',
            name: 'Source 1',
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
        operationTimeout: -1000,
        maxRetries: 3,
        allowPartialFailure: true,
      };

      expect(() => validateMultiSourceConfig(config)).toThrow();
    });

    it('should reject negative max retries', () => {
      const config = {
        sources: [
          {
            id: 'source-1',
            name: 'Source 1',
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
        maxRetries: -1,
        allowPartialFailure: true,
      };

      expect(() => validateMultiSourceConfig(config)).toThrow();
    });
  });

  describe('getDefaultMultiSourceConfig', () => {
    it('should return valid default configuration', () => {
      const config = getDefaultMultiSourceConfig();

      expect(config.sources).toHaveLength(1);
      expect(config.sources[0].type).toBe('filesystem');
      expect(config.sources[0].enabled).toBe(true);
      expect(config.conflictResolution).toBe('latest');
      expect(config.aggregationEnabled).toBe(false);

      // Should be valid
      const result = validateMultiSourceConfig(config);
      expect(result).toEqual(config);
    });

    it('should have sensible default values', () => {
      const config = getDefaultMultiSourceConfig();

      expect(config.operationTimeout).toBeGreaterThan(0);
      expect(config.maxRetries).toBeGreaterThanOrEqual(0);
      expect(config.allowPartialFailure).toBeDefined();
    });
  });

  describe('schemas', () => {
    it('should export all configuration schemas', () => {
      expect(schemas.FileSystemConfig).toBeDefined();
      expect(schemas.PostgreSQLConfig).toBeDefined();
      expect(schemas.MongoDBConfig).toBeDefined();
      expect(schemas.MemoryConfig).toBeDefined();
      expect(schemas.DataSourceConfig).toBeDefined();
      expect(schemas.MultiSourceConfig).toBeDefined();
    });

    it('should validate filesystem config with schema', () => {
      const config = {
        dataDirectory: './data',
        backupRetentionDays: 7,
        enableCompression: false,
      };

      const result = schemas.FileSystemConfig.parse(config);
      expect(result).toEqual(config);
    });

    it('should validate PostgreSQL config with schema', () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
        ssl: true,
        maxConnections: 10,
      };

      const result = schemas.PostgreSQLConfig.parse(config);
      expect(result).toEqual(config);
    });

    it('should validate MongoDB config with schema', () => {
      const config = {
        uri: 'mongodb://localhost:27017',
        database: 'test',
        collection: 'tasks',
        maxPoolSize: 10,
      };

      const result = schemas.MongoDBConfig.parse(config);
      expect(result).toEqual(config);
    });

    it('should validate memory config with schema', () => {
      const config = {
        maxSize: 1000,
        persistToDisk: false,
      };

      const result = schemas.MemoryConfig.parse(config);
      expect(result).toEqual(config);
    });
  });
});
