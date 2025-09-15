/**
 * MCP handler for text-based task searching
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import type { SimpleSearchResponse, SimpleTaskResponse } from '../../shared/types/mcp-types.js';
import { logger } from '../../shared/utils/logger.js';

const SearchTasksSchema = z.object({
  query: z.string().min(1).max(200),
  listId: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
});

export async function handleSearchTasks(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing search_tasks request', {
      params: request.params?.arguments,
    });

    const args = SearchTasksSchema.parse(request.params?.arguments);

    let allTasks: any[] = [];

    if (args.listId) {
      const list = await todoListManager.getTodoList({
        listId: args.listId,
        includeCompleted: true,
      });

      if (!list) {
        throw new Error(`Todo list not found: ${args.listId}`);
      }

      allTasks = list.items;
    } else {
      const allLists = await todoListManager.listTodoLists({
        includeArchived: false,
      });

      for (const listSummary of allLists) {
        const fullList = await todoListManager.getTodoList({
          listId: listSummary.id,
          includeCompleted: true,
        });

        if (fullList) {
          allTasks.push(...fullList.items);
        }
      }
    }

    const searchResults = searchTasksInList(allTasks, args.query);
    const sortedResults = searchResults
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, args.limit);

    const results: SimpleTaskResponse[] = sortedResults.map(({ relevanceScore, ...task }) => task);

    const response: SimpleSearchResponse = {
      results,
      totalCount: searchResults.length,
      hasMore: searchResults.length > args.limit,
    };

    logger.info('Task search completed successfully', {
      query: args.query,
      listId: args.listId,
      totalResults: response.totalCount,
      returnedResults: response.results.length,
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
    logger.error('Failed to search tasks', { error });

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

/**
 * Search tasks within a list by text query
 */
function searchTasksInList(tasks: any[], query: string): (SimpleTaskResponse & { relevanceScore: number })[] {
  const queryLower = query.toLowerCase();
  const results: (SimpleTaskResponse & { relevanceScore: number })[] = [];

  for (const task of tasks) {
    let relevanceScore = 0;
    let hasMatch = false;

    if (task.title.toLowerCase().includes(queryLower)) {
      hasMatch = true;
      relevanceScore += calculateRelevanceScore(task.title, query, 'title');
    }

    if (task.description && task.description.toLowerCase().includes(queryLower)) {
      hasMatch = true;
      relevanceScore += calculateRelevanceScore(task.description, query, 'description');
    }

    for (const tag of task.tags) {
      if (tag.toLowerCase().includes(queryLower)) {
        hasMatch = true;
        relevanceScore += calculateRelevanceScore(tag, query, 'tag');
      }
    }

    if (hasMatch) {
      results.push({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tags: task.tags,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        estimatedDuration: task.estimatedDuration,
        relevanceScore,
      });
    }
  }

  return results;
}

/**
 * Calculate relevance score for a text match
 */
function calculateRelevanceScore(
  text: string,
  query: string,
  type: 'title' | 'description' | 'tag'
): number {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  let score = 0;

  if (textLower === queryLower) {
    score += 100;
  }

  if (textLower.startsWith(queryLower)) {
    score += 50;
  }

  if (textLower.includes(queryLower)) {
    score += 25;
  }

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

  const lengthPenalty = Math.max(0, text.length - query.length) / 100;
  score -= lengthPenalty;

  return Math.max(0, score);
}