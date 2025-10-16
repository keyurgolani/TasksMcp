#!/usr/bin/env node

/**
 * MCP CLI for MCP server startup and configuration
 * Handles MCP server initialization with environment variable configuration
 */

import { ConsolidatedMcpServer } from './dist/api/mcp/mcp-server.js';
import { ConfigurationManager } from './dist/infrastructure/config/system-configuration.js';

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
    const shutdown = async signal => {
      console.log(`Received ${signal}, shutting down MCP Server...`);
      try {
        await server.stop();
        console.log('MCP Server stopped successfully');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error.message);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start MCP Server:', error.message);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMcpServer();
}

export { startMcpServer };
