/**
 * Unit tests for Task domain model
 * Tests task model structure, enums, and validation constants
 */

import { describe, it, expect } from 'vitest';

import {
  TaskStatus,
  Priority,
  VALID_TRANSITIONS,
  TAG_VALIDATION_PATTERN,
  TAG_MAX_LENGTH,
  PRIORITY_MIN,
  PRIORITY_MAX,
  AGENT_PROMPT_TEMPLATE_MAX_LENGTH,
} from '../../../../src/domain/models/task';

describe('Task Domain Model', () => {
  describe('TaskStatus enum', () => {
    it('should have correct status values', () => {
      expect(TaskStatus.PENDING).toBe('pending');
      expect(TaskStatus.IN_PROGRESS).toBe('in_progress');
      expect(TaskStatus.COMPLETED).toBe('completed');
      expect(TaskStatus.BLOCKED).toBe('blocked');
      expect(TaskStatus.CANCELLED).toBe('cancelled');
    });

    it('should have all expected status values', () => {
      const expectedStatuses = [
        'pending',
        'in_progress',
        'completed',
        'blocked',
        'cancelled',
      ];
      const actualStatuses = Object.values(TaskStatus);

      expect(actualStatuses).toEqual(expectedStatuses);
    });
  });

  describe('Priority enum', () => {
    it('should have correct priority values', () => {
      expect(Priority.MINIMAL).toBe(1);
      expect(Priority.LOW).toBe(2);
      expect(Priority.MEDIUM).toBe(3);
      expect(Priority.HIGH).toBe(4);
      expect(Priority.CRITICAL).toBe(5);
    });

    it('should have sequential priority values', () => {
      const priorities = Object.values(Priority).filter(
        v => typeof v === 'number'
      ) as number[];
      const sortedPriorities = [...priorities].sort((a, b) => a - b);

      expect(priorities).toEqual(sortedPriorities);
      expect(priorities).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('VALID_TRANSITIONS', () => {
    it('should allow valid transitions from PENDING', () => {
      const validTransitions = VALID_TRANSITIONS[TaskStatus.PENDING];

      expect(validTransitions).toContain(TaskStatus.IN_PROGRESS);
      expect(validTransitions).toContain(TaskStatus.CANCELLED);
      expect(validTransitions).not.toContain(TaskStatus.COMPLETED);
      expect(validTransitions).not.toContain(TaskStatus.BLOCKED);
    });

    it('should allow valid transitions from IN_PROGRESS', () => {
      const validTransitions = VALID_TRANSITIONS[TaskStatus.IN_PROGRESS];

      expect(validTransitions).toContain(TaskStatus.COMPLETED);
      expect(validTransitions).toContain(TaskStatus.BLOCKED);
      expect(validTransitions).toContain(TaskStatus.CANCELLED);
      expect(validTransitions).not.toContain(TaskStatus.PENDING);
    });

    it('should allow valid transitions from BLOCKED', () => {
      const validTransitions = VALID_TRANSITIONS[TaskStatus.BLOCKED];

      expect(validTransitions).toContain(TaskStatus.IN_PROGRESS);
      expect(validTransitions).toContain(TaskStatus.CANCELLED);
      expect(validTransitions).not.toContain(TaskStatus.COMPLETED);
      expect(validTransitions).not.toContain(TaskStatus.PENDING);
    });

    it('should not allow transitions from COMPLETED (terminal state)', () => {
      const validTransitions = VALID_TRANSITIONS[TaskStatus.COMPLETED];

      expect(validTransitions).toEqual([]);
    });

    it('should allow reactivation from CANCELLED', () => {
      const validTransitions = VALID_TRANSITIONS[TaskStatus.CANCELLED];

      expect(validTransitions).toContain(TaskStatus.PENDING);
      expect(validTransitions).not.toContain(TaskStatus.IN_PROGRESS);
      expect(validTransitions).not.toContain(TaskStatus.COMPLETED);
      expect(validTransitions).not.toContain(TaskStatus.BLOCKED);
    });

    it('should have transitions defined for all statuses', () => {
      const allStatuses = Object.values(TaskStatus);

      for (const status of allStatuses) {
        expect(VALID_TRANSITIONS).toHaveProperty(status);
        expect(Array.isArray(VALID_TRANSITIONS[status])).toBe(true);
      }
    });
  });

  describe('TAG_VALIDATION_PATTERN', () => {
    it('should accept valid tag formats', () => {
      const validTags = [
        'simple-tag',
        'another_tag',
        'CamelCase',
        'UPPERCASE',
        'numbers123',
        '🚀emoji',
        'français',
        '中文',
        'العربية',
        'tag-with-hyphens',
        'tag_with_underscores',
      ];

      for (const tag of validTags) {
        expect(TAG_VALIDATION_PATTERN.test(tag)).toBe(true);
      }
    });

    it('should reject invalid tag formats', () => {
      const invalidTags = [
        'tag with spaces',
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
      ];

      for (const tag of invalidTags) {
        expect(TAG_VALIDATION_PATTERN.test(tag)).toBe(false);
      }
    });
  });

  describe('Validation constants', () => {
    it('should have correct tag max length', () => {
      expect(TAG_MAX_LENGTH).toBe(50);
    });

    it('should have correct priority range', () => {
      expect(PRIORITY_MIN).toBe(1);
      expect(PRIORITY_MAX).toBe(5);
    });

    it('should have correct agent prompt template max length', () => {
      expect(AGENT_PROMPT_TEMPLATE_MAX_LENGTH).toBe(10000);
    });

    it('should have priority constants match enum values', () => {
      expect(PRIORITY_MIN).toBe(Priority.MINIMAL);
      expect(PRIORITY_MAX).toBe(Priority.CRITICAL);
    });
  });
});
