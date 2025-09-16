/**
 * MCP handler for task complexity analysis
 */

import { z } from 'zod';
import type { CallToolRequest, CallToolResult } from '../../shared/types/mcp-types.js';
import type { IntelligenceManager } from '../../domain/intelligence/intelligence-manager.js';
import { logger } from '../../shared/utils/logger.js';
import { createHandlerErrorFormatter, ERROR_CONFIGS } from '../../shared/utils/handler-error-formatter.js';

const AnalyzeTaskSchema = z.object({
  taskDescription: z.string().min(1).max(2000),
  context: z.string().max(200).optional(),
  maxSuggestions: z.number().min(1).max(10).optional().default(5),
});

export async function handleAnalyzeTask(
  request: CallToolRequest,
  intelligenceManager: IntelligenceManager
): Promise<CallToolResult> {
  try {
    logger.debug('Processing analyze_task request', {
      params: request.params?.arguments,
    });

    const args = AnalyzeTaskSchema.parse(request.params?.arguments);
    const analysisInput: any = {
      taskDescription: args.taskDescription,
      autoCreate: false,
      generateOptions: {
        style: 'detailed',
        maxTasks: args.maxSuggestions,
        includeTests: true,
        includeDependencies: true,
      },
    };
    
    if (args.context) {
      analysisInput.context = args.context;
    }
    
    const analysis = intelligenceManager.analyzeComplexity(analysisInput);

    const response = {
      isComplex: analysis.isComplex,
      complexityScore: analysis.complexity.overall,
      confidence: Math.round(analysis.confidence * 100),
      estimatedDuration: analysis.estimatedDuration,
      reasoning: analysis.reasoning,
      suggestions: analysis.suggestedTasks.slice(0, args.maxSuggestions),
      breakdown: analysis.complexity.breakdown,
    };

    logger.info('Task analysis completed', {
      isComplex: analysis.isComplex,
      complexityScore: analysis.complexity.overall,
      confidence: analysis.confidence,
      suggestionsCount: response.suggestions.length,
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
    // Use enhanced error formatting with advanced configuration
    const formatError = createHandlerErrorFormatter('analyze_task', ERROR_CONFIGS.advanced);
    return formatError(error, request.params?.arguments);
  }
}