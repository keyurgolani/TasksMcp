#!/usr/bin/env node

/**
 * MCP CLI for MCP server startup and configuration
 * Handles MCP server initialization with environment variable configuration
 */

const { ConsolidatedMcpServer } = require('./dist/api/mcp/mcp-server.js');
const {
  ConfigurationManager,
} = require('./dist/infrastructure/config/system-configuration.js');

async function startMcpServer() {
  try {
    const configManager = new ConfigurationManager();
    const config = configManager.getConfiguration();

    console.log('Starting MCP Server...');
    console.log(
      `Data Store: ${config.dataStore.type} at ${config.dataStore.location}`
    );

    const server = new ConsolidatedMcpServer(config);
    await server.start();

    console.log('MCP Server started successfully');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down MCP Server...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Shutting down MCP Server...');
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start MCP Server:', error.message);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startMcpServer();
}

module.exports = { startMcpServer };
