/**
 * MCP handler for updating task properties
 *
 * Handles the update_task tool request to modify existing task properties
 * such as title, description, and estimated duration. Validates input
 * parameters and ensures at least one field is provided for update.
 */

import { z } from 'zod';

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
import type {
  TaskResponse,
  ExitCriteriaResponse,
} from '../../shared/types/mcp-types.js';
import type { Task } from '../../shared/types/task.js';

/**
 * Validation schema for update task request parameters
 * Ensures list and task IDs are valid UUIDs and validates optional update fields
 */
const UpdateTaskSchema = z.object({
  listId: z.string().uuid('List ID must be a valid UUID'),
  taskId: z.string().uuid('Task ID must be a valid UUID'),
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title too long')
    .optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  estimatedDuration: z.number().min(1, 'Duration must be positive').optional(),
  exitCriteria: z.array(z.string().min(1).max(500)).max(20).optional(),
  agentPromptTemplate: z
    .string()
    .max(10000, 'Agent prompt template too long')
    .optional(),
});

/**
 * Handles MCP update_task tool requests
 *
 * Updates an existing task's properties within a task list. Validates that at least
 * one field is provided for update and returns the updated task information.
 *
 * @param request - The MCP call tool request containing update parameters
 * @param taskListManager - The task list manager instance for task operations
 * @returns Promise<CallToolResult> - MCP response with updated task details or error
 */
export async function handleUpdateTask(
  request: CallToolRequest,
  taskListManager: TaskListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing update_task request', {
      params: request.params?.arguments,
    });

    const args = UpdateTaskSchema.parse(request.params?.arguments);

    // Ensure at least one field is provided for update
    if (
      !args.title &&
      !args.description &&
      !args.estimatedDuration &&
      !args.exitCriteria &&
      !args.agentPromptTemplate
    ) {
      throw new Error(
        'At least one field to update must be provided (title, description, estimatedDuration, exitCriteria, or agentPromptTemplate)'
      );
    }

    // Update the task with provided fields
    const result = await taskListManager.updateTaskList({
      listId: args.listId,
      action: 'update_item',
      itemId: args.taskId,
      itemData: {
        ...(args.title && { title: args.title }),
        ...(args.description && { description: args.description }),
        ...(args.estimatedDuration && {
          estimatedDuration: args.estimatedDuration,
        }),
        ...(args.exitCriteria && { exitCriteria: args.exitCriteria }),
        ...(args.agentPromptTemplate !== undefined && {
          agentPromptTemplate: args.agentPromptTemplate,
        }),
      },
    });

    const updatedTask = result.items.find(
      (item: Task) => item.id === args.taskId
    );
    if (!updatedTask) {
      throw new Error('Task not found after update');
    }

    // Format exit criteria for response
    const exitCriteriaResponse: ExitCriteriaResponse[] =
      updatedTask.exitCriteria.map(criteria => ({
        id: criteria.id,
        description: criteria.description,
        isMet: criteria.isMet,
        ...(criteria.metAt && {
          metAt:
            criteria.metAt instanceof Date
              ? criteria.metAt.toISOString()
              : new Date(criteria.metAt).toISOString(),
        }),
        ...(criteria.notes && { notes: criteria.notes }),
      }));

    const response: TaskResponse = {
      id: updatedTask.id,
      title: updatedTask.title,
      description: updatedTask.description,
      status: updatedTask.status,
      priority: updatedTask.priority,
      tags: updatedTask.tags,
      createdAt: updatedTask.createdAt.toISOString(),
      updatedAt: updatedTask.updatedAt.toISOString(),
      estimatedDuration: updatedTask.estimatedDuration,
      ...(exitCriteriaResponse.length > 0 && {
        exitCriteria: exitCriteriaResponse,
      }),
    };

    logger.info('Task updated successfully', {
      listId: args.listId,
      taskId: args.taskId,
      title: updatedTask.title,
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
      'update_task',
      ERROR_CONFIGS.taskManagement
    );
    return formatError(error, request.params?.arguments);
  }
}
