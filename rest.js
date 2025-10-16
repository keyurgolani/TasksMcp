#!/usr/bin/env node

/**
 * REST CLI for REST API server startup
 * Handles REST API server initialization with JSON/YAML configuration using orchestration layer
 */

import { RestServer } from './dist/api/rest/rest-server.js';
import { ConfigurationManager } from './dist/infrastructure/config/system-configuration.js';

// Import orchestration services
import { TaskOrchestratorImpl } from './dist/core/orchestration/services/task-orchestrator-impl.js';
import { ListOrchestratorImpl } from './dist/core/orchestration/services/list-orchestrator-impl.js';
import { DependencyOrchestratorImpl } from './dist/core/orchestration/services/dependency-orchestrator-impl.js';
import { SearchOrchestratorImpl } from './dist/core/orchestration/services/search-orchestrator-impl.js';
import { AgentPromptOrchestratorImpl } from './dist/core/orchestration/services/agent-prompt-orchestrator-impl.js';

// Import data delegation service
import { DataDelegationService } from './dist/data/delegation/data-delegation-service.js';
import { DataAccessServiceImpl } from './dist/data/access/data-access-service.js';
import { StorageFactory } from './dist/infrastructure/storage/storage-factory.js';

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

    // Initialize storage backend and data access service
    const storageType =
      config.dataStore.type === 'filesystem' ? 'file' : config.dataStore.type;
    const storageBackend = await StorageFactory.createStorage({
      type: storageType,
      file:
        storageType === 'file'
          ? {
              dataDirectory: config.dataStore.location,
              backupRetentionDays: 7,
              enableCompression: false,
            }
          : undefined,
    });

    const dataAccessService = new DataAccessServiceImpl(storageBackend);
    const dataDelegationService = new DataDelegationService(dataAccessService);

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
      // No cleanup needed for delegation service
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Shutting down REST API Server...');
      await server.stop();
      // No cleanup needed for delegation service
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start REST API Server:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startRestServer();
}

export { startRestServer };
