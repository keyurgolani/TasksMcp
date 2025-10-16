/**
 * REST API Server
 * Provides HTTP API for task management using orchestration layer
 */

import { Server } from 'http';

import cors from 'cors';
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from 'express';

import { LOGGER } from '../../shared/utils/logger.js';
import { healthCheckHandler } from '../handlers/health-check.js';
import {
  errorHandlerMiddleware,
  notFoundHandler,
} from '../middleware/error-handler.js';
import { requestIdMiddleware } from '../middleware/request-id.js';
import { requestLoggerMiddleware } from '../middleware/request-logger.js';

import { createAgentPromptRoutes } from './routes/agent-prompt-routes.js';
import { createDependencyRoutes } from './routes/dependency-routes.js';
import { createListRoutes } from './routes/list-routes.js';
import { createSearchRoutes } from './routes/search-routes.js';
import { createTaskRoutes } from './routes/task-routes.js';

import type { AgentPromptOrchestrator } from '../../core/orchestration/interfaces/agent-prompt-orchestrator.js';
import type { DependencyOrchestrator } from '../../core/orchestration/interfaces/dependency-orchestrator.js';
import type { ListOrchestrator } from '../../core/orchestration/interfaces/list-orchestrator.js';
import type { SearchOrchestrator } from '../../core/orchestration/interfaces/search-orchestrator.js';
import type { TaskOrchestrator } from '../../core/orchestration/interfaces/task-orchestrator.js';

/**
 * REST API Server configuration
 */
export interface RestServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  requestTimeout: number;
  bodyLimit: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
}

/**
 * Default REST API Server configuration
 */
const DEFAULT_CONFIG: RestServerConfig = {
  port: 3001,
  host: '0.0.0.0',
  corsOrigins: ['*'],
  requestTimeout: 30000,
  bodyLimit: '10mb',
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100,
};

/**
 * Orchestrator dependencies
 */
export interface OrchestratorDependencies {
  taskOrchestrator: TaskOrchestrator;
  listOrchestrator: ListOrchestrator;
  dependencyOrchestrator: DependencyOrchestrator;
  searchOrchestrator: SearchOrchestrator;
  agentPromptOrchestrator: AgentPromptOrchestrator;
}

/**
 * REST API Server class
 * Uses orchestration layer directly for all operations
 */
export class RestServer {
  private app: Express;
  private server: Server | null = null;
  private config: RestServerConfig;
  private orchestrators: OrchestratorDependencies;

