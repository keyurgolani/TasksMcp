/**
 * Parameter Preprocessing Utility
 *
 * Automatically converts common agent input patterns to expected types before validation.
 * This makes the MCP server more agent-friendly by handling common type conversion scenarios.
 */

import { logger } from './logger.js';

/**
 * Configuration for parameter preprocessing
 */
export interface PreprocessingConfig {
  /** Enable string to number conversion */
  enableNumberCoercion: boolean;
  /** Enable JSON string to array/object conversion */
  enableJsonCoercion: boolean;
  /** Enable string to boolean conversion */
  enableBooleanCoercion: boolean;
  /** Log preprocessing actions for debugging */
  logConversions: boolean;
}

/**
 * Result of parameter preprocessing
 */
export interface PreprocessingResult {
  /** The processed parameters */
  parameters: Record<string, unknown>;
  /** List of conversions that were applied */
  conversions: PreprocessingConversion[];
  /** Any errors that occurred during preprocessing */
  errors: string[];
}

/**
 * Information about a parameter conversion
 */
export interface PreprocessingConversion {
  /** Parameter name that was converted */
  parameter: string;
  /** Original value before conversion */
  originalValue: unknown;
  /** Converted value */
  convertedValue: unknown;
  /** Type of conversion applied */
  conversionType:
    | 'string->number'
    | 'json->array'
    | 'json->object'
    | 'string->boolean';
}

/**
 * Default preprocessing configuration
 */
const DEFAULT_CONFIG: PreprocessingConfig = {
  enableNumberCoercion: true,
  enableJsonCoercion: true,
  enableBooleanCoercion: true,
  logConversions: true,
};

/**
 * Parameter preprocessor class
 */
export class ParameterPreprocessor {
  private readonly config: PreprocessingConfig;

