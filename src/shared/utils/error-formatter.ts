/**
 * Error formatting for agent-friendly responses
 * Provides structured error responses with actionable suggestions
 */

import { ZodError, ZodIssue } from 'zod';
import { getToolExamples, getCommonMistakes } from '../examples/tool-examples.js';

/**
 * Enhanced error message with detailed information and suggestions
 */
export interface EnhancedErrorMessage {
  /** Field name that caused the error */
  field: string;
  /** Human-readable error message */
  message: string;
  /** Error code from Zod */
  code: string;
  /** Suggestion for fixing the error */
  suggestion?: string;
  /** Example of correct value */
  example?: string;
  /** Closest valid option for enum errors */
  closestMatch?: string;
}

/**
 * Options for displaying formatted errors
 */
export interface DisplayOptions {
  /** Whether to include suggestions in the output */
  includeSuggestions?: boolean;
  /** Whether to include examples in the output */
  includeExamples?: boolean;
  /** Maximum number of errors to display */
  maxErrors?: number;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    field?: string;
    provided?: unknown;
    expected?: string;
    suggestion?: string;
  };
  context?: {
    tool: string;
    operation: string;
    timestamp: string;
  };
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  metadata?: {
    operation: string;
    timestamp: string;
    affectedCount?: number;
    warnings?: string[];
  };
  suggestions?: string[];
}

/**
 * Create an error response with structured information
 */
export function createErrorResponse(
  error: unknown,
  context: {
    tool: string;
    operation: string;
    field?: string;
    provided?: unknown;
    expected?: string;
  }
): ErrorResponse {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Extract error code from message or use generic
  let errorCode = 'UNKNOWN_ERROR';
  let suggestion = 'Please check your parameters and try again';
  
  if (errorMessage.includes('validation')) {
    errorCode = 'VALIDATION_ERROR';
    suggestion = 'Please verify all required parameters are provided with correct types';
  } else if (errorMessage.includes('not found')) {
    errorCode = 'NOT_FOUND';
    suggestion = 'Please verify the ID exists and try again';
  } else if (errorMessage.includes('UUID')) {
    errorCode = 'INVALID_UUID';
    suggestion = 'Please provide a valid UUID in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
  } else if (errorMessage.includes('priority')) {
    errorCode = 'INVALID_PRIORITY';
    suggestion = 'Please use priority values between 1-5 (1=minimal, 2=low, 3=medium, 4=high, 5=critical)';
  } else if (errorMessage.includes('required')) {
    errorCode = 'MISSING_REQUIRED_PARAMETER';
    suggestion = 'Please provide all required parameters';
  }

  return {
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
      ...(context.field && { field: context.field }),
      ...(context.provided !== undefined && { provided: context.provided }),
      ...(context.expected && { expected: context.expected }),
      suggestion,
    },
    context: {
      tool: context.tool,
      operation: context.operation,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create a success response with metadata and suggestions
 */
export function createSuccessResponse<T>(
  data: T,
  context: {
    operation: string;
    affectedCount?: number;
    warnings?: string[];
  },
  suggestions?: string[]
): SuccessResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      operation: context.operation,
      timestamp: new Date().toISOString(),
      ...(context.affectedCount !== undefined && { affectedCount: context.affectedCount }),
      ...(context.warnings && { warnings: context.warnings }),
    },
    ...(suggestions && { suggestions }),
  };
}

/**
 * Format validation errors with details
 */
export function formatValidationError(
  field: string,
  provided: unknown,
  expected: string,
  toolName: string
): ErrorResponse {
  let suggestion = `Please provide ${field} as ${expected}`;
  
  // Add specific suggestions based on field type
  if (field.includes('Id') && expected.includes('UUID')) {
    suggestion = `Please provide ${field} as a valid UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)`;
  } else if (field === 'priority') {
    suggestion = 'Please use priority values: 1=minimal, 2=low, 3=medium, 4=high, 5=critical';
  } else if (field === 'status') {
    suggestion = 'Please use one of: pending, in_progress, completed, blocked, cancelled';
  } else if (field === 'tags') {
    suggestion = 'Please provide tags as an array of strings (lowercase, alphanumeric, hyphens, underscores)';
  }

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: `Invalid ${field}: expected ${expected}`,
      field,
      provided,
      expected,
      suggestion,
    },
    context: {
      tool: toolName,
      operation: 'parameter_validation',
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Common error codes and their descriptions
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'Parameter validation failed',
  NOT_FOUND: 'Requested resource not found',
  INVALID_UUID: 'Invalid UUID format provided',
  INVALID_PRIORITY: 'Invalid priority value',
  MISSING_REQUIRED_PARAMETER: 'Required parameter missing',
  DEPENDENCY_CYCLE: 'Circular dependency detected',
  TASK_BLOCKED: 'Task is blocked by dependencies',
  UNKNOWN_ERROR: 'An unexpected error occurred',
} as const;

