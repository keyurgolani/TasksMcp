/**
 * MCP handler for adding tasks to task lists
 * Handles the add_task tool request with validation and error handling
 */

import { z } from 'zod';

import { DependencyResolver } from '../../domain/tasks/dependency-manager.js';
import { ExitCriteriaManager } from '../../domain/tasks/exit-criteria-manager.js';
import { Priority } from '../../shared/types/task.js';
import {
  createHandlerErrorFormatter,
  ERROR_CONFIGS,
} from '../../shared/utils/handler-error-formatter.js';
import { logger } from '../../shared/utils/logger.js';

import type { TaskListManager } from '../../domain/lists/task-list-manager.js';
import type {
  TaskWithDependencies,
  ExitCriteriaResponse,
} from '../../shared/types/mcp-types.js';
import type {
  CallToolRequest,
  CallToolResult,
} from '../../shared/types/mcp-types.js';
import type { Task } from '../../shared/types/task.js';

/**
 * Validation schema for add task request parameters
 * Validates list ID, task title, and optional fields like priority, tags, duration, dependencies, and agent prompt template
 */
const AddTaskSchema = z.object({
  listId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  priority: z.number().min(1).max(5).optional().default(3),
  tags: z.array(z.string().max(50)).max(10).optional().default([]),
  estimatedDuration: z.number().min(1).optional(),
  dependencies: z.array(z.string().uuid()).max(10).optional().default([]),
  exitCriteria: z
    .array(z.string().min(1).max(500))
    .max(20)
    .optional()
    .default([]),
  agentPromptTemplate: z.string().max(10000).optional(),
});

/**
 * Handles MCP add_task tool requests
 * Adds a new task to an existing task list with specified properties
 *
 * @param request - The MCP call tool request containing task creation parameters
 * @param taskListManager - The task list manager instance for task operations
 * @returns Promise<CallToolResult> - MCP response with created task details or error
 */
export async function handleAddTask(
  request: CallToolRequest,
  taskListManager: TaskListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing add_task request', {
      params: request.params?.arguments,
    });

    const args = AddTaskSchema.parse(request.params?.arguments);
    const priority = args.priority as Priority;

    // Validate dependencies if provided
    if (args.dependencies.length > 0) {
      const existingList = await taskListManager.getTaskList({
        listId: args.listId,
        includeCompleted: true,
      });

      if (!existingList) {
        throw new Error(`Task list not found: ${args.listId}`);
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

    const result = await taskListManager.updateTaskList({
      listId: args.listId,
      action: 'add_item',
      itemData: {
        title: args.title,
        ...(args.description && { description: args.description }),
        priority,
        ...(args.tags && { tags: args.tags }),
        ...(args.estimatedDuration && {
          estimatedDuration: args.estimatedDuration,
        }),
        ...(args.dependencies.length > 0 && {
          dependencies: args.dependencies,
        }),
        ...(args.exitCriteria.length > 0 && {
          exitCriteria: args.exitCriteria,
        }),
        ...(args.agentPromptTemplate && {
          agentPromptTemplate: args.agentPromptTemplate,
        }),
      },
    });

    const newTask = result.items[result.items.length - 1];
    if (!newTask) {
      throw new Error('Failed to add task - task not found in result');
    }

    // Calculate dependency information for response
    const dependencyResolver = new DependencyResolver();
    const readyItems = dependencyResolver.getReadyItems(result.items);
    const isReady = readyItems.some((item: Task) => item.id === newTask.id);

    const blockedBy: string[] = [];
    if (!isReady && newTask.dependencies.length > 0) {
      for (const depId of newTask.dependencies) {
        const depTask = result.items.find((item: Task) => item.id === depId);
        if (depTask && depTask.status !== 'completed') {
          blockedBy.push(depId);
        }
      }
    }

    // Calculate exit criteria information
    const exitCriteriaManager = new ExitCriteriaManager();
    const exitCriteriaProgress = exitCriteriaManager.calculateCriteriaProgress(
      newTask.exitCriteria
    );
    const canComplete = exitCriteriaManager.areAllCriteriaMet(
      newTask.exitCriteria
    );

    // Format exit criteria for response
    const exitCriteriaResponse: ExitCriteriaResponse[] =
      newTask.exitCriteria.map(criteria => ({
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
      canComplete,
      exitCriteriaProgress,
      ...(exitCriteriaResponse.length > 0 && {
        exitCriteria: exitCriteriaResponse,
      }),
    };

    dependencyResolver.cleanup();

    logger.info('Task added successfully', {
      listId: args.listId,
      taskId: newTask.id,
      title: newTask.title,
      dependencies: newTask.dependencies,
      isReady,
    });

    // Add methodology guidance to response
    const responseWithGuidance = {
      ...response,
      _methodologyGuidance: {
        nextSteps: [
          '📝 Use update_task regularly during execution to track progress and document discoveries',
          '🎯 Use update_exit_criteria to track completion of individual requirements',
          '⚠️ Only use complete_task when ALL exit criteria are verified (Persist Until Complete)',
          '🔍 Use search_tool to research similar completed tasks for context and learnings',
        ],
        bestPractice:
          'Follow Plan and Reflect methodology: plan thoroughly, execute with updates, reflect on outcomes',
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(responseWithGuidance, null, 2),
        },
      ],
    };
  } catch (error) {
    // Use error formatting with task management configuration
    const formatError = createHandlerErrorFormatter(
      'add_task',
      ERROR_CONFIGS.taskManagement
    );
    return formatError(error, request.params?.arguments);
  }
}
