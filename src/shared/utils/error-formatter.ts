/**
 * Enhanced error formatting utilities
 * Provides detailed error messages with context and actionable guidance
 */

import {
  ValidationError,
  OrchestrationError,
} from '../errors/orchestration-error.js';

export interface ErrorContext {
  operation: string;
  field?: string;
  currentValue?: unknown;
  expectedValue?: unknown;
  actualLength?: number;
  maxLength?: number;
  minLength?: number;
  validOptions?: string[];
  additionalContext?: Record<string, unknown>;
}

export interface DetailedErrorOptions {
  context: ErrorContext;
  actionableGuidance?: string;
  includeValueDetails?: boolean;
}

/**
 * Creates a detailed validation error with comprehensive information
 */
export function createValidationError(
  message: string,
  options: DetailedErrorOptions
): ValidationError {
  const { context, actionableGuidance, includeValueDetails = true } = options;

  let enhancedMessage = message;

  // Add length information if available
  if (context.actualLength !== undefined && context.maxLength !== undefined) {
    enhancedMessage += ` (current: ${context.actualLength} characters, maximum: ${context.maxLength} characters)`;
  } else if (
    context.actualLength !== undefined &&
    context.minLength !== undefined
  ) {
    enhancedMessage += ` (current: ${context.actualLength} characters, minimum: ${context.minLength} characters)`;
  }

  // Add valid options if available
  if (context.validOptions && context.validOptions.length > 0) {
    enhancedMessage += `. Valid options: ${context.validOptions.join(', ')}`;
  }

  // Generate actionable guidance if not provided
  let guidance = actionableGuidance;
  if (!guidance) {
    guidance = generateActionableGuidance(context);
  }

  return new ValidationError(
    enhancedMessage,
    context.operation,
    includeValueDetails ? context.currentValue : undefined,
    context.expectedValue,
    guidance
  );
}

/**
 * Creates a detailed orchestration error with comprehensive information
 */
export function createOrchestrationError(
  message: string,
  options: DetailedErrorOptions
): OrchestrationError {
  const { context, actionableGuidance, includeValueDetails = true } = options;

  let enhancedMessage = message;

  // Add contextual information
  if (context.field) {
    enhancedMessage = `${context.field}: ${enhancedMessage}`;
  }

  // Add length information if available
  if (context.actualLength !== undefined && context.maxLength !== undefined) {
    enhancedMessage += ` (current: ${context.actualLength}, maximum: ${context.maxLength})`;
  }

  // Generate actionable guidance if not provided
  let guidance = actionableGuidance;
  if (!guidance) {
    guidance = generateActionableGuidance(context);
  }

  return new OrchestrationError(
    enhancedMessage,
    context.operation,
    includeValueDetails ? context.currentValue : undefined,
    context.expectedValue,
    guidance
  );
}

/**
 * Generates actionable guidance based on error context
 */
function generateActionableGuidance(context: ErrorContext): string {
  const {
    field,
    currentValue,
    expectedValue,
    actualLength,
    maxLength,
    minLength,
    validOptions,
  } = context;

  // Length-based guidance
  if (
    actualLength !== undefined &&
    maxLength !== undefined &&
    actualLength > maxLength
  ) {
    const excess = actualLength - maxLength;
    return `Reduce the ${field || 'value'} by ${excess} characters to meet the ${maxLength} character limit. Consider using more concise language or breaking into multiple ${field || 'fields'}.`;
  }

  if (
    actualLength !== undefined &&
    minLength !== undefined &&
    actualLength < minLength
  ) {
    const needed = minLength - actualLength;
    return `Add at least ${needed} more characters to the ${field || 'value'} to meet the ${minLength} character minimum requirement.`;
  }

  // Type-based guidance
  if (expectedValue === 'string' && typeof currentValue !== 'string') {
    return `Convert the ${field || 'value'} to a string. Current type: ${typeof currentValue}`;
  }

  if (expectedValue === 'number' && typeof currentValue !== 'number') {
    return `Provide a numeric value for ${field || 'the field'}. Current type: ${typeof currentValue}`;
  }

  if (expectedValue === 'array' && !Array.isArray(currentValue)) {
    return `Provide an array for ${field || 'the field'}. Current type: ${typeof currentValue}`;
  }

  if (
    expectedValue === 'object' &&
    (typeof currentValue !== 'object' || currentValue === null)
  ) {
    return `Provide a valid object for ${field || 'the field'}. Current type: ${typeof currentValue}`;
  }

  // Options-based guidance
  if (validOptions && validOptions.length > 0) {
    return `Choose one of the valid options: ${validOptions.join(', ')}. Current value "${currentValue}" is not supported.`;
  }

  // Required field guidance
  if (
    currentValue === undefined ||
    currentValue === null ||
    currentValue === ''
  ) {
    return `The ${field || 'field'} is required and cannot be empty. Please provide a valid value.`;
  }

  // Generic guidance
  if (expectedValue) {
    return `Ensure the ${field || 'value'} matches the expected format: ${expectedValue}`;
  }

  return `Please review and correct the ${field || 'value'} according to the validation requirements.`;
}

