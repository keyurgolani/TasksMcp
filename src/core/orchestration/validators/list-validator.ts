/**
 * List validator for orchestration layer
 * Validates list data according to domain rules
 */

import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../../../shared/types/validation.js';

export class ListValidator {
  validate(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!data || typeof data !== 'object') {
      errors.push({
        field: 'data',
        message: 'List data must be an object',
        currentValue: data,
        expectedValue: 'object',
        actionableGuidance: 'Provide a valid list object with required fields',
      });
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    const listData = data as Record<string, unknown>;

    // Validate required title field
    if (!listData['title']) {
      errors.push({
        field: 'title',
        message: 'title is required',
        currentValue: listData['title'],
        expectedValue: 'string',
        actionableGuidance: 'Provide a non-empty string title',
      });
    } else if (typeof listData['title'] !== 'string') {
      errors.push({
        field: 'title',
        message: 'title must be a string',
        currentValue: listData['title'],
        expectedValue: 'string',
        actionableGuidance: 'Provide a string value for title',
      });
    } else if (listData['title'].length > 1000) {
      errors.push({
        field: 'title',
        message: 'title must be at most 1000 characters',
        currentValue: listData['title'],
        expectedValue: 'string with max 1000 characters',
        actionableGuidance: 'Shorten the title to 1000 characters or less',
      });
    }

    // Validate description length
    if (
      listData['description'] &&
      typeof listData['description'] === 'string'
    ) {
      if (listData['description'].length > 5000) {
        errors.push({
          field: 'description',
          message: 'description must be at most 5000 characters',
          currentValue: listData['description'],
          expectedValue: 'string with max 5000 characters',
          actionableGuidance:
            'Shorten the description to 5000 characters or less',
        });
      }
    }

    // Validate project tag
    if (listData['projectTag']) {
      const projectTagValidation = this.validateProjectTag(
        listData['projectTag']
      );
      errors.push(...projectTagValidation.errors);
      warnings.push(...projectTagValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateProjectTag(projectTag: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (typeof projectTag !== 'string') {
      errors.push({
        field: 'projectTag',
        message: 'projectTag must be a string',
        currentValue: projectTag,
        expectedValue: 'string',
        actionableGuidance: 'Provide a string value for projectTag',
      });
      return { isValid: false, errors, warnings };
    }

    if (projectTag.length > 250) {
      errors.push({
        field: 'projectTag',
        message: 'projectTag must be at most 250 characters',
        currentValue: projectTag,
        expectedValue: 'string with max 250 characters',
        actionableGuidance: 'Shorten the project tag to 250 characters or less',
      });
      return { isValid: false, errors, warnings };
    }

    // Validate project tag pattern (lowercase with hyphens)
    const validPattern = /^[a-z0-9-]+$/;
    if (!validPattern.test(projectTag)) {
      errors.push({
        field: 'projectTag',
        message: 'projectTag format is invalid',
        currentValue: projectTag,
        expectedValue: 'lowercase alphanumeric with hyphens (e.g., "web-app")',
        actionableGuidance:
          'Use lowercase letters, numbers, and hyphens only (e.g., "web-app" or "mobile-project")',
      });
      return { isValid: false, errors, warnings };
    }

    return {
      isValid: true,
      errors,
      warnings,
    };
  }
}
