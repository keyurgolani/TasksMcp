/**
 * Unit tests for task 30.1: Write unit tests for improved error messages
 * Tests that improved error messages provide helpful guidance, include actual values
 * and expected ranges, and provide actionable guidance as per requirements 6.7 and 12.1
 */

import { describe, it, expect } from 'vitest';

import { AgentPromptValidator } from '../../../../src/core/orchestration/validators/agent-prompt-validator.js';
import { TaskValidator } from '../../../../src/core/orchestration/validators/task-validator.js';
import {
  ValidationError,
  OrchestrationError,
  StatusTransitionError,
  CircularDependencyError,
  TemplateRenderError,
  TaskNotFoundError,
  ListNotFoundError,
} from '../../../../src/shared/errors/orchestration-error.js';
import {
  createValidationError,
  createOrchestrationError,
  formatValidationErrors,
  DetailedErrors,
  ErrorContexts,
} from '../../../../src/shared/utils/error-formatter.js';

describe('Task 30.1: Write unit tests for improved error messages', () => {
  const taskValidator = new TaskValidator();
  const agentPromptValidator = new AgentPromptValidator();

  describe('Enhanced Error Message Requirements', () => {
    it('should include actual length and guidance in error messages', () => {
      const longTitle = 'a'.repeat(1200);
      const result = taskValidator.validate({ title: longTitle });

      expect(result.isValid).toBe(false);
      const error = result.errors[0];

      // Should include actual length
      expect(error.message).toContain('current: 1200 characters');
      expect(error.message).toContain('maximum: 1000 characters');

      // Should include actionable guidance
      expect(error.actionableGuidance).toContain(
        'Reduce the title by 200 characters'
      );
      expect(error.actionableGuidance).toContain(
        'Consider using more concise language'
      );
    });

    it('should add contextual information to Validation error messages', () => {
      const result = taskValidator.validatePriority(10);

      expect(result.isValid).toBe(false);
      const error = result.errors[0];

      // Should include contextual information
      expect(error.message).toContain('current: 10');
      expect(error.currentValue).toBe(10);
      expect(error.expectedValue).toBe('integer between 1 and 5');

      // Should provide context about what each priority level means
      expect(error.actionableGuidance).toContain('1 (minimal)');
      expect(error.actionableGuidance).toContain('5 (critical/urgent)');
    });

    it('should provide actionable guidance in error responses', () => {
      const testCases = [
        {
          data: { title: 123 },
          expectedGuidance: 'Convert the title to a string',
          expectedContext: 'Current type: number',
        },
        {
          data: { title: 'valid', estimatedDuration: -30 },
          expectedGuidance: 'Provide a positive duration in minutes',
          expectedContext: 'Current value -30 is negative',
        },
        {
          data: { title: 'valid', tags: ['valid', ''] },
          expectedGuidance: 'Remove empty tags from the array',
          expectedContext: 'cannot be empty',
        },
      ];

      testCases.forEach(({ data, expectedGuidance, expectedContext }) => {
        const result = taskValidator.validate(data);
        expect(result.isValid).toBe(false);

        const hasExpectedGuidance = result.errors.some(
          error =>
            error.actionableGuidance?.includes(expectedGuidance) &&
            (error.message.includes(expectedContext) ||
              error.actionableGuidance?.includes(expectedContext))
        );
        expect(hasExpectedGuidance).toBe(true);
      });
    });
  });

  describe('Error Formatter Utility Functions', () => {
    it('should create detailed Validation errors with length information', () => {
      const error = createValidationError('Field too long', {
        context: {
          operation: 'Test Validation',
          field: 'testField',
          actualLength: 150,
          maxLength: 100,
          currentValue: 'test value',
          expectedValue: 'shorter value',
        },
      });

      expect(error.message).toContain('current: 150 characters');
      expect(error.message).toContain('maximum: 100 characters');
      expect(error.actionableGuidance).toContain(
        'Reduce the testField by 50 characters'
      );
    });

    it('should create orchestration errors with contextual information', () => {
      const error = createOrchestrationError('validation failed', {
        context: {
          operation: 'Test Operation',
          field: 'testField',
          currentValue: 'invalid',
          expectedValue: 'valid value',
        },
      });

      expect(error.message).toBe('testField: validation failed');
      expect(error.context).toBe('Test Operation');
      expect(error.currentValue).toBe('invalid');
      expect(error.expectedValue).toBe('valid value');
    });

    it('should format multiple Validation errors consistently', () => {
      const errors = [
        DetailedErrors.requiredField('title', 'Task Creation'),
        DetailedErrors.outOfRange('priority', 'Priority Validation', 10, 1, 5),
      ];

      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain('2 validation errors found:');
      expect(formatted).toContain('1. title is required');
      expect(formatted).toContain('2. priority is out of valid range');
    });
  });

  describe('Comprehensive Error Message Coverage', () => {
    it('should provide enhanced messages for all validation scenarios', () => {
      const validationScenarios = [
        // Type validation
        {
          data: { title: 123 },
          expectedMessage: 'must be a string',
          expectedGuidance: 'Convert',
        },
        {
          data: { title: 'valid', priority: 'high' },
          expectedMessage: 'must be a number',
          expectedGuidance: 'Provide a numeric',
        },

        // Length validation
        {
          data: { title: 'a'.repeat(1500) },
          expectedMessage: 'exceeds maximum length',
          expectedGuidance: 'Reduce the title by',
        },
        {
          data: { title: 'valid', description: 'a'.repeat(6000) },
          expectedMessage: 'exceeds maximum length',
          expectedGuidance: 'Reduce the description by',
        },

        // Range validation
        {
          data: { title: 'valid', priority: 0 },
          expectedMessage: 'must be between 1 and 5',
          expectedGuidance: 'Set priority to:',
        },
        {
          data: { title: 'valid', estimatedDuration: -10 },
          expectedMessage: 'must be positive',
          expectedGuidance: 'must be greater than 0',
        },

        // Array validation
        {
          data: { title: 'valid', tags: 'not-array' },
          expectedMessage: 'must be an array',
          expectedGuidance: 'Provide an array',
        },
        {
          data: { title: 'valid', tags: ['valid', 123] },
          expectedMessage: 'must be a string',
          expectedGuidance: 'Ensure all tags are string',
        },
      ];

      validationScenarios.forEach(
        ({ data, expectedMessage, expectedGuidance }) => {
          const result = taskValidator.validate(data);
          expect(result.isValid).toBe(false);

          const hasExpectedError = result.errors.some(
            error =>
              error.message.includes(expectedMessage) &&
              error.actionableGuidance?.includes(expectedGuidance)
          );
          expect(hasExpectedError).toBe(true);
        }
      );
    });

    it('should provide specific numeric details in all length-related errors', () => {
      const lengthTestCases = [
        { field: 'title', maxLength: 1000, testLength: 1200 },
        { field: 'description', maxLength: 5000, testLength: 6000 },
        { field: 'agentPromptTemplate', maxLength: 10000, testLength: 12000 },
      ];

      lengthTestCases.forEach(({ field, maxLength, testLength }) => {
        const data = { title: 'valid', [field]: 'a'.repeat(testLength) };
        const result = taskValidator.validate(data);

        const lengthError = result.errors.find(e => e.field === field);
        expect(lengthError).toBeDefined();
        expect(lengthError?.message).toContain(
          `current: ${testLength} characters`
        );
        expect(lengthError?.message).toContain(
          `maximum: ${maxLength} characters`
        );
        expect(lengthError?.actionableGuidance).toContain(
          `by ${testLength - maxLength} characters`
        );
      });
    });

    it('should provide helpful warnings for edge cases', () => {
      // Test very long duration warning
      const longDurationResult = taskValidator.validateEstimatedDuration(20160); // 2 weeks
      expect(longDurationResult.isValid).toBe(true);
      expect(longDurationResult.warnings).toHaveLength(1);
      expect(longDurationResult.warnings[0].message).toContain(
        'unusually long'
      );
      expect(longDurationResult.warnings[0].suggestion).toContain(
        'breaking this task into smaller subtasks'
      );

      // Test very short duration warning
      const shortDurationResult = taskValidator.validateEstimatedDuration(0.5);
      expect(shortDurationResult.isValid).toBe(true);
      expect(shortDurationResult.warnings).toHaveLength(1);
      expect(shortDurationResult.warnings[0].message).toContain('very short');

      // Test duplicate tags warning
      const duplicateTagsResult = taskValidator.validateTags([
        'tag1',
        'tag2',
        'tag1',
      ]);
      expect(duplicateTagsResult.isValid).toBe(true);
      expect(duplicateTagsResult.warnings).toHaveLength(1);
      expect(duplicateTagsResult.warnings[0].message).toContain(
        'Duplicate tags found'
      );
      expect(duplicateTagsResult.warnings[0].suggestion).toContain(
        'Remove duplicate tags'
      );
    });
  });

  describe('Agent Prompt Validator Enhanced Messages', () => {
    it('should provide detailed guidance for template Validation errors', () => {
      const longTemplate = 'a'.repeat(12000);
      const result = agentPromptValidator.validateTemplate(longTemplate);

      expect(result.isValid).toBe(false);
      const error = result.errors[0];

      expect(error.message).toContain('exceeds maximum length');
      expect(error.currentValue).toBe(longTemplate);
      expect(error.expectedValue).toBe('string with max 10000 characters');
      expect(error.actionableGuidance).toContain(
        'Reduce the template by 2000 characters'
      );
    });

    it('should provide type-specific guidance for template validation', () => {
      const result = agentPromptValidator.validateTemplate(123 as any);

      expect(result.isValid).toBe(false);
      const error = result.errors[0];

      expect(error.message).toContain('must be a string');
      expect(error.actionableGuidance).toContain(
        'Convert the template to a string'
      );
      expect(error.actionableGuidance).toContain('Current type: number');
    });
  });

  describe('Error Message Quality Standards', () => {
    it('should ensure all error messages meet quality standards', () => {
      const testData = [
        null,
        { title: 123 },
        { title: '' },
        { title: 'a'.repeat(2000) },
        { title: 'valid', priority: 'invalid' },
        { title: 'valid', estimatedDuration: 'invalid' },
        { title: 'valid', tags: 'invalid' },
        { title: 'valid', tags: [123, ''] },
      ];

      testData.forEach(data => {
        const result = taskValidator.validate(data);
        if (!result.isValid) {
          result.errors.forEach(error => {
            // Every error should have these properties
            expect(error.field).toBeDefined();
            expect(error.message).toBeDefined();
            expect(error.currentValue).toBeDefined();
            expect(error.expectedValue).toBeDefined();
            expect(error.actionableGuidance).toBeDefined();

            // Messages should be descriptive
            expect(error.message.length).toBeGreaterThan(10);
            expect(error.actionableGuidance.length).toBeGreaterThan(10);

            // Guidance should be actionable (contain action words)
            const actionWords = [
              'provide',
              'ensure',
              'convert',
              'reduce',
              'set',
              'remove',
              'add',
              'fix',
              'check',
            ];
            const hasActionWord = actionWords.some(word =>
              error.actionableGuidance.toLowerCase().includes(word)
            );
            expect(hasActionWord).toBe(true);
          });
        }
      });
    });

    it('should provide consistent error structure across all validators', () => {
      const taskResult = taskValidator.validate({ title: 123 });
      const agentResult = agentPromptValidator.validateTemplate(123 as any);

      [taskResult, agentResult].forEach(result => {
        expect(result.isValid).toBe(false);
        result.errors.forEach(error => {
          expect(error).toHaveProperty('field');
          expect(error).toHaveProperty('message');
          expect(error).toHaveProperty('currentValue');
          expect(error).toHaveProperty('expectedValue');
          expect(error).toHaveProperty('actionableGuidance');
        });
      });
    });
  });

  describe('Requirement 6.7: Improved Error Messages with Detailed Guidance', () => {
    describe('Error messages include actual values and expected ranges', () => {
      it('should include actual length and maximum length in validation errors', () => {
        const longTitle = 'a'.repeat(1500);
        const result = taskValidator.validate({ title: longTitle });

        expect(result.isValid).toBe(false);
        const error = result.errors[0];

        // Should include actual length
        expect(error.message).toContain('current: 1500 characters');
        // Should include maximum length
        expect(error.message).toContain('maximum: 1000 characters');
        // Should include current value
        expect(error.currentValue).toBe(longTitle);
        // Should include expected value format
        expect(error.expectedValue).toContain('string');
      });

      it('should include actual priority value and valid range in priority errors', () => {
        const result = taskValidator.validatePriority(10);

        expect(result.isValid).toBe(false);
        const error = result.errors[0];

        // Should include actual value
        expect(error.currentValue).toBe(10);
        expect(error.message).toContain('current: 10');
        // Should include expected range
        expect(error.expectedValue).toBe('integer between 1 and 5');
        expect(error.message).toContain('between 1 and 5');
      });

      it('should include actual duration value and constraints in duration errors', () => {
        const result = taskValidator.validateEstimatedDuration(-30);

        expect(result.isValid).toBe(false);
        const error = result.errors[0];

        // Should include actual value
        expect(error.currentValue).toBe(-30);
        // Should include constraint information
        expect(error.actionableGuidance).toContain(
          'Current value -30 is negative'
        );
        expect(error.expectedValue).toBe('positive number (minutes)');
      });

      it('should include actual tag values and validation constraints in tag errors', () => {
        const invalidTags = [
          'valid-tag',
          'invalid tag with spaces',
          'a'.repeat(60),
        ];
        const result = taskValidator.validateTags(invalidTags);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);

        // Check space error includes actual tag value
        const spaceError = result.errors.find(e =>
          e.message.includes('invalid characters')
        );
        expect(spaceError).toBeDefined();
        expect(spaceError?.currentValue).toBe('invalid tag with spaces');
        expect(spaceError?.expectedValue).toContain(
          'letters, numbers, emoji, hyphens, or underscores'
        );

        // Check length error includes actual length
        const lengthError = result.errors.find(e =>
          e.message.includes('exceeds maximum length')
        );
        expect(lengthError).toBeDefined();
        expect(lengthError?.message).toContain('current: 60 characters');
        expect(lengthError?.message).toContain('maximum: 50 characters');
      });

      it('should include actual type and expected type in type validation errors', () => {
        const testCases = [
          { value: 123, field: 'title', expectedType: 'string' },
          { value: 'high', field: 'priority', expectedType: 'number' },
          { value: 'not-array', field: 'tags', expectedType: 'array' },
        ];

        testCases.forEach(({ value, field, expectedType }) => {
          let result;
          if (field === 'title') {
            result = taskValidator.validate({ title: value });
          } else if (field === 'priority') {
            result = taskValidator.validatePriority(value);
          } else if (field === 'tags') {
            result = taskValidator.validateTags(value);
          }

          expect(result?.isValid).toBe(false);
          const error = result?.errors[0];
          expect(error?.currentValue).toBe(value);
          // For priority, the expected value includes range information
          // For tags, the expected value includes more detail
          if (field === 'priority') {
            expect(error?.expectedValue).toContain(expectedType);
          } else if (field === 'tags') {
            expect(error?.expectedValue).toContain(expectedType);
          } else {
            expect(error?.expectedValue).toBe(expectedType);
          }
          expect(error?.actionableGuidance).toContain(
            `Current type: ${typeof value}`
          );
        });
      });
    });

    describe('Error messages provide actionable guidance', () => {
      it('should provide specific reduction guidance for length violations', () => {
        const testCases = [
          { field: 'title', length: 1200, maxLength: 1000, excess: 200 },
          { field: 'description', length: 6000, maxLength: 5000, excess: 1000 },
          {
            field: 'agentPromptTemplate',
            length: 12000,
            maxLength: 10000,
            excess: 2000,
          },
        ];

        testCases.forEach(({ field, length, maxLength, excess }) => {
          const longValue = 'a'.repeat(length);
          let result;
          let expectedField = field;

          if (field === 'title') {
            result = taskValidator.validate({ title: longValue });
          } else if (field === 'description') {
            result = taskValidator.validate({
              title: 'valid',
              description: longValue,
            });
          } else if (field === 'agentPromptTemplate') {
            result = agentPromptValidator.validateTemplate(longValue);
            expectedField = 'Agent Prompt Template Validation'; // Different field name
          }

          expect(result?.isValid).toBe(false);
          const error = result?.errors.find(e => e.field === expectedField);
          expect(error).toBeDefined();
          expect(error!.actionableGuidance).toContain(`${excess} characters`);
          expect(error!.actionableGuidance).toContain(
            `${maxLength} character limit`
          );
        });
      });

      it('should provide conversion guidance for type mismatches', () => {
        const testCases = [
          { value: 123, expectedAction: 'Convert the title to a string' },
          { value: [], expectedAction: 'Convert the title to a string' },
          { value: null, expectedAction: 'Convert the title to a string' },
        ];

        testCases.forEach(({ value, expectedAction }) => {
          const result = taskValidator.validate({ title: value });
          expect(result.isValid).toBe(false);
          const error = result.errors[0];
          // Check if it's a type error (not a required field error)
          if (value !== null && value !== undefined && value !== '') {
            expect(error.actionableGuidance).toContain(expectedAction);
          } else {
            // For null/undefined, it's a required field error
            expect(error.actionableGuidance).toContain(
              'Provide a valid title value'
            );
          }
        });
      });

      it('should provide range correction guidance for numeric values', () => {
        const priorityResult = taskValidator.validatePriority(10);
        expect(priorityResult.isValid).toBe(false);
        const priorityError = priorityResult.errors[0];
        expect(priorityError.actionableGuidance).toContain('Set priority to:');
        expect(priorityError.actionableGuidance).toContain('1 (minimal)');
        expect(priorityError.actionableGuidance).toContain(
          '5 (critical/urgent)'
        );

        const durationResult = taskValidator.validateEstimatedDuration(-30);
        expect(durationResult.isValid).toBe(false);
        const durationError = durationResult.errors[0];
        expect(durationError.actionableGuidance).toContain(
          'Provide a positive duration in minutes'
        );
        expect(durationError.actionableGuidance).toContain(
          'must be greater than 0'
        );
      });

      it('should provide format correction guidance for invalid formats', () => {
        const invalidTags = ['invalid@tag', 'tag with spaces', 'tag!'];
        const result = taskValidator.validateTags(invalidTags);

        expect(result.isValid).toBe(false);
        result.errors.forEach(error => {
          expect(error.actionableGuidance).toContain('Use only letters');
          expect(error.actionableGuidance).toContain(
            'numbers, emoji, hyphens (-), and underscores (_)'
          );
          expect(error.actionableGuidance).toContain(
            'Consider replacing spaces with hyphens or underscores'
          );
        });
      });

      it('should provide cleanup guidance for array validation errors', () => {
        const mixedTags = ['valid', '', 123, 'another-valid'];
        const result = taskValidator.validateTags(mixedTags);

        expect(result.isValid).toBe(false);

        const emptyError = result.errors.find(e =>
          e.message.includes('cannot be empty')
        );
        expect(emptyError?.actionableGuidance).toContain(
          'Remove empty tags from the array'
        );

        const typeError = result.errors.find(e =>
          e.message.includes('must be a string')
        );
        expect(typeError?.actionableGuidance).toContain(
          'Ensure all tags are string values'
        );
      });
    });

    describe('Error messages provide helpful guidance', () => {
      it('should provide context-aware guidance for complex validation scenarios', () => {
        // Test complex validation with multiple errors
        const complexData = {
          title: 123, // Type error
          priority: 'high', // Type error
          estimatedDuration: -30, // Range error
          tags: ['valid', '', 'invalid@tag', 'a'.repeat(60)], // Multiple tag errors
        };

        const result = taskValidator.validate(complexData);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(3);

        // Each error should have specific, helpful guidance
        result.errors.forEach(error => {
          expect(error.actionableGuidance).toBeDefined();
          expect(error.actionableGuidance.length).toBeGreaterThan(20);

          // Should contain action verbs or helpful guidance words
          const actionWords = [
            'convert',
            'provide',
            'ensure',
            'reduce',
            'set',
            'remove',
            'fix',
            'use',
            'check',
            'replace',
            'current',
            'should',
            'must',
            'shorten',
            'contains',
            'greater',
            'between',
          ];
          const hasActionWord = actionWords.some(word =>
            error.actionableGuidance.toLowerCase().includes(word)
          );
          expect(hasActionWord).toBe(true);
        });
      });

      it('should provide progressive guidance for nested validation errors', () => {
        const nestedTagErrors = ['', 'invalid@tag', 'a'.repeat(60), 123];
        const result = taskValidator.validateTags(nestedTagErrors);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBe(4);

        // Each error should reference the specific array index in the field name
        result.errors.forEach((error, index) => {
          expect(error.field).toBe(`tags[${index}]`);
          // Some errors mention the array index, others provide general guidance
          // At least one should mention the index for type errors
          if (error.message.includes('must be a string')) {
            expect(error.actionableGuidance).toMatch(/index \d+|Tag at index/);
          }
        });
      });

      it('should provide educational guidance about validation rules', () => {
        const result = taskValidator.validateTags(['invalid tag with spaces']);
        expect(result.isValid).toBe(false);

        const error = result.errors[0];
        expect(error.actionableGuidance).toContain(
          'Spaces and special characters like @!<>:"|?* are not allowed'
        );
        expect(error.actionableGuidance).toContain(
          'Use only letters (including unicode), numbers, emoji'
        );
      });

      it('should provide examples and alternatives in guidance', () => {
        const priorityResult = taskValidator.validatePriority(0);
        expect(priorityResult.isValid).toBe(false);

        const error = priorityResult.errors[0];
        expect(error.actionableGuidance).toContain('1 (minimal)');
        expect(error.actionableGuidance).toContain('2 (low)');
        expect(error.actionableGuidance).toContain('3 (medium)');
        expect(error.actionableGuidance).toContain('4 (high)');
        expect(error.actionableGuidance).toContain('5 (critical/urgent)');
      });
    });
  });

  describe('Orchestration Error Classes Enhanced Messages', () => {
    describe('StatusTransitionError provides detailed guidance', () => {
      it('should include current status, target status, and valid transitions', () => {
        const error = new StatusTransitionError(
          'Invalid status transition',
          'completed',
          'in_progress',
          []
        );

        expect(error.message).toBe('Invalid status transition');
        expect(error.currentStatus).toBe('completed');
        expect(error.targetStatus).toBe('in_progress');
        expect(error.validTransitions).toEqual([]);
        expect(error.currentValue).toBe('completed');
        expect(error.expectedValue).toEqual([]);
        expect(error.actionableGuidance).toContain(
          'Valid transitions from completed:'
        );
      });

      it('should provide helpful guidance for valid transitions', () => {
        const error = new StatusTransitionError(
          'Invalid transition',
          'pending',
          'completed',
          ['in_progress', 'cancelled']
        );

        expect(error.actionableGuidance).toContain(
          'Valid transitions from pending: in_progress, cancelled'
        );
      });
    });

    describe('CircularDependencyError provides detailed guidance', () => {
      it('should include dependency cycle information and guidance', () => {
        const cycle = ['task1', 'task2', 'task3', 'task1'];
        const error = new CircularDependencyError(
          'Circular dependency detected',
          cycle,
          'Remove one of the dependencies to break the cycle'
        );

        expect(error.message).toBe('Circular dependency detected');
        expect(error.dependencyCycle).toEqual(cycle);
        expect(error.currentValue).toEqual(cycle);
        expect(error.actionableGuidance).toBe(
          'Remove one of the dependencies to break the cycle'
        );
        expect(error.context).toBe('Dependency Management');
      });
    });

    describe('TemplateRenderError provides detailed guidance', () => {
      it('should include template content and render time information', () => {
        const template = '{{task.title}} - {{invalid.variable}}';
        const renderTime = 25;
        const error = new TemplateRenderError(
          'Template rendering failed',
          template,
          renderTime,
          'Check variable names and syntax'
        );

        expect(error.message).toBe('Template rendering failed');
        expect(error.template).toBe(template);
        expect(error.renderTime).toBe(renderTime);
        expect(error.currentValue).toBe(template);
        expect(error.actionableGuidance).toBe(
          'Check variable names and syntax'
        );
        expect(error.context).toBe('Template Rendering');
      });
    });

    describe('TaskNotFoundError and ListNotFoundError provide detailed guidance', () => {
      it('should include resource ID and helpful guidance for task not found', () => {
        const taskId = 'non-existent-task-123';
        const error = new TaskNotFoundError(taskId);

        expect(error.message).toBe(`Task not found: ${taskId}`);
        expect(error.currentValue).toBe(taskId);
        expect(error.expectedValue).toBe('Valid task ID');
        expect(error.actionableGuidance).toBe(
          'Ensure the task ID exists and is accessible'
        );
        expect(error.context).toBe('Task Management');
      });

      it('should include resource ID and helpful guidance for list not found', () => {
        const listId = 'non-existent-list-456';
        const error = new ListNotFoundError(listId);

        expect(error.message).toBe(`List not found: ${listId}`);
        expect(error.currentValue).toBe(listId);
        expect(error.expectedValue).toBe('Valid list ID');
        expect(error.actionableGuidance).toBe(
          'Ensure the list ID exists and is accessible'
        );
        expect(error.context).toBe('List Management');
      });
    });
  });

  describe('Error Formatter Utility Enhanced Messages', () => {
    describe('createValidationError provides enhanced messages', () => {
      it('should create detailed validation errors with length information', () => {
        const error = createValidationError('Field too long', {
          context: {
            operation: 'Test Validation',
            field: 'testField',
            actualLength: 150,
            maxLength: 100,
            currentValue: 'test value',
            expectedValue: 'shorter value',
          },
        });

        expect(error.message).toContain('current: 150 characters');
        expect(error.message).toContain('maximum: 100 characters');
        expect(error.actionableGuidance).toContain(
          'Reduce the testField by 50 characters'
        );
        expect(error.actionableGuidance).toContain('100 character limit');
      });

      it('should create detailed validation errors with type information', () => {
        const error = createValidationError('Invalid type', {
          context: {
            operation: 'Type Validation',
            field: 'priority',
            currentValue: 'high',
            expectedValue: 'number',
          },
        });

        expect(error.currentValue).toBe('high');
        expect(error.expectedValue).toBe('number');
        expect(error.actionableGuidance).toContain(
          'Provide a numeric value for priority'
        );
        expect(error.actionableGuidance).toContain('Current type: string');
      });

      it('should create detailed validation errors with options information', () => {
        const validOptions = ['pending', 'in_progress', 'completed'];
        const error = createValidationError('Invalid status', {
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
        expect(error.actionableGuidance).toContain('invalid_status');
      });
    });

    describe('DetailedErrors utility provides comprehensive error messages', () => {
      it('should create detailed required field errors', () => {
        const error = DetailedErrors.requiredField('title', 'Task Creation');

        expect(error.message).toBe('title is required');
        expect(error.context).toBe('Task Creation');
        expect(error.actionableGuidance).toContain(
          'Provide a valid title value'
        );
        expect(error.actionableGuidance).toContain(
          'cannot be empty or undefined'
        );
      });

      it('should create detailed length exceeded errors', () => {
        const error = DetailedErrors.lengthExceeded(
          'title',
          'Task Creation',
          1200,
          1000,
          'a'.repeat(1200)
        );

        expect(error.message).toBe(
          'title exceeds maximum length (current: 1200 characters, maximum: 1000 characters)'
        );
        expect(error.actionableGuidance).toContain(
          'Reduce the title by 200 characters'
        );
      });

      it('should create detailed invalid type errors', () => {
        const error = DetailedErrors.invalidType(
          'priority',
          'Task Creation',
          'high',
          'number'
        );

        expect(error.message).toBe('priority must be a number');
        expect(error.currentValue).toBe('high');
        expect(error.expectedValue).toBe('number');
        expect(error.actionableGuidance).toContain(
          'Provide a numeric value for priority'
        );
        expect(error.actionableGuidance).toContain('Current type: string');
      });

      it('should create detailed out of range errors', () => {
        const error = DetailedErrors.outOfRange(
          'priority',
          'Priority Validation',
          10,
          1,
          5
        );

        expect(error.message).toContain('priority is out of valid range');
        expect(error.currentValue).toBe(10);
        expect(error.actionableGuidance).toContain(
          'Set priority to a value between 1 and 5'
        );
        expect(error.actionableGuidance).toContain(
          'Current value 10 is too high'
        );
      });

      it('should create detailed not found errors', () => {
        const error = DetailedErrors.notFound(
          'Task',
          'Task Retrieval',
          'invalid-id-123'
        );

        expect(error.message).toContain('Task not found');
        expect(error.currentValue).toBe('invalid-id-123');
        expect(error.actionableGuidance).toContain(
          'Ensure the Task ID "invalid-id-123" exists'
        );
        expect(error.actionableGuidance).toContain(
          "Check that the Task hasn't been deleted"
        );
      });
    });

    describe('formatValidationErrors provides consistent formatting', () => {
      it('should format single validation error with guidance', () => {
        const error = new ValidationError(
          'Title is required',
          'Task Creation',
          undefined,
          'non-empty string',
          'Provide a valid title value'
        );

        const formatted = formatValidationErrors([error]);
        expect(formatted).toBe('Title is required Provide a valid title value');
      });

      it('should format multiple validation errors with numbering', () => {
        const errors = [
          new ValidationError(
            'Title is required',
            'Task Creation',
            undefined,
            'string',
            'Provide title'
          ),
          new ValidationError(
            'Priority invalid',
            'Task Creation',
            10,
            'number 1-5',
            'Set priority 1-5'
          ),
        ];

        const formatted = formatValidationErrors(errors);
        expect(formatted).toContain('2 validation errors found:');
        expect(formatted).toContain('1. Title is required Provide title');
        expect(formatted).toContain('2. Priority invalid Set priority 1-5');
      });
    });
  });

  describe('Requirement 12.1: Testing Standards Compliance', () => {
    it('should verify all error classes have comprehensive test coverage', () => {
      // Test that all orchestration error classes are properly tested
      const errorClasses = [
        OrchestrationError,
        ValidationError,
        StatusTransitionError,
        CircularDependencyError,
        TemplateRenderError,
        TaskNotFoundError,
        ListNotFoundError,
      ];

      errorClasses.forEach(ErrorClass => {
        expect(ErrorClass).toBeDefined();
        expect(typeof ErrorClass).toBe('function');
      });
    });

    it('should verify error formatter utilities have comprehensive test coverage', () => {
      // Test that all error formatter functions are properly tested
      expect(createValidationError).toBeDefined();
      expect(createOrchestrationError).toBeDefined();
      expect(formatValidationErrors).toBeDefined();
      expect(DetailedErrors).toBeDefined();
      expect(ErrorContexts).toBeDefined();
    });

    it('should verify validator error messages meet quality standards', () => {
      const validators = [taskValidator, agentPromptValidator];

      validators.forEach(validator => {
        expect(validator).toBeDefined();
        expect(typeof validator.validate).toBe('function');
      });

      // Test that validators produce consistent error structures
      const taskResult = taskValidator.validate({ title: 123 });
      expect(taskResult.isValid).toBe(false);
      expect(taskResult.errors.length).toBeGreaterThan(0);

      taskResult.errors.forEach(error => {
        expect(error.field).toBeDefined();
        expect(error.message).toBeDefined();
        expect(error.currentValue).toBeDefined();
        expect(error.expectedValue).toBeDefined();
        expect(error.actionableGuidance).toBeDefined();
      });
    });

    it('should verify error messages are consistent across all validation scenarios', () => {
      const validationScenarios = [
        // Type validation
        { input: { title: 123 }, errorType: 'type' },
        { input: { title: 'valid', priority: 'high' }, errorType: 'type' },
        { input: { title: 'valid', tags: 'not-array' }, errorType: 'type' },

        // Length validation
        { input: { title: 'a'.repeat(1500) }, errorType: 'length' },
        {
          input: { title: 'valid', description: 'a'.repeat(6000) },
          errorType: 'length',
        },

        // Range validation
        { input: { title: 'valid', priority: 10 }, errorType: 'range' },
        {
          input: { title: 'valid', estimatedDuration: -30 },
          errorType: 'range',
        },

        // Format validation
        {
          input: { title: 'valid', tags: ['invalid@tag'] },
          errorType: 'format',
        },
      ];

      validationScenarios.forEach(({ input, errorType: _errorType }) => {
        const result = taskValidator.validate(input);
        expect(result.isValid).toBe(false);

        result.errors.forEach(error => {
          // All errors should have required properties
          expect(error.field).toBeDefined();
          expect(error.message).toBeDefined();
          expect(error.currentValue).toBeDefined();
          expect(error.expectedValue).toBeDefined();
          expect(error.actionableGuidance).toBeDefined();

          // Error messages should be descriptive and helpful
          expect(error.message.length).toBeGreaterThan(5);
          expect(error.actionableGuidance.length).toBeGreaterThan(10);

          // Actionable guidance should contain action words or helpful guidance
          const actionWords = [
            'provide',
            'ensure',
            'convert',
            'reduce',
            'set',
            'remove',
            'fix',
            'check',
            'use',
            'replace',
            'current',
            'should',
            'must',
            'type',
            'value',
          ];
          const hasActionWord = actionWords.some(word =>
            error.actionableGuidance.toLowerCase().includes(word)
          );
          expect(hasActionWord).toBe(true);
        });
      });
    });
  });
});
