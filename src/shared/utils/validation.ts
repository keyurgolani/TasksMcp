/**
 * Validation utilities with error handling
 *
 * Provides validation functions using Zod schemas with:
 * - Type-safe validation results
 * - Graceful error handling with fallbacks
 * - Common validation patterns (email, URL, UUID, etc.)
 * - Custom validator creation utilities
 */

import { z, ZodSchema, ZodError } from 'zod';

import { LOGGER } from './logger.js';
import { TemplateEngine } from './template-engine.js';

/**
 * Standard validation result interface
 * Contains validation status, validated data, and error messages
 */
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Safe validation result with fallback handling
 * Always returns a result value, even on validation failure
 */
export interface SafeValidationResult<T> {
  isValid: boolean;
  result: T;
  error?: Error;
}

/**
 * Validator class providing validation utilities
 * Combines Zod schema validation with custom validation patterns
 */
export class Validator {
  /**
   * Validates data against a Zod schema with detailed error reporting
   *
   * Performs type-safe validation using Zod schemas and returns structured results
   * with either the validated data or detailed error messages for debugging.
   *
   * @param schema - Zod schema to validate against
   * @param data - Data to validate (can be any type)
   * @returns ValidationResult<T> - Object containing validation status, data, and errors
   *
   * @example
   * ```typescript
   * const schema = z.string().min(1);
   * const result = VALIDATOR.validate(schema, "hello");
   * if (result.isValid) {
   *   console.log(result.data); // "hello"
   * } else {
   *   console.log(result.errors); // Array of error messages
   * }
   * ```
   */
  validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
    try {
      const result = schema.parse(data);
      return {
        isValid: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          isValid: false,
          errors: error.issues.map(e => `${e.path.join('.')}: ${e.message}`),
        };
      }

