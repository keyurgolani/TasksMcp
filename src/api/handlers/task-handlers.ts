/**
 * Task management API handlers
 */

import { z } from 'zod';

import { ApiError } from '../../shared/errors/api-error.js';
import { TaskStatus } from '../../shared/types/todo.js';
import { logger } from '../../shared/utils/logger.js';

import type {
  ApiRequest,
  ApiResponse,
  HandlerContext,
} from '../../shared/types/api.js';
import type {
  TodoItem,
  Priority,
  ActionPlan,
  ExitCriteria,
  ImplementationNote,
} from '../../shared/types/todo.js';
import type { Response } from 'express';

/**
 * Zod schemas for request validation
 */

// Schema for creating a new task
const createTaskSchema = z.object({
  listId: z.string().uuid(),
  title: z.string().min(1).max(1000),
  description: z.string().optional(),
  priority: z.number().min(1).max(5).optional(),
  estimatedDuration: z.number().min(1).optional(),
  tags: z.array(z.string()).optional(),
  dependencies: z.array(z.string().uuid()).optional(),
  actionPlan: z.string().optional(),
  implementationNotes: z
    .array(
      z.object({
        content: z.string(),
        type: z.enum(['general', 'technical', 'decision', 'learning']),
      })
    )
    .optional(),
  exitCriteria: z.array(z.string()).optional(),
});

// Schema for task search query parameters
const searchTasksQuerySchema = z.object({
  listId: z.string().uuid().optional(),
  status: z
    .enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled'])
    .optional(),
  priority: z
    .string()
    .transform(val => parseInt(val, 10))
    .optional(),
  tags: z
    .string()
    .transform(val => val.split(',').map(t => t.trim()))
    .optional(),
  search: z.string().optional(),
  includeCompleted: z
    .string()
    .transform(val => val === 'true')
    .optional(),
  limit: z
    .string()
    .transform(val => parseInt(val, 10))
    .optional(),
  offset: z
    .string()
    .transform(val => parseInt(val, 10))
    .optional(),
});

// Schema for updating a task
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
});

/**
 * POST /api/v1/tasks - Create a new task
 */
