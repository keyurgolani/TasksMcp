/**
 * Expanded tag validation tests
 * Tests for modern character support in tag validation
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { TaskValidator } from '../../../../../src/core/orchestration/validators/task-validator.js';

describe('Expanded Tag Validation', () => {
  let validator: TaskValidator;

  beforeEach(() => {
    validator = new TaskValidator();
  });

  describe('Modern Character Support', () => {
    it('should support emoji characters in tags', () => {
      const emojiTags = [
        '🚀rocket',
        '⭐star',
        '🔥fire',
        '💡idea',
        '🎯target',
        '🌟feature',
        '🐛bug',
        '✅done',
        '❌blocked',
        '🔧fix',
      ];

      const result = validator.validateTags(emojiTags);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should support uppercase characters in tags', () => {
      const uppercaseTags = [
        'URGENT',
        'HIGH-PRIORITY',
        'CRITICAL',
        'IMPORTANT',
        'TASK',
        'DONE',
        'BLOCKED',
        'IN-PROGRESS',
        'REVIEW',
        'TESTING',
      ];

      const result = validator.validateTags(uppercaseTags);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should support unicode characters from various languages', () => {
      const unicodeTags = [
        'français', // French
        'español', // Spanish
        'deutsch', // German
        'italiano', // Italian
        'português', // Portuguese
        'русский', // Russian
        '中文', // Chinese
        '日本語', // Japanese
        '한국어', // Korean
        'العربية', // Arabic
        'עברית', // Hebrew
        'हिन्दी', // Hindi
        'ไทย', // Thai
        'Ελληνικά', // Greek
      ];

      const result = validator.validateTags(unicodeTags);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should support mixed case and numbers in tags', () => {
      const mixedTags = [
        'CamelCase',
        'PascalCase',
        'snake_case',
        'kebab-case',
        'version2',
        'v1-2-3',
        'build123',
        'test_case_1',
        'Feature-A',
        'Module_B',
      ];

      const result = validator.validateTags(mixedTags);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should support hyphens and underscores in tags', () => {
      const separatorTags = [
        'tag-with-hyphens',
        'tag_with_underscores',
        'multi-word-tag',
        'another_multi_word_tag',
        'mixed-tag_with_both',
        'start-with-hyphen',
        'end_with_underscore',
        'single-',
        'single_',
        '-start',
        '_start',
      ];

      const result = validator.validateTags(separatorTags);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should support complex combinations of modern characters', () => {
      const complexTags = [
        '🚀Feature-v2',
        '⭐HIGH_PRIORITY',
        '🔥urgent-français',
        '💡idea_中文',
        '🎯target-العربية',
        '🌟feature_русский',
        '🐛bug-fix_123',
        '✅done-español',
        '❌blocked_deutsch',
        '🔧fix-italiano_v1',
      ];

      const result = validator.validateTags(complexTags);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Invalid Character Rejection', () => {
    it('should reject tags with spaces', () => {
      const spaceTags = ['tag with spaces', 'another tag', 'multi word tag'];

      const result = validator.validateTags(spaceTags);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      result.errors.forEach(error => {
        expect(error.message).toBe('Tag contains invalid characters');
        expect(error.actionableGuidance).toContain(
          'Spaces and special characters'
        );
      });
    });

    it('should reject tags with special symbols', () => {
      const symbolTags = [
        'tag@symbol',
        'tag!exclamation',
        'tag.dot',
        'tag/slash',
        'tag\\backslash',
        'tag(parentheses)',
        'tag[brackets]',
        'tag{braces}',
        'tag+plus',
        'tag=equals',
        'tag<less',
        'tag>greater',
        'tag:colon',
        'tag"quote',
        'tag|pipe',
        'tag?question',
        'tag*asterisk',
      ];

      const result = validator.validateTags(symbolTags);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(symbolTags.length);
      result.errors.forEach(error => {
        expect(error.message).toBe('Tag contains invalid characters');
        expect(error.actionableGuidance).toContain('Use only letters');
      });
    });

    it('should provide helpful error messages for invalid characters', () => {
      const invalidTags = ['invalid@tag', 'bad tag!'];

      const result = validator.validateTags(invalidTags);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);

      result.errors.forEach(error => {
        expect(error.message).toBe('Tag contains invalid characters');
        expect(error.expectedValue).toBe(
          'string with letters, numbers, emoji, hyphens, or underscores only'
        );
        expect(error.actionableGuidance).toContain(
          'Use only letters (including unicode), numbers, emoji, hyphens (-), and underscores (_)'
        );
        expect(error.actionableGuidance).toContain(
          'Spaces and special characters like @!<>:"|?* are not allowed'
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tags array', () => {
      const result = validator.validateTags([]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle single character tags with modern characters', () => {
      const singleCharTags = ['🚀', '中', 'A', '1', '-', '_'];

      const result = validator.validateTags(singleCharTags);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle maximum length tags with modern characters', () => {
      // Create a 50-character tag with unicode characters
      const maxLengthTag = '🚀'.repeat(25); // Each emoji is 2 bytes, so 25 * 2 = 50 chars
      const maxLengthTags = [maxLengthTag];

      const result = validator.validateTags(maxLengthTags);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject tags exceeding maximum length with modern characters', () => {
      // Create a 51-character tag with unicode characters
      const tooLongTag = '🚀'.repeat(26); // 26 * 2 = 52 chars, exceeds limit
      const tooLongTags = [tooLongTag];

      const result = validator.validateTags(tooLongTags);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('exceeds maximum length');
    });

    it('should handle mixed valid and invalid tags', () => {
      const mixedTags = [
        '🚀valid-emoji',
        'invalid tag with spaces',
        'français',
        'invalid@symbol',
        'VALID_UPPERCASE',
        '中文',
      ];

      const result = validator.validateTags(mixedTags);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2); // Two invalid tags

      // Check that the invalid tags are correctly identified
      const errorFields = result.errors.map(e => e.field);
      expect(errorFields).toContain('tags[1]'); // 'invalid tag with spaces'
      expect(errorFields).toContain('tags[3]'); // 'invalid@symbol'
    });
  });

  describe('Performance with Large Tag Sets', () => {
    it('should handle validation of many tags efficiently', () => {
      // Create 100 valid tags with various character types
      const manyTags = [];
      for (let i = 0; i < 100; i++) {
        manyTags.push(`tag${i}-🚀-français-中文`);
      }

      const startTime = Date.now();
      const result = validator.validateTags(manyTags);
      const endTime = Date.now();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});
