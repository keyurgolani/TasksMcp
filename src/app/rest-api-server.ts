/**
 * REST API Server
 * Provides HTTP API for task management
 */

import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import type { Server } from 'http';
import type { ApiConfig, ApiRequest, HandlerContext } from '../shared/types/api.js';
import type { TodoListManager } from '../domain/lists/todo-list-manager.js';
import type { DependencyResolver } from '../domain/tasks/dependency-manager.js';
import type { ExitCriteriaManager } from '../domain/tasks/exit-criteria-manager.js';
import type { ActionPlanManager } from '../domain/tasks/action-plan-manager.js';
import type { NotesManager } from '../domain/tasks/notes-manager.js';
import type { IntelligenceManager } from '../domain/intelligence/intelligence-manager.js';
import { requestIdMiddleware } from '../api/middleware/request-id.js';
import { requestLoggerMiddleware } from '../api/middleware/request-logger.js';
import { errorHandlerMiddleware, notFoundHandler } from '../api/middleware/error-handler.js';
import { healthCheckHandler } from '../api/handlers/health-check.js';
import { logger } from '../shared/utils/logger.js';

/**
 * Default API configuration
 */
const DEFAULT_CONFIG: ApiConfig = {
  port: 3001,
  corsOrigins: ['*'],
  authEnabled: false,
  requestTimeout: 30000,
  bodyLimit: '10mb',
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100,
};

/**
 * REST API Server class
 */
export class RestApiServer {
  private app: Express;
  private server: Server | null = null;
  private config: ApiConfig;
  private context: HandlerContext;

  constructor(
    config: Partial<ApiConfig>,
    todoListManager: TodoListManager,
    dependencyManager: DependencyResolver,
    exitCriteriaManager: ExitCriteriaManager,
    actionPlanManager: ActionPlanManager,
    notesManager: NotesManager,
    intelligenceManager: IntelligenceManager
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.app = express();
    
    // Store manager context
    this.context = {
      todoListManager,
      dependencyManager,
      exitCriteriaManager,
      actionPlanManager,
      notesManager,
      intelligenceManager,
    };
    
    this.setupMiddleware();
    // Note: setupRoutes and setupErrorHandling are now async and called in initialize()
  }

  /**
   * Initialize the server (must be called before start)
   */
  async initialize(): Promise<void> {
    logger.info('Initializing REST API server routes');
    await this.setupRoutes();
    this.setupErrorHandling(); // Must be called AFTER routes are set up
    logger.info('REST API server routes initialized');
  }

  /**
   * Set up Express middleware
   */
  private setupMiddleware(): void {
    // Request ID generation (must be first)
    this.app.use(requestIdMiddleware);
    
    // CORS
    this.app.use(cors({
      origin: this.config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-Request-ID'],
    }));
    
    // Body parsing
    this.app.use(express.json({ limit: this.config.bodyLimit }));
    this.app.use(express.urlencoded({ extended: true, limit: this.config.bodyLimit }));
    
    // Request logging
    this.app.use(requestLoggerMiddleware);
    
    // Request timeout
    this.app.use((req: Request, res: Response, next) => {
      req.setTimeout(this.config.requestTimeout);
      res.setTimeout(this.config.requestTimeout);
      next();
    });
  }

  /**
   * Set up API routes
   */
  private async setupRoutes(): Promise<void> {
    // Health check endpoint
    this.app.get('/health', healthCheckHandler);
    this.app.get('/api/health', healthCheckHandler);
    
    // API info endpoint
    this.app.get('/api', (_req: Request, res: Response) => {
      res.json({
        name: 'MCP Task Manager REST API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          api: '/api/v1',
          docs: '/api/docs (coming soon)',
        },
      });
    });
    
    // API v1 routes
    const apiRouter = express.Router();
    
    // API root endpoint
    apiRouter.get('/', (_req: Request, res: Response) => {
      res.json({
        message: 'MCP Task Manager API v1',
        status: 'operational',
        endpoints: {
          lists: '/api/v1/lists',
          tasks: '/api/v1/tasks',
          dependencies: '/api/v1/dependencies',
          exitCriteria: '/api/v1/exit-criteria',
          actionPlans: '/api/v1/action-plans',
          notes: '/api/v1/notes',
          intelligence: '/api/v1/intelligence',
        },
      });
    });
    
    // List management routes
    await this.setupListRoutes(apiRouter);
    
    // Task management routes
    await this.setupTaskRoutes(apiRouter);
    
    // Dependency management routes
    await this.setupDependencyRoutes(apiRouter);
    
    // Advanced feature routes (exit criteria, action plans, notes)
    await this.setupAdvancedFeatureRoutes(apiRouter);
    
    // Mount the router AFTER all routes are added
    this.app.use('/api/v1', apiRouter);
    
