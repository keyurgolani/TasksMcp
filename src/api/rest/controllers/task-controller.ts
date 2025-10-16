/**
 * REST API task controller
 * Handles HTTP requests for task operations using orchestration layer
 */

import { Request, Response } from 'express';
import { z } from 'zod';

import { TaskOrchestrator } from '../../../core/orchestration/interfaces/task-orchestrator.js';
import { Priority, TaskStatus } from '../../../domain/models/task.js';
import { OrchestrationError } from '../../../shared/errors/orchestration-error.js';
import {
  CreateTaskData,
  UpdateTaskData,
  SearchTasksData,
} from '../../../shared/types/task-operations.js';
import { LOGGER } from '../../../shared/utils/logger.js';

// Validation schemas
const createTaskSchema = z.object({
  listId: z.string().uuid(),
  title: z.string().min(1).max(1000),
  description: z.string().optional(),
  priority: z.number().min(1).max(5).optional(),
  estimatedDuration: z.number().min(1).optional(),
  tags: z.array(z.string()).optional(),
  dependencies: z.array(z.string().uuid()).optional(),
  agentPromptTemplate: z.string().max(10000).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(1000).optional(),
  description: z.string().optional(),
  priority: z.number().min(1).max(5).optional(),
  status: z
    .enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled'])
    .optional(),
  estimatedDuration: z.number().min(1).optional(),
  tags: z.array(z.string()).optional(),
  dependencies: z.array(z.string().uuid()).optional(),
  agentPromptTemplate: z.string().max(10000).optional(),
});

const bulkTaskSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1),
});

const bulkCreateTaskSchema = z.object({
  tasks: z.array(createTaskSchema).min(1).max(100), // Limit bulk operations
});

const bulkUpdateTaskSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().uuid(),
        data: updateTaskSchema,
      })
    )
    .min(1)
    .max(100),
});

/**
 * REST API controller for task operations
 *
 * Handles HTTP requests for creating, reading, updating, and deleting tasks.
 * Provides endpoints for task management with validation and error handling.
 */
export class TaskController {
  constructor(private taskOrchestrator: TaskOrchestrator) {}

  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const taskData = createTaskSchema.parse(req.body);

      LOGGER.info('Creating task', {
        listId: taskData.listId,
        title: taskData.title,
        requestId: req.headers['x-request-id'],
      });

      // Filter out undefined values for exactOptionalPropertyTypes compatibility
      const cleanTaskData: CreateTaskData = {
        listId: taskData.listId,
        title: taskData.title,
        ...(taskData.description !== undefined && {
          description: taskData.description,
        }),
        ...(taskData.priority !== undefined && { priority: taskData.priority }),
        ...(taskData.estimatedDuration !== undefined && {
          estimatedDuration: taskData.estimatedDuration,
        }),
        ...(taskData.tags !== undefined && { tags: taskData.tags }),
        ...(taskData.dependencies !== undefined && {
          dependencies: taskData.dependencies,
        }),
        ...(taskData.agentPromptTemplate !== undefined && {
          agentPromptTemplate: taskData.agentPromptTemplate,
        }),
      };

      const task = await this.taskOrchestrator.createTask(cleanTaskData);

      const duration = Date.now() - startTime;
      res.status(201).json({
        success: true,
        data: task,
        message: 'Task created successfully',
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

  async searchTasks(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      // Filter out undefined values for exactOptionalPropertyTypes compatibility
      const searchData: SearchTasksData = {
        listId: req.query['listId'] as string,
        status: req.query['status'] as TaskStatus,
        query: req.query['query'] as string,
        includeCompleted: req.query['includeCompleted'] === 'true',
      };

      if (req.query['priority']) {
        searchData.priority = parseInt(
          req.query['priority'] as string
        ) as Priority;
      }
      if (req.query['tags']) {
        searchData.tags = (req.query['tags'] as string).split(',');
      }
      if (req.query['limit']) {
        searchData.limit = parseInt(req.query['limit'] as string);
      }
      if (req.query['offset']) {
        searchData.offset = parseInt(req.query['offset'] as string);
      }

      LOGGER.info('Searching tasks', {
        searchData,
        requestId: req.headers['x-request-id'],
      });

      const result = await this.taskOrchestrator.searchTasks(searchData);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: result.tasks,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          pagination: {
            total: result.total,
            offset: result.offset,
            limit: result.limit,
            hasMore: result.hasMore,
          },
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async getTask(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'Task ID is required' },
        });
        return;
      }

      LOGGER.info('Getting task', {
        taskId: id,
        requestId: req.headers['x-request-id'],
      });