  constructor(
    config: Partial<RestServerConfig>,
    orchestrators: OrchestratorDependencies
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.orchestrators = orchestrators;
    this.app = express();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Set up Express middleware
   */
  private setupMiddleware(): void {
    // Request ID generation (must be first)
    this.app.use(requestIdMiddleware);

    // CORS
    this.app.use(
      cors({
        origin: this.config.corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
        exposedHeaders: ['X-Request-ID'],
      })
    );

    // Body parsing
    this.app.use(express.json({ limit: this.config.bodyLimit }));
    this.app.use(
      express.urlencoded({ extended: true, limit: this.config.bodyLimit })
    );

    // Request logging
    this.app.use(requestLoggerMiddleware);

    // Request timeout
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.setTimeout(this.config.requestTimeout);
      res.setTimeout(this.config.requestTimeout);
      next();
    });
  }

  /**
   * Set up API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', healthCheckHandler);
    this.app.get('/api/health', healthCheckHandler);

    // API info endpoint
    this.app.get('/api', (_req: Request, res: Response) => {
      res.json({
        name: 'Task Management REST API',
        version: '2.0.0',
        description: 'REST API for task management using orchestration layer',
        features: {
          bulkOperations: true,
          agentPrompts: true,
          dependencyManagement: true,
          advancedSearch: true,
        },
        endpoints: {
          health: '/health',
          api: '/api/v2',
          docs: '/api/docs (coming soon)',
        },
      });
    });

    // API v2 routes (using orchestration layer)
    const apiRouter = express.Router();

    // API root endpoint
    apiRouter.get('/', (_req: Request, res: Response) => {
      res.json({
        message: 'Task Management API v2',
        status: 'operational',
        architecture: 'orchestration-based',
        endpoints: {
          tasks: '/api/v2/tasks',
          lists: '/api/v2/lists',
          dependencies: '/api/v2/dependencies',
          search: '/api/v2/search',
          agentPrompts: '/api/v2/agent-prompts',
        },
        features: {
          bulkOperations: 'Available for all entities',
          agentPrompts: 'Template rendering with variable substitution',
          dependencies: 'Circular dependency detection and analysis',
          search: 'Advanced filtering and unified search',
        },
      });
    });

    // Mount domain routes
    apiRouter.use(
      '/tasks',
      createTaskRoutes(this.orchestrators.taskOrchestrator)
    );
    apiRouter.use(
      '/lists',
      createListRoutes(this.orchestrators.listOrchestrator)
    );
    apiRouter.use(
      '/dependencies',
      createDependencyRoutes(this.orchestrators.dependencyOrchestrator)
    );
    apiRouter.use(
      '/search',
      createSearchRoutes(this.orchestrators.searchOrchestrator)
    );
    apiRouter.use(
      '/agent-prompts',
      createAgentPromptRoutes(this.orchestrators.agentPromptOrchestrator)
    );

    // API v2 info endpoint
    this.app.get('/api/v2', (_req: Request, res: Response) => {
      res.json({
        message: 'Task Management API v2',
        status: 'operational',
        version: '2.0.0',
        description: 'REST API for task management using orchestration layer',
        architecture: 'orchestration-based',
        endpoints: {
          tasks: '/api/v2/tasks',
          lists: '/api/v2/lists',
          dependencies: '/api/v2/dependencies',
          search: '/api/v2/search',
          agentPrompts: '/api/v2/agent-prompts',
        },
        features: {
          bulkOperations: true,
          agentPrompts: true,
          dependencyManagement: true,
          advancedSearch: true,
        },
      });
    });

    // Mount the router
    this.app.use('/api/v2', apiRouter);

    LOGGER.info('REST API routes configured', {
      version: 'v2',
      architecture: 'orchestration-based',
      features: [
        'bulk-operations',
        'agent-prompts',
        'dependency-management',
        'advanced-search',
      ],
      routes: [
        // Task routes
        'POST /api/v2/tasks',
        'GET /api/v2/tasks/search',
        'GET /api/v2/tasks/:id',
        'PUT /api/v2/tasks/:id',
        'DELETE /api/v2/tasks/:id',
        'POST /api/v2/tasks/:id/complete',
        'PUT /api/v2/tasks/:id/priority',
        'POST /api/v2/tasks/:id/tags',
        'DELETE /api/v2/tasks/:id/tags',
        'POST /api/v2/tasks/bulk',
        'PUT /api/v2/tasks/bulk',
        'DELETE /api/v2/tasks/bulk',
        'POST /api/v2/tasks/bulk/complete',
        'PUT /api/v2/tasks/bulk/priority',
        'POST /api/v2/tasks/bulk/tags',
        'DELETE /api/v2/tasks/bulk/tags',
        // List routes
        'POST /api/v2/lists',
        'GET /api/v2/lists',
        'GET /api/v2/lists/:id',
        'PUT /api/v2/lists/:id',
        'DELETE /api/v2/lists/:id',
        'POST /api/v2/lists/bulk',
        'PUT /api/v2/lists/bulk',
        'DELETE /api/v2/lists/bulk',
        // Dependency routes
        'POST /api/v2/dependencies/set',
        'GET /api/v2/dependencies/analyze/:listId',
        'GET /api/v2/dependencies/ready/:listId',
        'POST /api/v2/dependencies/validate',
        'POST /api/v2/dependencies/bulk/set',
        'POST /api/v2/dependencies/bulk/clear',
        // Search routes
        'GET /api/v2/search/tasks',
        'GET /api/v2/search/lists',
        'GET /api/v2/search/unified',
        // Agent prompt routes
        'GET /api/v2/agent-prompts/task/:taskId',
        'POST /api/v2/agent-prompts/validate',
        'POST /api/v2/agent-prompts/render',
      ],
    });
  }

  /**
   * Set up error handling
   */
  private setupErrorHandling(): void {
    // 404 handler for undefined routes
    this.app.use(notFoundHandler);

    // Global error handler (must be last)
    this.app.use(errorHandlerMiddleware);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(
          this.config.port,
          this.config.host,
          () => {
            LOGGER.info('REST API server started', {
              port: this.config.port,
              host: this.config.host,
              version: 'v2',
              architecture: 'orchestration-based',
              environment: process.env['NODE_ENV'] || 'development',
              features: {
                bulkOperations: true,
                agentPrompts: true,
                dependencyManagement: true,
                advancedSearch: true,
              },
            });
            resolve();
          }
        );

        this.server.on('error', (error: Error) => {
          LOGGER.error('REST API server error', { error });
          reject(error);
        });
      } catch (error) {
        LOGGER.error('Failed to start REST API server', { error });
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server!.close(error => {
        if (error) {
          LOGGER.error('Error stopping REST API server', { error });
          reject(error);
        } else {
          LOGGER.info('REST API server stopped');
          this.server = null;
          resolve();
        }
      });
    });
  }

  /**
   * Get the Express app instance
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Get the server configuration
   */
  getConfig(): RestServerConfig {
    return this.config;
  }

  /**
   * Get the orchestrator dependencies
   */
  getOrchestrators(): OrchestratorDependencies {
    return this.orchestrators;
  }
}
