/**
 * MCP handler for filtering tasks by criteria
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import type { SimpleSearchResponse, SimpleTaskResponse } from '../../shared/types/mcp-types.js';
import { TaskStatus } from '../../shared/types/todo.js';
import { logger } from '../../shared/utils/logger.js';

const FilterTasksSchema = z.object({
  listId: z.string().uuid(),
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']).optional(),
  priority: z.number().min(1).max(5).optional(),
  tag: z.string().max(50).optional(),
});

export async function handleFilterTasks(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing filter_tasks request', {
      params: request.params?.arguments,
    });

    const args = FilterTasksSchema.parse(request.params?.arguments);
    const list = await todoListManager.getTodoList({
      listId: args.listId,
      includeCompleted: true,
    });

    if (!list) {
      logger.debug('Todo list not found for filtering', { listId: args.listId });
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

    let filteredTasks = list.items;
    if (args.status) {
      const statusEnum = mapStringToTaskStatus(args.status);
      filteredTasks = filteredTasks.filter(task => task.status === statusEnum);
    }
    if (args.priority !== undefined) {
      filteredTasks = filteredTasks.filter(task => task.priority === args.priority);
    }
    if (args.tag) {
      filteredTasks = filteredTasks.filter(task => 
        task.tags.some(tag => tag.toLowerCase().includes(args.tag!.toLowerCase()))
      );
    }

    const results: SimpleTaskResponse[] = filteredTasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      tags: task.tags,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      estimatedDuration: task.estimatedDuration,
    }));

    const response: SimpleSearchResponse = {
      results,
      totalCount: results.length,
      hasMore: false,
    };

    logger.info('Task filtering completed successfully', {
      listId: args.listId,
      filters: {
        status: args.status,
        priority: args.priority,
        tag: args.tag,
      },
      totalResults: results.length,
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
    logger.error('Failed to filter tasks', { error });

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

/**
 * Map string status to TaskStatus enum
 */
function mapStringToTaskStatus(status: string): TaskStatus {
  switch (status) {
    case 'pending':
      return TaskStatus.PENDING;
    case 'in_progress':
      return TaskStatus.IN_PROGRESS;
    case 'completed':
      return TaskStatus.COMPLETED;
    case 'blocked':
      return TaskStatus.BLOCKED;
    case 'cancelled':
      return TaskStatus.CANCELLED;
    default:
      return TaskStatus.PENDING;
  }
}