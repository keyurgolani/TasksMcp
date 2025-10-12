/**
 * Task validator for comprehensive task data validation
 * Implements all task validation rules and business constraints
 */

import {
  TAG_VALIDATION_PATTERN,
  TAG_MAX_LENGTH,
  PRIORITY_MIN,
  PRIORITY_MAX,
  AGENT_PROMPT_TEMPLATE_MAX_LENGTH,
} from '../../../domain/models/task';
import {
  ValidationResult,
  ValidationError,
  ValidationSchema,
} from '../../../shared/types/validation';

export class TaskValidator {
  private readonly taskSchema: ValidationSchema = {
    title: {
      required: true,
      minLength: 1,
      maxLength: 1000,
    },
    description: {
      maxLength: 5000,
    },
    priority: {
      customValidator: (value: unknown) => this.validatePriority(value),
    },
    estimatedDuration: {
      customValidator: (value: unknown) =>
        this.validateEstimatedDuration(value),
    },
    tags: {
      customValidator: (value: unknown) => this.validateTags(value),
    },
    agentPromptTemplate: {
      maxLength: AGENT_PROMPT_TEMPLATE_MAX_LENGTH,
    },
  };

  validate(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      errors.push({
        field: 'data',
        message: 'Task data must be an object',
        currentValue: data,
        expectedValue: 'object',
        actionableGuidance: 'Provide a valid task data object',
      });
      return { isValid: false, errors, warnings };
    }

    const taskData = data as Record<string, unknown>;

    // Validate each field according to schema
    for (const [fieldName, validation] of Object.entries(this.taskSchema)) {
      const value = taskData[fieldName];

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

      // String length validation
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
            actionableGuidance: `Ensure ${fieldName} matches the required format`,
          });
        }
      }

      // Custom validation
      if (validation.customValidator) {
        const customResult = validation.customValidator(value);
        if (!customResult.isValid) {
          errors.push(...customResult.errors);
          warnings.push(...customResult.warnings);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateTags(tags: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    if (!Array.isArray(tags)) {
      errors.push({
        field: 'tags',
        message: 'Tags must be an array',
        currentValue: typeof tags,
        expectedValue: 'array',
        actionableGuidance: 'Provide tags as an array of strings',
      });
      return { isValid: false, errors, warnings };
    }

    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];

      if (typeof tag !== 'string') {
        errors.push({
          field: `tags[${i}]`,
          message: 'Each tag must be a string',
          currentValue: typeof tag,
          expectedValue: 'string',
          actionableGuidance: 'Ensure all tags are strings',
        });
        continue;
      }

      if (tag.length === 0) {
        errors.push({
          field: `tags[${i}]`,
          message: 'Tags cannot be empty',
          currentValue: tag.length,
          expectedValue: '> 0',
          actionableGuidance: 'Remove empty tags or provide valid tag content',
        });
        continue;
      }

      if (tag.length > TAG_MAX_LENGTH) {
        errors.push({
          field: `tags[${i}]`,
          message: `Tag must be at most ${TAG_MAX_LENGTH} characters`,
          currentValue: tag.length,
          expectedValue: `<= ${TAG_MAX_LENGTH}`,
          actionableGuidance: `Shorten tag "${tag}" to ${TAG_MAX_LENGTH} characters or less`,
        });
        continue;
      }

      if (!TAG_VALIDATION_PATTERN.test(tag)) {
        errors.push({
          field: `tags[${i}]`,
          message: 'Tag contains invalid characters',
          currentValue: tag,
          expectedValue: 'Letters, numbers, emoji, hyphens, underscores only',
          actionableGuidance:
            'Use only letters, numbers, emoji, hyphens (-), and underscores (_) in tags',
        });
      }
    }

    // Check for duplicates
    const uniqueTags = new Set(tags);
    if (uniqueTags.size !== tags.length) {
      warnings.push({
        field: 'tags',
        message: 'Duplicate tags found',
        currentValue: tags.length,
        expectedValue: uniqueTags.size,
        actionableGuidance: 'Remove duplicate tags',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validatePriority(priority: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof priority !== 'number') {
      errors.push({
        field: 'priority',
        message: 'Priority must be a number',
        currentValue: typeof priority,
        expectedValue: 'number',
        actionableGuidance: 'Provide priority as a number between 1 and 5',
      });
      return { isValid: false, errors, warnings: [] };
    }

    if (!Number.isInteger(priority)) {
      errors.push({
        field: 'priority',
        message: 'Priority must be an integer',
        currentValue: priority,
        expectedValue: 'integer',
        actionableGuidance:
          'Provide priority as a whole number between 1 and 5',
      });
    }

    if (priority < PRIORITY_MIN || priority > PRIORITY_MAX) {
      errors.push({
        field: 'priority',
        message: `Priority must be between ${PRIORITY_MIN} and ${PRIORITY_MAX}`,
        currentValue: priority,
        expectedValue: `${PRIORITY_MIN}-${PRIORITY_MAX}`,
        actionableGuidance: `Set priority to a value between ${PRIORITY_MIN} (minimal) and ${PRIORITY_MAX} (critical)`,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  private validateEstimatedDuration(duration: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (typeof duration !== 'number') {
      errors.push({
        field: 'estimatedDuration',
        message: 'Estimated duration must be a number',
        currentValue: typeof duration,
        expectedValue: 'number',
        actionableGuidance:
          'Provide estimated duration in minutes as a positive number',
      });
      return { isValid: false, errors, warnings: [] };
    }

    if (duration <= 0) {
      errors.push({
        field: 'estimatedDuration',
        message: 'Estimated duration must be positive',
        currentValue: duration,
        expectedValue: '> 0',
        actionableGuidance:
          'Provide a positive number of minutes for estimated duration',
      });
    }

    if (!Number.isFinite(duration)) {
      errors.push({
        field: 'estimatedDuration',
        message: 'Estimated duration must be a finite number',
        currentValue: duration,
        expectedValue: 'finite number',
        actionableGuidance:
          'Provide a valid finite number for estimated duration',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }
}
