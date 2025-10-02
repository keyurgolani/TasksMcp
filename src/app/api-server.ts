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

import { RestApiServer } from "./rest-api-server.js";
import {
  initializeApplication,
  shutdownApplication,
  type InitializationResult,
} from "./initialization.js";
import { TodoListManager } from "../domain/lists/todo-list-manager.js";
import { DependencyResolver } from "../domain/tasks/dependency-manager.js";
import { ExitCriteriaManager } from "../domain/tasks/exit-criteria-manager.js";
import { ActionPlanManager } from "../domain/tasks/action-plan-manager.js";
import { NotesManager } from "../domain/tasks/notes-manager.js";
import { IntelligenceManager } from "../domain/intelligence/intelligence-manager.js";
import { logger } from "../shared/utils/logger.js";
import type { ApiConfig } from "../shared/types/api.js";

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
    process.env["API_PORT"] || process.env["PORT"] || "3001",
    10
  );
  const corsOrigins = process.env["CORS_ORIGINS"]?.split(",") || ["*"];
  const environment = process.env["NODE_ENV"] || "development";
  const logLevel = process.env["LOG_LEVEL"] || "info";

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

    logger.info("Starting REST API server", {
      port: config.port,
      environment: config.environment,
      corsOrigins: config.corsOrigins,
    });

    // Initialize application (data layer)
    logger.info("Initializing data layer...");
    initResult = await initializeApplication({
      useEnvironment: true,
      requireConfigFile: false,
      enableAggregation: true,
    });

    logger.info("Data layer initialized", {
      healthySources: initResult.healthStatus.healthy,
      totalSources: initResult.healthStatus.total,
    });

    // Create domain managers
    logger.info("Creating domain managers...");

    const todoListManager = new TodoListManager(initResult.repository);

    const dependencyManager = new DependencyResolver(initResult.repository);

    const exitCriteriaManager = new ExitCriteriaManager(initResult.repository);

    const actionPlanManager = new ActionPlanManager(initResult.repository);

    const notesManager = new NotesManager(initResult.repository);

    const intelligenceManager = new IntelligenceManager();

    logger.info("Domain managers created");

    // Create API server configuration
    const apiConfig: Partial<ApiConfig> = {
      port: config.port,
      corsOrigins: config.corsOrigins,
      authEnabled: false,
      requestTimeout: 30000,
      bodyLimit: "10mb",
      rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
      rateLimitMax: 100,
    };

    // Create and initialize REST API server
    logger.info("Creating REST API server...");

    apiServer = new RestApiServer(
      apiConfig,
      todoListManager,
      dependencyManager,
      exitCriteriaManager,
      actionPlanManager,
      notesManager,
      intelligenceManager
    );

    // Initialize routes
    await apiServer.initialize();
    logger.info("REST API server routes initialized");

    // Start the server
    await apiServer.start();

    // Log startup success
    logger.info("✓ REST API server started successfully", {
      port: config.port,
      environment: config.environment,
      apiUrl: `http://localhost:${config.port}`,
      healthUrl: `http://localhost:${config.port}/health`,
      apiDocsUrl: `http://localhost:${config.port}/api`,
      endpoints: {
        health: "/health",
        api: "/api/v1",
        lists: "/api/v1/lists",
        tasks: "/api/v1/tasks",
        dependencies: "/api/v1/dependencies",
        exitCriteria: "/api/v1/exit-criteria",
        actionPlans: "/api/v1/action-plans",
        notes: "/api/v1/notes",
      },
    });

    console.log(
      "\n╔════════════════════════════════════════════════════════════╗"
    );
    console.log(
      "║         REST API Server Started Successfully              ║"
    );
    console.log(
      "╚════════════════════════════════════════════════════════════╝"
    );
    console.log(`\n  Environment:  ${config.environment}`);
    console.log(`  Port:         ${config.port}`);
    console.log(`  API URL:      http://localhost:${config.port}`);
    console.log(`  Health:       http://localhost:${config.port}/health`);
    console.log(`  API Docs:     http://localhost:${config.port}/api`);
    console.log(
      `\n  Data Sources: ${initResult.healthStatus.healthy}/${initResult.healthStatus.total} healthy`
    );
    console.log("\n  Press Ctrl+C to stop the server\n");

    // Setup graceful shutdown
    setupGracefulShutdown(apiServer, initResult);
  } catch (error) {
    logger.error("Failed to start REST API server", { error });
    console.error("\n✗ Failed to start REST API server:");
    console.error(
      `  ${error instanceof Error ? error.message : String(error)}\n`
    );

    // Cleanup on error
    if (apiServer) {
      try {
        await apiServer.stop();
      } catch (stopError) {
        logger.error("Error stopping server during cleanup", {
          error: stopError,
        });
      }
    }

    if (initResult) {
      try {
        await shutdownApplication(initResult);
      } catch (shutdownError) {
        logger.error("Error shutting down application during cleanup", {
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
      logger.warn("Shutdown already in progress, ignoring signal", { signal });
      return;
    }

    isShuttingDown = true;
    logger.info("Received shutdown signal, starting graceful shutdown", {
      signal,
    });
    console.log(`\n\n  Shutting down gracefully (${signal})...`);

    try {
      // Stop accepting new connections
      logger.info("Stopping REST API server...");
      await apiServer.stop();
      logger.info("REST API server stopped");
      console.log("  ✓ REST API server stopped");

      // Shutdown data layer
      logger.info("Shutting down data layer...");
      await shutdownApplication(initResult);
      logger.info("Data layer shutdown complete");
      console.log("  ✓ Data layer shutdown complete");

      console.log("\n  Shutdown complete\n");
      logger.info("Graceful shutdown complete");

      process.exit(0);
    } catch (error) {
      logger.error("Error during graceful shutdown", { error });
      console.error("\n  ✗ Error during shutdown:");
      console.error(
        `    ${error instanceof Error ? error.message : String(error)}\n`
      );
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Handle uncaught errors
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", { error });
    console.error("\n✗ Uncaught exception:", error);
    shutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled rejection", { reason, promise });
    console.error("\n✗ Unhandled rejection:", reason);
    shutdown("unhandledRejection");
  });
}

// Start the server
main().catch((error) => {
  logger.error("Fatal error in main", { error });
  console.error("\n✗ Fatal error:", error);
  process.exit(1);
});
