/**
 * Handler Error Formatting Utility
 * 
 * Provides standardized enhanced error formatting for MCP tool handlers.
 * Includes agent-friendly messages, examples, and common mistake guidance.
 */

import { z } from 'zod';
import type { CallToolResult } from '../types/mcp-types.js';
import { formatZodError, createErrorContext } from './error-formatter.js';
import { getToolExamples, getCommonMistakes } from '../examples/tool-examples.js';
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
 * Format errors for MCP tool handlers with enhanced agent-friendly messages
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
    maxCommonMistakes = 2,
    includeExamples = true,
    includeContext = true,
  } = config;

  // Log the error for debugging
  logger.error(`Handler error in ${toolName}`, {
    error: error instanceof Error ? error.message : String(error),
    toolName,
    params: requestParams,
  });

  // Handle Zod validation errors with enhanced formatting
  if (error instanceof z.ZodError) {
    const errorContext = createErrorContext(toolName, includeContext);
    let errorMessage = formatZodError(error, errorContext);
    
    // Add common mistakes section
    const commonMistakes = getCommonMistakes(toolName);
    if (commonMistakes.length > 0) {
      errorMessage += '\n\n🔧 Common fixes:';
      
      commonMistakes.slice(0, maxCommonMistakes).forEach((mistake, index) => {
        errorMessage += `\n${index + 1}. ${mistake.fix}`;
        if (mistake.example) {
          errorMessage += `\n   Example: ${JSON.stringify(mistake.example)}`;
        }
      });
    }
    
    // Add working example section
    if (includeExamples) {
      const toolExamples = getToolExamples(toolName);
      if (toolExamples && toolExamples.examples.length > 0) {
        // Prefer simple examples for error responses
        const simpleExample = toolExamples.examples.find(e => 
          e.description.toLowerCase().includes('simple') ||
          e.description.toLowerCase().includes('basic')
        ) || toolExamples.examples[0];
        
        errorMessage += `\n\n📝 Working example:`;
        errorMessage += `\n${JSON.stringify(simpleExample!.parameters, null, 2)}`;
      }
    }

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

  // Handle other types of errors
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  
  return {
    content: [
      {
        type: 'text',
        text: `Error: ${errorMessage}`,
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
 * Wrap a handler function with enhanced error formatting
 * 
 * @param toolName - Name of the MCP tool
 * @param handlerFn - The original handler function
 * @param config - Optional configuration for error formatting
 * @returns Wrapped handler with enhanced error formatting
 */
export function withEnhancedErrorHandling<T extends any[], R>(
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