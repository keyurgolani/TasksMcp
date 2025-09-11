/**
 * MCP handler for listing todo lists
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../types/mcp-types.js';
import type {
  TodoListManager,
  ListTodoListsInput,
} from '../core/todo-list-manager.js';
import { logger } from '../utils/logger.js';

const ListTodoListsSchema = z.object({
  context: z.string().optional(),
  status: z.enum(['active', 'completed', 'all']).optional(),
  includeArchived: z.boolean().optional(),
  limit: z.number().int().positive().max(1000).optional(),
  offset: z.number().int().min(0).optional(),
});

export async function handleListTodoLists(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing list_todo_lists request', {
      params: request.params?.arguments,
    });

    // Validate input parameters
    const args = ListTodoListsSchema.parse(request.params?.arguments ?? {});

    // List todo lists with filters
    const listInput: ListTodoListsInput = {
      includeArchived: args.includeArchived ?? false,
    };

    if (args.context !== undefined) {
      listInput.context = args.context;
    }
    if (args.status !== undefined) {
      listInput.status = args.status;
    }
    if (args.limit !== undefined) {
      listInput.limit = args.limit;
    }
    if (args.offset !== undefined) {
      listInput.offset = args.offset;
    }

    const result = await todoListManager.listTodoLists(listInput);

    logger.info('Todo lists retrieved successfully via MCP', {
      count: result.length,
      context: args.context,
      status: args.status,
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
    logger.error('Failed to list todo lists via MCP', { error });

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
