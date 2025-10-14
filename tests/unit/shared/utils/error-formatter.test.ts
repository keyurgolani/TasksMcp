/**
 * Unit tests for enhanced error formatting utilities
 */

import { describe, it, expect } from 'vitest';

import {
  ValidationError,
  OrchestrationError,
} from '../../../../src/shared/errors/orchestration-error.js';
import {
  createValidationError,
  createOrchestrationError,
  formatValidationErrors,
  ErrorContexts,
  DetailedErrors,
} from '../../../../src/shared/utils/error-formatter.js';

describe('Error Formatter', () => {
  describe('createValidationError', () => {
    it('should create Validation error with length information', () => {
      const error = createValidationError('Field exceeds maximum length', {
        context: {
          operation: 'Test Operation',
          field: 'title',
          actualLength: 150,
          maxLength: 100,
          currentValue: 'a'.repeat(150),
          expectedValue: 'string with max 100 characters',
        },
      });

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toContain('current: 150 characters');
      expect(error.message).toContain('maximum: 100 characters');
      expect(error.context).toBe('Test Operation');
      expect(error.currentValue).toBe('a'.repeat(150));
      expect(error.expectedValue).toBe('string with max 100 characters');
      expect(error.actionableGuidance).toContain(
        'Reduce the title by 50 characters'
      );
    });

    it('should create Validation error with valid options', () => {
      const validOptions = ['pending', 'in_progress', 'completed'];
      const error = createValidationError('Invalid status value', {
        context: {
          operation: 'Status Validation',
          field: 'status',
          currentValue: 'invalid_status',
          expectedValue: 'valid status',
          validOptions,
        },
      });

      expect(error.message).toContain(
        'Valid options: pending, in_progress, completed'
      );
      expect(error.actionableGuidance).toContain(
        'Choose one of the valid options'
      );
    });

    it('should generate actionable guidance for type errors', () => {
      const error = createValidationError('Invalid type', {
        context: {
          operation: 'Type Validation',
          field: 'priority',
          currentValue: 'high',
          expectedValue: 'number',
        },
      });

      expect(error.actionableGuidance).toContain(
        'Provide a numeric value for priority'
      );
      expect(error.actionableGuidance).toContain('Current type: string');
    });
  });

  describe('createOrchestrationError', () => {
    it('should create orchestration error with field prefix', () => {
      const error = createOrchestrationError('validation failed', {
        context: {
          operation: 'Test Operation',
          field: 'title',
          currentValue: 'test',
          expectedValue: 'valid title',
        },
      });

      expect(error).toBeInstanceOf(OrchestrationError);
      expect(error.message).toBe('title: validation failed');
      expect(error.context).toBe('Test Operation');
    });

    it('should include length information in message', () => {
      const error = createOrchestrationError('exceeds limit', {
        context: {
          operation: 'Length Validation',
          field: 'description',
          actualLength: 200,
          maxLength: 100,
          currentValue: 'test description',
        },
      });

      expect(error.message).toContain('current: 200, maximum: 100');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format single error', () => {
      const error = new ValidationError(
        'Test error',
        'Test Context',
        'test',
        'valid value',
        'Fix the test value'
      );

      const formatted = formatValidationErrors([error]);
      expect(formatted).toBe('Test error Fix the test value');
    });

    it('should format multiple errors', () => {
      const errors = [
        new ValidationError(
          'First error',
          'Context 1',
          'test1',
          'valid1',
          'Fix first'
        ),
        new ValidationError(
          'Second error',
          'Context 2',
          'test2',
          'valid2',
          'Fix second'
        ),
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain('2 validation errors found:');
      expect(formatted).toContain('1. First error Fix first');
      expect(formatted).toContain('2. Second error Fix second');
    });

    it('should handle empty error array', () => {
      const formatted = formatValidationErrors([]);
      expect(formatted).toBe('No validation errors');
    });
  });

  describe('ErrorContexts', () => {
    it('should create required field context', () => {
      const context = ErrorContexts.requiredField('title', 'Task Creation');

      expect(context.operation).toBe('Task Creation');
      expect(context.field).toBe('title');
      expect(context.currentValue).toBeUndefined();
      expect(context.expectedValue).toBe('non-empty value');
    });

    it('should create length validation context', () => {
      const context = ErrorContexts.lengthValidation(
        'description',
        'Validation',
        150,
        100
      );

      expect(context.operation).toBe('Validation');
      expect(context.field).toBe('description');
      expect(context.actualLength).toBe(150);
      expect(context.maxLength).toBe(100);
      expect(context.expectedValue).toBe('string with max 100 characters');
    });

    it('should create type validation context', () => {
      const context = ErrorContexts.typeValidation(
        'priority',
        'Type Check',
        'high',
        'number'
      );

      expect(context.operation).toBe('Type Check');
      expect(context.field).toBe('priority');
      expect(context.currentValue).toBe('high');
      expect(context.expectedValue).toBe('number');
    });

    it('should create options validation context', () => {
      const validOptions = ['low', 'medium', 'high'];
      const context = ErrorContexts.optionsValidation(
        'priority',
        'Options Check',
        'invalid',
        validOptions
      );

      expect(context.operation).toBe('Options Check');
      expect(context.field).toBe('priority');
      expect(context.currentValue).toBe('invalid');
      expect(context.validOptions).toEqual(validOptions);
      expect(context.expectedValue).toBe('one of: low, medium, high');
    });

    it('should create range validation context', () => {
      const context = ErrorContexts.rangeValidation(
        'priority',
        'Range Check',
        10,
        1,
        5
      );

      expect(context.operation).toBe('Range Check');
      expect(context.field).toBe('priority');
      expect(context.currentValue).toBe(10);
      expect(context.expectedValue).toBe('number between 1 and 5');
      expect(context.validOptions).toEqual(['1 to 5']);
    });

    it('should create not found context', () => {
      const context = ErrorContexts.notFound('Task', 'Task Lookup', 'task-123');

      expect(context.operation).toBe('Task Lookup');
      expect(context.field).toBe('TaskId');
      expect(context.currentValue).toBe('task-123');
      expect(context.expectedValue).toBe('valid Task ID');
    });
  });

  describe('DetailedErrors', () => {
    it('should create required field error', () => {
      const error = DetailedErrors.requiredField('title', 'Task Creation');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('title is required');
      expect(error.context).toBe('Task Creation');
      expect(error.actionableGuidance).toContain('Provide a valid title value');
    });

    it('should create length exceeded error', () => {
      const error = DetailedErrors.lengthExceeded(
        'title',
        'Validation',
        150,
        100,
        'a'.repeat(150)
      );

      expect(error.message).toContain('title exceeds maximum length');
      expect(error.message).toContain('current: 150 characters');
      expect(error.message).toContain('maximum: 100 characters');
      expect(error.actionableGuidance).toContain(
        'Reduce the title by 50 characters'
      );
    });

    it('should create invalid type error', () => {
      const error = DetailedErrors.invalidType(
        'priority',
        'Type Check',
        'high',
        'number'
      );

      expect(error.message).toBe('priority must be a number');
      expect(error.currentValue).toBe('high');
      expect(error.expectedValue).toBe('number');
      expect(error.actionableGuidance).toContain(
        'Provide a numeric value for priority'
      );
    });

    it('should create not found error', () => {
      const error = DetailedErrors.notFound('Task', 'Task Lookup', 'task-123');

      expect(error).toBeInstanceOf(OrchestrationError);
      expect(error.message).toBe('TaskId: Task not found');
      expect(error.currentValue).toBe('task-123');
      expect(error.actionableGuidance).toContain(
        'Ensure the Task ID "task-123" exists'
      );
    });

    it('should create invalid option error', () => {
      const validOptions = ['pending', 'completed'];
      const error = DetailedErrors.invalidOption(
        'status',
        'Status Check',
        'invalid',
        validOptions
      );

      expect(error.message).toContain('status has invalid value');
      expect(error.currentValue).toBe('invalid');
      expect(error.actionableGuidance).toContain(
        'Choose one of the valid options'
      );
    });

    it('should create out of range error', () => {
      const error = DetailedErrors.outOfRange(
        'priority',
        'Range Check',
        10,
        1,
        5
      );

      expect(error.message).toContain('priority is out of valid range');
      expect(error.currentValue).toBe(10);
      expect(error.expectedValue).toBe('number between 1 and 5');
      expect(error.actionableGuidance).toContain(
        'Set priority to a value between 1 and 5'
      );
      expect(error.actionableGuidance).toContain(
        'Current value 10 is too high'
      );
    });

    it('should create out of range error for low value', () => {
      const error = DetailedErrors.outOfRange(
        'priority',
        'Range Check',
        0,
        1,
        5
      );

      expect(error.actionableGuidance).toContain('Current value 0 is too low');
    });
  });

  describe('Actionable Guidance Generation', () => {
    it('should provide specific guidance for length violations', () => {
      const error = createValidationError('Too long', {
        context: {
          operation: 'Test',
          field: 'title',
          actualLength: 120,
          maxLength: 100,
        },
      });

      expect(error.actionableGuidance).toContain(
        'Reduce the title by 20 characters'
      );
      expect(error.actionableGuidance).toContain(
        'Consider using more concise language'
      );
    });

    it('should provide specific guidance for minimum length violations', () => {
      const error = createValidationError('Too short', {
        context: {
          operation: 'Test',
          field: 'description',
          actualLength: 5,
          minLength: 10,
        },
      });

      expect(error.actionableGuidance).toContain(
        'Add at least 5 more characters'
      );
      expect(error.actionableGuidance).toContain(
        'meet the 10 character minimum'
      );
    });

    it('should provide type-specific guidance', () => {
      const contexts = [
        {
          currentValue: 'text',
          expectedValue: 'number',
          guidance: 'Provide a numeric value for testField',
        },
        {
          currentValue: 123,
          expectedValue: 'string',
          guidance: 'Convert the testField to a string',
        },
        {
          currentValue: 'text',
          expectedValue: 'array',
          guidance: 'Provide an array for testField',
        },
        {
          currentValue: null,
          expectedValue: 'object',
          guidance: 'Provide a valid object for testField',
        },
      ];

      contexts.forEach(({ currentValue, expectedValue, guidance }) => {
        const error = createValidationError('Type error', {
          context: {
            operation: 'Test',
            field: 'testField',
            currentValue,
            expectedValue,
          },
        });

        expect(error.actionableGuidance).toContain(guidance);
      });
    });

    it('should provide guidance for empty required fields', () => {
      const emptyValues = [undefined, null, ''];

      emptyValues.forEach(value => {
        const error = createValidationError('Required field', {
          context: {
            operation: 'Test',
            field: 'title',
            currentValue: value,
          },
        });

        expect(error.actionableGuidance).toContain(
          'title is required and cannot be empty'
        );
      });
    });
  });

  describe('Error Message Enhancement', () => {
    it('should enhance messages with actual vs expected values', () => {
      const error = createValidationError('Invalid priority', {
        context: {
          operation: 'Priority Validation',
          field: 'priority',
          currentValue: 10,
          actualLength: undefined,
          maxLength: undefined,
          validOptions: ['1', '2', '3', '4', '5'],
        },
      });

      expect(error.message).toContain('Valid options: 1, 2, 3, 4, 5');
    });

    it('should not include value details when disabled', () => {
      const error = createValidationError('Sensitive error', {
        context: {
          operation: 'Security Check',
          field: 'password',
          currentValue: 'secret123',
          expectedValue: 'valid password',
        },
        includeValueDetails: false,
      });

      expect(error.currentValue).toBeUndefined();
    });
  });
});
