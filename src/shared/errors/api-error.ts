/**
 * API Error class for REST API error handling
 */

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      ...(process.env['NODE_ENV'] === 'development' && { stack: this.stack }),
    };
  }
}
