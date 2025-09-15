/**
 * MCP handler for listing all todo lists
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import type { SimpleListResponse } from '../../shared/types/mcp-types.js';
import { logger } from '../../shared/utils/logger.js';

const ListAllListsSchema = z.object({
  projectTag: z.string().max(50).optional(),
  includeArchived: z.boolean().optional().default(false),
  limit: z.number().min(1).max(100).optional().default(50),
});

export async function handleListAllLists(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing list_all_lists request', {
      params: request.params?.arguments,
    });

    const args = ListAllListsSchema.parse(request.params?.arguments || {});
    const listInput = {
      includeArchived: args.includeArchived,
      limit: args.limit,
      projectTag: args.projectTag,
      context: args.projectTag,
    };

    const result = await todoListManager.listTodoLists(listInput);

    const response: SimpleListResponse[] = result.map(list => {
      const simpleList: SimpleListResponse = {
        id: list.id,
        title: list.title,
        taskCount: list.totalItems,
        completedCount: list.completedItems,
        progress: list.progress,
        lastUpdated: list.lastUpdated.toISOString(),
      };

      if (list.projectTag) {
        simpleList.projectTag = list.projectTag;
      }

      return simpleList;
    });

    logger.info('Todo lists retrieved successfully', {
      count: response.length,
      projectTag: args.projectTag,
      includeArchived: args.includeArchived,
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
    logger.error('Failed to list todo lists', { error });

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