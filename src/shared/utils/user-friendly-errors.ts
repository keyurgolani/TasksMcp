/**
 * User-friendly error messages for common failure scenarios
 */

import {
  BaseError,
  isActionPlanError,
  isProjectManagementError,
  isNotesManagementError,
  isFormattingError,
  isCleanupError,
  isTaskManagementError,
  ERROR_CODES,
} from '../types/errors.js';

import { logger } from './logger.js';

/**
 * Error message templates for different user contexts
 */
export interface ErrorMessageTemplates {
  technical: string;
  user: string;

  documentation?: string;
}

/**
 * Error context for generating appropriate messages
 */
export interface ErrorContext {
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  operation: string;
  feature: string;
  includeDetails: boolean;
}

/**
 * User-friendly error message generator
 */
export class UserFriendlyErrorMessages {
  private static readonly ERROR_TEMPLATES: Record<
    string,
    ErrorMessageTemplates
  > = {
    // Action Plan Errors
    [ERROR_CODES.ACTION_PLAN_PARSE_ERROR]: {
      technical:
        'Failed to parse action plan content due to invalid format or structure.',
      user: 'The action plan could not be understood. Please check the format and try again.',

      documentation:
        'Action plans should follow a structured format with clear steps.',
    },
    [ERROR_CODES.ACTION_PLAN_STEP_NOT_FOUND]: {
      technical:
        'The specified action plan step could not be located in the plan structure.',
      user: "The step you're looking for doesn't exist in this action plan.",
    },
    [ERROR_CODES.ACTION_PLAN_VALIDATION_ERROR]: {
      technical: 'Action plan data failed validation checks.',
      user: "There's an issue with the action plan format.",
    },

    // Project Management Errors
    [ERROR_CODES.INVALID_PROJECT_TAG]: {
      technical:
        'Project tag does not meet the required format specifications.',
      user: 'The project name contains invalid characters or is too long.',

      documentation:
        'Project tags help organize your tasks and must follow naming conventions.',
    },
    [ERROR_CODES.PROJECT_NOT_FOUND]: {
      technical: 'The specified project identifier could not be resolved.',
      user: "The project you're looking for doesn't exist.",
    },

    // Notes Management Errors
    [ERROR_CODES.NOTE_VALIDATION_ERROR]: {
      technical: 'Implementation note data failed validation requirements.',
      user: "There's an issue with the note you're trying to save.",
    },
    [ERROR_CODES.NOTE_NOT_FOUND]: {
      technical: 'The requested implementation note could not be located.',
      user: "The note you're looking for doesn't exist.",
    },
    [ERROR_CODES.NOTE_TOO_LONG]: {
      technical: 'Note content exceeds the maximum allowed character limit.',
      user: 'Your note is too long.',
    },
    [ERROR_CODES.INVALID_NOTE_TYPE]: {
      technical: 'The specified note type is not recognized by the system.',
      user: "The note type you selected isn't valid.",
    },

    // Formatting Errors
    [ERROR_CODES.PRETTY_PRINT_FORMAT_ERROR]: {
      technical:
        'Pretty print formatting engine encountered an error processing the data.',
      user: 'There was a problem formatting the display.',
    },
    [ERROR_CODES.INVALID_FORMAT_OPTIONS]: {
      technical:
        'Format options contain invalid values or unsupported configurations.',
      user: "Some of your display settings aren't valid.",
    },

    // Cleanup Errors
    [ERROR_CODES.CLEANUP_OPERATION_FAILED]: {
      technical:
        'Cleanup operation could not be completed due to system constraints.',
      user: "The cleanup operation couldn't be completed.",
    },
    [ERROR_CODES.CLEANUP_VALIDATION_ERROR]: {
      technical: 'One or more items failed cleanup validation checks.',
      user: "Some items can't be cleaned up right now.",
    },

    // Validation
    [ERROR_CODES.VALIDATION_ERROR]: {
      technical: 'Validation checks detected data integrity issues.',
      user: "There's an issue with the information you provided.",
    },
  };

  /**
   * Generate user-friendly error message
   */
  static generateMessage(
    error: Error,
    context: Partial<ErrorContext> = {}
  ): string {
    const defaultContext: ErrorContext = {
      userLevel: 'intermediate',
      operation: 'unknown',
      feature: 'task management',
      includeDetails: true,

      ...context,
    };

    try {
      // Handle task management errors
      if (isTaskManagementError(error)) {
        return this.generateErrorMessage(error, defaultContext);
      }

      // Handle standard errors
      return this.generateStandardErrorMessage(error, defaultContext);
    } catch (messageError) {
      logger.error('Failed to generate user-friendly error message', {
        originalError: error.message,
        messageError:
          messageError instanceof Error
            ? messageError.message
            : 'Unknown error',
      });

      return this.getFallbackMessage(error, defaultContext);
    }
  }

