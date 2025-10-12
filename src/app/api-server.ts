/**
 * REST API Server Startup Script
 *
 * Starts the REST API server with proper initialization and graceful shutdown.
 *
 * Features:
 * - Configurable port from environment variables
 * - Graceful shutdown on SIGINT/SIGTERM
 * - Comprehensive startup logging
 * - Health check verification
 * - Error handling and recovery
 */

import { TaskListManager } from '../domain/lists/task-list-manager.js';
import { ActionPlanManager } from '../domain/tasks/action-plan-manager.js';
import { DependencyResolver } from '../domain/tasks/dependency-manager.js';
import { ExitCriteriaManager } from '../domain/tasks/exit-criteria-manager.js';
import { NotesManager } from '../domain/tasks/notes-manager.js';
import { logger } from '../shared/utils/logger.js';

import {
  initializeApplication,
  shutdownApplication,
  type InitializationResult,
} from './initialization.js';
import { RestApiServer } from './rest-api-server.js';

import type { ApiConfig } from '../shared/types/api.js';

/**
 * API Server configuration from environment
 */
interface ApiServerConfig {
  port: number;
  corsOrigins: string[];
  environment: string;
  logLevel: string;
}

/**
 * Load configuration from environment variables
 */
function loadConfig(): ApiServerConfig {
  const port = parseInt(
    process.env['API_PORT'] || process.env['PORT'] || '3001',
    10
  );
  const corsOrigins = process.env['CORS_ORIGINS']?.split(',') || ['*'];
  const environment = process.env['NODE_ENV'] || 'development';
  const logLevel = process.env['LOG_LEVEL'] || 'info';

  return {
    port,
    corsOrigins,
    environment,
    logLevel,
  };
}

/**
 * Main startup function
 */
