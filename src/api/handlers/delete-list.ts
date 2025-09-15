/**
 * MCP handler for deleting todo lists
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import { logger } from '../../shared/utils/logger.js';

const DeleteListSchema = z.object({
  listId: z.string().uuid(),
  permanent: z.boolean().optional().default(false),
});

export async function handleDeleteList(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing delete_list request', {
      params: request.params?.arguments,
    });

    // Validate input parameters
    const args = DeleteListSchema.parse(request.params?.arguments);

    // Delete the todo list
    const result = await todoListManager.deleteTodoList({
      listId: args.listId,
      permanent: args.permanent,
    });

    // Format response
    const response = {
      success: result.success,
      operation: result.operation,
      message: result.message,
      listId: args.listId,
    };

    logger.info('Todo list deleted successfully', {
      id: args.listId,
      permanent: args.permanent,
      operation: result.operation,
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
    logger.error('Failed to delete todo list', { error });

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