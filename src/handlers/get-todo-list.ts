/**
 * MCP handler for retrieving todo lists
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../types/mcp-types.js';
import type { TodoListManager } from '../core/todo-list-manager.js';
import { TaskStatus, Priority } from '../types/todo.js';
import { logger } from '../utils/logger.js';

const GetTodoListSchema = z.object({
  listId: z.string().uuid(),
  includeCompleted: z.boolean().optional(),
  filters: z
    .object({
      status: z
        .union([z.nativeEnum(TaskStatus), z.array(z.nativeEnum(TaskStatus))])
        .optional(),
      priority: z
        .union([z.nativeEnum(Priority), z.array(z.nativeEnum(Priority))])
        .optional(),
      tags: z.array(z.string()).optional(),
      assignee: z.string().optional(),
      dueDateBefore: z
        .string()
        .datetime()
        .transform(str => new Date(str))
        .optional(),
      dueDateAfter: z
        .string()
        .datetime()
        .transform(str => new Date(str))
        .optional(),
      createdBefore: z
        .string()
        .datetime()
        .transform(str => new Date(str))
        .optional(),
      createdAfter: z
        .string()
        .datetime()
        .transform(str => new Date(str))
        .optional(),
      hasDescription: z.boolean().optional(),
      hasDependencies: z.boolean().optional(),
      estimatedDurationMin: z.number().min(0).optional(),
      estimatedDurationMax: z.number().min(0).optional(),
      searchText: z.string().optional(),
    })
    .optional(),
  sorting: z
    .object({
      field: z.enum([
        'title',
        'status',
        'priority',
        'createdAt',
        'updatedAt',
        'completedAt',
        'estimatedDuration',
      ]),
      direction: z.enum(['asc', 'desc']),
    })
    .optional(),
  pagination: z
    .object({
      limit: z.number().min(1).max(1000).optional(),
      offset: z.number().min(0).optional(),
    })
    .optional(),
});

export async function handleGetTodoList(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing get_todo_list request', {
      params: request.params?.arguments,
    });

    // Validate input parameters
    const args = GetTodoListSchema.parse(request.params?.arguments);

    // Retrieve the todo list with advanced filtering
    const result = await todoListManager.getTodoList({
      listId: args.listId,
      includeCompleted: args.includeCompleted,
      filters: args.filters,
      sorting: args.sorting,
      pagination: args.pagination,
    });

    if (!result) {
      logger.debug('Todo list not found via MCP', { listId: args.listId });
      return {
        content: [
          {
            type: 'text',
            text: `Todo list not found: ${args.listId}`,
          },
        ],
        isError: true,
      };
    }

    logger.info('Todo list retrieved successfully via MCP', {
      id: result.id,
      title: result.title,
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
    logger.error('Failed to retrieve todo list via MCP', { error });

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