  /**
   * Generate message for task management errors
   */
  private static generateErrorMessage(
    error: BaseError | Error,
    context: ErrorContext
  ): string {
    // Only BaseError has code and context properties
    if (!(error instanceof BaseError)) {
      return this.generateGenericMessage(error, context);
    }

    const template = this.ERROR_TEMPLATES[error.code];

    if (!template) {
      return this.generateGenericMessage(error, context);
    }

    const parts: string[] = [];

    // Add main message based on user level
    if (context.userLevel === 'beginner') {
      parts.push(template.user);
    } else if (context.userLevel === 'advanced') {
      parts.push(template.technical);
    } else {
      // Intermediate - combine user and some technical details
      parts.push(template.user);
      if (context.includeDetails && error.context) {
        parts.push(this.formatErrorContext(error.context));
      }
    }

    // Add documentation link for complex errors
    if (context.userLevel === 'beginner' && template.documentation) {
      parts.push(`\nNote: ${template.documentation}`);
    }

    return parts.join('\n');
  }

  /**
   * Generate message for standard errors
   */
  private static generateStandardErrorMessage(
    error: Error,
    context: ErrorContext
  ): string {
    const parts: string[] = [];

    // Categorize error by message content
    const message = error.message.toLowerCase();

    if (message.includes('validation') || message.includes('invalid')) {
      parts.push("There's an issue with the information provided.");
    } else if (message.includes('not found') || message.includes('missing')) {
      parts.push('The requested item could not be found.');
    } else if (
      message.includes('permission') ||
      message.includes('unauthorized')
    ) {
      parts.push("You don't have permission to perform this action.");
    } else if (message.includes('timeout') || message.includes('connection')) {
      parts.push("The operation timed out or couldn't connect.");
    } else {
      parts.push('An unexpected error occurred.');
    }

    // Add technical details for advanced users
    if (context.userLevel === 'advanced' && context.includeDetails) {
      parts.push(`\nTechnical details: ${error.message}`);
    }

    return parts.join('\n');
  }

  /**
   * Generate generic message for errors without specific templates
   */
  private static generateGenericMessage(
    error: BaseError | Error,
    _context: ErrorContext
  ): string {
    const parts: string[] = [];

    // Use the error's user message if available
    if ('userMessage' in error && error.userMessage) {
      parts.push(error.userMessage as string);
    } else {
      parts.push('An error occurred while processing your request.');
    }

    return parts.join('\n');
  }

  /**
   * Format error context for display
   */
  private static formatErrorContext(context: Record<string, unknown>): string {
    const relevantFields = [
      'field',
      'value',
      'requirement',
      'operation',
      'feature',
    ];
    const contextParts: string[] = [];

    relevantFields.forEach(field => {
      if (context[field] !== undefined) {
        const value = String(context[field]);
        if (value.length < 100) {
          // Only show short values
          contextParts.push(`${field}: ${value}`);
        }
      }
    });

    return contextParts.length > 0 ? `(${contextParts.join(', ')})` : '';
  }

  /**
   * Get fallback message when message generation fails
   */
  private static getFallbackMessage(
    _error: Error,
    _context: ErrorContext
  ): string {
    const operation =
      _context.operation !== 'unknown' ? ` during ${_context.operation}` : '';

    return `An error occurred${operation}.`;
  }

  /**
   * Generate contextual help for specific error scenarios
   */
  static generateContextualHelp(
    errorCode: string,
    _context: Partial<ErrorContext> = {}
  ): string | null {
    const template = this.ERROR_TEMPLATES[errorCode];

    if (!template?.documentation) {
      return null;
    }

    const parts: string[] = [template.documentation];

    // Add context-specific help
    switch (errorCode) {
      case ERROR_CODES.ACTION_PLAN_PARSE_ERROR:
        parts.push(
          'Action plans help break down complex tasks into manageable steps.'
        );
        parts.push('Each step should be clear and actionable.');
        break;

      case ERROR_CODES.INVALID_PROJECT_TAG:
        parts.push('Project tags help organize and filter your tasks.');
        parts.push(
          'Good project names are short, descriptive, and easy to remember.'
        );
        break;

      case ERROR_CODES.NOTE_TOO_LONG:
        parts.push('Notes are meant for quick thoughts and reminders.');
        parts.push(
          'For longer content, consider breaking it into multiple notes or using the description field.'
        );
        break;

      case ERROR_CODES.PRETTY_PRINT_FORMAT_ERROR:
        parts.push('Pretty printing makes your task lists easier to read.');
        parts.push(
          'If formatting fails, the raw data is still available and functional.'
        );
        break;
    }

    return parts.join('\n\n');
  }

