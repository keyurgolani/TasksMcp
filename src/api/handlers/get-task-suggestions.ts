/**
 * MCP handler for getting AI-generated task suggestions
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import type { IntelligenceManager } from '../../domain/intelligence/intelligence-manager.js';
import { logger } from '../../shared/utils/logger.js';

const GetTaskSuggestionsSchema = z.object({
  listId: z.string().uuid(),
  style: z.enum(['detailed', 'concise', 'technical', 'business']).optional().default('detailed'),
  maxSuggestions: z.number().min(1).max(10).optional().default(5),
});

export async function handleGetTaskSuggestions(
  request: CallToolRequest,
  todoListManager: TodoListManager,
  intelligenceManager: IntelligenceManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing get_task_suggestions request', {
      params: request.params?.arguments,
    });

    // Validate input parameters
    const args = GetTaskSuggestionsSchema.parse(request.params?.arguments);

    // Get the todo list to analyze
    const todoList = await todoListManager.getTodoList({
      listId: args.listId,
      includeCompleted: true, // Include completed tasks for context
    });

    if (!todoList) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Todo list not found with ID: ${args.listId}`,
          },
        ],
        isError: true,
      };
    }

    // Build context from the existing list
    const listContext = buildListContext(todoList);

    // Generate task suggestions using the IntelligenceManager
    const analysis = intelligenceManager.analyzeComplexity({
      taskDescription: listContext.description,
      context: todoList.projectTag || todoList.context,
      autoCreate: false,
      generateOptions: {
        style: args.style,
        maxTasks: args.maxSuggestions,
        includeTests: true,
        includeDependencies: true,
      },
    });

    // Filter suggestions to avoid duplicates with existing tasks
    const existingTaskTitles = new Set(
      todoList.items.map(item => item.title.toLowerCase().trim())
    );

    const filteredSuggestions = analysis.suggestedTasks.filter(suggestion => {
      const suggestionLower = suggestion.toLowerCase().trim();
      return !existingTaskTitles.has(suggestionLower);
    });

    // Format response
    const response = {
      listId: args.listId,
      listTitle: todoList.title,
      suggestions: filteredSuggestions.slice(0, args.maxSuggestions),
      style: args.style,
      context: {
        totalTasks: todoList.items.length,
        completedTasks: todoList.items.filter(item => item.status === 'completed').length,
        progress: todoList.progress,
        projectTag: todoList.projectTag || todoList.context,
      },
      analysisInfo: {
        complexityScore: analysis.complexity.overall,
        confidence: Math.round(analysis.confidence * 100),
        reasoning: analysis.reasoning,
      },
    };

    logger.info('Task suggestions generated', {
      listId: args.listId,
      suggestionsCount: response.suggestions.length,
      style: args.style,
      complexityScore: analysis.complexity.overall,
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
    logger.error('Failed to get task suggestions', { error });

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
 * Build context description from existing todo list for analysis
 */
function buildListContext(todoList: any): { description: string } {
  const parts: string[] = [];

  // Start with the list title and description
  parts.push(`Project: ${todoList.title}`);
  
  if (todoList.description) {
    parts.push(`Description: ${todoList.description}`);
  }

  // Add information about existing tasks
  if (todoList.items.length > 0) {
    parts.push(`Current tasks (${todoList.items.length} total):`);
    
    // Group tasks by status
    const tasksByStatus = todoList.items.reduce((acc: any, item: any) => {
      if (!acc[item.status]) acc[item.status] = [];
      acc[item.status].push(item.title);
      return acc;
    }, {});

    Object.entries(tasksByStatus).forEach(([status, tasks]: [string, any]) => {
      parts.push(`${status}: ${tasks.slice(0, 3).join(', ')}${tasks.length > 3 ? ` and ${tasks.length - 3} more` : ''}`);
    });

    // Add common tags if present
    const allTags = todoList.items.flatMap((item: any) => item.tags || []);
    const tagCounts = allTags.reduce((acc: any, tag: string) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});
    
    const commonTags = Object.entries(tagCounts)
      .filter(([_, count]: [string, any]) => count >= 2)
      .map(([tag, _]: [string, any]) => tag)
      .slice(0, 5);
    
    if (commonTags.length > 0) {
      parts.push(`Common tags: ${commonTags.join(', ')}`);
    }
  }

  // Add project context
  if (todoList.projectTag || todoList.context) {
    parts.push(`Project context: ${todoList.projectTag || todoList.context}`);
  }

  // Create a comprehensive description for analysis
  const description = parts.join('. ') + '. Generate additional tasks that would complement this project and help achieve its goals.';

  return { description };
}