/**
 * List validator for comprehensive task list data validation
 * Implements all list validation rules and business constraints
 */

import {
  TASK_LIST_TITLE_MAX_LENGTH,
  TASK_LIST_DESCRIPTION_MAX_LENGTH,
  PROJECT_TAG_MAX_LENGTH,
  PROJECT_TAG_PATTERN,
} from '../../../domain/models/task-list';
import {
  ValidationResult,
  ValidationError,
  ValidationSchema,
} from '../../../shared/types/validation';

export class ListValidator {
  private readonly listSchema: ValidationSchema = {
    title: {
      required: true,
      minLength: 1,
      maxLength: TASK_LIST_TITLE_MAX_LENGTH,
    },
    description: {
      maxLength: TASK_LIST_DESCRIPTION_MAX_LENGTH,
    },
    projectTag: {
      maxLength: PROJECT_TAG_MAX_LENGTH,
      pattern: PROJECT_TAG_PATTERN,
    },
  };

  validate(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      errors.push({
        field: 'data',
        message: 'List data must be an object',
        currentValue: data,
        expectedValue: 'object',
        actionableGuidance: 'Provide a valid list data object',
      });
      return { isValid: false, errors, warnings };
    }

    const listData = data as Record<string, unknown>;

    // Validate each field according to schema
    for (const [fieldName, validation] of Object.entries(this.listSchema)) {
      const value = listData[fieldName];

      // Check required fields
      if (
        validation.required &&
        (value === undefined || value === null || value === '')
      ) {
        errors.push({
          field: fieldName,
          message: `${fieldName} is required`,
          currentValue: value,
          expectedValue: 'non-empty value',
          actionableGuidance: `Provide a valid ${fieldName}`,
        });
        continue;
      }

      // Skip validation if field is not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // String validation
      if (typeof value === 'string') {
        if (validation.minLength && value.length < validation.minLength) {
          errors.push({
            field: fieldName,
            message: `${fieldName} must be at least ${validation.minLength} characters`,
            currentValue: value.length,
            expectedValue: `>= ${validation.minLength}`,
            actionableGuidance: `Provide a ${fieldName} with at least ${validation.minLength} characters`,
          });
        }

        if (validation.maxLength && value.length > validation.maxLength) {
          errors.push({
            field: fieldName,
            message: `${fieldName} must be at most ${validation.maxLength} characters`,
            currentValue: value.length,
            expectedValue: `<= ${validation.maxLength}`,
            actionableGuidance: `Reduce ${fieldName} to ${validation.maxLength} characters or less`,
          });
        }

        if (validation.pattern && !validation.pattern.test(value)) {
          errors.push({
            field: fieldName,
            message: `${fieldName} format is invalid`,
            currentValue: value,
            expectedValue: validation.pattern.toString(),
            actionableGuidance: this.getPatternGuidance(
              fieldName,
              validation.pattern
            ),
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private getPatternGuidance(fieldName: string, pattern: RegExp): string {
    if (fieldName === 'projectTag') {
      return 'Project tag must use lowercase letters, numbers, and hyphens only (e.g., "web-app", "mobile-project")';
    }

    return `Ensure ${fieldName} matches the required format: ${pattern.toString()}`;
  }
}
