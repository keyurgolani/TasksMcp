/**
 * MCP handler for adding tasks to todo lists
 * Handles the add_task tool request with comprehensive validation and error handling
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import type { SimpleTaskResponse } from '../../shared/types/mcp-types.js';
import { Priority } from '../../shared/types/todo.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Validation schema for add task request parameters
 * Validates list ID, task title, and optional fields like priority, tags, and duration
 */
const AddTaskSchema = z.object({
  listId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priority: z.number().min(1).max(5).optional().default(3),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
  estimatedDuration: z.number().min(1).optional(),
});

/**
 * Handles MCP add_task tool requests
 * Adds a new task to an existing todo list with specified properties
 * 
 * @param request - The MCP call tool request containing task creation parameters
 * @param todoListManager - The todo list manager instance for task operations
 * @returns Promise<CallToolResult> - MCP response with created task details or error
 */
export async function handleAddTask(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing add_task request', {
      params: request.params?.arguments,
    });

    const args = AddTaskSchema.parse(request.params?.arguments);
    const priority = args.priority as Priority;
    const result = await todoListManager.updateTodoList({
      listId: args.listId,
      action: 'add_item',
      itemData: {
        title: args.title,
        ...(args.description && { description: args.description }),
        priority,
        ...(args.tags && { tags: args.tags }),
        ...(args.estimatedDuration && { estimatedDuration: args.estimatedDuration }),
      },
    });

    const newTask = result.items[result.items.length - 1];
    if (!newTask) {
      throw new Error('Failed to add task - task not found in result');
    }

    const response: SimpleTaskResponse = {
      id: newTask.id,
      title: newTask.title,
      description: newTask.description,
      status: newTask.status,
      priority: newTask.priority,
      tags: newTask.tags,
      createdAt: newTask.createdAt.toISOString(),
      updatedAt: newTask.updatedAt.toISOString(),
      estimatedDuration: newTask.estimatedDuration,
    };

    logger.info('Task added successfully', {
      listId: args.listId,
      taskId: newTask.id,
      title: newTask.title,
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
    logger.error('Failed to add task', { error });

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