/**
 * Generate contextual suggestions based on error type and tool
 */
export function generateContextualSuggestions(
  errorCode: string,
  toolName: string,
  field?: string
): string[] {
  const suggestions: string[] = [];

  switch (errorCode) {
    case 'VALIDATION_ERROR':
      suggestions.push('Check parameter types and formats');
      if (field?.includes('Id')) {
        suggestions.push('Ensure UUIDs are properly formatted');
      }
      break;
      
    case 'NOT_FOUND':
      suggestions.push('Verify the resource exists');
      suggestions.push('Use list_all_lists to see available lists');
      break;
      
    case 'INVALID_PRIORITY':
      suggestions.push('Use priority 1-5: 1=minimal, 2=low, 3=medium, 4=high, 5=critical');
      break;
      
    case 'DEPENDENCY_CYCLE':
      suggestions.push('Check task dependencies for circular references');
      suggestions.push('Use analyze_task_dependencies to visualize dependency graph');
      break;
  }

  // Tool-specific suggestions
  if (toolName.includes('task') && !toolName.includes('list')) {
    suggestions.push('Ensure the list exists before adding/updating tasks');
  }

  return suggestions;
}

/**
 * Error formatting context interface
 */
export interface ErrorFormattingContext {
  toolName: string;
  includeExamples?: boolean;
  includeContext?: boolean;
}

/**
 * Create error context for formatting
 */
export function createErrorContext(
  toolName: string, 
  includeContext: boolean = true
): ErrorFormattingContext {
  return {
    toolName,
    includeExamples: includeContext, // Default to same as includeContext
    includeContext,
  };
}

/**
 * Enhanced Error Formatter class with comprehensive validation error handling
 */
export class ErrorFormatter {
  /**
   * Format Zod validation errors into structured error messages
   */
  static formatValidationError(
    error: ZodError,
    context?: ErrorFormattingContext
  ): EnhancedErrorMessage[] {
    if (!error || !error.issues) {
      return [];
    }

    return error.issues.map(issue => this.formatSingleIssue(issue, context));
  }

  /**
   * Format multiple errors for display with emojis and structure
   */
  static formatErrorsForDisplay(
    errors: EnhancedErrorMessage[],
    options: DisplayOptions = {}
  ): string {
    if (errors.length === 0) {
      return '';
    }

    const {
      includeSuggestions = true,
      includeExamples = true,
      maxErrors = 10,
    } = options;

    const displayErrors = errors.slice(0, maxErrors);
    const parts: string[] = [];

    // Header for multiple errors
    if (errors.length > 1) {
      parts.push(`❌ Found ${errors.length} validation errors:`);
    }

    // Format each error
    displayErrors.forEach((error, index) => {
      const prefix = errors.length > 1 ? `${index + 1}. ` : '❌ ';
      let errorLine = `${prefix}${error.message}`;
      
      if (error.suggestion && includeSuggestions) {
        errorLine += `\n💡 ${error.suggestion}`;
      }
      
      if (error.example && includeExamples) {
        errorLine += `\n📝 Example: ${error.example}`;
      }
      
      // Only show closestMatch if it's not already in the suggestion
      if (error.closestMatch && (!error.suggestion || !error.suggestion.includes(error.closestMatch))) {
        errorLine += `\n💡 Did you mean "${error.closestMatch}"?`;
      }
      
      parts.push(errorLine);
    });

    // Show truncation message if needed
    if (errors.length > maxErrors) {
      parts.push(`... and ${errors.length - maxErrors} more errors`);
    }

    return parts.join('\n\n');
  }

