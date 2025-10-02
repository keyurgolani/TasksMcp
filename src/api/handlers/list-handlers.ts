/**
 * List management API handlers
 */

import type { Response } from 'express';
import { z } from 'zod';
import type { ApiRequest, ApiResponse, HandlerContext } from '../../shared/types/api.js';
import type { TodoList, TodoListSummary } from '../../shared/types/todo.js';
import { logger } from '../../shared/utils/logger.js';
import { ApiError } from '../../shared/errors/api-error.js';

/**
 * Zod schemas for request validation
 */

// Schema for creating a new list
const createListSchema = z.object({
  title: z.string().min(1).max(1000),
  description: z.string().optional(),
  projectTag: z.string().optional(),
  tasks: z.array(z.object({
    title: z.string().min(1).max(1000),
    description: z.string().optional(),
    priority: z.number().min(1).max(5).optional(),
    estimatedDuration: z.number().min(1).optional(),
    tags: z.array(z.string()).optional(),
    actionPlan: z.string().optional(),
    implementationNotes: z.array(z.object({
      content: z.string(),
      type: z.enum(['general', 'technical', 'decision', 'learning']),
    })).optional(),
    exitCriteria: z.array(z.string()).optional(),
  })).optional(),
  implementationNotes: z.array(z.object({
    content: z.string(),
    type: z.enum(['general', 'technical', 'decision', 'learning']),
  })).optional(),
});

// Schema for list query parameters
const listQuerySchema = z.object({
  projectTag: z.string().optional(),
  status: z.enum(['active', 'completed', 'all']).optional(),
  includeArchived: z.string().transform(val => val === 'true').optional(),
  limit: z.string().transform(val => parseInt(val, 10)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).optional(),
});

// Schema for get list query parameters
const getListQuerySchema = z.object({
  includeCompleted: z.string().transform(val => val === 'true').optional(),
  includeArchived: z.string().transform(val => val === 'true').optional(),
});

// Schema for updating a list
const updateListSchema = z.object({
  title: z.string().min(1).max(1000).optional(),
  description: z.string().optional(),
  projectTag: z.string().optional(),
});

// Schema for delete query parameters
const deleteQuerySchema = z.object({
  permanent: z.string().transform(val => val === 'true').optional(),
});

/**
 * POST /api/v1/lists - Create a new list
 */
export async function createListHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  try {
    const startTime = Date.now();
    
    // Validate request body
    const input = createListSchema.parse(req.body);
    
    logger.info('Creating new list', {
      requestId: req.id,
      title: input.title,
      projectTag: input.projectTag,
      taskCount: input.tasks?.length ?? 0,
    });
    
    // Create the list using TodoListManager
    // Filter out undefined values to match exactOptionalPropertyTypes
    const createInput: any = {
      title: input.title,
      ...(input.projectTag && { projectTag: input.projectTag }),
      ...(input.tasks && { tasks: input.tasks }),
      ...(input.implementationNotes && { implementationNotes: input.implementationNotes }),
    };
    if (input.description !== undefined) {
      createInput.description = input.description;
    }
    const list = await context.todoListManager.createTodoList(createInput);
    
    const duration = Date.now() - startTime;
    
    const response: ApiResponse<TodoList> = {
      success: true,
      data: list,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        duration,
      },
    };
    
    logger.info('List created successfully', {
      requestId: req.id,
      listId: list.id,
      duration,
    });
    
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        errors: error.errors,
      });
    }
    throw error;
  }
}

/**
 * GET /api/v1/lists - List all lists with filtering
 */
export async function listAllListsHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  try {
    const startTime = Date.now();
    
    // Validate query parameters
    const query = listQuerySchema.parse(req.query);
    
    logger.info('Listing all lists', {
      requestId: req.id,
      projectTag: query.projectTag,
      status: query.status,
      includeArchived: query.includeArchived,
    });
    
    // Get lists using TodoListManager
    // Note: listTodoLists returns TodoListSummary[], not TodoList[]
    const summaries = await context.todoListManager.listTodoLists({
      projectTag: query.projectTag,
      status: query.status,
      includeArchived: query.includeArchived,
      limit: query.limit,
      offset: query.offset,
    });
    
    const duration = Date.now() - startTime;
    
    const response: ApiResponse<TodoListSummary[]> = {
      success: true,
      data: summaries,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        duration,
      },
    };
    
    logger.info('Lists retrieved successfully', {
      requestId: req.id,
      count: summaries.length,
      duration,
    });
    
    res.status(200).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid query parameters', 400, {
        errors: error.errors,
      });
    }
    throw error;
  }
}