  /**
   * Check if an error should be shown to the user
   */
  static shouldShowToUser(error: Error): boolean {
    // Don't show internal system errors to users
    const internalErrors = [
      'circuit breaker',
      'internal server',
      'database connection',
      'memory leak',
      'heap overflow',
    ];

    const message = error.message.toLowerCase();
    return !internalErrors.some(internal => message.includes(internal));
  }

  /**
   * Get error severity for UI display
   */
  static getErrorSeverity(
    error: Error
  ): 'info' | 'warning' | 'error' | 'critical' {
    if (isTaskManagementError(error)) {
      // Most errors are recoverable and not critical
      if (isCleanupError(error)) {
        return 'warning';
      }
      if (isFormattingError(error)) {
        return 'info';
      }
      return 'error';
    }

    const message = error.message.toLowerCase();

    if (message.includes('critical') || message.includes('fatal')) {
      return 'critical';
    }
    if (message.includes('warning') || message.includes('deprecated')) {
      return 'warning';
    }
    if (message.includes('info') || message.includes('notice')) {
      return 'info';
    }

    return 'error';
  }

  /**
   * Generate recovery instructions for recoverable errors
   */
  static generateRecoveryInstructions(error: Error): string[] {
    const instructions: string[] = [];

    if (isTaskManagementError(error)) {
      if (isActionPlanError(error)) {
        instructions.push('Try simplifying your action plan format');
        instructions.push('Use numbered or bulleted lists');
        instructions.push('Keep each step concise and clear');
      } else if (isProjectManagementError(error)) {
        instructions.push('Check your project name format');
        instructions.push(
          'Use only letters, numbers, hyphens, and underscores'
        );
        instructions.push('Keep project names under 50 characters');
      } else if (isNotesManagementError(error)) {
        instructions.push('Check your note content length');
        instructions.push(
          'Ensure note type is valid (General, Technical, Decision, Learning)'
        );
        instructions.push(
          'Remove any special characters that might cause issues'
        );
      } else if (isFormattingError(error)) {
        instructions.push('Try using default display settings');
        instructions.push('The raw data is still available and functional');
        instructions.push('Contact support if formatting issues persist');
      } else if (isCleanupError(error)) {
        instructions.push('Your data remains safe and unchanged');
        instructions.push('Try the cleanup operation again later');
        instructions.push('Check that items are eligible for cleanup');
      }
    } else {
      // Generic recovery instructions
      instructions.push('Refresh the page and try again');
      instructions.push('Check your internet connection');
      instructions.push('Contact support if the issue persists');
    }

    return instructions;
  }
}

/**
 * Utility functions for error message formatting
 */
export const ErrorMessageUtils = {
  /**
   * Truncate error message for display
   */
  truncateMessage(message: string, maxLength = 200): string {
    if (message.length <= maxLength) {
      return message;
    }

    return message.substring(0, maxLength - 3) + '...';
  },

  /**
   * Format error for logging
   */
  formatForLogging(
    error: Error,
    context?: Record<string, unknown>
  ): Record<string, unknown> {
    const logData: Record<string, unknown> = {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };

    if (isTaskManagementError(error)) {
      const baseError = error as BaseError;
      logData['code'] = baseError.code;
      logData['recoverable'] = baseError.recoverable;
      logData['errorContext'] = baseError.context;
    }

    if (context) {
      logData['operationContext'] = context;
    }

    return logData;
  },

  /**
   * Extract actionable information from error
   */
  extractActionableInfo(error: Error): {
    canRetry: boolean;
    canRecover: boolean;
    requiresUserAction: boolean;
    recommendedAction?: string;
  } {
    const message = error.message.toLowerCase();

    const canRetry =
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('temporary');

    const canRecover = isTaskManagementError(error)
      ? (error as BaseError).recoverable
      : !message.includes('fatal');

    const requiresUserAction =
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('permission');

    let recommendedAction: string | undefined;

    if (requiresUserAction) {
      recommendedAction = 'Please check your input and try again';
    } else if (canRetry) {
      recommendedAction = 'Please try again in a moment';
    } else if (canRecover) {
      recommendedAction = 'The system will attempt to recover automatically';
    }

    const result: {
      canRetry: boolean;
      canRecover: boolean;
      requiresUserAction: boolean;
      recommendedAction?: string;
    } = {
      canRetry,
      canRecover,
      requiresUserAction,
    };

    if (recommendedAction) {
      result.recommendedAction = recommendedAction;
    }

    return result;
  },
};