async function main(): Promise<void> {
  let initResult: InitializationResult | null = null;
  let apiServer: RestApiServer | null = null;

  try {
    // Load configuration
    const config = loadConfig();

    logger.info('Starting REST API server', {
      port: config.port,
      environment: config.environment,
      corsOrigins: config.corsOrigins,
    });

    // Initialize application (data layer)
    logger.info('Initializing data layer...');
    initResult = await initializeApplication({
      useEnvironment: true,
      requireConfigFile: false,
      enableAggregation: true,
    });

    logger.info('Data layer initialized', {
      healthySources: initResult.healthStatus.healthy,
      totalSources: initResult.healthStatus.total,
    });

    // Create domain managers
    logger.info('Creating domain managers...');

    const todoListManager = new TaskListManager(initResult.repository);

    const dependencyManager = new DependencyResolver(initResult.repository);

    const exitCriteriaManager = new ExitCriteriaManager(initResult.repository);

    const actionPlanManager = new ActionPlanManager(initResult.repository);

    const notesManager = new NotesManager(initResult.repository);

    logger.info('Domain managers created');

    // Create API server configuration
    const apiConfig: Partial<ApiConfig> = {
      port: config.port,
      corsOrigins: config.corsOrigins,
      authEnabled: false,
      requestTimeout: 30000,
      bodyLimit: '10mb',
      rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
      rateLimitMax: 100,
    };

    // Create and initialize REST API server
    logger.info('Creating REST API server...');

    apiServer = new RestApiServer(
      apiConfig,
      todoListManager,
      dependencyManager,
      exitCriteriaManager,
      actionPlanManager,
      notesManager
    );

    // Initialize routes
    await apiServer.initialize();
    logger.info('REST API server routes initialized');

    // Start the server
    await apiServer.start();

    // Log startup success
    logger.info('✓ REST API server started successfully', {
      port: config.port,
      environment: config.environment,
      apiUrl: `http://localhost:${config.port}`,
      healthUrl: `http://localhost:${config.port}/health`,
      apiDocsUrl: `http://localhost:${config.port}/api`,
      endpoints: {
        health: '/health',
        api: '/api/v1',
        lists: '/api/v1/lists',
        tasks: '/api/v1/tasks',
        dependencies: '/api/v1/dependencies',
        exitCriteria: '/api/v1/exit-criteria',
        actionPlans: '/api/v1/action-plans',
        notes: '/api/v1/notes',
      },
    });

    // Log server startup for monitoring
    logger.info('REST API server started successfully', {
      environment: config.environment,
      port: config.port,
      healthyDataSources: initResult.healthStatus.healthy,
      totalDataSources: initResult.healthStatus.total,
    });

    // User-facing startup message
    process.stdout.write(
      '\n╔════════════════════════════════════════════════════════════╗\n'
    );
    process.stdout.write(
      '║         REST API Server Started Successfully              ║\n'
    );
    process.stdout.write(
      '╚════════════════════════════════════════════════════════════╝\n'
    );
    process.stdout.write(`\n  Environment:  ${config.environment}\n`);
    process.stdout.write(`  Port:         ${config.port}\n`);
    process.stdout.write(`  API URL:      http://localhost:${config.port}\n`);
    process.stdout.write(
      `  Health:       http://localhost:${config.port}/health\n`
    );
    process.stdout.write(
      `  API Docs:     http://localhost:${config.port}/api\n`
    );
    process.stdout.write(
      `\n  Data Sources: ${initResult.healthStatus.healthy}/${initResult.healthStatus.total} healthy\n`
    );
    process.stdout.write('\n  Press Ctrl+C to stop the server\n\n');

    // Setup graceful shutdown
    setupGracefulShutdown(apiServer, initResult);
  } catch (error) {
    logger.error('Failed to start REST API server', { error });
    process.stderr.write('\n✗ Failed to start REST API server:\n');
    process.stderr.write(
      `  ${error instanceof Error ? error.message : String(error)}\n\n`
    );

    // Cleanup on error
    if (apiServer) {
      try {
        await apiServer.stop();
      } catch (stopError) {
        logger.error('Error stopping server during cleanup', {
          error: stopError,
        });
      }
    }

    if (initResult) {
      try {
        await shutdownApplication(initResult);
      } catch (shutdownError) {
        logger.error('Error shutting down application during cleanup', {
          error: shutdownError,
        });
      }
    }

    process.exit(1);
  }
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(
  apiServer: RestApiServer,
  initResult: InitializationResult
): void {
  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring signal', { signal });
      return;
    }

    isShuttingDown = true;
    logger.info('Received shutdown signal, starting graceful shutdown', {
      signal,
    });
    process.stdout.write(`\n\n  Shutting down gracefully (${signal})...\n`);

    try {
      // Stop accepting new connections
      logger.info('Stopping REST API server...');
      await apiServer.stop();
      logger.info('REST API server stopped');
      process.stdout.write('  ✓ REST API server stopped\n');

      // Shutdown data layer
      logger.info('Shutting down data layer...');
      await shutdownApplication(initResult);
      logger.info('Data layer shutdown complete');
      process.stdout.write('  ✓ Data layer shutdown complete\n');

      process.stdout.write('\n  Shutdown complete\n\n');
      logger.info('Graceful shutdown complete');

      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      process.stderr.write('\n  ✗ Error during shutdown:\n');
      process.stderr.write(
        `    ${error instanceof Error ? error.message : String(error)}\n\n`
      );
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught errors
  process.on('uncaughtException', error => {
    logger.error('Uncaught exception', { error });
    process.stderr.write('\n✗ Uncaught exception: ' + String(error) + '\n');
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
    process.stderr.write('\n✗ Unhandled rejection: ' + String(reason) + '\n');
    shutdown('unhandledRejection');
  });
}

// Start the server
main().catch(error => {
  logger.error('Fatal error in main', { error });
  process.stderr.write('\n✗ Fatal error: ' + String(error) + '\n');
  process.exit(1);
});
