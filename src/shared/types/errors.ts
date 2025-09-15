/**
 * Custom error types for the application
 */

/**
 * Base error class with additional context
 */
export class BaseError extends Error {
  public readonly code: string;
  public readonly context: Record<string, unknown> | undefined;
  public readonly recoverable: boolean;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: string,
    recoverable = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.recoverable = recoverable;
    this.context = context;
    this.timestamp = Date.now();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Action plan related errors
 */
export class ActionPlanParseError extends BaseError {
  constructor(message: string, details: string, context?: Record<string, unknown>) {
    super(message, 'ACTION_PLAN_PARSE_ERROR', true, { details, ...context });
  }
}

export class ActionPlanValidationError extends BaseError {
  constructor(message: string, validationErrors: string[], context?: Record<string, unknown>) {
    super(message, 'ACTION_PLAN_VALIDATION_ERROR', true, { validationErrors, ...context });
  }
}

export class ActionStepError extends BaseError {
  constructor(message: string, stepId: string, context?: Record<string, unknown>) {
    super(message, 'ACTION_STEP_ERROR', true, { stepId, ...context });
  }
}

/**
 * Project management related errors
 */
export class ProjectManagementError extends BaseError {
  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message, code, true, context);
  }
}

export class ProjectTagError extends BaseError {
  constructor(message: string, tag: string, context?: Record<string, unknown>) {
    super(message, 'PROJECT_TAG_ERROR', true, { tag, ...context });
  }
}

export class ProjectMigrationError extends BaseError {
  constructor(message: string, fromVersion: string, toVersion: string, context?: Record<string, unknown>) {
    super(message, 'PROJECT_MIGRATION_ERROR', true, { fromVersion, toVersion, ...context });
  }
}

/**
 * Notes related errors
 */
export class NotesError extends BaseError {
  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message, code, true, context);
  }
}

export class NoteValidationError extends BaseError {
  constructor(message: string, noteId: string, validationErrors: string[], context?: Record<string, unknown>) {
    super(message, 'NOTE_VALIDATION_ERROR', true, { noteId, validationErrors, ...context });
  }
}

export class NoteNotFoundError extends BaseError {
  constructor(noteId: string, context?: Record<string, unknown>) {
    super(`Note not found: ${noteId}`, 'NOTE_NOT_FOUND', false, { noteId, ...context });
  }
}

/**
 * Pretty print formatting errors
 */
export class PrettyPrintError extends BaseError {
  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message, code, true, context);
  }
}

export class FormatValidationError extends BaseError {
  constructor(message: string, formatOptions: Record<string, unknown>, context?: Record<string, unknown>) {
    super(message, 'FORMAT_VALIDATION_ERROR', true, { formatOptions, ...context });
  }
}

export class RenderingError extends BaseError {
  constructor(message: string, renderContext: string, context?: Record<string, unknown>) {
    super(message, 'RENDERING_ERROR', true, { renderContext, ...context });
  }
}

/**
 * Cleanup related errors
 */
export class CleanupError extends BaseError {
  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message, code, true, context);
  }
}

export class CleanupValidationError extends BaseError {
  constructor(message: string, itemId: string, reason: string, context?: Record<string, unknown>) {
    super(message, 'CLEANUP_VALIDATION_ERROR', true, { itemId, reason, ...context });
  }
}

export class CleanupOperationError extends BaseError {
  constructor(message: string, operation: string, itemsAffected: number, context?: Record<string, unknown>) {
    super(message, 'CLEANUP_OPERATION_ERROR', true, { operation, itemsAffected, ...context });
  }
}

/**
 * Migration related errors
 */
export class MigrationError extends BaseError {
  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message, code, true, context);
  }
}

export class DataMigrationError extends BaseError {
  constructor(message: string, fromVersion: string, toVersion: string, context?: Record<string, unknown>) {
    super(message, 'DATA_MIGRATION_ERROR', true, { fromVersion, toVersion, ...context });
  }
}

export class BackwardCompatibilityError extends BaseError {
  constructor(message: string, requiredVersion: string, currentVersion: string, context?: Record<string, unknown>) {
    super(message, 'BACKWARD_COMPATIBILITY_ERROR', false, { requiredVersion, currentVersion, ...context });
  }
}

/**
 * Storage related errors
 */
export class StorageError extends BaseError {
  constructor(message: string, code: string, recoverable = true, context?: Record<string, unknown>) {
    super(message, code, recoverable, context);
  }
}

