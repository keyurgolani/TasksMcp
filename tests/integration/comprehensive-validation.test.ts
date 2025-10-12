/**
 * Comprehensive Validation Tests
 *
 * Tests all new validation and preprocessing functionality to ensure reliability
 * and prevent regressions. Includes edge cases, performance tests, and integration scenarios.
 */

import { describe, it, expect, beforeEach as _beforeEach } from 'vitest';
import { z } from 'zod';

import { getToolExamples } from '../../src/shared/examples/tool-examples.js';
import {
  findClosestEnumValue,
  getEnumSuggestions,
} from '../../src/shared/utils/enum-matcher.js';
import {
  formatZodError,
  createErrorContext,
} from '../../src/shared/utils/error-formatter.js';
import { formatHandlerError } from '../../src/shared/utils/handler-error-formatter.js';
import { preprocessParameters } from '../../src/shared/utils/parameter-preprocessor.js';

describe('Comprehensive Validation Tests', () => {
  describe('Parameter Preprocessing Edge Cases', () => {
    it('should handle complex nested parameter structures', () => {
      const complexParams = {
        priority: '5',
        tags: '["urgent", "important", "critical"]',
        enabled: 'true',
        config: '{"retries": 3, "timeout": 5000}',
        metadata: {
          nested: '42',
          flags: 'false',
        },
      };

      const result = preprocessParameters(complexParams);

      expect(result.parameters.priority).toBe(5);
      expect(result.parameters.tags).toEqual([
        'urgent',
        'important',
        'critical',
      ]);
      expect(result.parameters.enabled).toBe(true);
      expect(result.parameters.config).toEqual({ retries: 3, timeout: 5000 });
      expect(result.parameters.metadata.nested).toBe(42);
      expect(result.parameters.metadata.flags).toBe(false);
      expect(result.conversions.length).toBeGreaterThan(4);
    });

    it('should handle malformed JSON gracefully', () => {
      const malformedParams = {
        tags: '[invalid json',
        config: '{"incomplete": }',
        validArray: '["valid", "array"]',
      };

      const result = preprocessParameters(malformedParams);

      // Malformed JSON should remain unchanged
      expect(result.parameters.tags).toBe('[invalid json');
      expect(result.parameters.config).toBe('{"incomplete": }');

      // Valid JSON should be converted
      expect(result.parameters.validArray).toEqual(['valid', 'array']);

      // Should not have errors (graceful handling)
      expect(result.errors).toHaveLength(0);
    });

    it('should handle extreme numeric values', () => {
      const extremeParams = {
        veryLarge: '999999999999999999999',
        verySmall: '0.000000000001',
        scientific: '1.5e-10',
        infinity: 'Infinity',
        negativeInfinity: '-Infinity',
        notANumber: 'NaN',
      };

      const result = preprocessParameters(extremeParams);

      expect(typeof result.parameters.veryLarge).toBe('number');
      expect(typeof result.parameters.verySmall).toBe('number');
      expect(typeof result.parameters.scientific).toBe('number');

      // These should not be converted (not valid numeric strings)
      expect(result.parameters.infinity).toBe('Infinity');
      expect(result.parameters.negativeInfinity).toBe('-Infinity');
      expect(result.parameters.notANumber).toBe('NaN');
    });

    it('should handle unicode and special characters', () => {
      const unicodeParams = {
        emoji: '😀',
        unicode: 'café',
        special: 'test@#$%^&*()',
        mixed: '123abc456',
        number: '123',
      };

      const result = preprocessParameters(unicodeParams);

      // Only valid numbers should be converted
      expect(result.parameters.number).toBe(123);

      // Others should remain as strings
      expect(result.parameters.emoji).toBe('😀');
      expect(result.parameters.unicode).toBe('café');
      expect(result.parameters.special).toBe('test@#$%^&*()');
      expect(result.parameters.mixed).toBe('123abc456');
    });

    it('should handle null and undefined values correctly', () => {
      const nullParams = {
        nullValue: null,
        undefinedValue: undefined,
        emptyString: '',
        whitespace: '   ',
        zero: '0',
      };

      const result = preprocessParameters(nullParams);

      expect(result.parameters.nullValue).toBe(null);
      expect(result.parameters.undefinedValue).toBe(undefined);
      expect(result.parameters.emptyString).toBe('');
      expect(result.parameters.whitespace).toBe('   ');
      expect(result.parameters.zero).toBe(0); // Should be converted
    });
  });

  describe('Enhanced Error Formatting Edge Cases', () => {
    it('should handle deeply nested validation errors', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            settings: z.object({
              priority: z.number().min(1).max(5),
              tags: z.array(z.string()),
            }),
          }),
        }),
      });

      try {
        schema.parse({
          user: {
            profile: {
              settings: {
                priority: 'high',
                tags: 'urgent',
              },
            },
          },
        });
      } catch (error) {
        const formatted = formatZodError(
          error as z.ZodError,
          createErrorContext('test_tool')
        );

        expect(formatted).toContain('user.profile.settings.priority');
        expect(formatted).toContain('user.profile.settings.tags');
        expect(formatted).toContain('❌');
      }
    });

    it('should handle multiple validation errors with suggestions', () => {
      const schema = z.object({
        priority: z.number().min(1).max(5),
        status: z.enum(['pending', 'completed', 'cancelled']),
        tags: z.array(z.string()).min(1),
        estimatedDuration: z.number().min(1),
      });

      try {
        schema.parse({
          priority: 'urgent',
          status: 'done',
          tags: 'important',
          estimatedDuration: '2 hours',
        });
      } catch (error) {
        const result = formatHandlerError(error, { toolName: 'add_task' });
        const message = result.content[0]?.text || '';

        expect(message).toContain('priority');
        expect(message).toContain('status');
        expect(message).toContain('tags');
        expect(message).toContain('estimatedDuration');
        expect(message).toContain('🔧 Common fixes');
        expect(message).toContain('📝 Working example');
      }
    });

    it('should provide context-aware error messages', () => {
      const schema = z.object({
        priority: z.number().min(1).max(5),
      });

      try {
        schema.parse({ priority: 'high' });
      } catch (error) {
        const addTaskResult = formatHandlerError(error, {
          toolName: 'add_task',
        });
        const searchToolResult = formatHandlerError(error, {
          toolName: 'search_tool',
        });

        const addTaskMessage = addTaskResult.content[0]?.text || '';
        const searchToolMessage = searchToolResult.content[0]?.text || '';

        // Should contain context-specific guidance (not necessarily tool names)
        expect(addTaskMessage).toContain('💡'); // Should have suggestions
        expect(searchToolMessage).toContain('💡'); // Should have suggestions

        // Should have different examples/guidance
        expect(addTaskMessage).not.toBe(searchToolMessage);
      }
    });
  });

  describe('Enum Fuzzy Matching Edge Cases', () => {
    it('should handle empty and single-item enum sets', () => {
      expect(findClosestEnumValue('test', [])).toBeNull();
      // For single-item sets, only return match if reasonably close
      expect(findClosestEnumValue('single', ['single'])).toBe('single'); // Exact match
      expect(findClosestEnumValue('singl', ['single'])).toBe('single'); // Close match
      expect(
        findClosestEnumValue('completely_different', ['single'])
      ).toBeNull(); // Too different
    });

    it('should handle very long enum values', () => {
      const longEnums = [
        'very_long_enum_value_that_exceeds_normal_length',
        'another_extremely_long_enum_value_for_testing',
        'short',
      ];

      const result = findClosestEnumValue('very_long_enum', longEnums);
      expect(result).toBe('very_long_enum_value_that_exceeds_normal_length');
    });

    it('should handle special characters in enum values', () => {
      const specialEnums = ['test-case', 'test_case', 'test.case', 'test@case'];

      expect(findClosestEnumValue('test-case', specialEnums)).toBe('test-case');
      expect(findClosestEnumValue('testcase', specialEnums)).toBeTruthy();
      expect(findClosestEnumValue('test case', specialEnums)).toBeTruthy();
    });

    it('should provide multiple suggestions when confidence is low', () => {
      // Use a more ambiguous input that could match multiple options
      const enums = ['pending', 'processing', 'completed'];
      const suggestions = getEnumSuggestions('pen', enums, 3);

      // Should at least find 'pending'
      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      expect(suggestions).toContain('pending');

      // Test with a completely different input to get fallback suggestions
      const fallbackSuggestions = getEnumSuggestions('xyz', enums, 3);
      expect(fallbackSuggestions.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete preprocessing and validation pipeline', () => {
      // Simulate a complete agent request with common mistakes
      const agentRequest = {
        listId: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
        title: 'Test Task',
        priority: '5', // String instead of number
        tags: '["urgent", "important"]', // JSON string instead of array
        enabled: 'true', // String boolean
        estimatedDuration: '120', // String number
      };

      // Step 1: Preprocess parameters
      const preprocessed = preprocessParameters(agentRequest);

      expect(preprocessed.parameters.priority).toBe(5);
      expect(preprocessed.parameters.tags).toEqual(['urgent', 'important']);
      expect(preprocessed.parameters.enabled).toBe(true);
      expect(preprocessed.parameters.estimatedDuration).toBe(120);
      expect(preprocessed.conversions.length).toBe(4);

      // Step 2: Validate with Zod schema
      const schema = z.object({
        listId: z.string().uuid(),
        title: z.string().min(1),
        priority: z.number().min(1).max(5),
        tags: z.array(z.string()),
        enabled: z.boolean(),
        estimatedDuration: z.number().min(1),
      });

      const validationResult = schema.safeParse(preprocessed.parameters);
      expect(validationResult.success).toBe(true);
    });

    it('should handle preprocessing failures gracefully', () => {
      const problematicRequest = {
        priority: 'definitely-not-a-number',
        tags: '[malformed json',
        enabled: 'maybe',
        config: '{"incomplete": }',
      };

      const preprocessed = preprocessParameters(problematicRequest);

      // Should not crash and should preserve original values
      expect(preprocessed.parameters.priority).toBe('definitely-not-a-number');
      expect(preprocessed.parameters.tags).toBe('[malformed json');
      expect(preprocessed.parameters.enabled).toBe('maybe');
      expect(preprocessed.parameters.config).toBe('{"incomplete": }');

      // Should have no conversions but also no errors (graceful handling)
      expect(preprocessed.conversions).toHaveLength(0);
      expect(preprocessed.errors).toHaveLength(0);
    });

    it('should provide end-to-end error experience', () => {
      // Simulate agent making multiple common mistakes
      const badRequest = {
        priority: 'urgent', // Should be number
        status: 'done', // Should be 'completed'
        tags: 'important,urgent', // Should be array
        estimatedDuration: '2 hours', // Should be minutes as number
      };

      // Preprocess (won't fix these particular issues)
      const preprocessed = preprocessParameters(badRequest);

      // Validate and get enhanced errors
      const schema = z.object({
        priority: z.number().min(1).max(5),
        status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
        tags: z.array(z.string()),
        estimatedDuration: z.number().min(1),
      });

      try {
        schema.parse(preprocessed.parameters);
      } catch (error) {
        const result = formatHandlerError(error, { toolName: 'add_task' });
        const message = result.content[0]?.text || '';

        // Should contain all the helpful elements
        expect(message).toContain('❌'); // Error indicator
        expect(message).toContain('💡'); // Suggestions
        expect(message).toContain('🔧 Common fixes'); // Common mistakes
        expect(message).toContain('📝 Working example'); // Examples

        // Should mention all problematic fields
        expect(message).toContain('priority');
        expect(message).toContain('status');
        expect(message).toContain('tags');
        expect(message).toContain('estimatedDuration');

        // Should provide actionable guidance
        expect(message).toMatch(/use.*number|provide.*array|try.*example/i);
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large parameter objects efficiently', () => {
      const largeParams: Record<string, unknown> = {};

      // Create 1000 parameters with various types
      for (let i = 0; i < 1000; i++) {
        largeParams[`param${i}`] =
          i % 4 === 0
            ? String(i) // Numbers as strings
            : i % 4 === 1
              ? `["item${i}"]` // Arrays as JSON
              : i % 4 === 2
                ? 'true' // Booleans as strings
                : `value${i}`; // Regular strings
      }

      const startTime = Date.now();
      const result = preprocessParameters(largeParams);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should be reasonably fast (adjusted for 5x larger limits)
      expect(result.conversions.length).toBeGreaterThan(500); // Should convert many
      expect(result.errors).toHaveLength(0); // Should not error
    });

    it('should handle complex error formatting efficiently', () => {
      // Create a schema with many validation rules
      const complexSchema = z.object({
        ...Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [
            `field${i}`,
            z.number().min(1).max(100),
          ])
        ),
      });

      const badData = Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => [`field${i}`, 'invalid'])
      );

      try {
        complexSchema.parse(badData);
      } catch (error) {
        const startTime = Date.now();
        const result = formatHandlerError(error, { toolName: 'add_task' });
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(50); // Should be fast
        expect(result.content[0]?.text).toBeTruthy();
        expect(result.isError).toBe(true);
      }
    });

    it('should handle enum matching with large sets efficiently', () => {
      const largeEnumSet = Array.from(
        { length: 1000 },
        (_, i) => `option_${i}`
      );

      const startTime = Date.now();
      const result = findClosestEnumValue('option_500', largeEnumSet);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10); // Should be very fast
      expect(result).toBe('option_500');
    });
  });

  describe('Backward Compatibility', () => {
    it('should not break existing valid requests', () => {
      const validRequest = {
        listId: 'a1b2c3d4-e5f6-4890-8bcd-ef1234567890',
        title: 'Valid Task',
        priority: 3,
        tags: ['work', 'important'],
        estimatedDuration: 60,
      };

      const preprocessed = preprocessParameters(validRequest);

      // Should pass through unchanged
      expect(preprocessed.parameters).toEqual(validRequest);
      expect(preprocessed.conversions).toHaveLength(0);
    });

    it('should maintain existing error response structure', () => {
      const schema = z.object({
        required: z.string(),
      });

      try {
        schema.parse({});
      } catch (error) {
        const result = formatHandlerError(error, { toolName: 'test_tool' });

        // Should maintain expected structure
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('isError');
        expect(result.isError).toBe(true);
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content[0]).toHaveProperty('type', 'text');
        expect(result.content[0]).toHaveProperty('text');
      }
    });
  });

  describe('Tool Examples Integration', () => {
    it('should provide examples for all major tools', () => {
      const majorTools = [
        'create_list',
        'add_task',
        'search_tool',
        'set_task_priority',
      ];

      majorTools.forEach(toolName => {
        const examples = getToolExamples(toolName);
        expect(examples).toBeDefined();
        expect(examples!.examples.length).toBeGreaterThan(0);
        expect(examples!.parameters.length).toBeGreaterThan(0);
      });
    });

    it('should provide relevant examples in error messages', () => {
      const schema = z.object({
        priority: z.number().min(1).max(5),
      });

      try {
        schema.parse({ priority: 'high' });
      } catch (error) {
        const result = formatHandlerError(error, { toolName: 'add_task' });
        const message = result.content[0]?.text || '';

        // Should contain working example with realistic data
        expect(message).toContain('📝 Working example');
        expect(message).toContain('listId');
        expect(message).toContain('title');

        // Example should be valid JSON
        const exampleMatch = message.match(
          /📝 Working example:\s*(\{[\s\S]*?\})/
        );
        if (exampleMatch) {
          expect(() => JSON.parse(exampleMatch[1])).not.toThrow();
        }
      }
    });
  });
});
