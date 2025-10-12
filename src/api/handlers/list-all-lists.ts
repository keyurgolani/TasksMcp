/**
 * MCP handler for listing all todo lists
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
import type { ListResponse } from '../../shared/types/mcp-types.js';

const ListAllListsSchema = z.object({
  projectTag: z.string().max(50).optional(),
  limit: z.number().min(1).max(100).optional().default(50),
});

export async function handleListAllLists(
  request: CallToolRequest,
  todoListManager: TaskListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing list_all_lists request', {
      params: request.params?.arguments,
    });

    const args = ListAllListsSchema.parse(request.params?.arguments || {});
    const listInput = {
      limit: args.limit,
      projectTag: args.projectTag,
      context: args.projectTag,
    };

    const result = await todoListManager.listTaskLists(listInput);

    const response: ListResponse[] = result.map(list => {
      const listResponse: ListResponse = {
        id: list.id,
        title: list.title,
        taskCount: list.totalItems,
        completedCount: list.completedItems,
        progress: list.progress,
        lastUpdated: list.lastUpdated.toISOString(),
      };

      if (list.projectTag) {
        listResponse.projectTag = list.projectTag;
      }

      return listResponse;
    });

    logger.info('Todo lists retrieved successfully', {
      count: response.length,
      projectTag: args.projectTag,
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
      'list_all_lists',
      ERROR_CONFIGS.listManagement
    );
    return formatError(error, request.params?.arguments);
  }
}
