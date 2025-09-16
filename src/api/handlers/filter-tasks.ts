/**
 * MCP handler for filtering tasks by criteria
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import type { SimpleSearchResponse, TaskWithDependencies } from '../../shared/types/mcp-types.js';
import { TaskStatus } from '../../shared/types/todo.js';
import { DependencyResolver } from '../../domain/tasks/dependency-manager.js';
import { logger } from '../../shared/utils/logger.js';
import { createHandlerErrorFormatter, ERROR_CONFIGS } from '../../shared/utils/handler-error-formatter.js';

const FilterTasksSchema = z.object({
  listId: z.string().uuid(),
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']).optional(),
  priority: z.number().min(1).max(5).optional(),
  tag: z.string().max(50).optional(),
  hasDependencies: z.boolean().optional(),
  isReady: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
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

    // Calculate dependency information for filtering
    const dependencyResolver = new DependencyResolver();
    const readyItems = dependencyResolver.getReadyItems(list.items);
    const readyItemIds = new Set(readyItems.map(item => item.id));

    let filteredTasks = list.items;

    // Apply existing filters
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

    // Apply dependency-based filters
    if (args.hasDependencies !== undefined) {
      filteredTasks = filteredTasks.filter(task => 
        args.hasDependencies ? task.dependencies.length > 0 : task.dependencies.length === 0
      );
    }
    if (args.isReady !== undefined) {
      filteredTasks = filteredTasks.filter(task => 
        args.isReady ? readyItemIds.has(task.id) : !readyItemIds.has(task.id)
      );
    }
    if (args.isBlocked !== undefined) {
      filteredTasks = filteredTasks.filter(task => {
        const isBlocked = task.dependencies.length > 0 && !readyItemIds.has(task.id);
        return args.isBlocked ? isBlocked : !isBlocked;
      });
    }

    // Create results with dependency information
    const results: TaskWithDependencies[] = filteredTasks.map(task => {
      const isReady = readyItemIds.has(task.id);
      const blockedBy: string[] = [];
      
      // Calculate what this task is blocked by if it's not ready
      if (!isReady && task.dependencies.length > 0) {
        for (const depId of task.dependencies) {
          const depTask = list.items.find(item => item.id === depId);
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
    });

    dependencyResolver.cleanup();

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
    // Use enhanced error formatting with searchDisplay configuration
    const formatError = createHandlerErrorFormatter('filter_tasks', ERROR_CONFIGS.searchDisplay);
    return formatError(error, request.params?.arguments);
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