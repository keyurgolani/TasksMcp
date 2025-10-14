#!/usr/bin/env node

/**
 * REST CLI for REST API server startup
 * Handles REST API server initialization with JSON/YAML configuration using orchestration layer
 */

const { RestServer } = require('./dist/api/rest/rest-server.js');
const {
  ConfigurationManager,
} = require('./dist/infrastructure/config/system-configuration.js');

// Import orchestration services
const {
  TaskOrchestratorImpl,
} = require('./dist/core/orchestration/services/task-orchestrator-impl.js');
const {
  ListOrchestratorImpl,
} = require('./dist/core/orchestration/services/list-orchestrator-impl.js');
const {
  DependencyOrchestratorImpl,
} = require('./dist/core/orchestration/services/dependency-orchestrator-impl.js');
const {
  SearchOrchestratorImpl,
} = require('./dist/core/orchestration/services/search-orchestrator-impl.js');
const {
  AgentPromptOrchestratorImpl,
} = require('./dist/core/orchestration/services/agent-prompt-orchestrator-impl.js');

// Import data delegation service
const {
  DataDelegationService,
} = require('./dist/data/delegation/data-delegation-service.js');

async function startRestServer() {
  try {
    const configManager = new ConfigurationManager();
    const config = configManager.getConfiguration();

    console.log('Starting REST API Server v2...');
    console.log(
      `Server: http://${config.server.rest.host}:${config.server.rest.port}`
    );
    console.log(
      `Data Store: ${config.dataStore.type} at ${config.dataStore.location}`
    );
    console.log('Architecture: Orchestration-based with bulk operations');

    // Initialize data delegation service
    const dataDelegationService = new DataDelegationService(config);
    await dataDelegationService.initialize();

    // Initialize orchestration services
    const taskOrchestrator = new TaskOrchestratorImpl(dataDelegationService);
    const listOrchestrator = new ListOrchestratorImpl(dataDelegationService);
    const dependencyOrchestrator = new DependencyOrchestratorImpl(
      dataDelegationService
    );
    const searchOrchestrator = new SearchOrchestratorImpl(
      dataDelegationService
    );
    const agentPromptOrchestrator = new AgentPromptOrchestratorImpl(
      dataDelegationService
    );

    // Create REST server with orchestration dependencies
    const server = new RestServer(
      {
        port: config.server.rest.port,
        host: config.server.rest.host,
        corsOrigins: config.server.rest.corsOrigins || ['*'],
        requestTimeout: config.server.rest.requestTimeout || 30000,
        bodyLimit: config.server.rest.bodyLimit || '10mb',
      },
      {
        taskOrchestrator,
        listOrchestrator,
        dependencyOrchestrator,
        searchOrchestrator,
        agentPromptOrchestrator,
      }
    );

    await server.start();

    console.log(
      `REST API Server v2 started successfully on port ${config.server.rest.port}`
    );
    console.log('Features enabled:');
    console.log('  ✓ Bulk operations on all entities');
    console.log('  ✓ Agent prompt templates with variable substitution');
    console.log('  ✓ Circular dependency detection and analysis');
    console.log('  ✓ Advanced search and filtering');
    console.log('  ✓ Direct orchestration layer integration');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down REST API Server...');
      await server.stop();
      await dataDelegationService.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Shutting down REST API Server...');
      await server.stop();
      await dataDelegationService.cleanup();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start REST API Server:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startRestServer();
}

module.exports = { startRestServer };
