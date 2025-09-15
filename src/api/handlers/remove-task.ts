/**
 * MCP handler for removing tasks from todo lists
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import { logger } from '../../shared/utils/logger.js';

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
          text: JSON.stringify({
            success: true,
            message: `Task ${args.taskId} removed from list ${args.listId}`,
            listId: args.listId,
            taskId: args.taskId,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to remove task', { error });

    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: 'text',
            text: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        },
      ],
      isError: true,
    };
  }
}