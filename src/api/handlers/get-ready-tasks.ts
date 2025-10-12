/**
 * MCP handler for getting ready tasks
 */

import { z } from 'zod';

import { DependencyResolver } from '../../domain/tasks/dependency-manager.js';
import { TaskStatus } from '../../shared/types/todo.js';
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

const GetReadyTasksSchema = z.object({
  listId: z.string().uuid(),
  limit: z.number().min(1).max(50).optional().default(20),
});

export async function handleGetReadyTasks(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing get_ready_tasks request', {
      params: request.params?.arguments,
    });

    const args = GetReadyTasksSchema.parse(request.params?.arguments);

    // Get the todo list
    const todoList = await todoListManager.getTodoList({
      listId: args.listId,
      includeCompleted: true, // We need all tasks to properly calculate dependencies
    });

    if (!todoList) {
      throw new Error(`Todo list not found: ${args.listId}`);
    }

    // Use DependencyResolver to get ready tasks
    const dependencyResolver = new DependencyResolver();
    const allReadyTasks = dependencyResolver.getReadyItems(todoList.items);

    // Filter out cancelled tasks (DependencyResolver doesn't filter these)
    const readyTasks = allReadyTasks.filter(
      task => task.status !== TaskStatus.CANCELLED
    );

    // Sort ready tasks by priority (highest first), then by creation date (oldest first)
    const sortedReadyTasks = readyTasks
      .sort((a, b) => {
        // First by priority (higher priority first)
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        // Then by creation date (older tasks first)
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .slice(0, args.limit); // Apply limit

    const response = {
      listId: args.listId,
      readyTasks: sortedReadyTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tags: task.tags,
        estimatedDuration: task.estimatedDuration,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      })),
      totalReady: readyTasks.length, // Total before limit applied

      summary: {
        totalTasks: todoList.items.length,
        completedTasks: todoList.items.filter(
          task => task.status === TaskStatus.COMPLETED
        ).length,
        readyTasks: readyTasks.length,
        blockedTasks: todoList.items.filter(
          task =>
            task.status !== TaskStatus.COMPLETED &&
            task.status !== TaskStatus.CANCELLED &&
            task.dependencies.length > 0 &&
            !readyTasks.some(ready => ready.id === task.id)
        ).length,
      },
      _methodologyGuidance: {
        dailyWorkflow: [
          '🔍 RESEARCH FIRST: Use get_list to understand task context before starting',
          '📋 PLAN: Review task description and action plan thoroughly',
          '🔄 TRACK PROGRESS: Use update_task regularly to document progress and discoveries',
          '✅ VERIFY COMPLETION: Check all exit criteria before using complete_task',
        ],
        bestPractice:
          'Start each work session with get_ready_tasks to plan your day (Plan and Reflect methodology)',
        tip:
          sortedReadyTasks.length > 0
            ? 'Focus on one task at a time for best results. Use search_tool to research similar completed work for context.'
            : "No ready tasks available. Use analyze_task_dependencies to understand what's blocking progress.",
      },
    };

    // Clean up dependency resolver
    dependencyResolver.cleanup();

    logger.info('Ready tasks retrieved successfully', {
      listId: args.listId,
      totalReady: readyTasks.length,
      returned: sortedReadyTasks.length,
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
      'get_ready_tasks',
      ERROR_CONFIGS.taskManagement
    );
    return formatError(error, request.params?.arguments);
  }
}
