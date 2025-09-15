/**
 * MCP handler for updating basic task properties
 * 
 * Handles the update_task tool request to modify existing task properties
 * such as title, description, and estimated duration. Validates input
 * parameters and ensures at least one field is provided for update.
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import type { SimpleTaskResponse } from '../../shared/types/mcp-types.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Validation schema for update task request parameters
 * Ensures list and task IDs are valid UUIDs and validates optional update fields
 */
const UpdateTaskSchema = z.object({
  listId: z.string().uuid('List ID must be a valid UUID'),
  taskId: z.string().uuid('Task ID must be a valid UUID'),
  title: z.string().min(1, 'Title cannot be empty').max(200, 'Title too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  estimatedDuration: z.number().min(1, 'Duration must be positive').optional(),
});

/**
 * Handles MCP update_task tool requests
 * 
 * Updates an existing task's properties within a todo list. Validates that at least
 * one field is provided for update and returns the updated task information.
 * 
 * @param request - The MCP call tool request containing update parameters
 * @param todoListManager - The todo list manager instance for task operations
 * @returns Promise<CallToolResult> - MCP response with updated task details or error
 */
export async function handleUpdateTask(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing update_task request', {
      params: request.params?.arguments,
    });

    const args = UpdateTaskSchema.parse(request.params?.arguments);
    
    // Ensure at least one field is provided for update
    if (!args.title && !args.description && !args.estimatedDuration) {
      throw new Error('At least one field to update must be provided (title, description, or estimatedDuration)');
    }

    // Update the task with provided fields
    const result = await todoListManager.updateTodoList({
      listId: args.listId,
      action: 'update_item',
      itemId: args.taskId,
      itemData: {
        ...(args.title && { title: args.title }),
        ...(args.description && { description: args.description }),
        ...(args.estimatedDuration && { estimatedDuration: args.estimatedDuration }),
      },
    });

    const updatedTask = result.items.find(item => item.id === args.taskId);
    if (!updatedTask) {
      throw new Error('Task not found after update');
    }

    const response: SimpleTaskResponse = {
      id: updatedTask.id,
      title: updatedTask.title,
      description: updatedTask.description,
      status: updatedTask.status,
      priority: updatedTask.priority,
      tags: updatedTask.tags,
      createdAt: updatedTask.createdAt.toISOString(),
      updatedAt: updatedTask.updatedAt.toISOString(),
      estimatedDuration: updatedTask.estimatedDuration,
    };

    logger.info('Task updated successfully', {
      listId: args.listId,
      taskId: args.taskId,
      title: updatedTask.title,
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
    logger.error('Failed to update task', { error });

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