/**
 * Example: Data Source Configuration System
 * 
 * This example demonstrates how to use the data source configuration system
 * to configure multiple storage backends with validation and environment support.
 */

import {
  type DataSourceConfig,
  type MultiSourceConfig,
  validateDataSourceConfig,
  validateMultiSourceConfig,
  getDefaultMultiSourceConfig,
  DataSourceConfigLoader,
} from '../src/infrastructure/config/index.js';

// Example 1: Create a filesystem data source configuration
console.log('=== Example 1: Filesystem Configuration ===\n');

const filesystemConfig: DataSourceConfig = {
  id: 'local-storage',
  name: 'Local File Storage',
  type: 'filesystem',
  priority: 100,
  readonly: false,
  enabled: true,
  tags: ['local', 'development'],
  config: {
    dataDirectory: './data',
    backupRetentionDays: 7,
    enableCompression: false,
  },
};

try {
  const validated = validateDataSourceConfig(filesystemConfig);
  console.log('✅ Filesystem configuration is valid');
  console.log(JSON.stringify(validated, null, 2));
} catch (error) {
  console.error('❌ Validation failed:', error);
}

// Example 2: Create a PostgreSQL data source configuration
console.log('\n=== Example 2: PostgreSQL Configuration ===\n');

const postgresConfig: DataSourceConfig = {
  id: 'shared-db',
  name: 'Shared PostgreSQL Database',
  type: 'postgresql',
  priority: 200,
  readonly: false,
  enabled: true,
  tags: ['shared', 'production'],
  config: {
    host: 'localhost',
    port: 5432,
    database: 'task_manager',
    user: 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'changeme',
    ssl: true,
    maxConnections: 10,
  },
};

try {
  const validated = validateDataSourceConfig(postgresConfig);
  console.log('✅ PostgreSQL configuration is valid');
  console.log(JSON.stringify(validated, null, 2));
} catch (error) {
  console.error('❌ Validation failed:', error);
}

// Example 3: Create a multi-source configuration
console.log('\n=== Example 3: Multi-Source Configuration ===\n');

const multiSourceConfig: MultiSourceConfig = {
  sources: [filesystemConfig, postgresConfig],
  conflictResolution: 'priority',
  aggregationEnabled: true,
  operationTimeout: 30000,
  maxRetries: 3,
  allowPartialFailure: true,
};

try {
  const validated = validateMultiSourceConfig(multiSourceConfig);
  console.log('✅ Multi-source configuration is valid');
  console.log(`   - ${validated.sources.length} sources configured`);
  console.log(`   - Conflict resolution: ${validated.conflictResolution}`);
  console.log(`   - Aggregation enabled: ${validated.aggregationEnabled}`);
} catch (error) {
  console.error('❌ Validation failed:', error);
}

// Example 4: Get default configuration
console.log('\n=== Example 4: Default Configuration ===\n');

const defaultConfig = getDefaultMultiSourceConfig();
console.log('✅ Default configuration generated');
console.log(JSON.stringify(defaultConfig, null, 2));

// Example 5: Load configuration from file (if exists)
console.log('\n=== Example 5: Load Configuration ===\n');

const loader = new DataSourceConfigLoader();

(async () => {
  try {
    const config = await loader.load({
      configPath: './config/data-sources.json',
      requireConfigFile: false,
    });
    
    console.log('✅ Configuration loaded successfully');
    console.log(`   - ${config.sources.length} sources configured`);
    console.log(`   - Enabled sources: ${config.sources.filter(s => s.enabled).length}`);
    
    // List all sources
    console.log('\n   Sources:');
    for (const source of config.sources) {
      console.log(`   - ${source.name} (${source.type})`);
      console.log(`     Priority: ${source.priority}, Enabled: ${source.enabled}, Read-only: ${source.readonly}`);
      if (source.tags && source.tags.length > 0) {
        console.log(`     Tags: ${source.tags.join(', ')}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to load configuration:', error);
  }
})();

// Example 6: Demonstrate validation errors
console.log('\n=== Example 6: Validation Errors ===\n');

const invalidConfig = {
  id: 'invalid',
  name: 'Invalid Config',
  type: 'invalid-type', // Invalid type
  priority: -1, // Invalid priority
  readonly: false,
  enabled: true,
  config: {},
};

try {
  validateDataSourceConfig(invalidConfig as any);
  console.log('❌ Should have thrown validation error');
} catch (error) {
  console.log('✅ Validation correctly rejected invalid configuration');
  if (error instanceof Error) {
    console.log(`   Error: ${error.message}`);
  }
}

console.log('\n=== Examples Complete ===\n');
