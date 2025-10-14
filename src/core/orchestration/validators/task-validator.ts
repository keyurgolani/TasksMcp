/**
 * Enhanced task validator for orchestration layer
 * Validates task data according to domain rules with detailed error messages
 */

import {
  TAG_VALIDATION_PATTERN,
  TAG_MAX_LENGTH,
} from '../../../domain/models/task.js';
import {
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../../../shared/types/validation.js';

export class TaskValidator {
  validate(data: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!data || typeof data !== 'object') {
      errors.push({
        field: 'data',
        message: 'Task data must be an object',
        currentValue: data,
        expectedValue: 'object',
        actionableGuidance: `Provide a valid task object with required fields. Current type: ${typeof data}`,
      });
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    const taskData = data as Record<string, unknown>;

    // Validate required title field
    if (!taskData['title']) {
      errors.push({
        field: 'title',
        message: 'title is required',
        currentValue: taskData['title'],
        expectedValue: 'non-empty string',
        actionableGuidance:
          'Provide a valid title value. This field cannot be empty or undefined.',
      });
    } else if (typeof taskData['title'] !== 'string') {
      errors.push({
        field: 'title',
        message: 'title must be a string',
        currentValue: taskData['title'],
        expectedValue: 'string',
        actionableGuidance: `Convert the title to a string. Current type: ${typeof taskData['title']}`,
      });
    } else if (taskData['title'].length > 1000) {
      const excess = taskData['title'].length - 1000;
      errors.push({
        field: 'title',
        message: `title exceeds maximum length (current: ${taskData['title'].length} characters, maximum: 1000 characters)`,
        currentValue: taskData['title'],
        expectedValue: 'string with max 1000 characters',
        actionableGuidance: `Reduce the title by ${excess} characters to meet the 1000 character limit. Consider using more concise language.`,
      });
    }

    // Validate description length
    if (
      taskData['description'] &&
      typeof taskData['description'] === 'string'
    ) {
      if (taskData['description'].length > 5000) {
        const excess = taskData['description'].length - 5000;
        errors.push({
          field: 'description',
          message: `description exceeds maximum length (current: ${taskData['description'].length} characters, maximum: 5000 characters)`,
          currentValue: taskData['description'],
          expectedValue: 'string with max 5000 characters',
          actionableGuidance: `Reduce the description by ${excess} characters to meet the 5000 character limit. Consider using more concise language or breaking into multiple sections.`,
        });
      }
    }

    // Validate agent prompt template length
    if (
      taskData['agentPromptTemplate'] &&
      typeof taskData['agentPromptTemplate'] === 'string'
    ) {
      if (taskData['agentPromptTemplate'].length > 10000) {
        const excess = taskData['agentPromptTemplate'].length - 10000;
        errors.push({
          field: 'agentPromptTemplate',
          message: `agentPromptTemplate exceeds maximum length (current: ${taskData['agentPromptTemplate'].length} characters, maximum: 10000 characters)`,
          currentValue: taskData['agentPromptTemplate'],
          expectedValue: 'string with max 10000 characters',
          actionableGuidance: `Reduce the agent prompt template by ${excess} characters to meet the 10000 character limit. Consider using more concise instructions or breaking into multiple templates.`,
        });
      }
    }

    // Validate tags if present
    if (taskData['tags']) {
      const tagValidation = this.validateTags(taskData['tags'] as string[]);
      errors.push(...tagValidation.errors);
      warnings.push(...tagValidation.warnings);
    }

    // Validate priority if present
    if (taskData['priority'] !== undefined) {
      const priorityValidation = this.validatePriority(taskData['priority']);
      errors.push(...priorityValidation.errors);
      warnings.push(...priorityValidation.warnings);
    }

    // Validate estimated duration if present
    if (taskData['estimatedDuration'] !== undefined) {
      const durationValidation = this.validateEstimatedDuration(
        taskData['estimatedDuration']
      );
      errors.push(...durationValidation.errors);
      warnings.push(...durationValidation.warnings);
    }

    // Validate blockReason if present
    if (taskData['blockReason'] !== undefined) {
      const blockReasonValidation = this.validateBlockReason(
        taskData['blockReason']
      );
      errors.push(...blockReasonValidation.errors);
      warnings.push(...blockReasonValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  validateTags(tags: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!Array.isArray(tags)) {
      errors.push({
        field: 'tags',
        message: 'Tags must be an array',
        currentValue: tags,
        expectedValue: 'array of strings',
        actionableGuidance: `Provide an array of tag strings. Current type: ${typeof tags}`,
      });
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];

      if (typeof tag !== 'string') {
        errors.push({
          field: `tags[${i}]`,
          message: 'Each tag must be a string',
          currentValue: tag,
          expectedValue: 'string',
          actionableGuidance: `Ensure all tags are string values. Tag at index ${i} is ${typeof tag}.`,
        });
        continue;
      }

      if (tag.trim() === '') {
        errors.push({
          field: `tags[${i}]`,
          message: 'Tags cannot be empty',
          currentValue: tag,
          expectedValue: 'non-empty string',
          actionableGuidance:
            'Provide non-empty tag values. Remove empty tags from the array.',
        });
        continue;
      }

      if (tag.length > TAG_MAX_LENGTH) {
        const excess = tag.length - TAG_MAX_LENGTH;
        errors.push({
          field: `tags[${i}]`,
          message: `Tag exceeds maximum length (current: ${tag.length} characters, maximum: ${TAG_MAX_LENGTH} characters)`,
          currentValue: tag,
          expectedValue: `string with max ${TAG_MAX_LENGTH} characters`,
          actionableGuidance: `Shorten the tag by ${excess} characters to meet the ${TAG_MAX_LENGTH} character limit.`,
        });
        continue;
      }

      // Validate tag format using modern character support pattern
      if (!TAG_VALIDATION_PATTERN.test(tag)) {
        errors.push({
          field: `tags[${i}]`,
          message: 'Tag contains invalid characters',
          currentValue: tag,
          expectedValue:
            'string with letters, numbers, emoji, hyphens, or underscores only',
          actionableGuidance: `Tag "${tag}" contains invalid characters. Use only letters (including unicode), numbers, emoji, hyphens (-), and underscores (_). Spaces and special characters like @!<>:"|?* are not allowed. Consider replacing spaces with hyphens or underscores.`,
        });
      }
    }

    // Check for duplicates
    const uniqueTags = new Set(tags);
    if (uniqueTags.size !== tags.length) {
      warnings.push({
        field: 'tags',
        message: 'Duplicate tags found',
        suggestion: 'Remove duplicate tags for better organization',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validatePriority(priority: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (typeof priority !== 'number') {
      errors.push({
        field: 'priority',
        message: 'Priority must be a number',
        currentValue: priority,
        expectedValue: 'number between 1 and 5',
        actionableGuidance: `Provide a numeric priority value between 1 (minimal) and 5 (critical/urgent). Current type: ${typeof priority}`,
      });
      return { isValid: false, errors, warnings };
    }

    if (!Number.isInteger(priority)) {
      errors.push({
        field: 'priority',
        message: 'Priority must be an integer',
        currentValue: priority,
        expectedValue: 'integer between 1 and 5',
        actionableGuidance: `Round the priority value to the nearest integer. Current value ${priority} should be rounded to ${Math.round(priority)}.`,
      });
      return { isValid: false, errors, warnings };
    }

    if (priority < 1 || priority > 5) {
      errors.push({
        field: 'priority',
        message: `Priority must be between 1 and 5 (current: ${priority})`,
        currentValue: priority,
        expectedValue: 'integer between 1 and 5',
        actionableGuidance:
          'Set priority to: 1 (minimal), 2 (low), 3 (medium), 4 (high), or 5 (critical/urgent)',
      });
      return { isValid: false, errors, warnings };
    }

    return {
      isValid: true,
      errors,
      warnings,
    };
  }

  private validateEstimatedDuration(duration: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (typeof duration !== 'number') {
      errors.push({
        field: 'estimatedDuration',
        message: 'Estimated duration must be a number',
        currentValue: duration,
        expectedValue: 'positive number (minutes)',
        actionableGuidance: `Provide a numeric duration in minutes (e.g., 30 for 30 minutes, 120 for 2 hours). Current type: ${typeof duration}`,
      });
      return { isValid: false, errors, warnings };
    }

    if (duration <= 0) {
      errors.push({
        field: 'estimatedDuration',
        message: 'Estimated duration must be positive',
        currentValue: duration,
        expectedValue: 'positive number (minutes)',
        actionableGuidance: `Duration must be greater than 0. Current value ${duration} is ${duration === 0 ? 'zero' : 'negative'}. Provide a positive duration in minutes.`,
      });
      return { isValid: false, errors, warnings };
    }

    if (!isFinite(duration)) {
      errors.push({
        field: 'estimatedDuration',
        message: 'Estimated duration must be a finite number',
        currentValue: duration,
        expectedValue: 'finite positive number (minutes)',
        actionableGuidance: `Duration cannot be infinite or NaN. Current value is ${duration}. Provide a realistic duration estimate in minutes.`,
      });
      return { isValid: false, errors, warnings };
    }

    // Add helpful warnings for unusual durations
    if (duration > 10080) {
      // More than a week (7 * 24 * 60)
      warnings.push({
        field: 'estimatedDuration',
        message: 'Duration is unusually long (more than a week)',
        suggestion:
          'Consider breaking this task into smaller subtasks for better management',
      });
    } else if (duration < 1) {
      warnings.push({
        field: 'estimatedDuration',
        message: 'Duration is very short (less than 1 minute)',
        suggestion:
          'Consider if this task needs an estimated duration or if it can be combined with other tasks',
      });
    }

    return {
      isValid: true,
      errors,
      warnings,
    };
  }

  private validateBlockReason(blockReason: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!blockReason || typeof blockReason !== 'object') {
      errors.push({
        field: 'blockReason',
        message: 'blockReason must be an object',
        currentValue: blockReason,
        expectedValue: 'BlockReason object',
        actionableGuidance:
          'Provide a valid BlockReason object with blockedBy and details fields',
      });
      return { isValid: false, errors, warnings };
    }

    const blockReasonData = blockReason as Record<string, unknown>;

    // Validate blockedBy field
    if (!Array.isArray(blockReasonData['blockedBy'])) {
      errors.push({
        field: 'blockReason.blockedBy',
        message: 'blockedBy must be an array of task IDs',
        currentValue: blockReasonData['blockedBy'],
        expectedValue: 'array of strings',
        actionableGuidance:
          'Provide an array of task ID strings that are blocking this task',
      });
    } else {
      const blockedBy = blockReasonData['blockedBy'] as unknown[];
      for (let i = 0; i < blockedBy.length; i++) {
        if (typeof blockedBy[i] !== 'string') {
          errors.push({
            field: `blockReason.blockedBy[${i}]`,
            message: 'Each blocked by task ID must be a string',
            currentValue: blockedBy[i],
            expectedValue: 'string',
            actionableGuidance:
              'Ensure all task IDs in blockedBy are string values',
          });
        }
      }
    }

    // Validate details field
    if (!Array.isArray(blockReasonData['details'])) {
      errors.push({
        field: 'blockReason.details',
        message: 'details must be an array of task detail objects',
        currentValue: blockReasonData['details'],
        expectedValue: 'array of task detail objects',
        actionableGuidance:
          'Provide an array of objects with taskId, taskTitle, and status fields',
      });
    } else {
      const details = blockReasonData['details'] as unknown[];
      for (let i = 0; i < details.length; i++) {
        const detail = details[i];
        if (!detail || typeof detail !== 'object') {
          errors.push({
            field: `blockReason.details[${i}]`,
            message: 'Each detail must be an object',
            currentValue: detail,
            expectedValue: 'object with taskId, taskTitle, and status',
            actionableGuidance:
              'Provide objects with taskId, taskTitle, and status fields',
          });
          continue;
        }

        const detailData = detail as Record<string, unknown>;

        // Validate taskId
        if (typeof detailData['taskId'] !== 'string') {
          errors.push({
            field: `blockReason.details[${i}].taskId`,
            message: 'taskId must be a string',
            currentValue: detailData['taskId'],
            expectedValue: 'string',
            actionableGuidance: 'Provide a valid task ID string',
          });
        }

        // Validate taskTitle
        if (typeof detailData['taskTitle'] !== 'string') {
          errors.push({
            field: `blockReason.details[${i}].taskTitle`,
            message: 'taskTitle must be a string',
            currentValue: detailData['taskTitle'],
            expectedValue: 'string',
            actionableGuidance: 'Provide a valid task title string',
          });
        }

        // Validate status
        if (typeof detailData['status'] !== 'string') {
          errors.push({
            field: `blockReason.details[${i}].status`,
            message: 'status must be a string',
            currentValue: detailData['status'],
            expectedValue: 'TaskStatus string',
            actionableGuidance:
              'Provide a valid TaskStatus value (pending, in_progress, completed, blocked, cancelled)',
          });
        }

        // Validate estimatedCompletion if present
        if (detailData['estimatedCompletion'] !== undefined) {
          if (
            !(detailData['estimatedCompletion'] instanceof Date) &&
            typeof detailData['estimatedCompletion'] !== 'string'
          ) {
            errors.push({
              field: `blockReason.details[${i}].estimatedCompletion`,
              message: 'estimatedCompletion must be a Date or ISO string',
              currentValue: detailData['estimatedCompletion'],
              expectedValue: 'Date object or ISO date string',
              actionableGuidance:
                'Provide a valid Date object or ISO date string',
            });
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
