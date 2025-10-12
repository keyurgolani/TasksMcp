/**
 * Unit tests for Parameter Preprocessor
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  ParameterPreprocessor,
  preprocessParameters,
  createPreprocessor,
  type PreprocessingConfig as _PreprocessingConfig,
} from '../../../../src/shared/utils/parameter-preprocessor.js';

describe('ParameterPreprocessor', () => {
  let preprocessor: ParameterPreprocessor;

  beforeEach(() => {
    preprocessor = new ParameterPreprocessor();
  });

  describe('Number Conversion', () => {
    it('should convert integer strings to numbers', () => {
      const result = preprocessor.preprocessParameters({
        priority: '5',
        count: '42',
        negative: '-10',
      });

      expect(result.parameters.priority).toBe(5);
      expect(result.parameters.count).toBe(42);
      expect(result.parameters.negative).toBe(-10);
      expect(result.conversions).toHaveLength(3);
      expect(result.conversions[0].conversionType).toBe('string->number');
    });

    it('should convert decimal strings to numbers', () => {
      const result = preprocessor.preprocessParameters({
        rating: '4.5',
        percentage: '0.75',
        negative: '-3.14',
      });

      expect(result.parameters.rating).toBe(4.5);
      expect(result.parameters.percentage).toBe(0.75);
      expect(result.parameters.negative).toBe(-3.14);
      expect(result.conversions).toHaveLength(3);
    });

    it('should convert scientific notation strings to numbers', () => {
      const result = preprocessor.preprocessParameters({
        large: '1.5e10',
        small: '2.3e-5',
        negative: '-1.2E+3',
      });

      expect(result.parameters.large).toBe(1.5e10);
      expect(result.parameters.small).toBe(2.3e-5);
      expect(result.parameters.negative).toBe(-1.2e3);
      expect(result.conversions).toHaveLength(3);
    });

    it('should not convert non-numeric strings', () => {
      const result = preprocessor.preprocessParameters({
        text: 'hello',
        mixed: '123abc',
        empty: '',
        spaces: '   ',
      });

      expect(result.parameters.text).toBe('hello');
      expect(result.parameters.mixed).toBe('123abc');
      expect(result.parameters.empty).toBe('');
      expect(result.parameters.spaces).toBe('   ');
      expect(result.conversions).toHaveLength(0);
    });

    it('should handle edge cases for number conversion', () => {
      const result = preprocessor.preprocessParameters({
        infinity: 'Infinity',
        negInfinity: '-Infinity',
        nan: 'NaN',
        zero: '0',
        negZero: '-0',
      });

      expect(result.parameters.infinity).toBe('Infinity'); // Should not convert
      expect(result.parameters.negInfinity).toBe('-Infinity'); // Should not convert
      expect(result.parameters.nan).toBe('NaN'); // Should not convert
      expect(result.parameters.zero).toBe(0);
      expect(result.parameters.negZero).toBe(-0);
      expect(result.conversions).toHaveLength(2); // Only zero and negZero
    });
  });

  describe('JSON Conversion', () => {
    it('should convert JSON array strings to arrays', () => {
      const result = preprocessor.preprocessParameters({
        tags: '["tag1", "tag2", "tag3"]',
        numbers: '[1, 2, 3]',
        mixed: '["text", 42, true]',
      });

      expect(result.parameters.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(result.parameters.numbers).toEqual([1, 2, 3]);
      expect(result.parameters.mixed).toEqual(['text', 42, true]);
      expect(result.conversions).toHaveLength(3);
      expect(result.conversions[0].conversionType).toBe('json->array');
    });

    it('should convert JSON object strings to objects', () => {
      const result = preprocessor.preprocessParameters({
        config: '{"enabled": true, "count": 5}',
        nested: '{"user": {"name": "John", "age": 30}}',
      });

      expect(result.parameters.config).toEqual({ enabled: true, count: 5 });
      expect(result.parameters.nested).toEqual({
        user: { name: 'John', age: 30 },
      });
      expect(result.conversions).toHaveLength(2);
      expect(result.conversions[0].conversionType).toBe('json->object');
    });

    it('should handle malformed JSON gracefully', () => {
      const result = preprocessor.preprocessParameters({
        invalid1: '[1, 2, 3',
        invalid2: '{"key": value}',
        invalid3: '[1, 2, 3]extra',
      });

      expect(result.parameters.invalid1).toBe('[1, 2, 3');
      expect(result.parameters.invalid2).toBe('{"key": value}');
      expect(result.parameters.invalid3).toBe('[1, 2, 3]extra');
      expect(result.conversions).toHaveLength(0);
      expect(result.errors).toHaveLength(0); // Should not error, just not convert
    });

    it('should not convert JSON primitives', () => {
      const result = preprocessor.preprocessParameters({
        string: '"hello"',
        number: '42',
        boolean: 'true',
        null: 'null',
      });

      // These should not be converted as they're not arrays or objects
      expect(result.parameters.string).toBe('"hello"');
      expect(result.parameters.null).toBe('null');
      // number and boolean might be converted by other rules
      expect(
        result.conversions.filter(c => c.conversionType.startsWith('json->'))
      ).toHaveLength(0);
    });
  });

  describe('Boolean Conversion', () => {
    it('should convert boolean-like strings to booleans', () => {
      const result = preprocessor.preprocessParameters({
        flag1: 'true',
        flag2: 'false',
        flag3: 'TRUE',
        flag4: 'FALSE',
      });

      expect(result.parameters.flag1).toBe(true);
      expect(result.parameters.flag2).toBe(false);
      expect(result.parameters.flag3).toBe(true);
      expect(result.parameters.flag4).toBe(false);
      expect(result.conversions).toHaveLength(4);
      expect(result.conversions[0].conversionType).toBe('string->boolean');
    });

    it('should convert yes/no strings to booleans', () => {
      const result = preprocessor.preprocessParameters({
        confirm1: 'yes',
        confirm2: 'no',
        confirm3: 'YES',
        confirm4: 'NO',
      });

      expect(result.parameters.confirm1).toBe(true);
      expect(result.parameters.confirm2).toBe(false);
      expect(result.parameters.confirm3).toBe(true);
      expect(result.parameters.confirm4).toBe(false);
      expect(result.conversions).toHaveLength(4);
    });

    it('should not convert 1/0 strings to booleans (they become numbers)', () => {
      const result = preprocessor.preprocessParameters({
        binary1: '1',
        binary2: '0',
      });

      // These should be converted to numbers, not booleans
      expect(result.parameters.binary1).toBe(1);
      expect(result.parameters.binary2).toBe(0);
      expect(result.conversions).toHaveLength(2);
      expect(result.conversions[0].conversionType).toBe('string->number');
    });

    it('should handle whitespace in boolean strings', () => {
      const result = preprocessor.preprocessParameters({
        spaced1: '  true  ',
        spaced2: '\tfalse\n',
        spaced3: ' YES ',
      });

      expect(result.parameters.spaced1).toBe(true);
      expect(result.parameters.spaced2).toBe(false);
      expect(result.parameters.spaced3).toBe(true);
      expect(result.conversions).toHaveLength(3);
    });

    it('should not convert non-boolean strings', () => {
      const result = preprocessor.preprocessParameters({
        text: 'maybe',
        number: '2',
        empty: '',
        one: '1',
        zero: '0',
      });

      expect(result.parameters.text).toBe('maybe');
      expect(result.parameters.number).toBe(2); // Converted by number rule
      expect(result.parameters.empty).toBe('');
      expect(result.parameters.one).toBe(1); // Converted by number rule
      expect(result.parameters.zero).toBe(0); // Converted by number rule
      expect(
        result.conversions.filter(c => c.conversionType === 'string->boolean')
      ).toHaveLength(0);
    });
  });

  describe('Mixed Conversions', () => {
    it('should handle multiple conversion types in one call', () => {
      const result = preprocessor.preprocessParameters({
        priority: '5',
        enabled: 'true',
        tags: '["urgent", "important"]',
        description: 'Regular string',
        count: '0',
      });

      expect(result.parameters.priority).toBe(5);
      expect(result.parameters.enabled).toBe(true);
      expect(result.parameters.tags).toEqual(['urgent', 'important']);
      expect(result.parameters.description).toBe('Regular string');
      expect(result.parameters.count).toBe(0);
      expect(result.conversions).toHaveLength(4);
    });

    it('should preserve original values when no conversion is needed', () => {
      const result = preprocessor.preprocessParameters({
        alreadyNumber: 42,
        alreadyBoolean: true,
        alreadyArray: ['a', 'b'],
        alreadyObject: { key: 'value' },
        nullValue: null,
        undefinedValue: undefined,
      });

      expect(result.parameters.alreadyNumber).toBe(42);
      expect(result.parameters.alreadyBoolean).toBe(true);
      expect(result.parameters.alreadyArray).toEqual(['a', 'b']);
      expect(result.parameters.alreadyObject).toEqual({ key: 'value' });
      expect(result.parameters.nullValue).toBe(null);
      expect(result.parameters.undefinedValue).toBe(undefined);
      expect(result.conversions).toHaveLength(0);
    });
  });

  describe('Configuration Options', () => {
    it('should respect disabled number coercion', () => {
      const customPreprocessor = new ParameterPreprocessor({
        enableNumberCoercion: false,
      });

      const result = customPreprocessor.preprocessParameters({
        priority: '5',
        enabled: 'true',
      });

      expect(result.parameters.priority).toBe('5'); // Not converted
      expect(result.parameters.enabled).toBe(true); // Still converted
      expect(result.conversions).toHaveLength(1);
    });

    it('should respect disabled JSON coercion', () => {
      const customPreprocessor = new ParameterPreprocessor({
        enableJsonCoercion: false,
      });

      const result = customPreprocessor.preprocessParameters({
        tags: '["tag1", "tag2"]',
        priority: '5',
      });

      expect(result.parameters.tags).toBe('["tag1", "tag2"]'); // Not converted
      expect(result.parameters.priority).toBe(5); // Still converted
      expect(result.conversions).toHaveLength(1);
    });

    it('should respect disabled boolean coercion', () => {
      const customPreprocessor = new ParameterPreprocessor({
        enableBooleanCoercion: false,
      });

      const result = customPreprocessor.preprocessParameters({
        enabled: 'true',
        priority: '5',
      });

      expect(result.parameters.enabled).toBe('true'); // Not converted
      expect(result.parameters.priority).toBe(5); // Still converted
      expect(result.conversions).toHaveLength(1);
    });

    it('should respect disabled logging', () => {
      const customPreprocessor = new ParameterPreprocessor({
        logConversions: false,
      });

      const result = customPreprocessor.preprocessParameters({
        priority: '5',
      });

      expect(result.parameters.priority).toBe(5);
      expect(result.conversions).toHaveLength(1);
      // Logging behavior would need to be tested with a mock logger
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully and continue processing', () => {
      // This test would need to simulate an error condition
      // For now, we test that the structure handles errors properly
      const result = preprocessor.preprocessParameters({
        valid: '5',
        // In a real scenario, we might have a parameter that causes an error
      });

      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.parameters.valid).toBe(5);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate preprocessing statistics', () => {
      const result = preprocessor.preprocessParameters({
        priority: '5',
        enabled: 'true',
        tags: '["tag1", "tag2"]',
        description: 'unchanged',
      });

      const stats = preprocessor.getStats(result);

      expect(stats.totalParameters).toBe(4);
      expect(stats.convertedParameters).toBe(3);
      expect(stats.conversionsByType['string->number']).toBe(1);
      expect(stats.conversionsByType['string->boolean']).toBe(1);
      expect(stats.conversionsByType['json->array']).toBe(1);
      expect(stats.errorCount).toBe(0);
    });
  });

  describe('Utility Functions', () => {
    it('should work with the global preprocessParameters function', () => {
      const result = preprocessParameters({
        priority: '5',
        enabled: 'true',
      });

      expect(result.parameters.priority).toBe(5);
      expect(result.parameters.enabled).toBe(true);
      expect(result.conversions).toHaveLength(2);
    });

    it('should work with createPreprocessor factory function', () => {
      const customPreprocessor = createPreprocessor({
        enableNumberCoercion: false,
      });

      const result = customPreprocessor.preprocessParameters({
        priority: '5',
        enabled: 'true',
      });

      expect(result.parameters.priority).toBe('5'); // Not converted
      expect(result.parameters.enabled).toBe(true); // Still converted
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty parameters object', () => {
      const result = preprocessor.preprocessParameters({});

      expect(result.parameters).toEqual({});
      expect(result.conversions).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle parameters with special characters', () => {
      const result = preprocessor.preprocessParameters({
        'param-with-dash': '5',
        param_with_underscore: 'true',
        'param.with.dots': '["array"]',
      });

      expect(result.parameters['param-with-dash']).toBe(5);
      expect(result.parameters['param_with_underscore']).toBe(true);
      expect(result.parameters['param.with.dots']).toEqual(['array']);
      expect(result.conversions).toHaveLength(3);
    });

    it('should handle very large numbers', () => {
      const result = preprocessor.preprocessParameters({
        large: '999999999999999999999',
        maxSafeInt: String(Number.MAX_SAFE_INTEGER),
        scientific: '1e308',
      });

      expect(typeof result.parameters.large).toBe('number');
      expect(result.parameters.maxSafeInt).toBe(Number.MAX_SAFE_INTEGER);
      expect(typeof result.parameters.scientific).toBe('number');
    });

    it('should handle deeply nested JSON', () => {
      const nestedJson = JSON.stringify({
        level1: {
          level2: {
            level3: ['deep', 'array', { key: 'value' }],
          },
        },
      });

      const result = preprocessor.preprocessParameters({
        nested: nestedJson,
      });

      expect(result.parameters.nested).toEqual({
        level1: {
          level2: {
            level3: ['deep', 'array', { key: 'value' }],
          },
        },
      });
      expect(result.conversions).toHaveLength(1);
    });
  });
});
