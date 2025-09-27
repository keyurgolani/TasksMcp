/**
 * MCP handler for marking tasks as completed
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import type { TaskResponse, ExitCriteriaResponse } from '../../shared/types/mcp-types.js';
import { TaskStatus } from '../../shared/types/todo.js';
import { ExitCriteriaManager } from '../../domain/tasks/exit-criteria-manager.js';
import { logger } from '../../shared/utils/logger.js';
import { createHandlerErrorFormatter, ERROR_CONFIGS } from '../../shared/utils/handler-error-formatter.js';

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

    // First, get the current task to check exit criteria
    const currentList = await todoListManager.getTodoList({
      listId: args.listId,
      includeCompleted: true,
    });

    if (!currentList) {
      throw new Error(`Todo list not found: ${args.listId}`);
    }

    const task = currentList.items.find(item => item.id === args.taskId);
    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    // Check if all exit criteria are met
    const exitCriteriaManager = new ExitCriteriaManager();
    const completionReadiness = exitCriteriaManager.suggestTaskCompletionReadiness(task.exitCriteria);

    if (!completionReadiness.canComplete) {
      logger.warn('Attempted to complete task with unmet exit criteria', {
        listId: args.listId,
        taskId: args.taskId,
        unmetCriteria: completionReadiness.unmetCriteria.length,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Cannot complete task',
              reason: completionReadiness.reason,
              recommendation: completionReadiness.recommendation,
              unmetCriteria: completionReadiness.unmetCriteria.map(c => ({
                id: c.id,
                description: c.description,
              })),
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

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

    // Format exit criteria for response
    const exitCriteriaResponse: ExitCriteriaResponse[] = completedTask.exitCriteria.map(criteria => ({
      id: criteria.id,
      description: criteria.description,
      isMet: criteria.isMet,
      ...(criteria.metAt && { 
        metAt: criteria.metAt instanceof Date 
          ? criteria.metAt.toISOString() 
          : new Date(criteria.metAt).toISOString() 
      }),
      ...(criteria.notes && { notes: criteria.notes }),
      order: criteria.order,
    }));

    const response: TaskResponse = {
      id: completedTask.id,
      title: completedTask.title,
      description: completedTask.description,
      status: completedTask.status,
      priority: completedTask.priority,
      tags: completedTask.tags,
      createdAt: completedTask.createdAt.toISOString(),
      updatedAt: completedTask.updatedAt.toISOString(),
      ...(completedTask.completedAt && { completedAt: completedTask.completedAt.toISOString() }),
      estimatedDuration: completedTask.estimatedDuration,
      ...(exitCriteriaResponse.length > 0 && { exitCriteria: exitCriteriaResponse }),
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
    // Use error formatting with taskManagement configuration
    const formatError = createHandlerErrorFormatter('complete_task', ERROR_CONFIGS.taskManagement);
    return formatError(error, request.params?.arguments);
  }
}