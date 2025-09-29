/**
 * Handler Error Formatting Utility
 * 
 * Provides standardized error formatting for MCP tool handlers.
 * Includes agent-friendly messages, examples, and common mistake guidance.
 */

import { z } from 'zod';
import type { CallToolResult } from '../types/mcp-types.js';
import { formatZodError, createErrorContext } from './error-formatter.js';

import { logger } from './logger.js';

/**
 * Configuration for handler error formatting
 */
export interface HandlerErrorConfig {
  /** Tool name for context-specific error messages */
  toolName: string;
  /** Maximum number of common mistakes to include */
  maxCommonMistakes?: number;
  /** Whether to include working examples */
  includeExamples?: boolean;
  /** Whether to include detailed error context */
  includeContext?: boolean;
}

/**
 * Format errors for MCP tool handlers with agent-friendly messages
 * 
 * @param error - The error that occurred
 * @param config - Configuration for error formatting
 * @param requestParams - Original request parameters for logging
 * @returns CallToolResult with formatted error message
 */
export function formatHandlerError(
  error: unknown,
  config: HandlerErrorConfig,
  requestParams?: unknown
): CallToolResult {
  const {
    toolName,
    includeExamples = true,
    includeContext = true,
  } = config;

  // Log the error for debugging
  logger.error(`Handler error in ${toolName}`, {
    error: error instanceof Error ? error.message : String(error),
    toolName,
    params: requestParams,
  });

  // Handle Zod validation errors with formatting
  if (error instanceof z.ZodError) {
    const errorContext = createErrorContext(toolName, includeContext);
    // Set includeExamples based on the config
    errorContext.includeExamples = includeExamples;
    let errorMessage = formatZodError(error, errorContext);
    
    // formatZodError already includes common mistakes and examples, so we don't need to add them again

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

  // Handle other types of errors with methodology guidance
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  
  // Add methodology guidance to error messages
  const methodologyHint = getMethodologyHintForTool(toolName);
  const fullErrorMessage = `Error: ${errorMessage}\n\n${methodologyHint}`;
  
  return {
    content: [
      {
        type: 'text',
        text: fullErrorMessage,
      },
    ],
    isError: true,
  };
}

/**
 * Create a standardized error handler function for a specific tool
 * 
 * @param toolName - Name of the MCP tool
 * @param config - Optional configuration overrides
 * @returns Function that formats errors for this tool
 */
export function createHandlerErrorFormatter(
  toolName: string,
  config: Partial<Omit<HandlerErrorConfig, 'toolName'>> = {}
) {
  return (error: unknown, requestParams?: unknown): CallToolResult => {
    return formatHandlerError(error, { toolName, ...config }, requestParams);
  };
}

/**
 * Wrap a handler function with error formatting
 * 
 * @param toolName - Name of the MCP tool
 * @param handlerFn - The original handler function
 * @param config - Optional configuration for error formatting
 * @returns Wrapped handler with error formatting
 */
export function withErrorHandling<T extends any[], R>(
  toolName: string,
  handlerFn: (...args: T) => Promise<R>,
  config: Partial<Omit<HandlerErrorConfig, 'toolName'>> = {}
) {
  return async (...args: T): Promise<R | CallToolResult> => {
    try {
      return await handlerFn(...args);
    } catch (error) {
      // Extract request params from first argument if it looks like a request
      const requestParams = args[0] && typeof args[0] === 'object' && 'params' in args[0] 
        ? (args[0] as any).params?.arguments 
        : undefined;
      
      return formatHandlerError(error, { toolName, ...config }, requestParams);
    }
  };
}

/**
 * Get methodology hint for a specific tool
 */
function getMethodologyHintForTool(toolName: string): string {
  const hints: Record<string, string> = {
    // Investigation tools
    'analyze_task': '🎯 METHODOLOGY TIP: Use this tool BEFORE creating tasks to plan properly (Plan and Reflect principle)',
    'search_tool': '🔍 METHODOLOGY TIP: Use this to research existing work before starting (Use Tools, Don\'t Guess principle)',
    'get_list': '🔍 METHODOLOGY TIP: Always check task context before starting work (Use Tools, Don\'t Guess principle)',
    
    // Task creation and management
    'add_task': '📋 METHODOLOGY TIP: Include detailed action plans and specific exit criteria (Plan and Reflect principle)',
    'update_task': '🔄 METHODOLOGY TIP: Use this regularly to track progress and document discoveries during execution',
    'complete_task': '✅ METHODOLOGY TIP: Only use after verifying ALL exit criteria are met (Persist Until Complete principle)',
    
    // Workflow tools
    'get_ready_tasks': '🚀 METHODOLOGY TIP: Start each work session with this to plan your day (Plan and Reflect principle)',
    'analyze_task_dependencies': '📊 METHODOLOGY TIP: Use this to understand project context before starting work',
    
    // Quality tools
    'set_task_exit_criteria': '🎯 METHODOLOGY TIP: Define specific, measurable completion requirements (Persist Until Complete)',
    'update_exit_criteria': '📝 METHODOLOGY TIP: Track completion progress throughout execution',
  };
  
  return hints[toolName] || '💡 METHODOLOGY REMINDER: Follow the three principles - Plan and Reflect, Use Tools Don\'t Guess, Persist Until Complete';
}

/**
 * Common error configurations for different types of tools
 */
export const ERROR_CONFIGS = {
  /** Configuration for list management tools */
  listManagement: {
    maxCommonMistakes: 2,
    includeExamples: true,
    includeContext: true,
  },
  
  /** Configuration for task management tools */
  taskManagement: {
    maxCommonMistakes: 3,
    includeExamples: true,
    includeContext: true,
  },
  
  /** Configuration for search and display tools */
  searchDisplay: {
    maxCommonMistakes: 2,
    includeExamples: false, // Usually simpler, don't need examples
    includeContext: true,
  },
  
  /** Configuration for advanced features */
  advanced: {
    maxCommonMistakes: 1,
    includeExamples: true,
    includeContext: false, // Keep it simple for complex tools
  },
} as const;