export async function createTaskHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  try {
    const startTime = Date.now();

    // Validate request body
    const input = createTaskSchema.parse(req.body);

    logger.info('Creating new task', {
      requestId: req.id,
      listId: input.listId,
      title: input.title,
    });

    // Verify the list exists
    const list = await context.todoListManager.getTodoList({
      listId: input.listId,
      includeArchived: false,
    });

    if (!list) {
      throw new ApiError('NOT_FOUND', `List not found: ${input.listId}`, 404);
    }

    if (list.isArchived) {
      throw new ApiError('CONFLICT', 'Cannot add task to archived list', 409);
    }

    // Validate dependencies if provided
    if (input.dependencies && input.dependencies.length > 0) {
      const existingTaskIds = new Set(list.items.map(item => item.id));
      const invalidDeps = input.dependencies.filter(
        depId => !existingTaskIds.has(depId)
      );

      if (invalidDeps.length > 0) {
        throw new ApiError(
          'VALIDATION_ERROR',
          `Invalid dependencies: ${invalidDeps.join(', ')}`,
          400
        );
      }

      // Check for circular dependencies
      // This will be validated by the dependency manager when we add the task
    }

    // Create the task using TodoListManager
    const itemData: {
      title?: string;
      description?: string;
      priority?: Priority;
      status?: TaskStatus;
      estimatedDuration?: number;
      tags?: string[];
      dependencies?: string[];
      actionPlan?: string | ActionPlan;
      exitCriteria?: string[];
      exitCriteriaObjects?: ExitCriteria[];
      implementationNotes?: ImplementationNote[];
    } = {
      title: input.title,
    };

    if (input.description !== undefined) {
      itemData.description = input.description;
    }
    if (input.priority !== undefined) {
      itemData.priority = input.priority;
    }
    if (input.estimatedDuration !== undefined) {
      itemData.estimatedDuration = input.estimatedDuration;
    }
    if (input.tags !== undefined) {
      itemData.tags = input.tags;
    }
    if (input.dependencies !== undefined) {
      itemData.dependencies = input.dependencies;
    }
    if (input.actionPlan !== undefined) {
      itemData.actionPlan = input.actionPlan;
    }
    if (input.implementationNotes !== undefined) {
      itemData.implementationNotes = input.implementationNotes.map(note => ({
        id: crypto.randomUUID(),
        content: note.content,
        type: note.type,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    }
    if (input.exitCriteria !== undefined) {
      itemData.exitCriteria = input.exitCriteria;
    }

    const updatedList = await context.todoListManager.updateTodoList({
      listId: input.listId,
      action: 'add_item',
      itemData,
    });

    // Get the newly created task (last item in the list)
    const task = updatedList.items[updatedList.items.length - 1];

    // This should never happen, but TypeScript needs the check
    if (!task) {
      throw new ApiError(
        'INTERNAL_ERROR',
        'Task not found after creation',
        500
      );
    }

    const duration = Date.now() - startTime;

    const response: ApiResponse<TodoItem> = {
      success: true,
      data: task,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        duration,
      },
    };

    logger.info('Task created successfully', {
      requestId: req.id,
      listId: input.listId,
      taskId: task.id,
      duration,
    });

    res.status(201).json(response);
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
 * GET /api/v1/tasks - Search tasks across lists
 */
export async function searchTasksHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  try {
    const startTime = Date.now();

    // Validate query parameters
    const query = searchTasksQuerySchema.parse(req.query);

    logger.info('Searching tasks', {
      requestId: req.id,
      listId: query.listId,
      status: query.status,
      priority: query.priority,
      tags: query.tags,
      search: query.search,
    });

    let tasks: TodoItem[] = [];

    if (query.listId) {
      // Search within a specific list
      const list = await context.todoListManager.getTodoList({
        listId: query.listId,
        includeCompleted: query.includeCompleted,
        includeArchived: false,
      });

      if (!list) {
        throw new ApiError('NOT_FOUND', `List not found: ${query.listId}`, 404);
      }

      tasks = list.items;
    } else {
      // Search across all lists
      const lists = await context.todoListManager.listTodoLists({
        status: 'all',
        includeArchived: false,
      });

      // Collect all tasks from all lists
      for (const listSummary of lists) {
        const list = await context.todoListManager.getTodoList({
          listId: listSummary.id,
          includeCompleted: query.includeCompleted,
          includeArchived: false,
        });

        if (list) {
          tasks.push(...list.items);
        }
      }
    }

    // Apply filters
    let filteredTasks = tasks;

    if (query.status) {
      filteredTasks = filteredTasks.filter(
        task => task.status === query.status
      );
    }

    if (query.priority !== undefined) {
      filteredTasks = filteredTasks.filter(
        task => task.priority === query.priority
      );
    }

    if (query.tags && query.tags.length > 0) {
      filteredTasks = filteredTasks.filter(task =>
        query.tags!.some(tag => task.tags.includes(tag))
      );
    }

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filteredTasks = filteredTasks.filter(
        task =>
          task.title.toLowerCase().includes(searchLower) ||
          (task.description &&
            task.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || filteredTasks.length;
    const paginatedTasks = filteredTasks.slice(offset, offset + limit);

    const duration = Date.now() - startTime;

    const response: ApiResponse<TodoItem[]> = {
      success: true,
      data: paginatedTasks,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        duration,
        pagination: {
          total: filteredTasks.length,
          offset,
          limit,
          hasMore: offset + limit < filteredTasks.length,
        },
      },
    };

    logger.info('Tasks retrieved successfully', {
      requestId: req.id,
      totalTasks: filteredTasks.length,
      returnedTasks: paginatedTasks.length,
      duration,
    });

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid query parameters', 400, {
        errors: error.issues,
      });
    }
    throw error;
  }
}

/**
 * GET /api/v1/tasks/:id - Get a single task
 */
export async function getTaskHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  const startTime = Date.now();
  const taskId = req.params['id'];
  if (!taskId) {
    throw new ApiError('BAD_REQUEST', 'Task ID is required', 400);
  }

  // Parse query parameters for listId (required to find the task)
  const listId = req.query['listId'] as string;
  if (!listId) {
    throw new ApiError(
      'BAD_REQUEST',
      'listId query parameter is required',
      400
    );
  }

  logger.info('Getting task', {
    requestId: req.id,
    taskId,
    listId,
  });

  // Get the list
  const list = await context.todoListManager.getTodoList({
    listId,
    includeArchived: false,
  });

  if (!list) {
    throw new ApiError('NOT_FOUND', `List not found: ${listId}`, 404);
  }

  // Find the task
  const task = list.items.find(item => item.id === taskId);

  if (!task) {
    throw new ApiError('NOT_FOUND', `Task not found: ${taskId}`, 404);
  }

  const duration = Date.now() - startTime;

  const response: ApiResponse<TodoItem> = {
    success: true,
    data: task,
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      duration,
    },
  };

  logger.info('Task retrieved successfully', {
    requestId: req.id,
    taskId: task.id,
    duration,
  });

  res.status(200).json(response);
}

