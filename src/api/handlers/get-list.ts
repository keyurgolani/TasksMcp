/**
 * MCP handler for retrieving todo lists
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
import type { TaskWithDependencies } from '../../shared/types/mcp-types.js';

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

    // Calculate dependency information for all tasks
    const dependencyResolver = new DependencyResolver();
    const readyItems = dependencyResolver.getReadyItems(todoList.items);
    const readyItemIds = new Set(readyItems.map(item => item.id));

    const tasksWithDependencies: TaskWithDependencies[] = todoList.items.map(
      task => {
        const isReady = readyItemIds.has(task.id);
        const blockedBy: string[] = [];

        // Calculate what this task is blocked by if it's not ready
        if (!isReady && task.dependencies.length > 0) {
          for (const depId of task.dependencies) {
            const depTask = todoList.items.find(item => item.id === depId);
            if (depTask && depTask.status !== 'completed') {
              blockedBy.push(depId);
            }
          }
        }

        const taskWithDeps: TaskWithDependencies = {
          id: task.id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          tags: task.tags,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
          estimatedDuration: task.estimatedDuration,
          dependencies: task.dependencies,
          isReady,
        };

        // Only include blockedBy if there are blocking dependencies
        if (blockedBy.length > 0) {
          taskWithDeps.blockedBy = blockedBy;
        }

        return taskWithDeps;
      }
    );

    dependencyResolver.cleanup();

    const response = {
      id: todoList.id,
      title: todoList.title,
      description: todoList.description,
      taskCount: todoList.totalItems,
      completedCount: todoList.completedItems,
      progress: todoList.progress,
      lastUpdated: todoList.updatedAt.toISOString(),
      projectTag: todoList.projectTag,
      tasks: tasksWithDependencies,
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
    // Use error formatting with listManagement configuration
    const formatError = createHandlerErrorFormatter(
      'get_list',
      ERROR_CONFIGS.listManagement
    );
    return formatError(error, request.params?.arguments);
  }
}
