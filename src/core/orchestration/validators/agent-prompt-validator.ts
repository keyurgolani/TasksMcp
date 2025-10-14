/**
 * Agent prompt validator for orchestration layer
 * Validates agent prompt templates according to domain rules
 */

import {
  ValidationResult,
  ValidationError,
} from '../../../shared/types/validation.js';
import { DetailedErrors } from '../../../shared/utils/error-formatter.js';

export class AgentPromptValidator {
  validateTemplate(template: string | undefined): ValidationResult {
    const errors: ValidationError[] = [];

    if (template === undefined || template === null || template === '') {
      return {
        isValid: true,
        errors: [],
        warnings: [],
      };
    }

    if (typeof template !== 'string') {
      const detailedError = DetailedErrors.invalidType(
        'template',
        'Agent Prompt Template Validation',
        template,
        'string'
      );
      errors.push({
        field: detailedError.context,
        message: detailedError.message,
        currentValue: detailedError.currentValue,
        expectedValue: detailedError.expectedValue,
        actionableGuidance:
          detailedError.actionableGuidance ||
          'Provide a valid template string with agent instructions',
      });
    }

    if (typeof template === 'string' && template.length > 10000) {
      const detailedError = DetailedErrors.lengthExceeded(
        'template',
        'Agent Prompt Template Validation',
        template.length,
        10000,
        template
      );
      errors.push({
        field: detailedError.context,
        message: detailedError.message,
        currentValue: detailedError.currentValue,
        expectedValue: detailedError.expectedValue,
        ...(detailedError.actionableGuidance && {
          actionableGuidance: detailedError.actionableGuidance,
        }),
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  validate(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (data && typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      if ('agentPromptTemplate' in obj) {
        const templateResult = this.validateTemplate(
          obj['agentPromptTemplate'] as string
        );
        errors.push(...templateResult.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }
}