/**
 * PUT /api/v1/tasks/:id - Update a task
 */
export async function updateTaskHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  try {
    const startTime = Date.now();
    const taskId = req.params['id'];
    if (!taskId) {
      throw new ApiError('BAD_REQUEST', 'Task ID is required', 400);
    }

    // Parse query parameters for listId (required to find the task)
    const listId = req.query['listId'] as string;
    if (!listId) {
      throw new ApiError(
        'BAD_REQUEST',
        'listId query parameter is required',
        400
      );
    }

    // Validate request body
    const updates = updateTaskSchema.parse(req.body);

    logger.info('Updating task', {
      requestId: req.id,
      taskId,
      listId,
      updates: Object.keys(updates),
    });

    // Get the list to verify task exists
    const list = await context.todoListManager.getTodoList({
      listId,
      includeArchived: false,
    });

    if (!list) {
      throw new ApiError('NOT_FOUND', `List not found: ${listId}`, 404);
    }

    if (list.isArchived) {
      throw new ApiError(
        'CONFLICT',
        'Cannot update task in archived list',
        409
      );
    }

    // Find the task
    const task = list.items.find(item => item.id === taskId);

    if (!task) {
      throw new ApiError('NOT_FOUND', `Task not found: ${taskId}`, 404);
    }

    // Validate dependencies if provided
    if (updates.dependencies && updates.dependencies.length > 0) {
      const existingTaskIds = new Set(list.items.map(item => item.id));
      const invalidDeps = updates.dependencies.filter(
        depId => !existingTaskIds.has(depId)
      );

      if (invalidDeps.length > 0) {
        throw new ApiError(
          'VALIDATION_ERROR',
          `Invalid dependencies: ${invalidDeps.join(', ')}`,
          400
        );
      }
    }

    // Update the task using TodoListManager
    const itemData: {
      title?: string;
      description?: string;
      priority?: Priority;
      status?: TaskStatus;
      estimatedDuration?: number;
      tags?: string[];
      dependencies?: string[];
      actionPlan?: string | ActionPlan;
      exitCriteria?: string[];
      exitCriteriaObjects?: ExitCriteria[];
      implementationNotes?: ImplementationNote[];
    } = {};

    if (updates.title !== undefined) {
      itemData.title = updates.title;
    }
    if (updates.description !== undefined) {
      itemData.description = updates.description;
    }
    if (updates.priority !== undefined) {
      itemData.priority = updates.priority;
    }
    if (updates.status !== undefined) {
      itemData.status = updates.status as TaskStatus;
    }
    if (updates.estimatedDuration !== undefined) {
      itemData.estimatedDuration = updates.estimatedDuration;
    }
    if (updates.tags !== undefined) {
      itemData.tags = updates.tags;
    }
    if (updates.dependencies !== undefined) {
      itemData.dependencies = updates.dependencies;
    }

    const updatedList = await context.todoListManager.updateTodoList({
      listId,
      action: 'update_item',
      itemId: taskId,
      itemData,
    });

    // Find the updated task
    const updatedTask = updatedList.items.find(item => item.id === taskId);

    // This should never happen, but TypeScript needs the check
    if (!updatedTask) {
      throw new ApiError('INTERNAL_ERROR', 'Task not found after update', 500);
    }

    const duration = Date.now() - startTime;

    const response: ApiResponse<TodoItem> = {
      success: true,
      data: updatedTask,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        duration,
      },
    };

    logger.info('Task updated successfully', {
      requestId: req.id,
      taskId,
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
 * DELETE /api/v1/tasks/:id - Delete a task
 */
export async function deleteTaskHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  const startTime = Date.now();
  const taskId = req.params['id'];
  if (!taskId) {
    throw new ApiError('BAD_REQUEST', 'Task ID is required', 400);
  }

  // Parse query parameters for listId (required to find the task)
  const listId = req.query['listId'] as string;
  if (!listId) {
    throw new ApiError(
      'BAD_REQUEST',
      'listId query parameter is required',
      400
    );
  }

  logger.info('Deleting task', {
    requestId: req.id,
    taskId,
    listId,
  });

  // Get the list to verify task exists
  const list = await context.todoListManager.getTodoList({
    listId,
    includeArchived: false,
  });

  if (!list) {
    throw new ApiError('NOT_FOUND', `List not found: ${listId}`, 404);
  }

  if (list.isArchived) {
    throw new ApiError(
      'CONFLICT',
      'Cannot delete task from archived list',
      409
    );
  }

  // Find the task
  const task = list.items.find(item => item.id === taskId);

  if (!task) {
    throw new ApiError('NOT_FOUND', `Task not found: ${taskId}`, 404);
  }

  // Check if any other tasks depend on this task
  const dependentTasks = list.items.filter(item =>
    item.dependencies.includes(taskId)
  );

  if (dependentTasks.length > 0) {
    throw new ApiError(
      'CONFLICT',
      `Cannot delete task: ${dependentTasks.length} task(s) depend on it`,
      409,
      {
        dependentTasks: dependentTasks.map(t => ({
          id: t.id,
          title: t.title,
        })),
      }
    );
  }

  // Delete the task using TodoListManager
  await context.todoListManager.updateTodoList({
    listId,
    action: 'remove_item',
    itemId: taskId,
  });

  const duration = Date.now() - startTime;

  const response: ApiResponse<{ success: boolean; message: string }> = {
    success: true,
    data: {
      success: true,
      message: `Task ${taskId} deleted successfully`,
    },
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      duration,
    },
  };

  logger.info('Task deleted successfully', {
    requestId: req.id,
    taskId,
    duration,
  });

  res.status(200).json(response);
}