/**
 * Formats validation errors for consistent display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return 'No validation errors';
  }

  if (errors.length === 1) {
    const error = errors[0];
    if (!error) {
      return 'Unknown validation error';
    }
    let message = error.message;

    if (error.actionableGuidance) {
      message += ` ${error.actionableGuidance}`;
    }

    return message;
  }

  // Multiple errors
  let message = `${errors.length} validation errors found:\n`;
  errors.forEach((error, index) => {
    message += `${index + 1}. ${error.message}`;
    if (error.actionableGuidance) {
      message += ` ${error.actionableGuidance}`;
    }
    message += '\n';
  });

  return message.trim();
}

/**
 * Creates error context for common validation scenarios
 */
export const ErrorContexts = {
  /**
   * Creates context for required field validation
   */
  requiredField: (field: string, operation: string): ErrorContext => ({
    operation,
    field,
    currentValue: undefined,
    expectedValue: 'non-empty value',
  }),

  /**
   * Creates context for length validation
   */
  lengthValidation: (
    field: string,
    operation: string,
    actualLength: number,
    maxLength?: number,
    minLength?: number
  ): ErrorContext => ({
    operation,
    field,
    actualLength,
    ...(maxLength !== undefined && { maxLength }),
    ...(minLength !== undefined && { minLength }),
    expectedValue: maxLength
      ? `string with max ${maxLength} characters`
      : minLength
        ? `string with min ${minLength} characters`
        : 'string with valid length',
  }),

  /**
   * Creates context for type validation
   */
  typeValidation: (
    field: string,
    operation: string,
    currentValue: unknown,
    expectedType: string
  ): ErrorContext => ({
    operation,
    field,
    currentValue,
    expectedValue: expectedType,
  }),

  /**
   * Creates context for enum/options validation
   */
  optionsValidation: (
    field: string,
    operation: string,
    currentValue: unknown,
    validOptions: string[]
  ): ErrorContext => ({
    operation,
    field,
    currentValue,
    expectedValue: `one of: ${validOptions.join(', ')}`,
    validOptions,
  }),

  /**
   * Creates context for range validation
   */
  rangeValidation: (
    field: string,
    operation: string,
    currentValue: unknown,
    min: number,
    max: number
  ): ErrorContext => ({
    operation,
    field,
    currentValue,
    expectedValue: `number between ${min} and ${max}`,
    validOptions: [`${min} to ${max}`],
  }),

  /**
   * Creates context for not found errors
   */
  notFound: (
    resourceType: string,
    operation: string,
    id: string
  ): ErrorContext => ({
    operation,
    field: `${resourceType}Id`,
    currentValue: id,
    expectedValue: `valid ${resourceType} ID`,
  }),
};

/**
 * Utility to create common error types with detailed information
 */
