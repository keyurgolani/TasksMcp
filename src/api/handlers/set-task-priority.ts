/**
 * MCP handler for changing task priority
 */

import { z } from 'zod';

import { Priority } from '../../shared/types/task.js';
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
import type { TaskResponse } from '../../shared/types/mcp-types.js';
import type { Task } from '../../shared/types/task.js';

const SetTaskPrioritySchema = z.object({
  listId: z.string().uuid(),
  taskId: z.string().uuid(),
  priority: z.number().min(1).max(5),
});

export async function handleSetTaskPriority(
  request: CallToolRequest,
  todoListManager: TaskListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing set_task_priority request', {
      params: request.params?.arguments,
    });

    // Validate input parameters
    const args = SetTaskPrioritySchema.parse(request.params?.arguments);

    // Convert priority number to Priority enum
    const priority = args.priority as Priority;

    // Update the task priority using the TaskListManager's updateTodoList method
    const result = await todoListManager.updateTaskList({
      listId: args.listId,
      action: 'update_item',
      itemId: args.taskId,
      itemData: {
        priority,
      },
    });

    // Find the updated task
    const updatedTask = result.items.find(
      (item: Task) => item.id === args.taskId
    );
    if (!updatedTask) {
      throw new Error('Task not found after priority update');
    }

    // Verify the priority was actually updated
    if (updatedTask.priority !== priority) {
      throw new Error('Task priority was not successfully updated');
    }

    // Format response
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
    };

    logger.info('Task priority updated successfully', {
      listId: args.listId,
      taskId: args.taskId,
      title: updatedTask.title,
      newPriority: priority,
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
      'set_task_priority',
      ERROR_CONFIGS.taskManagement
    );
    return formatError(error, request.params?.arguments);
  }
}
