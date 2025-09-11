#!/usr/bin/env node

/**
 * MCP Task Manager CLI
 * Command-line interface for the MCP Task Manager server
 */

import { McpTaskManagerServer } from './index.js';
import { logger } from './utils/logger.js';

interface CliOptions {
  help?: boolean;
  version?: boolean;
  config?: string;
  port?: number;
  host?: string;
  verbose?: boolean;
  quiet?: boolean;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '-v':
      case '--version':
        options.version = true;
        break;
      case '-c':
      case '--config': {
        const configArg = args[++i];
        if (configArg !== undefined && configArg.length > 0) {
          options.config = configArg;
        }
        break;
      }
      case '-p':
      case '--port': {
        const portArg = args[++i];
        if (portArg !== undefined && portArg.length > 0) {
          options.port = parseInt(portArg, 10);
        }
        break;
      }
      case '--host': {
        const hostArg = args[++i];
        if (hostArg !== undefined && hostArg.length > 0) {
          options.host = hostArg;
        }
        break;
      }
      case '--verbose':
        options.verbose = true;
        break;
      case '--quiet':
        options.quiet = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`
MCP Task Manager - Intelligent task management for AI agents

USAGE:
  task-list-mcp [OPTIONS]

OPTIONS:
  -h, --help              Show this help message
  -v, --version           Show version information
  -c, --config <file>     Configuration file path
  -p, --port <port>       Port number (for HTTP mode)
  --host <host>           Host address (for HTTP mode)
  --verbose               Enable verbose logging
  --quiet                 Suppress non-error output

EXAMPLES:
  # Start MCP server (stdio mode - default)
  task-list-mcp

  # Start with custom configuration
  task-list-mcp --config ./my-config.json

  # Start with verbose logging
  task-list-mcp --verbose

  # Show version
  task-list-mcp --version

CONFIGURATION:
  The server can be configured via:
  1. Configuration file (--config option)
  2. Environment variables
  3. Default settings

  For MCP client configuration examples, see:
  https://github.com/keyurgolani/task-list-mcp#mcp-server-configuration

ENVIRONMENT VARIABLES:
  NODE_ENV                Environment (development, production)
  MCP_STORAGE_TYPE        Storage backend (memory, file, postgresql)
  MCP_DATA_DIR            Data directory for file storage
  MCP_LOG_LEVEL           Log level (debug, info, warn, error)
  MCP_MONITORING_ENABLED  Enable monitoring (true, false)

For more information, visit: https://github.com/keyurgolani/task-list-mcp
`);
}

async function showVersion(): Promise<void> {
  try {
    // Read version from package.json
    const fs = await import('fs');
    const packageJsonContent = fs.readFileSync(
      new URL('../package.json', import.meta.url),
      'utf8'
    );
    const packageJson = JSON.parse(packageJsonContent) as { version: string };

    // eslint-disable-next-line no-console
    console.log(`MCP Task Manager v${packageJson.version}`);
    // eslint-disable-next-line no-console
    console.log(`Node.js ${process.version}`);
    // eslint-disable-next-line no-console
    console.log(`Platform: ${process.platform} ${process.arch}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`MCP Task Manager v1.0.0`);
    // eslint-disable-next-line no-console
    console.log(`Node.js ${process.version}`);
    // eslint-disable-next-line no-console
    console.log(`Platform: ${process.platform} ${process.arch}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  // Handle help and version flags
  if (options.help === true) {
    showHelp();
    process.exit(0);
  }

  if (options.version === true) {
    await showVersion();
    process.exit(0);
  }

  // Set log level based on options
  if (options.verbose === true) {
    process.env['MCP_LOG_LEVEL'] = 'debug';
  } else if (options.quiet === true) {
    process.env['MCP_LOG_LEVEL'] = 'error';
  }

  // Set configuration file if provided
  if (options.config !== undefined && options.config.length > 0) {
    process.env['MCP_CONFIG_FILE'] = options.config;
  }

  try {
    logger.info('Starting MCP Task Manager server...', {
      version: process.env['npm_package_version'] ?? '1.0.0',
      nodeVersion: process.version,
      platform: `${process.platform} ${process.arch}`,
      pid: process.pid,
    });

    const server = new McpTaskManagerServer();
    await server.start();

    // Handle graceful shutdown
    const shutdown = (signal: string): void => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      try {
        // Add any cleanup logic here
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGINT', () => {
      shutdown('SIGINT');
    });
    process.on('SIGTERM', () => {
      shutdown('SIGTERM');
    });

    // Keep the process alive
    process.stdin.resume();
  } catch (error) {
    logger.error('Failed to start MCP Task Manager server', { error });
    // eslint-disable-next-line no-console
    console.error(
      'Failed to start server:',
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', { reason, promise });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

// Start the CLI
main().catch(error => {
  // eslint-disable-next-line no-console
  console.error('CLI startup error:', error);
  process.exit(1);
});
