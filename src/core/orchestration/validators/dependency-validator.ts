/**
 * Dependency validator for orchestration layer
 * Validates dependency data according to domain rules
 */

import {
  ValidationResult,
  ValidationError,
} from '../../../shared/types/validation.js';

export class DependencyValidator {
  private isValidUUID(value: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  validate(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
      errors.push({
        field: 'data',
        message: 'Dependency data must be an object',
        currentValue: data,
        expectedValue: 'object',
        actionableGuidance: 'Provide a valid dependency object',
      });
      return {
        isValid: false,
        errors,
        warnings: [],
      };
    }

    const obj = data as Record<string, unknown>;

    // Validate taskId
    if ('taskId' in obj) {
      if (typeof obj['taskId'] !== 'string') {
        errors.push({
          field: 'taskId',
          message: 'Task ID must be a string',
          currentValue: obj['taskId'],
          expectedValue: 'string',
          actionableGuidance: 'Provide a valid task ID string',
        });
      } else if (!this.isValidUUID(obj['taskId'])) {
        errors.push({
          field: 'taskId',
          message: 'Task ID must be a valid UUID',
          currentValue: obj['taskId'],
          expectedValue: 'UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
          actionableGuidance: 'Provide a valid UUID for the task ID',
        });
      }
    }

    // Validate dependencyIds
    if ('dependencyIds' in obj) {
      if (!Array.isArray(obj['dependencyIds'])) {
        errors.push({
          field: 'dependencyIds',
          message: 'Dependency IDs must be an array',
          currentValue: obj['dependencyIds'],
          expectedValue: 'array',
          actionableGuidance: 'Provide an array of dependency IDs',
        });
      } else {
        (obj['dependencyIds'] as unknown[]).forEach((depId, index) => {
          if (typeof depId !== 'string') {
            errors.push({
              field: `dependencyIds[${index}]`,
              message: 'Dependency ID must be a string',
              currentValue: depId,
              expectedValue: 'string',
              actionableGuidance: 'Provide a valid dependency ID string',
            });
          } else if (!this.isValidUUID(depId)) {
            errors.push({
              field: `dependencyIds[${index}]`,
              message: 'Dependency ID must be a valid UUID',
              currentValue: depId,
              expectedValue:
                'UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
              actionableGuidance: 'Provide a valid UUID for the dependency ID',
            });
          } else if ('taskId' in obj && depId === obj['taskId']) {
            errors.push({
              field: `dependencyIds[${index}]`,
              message:
                'Task cannot depend on itself (self-dependency not allowed)',
              currentValue: depId,
              expectedValue: 'Different UUID than taskId',
              actionableGuidance:
                'Remove the self-dependency or use a different task ID',
            });
          }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }
}
