/**
 * REST API dependency controller
 * Handles HTTP requests for dependency operations using orchestration layer
 */

import { Request, Response } from 'express';
import { z } from 'zod';

import { DependencyOrchestrator } from '../../../core/orchestration/interfaces/dependency-orchestrator.js';
import { OrchestrationError } from '../../../shared/errors/orchestration-error.js';
import { LOGGER } from '../../../shared/utils/logger.js';

// Validation schemas
const setDependenciesSchema = z.object({
  taskId: z.string().uuid(),
  dependencyIds: z.array(z.string().uuid()).optional().default([]),
});

const validateDependenciesSchema = z.object({
  listId: z.string().uuid(),
  dependencies: z.array(z.string().uuid()),
});

const bulkSetDependenciesSchema = z.object({
  dependencies: z
    .array(
      z.object({
        taskId: z.string().uuid(),
        dependencyIds: z.array(z.string().uuid()),
      })
    )
    .min(1)
    .max(100),
});

const bulkClearDependenciesSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1).max(100),
});

/**
 * REST API controller for task dependency operations
 *
 * Handles HTTP requests for managing task dependencies, including setting,
 * clearing, and analyzing dependency relationships.
 */
export class DependencyController {
  constructor(private dependencyOrchestrator: DependencyOrchestrator) {}

  async setTaskDependencies(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { taskId, dependencyIds } = setDependenciesSchema.parse(req.body);

      LOGGER.info('Setting task dependencies', {
        taskId,
        dependencyCount: dependencyIds.length,
        requestId: req.headers['x-request-id'],
      });

      await this.dependencyOrchestrator.setTaskDependencies(
        taskId,
        dependencyIds
      );

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        message: 'Task dependencies set successfully',
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async analyzeDependencies(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { listId } = req.params;
      if (!listId) {
        res.status(400).json({
          success: false,
          error: { message: 'List ID is required' },
        });
        return;
      }

      const format = (req.query['format'] as string) || 'analysis';
      const dagStyle = (req.query['dagStyle'] as string) || 'ascii';

      LOGGER.info('Analyzing dependencies', {
        listId,
        format,
        dagStyle,
        requestId: req.headers['x-request-id'],
      });

      const analysis = await this.dependencyOrchestrator.analyzeDependencies(
        listId,
        { format, dagStyle }
      );

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: analysis,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async getReadyTasks(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { listId } = req.params;
      if (!listId) {
        res.status(400).json({
          success: false,
          error: { message: 'List ID is required' },
        });
        return;
      }

      const limit = req.query['limit']
        ? parseInt(req.query['limit'] as string)
        : 20;

      LOGGER.info('Getting ready tasks', {
        listId,
        limit,
        requestId: req.headers['x-request-id'],
      });

      const readyTasks = await this.dependencyOrchestrator.getReadyTasks(
        listId,
        limit
      );

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: readyTasks,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          count: readyTasks.length,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async validateDependencies(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { listId, dependencies } = validateDependenciesSchema.parse(
        req.body
      );

      LOGGER.info('Validating dependencies', {
        listId,
        dependencyCount: dependencies.length,
        requestId: req.headers['x-request-id'],
      });

      const validation = await this.dependencyOrchestrator.validateDependencies(
        listId,
        dependencies
      );

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: validation,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  // Bulk operations (not available in MCP)
  async setBulkTaskDependencies(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { dependencies } = bulkSetDependenciesSchema.parse(req.body);

      LOGGER.info('Setting bulk task dependencies', {
        count: dependencies.length,
        requestId: req.headers['x-request-id'],
      });

      // Map dependencyIds to dependencies for orchestrator interface
      const mappedDependencies = dependencies.map(dep => ({
        taskId: dep.taskId,
        dependencies: dep.dependencyIds,
      }));

      await this.dependencyOrchestrator.setBulkTaskDependencies(
        mappedDependencies
      );

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: { processedCount: dependencies.length },
        message: `Dependencies set for ${dependencies.length} tasks`,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          bulkOperation: true,
          processedCount: dependencies.length,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async clearBulkTaskDependencies(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { taskIds } = bulkClearDependenciesSchema.parse(req.body);

      LOGGER.info('Clearing bulk task dependencies', {
        count: taskIds.length,
        requestId: req.headers['x-request-id'],
      });

      await this.dependencyOrchestrator.clearBulkTaskDependencies(taskIds);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: { processedCount: taskIds.length },
        message: `Dependencies cleared for ${taskIds.length} tasks`,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          bulkOperation: true,
          processedCount: taskIds.length,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  private handleError(error: unknown, res: Response, req: Request): void {
    const requestId = req.headers['x-request-id'];

    if (error instanceof z.ZodError) {
      LOGGER.warn('Validation error', {
        error: error.issues,
        requestId,
      });

      res.status(400).json({
        success: false,
        error: {
          type: 'ValidationError',
          message: 'Invalid request data',
          details: error.issues,
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
      return;
    }

    if (error instanceof OrchestrationError) {
      const statusCode = this.getStatusCodeForError(error);

      LOGGER.warn('Orchestration error', {
        error: error.message,
        context: error.context,
        requestId,
      });

      res.status(statusCode).json({
        success: false,
        error: {
          type: error.name,
          message: error.message,
          context: error.context,
          currentValue: error.currentValue,
          expectedValue: error.expectedValue,
          actionableGuidance: error.actionableGuidance,
          timestamp: error.timestamp,
          requestId,
        },
      });
      return;
    }

    // Handle unexpected errors
    LOGGER.error('Unexpected error', {
      error: error instanceof Error ? error.message : String(error),
      requestId,
    });

    res.status(500).json({
      success: false,
      error: {
        type: 'InternalServerError',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }

  private getStatusCodeForError(error: OrchestrationError): number {
    switch (error.name) {
      case 'ValidationError':
        return 400;
      case 'TaskNotFoundError':
      case 'ListNotFoundError':
        return 404;
      case 'CircularDependencyError':
        return 409;
      default:
        return 500;
    }
  }
}