  /**
   * Format a single Zod issue into an enhanced error message
   */
  private static formatSingleIssue(
    issue: ZodIssue,
    context?: ErrorFormattingContext
  ): EnhancedErrorMessage {
    const field = issue.path.join('.') || 'parameter';
    let code = issue.code;
    
    // Special case for UUID validation - keep original code but handle in message
    if (issue.code === 'invalid_string') {
      const stringIssue = issue as any;
      if (stringIssue.validation === 'uuid') {
        // Keep the original code but we'll handle UUID-specific messaging in createBaseMessage
      }
    }
    
    let message = this.createBaseMessage(issue, field);
    let closestMatch: string | undefined;

    // Handle enum errors with fuzzy matching
    if (issue.code === 'invalid_enum_value') {
      const enumIssue = issue as any;
      if (enumIssue.options && enumIssue.received) {
        closestMatch = this.findClosestEnumMatch(
          String(enumIssue.received),
          enumIssue.options
        );
      }
    }

    let suggestion = this.createSuggestion(issue, field, context?.toolName, closestMatch);
    let example = this.createExample(issue, field, context?.toolName);

    const result: EnhancedErrorMessage = {
      field,
      message,
      code,
    };
    
    if (suggestion) {
      result.suggestion = suggestion;
    }
    
    if (example) {
      result.example = example;
    }
    
    if (closestMatch) {
      result.closestMatch = closestMatch;
    }
    
    return result;
  }

  /**
   * Create base error message from Zod issue
   */
  private static createBaseMessage(issue: ZodIssue, field: string): string {
    // For nested fields, include the field name in the message
    const includeFieldInMessage = field.includes('.');
    
    switch (issue.code) {
      case 'invalid_type':
        const typeIssue = issue as any;
        const baseMessage = `Expected ${typeIssue.expected}, but received ${typeIssue.received}`;
        return includeFieldInMessage ? `${field}: ${baseMessage}` : baseMessage;
      
      case 'too_small':
        const smallIssue = issue as any;
        if (smallIssue.type === 'string') {
          return `Text must be at least ${smallIssue.minimum} characters long`;
        }
        return `Value must be at least ${smallIssue.minimum}`;
      
      case 'too_big':
        const bigIssue = issue as any;
        if (bigIssue.type === 'string') {
          return `Text must be no more than ${bigIssue.maximum} characters long`;
        }
        return `Value must be no more than ${bigIssue.maximum}`;
      
      case 'invalid_string':
        const stringIssue = issue as any;
        if (stringIssue.validation === 'uuid') {
          return 'Invalid UUID format';
        }
        return issue.message;
      
      case 'invalid_enum_value':
        const enumIssue = issue as any;
        const options = enumIssue.options?.join(', ') || 'valid options';
        return `Invalid option. Valid choices are: ${options}`;
      
      case 'custom':
        return issue.message || 'Email must contain @ symbol';
      
      default:
        return issue.message;
    }
  }

  /**
   * Create contextual suggestion based on error type and tool
   */
  private static createSuggestion(
    issue: ZodIssue,
    field: string,
    toolName?: string,
    closestMatch?: string
  ): string | undefined {
    // Handle enum errors with fuzzy matching first
    if (issue.code === 'invalid_enum_value' && closestMatch) {
      return `Did you mean "${closestMatch}"?`;
    }

    // Tool-specific suggestions
    if (toolName) {
      const toolSuggestion = this.getToolSpecificSuggestion(issue, field, toolName);
      if (toolSuggestion) return toolSuggestion;
    }

    // Generic suggestions based on field name and error type
    switch (issue.code) {
      case 'invalid_type':
        const typeIssue = issue as any;
        if (typeIssue.expected === 'number' && field === 'priority') {
          // Check if this is for an unknown tool
          if (toolName === 'unknown_tool') {
            return 'Please provide a value of type number';
          }
          return 'Use numbers 1-5, where 5 is highest priority';
        }
        if (typeIssue.expected === 'array' && field === 'tags') {
          return 'Provide as array of strings, e.g., ["urgent", "important"]';
        }
        if (typeIssue.expected === 'number' && field === 'estimatedDuration') {
          return 'Provide duration in minutes as a number';
        }
        if (typeIssue.expected === 'array') {
          return 'Provide as array of strings or JSON string format';
        }
        if (typeIssue.expected === 'object') {
          return 'Provide as object or JSON format';
        }
        if (typeIssue.expected === 'boolean') {
          return 'Please provide a value of type boolean';
        }

        // For deeply nested fields, use generic suggestion
        if (field.includes('.')) {
          return `Please provide a value of type ${typeIssue.expected}`;
        }
        return `Provide ${field} as ${typeIssue.expected}`;
      
      case 'invalid_string':
        if (field.includes('Id')) {
          return 'UUID must be in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
        }
        return 'Check the format and try again';
      
      case 'invalid_enum_value':
        const enumIssue = issue as any;
        if (field === 'status' || field.startsWith('status.')) {
          // Check if we have a close match, if not provide general guidance
          if (!closestMatch) {
            return `Please choose one of: ${enumIssue.options?.join(', ') || 'pending, in_progress, completed, blocked, cancelled'}`;
          }
          return 'Use one of: pending, in_progress, completed, blocked, cancelled';
        }
        if (enumIssue.options) {
          // If no close match found, provide general guidance
          if (!closestMatch) {
            return `Please choose one of: ${enumIssue.options.join(', ')}`;
          }
          return `Please choose one of: ${enumIssue.options.join(', ')}`;
        }
        return 'Use a valid option from the allowed values';
      
      case 'too_small':
        const smallIssue = issue as any;
        if (field === 'priority') {
          return `Please provide a value of ${smallIssue.minimum} or greater`;
        }
        if (smallIssue.type === 'string') {
          return `Please provide text with ${smallIssue.minimum} or more characters`;
        }
        return `Please provide a value of ${smallIssue.minimum} or greater`;
      
      case 'too_big':
        const bigIssue2 = issue as any;
        if (field === 'priority') {
          return `Please provide a value of ${bigIssue2.maximum} or less`;
        }
        if (bigIssue2.type === 'string') {
          return `Please shorten your text to ${bigIssue2.maximum} characters or less`;
        }
        return `Please provide a value of ${bigIssue2.maximum} or less`;
      
      case 'custom':
        return 'Please check your input and try again';
      
      default:
        return undefined;
    }
  }

