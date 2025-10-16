/**
 * MCP handler for adding tags to tasks
 */

import { z } from 'zod';

import {
  DETAILED_ERRORS,
  createOrchestrationError,
} from '../../shared/utils/error-formatter.js';
import {
  createHandlerErrorFormatter,
  ERROR_CONFIGS,
} from '../../shared/utils/handler-error-formatter.js';
import { LOGGER } from '../../shared/utils/logger.js';

import type { TaskListManager } from '../../domain/lists/task-list-manager.js';
import type {
  CallToolRequest,
  CallToolResult,
  TaskResponse,
} from '../../shared/types/mcp-types.js';
import type { Task } from '../../shared/types/task.js';

const AddTaskTagsSchema = z.object({
  listId: z.string().uuid(),
  taskId: z.string().uuid(),
  tags: z.array(z.string().max(50)).min(1).max(10),
});

export async function handleAddTaskTags(
  request: CallToolRequest,
  taskListManager: TaskListManager
): Promise<CallToolResult> {
  try {
    LOGGER.debug('Processing add_task_tags request', {
      params: request.params?.arguments,
    });

    const args = AddTaskTagsSchema.parse(request.params?.arguments);
    const currentList = await taskListManager.getTaskList({
      listId: args.listId,
    });

    if (!currentList) {
      throw DETAILED_ERRORS.notFound('Task list', 'Add Task Tags', args.listId);
    }

    const currentTask = currentList.items.find(
      (item: Task) => item.id === args.taskId
    );
    if (!currentTask) {
      throw DETAILED_ERRORS.notFound('Task', 'Add Task Tags', args.taskId);
    }

    const existingTags = currentTask.tags || [];
    const newTags = [...new Set([...existingTags, ...args.tags])];
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
      throw createOrchestrationError('Task not found after tag update', {
        context: {
          operation: 'Add Task Tags',
          field: 'taskId',
          currentValue: args.taskId,
          expectedValue: 'valid task ID',
          additionalContext: { operation: 'post-update-verification' },
        },
        actionableGuidance:
          'This indicates a data consistency issue. The task existed before the update but not after. Check for concurrent modifications or data store issues.',
      });
    }

    const addedTags = args.tags.filter(tag => updatedTask.tags.includes(tag));
    if (addedTags.length !== args.tags.length) {
      LOGGER.warn('Not all tags were successfully added', {
        requestedTags: args.tags,
        addedTags,
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

    LOGGER.info('Task tags added successfully', {
      listId: args.listId,
      taskId: args.taskId,
      title: updatedTask.title,
      addedTags: args.tags,
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
      'add_task_tags',
      ERROR_CONFIGS.taskManagement
    );
    return formatError(error, request.params?.arguments);
  }
}