      const task = await this.taskOrchestrator.getTask(id);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: task,
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

  async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'Task ID is required' },
        });
        return;
      }
      const updateData = updateTaskSchema.parse(req.body);

      LOGGER.info('Updating task', {
        taskId: id,
        updates: Object.keys(updateData),
        requestId: req.headers['x-request-id'],
      });

      // Filter out undefined values for exactOptionalPropertyTypes compatibility
      const cleanUpdateData: UpdateTaskData = {};
      if (updateData.title !== undefined)
        cleanUpdateData.title = updateData.title;
      if (updateData.description !== undefined)
        cleanUpdateData.description = updateData.description;
      if (updateData.priority !== undefined)
        cleanUpdateData.priority = updateData.priority;
      if (updateData.status !== undefined)
        cleanUpdateData.status = updateData.status as TaskStatus;
      if (updateData.estimatedDuration !== undefined)
        cleanUpdateData.estimatedDuration = updateData.estimatedDuration;
      if (updateData.tags !== undefined) cleanUpdateData.tags = updateData.tags;
      if (updateData.agentPromptTemplate !== undefined)
        cleanUpdateData.agentPromptTemplate = updateData.agentPromptTemplate;

      const task = await this.taskOrchestrator.updateTask(id, cleanUpdateData);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: task,
        message: 'Task updated successfully',
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

  async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'Task ID is required' },
        });
        return;
      }

      LOGGER.info('Deleting task', {
        taskId: id,
        requestId: req.headers['x-request-id'],
      });

      await this.taskOrchestrator.deleteTask(id);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        message: 'Task deleted successfully',
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

  async completeTask(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'Task ID is required' },
        });
        return;
      }

      LOGGER.info('Completing task', {
        taskId: id,
        requestId: req.headers['x-request-id'],
      });

      const task = await this.taskOrchestrator.completeTask(id);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: task,
        message: 'Task completed successfully',
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

  async setTaskPriority(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'Task ID is required' },
        });
        return;
      }
      const { priority } = req.body;

      LOGGER.info('Setting task priority', {
        taskId: id,
        priority,
        requestId: req.headers['x-request-id'],
      });

      const task = await this.taskOrchestrator.setTaskPriority(
        id,
        priority as Priority
      );

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: task,
        message: 'Task priority updated successfully',
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

  async addTaskTags(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'Task ID is required' },
        });
        return;
      }
      const { tags } = req.body;

      LOGGER.info('Adding task tags', {
        taskId: id,
        tags,
        requestId: req.headers['x-request-id'],
      });

      const task = await this.taskOrchestrator.addTaskTags(id, tags);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: task,
        message: 'Tags added successfully',
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

  async removeTaskTags(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'Task ID is required' },
        });
        return;
      }
      const { tags } = req.body;

      LOGGER.info('Removing task tags', {
        taskId: id,
        tags,
        requestId: req.headers['x-request-id'],
      });

      const task = await this.taskOrchestrator.removeTaskTags(id, tags);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: task,
        message: 'Tags removed successfully',
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

  async setTaskStatus(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'Task ID is required' },
        });
        return;
      }
      const { status } = req.body;

      LOGGER.info('Setting task status', {
        taskId: id,
        status,
        requestId: req.headers['x-request-id'],
      });

      const task = await this.taskOrchestrator.setTaskStatus(
        id,
        status as TaskStatus
      );

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: task,
        message: 'Task status updated successfully',
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
  async createBulkTasks(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { tasks } = bulkCreateTaskSchema.parse(req.body);

      LOGGER.info('Creating bulk tasks', {
        count: tasks.length,
        requestId: req.headers['x-request-id'],
      });

      // Filter out undefined values for exactOptionalPropertyTypes compatibility
      const cleanTasks: CreateTaskData[] = tasks.map(task => ({
        listId: task.listId,
        title: task.title,
        ...(task.description !== undefined && {
          description: task.description,
        }),
        ...(task.priority !== undefined && { priority: task.priority }),
        ...(task.estimatedDuration !== undefined && {
          estimatedDuration: task.estimatedDuration,
        }),
        ...(task.tags !== undefined && { tags: task.tags }),
        ...(task.dependencies !== undefined && {
          dependencies: task.dependencies,
        }),
        ...(task.agentPromptTemplate !== undefined && {
          agentPromptTemplate: task.agentPromptTemplate,
        }),
      }));

      const createdTasks =
        await this.taskOrchestrator.createBulkTasks(cleanTasks);

      const duration = Date.now() - startTime;
      res.status(201).json({
        success: true,
        data: createdTasks,
        message: `${createdTasks.length} tasks created successfully`,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          bulkOperation: true,
          processedCount: createdTasks.length,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async updateBulkTasks(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { updates } = bulkUpdateTaskSchema.parse(req.body);

      LOGGER.info('Updating bulk tasks', {
        count: updates.length,
        requestId: req.headers['x-request-id'],
      });

      // Filter out undefined values for exactOptionalPropertyTypes compatibility
      const cleanUpdates = updates.map(update => ({
        id: update.id,
        data: {
          ...(update.data.title !== undefined && { title: update.data.title }),
          ...(update.data.description !== undefined && {
            description: update.data.description,
          }),
          ...(update.data.priority !== undefined && {
            priority: update.data.priority,
          }),
          ...(update.data.status !== undefined && {
            status: update.data.status,
          }),
          ...(update.data.estimatedDuration !== undefined && {
            estimatedDuration: update.data.estimatedDuration,
          }),
          ...(update.data.tags !== undefined && { tags: update.data.tags }),
          ...(update.data.dependencies !== undefined && {
            dependencies: update.data.dependencies,
          }),
          ...(update.data.agentPromptTemplate !== undefined && {
            agentPromptTemplate: update.data.agentPromptTemplate,
          }),
        } as UpdateTaskData,
      }));

      const updatedTasks =
        await this.taskOrchestrator.updateBulkTasks(cleanUpdates);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: updatedTasks,
        message: `${updatedTasks.length} tasks updated successfully`,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          bulkOperation: true,
          processedCount: updatedTasks.length,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async deleteBulkTasks(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { taskIds } = bulkTaskSchema.parse(req.body);

      LOGGER.info('Deleting bulk tasks', {
        count: taskIds.length,
        requestId: req.headers['x-request-id'],
      });

      const deletedCount = await this.taskOrchestrator.deleteBulkTasks(taskIds);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        message: `${deletedCount} tasks deleted successfully`,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          bulkOperation: true,
          processedCount: deletedCount,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async completeBulkTasks(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { taskIds } = bulkTaskSchema.parse(req.body);

      LOGGER.info('Completing bulk tasks', {
        count: taskIds.length,
        requestId: req.headers['x-request-id'],
      });

      const completedTasks =
        await this.taskOrchestrator.completeBulkTasks(taskIds);

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: completedTasks,
        message: `${completedTasks.length} tasks completed successfully`,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          bulkOperation: true,
          processedCount: completedTasks.length,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async setBulkTaskPriority(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { taskIds } = bulkTaskSchema.parse(req.body);
      const { priority } = req.body;

      LOGGER.info('Setting bulk task priority', {
        count: taskIds.length,
        priority,
        requestId: req.headers['x-request-id'],
      });

      const updatedTasks = await this.taskOrchestrator.setBulkTaskPriority(
        taskIds,
        priority
      );

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: updatedTasks,
        message: `Priority updated for ${updatedTasks.length} tasks`,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          bulkOperation: true,
          processedCount: updatedTasks.length,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async addBulkTaskTags(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { taskIds } = bulkTaskSchema.parse(req.body);
      const { tags } = req.body;

      LOGGER.info('Adding bulk task tags', {
        count: taskIds.length,
        tags,
        requestId: req.headers['x-request-id'],
      });

      const updatedTasks = await this.taskOrchestrator.addBulkTaskTags(
        taskIds,
        tags
      );

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: updatedTasks,
        message: `Tags added to ${updatedTasks.length} tasks`,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          bulkOperation: true,
          processedCount: updatedTasks.length,
        },
      });
    } catch (error) {
      this.handleError(error, res, req);
    }
  }

  async removeBulkTaskTags(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const { taskIds } = bulkTaskSchema.parse(req.body);
      const { tags } = req.body;

      LOGGER.info('Removing bulk task tags', {
        count: taskIds.length,
        tags,
        requestId: req.headers['x-request-id'],
      });

      const updatedTasks = await this.taskOrchestrator.removeBulkTaskTags(
        taskIds,
        tags
      );

      const duration = Date.now() - startTime;
      res.json({
        success: true,
        data: updatedTasks,
        message: `Tags removed from ${updatedTasks.length} tasks`,
        meta: {
          requestId: req.headers['x-request-id'],
          timestamp: new Date().toISOString(),
          duration,
          bulkOperation: true,
          processedCount: updatedTasks.length,
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
      case 'StatusTransitionError':
      case 'CircularDependencyError':
        return 409;
      default:
        return 500;
    }
  }
}