export const DetailedErrors = {
  /**
   * Creates a detailed required field error
   */
  requiredField: (field: string, operation: string): ValidationError =>
    createValidationError(`${field} is required`, {
      context: ErrorContexts.requiredField(field, operation),
      actionableGuidance: `Provide a valid ${field} value. This field cannot be empty or undefined.`,
    }),

  /**
   * Creates a detailed length validation error
   */
  lengthExceeded: (
    field: string,
    operation: string,
    actualLength: number,
    maxLength: number,
    currentValue?: string
  ): ValidationError =>
    createValidationError(`${field} exceeds maximum length`, {
      context: {
        ...ErrorContexts.lengthValidation(
          field,
          operation,
          actualLength,
          maxLength
        ),
        currentValue,
      },
    }),

  /**
   * Creates a detailed type validation error
   */
  invalidType: (
    field: string,
    operation: string,
    currentValue: unknown,
    expectedType: string
  ): ValidationError =>
    createValidationError(`${field} must be a ${expectedType}`, {
      context: ErrorContexts.typeValidation(
        field,
        operation,
        currentValue,
        expectedType
      ),
    }),

  /**
   * Creates a detailed not found error
   */
  notFound: (
    resourceType: string,
    operation: string,
    id: string
  ): OrchestrationError =>
    createOrchestrationError(`${resourceType} not found`, {
      context: ErrorContexts.notFound(resourceType, operation, id),
      actionableGuidance: `Ensure the ${resourceType} ID "${id}" exists and is accessible. Check that the ${resourceType} hasn't been deleted and you have proper permissions.`,
    }),

  /**
   * Creates a detailed invalid option error
   */
  invalidOption: (
    field: string,
    operation: string,
    currentValue: unknown,
    validOptions: string[]
  ): ValidationError =>
    createValidationError(`${field} has invalid value`, {
      context: ErrorContexts.optionsValidation(
        field,
        operation,
        currentValue,
        validOptions
      ),
    }),

  /**
   * Creates a detailed range validation error
   */
  outOfRange: (
    field: string,
    operation: string,
    currentValue: number,
    min: number,
    max: number
  ): ValidationError =>
    createValidationError(`${field} is out of valid range`, {
      context: ErrorContexts.rangeValidation(
        field,
        operation,
        currentValue,
        min,
        max
      ),
      actionableGuidance: `Set ${field} to a value between ${min} and ${max}. Current value ${currentValue} is ${currentValue < min ? 'too low' : 'too high'}.`,
    }),
};
/**
 * Legacy compatibility exports
 */

// Legacy formatZodError function for backward compatibility
export function formatZodError(
  error: unknown,
  context: {
    toolName: string;
    includeExamples?: boolean;
    includeContext?: boolean;
  },
  originalInput?: unknown
): string {
  if (error instanceof ValidationError) {
    return formatValidationErrors([error]);
  }

  // Handle ZodError instances with enhanced formatting
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: unknown[] };
    const errors = zodError.issues;

    let result = `❌ Validation error: ${JSON.stringify(errors, null, 2)}`;

    // Always add suggestions section with specific guidance
    result += '\n\n💡 Suggestions:';
    const suggestions = generateZodErrorSuggestions(
      errors,
      context.toolName,
      originalInput
    );
    if (suggestions.length > 0) {
      suggestions.forEach(suggestion => {
        result += `\n• ${suggestion}`;
      });
    } else {
      result += '\n• Please check the parameter format and try again';
    }

    // Add common fixes section if context is provided
    if (context.includeContext !== false) {
      result += '\n\n🔧 Common fixes:';
      result += '\n1. Check parameter types and formats';
      result += '\n2. Ensure all required fields are provided';
      result += '\n3. Verify UUID format for ID fields';
    }

    // Add working example section if examples are enabled
    if (context.includeExamples !== false) {
      result += '\n\n📝 Working example:';

      // Generate context-specific examples based on the tool and errors
      const example = generateContextualExample(context.toolName, errors);
      result += `\n${example}`;
    }

    return result;
  }

  // For non-ValidationError types, create a generic error message with expected formatting
  const errorMessage = error instanceof Error ? error.message : String(error);
  let result = `❌ Validation error: ${errorMessage}`;

  // Add common fixes section if context is provided
  if (context.includeContext !== false) {
    result += '\n\n🔧 Common fixes:';
    result += '\n1. Check parameter types and formats';
    result += '\n2. Ensure all required fields are provided';
    result += '\n3. Verify UUID format for ID fields';
  }

  // Add working example section if examples are enabled
  if (context.includeExamples !== false) {
    result += '\n\n📝 Working example:';
    result +=
      '\n{\n  "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",\n  "title": "Sample task"\n}';
  }

  return result;
}

/**
 * Generate contextual examples based on the tool and error types
 */
