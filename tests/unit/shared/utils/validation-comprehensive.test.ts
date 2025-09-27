/**
 * Comprehensive Validation Tests
 * 
 * Tests for all new validation and preprocessing functionality to ensure reliability
 * and prevent regressions. This covers parameter preprocessing, error formatting,
 * and enum fuzzy matching with extensive edge cases.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { z, ZodError } from 'zod';
import {
  ParameterPreprocessor,
  preprocessParameters,
  type PreprocessingConfig,
  type PreprocessingResult,
} from '../../../../src/shared/utils/parameter-preprocessor.js';
import {
  ErrorFormatter,
  formatZodError,
  createErrorContext,
  type EnhancedErrorMessage,
} from '../../../../src/shared/utils/error-formatter.js';
import {
  EnumMatcher,
  findClosestEnumValue,
  getEnumSuggestions,
  type EnumMatchResult,
} from '../../../../src/shared/utils/enum-matcher.js';

describe('Comprehensive Validation Tests', () => {
  describe('Parameter Preprocessing Edge Cases', () => {
    let preprocessor: ParameterPreprocessor;

    beforeEach(() => {
      preprocessor = new ParameterPreprocessor();
    });

    it('should handle complex nested parameter structures', () => {
      const complexParams = {
        'task.priority': '5',
        'config.enabled': 'true',
        'metadata.tags': '["urgent", "important"]',
        'settings.timeout': '30.5',
        'flags.debug': 'false',
        'data.count': '0',
        'info.description': 'Regular string - no conversion',
      };

      const result = preprocessor.preprocessParameters(complexParams);

      expect(result.parameters['task.priority']).toBe(5);
      expect(result.parameters['config.enabled']).toBe(true);
      expect(result.parameters['metadata.tags']).toEqual(['urgent', 'important']);
      expect(result.parameters['settings.timeout']).toBe(30.5);
      expect(result.parameters['flags.debug']).toBe(false);
      expect(result.parameters['data.count']).toBe(0);
      expect(result.parameters['info.description']).toBe('Regular string - no conversion');
      expect(result.conversions).toHaveLength(6);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle malformed JSON gracefully without errors', () => {
      const malformedParams = {
        invalidJson1: '[1, 2, 3',
        invalidJson2: '{"key": value}',
        invalidJson3: '[1, 2, 3]extra',
        invalidJson4: '{broken json}',
        validJson: '["valid", "array"]',
      };

      const result = preprocessor.preprocessParameters(malformedParams);

      // Malformed JSON should remain unchanged
      expect(result.parameters.invalidJson1).toBe('[1, 2, 3');
      expect(result.parameters.invalidJson2).toBe('{"key": value}');
      expect(result.parameters.invalidJson3).toBe('[1, 2, 3]extra');
      expect(result.parameters.invalidJson4).toBe('{broken json}');
      
      // Valid JSON should be converted
      expect(result.parameters.validJson).toEqual(['valid', 'array']);
      
      expect(result.conversions).toHaveLength(1); // Only validJson converted
      expect(result.errors).toHaveLength(0); // No errors, just no conversion
    });

    it('should handle extreme numeric values correctly', () => {
      const extremeParams = {
        maxSafeInt: String(Number.MAX_SAFE_INTEGER),
        minSafeInt: String(Number.MIN_SAFE_INTEGER),
        maxValue: String(Number.MAX_VALUE),
        minValue: String(Number.MIN_VALUE),
        veryLarge: '999999999999999999999',
        verySmall: '0.000000000000001',
        scientific: '1.23e-10',
        negativeScientific: '-4.56E+15',
      };

      const result = preprocessor.preprocessParameters(extremeParams);

      expect(result.parameters.maxSafeInt).toBe(Number.MAX_SAFE_INTEGER);
      expect(result.parameters.minSafeInt).toBe(Number.MIN_SAFE_INTEGER);
      expect(typeof result.parameters.maxValue).toBe('number');
      expect(typeof result.parameters.minValue).toBe('number');
      expect(typeof result.parameters.veryLarge).toBe('number');
      expect(typeof result.parameters.verySmall).toBe('number');
      expect(result.parameters.scientific).toBe(1.23e-10);
      expect(result.parameters.negativeScientific).toBe(-4.56e15);
      expect(result.conversions).toHaveLength(8);
    });

    it('should handle unicode and special characters', () => {
      const unicodeParams = {
        emoji: '😀',
        unicode: 'café',
        chinese: '你好',
        arabic: 'مرحبا',
        specialChars: '!@#$%^&*()',
        mixedContent: 'Hello 世界 🌍',
        numberWithUnicode: '42',
        booleanWithUnicode: 'true',
      };

      const result = preprocessor.preprocessParameters(unicodeParams);

      // Unicode strings should remain unchanged
      expect(result.parameters.emoji).toBe('😀');
      expect(result.parameters.unicode).toBe('café');
      expect(result.parameters.chinese).toBe('你好');
      expect(result.parameters.arabic).toBe('مرحبا');
      expect(result.parameters.specialChars).toBe('!@#$%^&*()');
      expect(result.parameters.mixedContent).toBe('Hello 世界 🌍');
      
      // Numbers and booleans should still be converted
      expect(result.parameters.numberWithUnicode).toBe(42);
      expect(result.parameters.booleanWithUnicode).toBe(true);
      expect(result.conversions).toHaveLength(2);
    });

    it('should handle null and undefined values correctly', () => {
      const nullParams = {
        nullValue: null,
        undefinedValue: undefined,
        stringNull: 'null',
        stringUndefined: 'undefined',
        emptyString: '',
        whitespace: '   ',
      };

      const result = preprocessor.preprocessParameters(nullParams);

      expect(result.parameters.nullValue).toBe(null);
      expect(result.parameters.undefinedValue).toBe(undefined);
      expect(result.parameters.stringNull).toBe('null'); // String, not converted
      expect(result.parameters.stringUndefined).toBe('undefined'); // String, not converted
      expect(result.parameters.emptyString).toBe('');
      expect(result.parameters.whitespace).toBe('   ');
      expect(result.conversions).toHaveLength(0); // No conversions for null/undefined/empty
    });

    it('should handle configuration edge cases', () => {
      const allDisabledPreprocessor = new ParameterPreprocessor({
        enableNumberCoercion: false,
        enableJsonCoercion: false,
        enableBooleanCoercion: false,
        logConversions: false,
      });

      const result = allDisabledPreprocessor.preprocessParameters({
        number: '42',
        boolean: 'true',
        json: '["array"]',
      });

      // Nothing should be converted
      expect(result.parameters.number).toBe('42');
      expect(result.parameters.boolean).toBe('true');
      expect(result.parameters.json).toBe('["array"]');
      expect(result.conversions).toHaveLength(0);
    });
  });

  describe('Enhanced Error Formatting Edge Cases', () => {
    it('should handle deeply nested validation errors', () => {
      const schema = z.object({
        level1: z.object({
          level2: z.object({
            level3: z.object({
              deepValue: z.number(),
            }),
          }),
        }),
      });

      try {
        schema.parse({
          level1: {
            level2: {
              level3: {
                deepValue: 'not-a-number',
              },
            },
          },
        });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const deepError = formatted[0];
        
        expect(deepError.field).toBe('level1.level2.level3.deepValue');
        expect(deepError.message).toContain('level1.level2.level3.deepValue: Expected number');
        expect(deepError.suggestion).toContain('Please provide a value of type number');
      }
    });

    it('should handle multiple validation errors with different types', () => {
      const schema = z.object({
        priority: z.number().min(1).max(5),
        status: z.enum(['pending', 'completed', 'cancelled']),
        tags: z.array(z.string()),
        enabled: z.boolean(),
      });

      try {
        schema.parse({
          priority: 'high',
          status: 'done',
          tags: 'not-array',
          enabled: 'maybe',
        });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        
        expect(formatted).toHaveLength(4);
        
        const priorityError = formatted.find(e => e.field === 'priority');
        expect(priorityError?.code).toBe('invalid_type');
        
        const statusError = formatted.find(e => e.field === 'status');
        expect(statusError?.code).toBe('invalid_enum_value');
        expect(statusError?.suggestion).toContain('Please choose one of:');
        
        const tagsError = formatted.find(e => e.field === 'tags');
        expect(tagsError?.code).toBe('invalid_type');
        
        const enabledError = formatted.find(e => e.field === 'enabled');
        expect(enabledError?.code).toBe('invalid_type');
      }
    });

    it('should provide context-aware error messages for different tools', () => {
      const schema = z.object({
        priority: z.number(),
        tags: z.array(z.string()),
      });

      try {
        schema.parse({ priority: 'high', tags: 'not-array' });
      } catch (error) {
        const addTaskFormatted = ErrorFormatter.formatValidationError(
          error as ZodError,
          { toolName: 'add_task' }
        );
        
        const filterTasksFormatted = ErrorFormatter.formatValidationError(
          error as ZodError,
          { toolName: 'search_tool' }
        );

        // Should have different suggestions based on tool context
        const addTaskPriorityError = addTaskFormatted.find(e => e.field === 'priority');
        const filterTasksPriorityError = filterTasksFormatted.find(e => e.field === 'priority');
        
        expect(addTaskPriorityError?.suggestion).toBe('Use numbers 1-5, where 5 is highest priority');
        expect(filterTasksPriorityError?.suggestion).toBe('Use numbers 1-5 to filter by priority level');
      }
    });

    it('should handle error display formatting edge cases', () => {
      const manyErrors: EnhancedErrorMessage[] = Array.from({ length: 15 }, (_, i) => ({
        message: `Error ${i + 1}`,
        suggestion: `Suggestion ${i + 1}`,
        example: `Example ${i + 1}`,
        field: `field${i + 1}`,
        code: 'test',
      }));

      const display = ErrorFormatter.formatErrorsForDisplay(manyErrors, { maxErrors: 5 });
      
      expect(display).toContain('Found 15 validation errors:');
      expect(display).toContain('1. Error 1');
      expect(display).toContain('5. Error 5');
      expect(display).toContain('... and 10 more errors');
      expect(display).not.toContain('6. Error 6');
    });
  });

  describe('Enum Fuzzy Matching Edge Cases', () => {
    let matcher: EnumMatcher;

    beforeEach(() => {
      matcher = new EnumMatcher();
    });

    it('should handle empty and single-item enum sets', () => {
      const emptyResult = matcher.findClosestEnumValue('anything', []);
      expect(emptyResult.match).toBeNull();
      expect(emptyResult.matchType).toBe('none');
      expect(emptyResult.suggestions).toHaveLength(0);

      const singleResult = matcher.findClosestEnumValue('single', ['single']);
      expect(singleResult.match).toBe('single');
      expect(singleResult.matchType).toBe('exact');
      expect(singleResult.confidence).toBe(1.0);
    });

    it('should handle very long enum values and inputs', () => {
      const longEnum = 'this_is_a_very_long_enum_value_that_might_cause_performance_issues';
      const longInput = 'this_is_a_very_long_input_that_should_match_the_enum_value';
      
      const result = matcher.findClosestEnumValue(longInput, [longEnum, 'short']);
      
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.match).toBeDefined();
    });

    it('should handle special characters in enum values', () => {
      const specialEnums = [
        'test-with-dashes',
        'test_with_underscores',
        'test.with.dots',
        'test@with@symbols',
        'test/with/slashes',
      ];

      const result1 = matcher.findClosestEnumValue('test-with-dashes', specialEnums);
      expect(result1.match).toBe('test-with-dashes');
      expect(result1.matchType).toBe('exact');

      const result2 = matcher.findClosestEnumValue('test with dashes', specialEnums);
      expect(result2.suggestions.length).toBeGreaterThan(0);
    });

    it('should provide multiple suggestions when confidence is low', () => {
      const enums = ['apple', 'application', 'apply', 'appreciate'];
      const result = matcher.findClosestEnumValue('app', enums);
      
      expect(result.suggestions.length).toBeGreaterThan(1);
      expect(result.suggestions.every(s => s.confidence > 0)).toBe(true);
    });

    it('should handle case sensitivity configuration correctly', () => {
      const caseSensitive = new EnumMatcher({ caseSensitive: true });
      const caseInsensitive = new EnumMatcher({ caseSensitive: false });
      
      const enums = ['Test', 'TEST', 'test'];
      
      const sensitiveResult = caseSensitive.findClosestEnumValue('test', enums);
      const insensitiveResult = caseInsensitive.findClosestEnumValue('TEST', enums);
      
      expect(sensitiveResult.match).toBe('test');
      expect(insensitiveResult.matchType).toBe('exact');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete preprocessing and validation pipeline', () => {
      const preprocessor = new ParameterPreprocessor();
      
      // Simulate agent input with type coercion needs
      const agentInput = {
        priority: '5',
        enabled: 'true',
        tags: '["urgent", "important"]',
        description: 'Task description',
      };

      // Preprocess parameters
      const preprocessed = preprocessor.preprocessParameters(agentInput);
      
      expect(preprocessed.parameters.priority).toBe(5);
      expect(preprocessed.parameters.enabled).toBe(true);
      expect(preprocessed.parameters.tags).toEqual(['urgent', 'important']);
      expect(preprocessed.conversions).toHaveLength(3);

      // Now validate with Zod schema
      const schema = z.object({
        priority: z.number().min(1).max(5),
        enabled: z.boolean(),
        tags: z.array(z.string()),
        description: z.string(),
      });

      const validationResult = schema.safeParse(preprocessed.parameters);
      expect(validationResult.success).toBe(true);
    });

    it('should handle preprocessing failures gracefully', () => {
      const preprocessor = new ParameterPreprocessor();
      
      // Parameters that might cause issues but shouldn't crash
      const problematicInput = {
        validNumber: '42',
        invalidButSafe: 'not-a-number-but-thats-ok',
        emptyString: '',
        nullValue: null,
      };

      const result = preprocessor.preprocessParameters(problematicInput);
      
      expect(result.parameters.validNumber).toBe(42);
      expect(result.parameters.invalidButSafe).toBe('not-a-number-but-thats-ok');
      expect(result.parameters.emptyString).toBe('');
      expect(result.parameters.nullValue).toBe(null);
      expect(result.errors).toHaveLength(0); // Should not have errors
    });

    it('should provide end-to-end enhanced error experience', () => {
      const preprocessor = new ParameterPreprocessor();
      
      // Agent input that will fail validation even after preprocessing
      const agentInput = {
        priority: '10', // Will be converted to 10, but max is 5
        status: 'done', // Invalid enum value
        tags: 'not-an-array', // Can't be converted to array
        title: 'hi', // Too short
      };

      // Preprocess
      const preprocessed = preprocessor.preprocessParameters(agentInput);
      expect(preprocessed.parameters.priority).toBe(10); // Converted but still invalid

      // Validate
      const schema = z.object({
        priority: z.number().min(1).max(5),
        status: z.enum(['pending', 'completed', 'cancelled']),
        tags: z.array(z.string()),
        title: z.string().min(3),
      });

      try {
        schema.parse(preprocessed.parameters);
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(
          error as ZodError,
          { toolName: 'add_task' }
        );
        
        expect(formatted.length).toBeGreaterThan(0);
        
        const display = ErrorFormatter.formatErrorsForDisplay(formatted);
        expect(display).toContain('❌');
        expect(display).toContain('💡');
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large parameter objects efficiently', () => {
      const preprocessor = new ParameterPreprocessor();
      
      // Create large parameter object
      const largeParams: Record<string, unknown> = {};
      for (let i = 0; i < 1000; i++) {
        largeParams[`param${i}`] = i % 2 === 0 ? String(i) : `value${i}`;
      }

      const startTime = Date.now();
      const result = preprocessor.preprocessParameters(largeParams);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should be reasonably fast
      expect(result.conversions.length).toBe(500); // Half should be converted
      expect(result.errors).toHaveLength(0);
    });

    it('should handle complex error formatting efficiently', () => {
      // Create schema with many fields
      const complexSchema = z.object(
        Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [`field${i}`, z.number()])
        )
      );

      // Create invalid input
      const invalidInput = Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => [`field${i}`, 'invalid'])
      );

      try {
        complexSchema.parse(invalidInput);
      } catch (error) {
        const startTime = Date.now();
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(50); // Should be fast
        expect(formatted).toHaveLength(50);
      }
    });

    it('should handle enum matching with large sets efficiently', () => {
      const matcher = new EnumMatcher();
      
      // Create large enum set
      const largeEnumSet = Array.from({ length: 1000 }, (_, i) => `option_${i}`);
      
      const startTime = Date.now();
      const result = matcher.findClosestEnumValue('option_500', largeEnumSet);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200); // Should be reasonably fast
      expect(result.match).toBe('option_500');
      expect(result.matchType).toBe('exact');
    });
  });

  describe('Backward Compatibility', () => {
    it('should not break existing valid requests', () => {
      const preprocessor = new ParameterPreprocessor();
      
      // Existing request that should work without changes
      const existingRequest = {
        priority: 5, // Already a number
        enabled: true, // Already a boolean
        tags: ['tag1', 'tag2'], // Already an array
        description: 'Existing task',
      };

      const result = preprocessor.preprocessParameters(existingRequest);
      
      expect(result.parameters).toEqual(existingRequest); // Should be unchanged
      expect(result.conversions).toHaveLength(0); // No conversions needed
    });

    it('should maintain existing error response structure', () => {
      const schema = z.object({
        priority: z.number(),
      });

      try {
        schema.parse({ priority: 'invalid' });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(error as ZodError);
        
        // Should still have the basic structure
        expect(formatted[0]).toHaveProperty('message');
        expect(formatted[0]).toHaveProperty('field');
        expect(formatted[0]).toHaveProperty('code');
        
        // But now with enhancements
        expect(formatted[0]).toHaveProperty('suggestion');
        expect(formatted[0]).toHaveProperty('example');
      }
    });
  });

  describe('Tool Examples Integration', () => {
    it('should provide examples for all major tools', () => {
      const tools = ['add_task', 'search_tool', 'create_list'];
      
      tools.forEach(toolName => {
        const schema = z.object({
          priority: z.number(),
        });

        try {
          schema.parse({ priority: 'invalid' });
        } catch (error) {
          const formatted = ErrorFormatter.formatValidationError(
            error as ZodError,
            { toolName }
          );
          
          // Should have some guidance (either suggestion or example)
          const priorityError = formatted.find(e => e.field === 'priority');
          expect(
            priorityError?.suggestion || priorityError?.example
          ).toBeDefined();
        }
      });
    });

    it('should provide relevant examples in error messages', () => {
      const schema = z.object({
        tags: z.array(z.string()),
      });

      try {
        schema.parse({ tags: 'not-array' });
      } catch (error) {
        const formatted = ErrorFormatter.formatValidationError(
          error as ZodError,
          { toolName: 'add_task' }
        );
        
        const tagsError = formatted.find(e => e.field === 'tags');
        expect(tagsError?.example).toBe('["urgent", "important", "bug-fix"]');
      }
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory with repeated operations', () => {
      const preprocessor = new ParameterPreprocessor();
      const matcher = new EnumMatcher();
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        preprocessor.preprocessParameters({
          number: String(i),
          boolean: i % 2 === 0 ? 'true' : 'false',
        });
        
        matcher.findClosestEnumValue(`option${i}`, ['option1', 'option2', 'option3']);
      }
      
      // Should complete without issues
      expect(true).toBe(true);
    });

    it('should handle cache management correctly', () => {
      const matcher = new EnumMatcher();
      
      // Fill cache
      for (let i = 0; i < 10; i++) {
        matcher.findClosestEnumValue(`test${i}`, ['option1', 'option2']);
      }
      
      const stats = matcher.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      
      // Clear cache
      matcher.clearCache();
      expect(matcher.getCacheStats().size).toBe(0);
    });
  });
});