/**
 * MCP handler for advanced search across todo lists
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../types/mcp-types.js';
import type { TodoListManager } from '../core/todo-list-manager.js';
import { TaskStatus, Priority, TodoItem } from '../types/todo.js';
import { logger } from '../utils/logger.js';

const SearchTodoListsSchema = z.object({
  query: z.string().min(1).max(500),
  context: z.string().optional(),
  filters: z
    .object({
      status: z
        .union([z.nativeEnum(TaskStatus), z.array(z.nativeEnum(TaskStatus))])
        .optional(),
      priority: z
        .union([z.nativeEnum(Priority), z.array(z.nativeEnum(Priority))])
        .optional(),
      tags: z.array(z.string()).optional(),
      createdBefore: z
        .string()
        .datetime()
        .transform(str => new Date(str))
        .optional(),
      createdAfter: z
        .string()
        .datetime()
        .transform(str => new Date(str))
        .optional(),
      hasDescription: z.boolean().optional(),
      hasDependencies: z.boolean().optional(),
      estimatedDurationMin: z.number().min(0).optional(),
      estimatedDurationMax: z.number().min(0).optional(),
    })
    .optional(),
  sorting: z
    .object({
      field: z.enum([
        'relevance',
        'title',
        'status',
        'priority',
        'createdAt',
        'updatedAt',
      ]),
      direction: z.enum(['asc', 'desc']),
    })
    .optional(),
  pagination: z
    .object({
      limit: z.number().min(1).max(1000).optional(),
      offset: z.number().min(0).optional(),
    })
    .optional(),
  includeArchived: z.boolean().optional(),
});

export interface SearchResult {
  listId: string;
  listTitle: string;
  item: {
    id: string;
    title: string;
    description: string | undefined;
    status: TaskStatus;
    priority: Priority;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
  };
  relevanceScore: number;
  matchType: 'title' | 'description' | 'tag';
  matchText: string;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  searchTime: number;
  query: string;
  hasMore: boolean;
}

export async function handleSearchTodoLists(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    const startTime = Date.now();

    logger.debug('Processing search_todo_lists request', {
      params: request.params?.arguments,
    });

    // Validate input parameters
    const args = SearchTodoListsSchema.parse(request.params?.arguments);

    // Get all todo lists
    const allLists = await todoListManager.listTodoLists({
      context: args.context,
      includeArchived: args.includeArchived ?? false,
    });

    // Perform search across all lists
    const searchResults: SearchResult[] = [];

    for (const listSummary of allLists) {
      // Get full list details
      const fullList = await todoListManager.getTodoList({
        listId: listSummary.id,
        includeCompleted: true, // Include all items for search
      });

      if (!fullList) {
        continue;
      }

      // Search within this list's items
      for (const item of fullList.items) {
        const matches = findMatches(item, args.query, args.filters);

        for (const match of matches) {
          searchResults.push({
            listId: fullList.id,
            listTitle: fullList.title,
            item: {
              id: item.id,
              title: item.title,
              description: item.description,
              status: item.status,
              priority: item.priority,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
              tags: item.tags,
            },
            relevanceScore: match.score,
            matchType: match.type,
            matchText: match.text,
          });
        }
      }
    }

    // Sort results by relevance or specified field
    const sortedResults = sortSearchResults(searchResults, args.sorting);

    // Apply pagination
    const totalCount = sortedResults.length;
    const limit = args.pagination?.limit ?? totalCount;
    const offset = args.pagination?.offset ?? 0;

    const paginatedResults = sortedResults.slice(offset, offset + limit);
    const hasMore = offset + limit < totalCount;

    const searchTime = Date.now() - startTime;

    const response: SearchResponse = {
      results: paginatedResults,
      totalCount,
      searchTime,
      query: args.query,
      hasMore,
    };

    logger.info('Search completed successfully', {
      query: args.query,
      totalResults: totalCount,
      returnedResults: paginatedResults.length,
      searchTime,
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
    logger.error('Failed to search todo lists', { error });

    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: 'text',
            text: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        },
      ],
      isError: true,
    };
  }
}

interface SearchFilters {
  status?: TaskStatus | TaskStatus[] | undefined;
  priority?: Priority | Priority[] | undefined;
  tags?: string[] | undefined;
  createdBefore?: Date | undefined;
  createdAfter?: Date | undefined;
  hasDescription?: boolean | undefined;
  hasDependencies?: boolean | undefined;
  estimatedDurationMin?: number | undefined;
  estimatedDurationMax?: number | undefined;
}

function findMatches(
  item: TodoItem,
  query: string,
  filters?: SearchFilters
): Array<{
  score: number;
  type: 'title' | 'description' | 'tag';
  text: string;
}> {
  const matches: Array<{
    score: number;
    type: 'title' | 'description' | 'tag';
    text: string;
  }> = [];
  const queryLower = query.toLowerCase();

  // Apply filters first
  if (filters) {
    if (
      filters.status !== undefined &&
      !matchesStatusFilter(item.status, filters.status)
    ) {
      return matches;
    }
    if (
      filters.priority !== undefined &&
      !matchesPriorityFilter(item.priority, filters.priority)
    ) {
      return matches;
    }
    if (
      filters.tags !== undefined &&
      !matchesTagsFilter(item.tags, filters.tags)
    ) {
      return matches;
    }
    if (filters.hasDescription !== undefined) {
      const hasDesc = Boolean(item.description?.trim().length);
      if (filters.hasDescription !== hasDesc) {
        return matches;
      }
    }
    if (filters.hasDependencies !== undefined) {
      const hasDeps = Boolean(item.dependencies.length);
      if (filters.hasDependencies !== hasDeps) {
        return matches;
      }
    }
    // Add more filter checks as needed
  }

  // Title match
  if (item.title.toLowerCase().includes(queryLower)) {
    const score = calculateRelevanceScore(item.title, query, 'title');
    matches.push({ score, type: 'title', text: item.title });
  }

  // Description match
  if (item.description?.toLowerCase().includes(queryLower) === true) {
    const score = calculateRelevanceScore(
      item.description,
      query,
      'description'
    );
    matches.push({ score, type: 'description', text: item.description });
  }

  // Tag matches
  for (const tag of item.tags) {
    if (tag.toLowerCase().includes(queryLower)) {
      const score = calculateRelevanceScore(tag, query, 'tag');
      matches.push({ score, type: 'tag', text: tag });
    }
  }

  return matches;
}

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

  // Type-based scoring
  switch (type) {
    case 'title':
      score *= 2; // Title matches are more important
      break;
    case 'tag':
      score *= 1.5; // Tag matches are moderately important
      break;
    case 'description':
      score *= 1; // Description matches are base importance
      break;
  }

  // Length penalty (shorter matches are more relevant)
  const lengthPenalty = Math.max(0, text.length - query.length) / 100;
  score -= lengthPenalty;

  return Math.max(0, score);
}

function sortSearchResults(
  results: SearchResult[],
  sorting?: { field: string; direction: 'asc' | 'desc' }
): SearchResult[] {
  if (!sorting || sorting.field === 'relevance') {
    // Sort by relevance score (descending by default)
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  return results.sort((a, b) => {
    let comparison = 0;

    switch (sorting.field) {
      case 'title':
        comparison = a.item.title.localeCompare(b.item.title);
        break;
      case 'status':
        comparison = a.item.status.localeCompare(b.item.status);
        break;
      case 'priority':
        comparison = a.item.priority - b.item.priority;
        break;
      case 'createdAt':
        comparison = a.item.createdAt.getTime() - b.item.createdAt.getTime();
        break;
      case 'updatedAt':
        comparison = a.item.updatedAt.getTime() - b.item.updatedAt.getTime();
        break;
      default:
        comparison = b.relevanceScore - a.relevanceScore; // Default to relevance
    }

    return sorting.direction === 'desc' ? -comparison : comparison;
  });
}

function matchesStatusFilter(
  itemStatus: TaskStatus,
  filterStatus: TaskStatus | TaskStatus[]
): boolean {
  const statusArray = Array.isArray(filterStatus)
    ? filterStatus
    : [filterStatus];
  return statusArray.includes(itemStatus);
}

function matchesPriorityFilter(
  itemPriority: Priority,
  filterPriority: Priority | Priority[]
): boolean {
  const priorityArray = Array.isArray(filterPriority)
    ? filterPriority
    : [filterPriority];
  return priorityArray.includes(itemPriority);
}

function matchesTagsFilter(itemTags: string[], filterTags: string[]): boolean {
  return filterTags.every(tag => itemTags.includes(tag));
}
