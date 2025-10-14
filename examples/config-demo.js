#!/usr/bin/env node

/* eslint-disable no-undef */

/**
 * Configuration Management Demo
 *
 * This script demonstrates the Configuration Management domain capabilities:
 * - Environment variable configuration for MCP server
 * - JSON/YAML configuration for REST API server
 * - Default directory configuration
 * - Multiple data store configurations
 * - Feature gating capabilities
 */

import { ConfigurationManager } from '../dist/infrastructure/config/system-configuration.js';
import { FileConfigLoader } from '../dist/infrastructure/config/file-config-loader.js';

console.log('🔧 Configuration Management Demo\n');

// Demonstrate environment variable configuration
console.log('1. Environment Variable Configuration (MCP Server):');
console.log('   Current environment variables:');
console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   - MCP_PORT: ${process.env.MCP_PORT || 'not set'}`);
console.log(
  `   - DATA_STORE_TYPE: ${process.env.DATA_STORE_TYPE || 'not set'}`
);
console.log(
  `   - DATA_STORE_LOCATION: ${process.env.DATA_STORE_LOCATION || 'not set'}`
);
console.log(
  `   - FEATURE_AGENT_PROMPT_TEMPLATES: ${process.env.FEATURE_AGENT_PROMPT_TEMPLATES || 'not set'}`
);
console.log();

// Load configuration
const configManager = new ConfigurationManager();
const config = configManager.getConfiguration();

console.log('2. Loaded Configuration:');
console.log('   Data Store Configuration:');
console.log(`   - Type: ${config.dataStore.type}`);
console.log(`   - Location: ${config.dataStore.location}`);
console.log(`   - Options: ${JSON.stringify(config.dataStore.options)}`);
console.log();

console.log('   Server Configuration:');
console.log(`   - MCP Port: ${config.server.mcp.port || 'not configured'}`);
console.log(`   - MCP Host: ${config.server.mcp.host || 'not configured'}`);
console.log(`   - REST Port: ${config.server.rest.port}`);
console.log(`   - REST Host: ${config.server.rest.host}`);
console.log(`   - REST CORS: ${config.server.rest.cors}`);
console.log(`   - UI Port: ${config.server.ui.port}`);
console.log(`   - UI Host: ${config.server.ui.host}`);
console.log();

console.log('   Feature Configuration:');
console.log(
  `   - Agent Prompt Templates: ${config.features.agentPromptTemplates}`
);
console.log(
  `   - Dependency Validation: ${config.features.dependencyValidation}`
);
console.log(
  `   - Circular Dependency Detection: ${config.features.circularDependencyDetection}`
);
console.log();

console.log('   Performance Configuration:');
console.log(
  `   - Template Render Timeout: ${config.performance.templateRenderTimeout}ms`
);
console.log(
  `   - Search Result Limit: ${config.performance.searchResultLimit}`
);
console.log(
  `   - Dependency Graph Max Size: ${config.performance.dependencyGraphMaxSize}`
);
console.log();

// Demonstrate file configuration loading
console.log('3. File Configuration Loading:');
try {
  const fileConfig = FileConfigLoader.loadConfig({
    fallbackPaths: [
      './examples/config/server.json',
      './examples/config/server.yaml',
    ],
    required: false,
  });

  if (Object.keys(fileConfig).length > 0) {
    console.log('   ✅ Configuration file found and loaded:');
    console.log(
      `   - Environment: ${fileConfig.environment || 'not specified'}`
    );
    console.log(`   - Version: ${fileConfig.version || 'not specified'}`);
    if (fileConfig.rest) {
      console.log(`   - REST Port: ${fileConfig.rest.port || 'not specified'}`);
      console.log(`   - REST Host: ${fileConfig.rest.host || 'not specified'}`);
      console.log(`   - REST CORS: ${fileConfig.rest.cors ?? 'not specified'}`);
    }
    if (fileConfig.ui) {
      console.log(`   - UI Port: ${fileConfig.ui.port || 'not specified'}`);
      console.log(`   - UI Host: ${fileConfig.ui.host || 'not specified'}`);
    }
  } else {
    console.log('   ℹ️  No configuration file found, using defaults');
  }
} catch (error) {
  console.log(`   ❌ Error loading configuration file: ${error.message}`);
}
console.log();

// Demonstrate configuration access methods
console.log('4. Configuration Access Methods:');
console.log('   Available methods:');
console.log('   - getConfiguration(): Complete configuration');
console.log('   - getDataStoreConfig(): Data store configuration only');
console.log('   - getServerConfig(): Server configuration only');
console.log('   - getFeaturesConfig(): Features configuration only');
console.log('   - getPerformanceConfig(): Performance configuration only');
console.log();

// Show data store specific configuration
const dataStoreConfig = configManager.getDataStoreConfig();
console.log('   Data Store Config (isolated):');
console.log(`   - ${JSON.stringify(dataStoreConfig, null, 2)}`);
console.log();

// Show features specific configuration
const featuresConfig = configManager.getFeaturesConfig();
console.log('   Features Config (isolated):');
console.log(`   - ${JSON.stringify(featuresConfig, null, 2)}`);
console.log();

console.log('5. Configuration Examples:');
console.log('   To configure MCP server with environment variables:');
console.log('   export MCP_PORT=8080');
console.log('   export DATA_STORE_LOCATION=/app/data');
console.log('   export FEATURE_AGENT_PROMPT_TEMPLATES=true');
console.log('   node dist/mcp.js');
console.log();

console.log('   To configure REST API server with JSON file:');
console.log('   Create config/server.json with REST configuration');
console.log('   node dist/rest.js');
console.log();

console.log('   To use custom configuration file:');
console.log('   export CONFIG_FILE=/path/to/custom-config.yaml');
console.log('   node dist/rest.js');
console.log();

console.log('✅ Configuration Management Demo Complete!');
