/**
 * Consolidated MCP handler for all task search, filter, and query operations
 * Replaces search_tasks, filter_tasks, and advanced_search_tasks with a unified interface
 */

import { z } from 'zod';

import { DependencyResolver } from '../../domain/tasks/dependency-manager.js';
import { TaskStatus, Priority } from '../../shared/types/todo.js';
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
import type {
  SearchResponse,
  TaskWithDependencies,
} from '../../shared/types/mcp-types.js';

const SearchToolSchema = z.object({
  // Basic search parameters
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

  // Sorting options
  sortBy: z
    .enum(['relevance', 'priority', 'createdAt', 'updatedAt', 'title'])
    .default('relevance'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),

  // Output options
  includeCompleted: z.boolean().default(true),
  includeDependencyInfo: z.boolean().default(false),
});

export async function handleSearchTool(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing search_tool request', {
      params: request.params?.arguments,
    });

    const args = SearchToolSchema.parse(request.params?.arguments);

    // Get tasks from specified list or all lists
    let allTasks: Record<string, unknown>[] = [];
    let listsSearched: string[] = [];

    if (args.listId) {
      const list = await todoListManager.getTodoList({
        listId: args.listId,
        includeCompleted: args.includeCompleted,
      });

      if (!list) {
        throw new Error(`Todo list not found: ${args.listId}`);
      }

      allTasks = list.items.map(task => ({
        ...task,
        listId: list.id,
        listTitle: list.title,
      }));
      listsSearched = [args.listId];
    } else {
      const allLists = await todoListManager.listTodoLists({
        includeArchived: false,
      });

      for (const listSummary of allLists) {
        const fullList = await todoListManager.getTodoList({
          listId: listSummary.id,
          includeCompleted: args.includeCompleted,
        });

        if (fullList) {
          const tasksWithListInfo = fullList.items.map(task => ({
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
      filteredTasks = filteredTasks.filter(task =>
        args.status!.includes(task['status'] as TaskStatus)
      );
    }

    // Priority filter
    if (args.priority && args.priority.length > 0) {
      filteredTasks = filteredTasks.filter(task =>
        args.priority!.includes(task['priority'] as Priority)
      );
    }

    // Tag filter
    if (args.tags && args.tags.length > 0) {
      filteredTasks = filteredTasks.filter(task => {
        const taskTags = (task['tags'] as string[]) || [];
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
        const list = await todoListManager.getTodoList({
          listId: args.listId,
          includeCompleted: true,
        });
        if (list) {
          const readyItems = dependencyResolver.getReadyItems(list.items);
          readyItemIds = new Set(readyItems.map(item => item.id));
        }
      } else {
        // For cross-list searches, we need to be more careful about dependencies
        readyItemIds = new Set();
        for (const listId of listsSearched) {
          const list = await todoListManager.getTodoList({
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
        filteredTasks = filteredTasks.filter(task => {
          const deps = (task['dependencies'] as string[]) || [];
          return deps.length > 0 === args.hasDependencies;
        });
      }

      if (args.isReady !== undefined) {
        filteredTasks = filteredTasks.filter(
          task => readyItemIds!.has(task['id'] as string) === args.isReady
        );
      }

      if (args.isBlocked !== undefined) {
        filteredTasks = filteredTasks.filter(task => {
          const deps = (task['dependencies'] as string[]) || [];
          const isBlocked =
            deps.length > 0 && !readyItemIds!.has(task['id'] as string);
          return isBlocked === args.isBlocked;
        });
      }
    }

    // Sort results
    filteredTasks = applySorting(filteredTasks, args.sortBy, args.sortOrder);

    // Apply limit
    const limitedTasks = filteredTasks.slice(0, args.limit);

    // Format results
    const results = limitedTasks.map(task => {
      const baseTask = {
        id: task['id'] as string,
        title: task['title'] as string,
        description: task['description'] as string,
        status: task['status'] as string,
        priority: task['priority'] as number,
        tags: task['tags'] as string[],
        createdAt: (task['createdAt'] as Date).toISOString(),
        updatedAt: (task['updatedAt'] as Date).toISOString(),
        estimatedDuration: task['estimatedDuration'] as number,
        listId: task['listId'] as string,
        listTitle: task['listTitle'] as string,
      };

      // Add dependency information if requested
      if (args.includeDependencyInfo && readyItemIds) {
        const taskDeps = (task['dependencies'] as string[]) || [];
        const taskWithDeps: TaskWithDependencies = {
          ...baseTask,
          dependencies: taskDeps,
          isReady: readyItemIds.has(task['id'] as string),
        };

        // Calculate blocked by information
        if (!readyItemIds.has(task['id'] as string) && taskDeps.length > 0) {
          const blockedBy: string[] = [];
          for (const depId of taskDeps) {
            const depTask = allTasks.find(t => t['id'] === depId);
            if (depTask && depTask['status'] !== 'completed') {
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
          ![
            'limit',
            'sortBy',
            'sortOrder',
            'includeCompleted',
            'includeDependencyInfo',
          ].includes(key)
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
  tasks: Record<string, unknown>[],
  query: string
): Record<string, unknown>[] {
  const queryLower = query.toLowerCase();
  const results: (Record<string, unknown> & { relevanceScore: number })[] = [];

  for (const task of tasks) {
    let relevanceScore = 0;
    let hasMatch = false;

    const title = task['title'] as string;
    const description = task['description'] as string;
    const tags = (task['tags'] as string[]) || [];

    // Title search (highest weight)
    if (title && title.toLowerCase().includes(queryLower)) {
      hasMatch = true;
      relevanceScore += calculateRelevanceScore(title, query, 'title');
    }

    // Description search
    if (description && description.toLowerCase().includes(queryLower)) {
      hasMatch = true;
      relevanceScore += calculateRelevanceScore(
        description,
        query,
        'description'
      );
    }

    // Tag search
    for (const tag of tags) {
      if (tag.toLowerCase().includes(queryLower)) {
        hasMatch = true;
        relevanceScore += calculateRelevanceScore(tag, query, 'tag');
      }
    }

    if (hasMatch) {
      results.push({ ...task, relevanceScore });
    }
  }

  return results;
}

/**
 * Calculate relevance score for text matches
 */
function calculateRelevanceScore(
  text: string,
  query: string,
  type: 'title' | 'description' | 'tag'
): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  let score = 0;

  // Exact match bonus
  if (textLower === queryLower) {
    score += 100;
  }

  // Starts with bonus
  if (textLower.startsWith(queryLower)) {
    score += 50;
  }

  // Contains bonus
  if (textLower.includes(queryLower)) {
    score += 25;
  }

  // Apply field-specific multipliers
  switch (type) {
    case 'title':
      score *= 2;
      break;
    case 'tag':
      score *= 1.5;
      break;
    case 'description':
      score *= 1;
      break;
  }

  // Length penalty for very long matches
  const lengthPenalty = Math.max(0, text.length - query.length) / 100;
  score -= lengthPenalty;

  return Math.max(0, score);
}

/**
 * Apply date range filtering
 */
function applyDateRangeFilter(
  tasks: Record<string, unknown>[],
  dateRange: {
    start?: string | undefined;
    end?: string | undefined;
    field: string;
  }
): Record<string, unknown>[] {
  const { start, end, field } = dateRange;

  return tasks.filter(task => {
    const taskDate = task[field];
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
  tasks: Record<string, unknown>[],
  durationFilter: { min?: number | undefined; max?: number | undefined }
): Record<string, unknown>[] {
  const { min, max } = durationFilter;

  return tasks.filter(task => {
    const duration = task['estimatedDuration'] as number;
    if (!duration) return false;
    if (min && duration < min) return false;
    if (max && duration > max) return false;
    return true;
  });
}

/**
 * Apply sorting to results
 */
function applySorting(
  tasks: Record<string, unknown>[],
  sortBy: string,
  sortOrder: string
): Record<string, unknown>[] {
  return tasks.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'relevance':
        // Use relevance score if available (from text search), otherwise use priority + update time
        if (
          a['relevanceScore'] !== undefined &&
          b['relevanceScore'] !== undefined
        ) {
          comparison =
            (b['relevanceScore'] as number) - (a['relevanceScore'] as number);
        } else {
          comparison =
            (b['priority'] as number) - (a['priority'] as number) ||
            new Date(b['updatedAt'] as string | number | Date).getTime() -
              new Date(a['updatedAt'] as string | number | Date).getTime();
        }
        break;
      case 'priority':
        comparison = (b['priority'] as number) - (a['priority'] as number); // Higher priority first
        break;
      case 'createdAt':
        comparison =
          new Date(a['createdAt'] as string | number | Date).getTime() -
          new Date(b['createdAt'] as string | number | Date).getTime();
        break;
      case 'updatedAt':
        comparison =
          new Date(a['updatedAt'] as string | number | Date).getTime() -
          new Date(b['updatedAt'] as string | number | Date).getTime();
        break;
      case 'title':
        comparison = (a['title'] as string).localeCompare(b['title'] as string);
        break;
      default:
        comparison = 0;
        break;
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });
}