  /**
   * Create example based on error type and field
   */
  private static createExample(
    issue: ZodIssue,
    field: string,
    toolName?: string
  ): string | undefined {
    // Get tool-specific examples
    if (toolName) {
      const toolExample = this.getToolSpecificExample(field, toolName);
      if (toolExample) return toolExample;
    }

    // Handle specific cases based on issue type
    if (issue.code === 'invalid_type') {
      const typeIssue = issue as any;
      if (typeIssue.expected === 'array' && field === 'tags') {
        return '["item1", "item2"] or use JSON format';
      }
      if (typeIssue.expected === 'object') {
        return '{"key": "value"} or use JSON format';
      }
    }

    // Handle unknown tool cases
    if (toolName === 'unknown_tool') {
      if (field === 'priority') {
        return '42 or 3.14';
      }
    }

    // Generic examples
    switch (field) {
      case 'priority':
        return '5 (highest) to 1 (lowest)';
      case 'tags':
        return '["urgent", "important", "bug-fix"]';
      case 'estimatedDuration':
        return '120 (for 2 hours)';
      case 'status':
        return '"pending", "in_progress", "completed"';
      case 'enabled':
        return 'true or false';
      default:
        if (field.includes('Id')) {
          return 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
        }
        return undefined;
    }
  }

  /**
   * Get tool-specific suggestion
   */
  private static getToolSpecificSuggestion(
    issue: ZodIssue,
    field: string,
    toolName: string
  ): string | undefined {
    // Handle specific tool cases
    if (toolName === 'add_task') {
      if (field === 'tags' && issue.code === 'invalid_type') {
        return 'Provide as array of strings or JSON string format';
      }
      if (field === 'priority' && issue.code === 'invalid_type') {
        return 'Use numbers 1-5, where 5 is highest priority';
      }
    }
    
    if (toolName === 'search_tool') {
      if (field === 'status' && issue.code === 'invalid_enum_value') {
        return 'Use one of the valid status values';
      }
      if (field === 'priority' && issue.code === 'invalid_type') {
        return 'Use numbers 1-5 to filter by priority level';
      }
    }

    const commonMistakes = getCommonMistakes(toolName);
    
    // Find relevant mistake for this field
    const relevantMistake = commonMistakes.find(mistake =>
      mistake.mistake.toLowerCase().includes(field.toLowerCase()) ||
      mistake.fix.toLowerCase().includes(field.toLowerCase())
    );
    
    return relevantMistake?.fix;
  }

  /**
   * Get tool-specific example
   */
  private static getToolSpecificExample(
    field: string,
    toolName: string
  ): string | undefined {
    // Handle specific tool cases first
    if (toolName === 'add_task') {
      if (field === 'tags') {
        return '["urgent", "important", "bug-fix"]';
      }
      if (field === 'priority') {
        return '5 (highest) to 1 (lowest)';
      }
      if (field === 'estimatedDuration') {
        return '120 (for 2 hours in minutes)';
      }
    }
    
    const toolExamples = getToolExamples(toolName);
    if (!toolExamples) return undefined;
    
    const paramExample = toolExamples.parameters.find(p => p.name === field);
    if (paramExample) {
      return JSON.stringify(paramExample.correct);
    }
    
    return undefined;
  }

