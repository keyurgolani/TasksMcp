/**
 * MCP handler for removing tasks from todo lists
 */

import { z } from 'zod';

import {
  createHandlerErrorFormatter,
  ERROR_CONFIGS,
} from '../../shared/utils/handler-error-formatter.js';
import { logger } from '../../shared/utils/logger.js';

import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
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
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing remove_task request', {
      params: request.params?.arguments,
    });

    const args = RemoveTaskSchema.parse(request.params?.arguments);
    const result = await todoListManager.updateTodoList({
      listId: args.listId,
      action: 'remove_item',
      itemId: args.taskId,
    });

    const taskExists = result.items.some(item => item.id === args.taskId);
    if (taskExists) {
      throw new Error('Task was not successfully removed');
    }

    logger.info('Task removed successfully', {
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
