/**
 * Global error handling middleware
 */

import { ZodError } from 'zod';

import { ApiError } from '../../shared/errors/api-error.js';
import { LOGGER } from '../../shared/utils/logger.js';

import type {
  ApiRequest,
  ApiResponse,
  ApiError as ApiErrorType,
} from '../../shared/types/api.js';
import type { Request, Response, NextFunction } from 'express';

/**
 * Error codes for different error types
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  INCOMPLETE_DEPENDENCIES = 'INCOMPLETE_DEPENDENCIES',
  UNMET_EXIT_CRITERIA = 'UNMET_EXIT_CRITERIA',
}

/**
 * Custom API error class (deprecated - use ApiError from shared/errors)
 */
export class ApiErrorClass extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Format Zod validation errors into a more readable format
 */
function formatZodErrors(errors: ZodError['issues']): Array<{
  field: string;
  message: string;
  code: string;
}> {
  return errors.map(error => ({
    field: error.path.join('.'),
    message: error.message,
    code: error.code,
  }));
}

/**
 * Determine error details from error message patterns
 */
function categorizeError(err: Error): {
  statusCode: number;
  errorCode: ErrorCode;
  message: string;
} {
  const message = err.message.toLowerCase();

  // Check for specific error patterns
  if (message.includes('not found')) {
    return {
      statusCode: 404,
      errorCode: ErrorCode.NOT_FOUND,
      message: err.message,
    };
  }

  if (message.includes('circular dependency')) {
    return {
      statusCode: 400,
      errorCode: ErrorCode.CIRCULAR_DEPENDENCY,
      message: err.message,
    };
  }

  if (message.includes('depend') && message.includes('not completed')) {
    return {
      statusCode: 409,
      errorCode: ErrorCode.INCOMPLETE_DEPENDENCIES,
      message: err.message,
    };
  }

  if (message.includes('exit criteria') && message.includes('not met')) {
    return {
      statusCode: 409,
      errorCode: ErrorCode.UNMET_EXIT_CRITERIA,
      message: err.message,
    };
  }

  if (message.includes('invalid') || message.includes('required')) {
    return {
      statusCode: 400,
      errorCode: ErrorCode.BAD_REQUEST,
      message: err.message,
    };
  }

  // Default to internal error
  return {
    statusCode: 500,
    errorCode: ErrorCode.INTERNAL_ERROR,
    message: 'An internal server error occurred',
  };
}

/**
 * Global error handler middleware
 */
export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const apiReq = req as ApiRequest;

  // Determine error details
  let statusCode = 500;
  let errorCode = ErrorCode.INTERNAL_ERROR;
  let message = 'An internal server error occurred';
  let details: unknown = undefined;

  if (err instanceof ApiError) {
    // Handle our ApiError class from shared/errors
    statusCode = err.statusCode;
    errorCode = err.code as ErrorCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof ApiErrorClass) {
    // Handle legacy ApiErrorClass
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    // Handle Zod validation errors
    statusCode = 400;
    errorCode = ErrorCode.VALIDATION_ERROR;
    message = 'Request validation failed';
    details = {
      errors: formatZodErrors(err.issues),
      count: err.issues.length,
    };
  } else {
    // Categorize other errors based on message patterns
    const categorized = categorizeError(err);
    statusCode = categorized.statusCode;
    errorCode = categorized.errorCode;
    message = categorized.message;
  }

  // Log error with full context
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  LOGGER[logLevel]('Request error', {
    requestId: apiReq.id,
    errorCode,
    statusCode,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    query: req.query,
    body: req.body,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    duration: Date.now() - apiReq.startTime,
  });

  // Build error response
  const apiError: ApiErrorType = {
    code: errorCode,
    message,
    details,
  };

  // Include stack trace in development
  if (process.env['NODE_ENV'] === 'development') {
    apiError.stack = err.stack ?? undefined;
  }

  const response: ApiResponse = {
    success: false,
    error: apiError,
    meta: {
      requestId: apiReq.id,
      timestamp: new Date().toISOString(),
      duration: Date.now() - apiReq.startTime,
    },
  };

  res.status(statusCode).json(response);
}

/**
 * 404 handler for undefined routes
 */
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const error = new ApiErrorClass(
    ErrorCode.NOT_FOUND,
    `Route not found: ${req.method} ${req.path}`,
    404
  );
  next(error);
}
