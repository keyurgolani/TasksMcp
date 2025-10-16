/**
 * MCP handler for setting task exit criteria
 * Handles the set_task_exit_criteria tool request to replace all exit criteria for a task
 */

import { z } from 'zod';

import { ExitCriteriaManager } from '../../domain/tasks/exit-criteria-manager.js';
import {
  createHandlerErrorFormatter,
  ERROR_CONFIGS,
} from '../../shared/utils/handler-error-formatter.js';
import { LOGGER } from '../../shared/utils/logger.js';

import type { TaskListManager } from '../../domain/lists/task-list-manager.js';
import type {
  CallToolRequest,
  CallToolResult,
} from '../../shared/types/mcp-types.js';
import type {
  TaskResponse,
  ExitCriteriaResponse,
} from '../../shared/types/mcp-types.js';
import type { Task } from '../../shared/types/task.js';

/**
 * Validation schema for set task exit criteria request parameters
 */
const SetTaskExitCriteriaSchema = z.object({
  listId: z.string().uuid('List ID must be a valid UUID'),
  taskId: z.string().uuid('Task ID must be a valid UUID'),
  exitCriteria: z
    .array(
      z
        .string()
        .min(1, 'Exit criteria cannot be empty')
        .max(500, 'Exit criteria too long')
    )
    .max(20, 'Too many exit criteria'),
});

/**
 * Handles MCP set_task_exit_criteria tool requests
 *
 * Sets exit criteria for a task, replacing any existing criteria.
 *
 * @param request - The MCP call tool request containing exit criteria parameters
 * @param taskListManager - The task list manager instance for task operations
 * @returns Promise<CallToolResult> - MCP response with updated task details or error
 */
export async function handleSetTaskExitCriteria(
  request: CallToolRequest,
  taskListManager: TaskListManager
): Promise<CallToolResult> {
  try {
    LOGGER.debug('Processing set_task_exit_criteria request', {
      params: request.params?.arguments,
    });

    const args = SetTaskExitCriteriaSchema.parse(request.params?.arguments);

    // Default to empty array if exitCriteria is not provided (clears all exit criteria)
    const exitCriteria = args.exitCriteria ?? [];

    // Update the task with new exit criteria
    const result = await taskListManager.updateTaskList({
      listId: args.listId,
      action: 'update_item',
      itemId: args.taskId,
      itemData: {
        exitCriteria: exitCriteria,
      },
    });

    const updatedTask = result.items.find(
      (item: Task) => item.id === args.taskId
    );
    if (!updatedTask) {
      throw new Error('Task not found after updating exit criteria');
    }

    // Calculate exit criteria progress
    const exitCriteriaManager = new ExitCriteriaManager();
    const progress = exitCriteriaManager.calculateCriteriaProgress(
      updatedTask.exitCriteria
    );
    const canComplete = exitCriteriaManager.areAllCriteriaMet(
      updatedTask.exitCriteria
    );

    // Format exit criteria for response
    const exitCriteriaResponse: ExitCriteriaResponse[] =
      updatedTask.exitCriteria.map(criteria => ({
        id: criteria.id,
        description: criteria.description,
        isMet: criteria.isMet,
        ...(criteria.metAt && { metAt: criteria.metAt.toISOString() }),
        ...(criteria.notes && { notes: criteria.notes }),
      }));

    const response: TaskResponse & {
      exitCriteriaProgress: number;
      canComplete: boolean;
    } = {
      id: updatedTask.id,
      title: updatedTask.title,
      description: updatedTask.description,
      status: updatedTask.status,
      priority: updatedTask.priority,
      tags: updatedTask.tags,
      createdAt: updatedTask.createdAt.toISOString(),
      updatedAt: updatedTask.updatedAt.toISOString(),
      estimatedDuration: updatedTask.estimatedDuration,
      exitCriteria: exitCriteriaResponse,
      exitCriteriaProgress: progress,
      canComplete,
    };

    LOGGER.info('Task exit criteria updated successfully', {
      listId: args.listId,
      taskId: args.taskId,
      criteriaCount: args.exitCriteria.length,
      progress,
      canComplete,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    // Use error formatting with taskManagement configuration
    const formatError = createHandlerErrorFormatter(
      'set_task_exit_criteria',
      ERROR_CONFIGS.taskManagement
    );
    return formatError(error, request.params?.arguments);
  }
}