export class FileNotFoundError extends BaseError {
  constructor(filePath: string, context?: Record<string, unknown>) {
    super(`File not found: ${filePath}`, 'FILE_NOT_FOUND', false, { filePath, ...context });
  }
}

export class PermissionError extends BaseError {
  constructor(message: string, filePath: string, context?: Record<string, unknown>) {
    super(message, 'PERMISSION_ERROR', false, { filePath, ...context });
  }
}

export class DiskSpaceError extends BaseError {
  constructor(message: string, requiredSpace: number, availableSpace: number, context?: Record<string, unknown>) {
    super(message, 'DISK_SPACE_ERROR', false, { requiredSpace, availableSpace, ...context });
  }
}

export class CorruptionError extends BaseError {
  constructor(message: string, filePath: string, context?: Record<string, unknown>) {
    super(message, 'CORRUPTION_ERROR', true, { filePath, ...context });
  }
}

/**
 * Network related errors
 */
export class NetworkError extends BaseError {
  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message, code, true, context);
  }
}

export class TimeoutError extends BaseError {
  constructor(message: string, timeoutMs: number, context?: Record<string, unknown>) {
    super(message, 'TIMEOUT_ERROR', true, { timeoutMs, ...context });
  }
}

export class ConnectionError extends BaseError {
  constructor(message: string, endpoint: string, context?: Record<string, unknown>) {
    super(message, 'CONNECTION_ERROR', true, { endpoint, ...context });
  }
}

/**
 * Validation related errors
 */
export class ValidationError extends BaseError {
  constructor(message: string, field: string, value: unknown, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', false, { field, value, ...context });
  }
}

export class SchemaValidationError extends BaseError {
  constructor(message: string, schema: string, errors: string[], context?: Record<string, unknown>) {
    super(message, 'SCHEMA_VALIDATION_ERROR', false, { schema, errors, ...context });
  }
}

/**
 * Business logic errors
 */
export class BusinessLogicError extends BaseError {
  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message, code, false, context);
  }
}

export class InvalidOperationError extends BaseError {
  constructor(message: string, operation: string, reason: string, context?: Record<string, unknown>) {
    super(message, 'INVALID_OPERATION', false, { operation, reason, ...context });
  }
}

export class ResourceConflictError extends BaseError {
  constructor(message: string, resourceId: string, conflictType: string, context?: Record<string, unknown>) {
    super(message, 'RESOURCE_CONFLICT', false, { resourceId, conflictType, ...context });
  }
}

/**
 * System related errors
 */
export class SystemError extends BaseError {
  constructor(message: string, code: string, recoverable = false, context?: Record<string, unknown>) {
    super(message, code, recoverable, context);
  }
}

export class MemoryError extends BaseError {
  constructor(message: string, memoryUsage: number, memoryLimit: number, context?: Record<string, unknown>) {
    super(message, 'MEMORY_ERROR', true, { memoryUsage, memoryLimit, ...context });
  }
}

export class ResourceExhaustionError extends BaseError {
  constructor(message: string, resource: string, limit: number, context?: Record<string, unknown>) {
    super(message, 'RESOURCE_EXHAUSTION', true, { resource, limit, ...context });
  }
}

/**
 * Configuration related errors
 */
export class ConfigurationError extends BaseError {
  constructor(message: string, configKey: string, context?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', false, { configKey, ...context });
  }
}

export class MissingConfigurationError extends BaseError {
  constructor(configKey: string, context?: Record<string, unknown>) {
    super(`Missing required configuration: ${configKey}`, 'MISSING_CONFIGURATION', false, { configKey, ...context });
  }
}

export class InvalidConfigurationError extends BaseError {
  constructor(message: string, configKey: string, value: unknown, context?: Record<string, unknown>) {
    super(message, 'INVALID_CONFIGURATION', false, { configKey, value, ...context });
  }
}

/**
 * Error type guards
 */
export function isRecoverableError(error: Error): boolean {
  return error instanceof BaseError ? error.recoverable : false;
}

export function isActionPlanError(error: Error): error is ActionPlanParseError | ActionPlanValidationError | ActionStepError {
  return error instanceof ActionPlanParseError || 
         error instanceof ActionPlanValidationError || 
         error instanceof ActionStepError;
}