    logger.info('API routes configured', {
      routes: [
        'POST /api/v1/lists',
        'GET /api/v1/lists',
        'GET /api/v1/lists/:id',
        'PUT /api/v1/lists/:id',
        'DELETE /api/v1/lists/:id',
        'POST /api/v1/tasks',
        'GET /api/v1/tasks',
        'GET /api/v1/tasks/:id',
        'PUT /api/v1/tasks/:id',
        'DELETE /api/v1/tasks/:id',
        'POST /api/v1/tasks/:id/complete',
        'GET /api/v1/dependencies/graph/:listId',
        'POST /api/v1/dependencies/validate',
        'GET /api/v1/dependencies/ready/:listId',
        'POST /api/v1/dependencies/set',
        'GET /api/v1/exit-criteria/task/:taskId',
        'POST /api/v1/exit-criteria/task/:taskId',
        'PUT /api/v1/exit-criteria/:id',
        'GET /api/v1/action-plans/task/:taskId',
        'POST /api/v1/action-plans/task/:taskId',
        'PUT /api/v1/action-plans/:id',
        'POST /api/v1/action-plans/:id/steps/:stepId/complete',
        'GET /api/v1/notes/task/:taskId',
        'POST /api/v1/notes/task/:taskId',
      ],
    });
  }

  /**
   * Set up list management routes
   */
  private async setupListRoutes(router: express.Router): Promise<void> {
    // Dynamically import handlers
    const handlers = await import('../api/handlers/list-handlers.js');
    
    // Create a wrapper to inject context
    const wrapHandler = (handler: any) => {
      return async (req: Request, res: Response, next: any) => {
        try {
          await handler(req as ApiRequest, res, this.context);
        } catch (error) {
          next(error);
        }
      };
    };
    
    router.post('/lists', wrapHandler(handlers.createListHandler));
    router.get('/lists', wrapHandler(handlers.listAllListsHandler));
    router.get('/lists/:id', wrapHandler(handlers.getListHandler));
    router.put('/lists/:id', wrapHandler(handlers.updateListHandler));
    router.delete('/lists/:id', wrapHandler(handlers.deleteListHandler));
  }

  /**
   * Set up task management routes
   */
  private async setupTaskRoutes(router: express.Router): Promise<void> {
    // Dynamically import handlers
    const handlers = await import('../api/handlers/task-handlers.js');
    
    // Create a wrapper to inject context
    const wrapHandler = (handler: any) => {
      return async (req: Request, res: Response, next: any) => {
        try {
          await handler(req as ApiRequest, res, this.context);
        } catch (error) {
          next(error);
        }
      };
    };
    
    router.post('/tasks', wrapHandler(handlers.createTaskHandler));
    router.get('/tasks', wrapHandler(handlers.searchTasksHandler));
    router.get('/tasks/:id', wrapHandler(handlers.getTaskHandler));
    router.put('/tasks/:id', wrapHandler(handlers.updateTaskHandler));
    router.delete('/tasks/:id', wrapHandler(handlers.deleteTaskHandler));
    router.post('/tasks/:id/complete', wrapHandler(handlers.completeTaskHandler));
  }

  /**
   * Set up dependency management routes
   */
  private async setupDependencyRoutes(router: express.Router): Promise<void> {
    // Dynamically import handlers
    const handlers = await import('../api/handlers/dependency-handlers.js');
    
    // Create a wrapper to inject context
    const wrapHandler = (handler: any) => {
      return async (req: Request, res: Response, next: any) => {
        try {
          await handler(req as ApiRequest, res, this.context);
        } catch (error) {
          next(error);
        }
      };
    };
    
    router.get('/dependencies/graph/:listId', wrapHandler(handlers.getDependencyGraphHandler));
    router.post('/dependencies/validate', wrapHandler(handlers.validateDependenciesHandler));
    router.get('/dependencies/ready/:listId', wrapHandler(handlers.getReadyTasksHandler));
    router.post('/dependencies/set', wrapHandler(handlers.setDependenciesHandler));
  }

  /**
   * Set up advanced feature routes (exit criteria, action plans, notes)
   */
  private async setupAdvancedFeatureRoutes(router: express.Router): Promise<void> {
    // Dynamically import handlers
    const handlers = await import('../api/handlers/advanced-feature-handlers.js');
    
    // Create a wrapper to inject context
    const wrapHandler = (handler: any) => {
      return async (req: Request, res: Response, next: any) => {
        try {
          await handler(req as ApiRequest, res, this.context);
        } catch (error) {
          next(error);
        }
      };
    };
    
    // Exit criteria routes
    router.get('/exit-criteria/task/:taskId', wrapHandler(handlers.getTaskExitCriteriaHandler));
    router.post('/exit-criteria/task/:taskId', wrapHandler(handlers.addExitCriteriaHandler));
    router.put('/exit-criteria/:id', wrapHandler(handlers.updateExitCriteriaHandler));
    
    // Action plan routes
    router.get('/action-plans/task/:taskId', wrapHandler(handlers.getActionPlanHandler));
    router.post('/action-plans/task/:taskId', wrapHandler(handlers.createActionPlanHandler));
    router.put('/action-plans/:id', wrapHandler(handlers.updateActionPlanHandler));
    router.post('/action-plans/:id/steps/:stepId/complete', wrapHandler(handlers.completeStepHandler));
    
    // Notes routes
    router.get('/notes/task/:taskId', wrapHandler(handlers.getTaskNotesHandler));
    router.post('/notes/task/:taskId', wrapHandler(handlers.addTaskNoteHandler));
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
        this.server = this.app.listen(this.config.port, () => {
          logger.info('REST API server started', {
            port: this.config.port,
            environment: process.env['NODE_ENV'] || 'development',
          });
          resolve();
        });
        
        this.server.on('error', (error: Error) => {
          logger.error('Server error', { error });
          reject(error);
        });
      } catch (error) {
        logger.error('Failed to start server', { error });
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
      this.server!.close((error) => {
        if (error) {
          logger.error('Error stopping server', { error });
          reject(error);
        } else {
          logger.info('REST API server stopped');
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
  getConfig(): ApiConfig {
    return this.config;
  }

  /**
   * Get the handler context
   */
  getContext(): HandlerContext {
    return this.context;
  }
}
