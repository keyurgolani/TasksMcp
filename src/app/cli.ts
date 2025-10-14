#!/usr/bin/env node

/**
 * MCP Task Manager CLI
 * Command-line interface for the MCP Task Manager server
 */

import { logger } from '../shared/utils/logger.js';
import { getVersionInfo, getFormattedVersionInfo } from '../shared/version.js';

interface CliOptions {
  help?: boolean;
  version?: boolean;
  config?: string;
  port?: number;
  host?: string;
  verbose?: boolean;
  quiet?: boolean;
}

/**
 * Parse command line arguments into structured options
 *
 * Processes command line arguments and returns a structured options object.
 * Handles both short and long form arguments with proper validation.
 *
 * @param args - Array of command line arguments (typically process.argv.slice(2))
 * @returns CliOptions - Parsed options object with typed properties
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      // Help and version flags
      case '-h':
      case '--help':
        options.help = true;
        break;

      case '-v':
      case '--version':
        options.version = true;
        break;

      // Configuration options
      case '-c':
      case '--config': {
        const configArg = args[++i];
        if (configArg !== undefined && configArg.length > 0) {
          options.config = configArg;
        } else {
          throw new Error('--config requires a file path argument');
        }
        break;
      }

      // Network options (for future HTTP mode support)
      case '-p':
      case '--port': {
        const portArg = args[++i];
        if (portArg !== undefined && portArg.length > 0) {
          const port = parseInt(portArg, 10);
          if (isNaN(port) || port < 1 || port > 65535) {
            throw new Error('--port requires a valid port number (1-65535)');
          }
          options.port = port;
        } else {
          throw new Error('--port requires a port number argument');
        }
        break;
      }

      case '--host': {
        const hostArg = args[++i];
        if (hostArg !== undefined && hostArg.length > 0) {
          options.host = hostArg;
        } else {
          throw new Error('--host requires a hostname argument');
        }
        break;
      }

      // Logging options
      case '--verbose':
        options.verbose = true;
        break;

      case '--quiet':
        options.quiet = true;
        break;

      // Unknown argument
      default:
        if (arg && arg.startsWith('-')) {
          throw new Error(`Unknown option: ${arg}`);
        }
        // Ignore non-option arguments
        break;
    }
  }

  // Validate conflicting options
  if (options.verbose && options.quiet) {
    throw new Error('Cannot use both --verbose and --quiet options');
  }

  return options;
}

/**
 * CLI output utility for user-facing messages
 * Separate from logging to avoid confusion with system logs
 * Uses process.stdout/stderr directly to avoid ESLint no-console rule
 */
const cliOutput = {
  print: (message: string): void => {
    // CLI output is intentional user-facing output, not logging
    process.stdout.write(message + '\n');
  },
  error: (message: string): void => {
    process.stderr.write(message + '\n');
  },
};

function showHelp(): void {
  cliOutput.print(`
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

FEATURES:
  ✓ Action Plans          - Detailed step-by-step task breakdowns
  ✓ Implementation Notes  - Rich contextual notes for tasks and lists
  ✓ Pretty Print Display  - Human-readable formatted task views
  ✓ Cleanup Management   - Management of completed lists
  ✓ Project Organization  - Tag-based project management
  ✓ Progress Tracking     - Advanced progress tracking

MCP TOOLS AVAILABLE:
  LIST MANAGEMENT:
  • create_list           Create new task lists
  • get_list              Retrieve a specific list
  • list_all_lists        List all task lists
  • delete_list           Delete lists permanently

  TASK MANAGEMENT:
  • add_task              Add tasks to lists
  • update_task           Update task properties
  • remove_task           Remove tasks from lists
  • complete_task         Mark tasks as completed
  • set_task_priority     Change task priority
  • add_task_tags         Add tags to tasks
  • remove_task_tags      Remove tags from tasks

  SEARCH & DISPLAY:
  • search_tasks          Search tasks by text
  • filter_tasks          Filter tasks by criteria
  • show_tasks            Display formatted task lists

  ADVANCED FEATURES:
  • analyze_task_dependencies  Analyze task dependencies and project structure

CONFIGURATION:
  The server can be configured via:
  1. Configuration file (--config option)
  2. Environment variables
  3. Default settings

  For MCP client configuration examples, see:
  https://github.com/keyurgolani/task-list-mcp#mcp-server-configuration

ENVIRONMENT VARIABLES:
  # Core Configuration
  NODE_ENV                Environment (development, production, test)
  STORAGE_TYPE            Storage backend (memory, file, postgresql)
  DATA_DIRECTORY          Data directory for file storage
  LOG_LEVEL               Log level (debug, info, warn, error)
  
  # Features Configuration (always enabled)
  MAX_ACTION_PLAN_STEPS          Maximum steps per action plan (default: 250)
  MAX_IMPLEMENTATION_NOTES_PER_ENTITY  Max notes per task/list (default: 500)
  CLEANUP_MANAGEMENT_DAYS        Days for cleanup management (default: 7)
  PRETTY_PRINT_MAX_WIDTH         Max width for formatted output (default: 120)



For more information, visit: https://github.com/keyurgolani/task-list-mcp
`);
}

async function showVersion(): Promise<void> {
  try {
    cliOutput.print(`${getFormattedVersionInfo()}`);
    cliOutput.print(`Node.js ${process.version}`);
    cliOutput.print(`Platform: ${process.platform} ${process.arch}`);
    cliOutput.print('');
    cliOutput.print('Features:');
    cliOutput.print('  ✓ Action Plans & Progress Tracking');
    cliOutput.print('  ✓ Implementation Notes & Context');
    cliOutput.print('  ✓ Pretty Print Formatting');
    cliOutput.print('  ✓ Cleanup Management');
    cliOutput.print('  ✓ Project-Based Organization');
    cliOutput.print('  ✓ Advanced Filtering & Search');
  } catch (_error) {
    cliOutput.print(`MCP Task Manager v2.0.0`);
    cliOutput.print(`Node.js ${process.version}`);
    cliOutput.print(`Platform: ${process.platform} ${process.arch}`);
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
    // Dynamically import the server to avoid early initialization
    const { McpTaskManagerServer } = await import('./server.js');

    logger.info('Starting MCP Task Manager server...', {
      version: process.env['npm_package_version'] ?? getVersionInfo().version,
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
    cliOutput.error(
      `Failed to start server: ${
        error instanceof Error ? error.message : error
      }`
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
  cliOutput.error(`CLI startup error: ${error}`);
  process.exit(1);
});
