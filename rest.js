#!/usr/bin/env node

/**
 * REST CLI for REST API server startup
 * Handles REST API server initialization with JSON/YAML configuration
 */

const { RestApiServer } = require('./dist/app/rest-api-server.js');
const {
  ConfigurationManager,
} = require('./dist/infrastructure/config/system-configuration.js');

async function startRestServer() {
  try {
    const configManager = new ConfigurationManager();
    const config = configManager.getConfiguration();

    console.log('Starting REST API Server...');
    console.log(
      `Server: http://${config.server.rest.host}:${config.server.rest.port}`
    );
    console.log(
      `Data Store: ${config.dataStore.type} at ${config.dataStore.location}`
    );

    const server = new RestApiServer(config);
    await server.start();

    console.log(
      `REST API Server started successfully on port ${config.server.rest.port}`
    );

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down REST API Server...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Shutting down REST API Server...');
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start REST API Server:', error.message);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startRestServer();
}

module.exports = { startRestServer };
