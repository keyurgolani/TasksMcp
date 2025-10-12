/**
 * Unit tests for Enum Fuzzy Matching Algorithm
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  EnumMatcher,
  findClosestEnumValue,
  getEnumSuggestions,
  createEnumMatcher,
  COMMON_ENUM_PATTERNS,
  type EnumMatchingConfig as _EnumMatchingConfig,
  type EnumMatchResult as _EnumMatchResult,
} from '../../../../src/shared/utils/enum-matcher.js';

describe('EnumMatcher', () => {
  let matcher: EnumMatcher;
  const testEnums = ['pending', 'completed', 'in_progress', 'cancelled'];

  beforeEach(() => {
    matcher = new EnumMatcher();
  });

  describe('Exact Matching', () => {
    it('should find exact matches (case sensitive)', () => {
      const caseSensitiveMatcher = new EnumMatcher({ caseSensitive: true });
      const result = caseSensitiveMatcher.findClosestEnumValue(
        'pending',
        testEnums
      );

      expect(result.match).toBe('pending');
      expect(result.confidence).toBe(1.0);
      expect(result.matchType).toBe('exact');
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].matchType).toBe('exact');
    });

    it('should find exact matches (case insensitive)', () => {
      const result = matcher.findClosestEnumValue('PENDING', testEnums);

      expect(result.match).toBe('pending');
      expect(result.confidence).toBe(1.0);
      expect(result.matchType).toBe('exact');
    });

    it('should handle whitespace in exact matches', () => {
      const result = matcher.findClosestEnumValue('  pending  ', testEnums);

      expect(result.match).toBe('pending');
      expect(result.confidence).toBe(1.0);
      expect(result.matchType).toBe('exact');
    });

    it('should prioritize exact matches over partial matches', () => {
      const enums = ['progress', 'in_progress', 'no_progress'];
      const result = matcher.findClosestEnumValue('progress', enums);

      expect(result.match).toBe('progress');
      expect(result.matchType).toBe('exact');
    });
  });

  describe('Partial Matching', () => {
    it('should find partial matches when input is contained in option', () => {
      const result = matcher.findClosestEnumValue('progress', testEnums);

      expect(result.match).toBe('in_progress');
      expect(result.matchType).toBe('partial');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should find partial matches when option is contained in input', () => {
      const result = matcher.findClosestEnumValue(
        'completed_successfully',
        testEnums
      );

      expect(result.match).toBe('completed');
      expect(result.matchType).toBe('partial');
    });

    it('should calculate confidence based on overlap', () => {
      const result1 = matcher.findClosestEnumValue('comp', testEnums); // Short overlap
      const result2 = matcher.findClosestEnumValue('complete', testEnums); // Longer overlap

      expect(result2.confidence).toBeGreaterThan(result1.confidence);
    });

    it('should respect partial matching configuration', () => {
      const noPartialMatcher = new EnumMatcher({ enablePartialMatch: false });
      const result = noPartialMatcher.findClosestEnumValue(
        'progress',
        testEnums
      );

      // Should fall back to distance matching or no match
      expect(result.matchType).not.toBe('partial');
    });
  });

  describe('Distance-Based Matching', () => {
    it('should find close matches using Levenshtein distance', () => {
      const result = matcher.findClosestEnumValue('complet', testEnums); // Missing 'ed'

      expect(result.match).toBe('completed');
      // Could be partial or distance depending on which has higher confidence
      expect(['partial', 'distance']).toContain(result.matchType);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle single character differences', () => {
      const result = matcher.findClosestEnumValue('pendng', testEnums); // Missing 'i'

      expect(result.match).toBe('pending');
      expect(result.matchType).toBe('distance');
    });

    it('should handle character substitutions', () => {
      const result = matcher.findClosestEnumValue('panding', testEnums); // 'e' -> 'a'

      expect(result.match).toBe('pending');
      expect(result.matchType).toBe('distance');
    });

    it('should handle character insertions', () => {
      const result = matcher.findClosestEnumValue('pendingg', testEnums); // Extra 'g'

      expect(result.match).toBe('pending');
      // Could be partial or distance depending on which has higher confidence
      expect(['partial', 'distance']).toContain(result.matchType);
    });

    it('should respect maximum distance configuration', () => {
      const strictMatcher = new EnumMatcher({ maxDistance: 1 });
      const result = strictMatcher.findClosestEnumValue('xyz', testEnums); // Very different

      expect(result.match).toBeNull();
      expect(result.matchType).toBe('none');
    });

    it('should not suggest matches that are too different', () => {
      const result = matcher.findClosestEnumValue(
        'completely_different',
        testEnums
      );

      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Multiple Suggestions', () => {
    it('should return multiple suggestions ordered by confidence', () => {
      const enums = ['pending', 'pending_review', 'pending_approval'];
      const result = matcher.findClosestEnumValue('pend', enums);

      expect(result.suggestions.length).toBeGreaterThan(1);

      // Should be ordered by confidence (descending)
      for (let i = 1; i < result.suggestions.length; i++) {
        expect(result.suggestions[i - 1].confidence).toBeGreaterThanOrEqual(
          result.suggestions[i].confidence
        );
      }
    });

    it('should respect maximum suggestions configuration', () => {
      const limitedMatcher = new EnumMatcher({ maxSuggestions: 2 });
      const enums = [
        'pending',
        'pending_review',
        'pending_approval',
        'pending_confirmation',
      ];
      const result = limitedMatcher.findClosestEnumValue('pend', enums);

      expect(result.suggestions).toHaveLength(2);
    });

    it('should remove duplicate suggestions', () => {
      const result = matcher.findClosestEnumValue('pending', testEnums);
      const values = result.suggestions.map(s => s.value);
      const uniqueValues = [...new Set(values)];

      expect(values).toEqual(uniqueValues);
    });

    it('should prioritize match types correctly', () => {
      // This test ensures that exact > partial > distance when confidence is equal
      const enums = ['test', 'testing', 'tester'];
      const result = matcher.findClosestEnumValue('test', enums);

      expect(result.suggestions[0].matchType).toBe('exact');
      expect(result.suggestions[0].value).toBe('test');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty enum arrays', () => {
      const result = matcher.findClosestEnumValue('anything', []);

      expect(result.match).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.matchType).toBe('none');
      expect(result.suggestions).toHaveLength(0);
    });

    it('should handle empty input strings', () => {
      const result = matcher.findClosestEnumValue('', testEnums);

      expect(result.match).toBeNull();
      expect(result.matchType).toBe('none');
    });

    it('should handle single character inputs', () => {
      const result = matcher.findClosestEnumValue('p', testEnums);

      // Should find some match (likely partial or distance)
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should handle very long inputs', () => {
      const longInput = 'a'.repeat(1000);
      const result = matcher.findClosestEnumValue(longInput, testEnums);

      // Should not crash and should return some result
      expect(result).toBeDefined();
      expect(result.matchType).toBeDefined();
    });

    it('should handle special characters', () => {
      const specialEnums = ['test-case', 'test_case', 'test.case', 'test@case'];
      const result = matcher.findClosestEnumValue('test-case', specialEnums);

      expect(result.match).toBe('test-case');
      expect(result.matchType).toBe('exact');
    });

    it('should handle unicode characters', () => {
      const unicodeEnums = ['café', 'naïve', 'résumé'];
      const result = matcher.findClosestEnumValue('cafe', unicodeEnums);

      // Should find some reasonable match
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Options', () => {
    it('should respect case sensitivity setting', () => {
      const caseSensitive = new EnumMatcher({ caseSensitive: true });
      const caseInsensitive = new EnumMatcher({ caseSensitive: false });

      const sensitiveResult = caseSensitive.findClosestEnumValue(
        'PENDING',
        testEnums
      );
      const insensitiveResult = caseInsensitive.findClosestEnumValue(
        'PENDING',
        testEnums
      );

      expect(sensitiveResult.matchType).not.toBe('exact');
      expect(insensitiveResult.matchType).toBe('exact');
    });

    it('should respect maximum distance setting', () => {
      const strict = new EnumMatcher({ maxDistance: 1 });
      const lenient = new EnumMatcher({ maxDistance: 5 });

      const input = 'xyz'; // Very different from test enums
      const strictResult = strict.findClosestEnumValue(input, testEnums);
      const lenientResult = lenient.findClosestEnumValue(input, testEnums);

      expect(strictResult.suggestions.length).toBeLessThanOrEqual(
        lenientResult.suggestions.length
      );
    });

    it('should respect partial matching setting', () => {
      const withPartial = new EnumMatcher({ enablePartialMatch: true });
      const withoutPartial = new EnumMatcher({ enablePartialMatch: false });

      const input = 'progress'; // Should match 'in_progress' partially
      const withResult = withPartial.findClosestEnumValue(input, testEnums);
      const withoutResult = withoutPartial.findClosestEnumValue(
        input,
        testEnums
      );

      // With partial matching should find better match
      expect(withResult.confidence).toBeGreaterThanOrEqual(
        withoutResult.confidence
      );
    });
  });

  describe('Performance and Caching', () => {
    it('should cache results for repeated queries', () => {
      const result1 = matcher.findClosestEnumValue('pending', testEnums);
      const result2 = matcher.findClosestEnumValue('pending', testEnums);

      // Results should be identical (cached)
      expect(result1).toEqual(result2);
    });

    it('should provide cache statistics', () => {
      matcher.findClosestEnumValue('pending', testEnums);
      const stats = matcher.getCacheStats();

      expect(stats.size).toBeGreaterThan(0);
      expect(typeof stats.size).toBe('number');
    });

    it('should clear cache when requested', () => {
      matcher.findClosestEnumValue('pending', testEnums);
      expect(matcher.getCacheStats().size).toBeGreaterThan(0);

      matcher.clearCache();
      expect(matcher.getCacheStats().size).toBe(0);
    });

    it('should handle large enum sets efficiently', () => {
      const largeEnumSet = Array.from(
        { length: 1000 },
        (_, i) => `option_${i}`
      );

      const startTime = Date.now();
      const result = matcher.findClosestEnumValue('option_500', largeEnumSet);
      const endTime = Date.now();

      expect(result.match).toBe('option_500');
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
    });
  });

  describe('Utility Methods', () => {
    it('should find suggestions with custom limit', () => {
      const suggestions = matcher.findSuggestions('pend', testEnums, 2);

      expect(suggestions.length).toBeLessThanOrEqual(2);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.every(s => s.value && s.confidence >= 0)).toBe(true);
    });

    it('should check for reasonable matches', () => {
      const hasMatch = matcher.hasReasonableMatch('pending', testEnums, 0.8);
      const noMatch = matcher.hasReasonableMatch('xyz', testEnums, 0.8);

      expect(hasMatch).toBe(true);
      expect(noMatch).toBe(false);
    });

    it('should handle different confidence thresholds', () => {
      const lowThreshold = matcher.hasReasonableMatch('pend', testEnums, 0.1);
      const highThreshold = matcher.hasReasonableMatch('pend', testEnums, 0.9);

      expect(lowThreshold).toBe(true);
      expect(highThreshold).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    it('should work with findClosestEnumValue convenience function', () => {
      const result = findClosestEnumValue('pending', testEnums);

      expect(result).toBe('pending');
    });

    it('should work with getEnumSuggestions convenience function', () => {
      const suggestions = getEnumSuggestions('pend', testEnums, 2);

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeLessThanOrEqual(2);
      expect(suggestions.every(s => typeof s === 'string')).toBe(true);
    });

    it('should work with createEnumMatcher factory function', () => {
      const customMatcher = createEnumMatcher({
        caseSensitive: true,
        maxDistance: 1,
      });
      const result = customMatcher.findClosestEnumValue('PENDING', testEnums);

      expect(result.matchType).not.toBe('exact'); // Due to case sensitivity
    });
  });

  describe('Common Enum Patterns', () => {
    it('should provide common enum patterns', () => {
      expect(COMMON_ENUM_PATTERNS.status).toContain('pending');
      expect(COMMON_ENUM_PATTERNS.priority).toContain('high');
      expect(COMMON_ENUM_PATTERNS.boolean).toContain('true');
      expect(COMMON_ENUM_PATTERNS.format).toContain('json');
      expect(COMMON_ENUM_PATTERNS.method).toContain('get');
    });

    it('should work with common status patterns', () => {
      const result = matcher.findClosestEnumValue(
        'inprogress',
        COMMON_ENUM_PATTERNS.status
      );

      expect(result.match).toBe('in_progress');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should work with common priority patterns', () => {
      const result = matcher.findClosestEnumValue(
        'hi',
        COMMON_ENUM_PATTERNS.priority
      );

      expect(result.match).toBe('high');
    });

    it('should work with common boolean patterns', () => {
      const result = matcher.findClosestEnumValue(
        'on',
        COMMON_ENUM_PATTERNS.boolean
      );

      expect(result.match).toBe('on');
      expect(result.matchType).toBe('exact');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle common typos in status values', () => {
      const typos = [
        { input: 'compelte', expected: 'completed' },
        { input: 'pendig', expected: 'pending' },
        { input: 'cancled', expected: 'cancelled' },
        { input: 'inprogress', expected: 'in_progress' },
      ];

      typos.forEach(({ input, expected }) => {
        const result = matcher.findClosestEnumValue(input, testEnums);
        expect(result.match).toBe(expected);
      });
    });

    it('should handle abbreviations', () => {
      const abbreviations = [
        { input: 'comp', expected: 'completed' },
        { input: 'pend', expected: 'pending' },
        { input: 'prog', expected: 'in_progress' },
      ];

      abbreviations.forEach(({ input, expected }) => {
        const result = matcher.findClosestEnumValue(input, testEnums);
        expect(result.match).toBe(expected);
      });
    });

    it('should handle different naming conventions', () => {
      const conventions = [
        'camelCase',
        'snake_case',
        'kebab-case',
        'PascalCase',
      ];

      const camelResult = matcher.findClosestEnumValue(
        'snakeCase',
        conventions
      );
      expect(camelResult.match).toBe('snake_case');

      const kebabResult = matcher.findClosestEnumValue(
        'camel-case',
        conventions
      );
      expect(kebabResult.match).toBe('camelCase');
    });

    it('should provide helpful suggestions for completely wrong inputs', () => {
      const result = matcher.findClosestEnumValue('xyz', testEnums);

      // Even for wrong inputs, should provide some suggestions
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.every(s => testEnums.includes(s.value))).toBe(
        true
      );
    });
  });
});