function generateContextualExample(
  toolName: string,
  errors: unknown[]
): string {
  const hasTagsError = errors.some(
    error =>
      error &&
      typeof error === 'object' &&
      'path' in error &&
      Array.isArray((error as { path?: unknown }).path) &&
      Array.isArray((error as { path: string[] }).path) &&
      (error as { path: string[] }).path.includes('tags')
  );

  const hasPriorityError = errors.some(
    error =>
      error &&
      typeof error === 'object' &&
      'path' in error &&
      Array.isArray((error as { path?: unknown }).path) &&
      Array.isArray((error as { path: string[] }).path) &&
      (error as { path: string[] }).path.includes('priority')
  );

  const hasDurationError = errors.some(
    error =>
      error &&
      typeof error === 'object' &&
      'path' in error &&
      Array.isArray((error as { path?: unknown }).path) &&
      Array.isArray((error as { path: string[] }).path) &&
      (error as { path: string[] }).path.includes('estimatedDuration')
  );

  // Generate tool-specific examples
  if (toolName === 'add_task' || toolName === 'update_task') {
    let example =
      '{\n  "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",\n  "title": "Sample task"';

    if (hasPriorityError) {
      example += ',\n  "priority": 3';
    }

    if (hasTagsError) {
      example += ',\n  "tags": ["urgent", "important", "bug-fix"]';
    }

    if (hasDurationError) {
      example += ',\n  "estimatedDuration": 120';
    }

    example += '\n}';
    return example;
  }

  // Default example
  return '{\n  "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",\n  "title": "Sample task"\n}';
}

/**
 * Generate specific suggestions for Zod validation errors
 */
function generateZodErrorSuggestions(
  errors: unknown[],
  _toolName: string,
  originalInput?: unknown
): string[] {
  const suggestions: string[] = [];

  for (const error of errors) {
    if (error && typeof error === 'object') {
      const issue = error as {
        code?: string;
        path?: string[];
        message?: string;
        maximum?: number;
        minimum?: number;
        values?: string[];
        expected?: string;
      };

      const fieldPath = issue.path?.join('.') || 'field';

      // Priority field specific suggestions
      if (fieldPath === 'priority') {
        if (issue.code === 'too_big' || issue.code === 'too_small') {
          suggestions.push('Use numbers 1-5, where 5 is highest priority');
          suggestions.push('5 (highest) to 1 (lowest)');
        } else if (
          issue.code === 'invalid_type' &&
          issue.expected === 'number'
        ) {
          suggestions.push('Use numbers 1-5, where 5 is highest priority');
          suggestions.push('Please provide a value of type number');
        }
      }

      // Tags field specific suggestions
      else if (fieldPath === 'tags') {
        if (issue.code === 'invalid_type' && issue.expected === 'array') {
          suggestions.push(
            'Provide as array of strings like ["urgent", "important", "bug-fix"]'
          );
        }
      }

      // Status field specific suggestions
      else if (fieldPath.includes('status')) {
        if (issue.code === 'invalid_value' && issue.values) {
          // Try to get the actual invalid value from the original input
          let currentValue: string | undefined;

          if (
            originalInput &&
            typeof originalInput === 'object' &&
            'status' in originalInput
          ) {
            const statusValue = (originalInput as { status: unknown }).status;
            if (
              Array.isArray(statusValue) &&
              issue.path &&
              issue.path.length > 1
            ) {
              const index = issue.path[1];
              if (typeof index === 'number' && statusValue[index]) {
                currentValue = String(statusValue[index]);
              }
            } else if (typeof statusValue === 'string') {
              currentValue = statusValue;
            }
          }

          // Fallback to extracting from error message
          if (!currentValue) {
            currentValue = issue.message?.match(/"([^"]+)"/)?.[1];
          }

          if (currentValue && issue.values.length > 0) {
            const closestMatch = findClosestMatch(currentValue, issue.values);
            // If input is very short (1-2 characters), show all options instead of fuzzy match
            if (closestMatch && currentValue.length > 2) {
              suggestions.push(`Did you mean "${closestMatch}"?`);
            } else if (currentValue.length <= 2) {
              suggestions.push(
                `💡 Please choose one of: ${issue.values.join(', ')}`
              );
            } else {
              // For longer inputs that don't have a good match, show all choices
              suggestions.push(
                `Please choose one of: ${issue.values.join(', ')}`
              );
            }
          } else {
            suggestions.push(`Valid choices are: ${issue.values.join(', ')}`);
          }
        }
      }

      // Duration field specific suggestions
      else if (fieldPath === 'estimatedDuration') {
        if (issue.code === 'invalid_type' && issue.expected === 'number') {
          suggestions.push(
            'Provide duration in minutes as a number (e.g., 120 for 2 hours)'
          );
        }
      }

      // Generic type suggestions
      else if (issue.code === 'invalid_type') {
        if (issue.expected === 'array') {
          suggestions.push(`Provide ${fieldPath} as array of strings`);
        } else if (issue.expected === 'number') {
          // Special handling for array elements
          if (fieldPath.includes('.')) {
            suggestions.push(`Please provide a value of type number`);
          } else {
            suggestions.push(`Provide ${fieldPath} as a number`);
          }
        } else if (issue.expected === 'string') {
          suggestions.push(`Provide ${fieldPath} as a string`);
        }
      }

      // Enum value suggestions with fuzzy matching
      else if (issue.code === 'invalid_value' && issue.values) {
        // Try multiple patterns to extract the current value
        let currentValue = issue.message?.match(/"([^"]+)"/)?.[1];
        if (!currentValue) {
          // Try alternative patterns
          currentValue = issue.message?.match(/received (\w+)/)?.[1];
        }
        if (!currentValue) {
          // Try another pattern for Zod errors
          currentValue = issue.message?.match(
            /Invalid option: (.+?)(?:\s|$)/
          )?.[1];
        }

        if (currentValue && issue.values.length > 0) {
          const closestMatch = findClosestMatch(currentValue, issue.values);
          if (closestMatch) {
            suggestions.push(`Did you mean "${closestMatch}"?`);
          } else {
            suggestions.push(
              `💡 Please choose one of: ${issue.values.join(', ')}`
            );
          }
        } else {
          suggestions.push(`Valid choices are: ${issue.values.join(', ')}`);
        }
      }
    }
  }

  // Add generic suggestions if no specific ones were found
  if (suggestions.length === 0) {
    suggestions.push('Check parameter types and formats');
    suggestions.push('Ensure all required fields are provided');
    suggestions.push('Verify UUID format for ID fields');
  }

  return suggestions;
}

