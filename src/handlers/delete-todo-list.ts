/**
 * MCP handler for deleting todo lists
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../types/mcp-types.js';
import type { TodoListManager } from '../core/todo-list-manager.js';
import { logger } from '../utils/logger.js';

const DeleteTodoListSchema = z.object({
  listId: z.string().uuid(),
  permanent: z.boolean().optional(),
});

export async function handleDeleteTodoList(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing delete_todo_list request', {
      params: request.params?.arguments,
    });

    // Validate input parameters
    const args = DeleteTodoListSchema.parse(request.params?.arguments);

    // Delete the todo list
    const result = await todoListManager.deleteTodoList({
      listId: args.listId,
      permanent: args.permanent ?? false,
    });

    logger.info('Todo list deleted successfully via MCP', {
      id: args.listId,
      permanent: args.permanent,
      operation: result.operation,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error('Failed to delete todo list via MCP', { error });

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
