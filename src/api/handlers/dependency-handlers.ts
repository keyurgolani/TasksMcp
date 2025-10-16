/**
 * Dependency management API handlers
 */

import { z } from 'zod';

import { ApiError } from '../../shared/errors/api-error.js';
import { LOGGER } from '../../shared/utils/logger.js';

import type { DependencyValidationResult } from '../../domain/tasks/dependency-manager.js';
import type {
  ApiRequest,
  ApiResponse,
  HandlerContext,
} from '../../shared/types/api.js';
import type { Task } from '../../shared/types/task.js';
import type { Response } from 'express';

/**
 * Zod schemas for request validation
 */

// Schema for validating dependencies
const validateDependenciesSchema = z.object({
  listId: z.string().uuid(),
  taskId: z.string().uuid(),
  dependencies: z.array(z.string().uuid()),
});

// Schema for setting dependencies
const setDependenciesSchema = z.object({
  listId: z.string().uuid(),
  taskId: z.string().uuid(),
  dependencies: z.array(z.string().uuid()),
});

/**
 * GET /api/v1/dependencies/graph/:listId - Get dependency graph
 */
export async function getDependencyGraphHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  const startTime = Date.now();
  const listId = req.params['listId'];
  if (!listId) {
    throw new ApiError('BAD_REQUEST', 'List ID is required', 400);
  }

  LOGGER.info('Getting dependency graph', {
    requestId: req.id,
    listId,
  });

  // Get the list
  const list = await context.taskListManager.getTaskList({
    listId,
  });

  if (!list) {
    throw new ApiError('NOT_FOUND', `List not found: ${listId}`, 404);
  }

  // Build dependency graph
  const graph = context.dependencyManager.buildDependencyGraph(list.items);

  // Convert Map to object for JSON serialization
  const serializedGraph = {
    nodes: Array.from(graph.nodes.entries()).map(([nodeId, node]) => ({
      id: nodeId,
      title: node.title,
      status: node.status,
      dependencies: node.dependencies,
      dependents: node.dependents,
      depth: node.depth,
      isReady: node.isReady,
      blockedBy: node.blockedBy,
    })),
    roots: graph.roots,
    leaves: graph.leaves,
    cycles: graph.cycles,
    readyItems: graph.readyItems,
    blockedItems: graph.blockedItems,
  };

  const duration = Date.now() - startTime;

  const response: ApiResponse<typeof serializedGraph> = {
    success: true,
    data: serializedGraph,
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      duration,
    },
  };

  LOGGER.info('Dependency graph retrieved successfully', {
    requestId: req.id,
    listId,
    nodeCount: graph.nodes.size,
    cycleCount: graph.cycles.length,
    duration,
  });

  res.status(200).json(response);
}

/**
 * POST /api/v1/dependencies/validate - Validate dependencies
 */
export async function validateDependenciesHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  try {
    const startTime = Date.now();

    // Validate request body
    const input = validateDependenciesSchema.parse(req.body);

    LOGGER.info('Validating dependencies', {
      requestId: req.id,
      listId: input.listId,
      taskId: input.taskId,
      dependencyCount: input.dependencies.length,
    });

    // Get the list
    const list = await context.taskListManager.getTaskList({
      listId: input.listId,
    });

    if (!list) {
      throw new ApiError('NOT_FOUND', `List not found: ${input.listId}`, 404);
    }

    // Verify task exists
    const task = list.items.find((item: Task) => item.id === input.taskId);
    if (!task) {
      throw new ApiError('NOT_FOUND', `Task not found: ${input.taskId}`, 404);
    }

    // Validate dependencies
    const validationResult = context.dependencyManager.validateDependencies(
      input.taskId,
      input.dependencies,
      list.items
    );

    const duration = Date.now() - startTime;

    const response: ApiResponse<DependencyValidationResult> = {
      success: true,
      data: validationResult,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        duration,
      },
    };

    LOGGER.info('Dependencies validated', {
      requestId: req.id,
      listId: input.listId,
      taskId: input.taskId,
      isValid: validationResult.isValid,
      errorCount: validationResult.errors.length,
      warningCount: validationResult.warnings.length,
      duration,
    });

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        errors: error.issues,
      });
    }
    throw error;
  }
}

/**
 * GET /api/v1/dependencies/ready/:listId - Get ready tasks
 */
export async function getReadyTasksHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  const startTime = Date.now();
  const listId = req.params['listId'];
  if (!listId) {
    throw new ApiError('BAD_REQUEST', 'List ID is required', 400);
  }

  LOGGER.info('Getting ready tasks', {
    requestId: req.id,
    listId,
  });

  // Get the list
  const list = await context.taskListManager.getTaskList({
    listId,
  });

  if (!list) {
    throw new ApiError('NOT_FOUND', `List not found: ${listId}`, 404);
  }

  // Get ready tasks
  const readyTasks = context.dependencyManager.getReadyItems(list.items);

  const duration = Date.now() - startTime;

  const response: ApiResponse<Task[]> = {
    success: true,
    data: readyTasks,
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      duration,
    },
  };

  LOGGER.info('Ready tasks retrieved successfully', {
    requestId: req.id,
    listId,
    readyCount: readyTasks.length,
    totalTasks: list.items.length,
    duration,
  });

  res.status(200).json(response);
}

/**
 * POST /api/v1/dependencies/set - Set task dependencies
 */
export async function setDependenciesHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  try {
    const startTime = Date.now();

    // Validate request body
    const input = setDependenciesSchema.parse(req.body);

    LOGGER.info('Setting task dependencies', {
      requestId: req.id,
      listId: input.listId,
      taskId: input.taskId,
      dependencyCount: input.dependencies.length,
    });

    // Get the list
    const list = await context.taskListManager.getTaskList({
      listId: input.listId,
    });

    if (!list) {
      throw new ApiError('NOT_FOUND', `List not found: ${input.listId}`, 404);
    }

    // Verify task exists
    const task = list.items.find((item: Task) => item.id === input.taskId);
    if (!task) {
      throw new ApiError('NOT_FOUND', `Task not found: ${input.taskId}`, 404);
    }

    // Validate dependencies before setting
    const validationResult = context.dependencyManager.validateDependencies(
      input.taskId,
      input.dependencies,
      list.items
    );

    if (!validationResult.isValid) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid dependencies', 400, {
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        circularDependencies: validationResult.circularDependencies,
      });
    }

    // Update task with new dependencies
    const updatedList = await context.taskListManager.updateTaskList({
      listId: input.listId,
      action: 'update_item',
      itemId: input.taskId,
      itemData: {
        dependencies: input.dependencies,
      },
    });

    // Find the updated task
    const updatedTask = updatedList.items.find(
      (item: Task) => item.id === input.taskId
    );

    if (!updatedTask) {
      throw new ApiError('INTERNAL_ERROR', 'Task not found after update', 500);
    }

    const duration = Date.now() - startTime;

    const response: ApiResponse<Task> = {
      success: true,
      data: updatedTask,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        duration,
      },
    };

    LOGGER.info('Task dependencies set successfully', {
      requestId: req.id,
      listId: input.listId,
      taskId: input.taskId,
      dependencyCount: input.dependencies.length,
      warningCount: validationResult.warnings.length,
      duration,
    });

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        errors: error.issues,
      });
    }
    throw error;
  }
}
