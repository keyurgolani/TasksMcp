/**
 * Unit tests for TaskList domain model
 * Tests task list model structure and validation constants
 */

import { describe, it, expect } from 'vitest';

import {
  TASK_LIST_TITLE_MAX_LENGTH,
  TASK_LIST_DESCRIPTION_MAX_LENGTH,
  PROJECT_TAG_MAX_LENGTH,
  PROJECT_TAG_PATTERN,
} from '../../../../src/domain/models/task-list';

describe('TaskList Domain Model', () => {
  describe('Validation constants', () => {
    it('should have correct title max length', () => {
      expect(TASK_LIST_TITLE_MAX_LENGTH).toBe(1000);
    });

    it('should have correct description max length', () => {
      expect(TASK_LIST_DESCRIPTION_MAX_LENGTH).toBe(5000);
    });

    it('should have correct project tag max length', () => {
      expect(PROJECT_TAG_MAX_LENGTH).toBe(250);
    });
  });

  describe('PROJECT_TAG_PATTERN', () => {
    it('should accept valid project tag formats', () => {
      const validProjectTags = [
        'web-app',
        'mobile-project',
        'api-server',
        'user-auth',
        'data-migration',
        'simple',
        'complex-feature-123',
        'v2-upgrade',
      ];

      for (const tag of validProjectTags) {
        expect(PROJECT_TAG_PATTERN.test(tag)).toBe(true);
      }
    });

    it('should reject invalid project tag formats', () => {
      const invalidProjectTags = [
        'Web-App', // uppercase
        'mobile_project', // underscore
        'api server', // space
        'user@auth', // special character
        'data.migration', // dot
        'feature!', // exclamation
        'project/name', // slash
        'tag(1)', // parentheses
        '', // empty string
      ];

      for (const tag of invalidProjectTags) {
        expect(PROJECT_TAG_PATTERN.test(tag)).toBe(false);
      }
    });

    it('should accept numbers in project tags', () => {
      const tagsWithNumbers = [
        'project-v1',
        'api-v2-server',
        'migration-2024',
        'feature-123',
        '2024-project',
      ];

      for (const tag of tagsWithNumbers) {
        expect(PROJECT_TAG_PATTERN.test(tag)).toBe(true);
      }
    });

    it('should require lowercase letters', () => {
      expect(PROJECT_TAG_PATTERN.test('lowercase-only')).toBe(true);
      expect(PROJECT_TAG_PATTERN.test('UPPERCASE-NOT-ALLOWED')).toBe(false);
      expect(PROJECT_TAG_PATTERN.test('Mixed-Case')).toBe(false);
    });

    it('should allow hyphens but not other separators', () => {
      expect(PROJECT_TAG_PATTERN.test('with-hyphens')).toBe(true);
      expect(PROJECT_TAG_PATTERN.test('with_underscores')).toBe(false);
      expect(PROJECT_TAG_PATTERN.test('with.dots')).toBe(false);
      expect(PROJECT_TAG_PATTERN.test('with spaces')).toBe(false);
    });
  });
});
