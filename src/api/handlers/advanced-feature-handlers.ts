/**
 * Advanced feature API handlers for exit criteria, action plans, and notes
 */

import { z } from 'zod';

import { ApiError } from '../../shared/errors/api-error.js';
import { LOGGER } from '../../shared/utils/logger.js';

import type { CreateExitCriteriaInput } from '../../domain/tasks/exit-criteria-manager.js';
import type {
  ApiRequest,
  ApiResponse,
  HandlerContext,
} from '../../shared/types/api.js';
import type {
  ExitCriteria,
  ActionPlan,
  ActionStep,
  ImplementationNote,
} from '../../shared/types/task.js';
import type { Task } from '../../shared/types/task.js';
import type { Response } from 'express';

/**
 * Zod schemas for request validation
 */

// Schema for adding exit criteria
const addExitCriteriaSchema = z.object({
  listId: z.string().uuid().optional(), // Optional in body, can come from query
  description: z.string().min(1).max(500),
});

// Schema for updating exit criteria
const updateExitCriteriaSchema = z.object({
  listId: z.string().uuid().optional(), // Optional in body, can come from query
  taskId: z.string().uuid().optional(), // Optional in body, can come from query
  description: z.string().min(1).max(500).optional(),
  isMet: z.boolean().optional(),
  notes: z.string().optional(),
});

// Schema for creating action plan
const createActionPlanSchema = z.object({
  listId: z.string().uuid().optional(), // Optional in body, can come from query
  content: z.string().min(10).max(50000),
});

// Schema for updating action plan
const updateActionPlanSchema = z.object({
  listId: z.string().uuid().optional(), // Optional in body, can come from query
  taskId: z.string().uuid().optional(), // Optional in body, can come from query
  content: z.string().min(10).max(50000).optional(),
});

// Schema for adding task note
const addTaskNoteSchema = z.object({
  listId: z.string().uuid().optional(), // Optional in body, can come from query
  content: z.string().min(3).max(10000),
  type: z.enum(['general', 'technical', 'decision', 'learning']),
  author: z.string().optional(),
});

/**
 * GET /api/v1/exit-criteria/task/:taskId - Get task exit criteria
 */
export async function getTaskExitCriteriaHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  const startTime = Date.now();
  const taskId = req.params['taskId'];
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

  LOGGER.info('Getting task exit criteria', {
    requestId: req.id,
    taskId,
    listId,
  });

  // Get the list
  const list = await context.taskListManager.getTaskList({
    listId,
  });

  if (!list) {
    throw new ApiError('NOT_FOUND', `List not found: ${listId}`, 404);
  }

  // Find the task
  const task = list.items.find((item: Task) => item.id === taskId);

  if (!task) {
    throw new ApiError('NOT_FOUND', `Task not found: ${taskId}`, 404);
  }

  // Get exit criteria from task
  const exitCriteria = task.exitCriteria || [];

  const duration = Date.now() - startTime;

  const response: ApiResponse<{
    exitCriteria: ExitCriteria[];
  }> = {
    success: true,
    data: {
      exitCriteria,
    },
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      duration,
    },
  };

  LOGGER.info('Task exit criteria retrieved successfully', {
    requestId: req.id,
    taskId,
    criteriaCount: exitCriteria.length,
    duration,
  });

  res.status(200).json(response);
}

/**
 * POST /api/v1/exit-criteria/task/:taskId - Add exit criteria
 */
