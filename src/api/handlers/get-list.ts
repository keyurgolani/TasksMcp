/**
 * MCP handler for retrieving todo lists
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import { logger } from '../../shared/utils/logger.js';


const GetListSchema = z.object({
  listId: z.string().uuid(),
  includeCompleted: z.boolean().optional().default(true),
});

export async function handleGetList(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing get_list request', {
      params: request.params?.arguments,
    });

    const args = GetListSchema.parse(request.params?.arguments);
    const todoList = await todoListManager.getTodoList({
      listId: args.listId,
      includeCompleted: args.includeCompleted,
    });

    if (!todoList) {
      throw new Error(`Todo list not found: ${args.listId}`);
    }

    const response = {
      id: todoList.id,
      title: todoList.title,
      description: todoList.description,
      taskCount: todoList.totalItems,
      completedCount: todoList.completedItems,
      progress: todoList.progress,
      lastUpdated: todoList.updatedAt.toISOString(),
      projectTag: todoList.projectTag,
      tasks: todoList.items.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tags: task.tags,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        estimatedDuration: task.estimatedDuration,
      })),
    };

    logger.info('Todo list retrieved successfully', {
      id: todoList.id,
      title: todoList.title,
      taskCount: todoList.items.length,
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
    logger.error('Failed to get todo list', { error });

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