/**
 * MCP handler for removing tasks from task lists
 */

import { z } from 'zod';

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

const RemoveTaskSchema = z.object({
  listId: z.string().uuid(),
  taskId: z.string().uuid(),
});

export async function handleRemoveTask(
  request: CallToolRequest,
  taskListManager: TaskListManager
): Promise<CallToolResult> {
  try {
    LOGGER.debug('Processing remove_task request', {
      params: request.params?.arguments,
    });

    const args = RemoveTaskSchema.parse(request.params?.arguments);
    const result = await taskListManager.updateTaskList({
      listId: args.listId,
      action: 'remove_item',
      itemId: args.taskId,
    });

    const taskExists = result.items.some(item => item.id === args.taskId);
    if (taskExists) {
      throw new Error('Task was not successfully removed');
    }

    LOGGER.info('Task removed successfully', {
      listId: args.listId,
      taskId: args.taskId,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: `Task ${args.taskId} removed from list ${args.listId}`,
              listId: args.listId,
              taskId: args.taskId,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    // Use error formatting with taskManagement configuration
    const formatError = createHandlerErrorFormatter(
      'remove_task',
      ERROR_CONFIGS.taskManagement
    );
    return formatError(error, request.params?.arguments);
  }
}