export async function addExitCriteriaHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  try {
    const startTime = Date.now();
    const taskId = req.params['taskId'];
    if (!taskId) {
      throw new ApiError('BAD_REQUEST', 'Task ID is required', 400);
    }

    // Validate request body
    const input = addExitCriteriaSchema.parse(req.body);

    // Get listId from query parameters or body
    const listId = (req.query['listId'] as string) || input.listId;
    if (!listId) {
      throw new ApiError(
        'BAD_REQUEST',
        'listId is required (in query or body)',
        400
      );
    }

    LOGGER.info('Adding exit criteria to task', {
      requestId: req.id,
      taskId,
      listId,
      description: input.description,
    });

    // Get the list
    const list = await context.taskListManager.getTaskList({
      listId,
    });

    if (!list) {
      throw new ApiError('NOT_FOUND', `List not found: ${listId}`, 404);
    }

    // Find the task
    const task = list.items.find((item: Task) => item.id === taskId);

    if (!task) {
      throw new ApiError('NOT_FOUND', `Task not found: ${taskId}`, 404);
    }

    // Create new exit criteria
    const createInput: CreateExitCriteriaInput = {
      taskId,
      description: input.description,
    };
    const newCriteria =
      await context.exitCriteriaManager.createExitCriteria(createInput);

    // Add to task's exit criteria
    const updatedExitCriteria = [...(task.exitCriteria || []), newCriteria];

    // Update the task
    const updatedList = await context.taskListManager.updateTaskList({
      listId,
      action: 'update_item',
      itemId: taskId,
      itemData: {
        exitCriteriaObjects: updatedExitCriteria,
      },
    });

    // Find the updated task
    const updatedTask = updatedList.items.find(
      (item: Task) => item.id === taskId
    );

    if (!updatedTask) {
      throw new ApiError('INTERNAL_ERROR', 'Task not found after update', 500);
    }

    const duration = Date.now() - startTime;

    const response: ApiResponse<ExitCriteria> = {
      success: true,
      data: newCriteria,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        duration,
      },
    };

    LOGGER.info('Exit criteria added successfully', {
      requestId: req.id,
      taskId,
      criteriaId: newCriteria.id,
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
 * PUT /api/v1/exit-criteria/:id - Update exit criteria
 */
export async function updateExitCriteriaHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  try {
    const startTime = Date.now();
    const criteriaId = req.params['id'];
    if (!criteriaId) {
      throw new ApiError('BAD_REQUEST', 'Exit criteria ID is required', 400);
    }

    // Validate request body
    const input = updateExitCriteriaSchema.parse(req.body);

    // Get listId and taskId from query parameters or body
    const listId = (req.query['listId'] as string) || input.listId;
    const taskId = (req.query['taskId'] as string) || input.taskId;
    if (!listId) {
      throw new ApiError(
        'BAD_REQUEST',
        'listId is required (in query or body)',
        400
      );
    }
    if (!taskId) {
      throw new ApiError(
        'BAD_REQUEST',
        'taskId is required (in query or body)',
        400
      );
    }

    LOGGER.info('Updating exit criteria', {
      requestId: req.id,
      criteriaId,
      listId,
      taskId,
    });

    // Get the list
    const list = await context.taskListManager.getTaskList({
      listId,
    });

    if (!list) {
      throw new ApiError('NOT_FOUND', `List not found: ${listId}`, 404);
    }

    // Find the task
    const task = list.items.find((item: Task) => item.id === taskId);

    if (!task) {
      throw new ApiError('NOT_FOUND', `Task not found: ${taskId}`, 404);
    }

    // Find the exit criteria
    const criteriaIndex = (task.exitCriteria || []).findIndex(
      (c: ExitCriteria) => c.id === criteriaId
    );

    if (criteriaIndex === -1) {
      throw new ApiError(
        'NOT_FOUND',
        `Exit criteria not found: ${criteriaId}`,
        404
      );
    }

    const existingCriteria = task.exitCriteria![criteriaIndex]!;

    // Update the criteria
    const updates: Partial<ExitCriteria> = {};
    if (input.description !== undefined) {
      updates.description = input.description;
    }
    if (input.isMet !== undefined) {
      updates.isMet = input.isMet;
    }
    if (input.notes !== undefined) {
      updates.notes = input.notes;
    }

    const updatedCriteria =
      await context.exitCriteriaManager.updateExitCriteria(
        existingCriteria,
        updates
      );

    // Update task's exit criteria array
    const updatedExitCriteria = [...task.exitCriteria!];
    updatedExitCriteria[criteriaIndex] = updatedCriteria;

    // Update the task
    const updatedList = await context.taskListManager.updateTaskList({
      listId,
      action: 'update_item',
      itemId: taskId,
      itemData: {
        exitCriteriaObjects: updatedExitCriteria,
      },
    });

    // Find the updated task
    const updatedTask = updatedList.items.find(
      (item: Task) => item.id === taskId
    );

    if (!updatedTask) {
      throw new ApiError('INTERNAL_ERROR', 'Task not found after update', 500);
    }

    const duration = Date.now() - startTime;

    const response: ApiResponse<ExitCriteria> = {
      success: true,
      data: updatedCriteria,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        duration,
      },
    };

    LOGGER.info('Exit criteria updated successfully', {
      requestId: req.id,
      criteriaId,
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
 * GET /api/v1/action-plans/task/:taskId - Get action plan
 */
export async function getActionPlanHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  const startTime = Date.now();
  const taskId = req.params['taskId'];
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

  LOGGER.info('Getting task action plan', {
    requestId: req.id,
    taskId,
    listId,
  });

  // Get the list
  const list = await context.taskListManager.getTaskList({
    listId,
  });

  if (!list) {
    throw new ApiError('NOT_FOUND', `List not found: ${listId}`, 404);
  }

  // Find the task
  const task = list.items.find((item: Task) => item.id === taskId);

  if (!task) {
    throw new ApiError('NOT_FOUND', `Task not found: ${taskId}`, 404);
  }

  // Get action plan from task
  const actionPlan = task.actionPlan;

  if (!actionPlan) {
    throw new ApiError(
      'NOT_FOUND',
      `No action plan found for task: ${taskId}`,
      404
    );
  }

  const progressSummary =
    context.actionPlanManager.getProgressSummary(actionPlan);

  const duration = Date.now() - startTime;

  const response: ApiResponse<{
    actionPlan: ActionPlan;
    progressSummary: typeof progressSummary;
  }> = {
    success: true,
    data: {
      actionPlan,
      progressSummary,
    },
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      duration,
    },
  };

  LOGGER.info('Task action plan retrieved successfully', {
    requestId: req.id,
    taskId,
    stepCount: actionPlan.steps.length,

    duration,
  });

  res.status(200).json(response);
}

/**
 * POST /api/v1/action-plans/task/:taskId - Create action plan
 */
export async function createActionPlanHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  try {
    const startTime = Date.now();
    const taskId = req.params['taskId'];
    if (!taskId) {
      throw new ApiError('BAD_REQUEST', 'Task ID is required', 400);
    }

    // Validate request body
    const input = createActionPlanSchema.parse(req.body);

    // Get listId from query parameters or body
    const listId = (req.query['listId'] as string) || input.listId;
    if (!listId) {
      throw new ApiError(
        'BAD_REQUEST',
        'listId is required (in query or body)',
        400
      );
    }

    LOGGER.info('Creating action plan for task', {
      requestId: req.id,
      taskId,
      listId,
      contentLength: input.content.length,
    });

    // Get the list
    const list = await context.taskListManager.getTaskList({
      listId,
    });

    if (!list) {
      throw new ApiError('NOT_FOUND', `List not found: ${listId}`, 404);
    }

    // Find the task
    const task = list.items.find((item: Task) => item.id === taskId);

    if (!task) {
      throw new ApiError('NOT_FOUND', `Task not found: ${taskId}`, 404);
    }

    // Check if action plan already exists
    if (task.actionPlan) {
      throw new ApiError(
        'CONFLICT',
        'Task already has an action plan. Use PUT to update it.',
        409
      );
    }

    // Create new action plan
    const newActionPlan = await context.actionPlanManager.createActionPlan({
      taskId,
      content: input.content,
    });

    // Update the task
    const updatedList = await context.taskListManager.updateTaskList({
      listId,
      action: 'update_item',
      itemId: taskId,
      itemData: {
        actionPlan: newActionPlan,
      },
    });

    // Find the updated task
    const updatedTask = updatedList.items.find(
      (item: Task) => item.id === taskId
    );

    if (!updatedTask) {
      throw new ApiError('INTERNAL_ERROR', 'Task not found after update', 500);
    }

    const duration = Date.now() - startTime;

    const response: ApiResponse<ActionPlan> = {
      success: true,
      data: newActionPlan,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        duration,
      },
    };

    LOGGER.info('Action plan created successfully', {
      requestId: req.id,
      taskId,
      planId: newActionPlan.id,
      stepCount: newActionPlan.steps.length,
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
 * PUT /api/v1/action-plans/:id - Update action plan
 */
export async function updateActionPlanHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  try {
    const startTime = Date.now();
    const planId = req.params['id'];
    if (!planId) {
      throw new ApiError('BAD_REQUEST', 'Action plan ID is required', 400);
    }

    // Validate request body
    const input = updateActionPlanSchema.parse(req.body);

    // Get listId and taskId from query parameters or body
    const listId = (req.query['listId'] as string) || input.listId;
    const taskId = (req.query['taskId'] as string) || input.taskId;
    if (!listId) {
      throw new ApiError(
        'BAD_REQUEST',
        'listId is required (in query or body)',
        400
      );
    }
    if (!taskId) {
      throw new ApiError(
        'BAD_REQUEST',
        'taskId is required (in query or body)',
        400
      );
    }

    LOGGER.info('Updating action plan', {
      requestId: req.id,
      planId,
      listId,
      taskId,
    });

    // Get the list
    const list = await context.taskListManager.getTaskList({
      listId,
    });

    if (!list) {
      throw new ApiError('NOT_FOUND', `List not found: ${listId}`, 404);
    }

    // Find the task
    const task = list.items.find((item: Task) => item.id === taskId);

    if (!task) {
      throw new ApiError('NOT_FOUND', `Task not found: ${taskId}`, 404);
    }

    // Verify action plan exists and matches ID
    if (!task.actionPlan) {
      throw new ApiError(
        'NOT_FOUND',
        `No action plan found for task: ${taskId}`,
        404
      );
    }

    if (task.actionPlan.id !== planId) {
      throw new ApiError(
        'NOT_FOUND',
        `Action plan ${planId} not found for task ${taskId}`,
        404
      );
    }

    // Update the action plan
    const updates: Partial<ActionPlan> = {};
    if (input.content !== undefined) {
      updates.content = input.content;
    }

    const updatedActionPlan = await context.actionPlanManager.updateActionPlan(
      task.actionPlan,
      updates
    );

    // Update the task
    const updatedList = await context.taskListManager.updateTaskList({
      listId,
      action: 'update_item',
      itemId: taskId,
      itemData: {
        actionPlan: updatedActionPlan,
      },
    });

    // Find the updated task
    const updatedTask = updatedList.items.find(
      (item: Task) => item.id === taskId
    );

    if (!updatedTask) {
      throw new ApiError('INTERNAL_ERROR', 'Task not found after update', 500);
    }

    const duration = Date.now() - startTime;

    const response: ApiResponse<ActionPlan> = {
      success: true,
      data: updatedActionPlan,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        duration,
      },
    };

    LOGGER.info('Action plan updated successfully', {
      requestId: req.id,
      planId,
      taskId,
      newVersion: updatedActionPlan.version,
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
 * GET /api/v1/notes/task/:taskId - Get task notes
 */
export async function getTaskNotesHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  const startTime = Date.now();
  const taskId = req.params['taskId'];
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

  // Parse optional query parameters
  const sortOrder = (req.query['sortOrder'] as 'asc' | 'desc') || 'desc';
  const noteType = req.query['type'] as ImplementationNote['type'] | undefined;

  LOGGER.info('Getting task notes', {
    requestId: req.id,
    taskId,
    listId,
    sortOrder,
    noteType,
  });

  // Get the list
  const list = await context.taskListManager.getTaskList({
    listId,
  });

  if (!list) {
    throw new ApiError('NOT_FOUND', `List not found: ${listId}`, 404);
  }

  // Find the task
  const task = list.items.find((item: Task) => item.id === taskId);

  if (!task) {
    throw new ApiError('NOT_FOUND', `Task not found: ${taskId}`, 404);
  }

  // Get notes from task
  let notes = task.implementationNotes || [];

  // Filter by type if specified
  if (noteType) {
    notes = context.notesManager.filterNotesByType(notes, noteType);
  }

  // Sort notes
  notes = await context.notesManager.getNotesHistory(notes, sortOrder);

  const duration = Date.now() - startTime;

  const response: ApiResponse<{
    notes: ImplementationNote[];
  }> = {
    success: true,
    data: {
      notes,
    },
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      duration,
    },
  };

  LOGGER.info('Task notes retrieved successfully', {
    requestId: req.id,
    taskId,
    noteCount: notes.length,
    duration,
  });

  res.status(200).json(response);
}

/**
 * POST /api/v1/notes/task/:taskId - Add task note
 */
export async function addTaskNoteHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  try {
    const startTime = Date.now();
    const taskId = req.params['taskId'];
    if (!taskId) {
      throw new ApiError('BAD_REQUEST', 'Task ID is required', 400);
    }

    // Validate request body
    const input = addTaskNoteSchema.parse(req.body);

    // Get listId from query parameters or body
    const listId = (req.query['listId'] as string) || input.listId;
    if (!listId) {
      throw new ApiError(
        'BAD_REQUEST',
        'listId is required (in query or body)',
        400
      );
    }

    LOGGER.info('Adding note to task', {
      requestId: req.id,
      taskId,
      listId,
      type: input.type,
      contentLength: input.content.length,
    });

    // Get the list
    const list = await context.taskListManager.getTaskList({
      listId,
    });

    if (!list) {
      throw new ApiError('NOT_FOUND', `List not found: ${listId}`, 404);
    }

    // Find the task
    const task = list.items.find((item: Task) => item.id === taskId);

    if (!task) {
      throw new ApiError('NOT_FOUND', `Task not found: ${taskId}`, 404);
    }

    // Create new note
    const newNote = await context.notesManager.addTaskNote(
      taskId,
      input.content,
      input.type,
      input.author
    );

    // Add to task's notes
    const updatedNotes = [...(task.implementationNotes || []), newNote];

    // Update the task
    const updatedList = await context.taskListManager.updateTaskList({
      listId,
      action: 'update_item',
      itemId: taskId,
      itemData: {
        implementationNotes: updatedNotes,
      },
    });

    // Find the updated task
    const updatedTask = updatedList.items.find(
      (item: Task) => item.id === taskId
    );

    if (!updatedTask) {
      throw new ApiError('INTERNAL_ERROR', 'Task not found after update', 500);
    }

    const duration = Date.now() - startTime;

    const response: ApiResponse<ImplementationNote> = {
      success: true,
      data: newNote,
      meta: {
        requestId: req.id,
        timestamp: new Date().toISOString(),
        duration,
      },
    };

    LOGGER.info('Task note added successfully', {
      requestId: req.id,
      taskId,
      noteId: newNote.id,
      type: newNote.type,
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
 * POST /api/v1/action-plans/:id/steps/:stepId/complete - Complete an action plan step
 */
export async function completeStepHandler(
  req: ApiRequest,
  res: Response,
  context: HandlerContext
): Promise<void> {
  const startTime = Date.now();
  const planId = req.params['id'];
  const stepId = req.params['stepId'];

  if (!planId) {
    throw new ApiError('BAD_REQUEST', 'Action plan ID is required', 400);
  }
  if (!stepId) {
    throw new ApiError('BAD_REQUEST', 'Step ID is required', 400);
  }

  // Parse query parameters for listId and taskId (required to find the task)
  const listId = req.query['listId'] as string;
  const taskId = req.query['taskId'] as string;

  if (!listId) {
    throw new ApiError(
      'BAD_REQUEST',
      'listId query parameter is required',
      400
    );
  }
  if (!taskId) {
    throw new ApiError(
      'BAD_REQUEST',
      'taskId query parameter is required',
      400
    );
  }

  // Parse optional notes from request body
  const notes = req.body?.notes as string | undefined;

  LOGGER.info('Completing action plan step', {
    requestId: req.id,
    planId,
    stepId,
    listId,
    taskId,
  });

  // Get the list
  const list = await context.taskListManager.getTaskList({
    listId,
  });

  if (!list) {
    throw new ApiError('NOT_FOUND', `List not found: ${listId}`, 404);
  }

  // Find the task
  const task = list.items.find((item: Task) => item.id === taskId);

  if (!task) {
    throw new ApiError('NOT_FOUND', `Task not found: ${taskId}`, 404);
  }

  // Verify action plan exists and matches ID
  if (!task.actionPlan) {
    throw new ApiError(
      'NOT_FOUND',
      `No action plan found for task: ${taskId}`,
      404
    );
  }

  if (task.actionPlan.id !== planId) {
    throw new ApiError(
      'NOT_FOUND',
      `Action plan ${planId} not found for task ${taskId}`,
      404
    );
  }

  // Find the step
  const step = task.actionPlan.steps.find((s: ActionStep) => s.id === stepId);

  if (!step) {
    throw new ApiError(
      'NOT_FOUND',
      `Step ${stepId} not found in action plan ${planId}`,
      404
    );
  }

  // Update the step to completed
  const updatedActionPlan = await context.actionPlanManager.updateStepProgress(
    task.actionPlan,
    {
      planId,
      stepId,
      status: 'completed',
      notes,
    }
  );

  // Update the task
  const updatedList = await context.taskListManager.updateTaskList({
    listId,
    action: 'update_item',
    itemId: taskId,
    itemData: {
      actionPlan: updatedActionPlan,
    },
  });

  // Find the updated task
  const updatedTask = updatedList.items.find(
    (item: Task) => item.id === taskId
  );

  if (!updatedTask) {
    throw new ApiError('INTERNAL_ERROR', 'Task not found after update', 500);
  }

  // Find the updated step
  const updatedStep = updatedActionPlan.steps.find(
    (s: ActionStep) => s.id === stepId
  );

  if (!updatedStep) {
    throw new ApiError('INTERNAL_ERROR', 'Step not found after update', 500);
  }

  const duration = Date.now() - startTime;

  const response: ApiResponse<{
    step: typeof updatedStep;
    actionPlan: ActionPlan;
  }> = {
    success: true,
    data: {
      step: updatedStep,
      actionPlan: updatedActionPlan,
    },
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      duration,
    },
  };

  LOGGER.info('Action plan step completed successfully', {
    requestId: req.id,
    planId,
    stepId,
    taskId,
    duration,
  });

  res.status(200).json(response);
}
