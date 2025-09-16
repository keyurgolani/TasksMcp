/**
 * MCP handler for adding tasks to todo lists
 * Handles the add_task tool request with comprehensive validation and error handling
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import type { TaskWithDependencies } from '../../shared/types/mcp-types.js';
import { Priority } from '../../shared/types/todo.js';
import { DependencyResolver } from '../../domain/tasks/dependency-manager.js';
import { logger } from '../../shared/utils/logger.js';
import { createHandlerErrorFormatter, ERROR_CONFIGS } from '../../shared/utils/handler-error-formatter.js';

/**
 * Validation schema for add task request parameters
 * Validates list ID, task title, and optional fields like priority, tags, duration, and dependencies
 */
const AddTaskSchema = z.object({
  listId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priority: z.number().min(1).max(5).optional().default(3),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
  estimatedDuration: z.number().min(1).optional(),
  dependencies: z.array(z.string().uuid()).max(10).optional().default([]),
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

    // Validate dependencies if provided
    if (args.dependencies.length > 0) {
      const existingList = await todoListManager.getTodoList({
        listId: args.listId,
        includeCompleted: true,
      });

      if (!existingList) {
        throw new Error(`Todo list not found: ${args.listId}`);
      }

      const dependencyResolver = new DependencyResolver();
      
      // Create a temporary task ID for validation (we'll get the real ID after creation)
      const tempTaskId = 'temp-validation-id';
      const validationResult = dependencyResolver.validateDependencies(
        tempTaskId,
        args.dependencies,
        existingList.items
      );

      if (!validationResult.isValid) {
        logger.warn('Dependency validation failed for new task', {
          listId: args.listId,
          dependencies: args.dependencies,
          errors: validationResult.errors,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Dependency validation failed: ${validationResult.errors.join(', ')}`,
            },
          ],
          isError: true,
        };
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        logger.warn('Dependency validation warnings for new task', {
          listId: args.listId,
          dependencies: args.dependencies,
          warnings: validationResult.warnings,
        });
      }

      dependencyResolver.cleanup();
    }

    const result = await todoListManager.updateTodoList({
      listId: args.listId,
      action: 'add_item',
      itemData: {
        title: args.title,
        ...(args.description && { description: args.description }),
        priority,
        ...(args.tags && { tags: args.tags }),
        ...(args.estimatedDuration && { estimatedDuration: args.estimatedDuration }),
        ...(args.dependencies.length > 0 && { dependencies: args.dependencies }),
      },
    });

    const newTask = result.items[result.items.length - 1];
    if (!newTask) {
      throw new Error('Failed to add task - task not found in result');
    }

    // Calculate dependency information for response
    const dependencyResolver = new DependencyResolver();
    const readyItems = dependencyResolver.getReadyItems(result.items);
    const isReady = readyItems.some(item => item.id === newTask.id);
    
    const blockedBy: string[] = [];
    if (!isReady && newTask.dependencies.length > 0) {
      for (const depId of newTask.dependencies) {
        const depTask = result.items.find(item => item.id === depId);
        if (depTask && depTask.status !== 'completed') {
          blockedBy.push(depId);
        }
      }
    }

    const response: TaskWithDependencies = {
      id: newTask.id,
      title: newTask.title,
      description: newTask.description,
      status: newTask.status,
      priority: newTask.priority,
      tags: newTask.tags,
      createdAt: newTask.createdAt.toISOString(),
      updatedAt: newTask.updatedAt.toISOString(),
      estimatedDuration: newTask.estimatedDuration,
      dependencies: newTask.dependencies,
      isReady,
      ...(blockedBy.length > 0 && { blockedBy }),
    };

    dependencyResolver.cleanup();

    logger.info('Task added successfully', {
      listId: args.listId,
      taskId: newTask.id,
      title: newTask.title,
      dependencies: newTask.dependencies,
      isReady,
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
    // Use enhanced error formatting with task management configuration
    const formatError = createHandlerErrorFormatter('add_task', ERROR_CONFIGS.taskManagement);
    return formatError(error, request.params?.arguments);
  }
}