export function isProjectManagementError(error: Error): error is ProjectManagementError | ProjectTagError | ProjectMigrationError {
  return error instanceof ProjectManagementError || 
         error instanceof ProjectTagError || 
         error instanceof ProjectMigrationError;
}

export function isNotesError(error: Error): error is NotesError | NoteValidationError | NoteNotFoundError {
  return error instanceof NotesError || 
         error instanceof NoteValidationError || 
         error instanceof NoteNotFoundError;
}

export function isPrettyPrintError(error: Error): error is PrettyPrintError | FormatValidationError | RenderingError {
  return error instanceof PrettyPrintError || 
         error instanceof FormatValidationError || 
         error instanceof RenderingError;
}

export function isCleanupError(error: Error): error is CleanupError | CleanupValidationError | CleanupOperationError {
  return error instanceof CleanupError || 
         error instanceof CleanupValidationError || 
         error instanceof CleanupOperationError;
}

export function isMigrationError(error: Error): error is MigrationError | DataMigrationError | BackwardCompatibilityError {
  return error instanceof MigrationError || 
         error instanceof DataMigrationError || 
         error instanceof BackwardCompatibilityError;
}

export function isStorageError(error: Error): error is StorageError | FileNotFoundError | PermissionError | DiskSpaceError | CorruptionError {
  return error instanceof StorageError || 
         error instanceof FileNotFoundError || 
         error instanceof PermissionError || 
         error instanceof DiskSpaceError || 
         error instanceof CorruptionError;
}

export function isNetworkError(error: Error): error is NetworkError | TimeoutError | ConnectionError {
  return error instanceof NetworkError || 
         error instanceof TimeoutError || 
         error instanceof ConnectionError;
}

export function isValidationError(error: Error): error is ValidationError | SchemaValidationError {
  return error instanceof ValidationError || 
         error instanceof SchemaValidationError;
}

export function isSystemError(error: Error): error is SystemError | MemoryError | ResourceExhaustionError {
  return error instanceof SystemError || 
         error instanceof MemoryError || 
         error instanceof ResourceExhaustionError;
}

export function isConfigurationError(error: Error): error is ConfigurationError | MissingConfigurationError | InvalidConfigurationError {
  return error instanceof ConfigurationError || 
         error instanceof MissingConfigurationError || 
         error instanceof InvalidConfigurationError;
}

// Additional type guards for user-friendly-errors.ts compatibility
export function isNotesManagementError(error: Error): error is NotesError | NoteValidationError | NoteNotFoundError {
  return isNotesError(error);
}

export function isFormattingError(error: Error): error is PrettyPrintError | FormatValidationError | RenderingError {
  return isPrettyPrintError(error);
}

export function isEnhancedTaskManagementError(error: Error): boolean {
  return isActionPlanError(error) || 
         isProjectManagementError(error) || 
         isNotesError(error) || 
         isPrettyPrintError(error) || 
         isCleanupError(error) || 
         isMigrationError(error);
}

// Error codes for user-friendly error messages
export const ERROR_CODES = {
  // Action Plan Errors
  ACTION_PLAN_PARSE_ERROR: 'ACTION_PLAN_PARSE_ERROR',
  ACTION_PLAN_STEP_NOT_FOUND: 'ACTION_PLAN_STEP_NOT_FOUND',
  ACTION_PLAN_VALIDATION_ERROR: 'ACTION_PLAN_VALIDATION_ERROR',

  // Project Management Errors
  INVALID_PROJECT_TAG: 'INVALID_PROJECT_TAG',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',

  // Notes Management Errors
  NOTE_VALIDATION_ERROR: 'NOTE_VALIDATION_ERROR',
  NOTE_NOT_FOUND: 'NOTE_NOT_FOUND',
  NOTE_TOO_LONG: 'NOTE_TOO_LONG',
  INVALID_NOTE_TYPE: 'INVALID_NOTE_TYPE',

  // Formatting Errors
  PRETTY_PRINT_FORMAT_ERROR: 'PRETTY_PRINT_FORMAT_ERROR',
  INVALID_FORMAT_OPTIONS: 'INVALID_FORMAT_OPTIONS',

  // Cleanup Errors
  CLEANUP_OPERATION_FAILED: 'CLEANUP_OPERATION_FAILED',
  CLEANUP_VALIDATION_ERROR: 'CLEANUP_VALIDATION_ERROR',

  // Enhanced Validation
  ENHANCED_VALIDATION_ERROR: 'ENHANCED_VALIDATION_ERROR',
} as const;