/**
 * Integration tests for enhanced error messages across the system
 * Demonstrates the improved error messages with detailed guidance
 */

import { describe, it, expect } from 'vitest';

import { AgentPromptValidator } from '../../../../src/core/orchestration/validators/agent-prompt-validator.js';
import { TaskValidator } from '../../../../src/core/orchestration/validators/task-validator.js';

describe('Enhanced Error Messages Integration', () => {
  const taskValidator = new TaskValidator();
  const agentPromptValidator = new AgentPromptValidator();

  describe('Task Validation Enhanced Messages', () => {
    it('should provide detailed guidance for title length violations', () => {
      const longTitle = 'a'.repeat(1500);
      const result = taskValidator.validate({ title: longTitle });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);

      const error = result.errors[0];
      expect(error.field).toBe('title');
      expect(error.message).toContain('current: 1500 characters');
      expect(error.message).toContain('maximum: 1000 characters');
      expect(error.actionableGuidance).toContain(
        'Reduce the title by 500 characters'
      );
      expect(error.actionableGuidance).toContain(
        'Consider using more concise language'
      );
    });

    it('should provide detailed guidance for type Validation errors', () => {
      const result = taskValidator.validate({ title: 123 });

      expect(result.isValid).toBe(false);
      const error = result.errors[0];
      expect(error.field).toBe('title');
      expect(error.message).toBe('title must be a string');
      expect(error.currentValue).toBe(123);
      expect(error.expectedValue).toBe('string');
      expect(error.actionableGuidance).toContain(
        'Convert the title to a string'
      );
      expect(error.actionableGuidance).toContain('Current type: number');
    });

    it('should provide detailed guidance for priority range violations', () => {
      const result = taskValidator.validatePriority(10);

      expect(result.isValid).toBe(false);
      const error = result.errors[0];
      expect(error.field).toBe('priority');
      expect(error.message).toContain('current: 10');
      expect(error.actionableGuidance).toContain(
        '1 (minimal), 2 (low), 3 (medium), 4 (high), or 5 (critical/urgent)'
      );
    });

    it('should provide detailed guidance for tag Validation errors', () => {
      const result = taskValidator.validateTags([
        'valid-tag',
        'invalid tag with spaces',
        'a'.repeat(60),
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);

      // Check invalid characters error
      const invalidCharsError = result.errors.find(e =>
        e.message.includes('invalid characters')
      );
      expect(invalidCharsError).toBeDefined();
      expect(invalidCharsError?.actionableGuidance).toContain(
        'Consider replacing spaces with hyphens or underscores'
      );

      // Check length error
      const lengthError = result.errors.find(e =>
        e.message.includes('exceeds maximum length')
      );
      expect(lengthError).toBeDefined();
      expect(lengthError?.actionableGuidance).toContain(
        'Shorten the tag by 10 characters'
      );
    });

    it('should provide detailed guidance for duration Validation errors', () => {
      const result = taskValidator.validateEstimatedDuration(-30);

      expect(result.isValid).toBe(false);
      const error = result.errors[0];
      expect(error.field).toBe('estimatedDuration');
      expect(error.actionableGuidance).toContain(
        'Current value -30 is negative'
      );
      expect(error.actionableGuidance).toContain(
        'Provide a positive duration in minutes'
      );
    });

    it('should provide helpful warnings for unusual durations', () => {
      const result = taskValidator.validateEstimatedDuration(20160); // 2 weeks

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('unusually long');
      expect(result.warnings[0].suggestion).toContain(
        'breaking this task into smaller subtasks'
      );
    });
  });

  describe('Agent Prompt Validation Enhanced Messages', () => {
    it('should provide detailed guidance for template length violations', () => {
      const longTemplate = 'a'.repeat(15000);
      const result = agentPromptValidator.validateTemplate(longTemplate);

      expect(result.isValid).toBe(false);
      const error = result.errors[0];
      expect(error.message).toContain('exceeds maximum length');
      expect(error.currentValue).toBe(longTemplate);
      expect(error.expectedValue).toBe('string with max 10000 characters');
      expect(error.actionableGuidance).toContain(
        'Reduce the template by 5000 characters'
      );
    });

    it('should provide detailed guidance for type Validation errors', () => {
      const result = agentPromptValidator.validateTemplate(123 as any);

      expect(result.isValid).toBe(false);
      const error = result.errors[0];
      expect(error.message).toContain('must be a string');
      expect(error.actionableGuidance).toContain(
        'Convert the template to a string'
      );
    });
  });

  describe('Error Message Consistency', () => {
    it('should consistently include current and expected values', () => {
      const results = [
        taskValidator.validate({ title: 123 }),
        taskValidator.validatePriority('high'),
        taskValidator.validateEstimatedDuration('30 minutes'),
        taskValidator.validateTags('not-an-array'),
      ];

      results.forEach(result => {
        expect(result.isValid).toBe(false);
        result.errors.forEach(error => {
          expect(error.currentValue).toBeDefined();
          expect(error.expectedValue).toBeDefined();
          expect(error.actionableGuidance).toBeDefined();
          expect(error.actionableGuidance).not.toBe('');
        });
      });
    });

    it('should provide actionable guidance for all Validation errors', () => {
      const testCases = [
        { data: null, expectedGuidance: 'Current type:' },
        { data: { title: '' }, expectedGuidance: 'cannot be empty' },
        {
          data: { title: 'valid', priority: 0 },
          expectedGuidance: 'Set priority to',
        },
        {
          data: { title: 'valid', estimatedDuration: 0 },
          expectedGuidance: 'must be greater than 0',
        },
        {
          data: { title: 'valid', tags: [''] },
          expectedGuidance: 'Remove empty tags',
        },
      ];

      testCases.forEach(({ data, expectedGuidance }) => {
        const result = taskValidator.validate(data);
        expect(result.isValid).toBe(false);

        const hasExpectedGuidance = result.errors.some(error =>
          error.actionableGuidance?.includes(expectedGuidance)
        );
        expect(hasExpectedGuidance).toBe(true);
      });
    });
  });

  describe('Error Message Quality', () => {
    it('should provide specific numeric information in error messages', () => {
      const longTitle = 'a'.repeat(1200);
      const result = taskValidator.validate({ title: longTitle });

      const error = result.errors[0];
      expect(error.message).toMatch(/current: \d+ characters/);
      expect(error.message).toMatch(/maximum: \d+ characters/);
      expect(error.actionableGuidance).toMatch(/Reduce.*by \d+ characters/);
    });

    it('should provide contextual information for complex Validation errors', () => {
      const result = taskValidator.validateTags([
        'valid',
        123,
        '',
        'invalid@tag',
        'a'.repeat(60),
      ]);

      expect(result.errors.length).toBeGreaterThan(1);

      // Each error should have specific field information
      result.errors.forEach(error => {
        expect(error.field).toMatch(/tags\[\d+\]/);
        expect(error.actionableGuidance).toBeDefined();
      });

      // Should have different types of errors with specific guidance
      const errorTypes = result.errors.map(e => e.message);
      expect(errorTypes.some(msg => msg.includes('must be a string'))).toBe(
        true
      );
      expect(errorTypes.some(msg => msg.includes('cannot be empty'))).toBe(
        true
      );
      expect(errorTypes.some(msg => msg.includes('invalid characters'))).toBe(
        true
      );
      expect(
        errorTypes.some(msg => msg.includes('exceeds maximum length'))
      ).toBe(true);
    });

    it('should provide helpful suggestions in warnings', () => {
      const result = taskValidator.validateTags(['tag1', 'tag2', 'tag1']); // Duplicate tags

      expect(result.isValid).toBe(true); // Duplicates are warnings, not errors
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('Duplicate tags found');
      expect(result.warnings[0].suggestion).toContain('Remove duplicate tags');
    });
  });
});
