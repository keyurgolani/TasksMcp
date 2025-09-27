/**
 * User-friendly error messages for common failure scenarios
 */

import {
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
  suggestion?: string;
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
  includeSuggestions: boolean;
}

/**
 * User-friendly error message generator
 */
export class UserFriendlyErrorMessages {
  private static readonly ERROR_TEMPLATES: Record<string, ErrorMessageTemplates> = {
    // Action Plan Errors
    [ERROR_CODES.ACTION_PLAN_PARSE_ERROR]: {
      technical: 'Failed to parse action plan content due to invalid format or structure.',
      user: 'The action plan could not be understood. Please check the format and try again.',
      suggestion: 'Try using a simple numbered list format like:\n1. First step\n2. Second step\n3. Third step',
      documentation: 'Action plans should follow a structured format with clear steps.',
    },
    [ERROR_CODES.ACTION_PLAN_STEP_NOT_FOUND]: {
      technical: 'The specified action plan step could not be located in the plan structure.',
      user: 'The step you\'re looking for doesn\'t exist in this action plan.',
      suggestion: 'Check the step number or refresh the action plan to see current steps.',
    },
    [ERROR_CODES.ACTION_PLAN_VALIDATION_ERROR]: {
      technical: 'Action plan data failed validation checks.',
      user: 'There\'s an issue with the action plan format.',
      suggestion: 'Please check that all required fields are filled out correctly.',
    },

    // Project Management Errors
    [ERROR_CODES.INVALID_PROJECT_TAG]: {
      technical: 'Project tag does not meet the required format specifications.',
      user: 'The project name contains invalid characters or is too long.',
      suggestion: 'Use only letters, numbers, hyphens, and underscores. Keep it under 50 characters.',
      documentation: 'Project tags help organize your tasks and must follow naming conventions.',
    },
    [ERROR_CODES.PROJECT_NOT_FOUND]: {
      technical: 'The specified project identifier could not be resolved.',
      user: 'The project you\'re looking for doesn\'t exist.',
      suggestion: 'Check the project name spelling or create a new project if needed.',
    },


    // Notes Management Errors
    [ERROR_CODES.NOTE_VALIDATION_ERROR]: {
      technical: 'Implementation note data failed validation requirements.',
      user: 'There\'s an issue with the note you\'re trying to save.',
      suggestion: 'Make sure the note has content and check for any special characters.',
    },
    [ERROR_CODES.NOTE_NOT_FOUND]: {
      technical: 'The requested implementation note could not be located.',
      user: 'The note you\'re looking for doesn\'t exist.',
      suggestion: 'The note may have been deleted or moved. Check other tasks or lists.',
    },
    [ERROR_CODES.NOTE_TOO_LONG]: {
      technical: 'Note content exceeds the maximum allowed character limit.',
      user: 'Your note is too long.',
      suggestion: 'Please shorten your note or split it into multiple notes.',
    },
    [ERROR_CODES.INVALID_NOTE_TYPE]: {
      technical: 'The specified note type is not recognized by the system.',
      user: 'The note type you selected isn\'t valid.',
      suggestion: 'Choose from: General, Technical, Decision, or Learning.',
    },

    // Formatting Errors
    [ERROR_CODES.PRETTY_PRINT_FORMAT_ERROR]: {
      technical: 'Pretty print formatting engine encountered an error processing the data.',
      user: 'There was a problem formatting the display.',
      suggestion: 'The information is still available in a simpler format.',
    },
    [ERROR_CODES.INVALID_FORMAT_OPTIONS]: {
      technical: 'Format options contain invalid values or unsupported configurations.',
      user: 'Some of your display settings aren\'t valid.',
      suggestion: 'Check your display preferences and try using default settings.',
    },

    // Cleanup Errors
    [ERROR_CODES.CLEANUP_OPERATION_FAILED]: {
      technical: 'Cleanup operation could not be completed due to system constraints.',
      user: 'The cleanup operation couldn\'t be completed.',
      suggestion: 'Your data is safe and unchanged. Try again later or contact support.',
    },
    [ERROR_CODES.CLEANUP_VALIDATION_ERROR]: {
      technical: 'One or more items failed cleanup validation checks.',
      user: 'Some items can\'t be cleaned up right now.',
      suggestion: 'This usually happens with active or recently modified items.',
    },



    // Validation
    [ERROR_CODES.VALIDATION_ERROR]: {
      technical: 'Validation checks detected data integrity issues.',
      user: 'There\'s an issue with the information you provided.',
      suggestion: 'Please check your input and try again.',
    },
  };

  /**
   * Generate user-friendly error message
   */
  static generateMessage(error: Error, context: Partial<ErrorContext> = {}): string {
    const defaultContext: ErrorContext = {
      userLevel: 'intermediate',
      operation: 'unknown',
      feature: 'task management',
      includeDetails: true,
      includeSuggestions: true,
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
        messageError: messageError instanceof Error ? messageError.message : 'Unknown error',
      });

