/**
 * Handler for analyze_task_complexity MCP tool
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../types/mcp-types.js';
import type { IntelligenceManager } from '../intelligence/intelligence-manager.js';
import type { TodoListManager } from '../core/todo-list-manager.js';
import type { AnalyzeTaskComplexityParams } from '../types/intelligence.js';
import { logger } from '../utils/logger.js';

// Zod schema for input validation
const AnalyzeTaskComplexitySchema = z.object({
  taskDescription: z.string().min(1).max(10000),
  context: z.string().max(200).optional(),
  autoCreate: z.boolean().optional().default(false),
  generateOptions: z
    .object({
      style: z
        .enum(['detailed', 'concise', 'technical', 'business'])
        .optional(),
      maxTasks: z.number().int().min(1).max(20).optional(),
      includeTests: z.boolean().optional(),
      includeDependencies: z.boolean().optional(),
    })
    .optional(),
});

export async function handleAnalyzeTaskComplexity(
  request: CallToolRequest,
  intelligenceManager: IntelligenceManager,
  todoListManager?: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.info('Processing analyze_task_complexity request');

    // Validate input parameters
    const args = AnalyzeTaskComplexitySchema.parse(request.params.arguments);

    logger.debug('Validated analyze_task_complexity parameters', {
      taskDescriptionLength: args.taskDescription.length,
      context: args.context,
      autoCreate: args.autoCreate,
      generateOptions: args.generateOptions,
    });

    // Perform complexity analysis
    const generateOptions = args.generateOptions
      ? {
          style: args.generateOptions.style ?? 'detailed',
          maxTasks: args.generateOptions.maxTasks ?? 8,
          includeTests: args.generateOptions.includeTests ?? true,
          includeDependencies: args.generateOptions.includeDependencies ?? true,
        }
      : undefined;

    const analysisParams: AnalyzeTaskComplexityParams = {
      taskDescription: args.taskDescription,
      autoCreate: args.autoCreate,
    };

    if (args.context !== undefined) {
      analysisParams.context = args.context;
    }

    if (generateOptions !== undefined) {
      analysisParams.generateOptions = generateOptions;
    }

    const analysis = intelligenceManager.analyzeComplexity(analysisParams);

    // If autoCreate is true and task is complex, create a todo list
    let createdList = null;
    if (args.autoCreate && analysis.isComplex && todoListManager) {
      try {
        logger.info('Auto-creating todo list from complex task analysis');

        // Generate a title from the task description
        const title = generateTitleFromDescription(args.taskDescription);

        // Create the todo list structure
        const listData = intelligenceManager.createTodoListFromAnalysis(
          analysis,
          title,
          args.context ?? undefined
        );

        // Convert suggested tasks to todo items format
        let initialTasks = analysis.suggestedTasks.map(taskTitle => ({
          title: taskTitle,
          description: `Generated from complexity analysis (confidence: ${Math.round(analysis.confidence * 100)}%)`,
          priority: 3, // Default priority, will be adjusted by intelligence manager
          tags: ['ai-generated'],
        }));

        // Ensure we have at least one task when auto-creating
        if (initialTasks.length === 0) {
          initialTasks = [
            {
              title: 'Analyze and break down the task requirements',
              description: 'Auto-generated fallback task for complex analysis',
              priority: 3,
              tags: ['ai-generated', 'analysis'],
            },
          ];
        }

        // Create the todo list
        const createParams = {
          title: listData.title ?? title,
          tasks: initialTasks,
          ...(listData.description !== undefined &&
            listData.description.length > 0 && {
              description: listData.description,
            }),
          ...(listData.context !== undefined &&
            listData.context.length > 0 && { context: listData.context }),
        };
        createdList = await todoListManager.createTodoList(createParams);

        logger.info('Successfully auto-created todo list', {
          listId: createdList.id,
          taskCount: createdList.items.length,
        });
      } catch (createError) {
        logger.error('Failed to auto-create todo list', {
          error:
            createError instanceof Error
              ? createError.message
              : String(createError),
        });
        // For testing, we want to see the actual error
        if (process.env['NODE_ENV'] === 'test') {
          throw createError;
        }
        // Continue without failing the analysis - just log the error
      }
    }

    // Prepare the response
    const response = {
      analysis: {
        isComplex: analysis.isComplex,
        confidence: analysis.confidence,
        complexity: analysis.complexity,
        estimatedDuration: analysis.estimatedDuration,
        reasoning: analysis.reasoning,
        suggestedTasks: analysis.suggestedTasks,
        patterns: analysis.patterns.map(pattern => ({
          type: pattern.type,
          confidence: pattern.confidence,
          matches: pattern.matches,
        })),
      },
      autoCreated: !!createdList,
      createdList: createdList
        ? {
            id: createdList.id,
            title: createdList.title,
            itemCount: createdList.items.length,
            progress: createdList.progress,
          }
        : null,
    };

    logger.info('Successfully completed analyze_task_complexity request', {
      isComplex: analysis.isComplex,
      confidence: analysis.confidence,
      overallComplexity: analysis.complexity.overall,
      suggestedTasksCount: analysis.suggestedTasks.length,
      autoCreated: !!createdList,
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
    logger.error('Failed to process analyze_task_complexity request', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    const errorMessage =
      error instanceof z.ZodError
        ? `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        : `Analysis failed: ${error instanceof Error ? error.message : String(error)}`;

    return {
      content: [
        {
          type: 'text',
          text: errorMessage,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Generate a concise title from a task description
 */
function generateTitleFromDescription(description: string): string {
  // Clean and truncate the description
  const cleaned = description
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Take first few words, up to 50 characters
  const words = cleaned.split(' ');
  let title = '';

  for (const word of words) {
    if (`${title} ${word}`.length > 50) break;
    title += (title ? ' ' : '') + word;
  }

  // Ensure we have at least something
  if (!title) {
    title = 'AI Generated Task List';
  }

  // Capitalize first letter
  return title.charAt(0).toUpperCase() + title.slice(1);
}
