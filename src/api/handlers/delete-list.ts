/**
 * MCP handler for deleting todo lists
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

const DeleteListSchema = z.object({
  listId: z.string().uuid(),
  permanent: z.boolean().optional().default(false),
});

export async function handleDeleteList(
  request: CallToolRequest,
  todoListManager: TaskListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing delete_list request', {
      params: request.params?.arguments,
    });

    // Validate input parameters
    const args = DeleteListSchema.parse(request.params?.arguments);

    // Delete the todo list
    const result = await todoListManager.deleteTaskList({
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
    // Use error formatting with listManagement configuration
    const formatError = createHandlerErrorFormatter(
      'delete_list',
      ERROR_CONFIGS.listManagement
    );
    return formatError(error, request.params?.arguments);
  }
}
