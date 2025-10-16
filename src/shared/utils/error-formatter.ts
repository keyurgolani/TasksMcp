/**
 * Error formatting utilities
 * Provides detailed error messages with context and actionable guidance
 */

import {
  ValidationError,
  OrchestrationError,
} from '../errors/orchestration-error.js';

import { ENUM_MATCHER } from './enum-matcher.js';

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
 * Creates a detailed validation error with complete information
 */
export function createValidationError(
  message: string,
  options: DetailedErrorOptions
): ValidationError {
  const { context, actionableGuidance, includeValueDetails = true } = options;

  let detailedMessage = message;

  // Add length information if available
  if (context.actualLength !== undefined && context.maxLength !== undefined) {
    detailedMessage += ` (current: ${context.actualLength} characters, maximum: ${context.maxLength} characters)`;
  } else if (
    context.actualLength !== undefined &&
    context.minLength !== undefined
  ) {
    detailedMessage += ` (current: ${context.actualLength} characters, minimum: ${context.minLength} characters)`;
  }

  // Add valid options if available
  if (context.validOptions && context.validOptions.length > 0) {
    detailedMessage += `. Valid options: ${context.validOptions.join(', ')}`;
  }

  // Generate actionable guidance if not provided
  let guidance = actionableGuidance;
  if (!guidance) {
    guidance = generateActionableGuidance(context);
  }

  return new ValidationError(
    detailedMessage,
    context.operation,
    includeValueDetails ? context.currentValue : undefined,
    context.expectedValue,
    guidance
  );
}

/**
 * Creates a detailed orchestration error with complete information
 */