/**
 * Find the closest match for enum values using simple string similarity
 */
function findClosestMatch(input: string, validValues: string[]): string | null {
  const inputLower = input.toLowerCase();

  // Exact match (case insensitive)
  for (const value of validValues) {
    if (value.toLowerCase() === inputLower) {
      return value;
    }
  }

  // Partial match
  for (const value of validValues) {
    if (
      value.toLowerCase().includes(inputLower) ||
      inputLower.includes(value.toLowerCase())
    ) {
      return value;
    }
  }

  // Simple edit distance for typos
  let bestMatch = null;
  let bestScore = Infinity;

  for (const value of validValues) {
    const score = calculateEditDistance(inputLower, value.toLowerCase());
    if (score < bestScore && score <= 2) {
      // Allow up to 2 character differences
      bestScore = score;
      bestMatch = value;
    }
  }

  return bestMatch;
}

/**
 * Calculate simple edit distance between two strings
 */
function calculateEditDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array(a.length + 1)
    .fill(null)
    .map(() => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) {
    matrix[i]![0] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1, // deletion
        matrix[i]![j - 1]! + 1, // insertion
        matrix[i - 1]![j - 1]! + cost // substitution
      );
    }
  }

  return matrix[a.length]![b.length]!;
}

// Legacy createErrorContext function for backward compatibility
export function createErrorContext(
  toolName: string,
  includeContext: boolean = true
): { toolName: string; includeExamples?: boolean; includeContext?: boolean } {
  return {
    toolName,
    includeExamples: includeContext,
    includeContext,
  };
}
/**
 * Legacy ErrorFormatter class for backward compatibility
 */
