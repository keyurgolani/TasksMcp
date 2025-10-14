/**
 * Consolidated MCP handler for all task search, filter, and query operations
 * Replaces search_tasks, filter_tasks, and advanced_search_tasks with a unified interface
 */

import { z } from 'zod';

import { DependencyResolver } from '../../domain/tasks/dependency-manager.js';
import { TaskStatus, Priority } from '../../shared/types/task.js';
import {
  createHandlerErrorFormatter,
  ERROR_CONFIGS,
} from '../../shared/utils/handler-error-formatter.js';
import { logger } from '../../shared/utils/logger.js';

import type { TaskListManager } from '../../domain/lists/task-list-manager.js';
import type {
  CallToolRequest,
  CallToolResult,
} from '../../shared/types/mcp-types.js';
import type {
  SearchResponse,
  TaskWithDependencies,
} from '../../shared/types/mcp-types.js';
import type { Task } from '../../shared/types/task.js';

type TaskWithListInfo = Task & { listId: string; listTitle: string };

const SearchToolSchema = z.object({
  // Search parameters
  query: z.string().min(1).max(1000).optional(),
  listId: z.string().uuid().optional(),
  limit: z.number().min(1).max(500).default(50),

  // Filtering options
  status: z
    .array(
      z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled'])
    )
    .optional(),
  priority: z.array(z.number().min(1).max(5)).optional(),
  tags: z.array(z.string().max(50)).optional(),
  tagOperator: z.enum(['AND', 'OR']).default('AND'),

  // Dependency filtering
  hasDependencies: z.boolean().optional(),
  isReady: z.boolean().optional(),
  isBlocked: z.boolean().optional(),

  // Date range filtering
  dateRange: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
      field: z
        .enum(['createdAt', 'updatedAt', 'completedAt'])
        .default('createdAt'),
    })
    .optional(),

  // Duration filtering
  estimatedDuration: z
    .object({
      min: z.number().min(1).optional(),
      max: z.number().min(1).optional(),
    })
    .optional(),

  // Output options
  includeCompleted: z.boolean().default(true),
  includeDependencyInfo: z.boolean().default(false),
});