/**
 * GET /api/v1/lists/:id - Get a single list
 */
export async function getListHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  try {
    const startTime = Date.now();
    const id = req.params['id'];
    if (!id) {
      throw new ApiError('BAD_REQUEST', 'List ID is required', 400);
    }
    
    // Validate query parameters
    const query = getListQuerySchema.parse(req.query);
    
    logger.info('Getting list', {
      requestId: req.id,
      listId: id,
      includeCompleted: query.includeCompleted,
      includeArchived: query.includeArchived,
    });
    
    // Get the list using TodoListManager
    const getInput: any = { listId: id };
    if (query.includeCompleted !== undefined) {
      getInput.includeCompleted = query.includeCompleted;
    }
    if (query.includeArchived !== undefined) {
      getInput.includeArchived = query.includeArchived;
    }
    const list = await context.todoListManager.getTodoList(getInput);
    
    if (!list) {
      throw new ApiError('NOT_FOUND', `List not found: ${id}`, 404);
    }
    
    const duration = Date.now() - startTime;
    
    const response: ApiResponse<TodoList> = {
      success: true,
      data: list,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        duration,
      },
    };
    
    logger.info('List retrieved successfully', {
      requestId: req.id,
      listId: id,
      duration,
    });
    
    res.status(200).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid query parameters', 400, {
        errors: error.errors,
      });
    }
    throw error;
  }
}

/**
 * PUT /api/v1/lists/:id - Update a list
 */
export async function updateListHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  try {
    const startTime = Date.now();
    const id = req.params['id'];
    if (!id) {
      throw new ApiError('BAD_REQUEST', 'List ID is required', 400);
    }
    
    // Validate request body
    const updates = updateListSchema.parse(req.body);
    
    logger.info('Updating list', {
      requestId: req.id,
      listId: id,
      updates: Object.keys(updates),
    });
    
    // First, get the existing list to verify it exists (including archived)
    const getInput: any = { listId: id, includeArchived: true };
    const existingList = await context.todoListManager.getTodoList(getInput);
    
    if (!existingList) {
      throw new ApiError('NOT_FOUND', `List not found: ${id}`, 404);
    }
    
    if (existingList.isArchived) {
      throw new ApiError('CONFLICT', 'Cannot update archived list', 409);
    }
    
    // Update list metadata using the new updateListMetadata method
    const updateInput: any = {};
    if (updates.title !== undefined) {
      updateInput.title = updates.title;
    }
    if (updates.description !== undefined) {
      updateInput.description = updates.description;
    }
    if (updates.projectTag !== undefined) {
      updateInput.projectTag = updates.projectTag;
    }
    const list = await context.todoListManager.updateListMetadata(id, updateInput);
    
    const duration = Date.now() - startTime;
    
    const response: ApiResponse<TodoList> = {
      success: true,
      data: list!,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        duration,
      },
    };
    
    logger.info('List updated successfully', {
      requestId: req.id,
      listId: id,
      duration,
    });
    
    res.status(200).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid request body', 400, {
        errors: error.errors,
      });
    }
    throw error;
  }
}

/**
 * DELETE /api/v1/lists/:id - Delete or archive a list
 */
export async function deleteListHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  try {
    const startTime = Date.now();
    const id = req.params['id'];
    if (!id) {
      throw new ApiError('BAD_REQUEST', 'List ID is required', 400);
    }
    
    // Validate query parameters
    const query = deleteQuerySchema.parse(req.query);
    
    logger.info('Deleting list', {
      requestId: req.id,
      listId: id,
      permanent: query.permanent,
    });
    
    // Delete the list using TodoListManager
    const deleteInput: any = { listId: id };
    if (query.permanent !== undefined) {
      deleteInput.permanent = query.permanent;
    }
    const result = await context.todoListManager.deleteTodoList(deleteInput);
    
    const duration = Date.now() - startTime;
    
    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        duration,
      },
    };
    
    logger.info('List deleted successfully', {
      requestId: req.id,
      listId: id,
      operation: result.operation,
      duration,
    });
    
    res.status(200).json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid query parameters', 400, {
        errors: error.errors,
      });
    }
    throw error;
  }
}
