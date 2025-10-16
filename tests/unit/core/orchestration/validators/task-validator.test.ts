/**
 * Unit tests for TaskValidator
 * Tests comprehensive task data validation and business constraints
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { TaskValidator } from '../../../../../src/core/orchestration/validators/task-validator';
import { Priority } from '../../../../../src/domain/models/task';

describe('TaskValidator', () => {
  let validator: TaskValidator;

  beforeEach(() => {
    validator = new TaskValidator();
  });

  describe('validate', () => {
    it('should validate valid task data successfully', () => {
      const validTaskData = {
        title: 'Valid Task Title',
        description: 'Valid task description',
        priority: Priority.MEDIUM,
        estimatedDuration: 60,
        tags: ['valid-tag', 'another-tag'],
        agentPromptTemplate: 'Hello {{task.title}}',
      };

      const result = validator.validate(validTaskData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-object data', () => {
      const result = validator.validate('invalid data');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('data');
      expect(result.errors[0].message).toBe('Task data must be an object');
    });

    it('should require title field', () => {
      const taskData = {
        description: 'Task without title',
      };

      const result = validator.validate(taskData);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e => e.field === 'title' && e.message === 'title is required'
        )
      ).toBe(true);
    });

    it('should validate title length constraints', () => {
      const taskDataTooLong = {
        title: 'a'.repeat(1001), // Exceeds max length of 1000
      };

      const result = validator.validate(taskDataTooLong);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e =>
            e.field === 'title' && e.message.includes('exceeds maximum length')
        )
      ).toBe(true);
    });

    it('should validate description length constraints', () => {
      const taskData = {
        title: 'Valid Title',
        description: 'a'.repeat(5001), // Exceeds max length of 5000
      };

      const result = validator.validate(taskData);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e =>
            e.field === 'description' &&
            e.message.includes('exceeds maximum length')
        )
      ).toBe(true);
    });

    it('should validate agent prompt template length', () => {
      const taskData = {
        title: 'Valid Title',
        agentPromptTemplate: 'a'.repeat(10001), // Exceeds max length of 10000
      };

      const result = validator.validate(taskData);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e =>
            e.field === 'agentPromptTemplate' &&
            e.message.includes('exceeds maximum length')
        )
      ).toBe(true);
    });

    it('should skip validation for undefined optional fields', () => {
      const taskData = {
        title: 'Valid Title',
        // description, priority, etc. are undefined
      };

      const result = validator.validate(taskData);

      expect(result.isValid).toBe(true);
    });

    it('should validate blockReason field when present', () => {
      const taskDataWithBlockReason = {
        title: 'Valid Title',
        blockReason: {
          blockedBy: ['task-1', 'task-2'],
          details: [
            {
              taskId: 'task-1',
              taskTitle: 'Blocking Task 1',
              status: 'in_progress',
              estimatedCompletion: new Date(),
            },
            {
              taskId: 'task-2',
              taskTitle: 'Blocking Task 2',
              status: 'pending',
            },
          ],
        },
      };

      const result = validator.validate(taskDataWithBlockReason);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateTags', () => {
    it('should validate valid tags successfully', () => {
      const validTags = [
        'valid-tag',
        'another_tag',
        '🚀urgent',
        'HIGH-PRIORITY',
        'français',
      ];

      const result = validator.validateTags(validTags);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-array tags', () => {
      const result = validator.validateTags('not-an-array');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('tags');
      expect(result.errors[0].message).toBe('Tags must be an array');
    });

    it('should reject non-string tag elements', () => {
      const tagsWithNumber = ['valid-tag', 123, 'another-tag'];

      const result = validator.validateTags(tagsWithNumber);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e =>
            e.field === 'tags[1]' && e.message === 'Each tag must be a string'
        )
      ).toBe(true);
    });

    it('should reject empty tags', () => {
      const tagsWithEmpty = ['valid-tag', '', 'another-tag'];

      const result = validator.validateTags(tagsWithEmpty);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e => e.field === 'tags[1]' && e.message === 'Tags cannot be empty'
        )
      ).toBe(true);
    });

    it('should reject tags that are too long', () => {
      const longTag = 'a'.repeat(51); // Exceeds max length of 50
      const tagsWithLong = ['valid-tag', longTag];

      const result = validator.validateTags(tagsWithLong);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e =>
            e.field === 'tags[1]' &&
            e.message.includes('exceeds maximum length')
        )
      ).toBe(true);
    });

    it('should reject tags with invalid characters', () => {
      const invalidTags = ['valid-tag', 'invalid tag!', 'another@tag'];

      const result = validator.validateTags(invalidTags);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e =>
            e.field === 'tags[1]' &&
            e.message === 'Tag contains invalid characters'
        )
      ).toBe(true);
      expect(
        result.errors.some(
          e =>
            e.field === 'tags[2]' &&
            e.message === 'Tag contains invalid characters'
        )
      ).toBe(true);
    });

    it('should warn about duplicate tags', () => {
      const duplicateTags = ['tag1', 'tag2', 'tag1', 'tag3'];

      const result = validator.validateTags(duplicateTags);

      expect(result.isValid).toBe(true); // Still valid, just a warning
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].field).toBe('tags');
      expect(result.warnings[0].message).toBe(
        'Duplicate tags found. Remove duplicate tags to avoid confusion.'
      );
    });

    it('should accept emoji, unicode, and uppercase in tags', () => {
      const unicodeTags = [
        '🚀urgent',
        'HIGH-PRIORITY',
        'français',
        '中文',
        'العربية',
      ];

      const result = validator.validateTags(unicodeTags);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validatePriority', () => {
    it('should validate valid priority values', () => {
      for (let priority = 1; priority <= 5; priority++) {
        const result = validator['validatePriority'](priority);
        expect(result.isValid).toBe(true);
      }
    });

    it('should reject non-number priority', () => {
      const result = validator['validatePriority']('high');

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('Priority must be a number');
    });

    it('should reject non-integer priority', () => {
      const result = validator['validatePriority'](3.5);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('Priority must be an integer');
    });

    it('should reject priority out of range', () => {
      const resultTooLow = validator['validatePriority'](0);
      const resultTooHigh = validator['validatePriority'](6);

      expect(resultTooLow.isValid).toBe(false);
      expect(resultTooLow.errors[0].message).toContain('between 1 and 5');

      expect(resultTooHigh.isValid).toBe(false);
      expect(resultTooHigh.errors[0].message).toContain('between 1 and 5');
    });
  });

  describe('validateEstimatedDuration', () => {
    it('should validate positive duration', () => {
      const result = validator['validateEstimatedDuration'](60);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-number duration', () => {
      const result = validator['validateEstimatedDuration']('60 minutes');

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe(
        'Estimated duration must be a number'
      );
    });

    it('should reject negative or zero duration', () => {
      const resultZero = validator['validateEstimatedDuration'](0);
      const resultNegative = validator['validateEstimatedDuration'](-30);

      expect(resultZero.isValid).toBe(false);
      expect(resultZero.errors[0].message).toBe(
        'Estimated duration must be positive'
      );

      expect(resultNegative.isValid).toBe(false);
      expect(resultNegative.errors[0].message).toBe(
        'Estimated duration must be positive'
      );
    });

    it('should reject infinite duration', () => {
      const result = validator['validateEstimatedDuration'](Infinity);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe(
        'Estimated duration must be a finite number'
      );
    });
  });

  describe('validateBlockReason', () => {
    it('should validate valid blockReason successfully', () => {
      const validBlockReason = {
        blockedBy: ['task-1', 'task-2'],
        details: [
          {
            taskId: 'task-1',
            taskTitle: 'Blocking Task 1',
            status: 'in_progress',
            estimatedCompletion: new Date(),
          },
          {
            taskId: 'task-2',
            taskTitle: 'Blocking Task 2',
            status: 'pending',
          },
        ],
      };

      const result = validator['validateBlockReason'](validBlockReason);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-object blockReason', () => {
      const result = validator['validateBlockReason']('invalid');

      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('blockReason');
      expect(result.errors[0].message).toBe('blockReason must be an object');
    });

    it('should reject invalid blockedBy field', () => {
      const invalidBlockReason = {
        blockedBy: 'not-an-array',
        details: [],
      };

      const result = validator['validateBlockReason'](invalidBlockReason);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e =>
            e.field === 'blockReason.blockedBy' &&
            e.message === 'blockedBy must be an array of task IDs'
        )
      ).toBe(true);
    });

    it('should reject non-string task IDs in blockedBy', () => {
      const invalidBlockReason = {
        blockedBy: ['task-1', 123, 'task-3'],
        details: [],
      };

      const result = validator['validateBlockReason'](invalidBlockReason);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e =>
            e.field === 'blockReason.blockedBy[1]' &&
            e.message === 'Each blocked by task ID must be a string'
        )
      ).toBe(true);
    });

    it('should reject invalid details field', () => {
      const invalidBlockReason = {
        blockedBy: ['task-1'],
        details: 'not-an-array',
      };

      const result = validator['validateBlockReason'](invalidBlockReason);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e =>
            e.field === 'blockReason.details' &&
            e.message === 'details must be an array of task detail objects'
        )
      ).toBe(true);
    });

    it('should reject invalid detail objects', () => {
      const invalidBlockReason = {
        blockedBy: ['task-1'],
        details: [
          {
            taskId: 123, // Should be string
            taskTitle: 'Valid Title',
            status: 'pending',
          },
          {
            taskId: 'task-2',
            taskTitle: null, // Should be string
            status: 'in_progress',
          },
          {
            taskId: 'task-3',
            taskTitle: 'Valid Title',
            status: 123, // Should be string
          },
        ],
      };

      const result = validator['validateBlockReason'](invalidBlockReason);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e =>
            e.field === 'blockReason.details[0].taskId' &&
            e.message === 'taskId must be a string'
        )
      ).toBe(true);
      expect(
        result.errors.some(
          e =>
            e.field === 'blockReason.details[1].taskTitle' &&
            e.message === 'taskTitle must be a string'
        )
      ).toBe(true);
      expect(
        result.errors.some(
          e =>
            e.field === 'blockReason.details[2].status' &&
            e.message === 'status must be a string'
        )
      ).toBe(true);
    });

    it('should validate optional estimatedCompletion field', () => {
      const blockReasonWithValidDate = {
        blockedBy: ['task-1'],
        details: [
          {
            taskId: 'task-1',
            taskTitle: 'Blocking Task',
            status: 'in_progress',
            estimatedCompletion: new Date(),
          },
        ],
      };

      const blockReasonWithValidString = {
        blockedBy: ['task-1'],
        details: [
          {
            taskId: 'task-1',
            taskTitle: 'Blocking Task',
            status: 'in_progress',
            estimatedCompletion: '2024-01-01T00:00:00Z',
          },
        ],
      };

      const resultDate = validator['validateBlockReason'](
        blockReasonWithValidDate
      );
      const resultString = validator['validateBlockReason'](
        blockReasonWithValidString
      );

      expect(resultDate.isValid).toBe(true);
      expect(resultString.isValid).toBe(true);
    });

    it('should reject invalid estimatedCompletion field', () => {
      const invalidBlockReason = {
        blockedBy: ['task-1'],
        details: [
          {
            taskId: 'task-1',
            taskTitle: 'Blocking Task',
            status: 'in_progress',
            estimatedCompletion: 123, // Should be Date or string
          },
        ],
      };

      const result = validator['validateBlockReason'](invalidBlockReason);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          e =>
            e.field === 'blockReason.details[0].estimatedCompletion' &&
            e.message === 'estimatedCompletion must be a Date or ISO string'
        )
      ).toBe(true);
    });
  });
});
