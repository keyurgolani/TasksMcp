/**
 * Unit tests for Enhanced Error Formatter
 */

import { describe, it, expect } from 'vitest';
import { z, ZodError } from 'zod';
import {
  ErrorFormatter,
  formatZodError,
  createErrorContext,
  type EnhancedErrorMessage,
  type ErrorFormattingContext,
} from '../../../../src/shared/utils/error-formatter.js';

describe('ErrorFormatter', () => {
  describe('Type Validation Errors', () => {
    it('should format invalid type errors with suggestions', () => {
      const schema = z.object({
        priority: z.number(),
        enabled: z.boolean(),
      });

      try {
        schema.parse({ priority: 'high', enabled: 'yes' });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(
          error as ZodError,
          { toolName: 'add_task' }
        );

        expect(formatted).toHaveLength(2);
        
        const priorityError = formatted.find(e => e.field === 'priority');
        expect(priorityError?.message).toContain('Expected number, but received string');
        expect(priorityError?.suggestion).toBe('Use numbers 1-5, where 5 is highest priority'); // Tool-specific guidance
        expect(priorityError?.example).toBe('5 (highest) to 1 (lowest)'); // Tool-specific example
        expect(priorityError?.code).toBe('invalid_type');

        const enabledError = formatted.find(e => e.field === 'enabled');
        expect(enabledError?.message).toContain('Expected boolean, but received string');
        expect(enabledError?.suggestion).toContain('Please provide a value of type boolean');
        expect(enabledError?.example).toBe('true or false');
      }
    });

    it('should provide tool-specific guidance for known parameters', () => {
      const schema = z.object({
        priority: z.number(),
      });

      try {
        schema.parse({ priority: 'high' });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(
          error as ZodError,
          { toolName: 'add_task' }
        );

        const priorityError = formatted[0];
        expect(priorityError.suggestion).toBe('Use numbers 1-5, where 5 is highest priority');
        expect(priorityError.example).toBe('5 (highest) to 1 (lowest)');
      }
    });
  });

  describe('String Validation Errors', () => {
    it('should format string length errors', () => {
      const schema = z.object({
        title: z.string().min(3).max(10),
      });

      // Test too short
      try {
        schema.parse({ title: 'hi' });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const titleError = formatted[0];
        
        expect(titleError.message).toContain('Text must be at least 3 characters long');
        expect(titleError.suggestion).toContain('Please provide text with 3 or more characters');
        expect(titleError.code).toBe('too_small');
      }

      // Test too long
      try {
        schema.parse({ title: 'this is way too long' });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const titleError = formatted[0];
        
        expect(titleError.message).toContain('Text must be no more than 10 characters long');
        expect(titleError.suggestion).toContain('Please shorten your text to 10 characters or less');
        expect(titleError.code).toBe('too_big');
      }
    });

    it('should format UUID validation errors', () => {
      const schema = z.object({
        listId: z.string().uuid(),
      });

      try {
        schema.parse({ listId: 'invalid-uuid' });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const uuidError = formatted[0];
        
        expect(uuidError.message).toContain('Invalid UUID format');
        expect(uuidError.suggestion).toContain('UUID must be in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
        expect(uuidError.example).toContain('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
        expect(uuidError.code).toBe('invalid_uuid');
      }
    });
  });

  describe('Enum Validation Errors', () => {
    it('should format enum errors with valid options', () => {
      const schema = z.object({
        status: z.enum(['pending', 'completed', 'in_progress']),
      });

      try {
        schema.parse({ status: 'done' });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const statusError = formatted[0];
        
        expect(statusError.message).toContain('Invalid option. Valid choices are: pending, completed, in_progress');
        expect(statusError.suggestion).toContain('Please choose one of: pending, completed, in_progress');
        expect(statusError.code).toBe('invalid_enum_value');
      }
    });

    it('should suggest closest match for enum errors', () => {
      const schema = z.object({
        status: z.enum(['pending', 'completed', 'in_progress']),
      });

      try {
        schema.parse({ status: 'complete' }); // Close to 'completed'
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const statusError = formatted[0];
        
        expect(statusError.suggestion).toContain('Did you mean "completed"?');
      }
    });

    it('should handle case-insensitive enum matching', () => {
      const schema = z.object({
        priority: z.enum(['high', 'medium', 'low']),
      });

      try {
        schema.parse({ priority: 'HIGH' });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const priorityError = formatted[0];
        
        expect(priorityError.suggestion).toContain('Did you mean "high"?');
      }
    });
  });

  describe('Number Validation Errors', () => {
    it('should format number range errors', () => {
      const schema = z.object({
        priority: z.number().min(1).max(5),
      });

      // Test too small
      try {
        schema.parse({ priority: 0 });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const priorityError = formatted[0];
        
        expect(priorityError.message).toContain('Value must be at least 1');
        expect(priorityError.suggestion).toContain('Please provide a value of 1 or greater');
        expect(priorityError.code).toBe('too_small');
      }

      // Test too big
      try {
        schema.parse({ priority: 10 });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const priorityError = formatted[0];
        
        expect(priorityError.message).toContain('Value must be no more than 5');
        expect(priorityError.suggestion).toContain('Please provide a value of 5 or less');
        expect(priorityError.code).toBe('too_big');
      }
    });
  });

  describe('Array and Object Validation Errors', () => {
    it('should format array type errors', () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      try {
        schema.parse({ tags: 'not-an-array' });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const tagsError = formatted[0];
        
        expect(tagsError.message).toContain('Expected array, but received string');
        expect(tagsError.example).toBe('["item1", "item2"] or use JSON format');
      }
    });

    it('should format object type errors', () => {
      const schema = z.object({
        config: z.object({ enabled: z.boolean() }),
      });

      try {
        schema.parse({ config: 'not-an-object' });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const configError = formatted[0];
        
        expect(configError.message).toContain('Expected object, but received string');
        expect(configError.example).toBe('{"key": "value"} or use JSON format');
      }
    });
  });

  describe('Custom Validation Errors', () => {
    it('should format custom validation errors', () => {
      const schema = z.string().refine(
        (val) => val.includes('@'),
        { message: 'Email must contain @ symbol' }
      );

      try {
        schema.parse('invalid-email');
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const emailError = formatted[0];
        
        expect(emailError.message).toContain('Email must contain @ symbol');
        expect(emailError.suggestion).toContain('Please check your input and try again');
        expect(emailError.code).toBe('custom');
      }
    });
  });

  describe('Multiple Errors', () => {
    it('should format multiple validation errors', () => {
      const schema = z.object({
        title: z.string().min(3),
        priority: z.number().min(1).max(5),
        status: z.enum(['pending', 'completed']),
      });

      try {
        schema.parse({
          title: 'hi',
          priority: 10,
          status: 'done',
        });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        
        expect(formatted).toHaveLength(3);
        expect(formatted.map(e => e.field)).toEqual(['title', 'priority', 'status']);
        expect(formatted.map(e => e.code)).toEqual(['too_small', 'too_big', 'invalid_enum_value']);
      }
    });
  });

  describe('Error Display Formatting', () => {
    it('should format single error for display', () => {
      const errors: EnhancedErrorMessage[] = [{
        message: 'Expected number, but received string',
        suggestion: 'Please provide a number',
        example: '42',
        field: 'priority',
        code: 'invalid_type',
      }];

      const display = ErrorFormatter.formatErrorsForDisplay(errors);
      
      expect(display).toContain('❌ Expected number, but received string');
      expect(display).toContain('💡 Please provide a number');
      expect(display).toContain('📝 Example: 42');
    });

    it('should format multiple errors for display', () => {
      const errors: EnhancedErrorMessage[] = [
        {
          message: 'Title too short',
          suggestion: 'Use at least 3 characters',
          field: 'title',
          code: 'too_small',
        },
        {
          message: 'Invalid priority',
          suggestion: 'Use numbers 1-5',
          field: 'priority',
          code: 'invalid_type',
        },
      ];

      const display = ErrorFormatter.formatErrorsForDisplay(errors);
      
      expect(display).toContain('❌ Found 2 validation errors:');
      expect(display).toContain('1. Title too short');
      expect(display).toContain('2. Invalid priority');
      expect(display).toContain('💡 Use at least 3 characters');
      expect(display).toContain('💡 Use numbers 1-5');
    });

    it('should respect display options', () => {
      const errors: EnhancedErrorMessage[] = [{
        message: 'Test error',
        suggestion: 'Test suggestion',
        example: 'Test example',
        field: 'test',
        code: 'test',
      }];

      const displayNoSuggestions = ErrorFormatter.formatErrorsForDisplay(errors, {
        includeSuggestions: false,
      });
      expect(displayNoSuggestions).not.toContain('💡');

      const displayNoExamples = ErrorFormatter.formatErrorsForDisplay(errors, {
        includeExamples: false,
      });
      expect(displayNoExamples).not.toContain('📝');
    });

    it('should limit number of displayed errors', () => {
      const errors: EnhancedErrorMessage[] = Array.from({ length: 10 }, (_, i) => ({
        message: `Error ${i + 1}`,
        field: `field${i + 1}`,
        code: 'test',
      }));

      const display = ErrorFormatter.formatErrorsForDisplay(errors, { maxErrors: 3 });
      
      expect(display).toContain('1. Error 1');
      expect(display).toContain('2. Error 2');
      expect(display).toContain('3. Error 3');
      expect(display).toContain('... and 7 more errors');
      expect(display).not.toContain('4. Error 4');
    });
  });

  describe('Fuzzy Matching', () => {
    it('should find exact matches (case insensitive)', () => {
      const schema = z.object({
        status: z.enum(['pending', 'completed', 'cancelled']),
      });

      try {
        schema.parse({ status: 'PENDING' });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const statusError = formatted[0];
        
        expect(statusError.suggestion).toContain('Did you mean "pending"?');
      }
    });

    it('should find partial matches', () => {
      const schema = z.object({
        status: z.enum(['in_progress', 'completed', 'pending']),
      });

      try {
        schema.parse({ status: 'progress' });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const statusError = formatted[0];
        
        expect(statusError.suggestion).toContain('Did you mean "in_progress"?');
      }
    });

    it('should find close matches using Levenshtein distance', () => {
      const schema = z.object({
        status: z.enum(['pending', 'completed', 'cancelled']),
      });

      try {
        schema.parse({ status: 'complet' }); // Missing 'ed'
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const statusError = formatted[0];
        
        expect(statusError.suggestion).toContain('Did you mean "completed"?');
      }
    });

    it('should not suggest matches that are too different', () => {
      const schema = z.object({
        status: z.enum(['pending', 'completed', 'cancelled']),
      });

      try {
        schema.parse({ status: 'xyz' }); // Very different
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const statusError = formatted[0];
        
        expect(statusError.suggestion).not.toContain('Did you mean');
        expect(statusError.suggestion).toContain('Please choose one of:');
      }
    });
  });

  describe('Tool-Specific Guidance', () => {
    it('should provide add_task specific guidance', () => {
      const schema = z.object({
        tags: z.array(z.string()),
        estimatedDuration: z.number(),
      });

      try {
        schema.parse({ tags: 'not-array', estimatedDuration: 'not-number' });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(
          error as ZodError,
          { toolName: 'add_task' }
        );

        const tagsError = formatted.find(e => e.field === 'tags');
        expect(tagsError?.suggestion).toBe('Provide as array of strings or JSON string format');
        expect(tagsError?.example).toBe('["urgent", "important", "bug-fix"]');

        const durationError = formatted.find(e => e.field === 'estimatedDuration');
        expect(durationError?.suggestion).toBe('Provide duration in minutes as a number');
        expect(durationError?.example).toBe('120 (for 2 hours in minutes)');
      }
    });

    it('should provide filter_tasks specific guidance', () => {
      const schema = z.object({
        status: z.enum(['pending', 'completed']),
        priority: z.number(),
      });

      try {
        schema.parse({ status: 'invalid', priority: 'high' });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(
          error as ZodError,
          { toolName: 'filter_tasks' }
        );

        const statusError = formatted.find(e => e.field === 'status');
        expect(statusError?.suggestion).toBe('Use one of the valid status values');

        const priorityError = formatted.find(e => e.field === 'priority');
        expect(priorityError?.suggestion).toBe('Use numbers 1-5 to filter by priority level');
      }
    });
  });

  describe('Utility Functions', () => {
    it('should work with formatZodError convenience function', () => {
      const schema = z.object({
        priority: z.number(),
      });

      try {
        schema.parse({ priority: 'high' });
      } catch (error) {
        const formatted = formatZodError(error as ZodError, { toolName: 'add_task' });
        
        expect(formatted).toContain('❌');
        expect(formatted).toContain('Expected number, but received string');
        expect(formatted).toContain('💡');
        expect(formatted).toContain('📝');
      }
    });

    it('should create error context correctly', () => {
      const context = createErrorContext('add_task', false);
      
      expect(context.toolName).toBe('add_task');
      expect(context.includeExamples).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty error arrays', () => {
      const display = ErrorFormatter.formatErrorsForDisplay([]);
      expect(display).toBe('');
    });

    it('should handle errors without suggestions or examples', () => {
      const errors: EnhancedErrorMessage[] = [{
        message: 'Simple error',
        field: 'test',
        code: 'test',
      }];

      const display = ErrorFormatter.formatErrorsForDisplay(errors);
      expect(display).toContain('❌ Simple error');
      expect(display).not.toContain('💡');
      expect(display).not.toContain('📝');
    });

    it('should handle nested field paths', () => {
      const schema = z.object({
        config: z.object({
          nested: z.object({
            value: z.number(),
          }),
        }),
      });

      try {
        schema.parse({ config: { nested: { value: 'not-number' } } });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const valueError = formatted[0];
        
        expect(valueError.field).toBe('config.nested.value');
        expect(valueError.message).toContain('config.nested.value: Expected number');
      }
    });

    it('should handle unknown tool names gracefully', () => {
      const schema = z.object({
        priority: z.number(),
      });

      try {
        schema.parse({ priority: 'high' });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(
          error as ZodError,
          { toolName: 'unknown_tool' }
        );

        const priorityError = formatted[0];
        expect(priorityError.suggestion).toBe('Please provide a value of type number');
        expect(priorityError.example).toBe('42 or 3.14');
      }
    });
  });
});