  constructor(config: Partial<PreprocessingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Preprocess parameters to convert common agent input patterns
   *
   * @param parameters - Raw parameters from agent
   * @returns PreprocessingResult with converted parameters and conversion info
   */
  preprocessParameters(
    parameters: Record<string, unknown>
  ): PreprocessingResult {
    const result: PreprocessingResult = {
      parameters: { ...parameters },
      conversions: [],
      errors: [],
    };

    this.preprocessObjectRecursively(result.parameters, result, '');

    return result;
  }

  /**
   * Recursively preprocess parameters in nested objects
   *
   * @param obj - Object to preprocess
   * @param result - Result object to accumulate conversions and errors
   * @param keyPrefix - Prefix for nested keys (for logging)
   */
  private preprocessObjectRecursively(
    obj: Record<string, unknown>,
    result: PreprocessingResult,
    keyPrefix: string
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;

      try {
        // Handle nested objects
        if (
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          value.constructor === Object
        ) {
          this.preprocessObjectRecursively(
            value as Record<string, unknown>,
            result,
            fullKey
          );
          continue;
        }

        // Preprocess the value
        const conversion = this.preprocessValue(fullKey, value);
        if (conversion) {
          obj[key] = conversion.convertedValue;
          result.conversions.push(conversion);

          if (this.config.logConversions) {
            logger.debug('Parameter preprocessing conversion', {
              parameter: fullKey,
              from: conversion.originalValue,
              to: conversion.convertedValue,
              type: conversion.conversionType,
            });
          }
        }
      } catch (error) {
        const errorMessage = `Failed to preprocess parameter '${fullKey}': ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        result.errors.push(errorMessage);

        logger.warn('Parameter preprocessing error', {
          parameter: fullKey,
          value,
          error: errorMessage,
        });
      }
    }
  }

  /**
   * Preprocess a single parameter value
   *
   * @param key - Parameter name
   * @param value - Parameter value
   * @returns PreprocessingConversion if conversion was applied, null otherwise
   */
  private preprocessValue(
    key: string,
    value: unknown
  ): PreprocessingConversion | null {
    if (value === null || value === undefined) {
      return null;
    }

    // String to boolean conversion (check first to handle "1"/"0" as booleans)
    if (
      this.config.enableBooleanCoercion &&
      this.shouldConvertToBoolean(value)
    ) {
      const converted = this.convertStringToBoolean(value as string);
      if (converted !== null) {
        return {
          parameter: key,
          originalValue: value,
          convertedValue: converted,
          conversionType: 'string->boolean',
        };
      }
    }

    // JSON string to array/object conversion
    if (this.config.enableJsonCoercion && this.shouldConvertFromJson(value)) {
      const converted = this.convertJsonString(value as string);
      if (converted !== null) {
        return {
          parameter: key,
          originalValue: value,
          convertedValue: converted.value,
          conversionType: Array.isArray(converted.value)
            ? 'json->array'
            : 'json->object',
        };
      }
    }

    // String to number conversion (check last to avoid conflicts with boolean "1"/"0")
    if (this.config.enableNumberCoercion && this.shouldConvertToNumber(value)) {
      const converted = this.convertStringToNumber(value as string);
      if (converted !== null) {
        return {
          parameter: key,
          originalValue: value,
          convertedValue: converted,
          conversionType: 'string->number',
        };
      }
    }

    return null;
  }

  /**
   * Check if a value should be converted to a number
   */
  private shouldConvertToNumber(value: unknown): boolean {
    return typeof value === 'string' && this.isNumericString(value as string);
  }

  /**
   * Check if a string represents a number
   */
  private isNumericString(str: string): boolean {
    if (str.trim() === '') return false;

    // Check for integer
    if (/^-?\d+$/.test(str)) return true;

    // Check for decimal
    if (/^-?\d+\.\d+$/.test(str)) return true;

    // Check for scientific notation
    if (/^-?\d+(\.\d+)?[eE][+-]?\d+$/.test(str)) return true;

    return false;
  }

  /**
   * Convert string to number
   */
  private convertStringToNumber(str: string): number | null {
    try {
      const num = Number(str);
      if (isNaN(num) || !isFinite(num)) {
        return null;
      }
      return num;
    } catch {
      return null;
    }
  }

  /**
   * Check if a value should be converted from JSON
   */
  private shouldConvertFromJson(value: unknown): boolean {
    if (typeof value !== 'string') return false;

    const str = (value as string).trim();

    // Check if it looks like JSON array or object
    return (
      (str.startsWith('[') && str.endsWith(']')) ||
      (str.startsWith('{') && str.endsWith('}'))
    );
  }

  /**
   * Convert JSON string to parsed value
   */
  private convertJsonString(str: string): { value: unknown } | null {
    try {
      const parsed = JSON.parse(str);

      // Only convert arrays and plain objects
      if (
        Array.isArray(parsed) ||
        (typeof parsed === 'object' && parsed !== null)
      ) {
        return { value: parsed };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if a value should be converted to boolean
   */
  private shouldConvertToBoolean(value: unknown): boolean {
    if (typeof value !== 'string') return false;

    const str = (value as string).toLowerCase().trim();
    // Only convert explicit boolean words, not numeric strings like "1" and "0"
    const booleanStrings = ['true', 'false', 'yes', 'no'];

    return booleanStrings.includes(str);
  }

  /**
   * Convert string to boolean
   */
  private convertStringToBoolean(str: string): boolean | null {
    const normalized = str.toLowerCase().trim();

    switch (normalized) {
      case 'true':
      case 'yes':
        return true;
      case 'false':
      case 'no':
        return false;
      default:
        return null;
    }
  }

  /**
   * Get preprocessing statistics
   */
  getStats(result: PreprocessingResult): {
    totalParameters: number;
    convertedParameters: number;
    conversionsByType: Record<string, number>;
    errorCount: number;
  } {
    const conversionsByType: Record<string, number> = {};

    result.conversions.forEach(conversion => {
      conversionsByType[conversion.conversionType] =
        (conversionsByType[conversion.conversionType] || 0) + 1;
    });

    return {
      totalParameters: Object.keys(result.parameters).length,
      convertedParameters: result.conversions.length,
      conversionsByType,
      errorCount: result.errors.length,
    };
  }
}

/**
 * Global parameter preprocessor instance with default configuration
 */
export const parameterPreprocessor = new ParameterPreprocessor();

/**
 * Convenience function to preprocess parameters with default configuration
 *
 * @param parameters - Raw parameters to preprocess
 * @returns PreprocessingResult with converted parameters
 */
export function preprocessParameters(
  parameters: Record<string, unknown>
): PreprocessingResult {
  return parameterPreprocessor.preprocessParameters(parameters);
}

/**
 * Create a custom parameter preprocessor with specific configuration
 *
 * @param config - Custom preprocessing configuration
 * @returns New ParameterPreprocessor instance
 */
export function createPreprocessor(
  config: Partial<PreprocessingConfig>
): ParameterPreprocessor {
  return new ParameterPreprocessor(config);
}
