/**
 * Unit tests for orchestration error classes
 * Tests comprehensive error handling with context and actionable guidance
 */

import { describe, it, expect } from 'vitest';

import { TaskStatus } from '../../../../src/domain/models/task';
import {
  OrchestrationError,
  ValidationError,
  CircularDependencyError,
  StatusTransitionError,
  TemplateRenderError,
  TaskNotFoundError,
  ListNotFoundError,
} from '../../../../src/shared/errors/orchestration-error';

describe('Orchestration Error Classes', () => {
  describe('OrchestrationError', () => {
    it('should create error with all properties', () => {
      const error = new OrchestrationError(
        'Test error message',
        'Test Context',
        'current value',
        'expected value',
        'actionable guidance'
      );

      expect(error.message).toBe('Test error message');
      expect(error.context).toBe('Test Context');
      expect(error.currentValue).toBe('current value');
      expect(error.expectedValue).toBe('expected value');
      expect(error.actionableGuidance).toBe('actionable guidance');
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe('OrchestrationError');
    });

    it('should create error with minimal properties', () => {
      const error = new OrchestrationError('Test error', 'Test Context');

      expect(error.message).toBe('Test error');
      expect(error.context).toBe('Test Context');
      expect(error.currentValue).toBeUndefined();
      expect(error.expectedValue).toBeUndefined();
      expect(error.actionableGuidance).toBeUndefined();
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should serialize to JSON correctly', () => {
      const error = new OrchestrationError(
        'Test error',
        'Test Context',
        'current',
        'expected',
        'guidance'
      );

      const json = error.toJSON();

      expect(json.name).toBe('OrchestrationError');
      expect(json.message).toBe('Test error');
      expect(json.context).toBe('Test Context');
      expect(json.currentValue).toBe('current');
      expect(json.expectedValue).toBe('expected');
      expect(json.actionableGuidance).toBe('guidance');
      expect(json.timestamp).toBeInstanceOf(Date);
      expect(json.stack).toBeDefined();
    });
  });

  describe('ValidationError', () => {
    it('should extend OrchestrationError', () => {
      const error = new ValidationError(
        'Validation failed',
        'Field Validation',
        'invalid value',
        'valid value',
        'Fix the value'
      );

      expect(error).toBeInstanceOf(OrchestrationError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.context).toBe('Field Validation');
      expect(error.currentValue).toBe('invalid value');
      expect(error.expectedValue).toBe('valid value');
      expect(error.actionableGuidance).toBe('Fix the value');
    });
  });

  describe('CircularDependencyError', () => {
    it('should create error with dependency cycle information', () => {
      const dependencyCycle = ['task1', 'task2', 'task3', 'task1'];
      const error = new CircularDependencyError(
        'Circular dependency detected',
        dependencyCycle,
        'Remove one of the dependencies to break the cycle'
      );

      expect(error).toBeInstanceOf(OrchestrationError);
      expect(error.name).toBe('CircularDependencyError');
      expect(error.message).toBe('Circular dependency detected');
      expect(error.context).toBe('Dependency Management');
      expect(error.dependencyCycle).toEqual(dependencyCycle);
      expect(error.currentValue).toEqual(dependencyCycle);
      expect(error.actionableGuidance).toBe(
        'Remove one of the dependencies to break the cycle'
      );
    });
  });

  describe('StatusTransitionError', () => {
    it('should create error with status transition information', () => {
      const currentStatus = TaskStatus.COMPLETED;
      const targetStatus = TaskStatus.IN_PROGRESS;
      const validTransitions = []; // No valid transitions from completed

      const error = new StatusTransitionError(
        'Invalid status transition',
        currentStatus,
        targetStatus,
        validTransitions
      );

      expect(error).toBeInstanceOf(OrchestrationError);
      expect(error.name).toBe('StatusTransitionError');
      expect(error.message).toBe('Invalid status transition');
      expect(error.context).toBe('Task Status Management');
      expect(error.currentStatus).toBe(currentStatus);
      expect(error.targetStatus).toBe(targetStatus);
      expect(error.validTransitions).toEqual(validTransitions);
      expect(error.currentValue).toBe(currentStatus);
      expect(error.expectedValue).toEqual(validTransitions);
      expect(error.actionableGuidance).toContain(
        'Valid transitions from completed:'
      );
    });

    it('should handle valid transitions in guidance', () => {
      const validTransitions = [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED];
      const error = new StatusTransitionError(
        'Invalid transition',
        TaskStatus.PENDING,
        TaskStatus.COMPLETED,
        validTransitions
      );

      expect(error.actionableGuidance).toContain('in_progress, cancelled');
    });
  });

  describe('TemplateRenderError', () => {
    it('should create error with template information', () => {
      const template = '{{task.title}} - {{invalid.variable}}';
      const renderTime = 25;
      const error = new TemplateRenderError(
        'Template rendering failed',
        template,
        renderTime,
        'Check variable names and syntax'
      );

      expect(error).toBeInstanceOf(OrchestrationError);
      expect(error.name).toBe('TemplateRenderError');
      expect(error.message).toBe('Template rendering failed');
      expect(error.context).toBe('Template Rendering');
      expect(error.template).toBe(template);
      expect(error.renderTime).toBe(renderTime);
      expect(error.currentValue).toBe(template);
      expect(error.actionableGuidance).toBe('Check variable names and syntax');
    });

    it('should work without render time', () => {
      const template = '{{invalid.template}}';
      const error = new TemplateRenderError(
        'Template error',
        template,
        undefined,
        'Fix template syntax'
      );

      expect(error.template).toBe(template);
      expect(error.renderTime).toBeUndefined();
    });
  });

  describe('TaskNotFoundError', () => {
    it('should create error with task ID information', () => {
      const taskId = 'non-existent-task-id';
      const error = new TaskNotFoundError(taskId);

      expect(error).toBeInstanceOf(OrchestrationError);
      expect(error.name).toBe('TaskNotFoundError');
      expect(error.message).toBe(`Task not found: ${taskId}`);
      expect(error.context).toBe('Task Management');
      expect(error.currentValue).toBe(taskId);
      expect(error.expectedValue).toBe('Valid task ID');
      expect(error.actionableGuidance).toBe(
        'Ensure the task ID exists and is accessible'
      );
    });
  });

  describe('ListNotFoundError', () => {
    it('should create error with list ID information', () => {
      const listId = 'non-existent-list-id';
      const error = new ListNotFoundError(listId);

      expect(error).toBeInstanceOf(OrchestrationError);
      expect(error.name).toBe('ListNotFoundError');
      expect(error.message).toBe(`List not found: ${listId}`);
      expect(error.context).toBe('List Management');
      expect(error.currentValue).toBe(listId);
      expect(error.expectedValue).toBe('Valid list ID');
      expect(error.actionableGuidance).toBe(
        'Ensure the list ID exists and is accessible'
      );
    });
  });

  describe('Error inheritance', () => {
    it('should maintain Error prototype chain', () => {
      const errors = [
        new OrchestrationError('test', 'context'),
        new ValidationError('test', 'context'),
        new CircularDependencyError('test', []),
        new StatusTransitionError('test', 'current', 'target', []),
        new TemplateRenderError('test', 'template'),
        new TaskNotFoundError('task-id'),
        new ListNotFoundError('list-id'),
      ];

      for (const error of errors) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(OrchestrationError);
        expect(error.stack).toBeDefined();
      }
    });
  });
});