export async function handleSearchTool(
  request: CallToolRequest,
  taskListManager: TaskListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing search_tool request', {
      params: request.params?.arguments,
    });

    const args = SearchToolSchema.parse(request.params?.arguments);

    // Get tasks from specified list or all lists
    let allTasks: TaskWithListInfo[] = [];
    let listsSearched: string[] = [];

    if (args.listId) {
      const list = await taskListManager.getTaskList({
        listId: args.listId,
        includeCompleted: args.includeCompleted,
      });

      if (!list) {
        throw new Error(`Task list not found: ${args.listId}`);
      }

      allTasks = list.items.map(
        (task: Task): TaskWithListInfo => ({
          ...task,
          listId: list.id,
          listTitle: list.title,
        })
      );
      listsSearched = [args.listId];
    } else {
      const allLists = await taskListManager.listTaskLists({});

      for (const listSummary of allLists) {
        const fullList = await taskListManager.getTaskList({
          listId: listSummary.id,
          includeCompleted: args.includeCompleted,
        });

        if (fullList) {
          const tasksWithListInfo = fullList.items.map((task: Task) => ({
            ...task,
            listId: fullList.id,
            listTitle: fullList.title,
          }));
          allTasks.push(...tasksWithListInfo);
          listsSearched.push(listSummary.id);
        }
      }
    }

    // Apply all filters
    let filteredTasks = allTasks;

    // Text search filter
    if (args.query) {
      filteredTasks = applyTextSearch(filteredTasks, args.query);
    }

    // Status filter
    if (args.status && args.status.length > 0) {
      filteredTasks = filteredTasks.filter((task: TaskWithListInfo) =>
        args.status!.includes(task.status as TaskStatus)
      );
    }

    // Priority filter
    if (args.priority && args.priority.length > 0) {
      filteredTasks = filteredTasks.filter((task: TaskWithListInfo) =>
        args.priority!.includes(task.priority as Priority)
      );
    }

    // Tag filter
    if (args.tags && args.tags.length > 0) {
      filteredTasks = filteredTasks.filter((task: TaskWithListInfo) => {
        const taskTags = task.tags || [];
        if (args.tagOperator === 'AND') {
          return args.tags!.every(tag =>
            taskTags.some((taskTag: string) =>
              taskTag.toLowerCase().includes(tag.toLowerCase())
            )
          );
        } else {
          return args.tags!.some(tag =>
            taskTags.some((taskTag: string) =>
              taskTag.toLowerCase().includes(tag.toLowerCase())
            )
          );
        }
      });
    }

    // Date range filter
    if (args.dateRange) {
      filteredTasks = applyDateRangeFilter(filteredTasks, args.dateRange);
    }

    // Duration filter
    if (args.estimatedDuration) {
      filteredTasks = applyDurationFilter(
        filteredTasks,
        args.estimatedDuration
      );
    }

    // Dependency filters (if needed)
    let dependencyResolver: DependencyResolver | null = null;
    let readyItemIds: Set<string> | null = null;

    if (
      args.hasDependencies !== undefined ||
      args.isReady !== undefined ||
      args.isBlocked !== undefined ||
      args.includeDependencyInfo
    ) {
      dependencyResolver = new DependencyResolver();

      // Calculate ready items for dependency filtering
      if (args.listId) {
        const list = await taskListManager.getTaskList({
          listId: args.listId,
          includeCompleted: true,
        });
        if (list) {
          const readyItems = dependencyResolver.getReadyItems(list.items);
          readyItemIds = new Set(readyItems.map((item: Task) => item.id));
        }
      } else {
        // For cross-list searches, we need to be more careful about dependencies
        readyItemIds = new Set();
        for (const listId of listsSearched) {
          const list = await taskListManager.getTaskList({
            listId,
            includeCompleted: true,
          });
          if (list) {
            const readyItems = dependencyResolver.getReadyItems(list.items);
            readyItems.forEach(item => readyItemIds!.add(item.id));
          }
        }
      }

      // Apply dependency filters
      if (args.hasDependencies !== undefined) {
        filteredTasks = filteredTasks.filter((task: TaskWithListInfo) => {
          const deps = task.dependencies || [];
          return deps.length > 0 === args.hasDependencies;
        });
      }

      if (args.isReady !== undefined) {
        filteredTasks = filteredTasks.filter(
          (task: TaskWithListInfo) =>
            readyItemIds!.has(task.id) === args.isReady
        );
      }

      if (args.isBlocked !== undefined) {
        filteredTasks = filteredTasks.filter((task: TaskWithListInfo) => {
          const deps = task.dependencies || [];
          const isBlocked = deps.length > 0 && !readyItemIds!.has(task.id);
          return isBlocked === args.isBlocked;
        });
      }
    }

    // Apply limit
    const limitedTasks = filteredTasks.slice(0, args.limit);

    // Format results
    const results = limitedTasks.map((task: TaskWithListInfo) => {
      const baseTask = {
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        tags: task.tags,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        estimatedDuration: task.estimatedDuration || 0,
        listId: task.listId,
        listTitle: task.listTitle,
      };

      // Add dependency information if requested
      if (args.includeDependencyInfo && readyItemIds) {
        const taskDeps = task.dependencies || [];
        const taskWithDeps: TaskWithDependencies = {
          ...baseTask,
          dependencies: taskDeps,
          isReady: readyItemIds.has(task.id),
        };

        // Calculate blocked by information
        if (!readyItemIds.has(task.id) && taskDeps.length > 0) {
          const blockedBy: string[] = [];
          for (const depId of taskDeps) {
            const depTask = allTasks.find(t => t.id === depId);
            if (depTask && depTask.status !== 'completed') {
              blockedBy.push(depId);
            }
          }
          if (blockedBy.length > 0) {
            taskWithDeps.blockedBy = blockedBy;
          }
        }

        return taskWithDeps;
      }

      return baseTask;
    });

    // Cleanup dependency resolver
    if (dependencyResolver) {
      dependencyResolver.cleanup();
    }

    const response: SearchResponse = {
      results,
      totalCount: filteredTasks.length,
      hasMore: filteredTasks.length > args.limit,
    };

    logger.info('Search tool completed successfully', {
      query: args.query,
      listId: args.listId,
      totalResults: response.totalCount,
      returnedResults: response.results.length,
      filtersApplied: Object.keys(args).filter(
        key =>
          args[key as keyof typeof args] !== undefined &&
          !['limit', 'includeCompleted', 'includeDependencyInfo'].includes(key)
      ).length,
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
    const formatError = createHandlerErrorFormatter(
      'search_tool',
      ERROR_CONFIGS.searchDisplay
    );
    return formatError(error, request.params?.arguments);
  }
}

/**
 * Apply text search with relevance scoring
 */
function applyTextSearch(
  tasks: TaskWithListInfo[],
  query: string
): TaskWithListInfo[] {
  const queryLower = query.toLowerCase();
  const results: TaskWithListInfo[] = [];

  for (const task of tasks) {
    let hasMatch = false;

    const title = task.title;
    const description = task.description || '';
    const tags = task.tags || [];

    // Title search (highest weight)
    if (title && title.toLowerCase().includes(queryLower)) {
      hasMatch = true;
    }

    // Description search
    if (description && description.toLowerCase().includes(queryLower)) {
      hasMatch = true;
    }

    // Tag search
    for (const tag of tags) {
      if (tag.toLowerCase().includes(queryLower)) {
        hasMatch = true;
      }
    }

    if (hasMatch) {
      results.push(task);
    }
  }

  return results;
}

/**
 * Apply date range filtering
 */
function applyDateRangeFilter(
  tasks: TaskWithListInfo[],
  dateRange: {
    start?: string | undefined;
    end?: string | undefined;
    field: string;
  }
): TaskWithListInfo[] {
  const { start, end, field } = dateRange;

  return tasks.filter((task: TaskWithListInfo) => {
    const taskDate =
      field === 'createdAt'
        ? task.createdAt
        : field === 'updatedAt'
          ? task.updatedAt
          : field === 'completedAt'
            ? task.completedAt
            : null;
    if (!taskDate) return false;

    const date = new Date(taskDate as string | number | Date);
    if (start && date < new Date(start)) return false;
    if (end && date > new Date(end)) return false;
    return true;
  });
}

/**
 * Apply duration filtering
 */
function applyDurationFilter(
  tasks: TaskWithListInfo[],
  durationFilter: { min?: number | undefined; max?: number | undefined }
): TaskWithListInfo[] {
  const { min, max } = durationFilter;

  return tasks.filter((task: TaskWithListInfo) => {
    const duration = task.estimatedDuration;
    if (!duration) return false;
    if (min && duration < min) return false;
    if (max && duration > max) return false;
    return true;
  });
}
