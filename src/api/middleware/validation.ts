/**
 * Request validation middleware
 */

import type { Request, Response, NextFunction } from 'express';
import { z, type ZodSchema } from 'zod';

/**
 * Validation target (where to validate)
 */
export type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Create a validation middleware for a specific schema and target
 */
export function validate(
  schema: ZodSchema,
  target: ValidationTarget = 'body'
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Get the data to validate based on target
      const data = req[target];
      
      // Validate the data
      const validated = schema.parse(data);
      
      // Replace the original data with validated data
      // This ensures type safety and applies transformations
      req[target] = validated;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Pass Zod errors to error handler
        next(error);
      } else {
        // Pass other errors to error handler
        next(error);
      }
    }
  };
}

/**
 * Validate multiple targets at once
 */
export function validateMultiple(
  validations: Array<{
    schema: ZodSchema;
    target: ValidationTarget;
  }>
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      for (const { schema, target } of validations) {
        const data = req[target];
        const validated = schema.parse(data);
        req[target] = validated;
      }
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(error);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  /**
   * UUID parameter validation
   */
  uuid: z.string().uuid('Invalid UUID format'),
  
  /**
   * Pagination query parameters
   */
  pagination: z.object({
    limit: z.string().transform(val => parseInt(val, 10)).optional(),
    offset: z.string().transform(val => parseInt(val, 10)).optional(),
  }),
  
  /**
   * Boolean query parameter
   */
  boolean: z.string().transform(val => val === 'true'),
  
  /**
   * Comma-separated array
   */
  commaSeparated: z.string().transform(val => 
    val.split(',').map(item => item.trim()).filter(Boolean)
  ),
  
  /**
   * Priority validation (1-5)
   */
  priority: z.number().min(1).max(5),
  
  /**
   * Task status validation
   */
  taskStatus: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']),
  
  /**
   * List status validation
   */
  listStatus: z.enum(['active', 'completed', 'all']),
};

/**
 * Validation error formatter
 */
export function formatValidationError(error: z.ZodError): {
  message: string;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
} {
  return {
    message: 'Request validation failed',
    errors: error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    })),
  };
}

