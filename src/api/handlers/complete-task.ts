/**
 * MCP handler for marking tasks as completed
 */

import { z } from 'zod';

import { ExitCriteriaManager } from '../../domain/tasks/exit-criteria-manager.js';
import { TaskStatus, type ExitCriteria } from '../../shared/types/task.js';
import {
  createHandlerErrorFormatter,
  ERROR_CONFIGS,
} from '../../shared/utils/handler-error-formatter.js';
import { LOGGER } from '../../shared/utils/logger.js';

import type { TaskListManager } from '../../domain/lists/task-list-manager.js';
import type {
  CallToolRequest,
  CallToolResult,
} from '../../shared/types/mcp-types.js';
import type {
  TaskResponse,
  ExitCriteriaResponse,
} from '../../shared/types/mcp-types.js';
import type { Task } from '../../shared/types/task.js';

const CompleteTaskSchema = z.object({
  listId: z.string().uuid(),
  taskId: z.string().uuid(),
});

export async function handleCompleteTask(
  request: CallToolRequest,
  taskListManager: TaskListManager
): Promise<CallToolResult> {
  try {
    LOGGER.debug('Processing complete_task request', {
      params: request.params?.arguments,
    });

    const args = CompleteTaskSchema.parse(request.params?.arguments);

    // First, get the current task to check exit criteria
    const currentList = await taskListManager.getTaskList({
      listId: args.listId,
      includeCompleted: true,
    });

    if (!currentList) {
      throw new Error(`Task list not found: ${args.listId}`);
    }

    const task = currentList.items.find(
      (item: Task) => item.id === args.taskId
    );
    if (!task) {
      throw new Error(`Task not found: ${args.taskId}`);
    }

    // Check if all exit criteria are met
    const exitCriteriaManager = new ExitCriteriaManager();
    const canComplete = exitCriteriaManager.areAllCriteriaMet(
      task.exitCriteria
    );
    const unmetCriteria = exitCriteriaManager.getUnmetCriteria(
      task.exitCriteria
    );

    // Task completion readiness check
    if (!canComplete) {
      LOGGER.warn('Attempted to complete task with unmet exit criteria', {
        listId: args.listId,
        taskId: args.taskId,
        unmetCriteria: unmetCriteria.length,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Cannot complete task',
                reason: `${unmetCriteria.length} exit criteria still need to be met`,
                recommendation:
                  'Complete all exit criteria before marking task as done',
                unmetCriteria: unmetCriteria.map((c: ExitCriteria) => ({
                  id: c.id,
                  description: c.description,
                })),
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    const result = await taskListManager.updateTaskList({
      listId: args.listId,
      action: 'update_status',
      itemId: args.taskId,
      itemData: {
        status: TaskStatus.COMPLETED,
      },
    });

    const completedTask = result.items.find(
      (item: Task) => item.id === args.taskId
    );
    if (!completedTask) {
      throw new Error('Task not found after completion');
    }

    if (completedTask.status !== TaskStatus.COMPLETED) {
      throw new Error('Task was not successfully marked as completed');
    }

    // Format exit criteria for response
    const exitCriteriaResponse: ExitCriteriaResponse[] =
      completedTask.exitCriteria.map((criteria: ExitCriteria) => ({
        id: criteria.id,
        description: criteria.description,
        isMet: criteria.isMet,
        ...(criteria.metAt && {
          metAt:
            criteria.metAt instanceof Date
              ? criteria.metAt.toISOString()
              : new Date(criteria.metAt).toISOString(),
        }),
        ...(criteria.notes && { notes: criteria.notes }),
      }));

    const response = {
      ...({
        id: completedTask.id,
        title: completedTask.title,
        description: completedTask.description,
        status: completedTask.status,
        priority: completedTask.priority,
        tags: completedTask.tags,
        createdAt: completedTask.createdAt.toISOString(),
        updatedAt: completedTask.updatedAt.toISOString(),
        ...(completedTask.completedAt && {
          completedAt: completedTask.completedAt.toISOString(),
        }),
        estimatedDuration: completedTask.estimatedDuration,
        ...(exitCriteriaResponse.length > 0 && {
          exitCriteria: exitCriteriaResponse,
        }),
      } as TaskResponse),
      _methodologyGuidance: {
        success:
          '✅ Task completed successfully! All exit criteria were verified (Persist Until Complete methodology)',
        reflection: [
          '📝 Consider using update_task to document key learnings and outcomes',
          "🔍 Use get_ready_tasks to find what's now available to work on",
          '🎯 Reflect on what worked well and what could be changed for future tasks',
        ],
        nextSteps: [
          'Document any insights gained during execution',
          'Check if completing this task unblocked other work',
          'Plan next actions based on newly available ready tasks',
        ],
      },
    };

    LOGGER.info('Task completed successfully', {
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
    const formatError = createHandlerErrorFormatter(
      'complete_task',
      ERROR_CONFIGS.taskManagement
    );
    return formatError(error, request.params?.arguments);
  }
}
