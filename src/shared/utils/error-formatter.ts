/**
 * Enhanced Error Formatting Utility
 * 
 * Converts technical JSON Schema validation errors into agent-friendly error messages
 * with suggestions, examples, and clear guidance on how to fix issues.
 */

import { ZodError, ZodIssue } from 'zod';
import { logger } from './logger.js';
import { findClosestEnumValue } from './enum-matcher.js';

/**
 * Enhanced error message with suggestions and examples
 */
export interface EnhancedErrorMessage {
  /** Main error message */
  message: string;
  /** Suggested fix */
  suggestion?: string | undefined;
  /** Example of correct usage */
  example?: string | undefined;
  /** Field that caused the error */
  field?: string | undefined;
  /** Error code for programmatic handling */
  code?: string;
}

/**
 * Context for error formatting
 */
export interface ErrorFormattingContext {
  /** Name of the MCP tool being called */
  toolName?: string;
  /** Parameter that caused the error */
  parameterName?: string;
  /** Original value that failed validation */
  originalValue?: unknown;
  /** Include examples in error messages */
  includeExamples?: boolean;
}

/**
 * Error message templates for common validation failures
 */
const ERROR_TEMPLATES = {
  // Type errors
  invalid_type: {
    message: (expected: string, received: string) => 
      `Expected ${expected}, but received ${received}`,
    suggestion: (expected: string) => 
      `Please provide a value of type ${expected}`,
    examples: {
      string: '"example text"',
      number: '42 or 3.14',
      boolean: 'true or false',
      array: '["item1", "item2"] or use JSON format',
      object: '{"key": "value"} or use JSON format',
    },
  },

  // Required field errors
  invalid_literal: {
    message: (expected: string) => 
      `Value must be exactly "${expected}"`,
    suggestion: (expected: string) => 
      `Use the exact value: "${expected}"`,
  },

  // String validation errors
  too_small: {
    message: (minimum: number, type: string) => 
      type === 'string' 
        ? `Text must be at least ${minimum} characters long`
        : `Value must be at least ${minimum}`,
    suggestion: (minimum: number, type: string) => 
      type === 'string'
        ? `Please provide text with ${minimum} or more characters`
        : `Please provide a value of ${minimum} or greater`,
  },

  too_big: {
    message: (maximum: number, type: string) => 
      type === 'string'
        ? `Text must be no more than ${maximum} characters long`
        : `Value must be no more than ${maximum}`,
    suggestion: (maximum: number, type: string) => 
      type === 'string'
        ? `Please shorten your text to ${maximum} characters or less`
        : `Please provide a value of ${maximum} or less`,
  },

  // Enum validation errors
  invalid_enum_value: {
    message: (validOptions: string[]) => 
      `Invalid option. Valid choices are: ${validOptions.join(', ')}`,
    suggestion: (validOptions: string[], closest?: string) => 
      closest 
        ? `Did you mean "${closest}"? Valid options: ${validOptions.join(', ')}`
        : `Please choose one of: ${validOptions.join(', ')}`,
  },

  // Array validation errors
  invalid_array: {
    message: () => 'Expected an array (list) of items',
    suggestion: () => 'Use array format like ["item1", "item2"] or provide as JSON string',
    example: () => '["tag1", "tag2", "tag3"]',
  },

  // Object validation errors
  invalid_object: {
    message: () => 'Expected an object with key-value pairs',
    suggestion: () => 'Use object format like {"key": "value"} or provide as JSON string',
    example: () => '{"priority": 5, "tags": ["urgent"]}',
  },

  // UUID validation errors
  invalid_uuid: {
    message: () => 'Invalid UUID format',
    suggestion: () => 'UUID must be in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    example: () => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  },

  // Custom validation errors
  custom: {
    message: (customMessage: string) => customMessage,
    suggestion: () => 'Please check your input and try again',
  },
};

/**
 * Tool-specific parameter guidance
 */
const TOOL_PARAMETER_GUIDANCE = {
  add_task: {
    priority: {
      example: '5 (highest) to 1 (lowest)',
      suggestion: 'Use numbers 1-5, where 5 is highest priority',
    },
    tags: {
      example: '["urgent", "important", "bug-fix"]',
      suggestion: 'Provide as array of strings or JSON string format',
    },
    estimatedDuration: {
      example: '120 (for 2 hours in minutes)',
      suggestion: 'Provide duration in minutes as a number',
    },
  },
  filter_tasks: {
    status: {
      example: '"pending", "completed", or "in_progress"',
      suggestion: 'Use one of the valid status values',
    },
    priority: {
      example: '5 for highest priority tasks',
      suggestion: 'Use numbers 1-5 to filter by priority level',
    },
  },
  create_list: {
    title: {
      example: '"My Project Tasks"',
      suggestion: 'Provide a descriptive title for your task list',
    },
    projectTag: {
      example: '"web-app" or "mobile-project"',
      suggestion: 'Use lowercase with hyphens, no spaces or special characters',
    },
  },
};

/**
 * Enhanced error formatter class
 */
export class ErrorFormatter {
  /**
   * Format a Zod validation error into agent-friendly message
   */
  static formatValidationError(
    error: ZodError,
    context: ErrorFormattingContext = {}
  ): EnhancedErrorMessage[] {
    const messages: EnhancedErrorMessage[] = [];

    for (const issue of error.issues) {
      const formatted = this.formatSingleIssue(issue, context);
      messages.push(formatted);
    }

    return messages;
  }

  /**
   * Format a single Zod issue
   */
  private static formatSingleIssue(
    issue: ZodIssue,
    context: ErrorFormattingContext
  ): EnhancedErrorMessage {
    const field = issue.path.join('.');
    const fieldContext = {
      ...context,
      parameterName: field,
    };

    switch (issue.code) {
      case 'invalid_type':
        return this.formatTypeError(issue, fieldContext);
      
      case 'invalid_literal':
        return this.formatLiteralError(issue, fieldContext);
      
      case 'too_small':
        return this.formatTooSmallError(issue, fieldContext);
      
      case 'too_big':
        return this.formatTooBigError(issue, fieldContext);
      
      case 'invalid_enum_value':
        return this.formatEnumError(issue, fieldContext);
      
      case 'invalid_string':
        return this.formatStringError(issue, fieldContext);
      
      case 'custom':
        return this.formatCustomError(issue, fieldContext);
      
      default:
        return this.formatGenericError(issue, fieldContext);
    }
  }

  /**
   * Format type validation errors
   */
  private static formatTypeError(
    issue: ZodIssue & { code: 'invalid_type' },
    context: ErrorFormattingContext
  ): EnhancedErrorMessage {
    const { expected, received } = issue;
    const template = ERROR_TEMPLATES.invalid_type;
    
    const message = template.message(expected, received);
    const suggestion = template.suggestion(expected);
    const example = template.examples[expected as keyof typeof template.examples];

    // Add tool-specific guidance
    const toolGuidance = this.getToolSpecificGuidance(context);

    return {
      message: context.parameterName ? `${context.parameterName}: ${message}` : message,
      suggestion: toolGuidance?.suggestion || suggestion,
      example: toolGuidance?.example || example,
      field: context.parameterName || undefined,
      code: 'invalid_type',
    };
  }

  /**
   * Format literal value errors
   */
  private static formatLiteralError(
    issue: ZodIssue & { code: 'invalid_literal' },
    context: ErrorFormattingContext
  ): EnhancedErrorMessage {
    const expected = String(issue.expected);
    const template = ERROR_TEMPLATES.invalid_literal;

    return {
      message: template.message(expected),
      suggestion: template.suggestion(expected),
      field: context.parameterName || undefined,
      code: 'invalid_literal',
    };
  }

  /**
   * Format "too small" errors (minimum length/value)
   */
  private static formatTooSmallError(
    issue: ZodIssue & { code: 'too_small' },
    context: ErrorFormattingContext
  ): EnhancedErrorMessage {
    const { minimum, type } = issue;
    const template = ERROR_TEMPLATES.too_small;

    // Add tool-specific guidance
    const toolGuidance = this.getToolSpecificGuidance(context);

    return {
      message: template.message(Number(minimum), type),
      suggestion: toolGuidance?.suggestion || template.suggestion(Number(minimum), type),
      example: toolGuidance?.example || undefined,
      field: context.parameterName || undefined,
      code: 'too_small',
    };
  }

  /**
   * Format "too big" errors (maximum length/value)
   */
  private static formatTooBigError(
    issue: ZodIssue & { code: 'too_big' },
    context: ErrorFormattingContext
  ): EnhancedErrorMessage {
    const { maximum, type } = issue;
    const template = ERROR_TEMPLATES.too_big;

    // Add tool-specific guidance
    const toolGuidance = this.getToolSpecificGuidance(context);

    return {
      message: template.message(Number(maximum), type),
      suggestion: toolGuidance?.suggestion || template.suggestion(Number(maximum), type),
      example: toolGuidance?.example || undefined,
      field: context.parameterName || undefined,
      code: 'too_big',
    };
  }

  /**
   * Format enum validation errors with fuzzy matching
   */
  private static formatEnumError(
    issue: ZodIssue & { code: 'invalid_enum_value' },
    context: ErrorFormattingContext
  ): EnhancedErrorMessage {
    const validOptions = issue.options?.map(String) || [];
    const receivedValue = String(issue.received);
    
    // Find closest match for suggestion
    const closestMatch = findClosestEnumValue(receivedValue, validOptions);
    
    const template = ERROR_TEMPLATES.invalid_enum_value;

    // Add tool-specific guidance
    const toolGuidance = this.getToolSpecificGuidance(context);

    const message = template.message(validOptions);
    
    return {
      message: context.parameterName ? `${context.parameterName}: ${message}` : message,
      suggestion: closestMatch 
        ? template.suggestion(validOptions, closestMatch)
        : (toolGuidance?.suggestion || template.suggestion(validOptions, undefined)),
      example: toolGuidance?.example || undefined,
      field: context.parameterName || undefined,
      code: 'invalid_enum_value',
    };
  }

  /**
   * Format string validation errors
   */
  private static formatStringError(
    issue: ZodIssue & { code: 'invalid_string' },
    context: ErrorFormattingContext
  ): EnhancedErrorMessage {
    const validation = issue.validation;
    
    if (validation === 'uuid') {
      const template = ERROR_TEMPLATES.invalid_uuid;
      return {
        message: template.message(),
        suggestion: template.suggestion(),
        example: template.example(),
        field: context.parameterName || undefined,
        code: 'invalid_uuid',
      };
    }

    return {
      message: `Invalid string format: ${validation}`,
      suggestion: 'Please check the string format and try again',
      field: context.parameterName || undefined,
      code: 'invalid_string',
    };
  }

  /**
   * Format custom validation errors
   */
  private static formatCustomError(
    issue: ZodIssue & { code: 'custom' },
    context: ErrorFormattingContext
  ): EnhancedErrorMessage {
    const template = ERROR_TEMPLATES.custom;

    return {
      message: template.message(issue.message || 'Custom validation failed'),
      suggestion: template.suggestion(),
      field: context.parameterName || undefined,
      code: 'custom',
    };
  }

  /**
   * Format generic errors
   */
  private static formatGenericError(
    issue: ZodIssue,
    context: ErrorFormattingContext
  ): EnhancedErrorMessage {
    return {
      message: issue.message || 'Validation failed',
      suggestion: 'Please check your input and try again',
      field: context.parameterName || undefined,
      code: issue.code,
    };
  }

  /**
   * Get tool-specific parameter guidance
   */
  private static getToolSpecificGuidance(
    context: ErrorFormattingContext
  ): { suggestion?: string; example?: string } | undefined {
    if (!context.toolName || !context.parameterName) {
      return undefined;
    }

    const toolGuidance = TOOL_PARAMETER_GUIDANCE[
      context.toolName as keyof typeof TOOL_PARAMETER_GUIDANCE
    ];

    if (!toolGuidance) {
      return undefined;
    }

    return toolGuidance[
      context.parameterName as keyof typeof toolGuidance
    ];
  }



  /**
   * Format multiple enhanced error messages into a single user-friendly string
   */
  static formatErrorsForDisplay(
    errors: EnhancedErrorMessage[],
    options: {
      includeExamples?: boolean;
      includeSuggestions?: boolean;
      maxErrors?: number;
    } = {}
  ): string {
    const {
      includeExamples = true,
      includeSuggestions = true,
      maxErrors = 5,
    } = options;

    // Handle empty errors array
    if (errors.length === 0) {
      return '';
    }

    const displayErrors = errors.slice(0, maxErrors);
    const parts: string[] = [];

    if (displayErrors.length === 1) {
      const error = displayErrors[0]!;
      parts.push(`❌ ${error.message}`);
      
      if (includeSuggestions && error.suggestion) {
        parts.push(`💡 ${error.suggestion}`);
      }
      
      if (includeExamples && error.example) {
        parts.push(`📝 Example: ${error.example}`);
      }
    } else {
      parts.push(`❌ Found ${errors.length} validation error${errors.length > 1 ? 's' : ''}:`);
      
      displayErrors.forEach((error, index) => {
        parts.push(`\n${index + 1}. ${error.message}`);
        
        if (includeSuggestions && error.suggestion) {
          parts.push(`   💡 ${error.suggestion}`);
        }
        
        if (includeExamples && error.example) {
          parts.push(`   📝 Example: ${error.example}`);
        }
      });

      if (errors.length > maxErrors) {
        parts.push(`\n... and ${errors.length - maxErrors} more error${errors.length - maxErrors > 1 ? 's' : ''}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * Log error formatting for debugging
   */
  static logErrorFormatting(
    originalError: ZodError,
    formattedErrors: EnhancedErrorMessage[],
    context: ErrorFormattingContext
  ): void {
    logger.debug('Error formatting applied', {
      toolName: context.toolName,
      originalIssueCount: originalError.issues.length,
      formattedErrorCount: formattedErrors.length,
      errorCodes: formattedErrors.map(e => e.code),
      fields: formattedErrors.map(e => e.field).filter(Boolean),
    });
  }
}

/**
 * Convenience function to format Zod errors with default settings
 */
export function formatZodError(
  error: ZodError,
  context: ErrorFormattingContext = {}
): string {
  const enhancedErrors = ErrorFormatter.formatValidationError(error, context);
  ErrorFormatter.logErrorFormatting(error, enhancedErrors, context);
  return ErrorFormatter.formatErrorsForDisplay(enhancedErrors);
}

/**
 * Create error formatting context for a specific tool
 */
export function createErrorContext(
  toolName: string,
  includeExamples = true
): ErrorFormattingContext {
  return {
    toolName,
    includeExamples,
  };
}