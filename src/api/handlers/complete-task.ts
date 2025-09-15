/**
 * MCP handler for marking tasks as completed
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import type { SimpleTaskResponse } from '../../shared/types/mcp-types.js';
import { TaskStatus } from '../../shared/types/todo.js';
import { logger } from '../../shared/utils/logger.js';

const CompleteTaskSchema = z.object({
  listId: z.string().uuid(),
  taskId: z.string().uuid(),
});

export async function handleCompleteTask(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing complete_task request', {
      params: request.params?.arguments,
    });

    const args = CompleteTaskSchema.parse(request.params?.arguments);
    const result = await todoListManager.updateTodoList({
      listId: args.listId,
      action: 'update_status',
      itemId: args.taskId,
      itemData: {
        status: TaskStatus.COMPLETED,
      },
    });

    const completedTask = result.items.find(item => item.id === args.taskId);
    if (!completedTask) {
      throw new Error('Task not found after completion');
    }

    if (completedTask.status !== TaskStatus.COMPLETED) {
      throw new Error('Task was not successfully marked as completed');
    }

    const response: SimpleTaskResponse = {
      id: completedTask.id,
      title: completedTask.title,
      description: completedTask.description,
      status: completedTask.status,
      priority: completedTask.priority,
      tags: completedTask.tags,
      createdAt: completedTask.createdAt.toISOString(),
      updatedAt: completedTask.updatedAt.toISOString(),
      estimatedDuration: completedTask.estimatedDuration,
    };

    logger.info('Task completed successfully', {
      listId: args.listId,
      taskId: args.taskId,
      title: completedTask.title,
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
    logger.error('Failed to complete task', { error });

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