  /**
   * Find closest enum match using fuzzy matching
   */
  private static findClosestEnumMatch(
    input: string,
    options: string[]
  ): string | undefined {
    if (!input || !options || options.length === 0) return undefined;
    
    const inputLower = input.toLowerCase();
    
    // For very short inputs (1-2 characters), don't suggest specific matches
    // as they are too ambiguous - let the caller handle this case
    if (input.length <= 2) {
      // Check for exact match first
      const exactMatch = options.find(opt => opt.toLowerCase() === inputLower);
      if (exactMatch) return exactMatch;
      
      // For very short inputs, don't suggest partial matches as they're too ambiguous
      return undefined;
    }
    
    // Exact match (case insensitive)
    const exactMatch = options.find(opt => opt.toLowerCase() === inputLower);
    if (exactMatch) return exactMatch;
    
    // Partial match
    const partialMatch = options.find(opt => 
      opt.toLowerCase().includes(inputLower) || 
      inputLower.includes(opt.toLowerCase())
    );
    if (partialMatch) return partialMatch;
    
    // Levenshtein distance for close matches
    let closestMatch = options[0];
    let minDistance = this.levenshteinDistance(inputLower, options[0]!.toLowerCase());
    
    for (const option of options.slice(1)) {
      const distance = this.levenshteinDistance(inputLower, option.toLowerCase());
      if (distance < minDistance) {
        minDistance = distance;
        closestMatch = option;
      }
    }
    
    // Only suggest if reasonably close (distance <= 2 for short strings)
    const maxDistance = Math.max(2, Math.floor(input.length / 3));
    return minDistance <= maxDistance ? closestMatch : undefined;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    
    for (let i = 0; i <= a.length; i++) matrix[0]![i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j]![0] = j;
    
    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j]![i] = Math.min(
          matrix[j - 1]![i] + 1,     // deletion
          matrix[j]![i - 1] + 1,     // insertion
          matrix[j - 1]![i - 1] + cost // substitution
        );
      }
    }
    
    return matrix[b.length]![a.length]!;
  }
}

/**
 * Format Zod validation errors with user-friendly messages
 */
export function formatZodError(
  error: any,
  context: ErrorFormattingContext
): string {
  if (!error || !error.issues) {
    return 'Validation error occurred';
  }

  const formatted = ErrorFormatter.formatValidationError(error, context);
  const messages: string[] = [];
  
  // Add header for multiple validation errors
  if (formatted.length > 1) {
    messages.push(`Found ${formatted.length} validation errors:`);
  }
  
  for (const errorMsg of formatted) {
    let message = `❌ ${errorMsg.field}: ${errorMsg.message}`;
    
    // For enum errors, handle suggestions and closest matches specially
    if (errorMsg.code === 'invalid_enum_value') {
      if (errorMsg.closestMatch) {
        message += `\n💡 Did you mean "${errorMsg.closestMatch}"?`;
      } else if (errorMsg.suggestion) {
        message += `\n💡 ${errorMsg.suggestion}`;
      }
    } else {
      // For non-enum errors, add suggestion with lightbulb emoji if available
      if (errorMsg.suggestion) {
        message += `\n💡 ${errorMsg.suggestion}`;
      }
      
      // Add closest match suggestion if available
      if (errorMsg.closestMatch && (!errorMsg.suggestion || !errorMsg.suggestion.includes(errorMsg.closestMatch))) {
        message += `\n💡 Did you mean "${errorMsg.closestMatch}"?`;
      }
    }
    
    // Add example if available
    if (errorMsg.example) {
      message += `\n📝 Example: ${errorMsg.example}`;
    }
    
    messages.push(message);
  }
  
  // Add common fixes section
  const commonMistakes = getCommonMistakes(context.toolName);
  if (commonMistakes.length > 0) {
    messages.push('');
    messages.push('🔧 Common fixes:');
    
    commonMistakes.slice(0, 3).forEach((mistake, index) => {
      messages.push(`${index + 1}. ${mistake.fix}`);
      if (mistake.example) {
        messages.push(`   Example: ${JSON.stringify(mistake.example)}`);
      }
    });
  }
  
  // Add working example section
  if (context.includeExamples) {
    const toolExamples = getToolExamples(context.toolName);
    if (toolExamples && toolExamples.examples.length > 0) {
      // Prefer simple examples for error responses
      const simpleExample = toolExamples.examples.find(e => 
        e.description.toLowerCase().includes('simple') ||
        e.description.toLowerCase().includes('basic')
      ) || toolExamples.examples[0];
      
      messages.push('');
      messages.push('📝 Working example:');
      messages.push(`${JSON.stringify(simpleExample!.parameters, null, 2)}`);
    }
  }
  
  return messages.join('\n');
}