      return {
        isValid: false,
        errors: [
          error instanceof Error ? error.message : 'Unknown validation error',
        ],
      };
    }
  }

  /**
   * Validates with graceful error handling and fallback values
   *
   * Ensures a result is always returned, even on validation failure, making it safe
   * for use in critical paths where the application must continue running.
   * Logs validation failures for debugging while providing fallback values.
   *
   * @param validationFn - Function that performs the validation and returns result
   * @param fallbackValue - Value to return if validation fails
   * @param context - Optional context string for logging and debugging
   * @returns SafeValidationResult<T> - Always contains a result, with error info if failed
   *
   * @example
   * ```typescript
   * const result = VALIDATOR.validateSafely(
   *   () => parseUserInput(input),
   *   defaultValue,
   *   'user-input-parsing'
   * );
   * // result.result always contains a value
   * // result.isValid indicates if validation succeeded
   * ```
   */
  validateSafely<T>(
    validationFn: () => T,
    fallbackValue: T,
    context?: string
  ): SafeValidationResult<T> {
    try {
      const result = validationFn();
      return { isValid: true, result };
    } catch (error) {
      LOGGER.warn('Validation failed, using fallback', {
        context,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        isValid: false,
        result: fallbackValue,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Create a Zod schema with error messages and null/undefined checks
   *
   * Wraps an existing Zod schema with additional validation to ensure values
   * are not null or undefined, providing clearer error messages for debugging.
   *
   * @param schemaDefinition - Base Zod schema to wrap
   * @returns ZodSchema<T> - Schema with additional validation
   */
  createSchema<T>(schemaDefinition: ZodSchema<T>): ZodSchema<T> {
    return schemaDefinition.refine(
      data => data !== null && data !== undefined,
      {
        message: 'Value cannot be null or undefined',
      }
    );
  }

  /**
   * Validate email format using RFC-compliant email validation
   *
   * @param email - Email string to validate
   * @returns ValidationResult<string> - Validation result with email or error
   */
  validateEmail(email: string): ValidationResult<string> {
    const emailSchema = z.string().email('Invalid email format');
    return this.validate(emailSchema, email);
  }

  /**
   * Validate URL format using standard URL validation
   *
   * @param url - URL string to validate
   * @returns ValidationResult<string> - Validation result with URL or error
   */
  validateUrl(url: string): ValidationResult<string> {
    const urlSchema = z.string().url('Invalid URL format');
    return this.validate(urlSchema, url);
  }

  /**
   * Validate UUID format (v4 UUID standard)
   *
   * @param uuid - UUID string to validate
   * @returns ValidationResult<string> - Validation result with UUID or error
   */
  validateUuid(uuid: string): ValidationResult<string> {
    const uuidSchema = z.string().uuid('Invalid UUID format');
    return this.validate(uuidSchema, uuid);
  }

  /**
   * Validate date string and convert to Date object
   *
   * Parses date strings and validates they represent valid dates.
   * Supports ISO 8601 format and other common date formats.
   * Performs additional validation to ensure the parsed date is valid.
   *
   * @param dateString - Date string to validate and parse
   * @returns ValidationResult<Date> - Validation result with Date object or error
   *
   * @example
   * ```typescript
   * const result = VALIDATOR.validateDate('2023-12-25T10:30:00Z');
   * if (result.isValid) {
   *   console.log(result.data); // Date object
   * }
   * ```
   */
  validateDate(dateString: string): ValidationResult<Date> {
    try {
      // Parse the date string
      const date = new Date(dateString);

      // Check if the parsed date is valid
      if (isNaN(date.getTime())) {
        return {
          isValid: false,
          errors: ['Invalid date format - unable to parse date string'],
        };
      }

      // Additional validation: check for reasonable date range
      const currentYear = new Date().getFullYear();
      const dateYear = date.getFullYear();

      if (dateYear < 1900 || dateYear > currentYear + 100) {
        return {
          isValid: false,
          errors: [
            `Date year ${dateYear} is outside reasonable range (1900-${
              currentYear + 100
            })`,
          ],
        };
      }

      return {
        isValid: true,
        data: date,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          error instanceof Error ? error.message : 'Invalid date format',
        ],
      };
    }
  }

  /**
   * Validate number range
   */
  validateNumberRange(
    value: number,
    min?: number,
    max?: number
  ): ValidationResult<number> {
    let schema = z.number();

    if (min !== undefined) {
      schema = schema.min(min, `Value must be at least ${min}`);
    }

    if (max !== undefined) {
      schema = schema.max(max, `Value must be at most ${max}`);
    }

    return this.validate(schema, value);
  }

  /**
   * Validate string length
   */
  validateStringLength(
    value: string,
    minLength?: number,
    maxLength?: number
  ): ValidationResult<string> {
    let schema = z.string();

    if (minLength !== undefined) {
      schema = schema.min(
        minLength,
        `String must be at least ${minLength} characters`
      );
    }

    if (maxLength !== undefined) {
      schema = schema.max(
        maxLength,
        `String must be at most ${maxLength} characters`
      );
    }

    return this.validate(schema, value);
  }

  /**
   * Validate array length
   */
  validateArrayLength<T>(
    value: T[],
    minLength?: number,
    maxLength?: number
  ): ValidationResult<T[]> {
    let schema = z.array(z.unknown());

    if (minLength !== undefined) {
      schema = schema.min(
        minLength,
        `Array must have at least ${minLength} items`
      );
    }

    if (maxLength !== undefined) {
      schema = schema.max(
        maxLength,
        `Array must have at most ${maxLength} items`
      );
    }

    const result = this.validate(schema, value);
    if (result.isValid && result.data) {
      return {
        isValid: true,
        data: result.data as T[],
      };
    }
    return {
      isValid: false,
      errors: result.errors || ['Validation failed'],
    };
  }

  /**
   * Validate object has required properties
   */
  validateRequiredProperties(
    obj: Record<string, unknown>,
    requiredProps: string[]
  ): ValidationResult<Record<string, unknown>> {
    const missingProps = requiredProps.filter(prop => !(prop in obj));

    if (missingProps.length > 0) {
      return {
        isValid: false,
        errors: [`Missing required properties: ${missingProps.join(', ')}`],
      };
    }

    return {
      isValid: true,
      data: obj,
    };
  }

  /**
   * Validate enum value
   */
  validateEnum<T extends string>(
    value: string,
    enumValues: T[]
  ): ValidationResult<T> {
    if (!enumValues.includes(value as T)) {
      return {
        isValid: false,
        errors: [`Value must be one of: ${enumValues.join(', ')}`],
      };
    }

    return {
      isValid: true,
      data: value as T,
    };
  }

  /**
   * Validate JSON string
   */
  validateJson(jsonString: string): ValidationResult<unknown> {
    try {
      const parsed = JSON.parse(jsonString);
      return {
        isValid: true,
        data: parsed,
      };
    } catch (_error) {
      return {
        isValid: false,
        errors: ['Invalid JSON format'],
      };
    }
  }

  /**
   * Validate file path
   */
  validateFilePath(path: string): ValidationResult<string> {
    // Path validation - can be extended based on requirements
    const pathSchema = z.string().min(1, 'Path cannot be empty');

    const result = this.validate(pathSchema, path);
    if (!result.isValid) {
      return result;
    }

    // Additional path validation
    const invalidChars = /[<>:"|?*]/;
    if (invalidChars.test(path)) {
      return {
        isValid: false,
        errors: ['Path contains invalid characters'],
      };
    }

    return {
      isValid: true,
      data: path,
    };
  }

  /**
   * Validate multiple values with different schemas
   */
  validateMultiple<T extends Record<string, unknown>>(
    data: T,
    schemas: { [K in keyof T]: ZodSchema<T[K]> }
  ): ValidationResult<T> {
    const errors: string[] = [];
    const validatedData: Partial<T> = {};

    for (const [key, schema] of Object.entries(schemas)) {
      const value = data[key as keyof T];
      const result = this.validate(schema, value);

      if (result.isValid && result.data !== undefined) {
        (validatedData as Record<string, unknown>)[key] = result.data;
      } else if (result.errors) {
        errors.push(...result.errors.map(err => `${key}: ${err}`));
      }
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
      };
    }

    return {
      isValid: true,
      data: validatedData as T,
    };
  }

  /**
   * Validate agent prompt template
   */
  validateAgentPromptTemplate(template: string): ValidationResult<string> {
    // First validate length
    const lengthResult = this.validateStringLength(template, 0, 10000);
    if (!lengthResult.isValid) {
      return lengthResult;
    }

    // Then validate template syntax
    const templateValidation = TemplateEngine.validateTemplate(template);
    if (!templateValidation.isValid) {
      return {
        isValid: false,
        errors: templateValidation.errors,
      };
    }

    return {
      isValid: true,
      data: template,
    };
  }

  /**
   * Create a custom validator function
   */
  createCustomValidator<T>(
    validationFn: (value: unknown) => T,
    errorMessage: string
  ): (value: unknown) => ValidationResult<T> {
    return (value: unknown) => {
      try {
        const result = validationFn(value);
        return {
          isValid: true,
          data: result,
        };
      } catch (_error) {
        return {
          isValid: false,
          errors: [errorMessage],
        };
      }
    };
  }
}

// Global validator instance
export const VALIDATOR = new Validator();
// Export alias for backward compatibility
export { VALIDATOR as validator };