export class ErrorFormatter {
  /**
   * Format validation errors (legacy compatibility)
   */
  static formatValidationError(
    error: unknown,
    _context?: {
      toolName: string;
      includeExamples?: boolean;
      includeContext?: boolean;
    },
    _originalInput?: unknown
  ): Array<{
    field: string;
    message: string;
    code: string;
    suggestion?: string;
    example?: string;
    closestMatch?: string;
  }> {
    // For backward compatibility, return empty array for non-errors
    if (!error) {
      return [];
    }

    const results: Array<{
      field: string;
      message: string;
      code: string;
      suggestion?: string;
      example?: string;
      closestMatch?: string;
    }> = [];

    // Handle ZodError instances with enhanced formatting
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as { issues: unknown[] };

      for (const issue of zodError.issues) {
        if (issue && typeof issue === 'object') {
          const zodIssue = issue as {
            code?: string;
            path?: string[];
            message?: string;
            maximum?: number;
            minimum?: number;
            values?: string[];
            expected?: string;
          };

          const fieldPath = zodIssue.path?.join('.') || 'validation';
          let suggestion: string | undefined;
          let example: string | undefined;
          let closestMatch: string | undefined;

          // Generate field-specific suggestions and examples
          if (fieldPath === 'priority') {
            if (
              zodIssue.code === 'too_big' ||
              zodIssue.code === 'too_small' ||
              (zodIssue.code === 'invalid_type' &&
                zodIssue.expected === 'number')
            ) {
              suggestion = 'Use numbers 1-5, where 5 is highest priority';
              example = '5';
            }
          } else if (fieldPath === 'tags') {
            if (
              zodIssue.code === 'invalid_type' &&
              zodIssue.expected === 'array'
            ) {
              suggestion = 'Provide as array of strings';
              example = '["urgent", "important", "bug-fix"]';
            }
          } else if (fieldPath.includes('status')) {
            if (zodIssue.code === 'invalid_value' && zodIssue.values) {
              const currentValue = zodIssue.message?.match(/"([^"]+)"/)?.[1];
              if (currentValue) {
                const match = findClosestMatch(currentValue, zodIssue.values);
                if (match) {
                  closestMatch = match;
                  suggestion = `Did you mean "${closestMatch}"?`;
                } else {
                  suggestion = `Valid choices are: ${zodIssue.values.join(', ')}`;
                }
              } else {
                suggestion = `Valid choices are: ${zodIssue.values.join(', ')}`;
              }
            }
          } else if (fieldPath === 'estimatedDuration') {
            if (
              zodIssue.code === 'invalid_type' &&
              zodIssue.expected === 'number'
            ) {
              suggestion = 'Provide duration in minutes as a number';
              example = '120';
            }
          }

          // Generic suggestions for common cases
          if (!suggestion) {
            if (zodIssue.code === 'invalid_type') {
              if (zodIssue.expected === 'array') {
                suggestion = `Provide ${fieldPath} as array of strings`;
              } else if (zodIssue.expected === 'number') {
                suggestion = `Provide ${fieldPath} as a number`;
              } else if (zodIssue.expected === 'string') {
                suggestion = `Provide ${fieldPath} as a string`;
              }
            } else if (zodIssue.code === 'invalid_value' && zodIssue.values) {
              suggestion = `Valid choices are: ${zodIssue.values.join(', ')}`;
            }
          }

          const result: {
            field: string;
            message: string;
            code: string;
            suggestion?: string;
            example?: string;
            closestMatch?: string;
          } = {
            field: fieldPath,
            message: zodIssue.message || 'Validation error',
            code: zodIssue.code || 'validation_error',
          };

          if (suggestion !== undefined) {
            result.suggestion = suggestion;
          }
          if (example !== undefined) {
            result.example = example;
          }
          if (closestMatch !== undefined) {
            result.closestMatch = closestMatch;
          }

          results.push(result);
        }
      }
    } else {
      // Convert to a simple format that tests expect
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      results.push({
        field: 'validation',
        message: errorMessage,
        code: 'validation_error',
        suggestion: 'Please check your input parameters',
      });
    }

    return results;
  }

  /**
   * Format errors for display (legacy compatibility)
   */
  static formatErrorsForDisplay(
    errors: Array<{
      field: string;
      message: string;
      code: string;
      suggestion?: string;
      example?: string;
      closestMatch?: string;
    }>,
    options?: {
      maxErrors?: number;
      includeSuggestions?: boolean;
      includeExamples?: boolean;
    }
  ): string {
    if (errors.length === 0) {
      return '';
    }

    const {
      maxErrors = 10,
      includeSuggestions = true,
      includeExamples = true,
    } = options || {};
    const displayErrors = errors.slice(0, maxErrors);

    let result = '';
    if (errors.length > 1) {
      result += `❌ Found ${errors.length} validation errors:\n\n`;
    }

    displayErrors.forEach((error, index) => {
      const prefix = errors.length > 1 ? `${index + 1}. ` : '❌ ';
      result += `${prefix}${error.message}`;

      if (error.suggestion && includeSuggestions) {
        result += `\n💡 ${error.suggestion}`;
      }

      if (error.example && includeExamples) {
        result += `\n📝 Example: ${error.example}`;
      }

      if (error.closestMatch) {
        result += `\n💡 Did you mean "${error.closestMatch}"?`;
      }

      if (index < displayErrors.length - 1) {
        result += '\n\n';
      }
    });

    if (errors.length > maxErrors) {
      result += `\n\n... and ${errors.length - maxErrors} more errors`;
    }

    return result;
  }
}