      return this.getFallbackMessage(error, defaultContext);
    }
  }

  /**
   * Generate message for task management errors
   */
  private static generateErrorMessage(error: any, context: ErrorContext): string {
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

    // Add suggestions if requested
    if (context.includeSuggestions && template.suggestion) {
      parts.push(`\nSuggestion: ${template.suggestion}`);
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
  private static generateStandardErrorMessage(error: Error, context: ErrorContext): string {
    const parts: string[] = [];

    // Categorize error by message content
    const message = error.message.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid')) {
      parts.push('There\'s an issue with the information provided.');
      if (context.includeSuggestions) {
        parts.push('Suggestion: Please check your input and try again.');
      }
    } else if (message.includes('not found') || message.includes('missing')) {
      parts.push('The requested item could not be found.');
      if (context.includeSuggestions) {
        parts.push('Suggestion: Check the spelling or try refreshing the page.');
      }
    } else if (message.includes('permission') || message.includes('unauthorized')) {
      parts.push('You don\'t have permission to perform this action.');
      if (context.includeSuggestions) {
        parts.push('Suggestion: Contact your administrator if you need access.');
      }
    } else if (message.includes('timeout') || message.includes('connection')) {
      parts.push('The operation timed out or couldn\'t connect.');
      if (context.includeSuggestions) {
        parts.push('Suggestion: Check your internet connection and try again.');
      }
    } else {
      parts.push('An unexpected error occurred.');
      if (context.includeSuggestions) {
        parts.push('Suggestion: Try refreshing the page or contact support if the issue persists.');
      }
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
  private static generateGenericMessage(error: any, context: ErrorContext): string {
    const parts: string[] = [];

    // Use the error's user message if available
    if (error.userMessage) {
      parts.push(error.userMessage);
    } else {
      parts.push('An error occurred while processing your request.');
    }

    // Add category-specific suggestions
    if (context.includeSuggestions) {
      if (isActionPlanError(error)) {
        parts.push('Suggestion: Check your action plan format and try again.');
      } else if (isProjectManagementError(error)) {
        parts.push('Suggestion: Verify your project settings and try again.');
      } else if (isNotesManagementError(error)) {
        parts.push('Suggestion: Check your note content and format.');
      } else if (isFormattingError(error)) {
        parts.push('Suggestion: The information is available in a simpler format.');
      } else if (isCleanupError(error)) {
        parts.push('Suggestion: Your data remains safe and unchanged.');
      }
    }

    return parts.join('\n');
  }

  /**
   * Format error context for display
   */
  private static formatErrorContext(context: Record<string, unknown>): string {
    const relevantFields = ['field', 'value', 'requirement', 'operation', 'feature'];
    const contextParts: string[] = [];

    relevantFields.forEach(field => {
      if (context[field] !== undefined) {
        const value = String(context[field]);
        if (value.length < 100) { // Only show short values
          contextParts.push(`${field}: ${value}`);
        }
      }
    });

    return contextParts.length > 0 ? `(${contextParts.join(', ')})` : '';
  }

  /**
   * Get fallback message when message generation fails
   */
  private static getFallbackMessage(_error: Error, _context: ErrorContext): string {
    const operation = _context.operation !== 'unknown' ? ` during ${_context.operation}` : '';
    
    return `An error occurred${operation}. ${
      _context.includeSuggestions 
        ? 'Please try again or contact support if the issue persists.' 
        : ''
    }`;
  }

  /**
   * Generate contextual help for specific error scenarios
   */
  static generateContextualHelp(errorCode: string, _context: Partial<ErrorContext> = {}): string | null {
    const template = this.ERROR_TEMPLATES[errorCode];
    
    if (!template?.documentation) {
      return null;
    }

    const parts: string[] = [template.documentation];

    // Add context-specific help
    switch (errorCode) {
      case ERROR_CODES.ACTION_PLAN_PARSE_ERROR:
        parts.push('Action plans help break down complex tasks into manageable steps.');
        parts.push('Each step should be clear and actionable.');
        break;

      case ERROR_CODES.INVALID_PROJECT_TAG:
        parts.push('Project tags help organize and filter your tasks.');
        parts.push('Good project names are short, descriptive, and easy to remember.');
        break;

      case ERROR_CODES.NOTE_TOO_LONG:
        parts.push('Notes are meant for quick thoughts and reminders.');
        parts.push('For longer content, consider breaking it into multiple notes or using the description field.');
        break;

      case ERROR_CODES.PRETTY_PRINT_FORMAT_ERROR:
        parts.push('Pretty printing makes your task lists easier to read.');
        parts.push('If formatting fails, the raw data is still available and functional.');
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
  static getErrorSeverity(error: Error): 'info' | 'warning' | 'error' | 'critical' {
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
        instructions.push('Use only letters, numbers, hyphens, and underscores');
        instructions.push('Keep project names under 50 characters');
      } else if (isNotesManagementError(error)) {
        instructions.push('Check your note content length');
        instructions.push('Ensure note type is valid (General, Technical, Decision, Learning)');
        instructions.push('Remove any special characters that might cause issues');
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
  formatForLogging(error: Error, context?: Record<string, unknown>): Record<string, unknown> {
    const logData: Record<string, unknown> = {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };

    if (isTaskManagementError(error)) {
      logData['code'] = (error as any).code;
      logData['category'] = (error as any).category;
      logData['recoverable'] = (error as any).recoverable;
      logData['userMessage'] = (error as any).userMessage;
      logData['errorContext'] = (error as any).context;
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
    suggestedAction?: string;
  } {
    const message = error.message.toLowerCase();
    
    const canRetry = message.includes('timeout') || 
                    message.includes('connection') || 
                    message.includes('temporary');
    
    const canRecover = isTaskManagementError(error) ? 
                      (error as any).recoverable : 
                      !message.includes('fatal');
    
    const requiresUserAction = message.includes('validation') || 
                              message.includes('invalid') || 
                              message.includes('permission');

    let suggestedAction: string | undefined;
    
    if (requiresUserAction) {
      suggestedAction = 'Please check your input and try again';
    } else if (canRetry) {
      suggestedAction = 'Please try again in a moment';
    } else if (canRecover) {
      suggestedAction = 'The system will attempt to recover automatically';
    }

    const result: {
      canRetry: boolean;
      canRecover: boolean;
      requiresUserAction: boolean;
      suggestedAction?: string;
    } = {
      canRetry,
      canRecover,
      requiresUserAction,
    };

    if (suggestedAction) {
      result.suggestedAction = suggestedAction;
    }

    return result;
  },
};