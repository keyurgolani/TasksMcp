/**
 * MCP handler for setting task dependencies
 * Handles the set_task_dependencies tool request with comprehensive validation and error handling
 */

import { z } from 'zod';

import { DependencyResolver } from '../../domain/tasks/dependency-manager.js';
import {
  createHandlerErrorFormatter,
  ERROR_CONFIGS,
} from '../../shared/utils/handler-error-formatter.js';
import { logger } from '../../shared/utils/logger.js';

import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import type {
  CallToolRequest,
  CallToolResult,
} from '../../shared/types/mcp-types.js';
import type { TaskResponse } from '../../shared/types/mcp-types.js';

/**
 * Validation schema for set task dependencies request parameters
 * Validates list ID, task ID, and dependency IDs array
 */
const SetTaskDependenciesSchema = z.object({
  listId: z.string().uuid(),
  taskId: z.string().uuid(),
  dependencyIds: z.array(z.string().uuid()).min(0).max(50), // Allow empty arrays to remove all dependencies
});

/**
 * Handles MCP set_task_dependencies tool requests
 * Sets all dependencies for a task, replacing any existing dependencies
 *
 * @param request - The MCP call tool request containing dependency parameters
 * @param todoListManager - The todo list manager instance for task operations
 * @returns Promise<CallToolResult> - MCP response with updated task details or error
 */
export async function handleSetTaskDependencies(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  const dependencyResolver = new DependencyResolver();

  try {
    logger.debug('Processing set_task_dependencies request', {
      params: request.params?.arguments,
    });

    const args = SetTaskDependenciesSchema.parse(request.params?.arguments);

    // Get the current list to validate task and dependencies exist
    const currentList = await todoListManager.getTodoList({
      listId: args.listId,
    });
    if (!currentList) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Todo list with ID ${args.listId} not found`,
          },
        ],
        isError: true,
      };
    }

    // Find the target task
    const targetTask = currentList.items.find(item => item.id === args.taskId);
    if (!targetTask) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Task with ID ${args.taskId} not found in list ${args.listId}`,
          },
        ],
        isError: true,
      };
    }

    // Validate dependencies using the DependencyResolver
    const validationResult = dependencyResolver.validateDependencies(
      args.taskId,
      args.dependencyIds,
      currentList.items
    );

    if (!validationResult.isValid) {
      const errorMessage = validationResult.errors.join('; ');
      logger.warn('Dependency validation failed', {
        taskId: args.taskId,
        dependencyIds: args.dependencyIds,
        errors: validationResult.errors,
      });

      return {
        content: [
          {
            type: 'text',
            text: `❌ ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      logger.warn('Dependency validation warnings', {
        taskId: args.taskId,
        warnings: validationResult.warnings,
      });
    }

    // Update the task with new dependencies
    const result = await todoListManager.updateTodoList({
      listId: args.listId,
      action: 'update_item',
      itemId: args.taskId,
      itemData: {
        dependencies: args.dependencyIds,
      },
    });

    // Find the updated task
    const updatedTask = result.items.find(item => item.id === args.taskId);
    if (!updatedTask) {
      throw new Error(
        'Failed to update task dependencies - task not found in result'
      );
    }

    const response: TaskResponse = {
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

    logger.info('Task dependencies updated successfully', {
      listId: args.listId,
      taskId: args.taskId,
      dependencyCount: args.dependencyIds.length,
      warnings: validationResult.warnings,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              ...response,
              dependencies: updatedTask.dependencies,
              message: `Dependencies updated successfully${validationResult.warnings.length > 0 ? ` (${validationResult.warnings.length} warnings)` : ''}`,
              warnings: validationResult.warnings,
            },
            null,
            2
          ),
        },
      ],
    };
  } catch (error) {
    // Use error formatting with taskManagement configuration
    const formatError = createHandlerErrorFormatter(
      'set_task_dependencies',
      ERROR_CONFIGS.taskManagement
    );
    return formatError(error, request.params?.arguments);
  } finally {
    // Clean up the dependency resolver
    dependencyResolver.cleanup();
  }
}
