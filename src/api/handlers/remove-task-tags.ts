/**
 * MCP handler for removing tags from tasks
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
  TaskResponse,
} from '../../shared/types/mcp-types.js';
import type { Task } from '../../shared/types/task.js';

const RemoveTaskTagsSchema = z.object({
  listId: z.string().uuid(),
  taskId: z.string().uuid(),
  tags: z.array(z.string().max(50)).min(1).max(10),
});

export async function handleRemoveTaskTags(
  request: CallToolRequest,
  taskListManager: TaskListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing remove_task_tags request', {
      params: request.params?.arguments,
    });

    const args = RemoveTaskTagsSchema.parse(request.params?.arguments);
    const currentList = await taskListManager.getTaskList({
      listId: args.listId,
    });

    if (!currentList) {
      throw new Error('Task list not found');
    }

    const currentTask = currentList.items.find(
      (item: Task) => item.id === args.taskId
    );
    if (!currentTask) {
      throw new Error('Task not found');
    }

    const existingTags = currentTask.tags || [];
    const newTags = existingTags.filter(tag => !args.tags.includes(tag));

    const result = await taskListManager.updateTaskList({
      listId: args.listId,
      action: 'update_item',
      itemId: args.taskId,
      itemData: {
        tags: newTags,
      },
    });

    const updatedTask = result.items.find(
      (item: Task) => item.id === args.taskId
    );
    if (!updatedTask) {
      throw new Error('Task not found after tag removal');
    }

    const removedTags = args.tags.filter(
      tag => !updatedTask.tags.includes(tag)
    );
    if (removedTags.length !== args.tags.length) {
      logger.warn('Not all tags were successfully removed', {
        requestedTags: args.tags,
        removedTags,
        finalTags: updatedTask.tags,
      });
    }

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

    logger.info('Task tags removed successfully', {
      listId: args.listId,
      taskId: args.taskId,
      title: updatedTask.title,
      removedTags: args.tags,
      finalTags: updatedTask.tags,
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
      'remove_task_tags',
      ERROR_CONFIGS.taskManagement
    );
    return formatError(error, request.params?.arguments);
  }
}
