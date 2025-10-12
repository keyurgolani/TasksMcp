/**
 * MCP handler for updating exit criteria status
 * Handles the update_exit_criteria tool request to mark criteria as met/unmet
 */

import { z } from 'zod';

import { ExitCriteriaManager } from '../../domain/tasks/exit-criteria-manager.js';
import {
  createHandlerErrorFormatter,
  ERROR_CONFIGS,
} from '../../shared/utils/handler-error-formatter.js';
import { logger } from '../../shared/utils/logger.js';

import type { TaskListManager } from '../../domain/lists/task-list-manager.js';
import type {
  CallToolRequest,
  CallToolResult,
} from '../../shared/types/mcp-types.js';
import type { ExitCriteriaUpdateResponse } from '../../shared/types/mcp-types.js';
import type { Task } from '../../shared/types/task.js';

/**
 * Validation schema for update exit criteria request parameters
 */
const UpdateExitCriteriaSchema = z.object({
  listId: z.string().uuid('List ID must be a valid UUID'),
  taskId: z.string().uuid('Task ID must be a valid UUID'),
  criteriaId: z.string().uuid('Criteria ID must be a valid UUID'),
  isMet: z.boolean().optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

/**
 * Handles MCP update_exit_criteria tool requests
 *
 * Updates the status of a specific exit criteria within a task.
 *
 * @param request - The MCP call tool request containing criteria update parameters
 * @param todoListManager - The todo list manager instance for task operations
 * @returns Promise<CallToolResult> - MCP response with updated criteria details or error
 */
export async function handleUpdateExitCriteria(
  request: CallToolRequest,
  todoListManager: TaskListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing update_exit_criteria request', {
      params: request.params?.arguments,
    });

    const args = UpdateExitCriteriaSchema.parse(request.params?.arguments);

    // Ensure at least one field is provided for update
    if (args.isMet === undefined && !args.notes) {
      throw new Error(
        'At least one field to update must be provided (isMet or notes)'
      );
    }

    // Get the current task to find the exit criteria
    const currentList = await todoListManager.getTaskList({
      listId: args.listId,
      includeCompleted: true,
    });

    if (!currentList) {
      throw new Error(`Task list not found: ${args.listId}`);
    }

    const task = currentList.items.find(
      (item: Task) => item.id === args.taskId
    );
    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    const criteriaIndex = task.exitCriteria.findIndex(
      c => c.id === args.criteriaId
    );
    if (criteriaIndex === -1) {
      throw new Error(`Exit criteria not found: ${args.criteriaId}`);
    }

    const existingCriteria = task.exitCriteria[criteriaIndex];
    if (!existingCriteria) {
      throw new Error(`Exit criteria not found: ${args.criteriaId}`);
    }

    // Update the criteria
    const exitCriteriaManager = new ExitCriteriaManager();
    const updatedCriteria = await exitCriteriaManager.updateExitCriteria(
      existingCriteria,
      {
        ...(args.isMet !== undefined && { isMet: args.isMet }),
        ...(args.notes && { notes: args.notes }),
      }
    );

    // Update the task with the modified criteria
    const updatedExitCriteria = [...task.exitCriteria];
    updatedExitCriteria[criteriaIndex] = updatedCriteria;

    const result = await todoListManager.updateTaskList({
      listId: args.listId,
      action: 'update_item',
      itemId: args.taskId,
      itemData: {
        exitCriteriaObjects: updatedExitCriteria, // Use objects to preserve IDs and state
      },
    });

    const updatedTask = result.items.find(
      (item: Task) => item.id === args.taskId
    );
    if (!updatedTask) {
      throw new Error('Task not found after updating exit criteria');
    }

    // Find the updated criteria in the result
    const finalCriteria = updatedTask.exitCriteria.find(
      c => c.id === args.criteriaId
    );
    if (!finalCriteria) {
      throw new Error('Updated criteria not found in result');
    }

    // Calculate task completion readiness
    const progress = exitCriteriaManager.calculateCriteriaProgress(
      updatedTask.exitCriteria
    );
    const canComplete = exitCriteriaManager.areAllCriteriaMet(
      updatedTask.exitCriteria
    );

    const response: ExitCriteriaUpdateResponse = {
      taskId: args.taskId,
      criteriaId: args.criteriaId,
      description: finalCriteria.description,
      isMet: finalCriteria.isMet,
      ...(finalCriteria.metAt && {
        metAt:
          finalCriteria.metAt instanceof Date
            ? finalCriteria.metAt.toISOString()
            : new Date(finalCriteria.metAt).toISOString(),
      }),
      ...(finalCriteria.notes && { notes: finalCriteria.notes }),
      taskCanComplete: canComplete,
      exitCriteriaProgress: progress,
    };

    logger.info('Exit criteria updated successfully', {
      listId: args.listId,
      taskId: args.taskId,
      criteriaId: args.criteriaId,
      isMet: finalCriteria.isMet,
      taskCanComplete: canComplete,
      progress,
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
      'update_exit_criteria',
      ERROR_CONFIGS.taskManagement
    );
    return formatError(error, request.params?.arguments);
  }
}