export function createOrchestrationError(
  message: string,
  options: DetailedErrorOptions
): OrchestrationError {
  const { context, actionableGuidance, includeValueDetails = true } = options;

  let detailedMessage = message;

  // Add contextual information
  if (context.field) {
    detailedMessage = `${context.field}: ${detailedMessage}`;
  }

  // Add length information if available
  if (context.actualLength !== undefined && context.maxLength !== undefined) {
    detailedMessage += ` (current: ${context.actualLength}, maximum: ${context.maxLength})`;
  }

  // Generate actionable guidance if not provided
  let guidance = actionableGuidance;
  if (!guidance) {
    guidance = generateActionableGuidance(context);
  }

  return new OrchestrationError(
    detailedMessage,
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
export const ERROR_CONTEXTS = {
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
export const DETAILED_ERRORS = {
  /**
   * Creates a detailed required field error
   */
  requiredField: (field: string, operation: string): ValidationError =>
    createValidationError(`${field} is required`, {
      context: ERROR_CONTEXTS.requiredField(field, operation),
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
        ...ERROR_CONTEXTS.lengthValidation(
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
      context: ERROR_CONTEXTS.typeValidation(
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
      context: ERROR_CONTEXTS.notFound(resourceType, operation, id),
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
      context: ERROR_CONTEXTS.optionsValidation(
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
      context: ERROR_CONTEXTS.rangeValidation(
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
 * Generate enhanced error messages with agent-friendly guidance
 */
function generateEnhancedErrorMessages(
  errors: unknown[],
  originalInput?: unknown
): string[] {
  const messages: string[] = [];

  for (const error of errors) {
    if (error && typeof error === 'object') {
      const zodIssue = error as {
        code?: string;
        path?: string[];
        message?: string;
        maximum?: number;
        minimum?: number;
        values?: string[];
        expected?: string;
        received?: unknown;
      };

      const fieldPath = zodIssue.path?.join('.') || 'field';
      let enhancedMessage = '';

      // Priority field errors
      if (fieldPath === 'priority') {
        if (zodIssue.code === 'too_big' && zodIssue.maximum !== undefined) {
          enhancedMessage = `Priority must be between 1-5. Use numbers 1-5, where 5 (highest) to 1 (lowest).`;
        } else if (
          zodIssue.code === 'too_small' &&
          zodIssue.minimum !== undefined
        ) {
          enhancedMessage = `Priority must be between 1-5. Use numbers 1-5, where 5 (highest) to 1 (lowest).`;
        } else if (
          zodIssue.code === 'invalid_type' &&
          zodIssue.expected === 'number'
        ) {
          enhancedMessage = `Priority must be a number. Use numbers 1-5, where 5 is highest priority and 1 is lowest.`;
        }
      }
      // Tags field errors
      else if (fieldPath === 'tags') {
        if (zodIssue.code === 'invalid_type' && zodIssue.expected === 'array') {
          enhancedMessage = `Tags must be provided as array of strings. Provide as array of strings. Example: ["urgent", "important", "bug-fix"]`;
        }
      }
      // Status field errors
      else if (fieldPath.includes('status')) {
        // Handle various enum error codes and property names
        const enumValues = zodIssue.values ||
          (zodIssue as unknown as { options?: string[] }).options || [
            'pending',
            'in_progress',
            'completed',
            'blocked',
            'cancelled',
          ];
        const isEnumError =
          zodIssue.code === 'invalid_value' ||
          zodIssue.code === 'invalid_enum_value' ||
          zodIssue.code === 'invalid_literal' ||
          zodIssue.message?.includes('Invalid enum value') ||
          fieldPath.includes('status'); // Assume status fields are enums

        if (isEnumError && enumValues) {
          enhancedMessage = `Invalid status value. 💡 Please choose one of: ${enumValues.join(', ')}`;

          // Apply fuzzy matching for enum values
          if (originalInput && typeof originalInput === 'object') {
            const inputObj = originalInput as Record<string, unknown>;
            let invalidValue: string | undefined;

            // Extract the invalid value from the original input based on the path
            if (zodIssue.path && zodIssue.path.length > 0) {
              let current: unknown = inputObj;
              for (const pathSegment of zodIssue.path) {
                if (
                  current &&
                  typeof current === 'object' &&
                  pathSegment in current
                ) {
                  current = (current as Record<string, unknown>)[pathSegment];
                } else {
                  current = undefined;
                  break;
                }
              }
              if (typeof current === 'string') {
                invalidValue = current;
              }
            } else if (fieldPath.includes('status') && 'status' in inputObj) {
              // Handle direct status field
              const statusValue = inputObj['status'];
              if (
                Array.isArray(statusValue) &&
                statusValue.length > 0 &&
                typeof statusValue[0] === 'string'
              ) {
                invalidValue = statusValue[0];
              } else if (typeof statusValue === 'string') {
                invalidValue = statusValue;
              }
            }

            // Also check if zodIssue has received value directly
            if (
              !invalidValue &&
              zodIssue.received &&
              typeof zodIssue.received === 'string'
            ) {
              invalidValue = zodIssue.received;
            }

            // Apply fuzzy matching if we found the invalid value
            if (invalidValue && Array.isArray(enumValues)) {
              const matchResult = ENUM_MATCHER.findClosestEnumValue(
                invalidValue,
                enumValues
              );
              if (matchResult.match && matchResult.confidence > 0.2) {
                enhancedMessage += `\nDid you mean "${matchResult.match}"?`;
              }
            }
          }
        }
      }
      // Duration field errors
      else if (fieldPath === 'estimatedDuration') {
        if (
          zodIssue.code === 'invalid_type' &&
          zodIssue.expected === 'number'
        ) {
          enhancedMessage = `Duration must be a number. Please provide a value of type number. Provide duration in minutes as a number (e.g., 120 for 2 hours).`;
        }
      }
      // Generic type errors (but not for deeply nested paths)
      else if (
        zodIssue.code === 'invalid_type' &&
        zodIssue.expected === 'number' &&
        (!zodIssue.path || zodIssue.path.length <= 2)
      ) {
        enhancedMessage = `${fieldPath} must be a number. Please provide a value of type number.`;
      }

      if (enhancedMessage) {
        messages.push(enhancedMessage);
      }
    }
  }

  return messages;
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
      '{\n  "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",\n  "title": "New task"';

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
  return '{\n  "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",\n  "title": "New task"\n}';
}

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
  _originalInput?: unknown
): string {
  if (error instanceof ValidationError) {
    return formatValidationErrors([error]);
  }

  // Handle ZodError instances with detailed formatting
  if (error && typeof error === 'object' && 'issues' in error) {
    const zodError = error as { issues: unknown[] };
    const errors = zodError.issues;

    // Check if we should provide enhanced error messages
    const enhancedMessages = generateEnhancedErrorMessages(
      errors,
      _originalInput
    );
    if (enhancedMessages.length > 0) {
      let result = '❌ Validation error:\n';

      enhancedMessages.forEach((msg: string, index: number) => {
        if (enhancedMessages.length > 1) {
          result += `${index + 1}. ${msg}\n`;
        } else {
          result += `${msg}\n`;
        }
      });

      result += '\n💡 Guidance:';
      result += '\n• Please check the parameter format and try again';

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
        const example = generateContextualExample(context.toolName, errors);
        result += `\n${example}`;
      }

      return result;
    }

    // Fallback to original format if no enhanced messages
    // For deeply nested errors, preserve the original Zod error structure
    const hasDeepNesting = errors.some(
      error =>
        error &&
        typeof error === 'object' &&
        'path' in error &&
        Array.isArray((error as { path?: unknown[] }).path) &&
        (error as { path: unknown[] }).path.length > 2
    );

    let result = '';
    if (hasDeepNesting) {
      // For deeply nested errors, show the original Zod error messages
      result = `❌ Validation error:\n`;
      errors.forEach((error: unknown) => {
        if (
          error &&
          typeof error === 'object' &&
          'path' in error &&
          'message' in error
        ) {
          const errorObj = error as { path?: string[]; message?: string };
          const fieldPath = errorObj.path?.join('.') || 'field';
          result += `${fieldPath}: ${errorObj.message}\n`;
        }
      });
    } else {
      result = `❌ Validation error: ${JSON.stringify(errors, null, 2)}`;
    }

    // Add guidance section
    result += '\n💡 Guidance:';
    result += '\n• Please check the parameter format and try again';

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
      '\n{\n  "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",\n  "title": "New task"\n}';
  }

  return result;
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

    // Handle ZodError instances with detailed formatting
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
            received?: unknown;
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
              suggestion = 'Use numbers 1-5';
              example = '5';
            }
          } else if (fieldPath === 'tags') {
            if (
              zodIssue.code === 'invalid_type' &&
              zodIssue.expected === 'array'
            ) {
              suggestion = 'array of strings';
              example = '["urgent", "important", "bug-fix"]';
            }
          } else if (fieldPath.includes('status')) {
            if (zodIssue.code === 'invalid_value' && zodIssue.values) {
              suggestion = `Please choose one of: ${zodIssue.values.join(', ')}`;

              // Apply fuzzy matching for enum values
              if (zodIssue.received && typeof zodIssue.received === 'string') {
                const matchResult = ENUM_MATCHER.findClosestEnumValue(
                  zodIssue.received,
                  zodIssue.values
                );
                if (matchResult.match && matchResult.confidence > 0.3) {
                  closestMatch = matchResult.match;
                }
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

              // Apply fuzzy matching for enum values
              if (zodIssue.received && typeof zodIssue.received === 'string') {
                const matchResult = ENUM_MATCHER.findClosestEnumValue(
                  zodIssue.received,
                  zodIssue.values
                );
                if (matchResult.match && matchResult.confidence > 0.3) {
                  closestMatch = matchResult.match;
                }
              }
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
      // Convert to a format that tests expect
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

// Export aliases for backward compatibility
export { DETAILED_ERRORS as DetailedErrors };
export { ERROR_CONTEXTS as ErrorContexts };