/**
 * POST /api/v1/tasks/:id/complete - Complete a task
 */
export async function completeTaskHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  const startTime = Date.now();
  const taskId = req.params['id'];
  if (!taskId) {
    throw new ApiError('BAD_REQUEST', 'Task ID is required', 400);
  }

  // Parse query parameters for listId (required to find the task)
  const listId = req.query['listId'] as string;
  if (!listId) {
    throw new ApiError(
      'BAD_REQUEST',
      'listId query parameter is required',
      400
    );
  }

  logger.info('Completing task', {
    requestId: req.id,
    taskId,
    listId,
  });

  // Get the list to verify task exists
  const list = await context.todoListManager.getTodoList({
    listId,
    includeArchived: false,
  });

  if (!list) {
    throw new ApiError('NOT_FOUND', `List not found: ${listId}`, 404);
  }

  if (list.isArchived) {
    throw new ApiError(
      'CONFLICT',
      'Cannot complete task in archived list',
      409
    );
  }

  // Find the task
  const task = list.items.find(item => item.id === taskId);

  if (!task) {
    throw new ApiError('NOT_FOUND', `Task not found: ${taskId}`, 404);
  }

  if (task.status === TaskStatus.COMPLETED) {
    throw new ApiError('CONFLICT', 'Task is already completed', 409);
  }

  // Check if all dependencies are completed
  if (task.dependencies.length > 0) {
    const incompleteDeps = task.dependencies.filter(depId => {
      const depTask = list.items.find(item => item.id === depId);
      return depTask && depTask.status !== TaskStatus.COMPLETED;
    });

    if (incompleteDeps.length > 0) {
      throw new ApiError(
        'CONFLICT',
        `Cannot complete task: ${incompleteDeps.length} dependency(ies) not completed`,
        409,
        {
          incompleteDependencies: incompleteDeps.map(depId => {
            const depTask = list.items.find(item => item.id === depId);
            return { id: depId, title: depTask?.title };
          }),
        }
      );
    }
  }

  // Check if all exit criteria are met (if any exist)
  if (task.exitCriteria && task.exitCriteria.length > 0) {
    const unmetCriteria = task.exitCriteria.filter(criteria => !criteria.isMet);

    if (unmetCriteria.length > 0) {
      throw new ApiError(
        'CONFLICT',
        `Cannot complete task: ${unmetCriteria.length} exit criteria not met`,
        409,
        {
          unmetCriteria: unmetCriteria.map(c => ({
            id: c.id,
            description: c.description,
          })),
        }
      );
    }
  }

  // Complete the task using TodoListManager
  const updatedList = await context.todoListManager.updateTodoList({
    listId,
    action: 'update_status',
    itemId: taskId,
    itemData: {
      status: TaskStatus.COMPLETED,
    },
  });

  // Find the updated task
  const updatedTask = updatedList.items.find(item => item.id === taskId);

  if (!updatedTask) {
    throw new ApiError(
      'INTERNAL_ERROR',
      'Task not found after completion',
      500
    );
  }

  const duration = Date.now() - startTime;

  const response: ApiResponse<TodoItem> = {
    success: true,
    data: updatedTask,
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      duration,
    },
  };

  logger.info('Task completed successfully', {
    requestId: req.id,
    taskId,
    duration,
  });

  res.status(200).json(response);
}
