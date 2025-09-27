/**
 * MCP handler for getting AI-generated task suggestions
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { TodoListManager } from '../../domain/lists/todo-list-manager.js';
import type { IntelligenceManager } from '../../domain/intelligence/intelligence-manager.js';
import { logger } from '../../shared/utils/logger.js';
import { createHandlerErrorFormatter, ERROR_CONFIGS } from '../../shared/utils/handler-error-formatter.js';

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

    // Generate contextual task suggestions based on existing tasks and project patterns
    let suggestions: string[] = [];
    
    // Analyze existing tasks to understand project patterns
    const taskPatterns = analyzeTaskPatterns(todoList);
    
    // Generate suggestions based on project type and current state
    suggestions = generateContextualSuggestions(todoList, taskPatterns, args.style);
    
    // If we have few suggestions, try AI analysis as fallback
    let analysis = null;
    if (suggestions.length < args.maxSuggestions) {
      analysis = intelligenceManager.analyzeComplexity({
        taskDescription: listContext.description,
        context: todoList.projectTag || todoList.context,
        autoCreate: true, // Enable task generation
        generateOptions: {
          style: args.style,
          maxTasks: args.maxSuggestions - suggestions.length,
          includeTests: true,
          includeDependencies: true,
        },
      });
      
      suggestions.push(...analysis.suggestedTasks);
    }

    // Filter suggestions to avoid duplicates with existing tasks
    const existingTaskTitles = new Set(
      todoList.items.map(item => item.title.toLowerCase().trim())
    );

    const filteredSuggestions = suggestions.filter(suggestion => {
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
      analysisInfo: analysis ? {
        complexityScore: analysis.complexity.overall,
        confidence: Math.round(analysis.confidence * 100),
        reasoning: analysis.reasoning,
      } : undefined,
    };

    logger.info('Task suggestions generated', {
      listId: args.listId,
      suggestionsCount: response.suggestions.length,
      style: args.style,
      complexityScore: analysis?.complexity.overall || 0,
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
    // Use error formatting with advanced configuration
    const formatError = createHandlerErrorFormatter('get_task_suggestions', ERROR_CONFIGS.advanced);
    return formatError(error, request.params?.arguments);
  }
}

/**
 * Analyze task patterns in the todo list to understand project type and needs
 */
function analyzeTaskPatterns(todoList: any): {
  projectType: string;
  commonPatterns: string[];
  missingAreas: string[];
  developmentPhase: string;
} {
  const tasks = todoList.items;
  const allTitles = tasks.map((t: any) => t.title.toLowerCase());

  
  // Detect project type
  let projectType = 'general';
  if (allTitles.some((title: string) => title.includes('api') || title.includes('backend') || title.includes('server'))) {
    projectType = 'backend';
  } else if (allTitles.some((title: string) => title.includes('ui') || title.includes('frontend') || title.includes('component'))) {
    projectType = 'frontend';
  } else if (allTitles.some((title: string) => title.includes('app') || title.includes('mobile'))) {
    projectType = 'mobile';
  } else if (allTitles.some((title: string) => title.includes('test') || title.includes('deploy') || title.includes('ci'))) {
    projectType = 'devops';
  }
  
  // Detect common patterns
  const commonPatterns = [];
  if (allTitles.some((title: string) => title.includes('test'))) commonPatterns.push('testing');
  if (allTitles.some((title: string) => title.includes('deploy') || title.includes('release'))) commonPatterns.push('deployment');
  if (allTitles.some((title: string) => title.includes('doc') || title.includes('readme'))) commonPatterns.push('documentation');
  if (allTitles.some((title: string) => title.includes('auth') || title.includes('login'))) commonPatterns.push('authentication');
  if (allTitles.some((title: string) => title.includes('database') || title.includes('db'))) commonPatterns.push('database');
  
  // Detect missing areas
  const missingAreas = [];
  if (!commonPatterns.includes('testing')) missingAreas.push('testing');
  if (!commonPatterns.includes('documentation')) missingAreas.push('documentation');
  if (projectType !== 'general' && !commonPatterns.includes('deployment')) missingAreas.push('deployment');
  
  // Detect development phase
  const completedCount = tasks.filter((t: any) => t.status === 'completed').length;
  const totalCount = tasks.length;
  const completionRate = totalCount > 0 ? completedCount / totalCount : 0;
  
  let developmentPhase = 'planning';
  if (completionRate > 0.8) developmentPhase = 'maintenance';
  else if (completionRate > 0.5) developmentPhase = 'testing';
  else if (completionRate > 0.2) developmentPhase = 'development';
  else if (totalCount > 0) developmentPhase = 'implementation';
  
  return { projectType, commonPatterns, missingAreas, developmentPhase };
}

/**
 * Generate contextual suggestions based on project analysis
 */
function generateContextualSuggestions(
  _todoList: any, 
  patterns: ReturnType<typeof analyzeTaskPatterns>,
  style: string
): string[] {
  const suggestions: string[] = [];
  
  // Suggestions based on missing areas
  if (patterns.missingAreas.includes('testing')) {
    suggestions.push(
      style === 'technical' ? 'Implement unit test suite' : 
      style === 'business' ? 'Validate functionality through testing' :
      'Add comprehensive testing coverage'
    );
  }
  
  if (patterns.missingAreas.includes('documentation')) {
    suggestions.push(
      style === 'technical' ? 'Create API documentation and code comments' :
      style === 'business' ? 'Document user guides and processes' :
      'Write comprehensive project documentation'
    );
  }
  
  if (patterns.missingAreas.includes('deployment')) {
    suggestions.push(
      style === 'technical' ? 'Set up CI/CD pipeline and deployment automation' :
      style === 'business' ? 'Prepare for production release' :
      'Configure deployment and release process'
    );
  }
  
  // Phase-specific suggestions
  switch (patterns.developmentPhase) {
    case 'planning':
      suggestions.push(
        'Define project requirements and scope',
        'Create project timeline and milestones',
        'Set up development environment'
      );
      break;
      
    case 'implementation':
      if (patterns.projectType === 'frontend') {
        suggestions.push('Design responsive user interface', 'Implement user authentication');
      } else if (patterns.projectType === 'backend') {
        suggestions.push('Design database schema', 'Implement API endpoints');
      }
      break;
      
    case 'development':
      suggestions.push(
        'Implement error handling and validation',
        'Add logging and monitoring',
        'Optimize performance bottlenecks'
      );
      break;
      
    case 'testing':
      suggestions.push(
        'Conduct user acceptance testing',
        'Perform security audit',
        'Load test critical components'
      );
      break;
      
    case 'maintenance':
      suggestions.push(
        'Monitor system performance',
        'Plan feature enhancements',
        'Update dependencies and security patches'
      );
      break;
  }
  
  // Project type specific suggestions
  if (patterns.projectType === 'frontend' && !patterns.commonPatterns.includes('testing')) {
    suggestions.push('Add end-to-end testing with Cypress or Playwright');
  }
  
  if (patterns.projectType === 'backend' && !patterns.commonPatterns.includes('database')) {
    suggestions.push('Design and implement data persistence layer');
  }
  
  return suggestions.slice(0, 8); // Limit to reasonable number
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