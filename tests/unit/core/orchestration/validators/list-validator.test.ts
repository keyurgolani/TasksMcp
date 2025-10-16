/**
 * Unit tests for ListValidator
 * Tests comprehensive task list data validation and business constraints
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { ListValidator } from '../../../../../src/core/orchestration/validators/list-validator';

describe('ListValidator', () => {
  let validator: ListValidator;

  beforeEach(() => {
    validator = new ListValidator();
  });

  describe('validate', () => {
    it('should validate valid list data successfully', () => {
      const validListData = {
        title: 'Valid List Title',
        description: 'Valid list description',
        projectTag: 'valid-project',
      };

      const result = validator.validate(validListData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-object data', () => {
      const result = validator.validate('invalid data');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('data');
      expect(result.errors[0].message).toBe('List data must be an object');
    });

    it('should require title field', () => {
      const listData = {
        description: 'List without title',
      };

      const result = validator.validate(listData);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e => e.field === 'title' && e.message === 'title is required'
        )
      ).toBe(true);
    });

    it('should validate title length constraints', () => {
      const listDataTooLong = {
        title: 'a'.repeat(1001), // Exceeds max length of 1000
      };

      const result = validator.validate(listDataTooLong);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e =>
            e.field === 'title' && e.message.includes('at most 1000 characters')
        )
      ).toBe(true);
    });

    it('should validate description length constraints', () => {
      const listData = {
        title: 'Valid Title',
        description: 'a'.repeat(5001), // Exceeds max length of 5000
      };

      const result = validator.validate(listData);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e =>
            e.field === 'description' &&
            e.message.includes('at most 5000 characters')
        )
      ).toBe(true);
    });

    it('should validate project tag length constraints', () => {
      const listData = {
        title: 'Valid Title',
        projectTag: 'a'.repeat(251), // Exceeds max length of 250
      };

      const result = validator.validate(listData);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e =>
            e.field === 'projectTag' &&
            e.message.includes('at most 250 characters')
        )
      ).toBe(true);
    });

    it('should validate project tag pattern', () => {
      const listData = {
        title: 'Valid Title',
        projectTag: 'Invalid Project Tag!', // Contains invalid characters
      };

      const result = validator.validate(listData);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e =>
            e.field === 'projectTag' &&
            e.message === 'projectTag format is invalid'
        )
      ).toBe(true);
    });

    it('should accept valid project tag formats', () => {
      const validProjectTags = [
        'web-app',
        'mobile-project',
        'api-server-v2',
        'simple',
        'complex-feature-123',
      ];

      for (const projectTag of validProjectTags) {
        const listData = {
          title: 'Valid Title',
          projectTag,
        };

        const result = validator.validate(listData);

        expect(result.isValid).toBe(true);
      }
    });

    it('should reject invalid project tag formats', () => {
      const invalidProjectTags = [
        'Web-App', // uppercase
        'mobile_project', // underscore
        'api server', // space
        'user@auth', // special character
        'data.migration', // dot
      ];

      for (const projectTag of invalidProjectTags) {
        const listData = {
          title: 'Valid Title',
          projectTag,
        };

        const result = validator.validate(listData);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'projectTag')).toBe(true);
      }
    });

    it('should skip validation for undefined optional fields', () => {
      const listData = {
        title: 'Valid Title',
        // description, projectTag are undefined
      };

      const result = validator.validate(listData);

      expect(result.isValid).toBe(true);
    });

    it('should provide helpful guidance for project tag validation', () => {
      const listData = {
        title: 'Valid Title',
        projectTag: 'Invalid_Tag',
      };

      const result = validator.validate(listData);

      expect(result.isValid).toBe(false);
      const projectTagError = result.errors.find(e => e.field === 'projectTag');
      expect(projectTagError?.actionableGuidance).toContain(
        'lowercase letters, numbers, and hyphens only'
      );
    });
  });
});
