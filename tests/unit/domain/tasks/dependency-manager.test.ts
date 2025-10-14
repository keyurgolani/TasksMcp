/**
 * Unit tests for DependencyResolver
 * Tests dependency resolution, validation, and block reason calculation
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { Task, TaskStatus, Priority } from '../../../../src/domain/models/task';
import { DependencyResolver } from '../../../../src/domain/tasks/dependency-manager';

describe('DependencyResolver', () => {
  let dependencyResolver: DependencyResolver;

  const createMockTask = (
    id: string,
    title: string,
    status: TaskStatus = TaskStatus.PENDING,
    dependencies: string[] = [],
    estimatedDuration?: number
  ): Task => ({
    id,
    listId: 'test-list',
    title,
    description: `Description for ${title}`,
    status,
    priority: Priority.MEDIUM,
    createdAt: new Date(),
    updatedAt: new Date(),
    dependencies,
    estimatedDuration,
    tags: [],
    metadata: {},
    implementationNotes: [],
    exitCriteria: [],
  });

  beforeEach(() => {
    dependencyResolver = new DependencyResolver();
  });

  describe('calculateBlockReason', () => {
    it('should return undefined for task with no dependencies', () => {
      const tasks = [createMockTask('task-1', 'Task 1')];

      const result = dependencyResolver.calculateBlockReason('task-1', tasks);

      expect(result).toBeUndefined();
    });

    it('should return undefined for completed task', () => {
      const tasks = [
        createMockTask('task-1', 'Task 1', TaskStatus.COMPLETED, ['task-2']),
        createMockTask('task-2', 'Task 2', TaskStatus.PENDING),
      ];

      const result = dependencyResolver.calculateBlockReason('task-1', tasks);

      expect(result).toBeUndefined();
    });

    it('should return undefined when all dependencies are completed', () => {
      const tasks = [
        createMockTask('task-1', 'Task 1', TaskStatus.PENDING, [
          'task-2',
          'task-3',
        ]),
        createMockTask('task-2', 'Task 2', TaskStatus.COMPLETED),
        createMockTask('task-3', 'Task 3', TaskStatus.COMPLETED),
      ];

      const result = dependencyResolver.calculateBlockReason('task-1', tasks);

      expect(result).toBeUndefined();
    });

    it('should return block reason when dependencies are incomplete', () => {
      const tasks = [
        createMockTask('task-1', 'Task 1', TaskStatus.PENDING, [
          'task-2',
          'task-3',
        ]),
        createMockTask('task-2', 'Task 2', TaskStatus.IN_PROGRESS, [], 60),
        createMockTask('task-3', 'Task 3', TaskStatus.PENDING),
      ];

      const result = dependencyResolver.calculateBlockReason('task-1', tasks);

      expect(result).toBeDefined();
      expect(result!.blockedBy).toEqual(['task-2', 'task-3']);
      expect(result!.details).toHaveLength(2);

      expect(result!.details[0]).toEqual({
        taskId: 'task-2',
        taskTitle: 'Task 2',
        status: TaskStatus.IN_PROGRESS,
        estimatedCompletion: expect.any(Date),
      });

      expect(result!.details[1]).toEqual({
        taskId: 'task-3',
        taskTitle: 'Task 3',
        status: TaskStatus.PENDING,
        estimatedCompletion: undefined,
      });
    });

    it('should calculate estimated completion based on estimated duration', () => {
      const tasks = [
        createMockTask('task-1', 'Task 1', TaskStatus.PENDING, ['task-2']),
        createMockTask('task-2', 'Task 2', TaskStatus.IN_PROGRESS, [], 120), // 2 hours
      ];

      const beforeCalculation = Date.now();
      const result = dependencyResolver.calculateBlockReason('task-1', tasks);
      const afterCalculation = Date.now();

      expect(result).toBeDefined();
      expect(result!.details[0].estimatedCompletion).toBeDefined();

      const estimatedTime = result!.details[0].estimatedCompletion!.getTime();
      const expectedMinTime = beforeCalculation + 120 * 60 * 1000; // 120 minutes in ms
      const expectedMaxTime = afterCalculation + 120 * 60 * 1000;

      expect(estimatedTime).toBeGreaterThanOrEqual(expectedMinTime);
      expect(estimatedTime).toBeLessThanOrEqual(expectedMaxTime);
    });

    it('should handle mixed dependency statuses', () => {
      const tasks = [
        createMockTask('task-1', 'Task 1', TaskStatus.PENDING, [
          'task-2',
          'task-3',
          'task-4',
        ]),
        createMockTask('task-2', 'Task 2', TaskStatus.COMPLETED),
        createMockTask('task-3', 'Task 3', TaskStatus.IN_PROGRESS),
        createMockTask('task-4', 'Task 4', TaskStatus.BLOCKED),
      ];

      const result = dependencyResolver.calculateBlockReason('task-1', tasks);

      expect(result).toBeDefined();
      expect(result!.blockedBy).toEqual(['task-3', 'task-4']);
      expect(result!.details).toHaveLength(2);

      expect(result!.details.find(d => d.taskId === 'task-3')).toBeDefined();
      expect(result!.details.find(d => d.taskId === 'task-4')).toBeDefined();
      expect(result!.details.find(d => d.taskId === 'task-2')).toBeUndefined();
    });

    it('should return undefined for non-existent task', () => {
      const tasks = [createMockTask('task-1', 'Task 1')];

      const result = dependencyResolver.calculateBlockReason(
        'non-existent',
        tasks
      );

      expect(result).toBeUndefined();
    });

    it('should handle dependencies that do not exist in task list', () => {
      const tasks = [
        createMockTask('task-1', 'Task 1', TaskStatus.PENDING, [
          'task-2',
          'non-existent',
        ]),
        createMockTask('task-2', 'Task 2', TaskStatus.IN_PROGRESS),
      ];

      const result = dependencyResolver.calculateBlockReason('task-1', tasks);

      expect(result).toBeDefined();
      expect(result!.blockedBy).toEqual(['task-2']);
      expect(result!.details).toHaveLength(1);
      expect(result!.details[0].taskId).toBe('task-2');
    });

    it('should handle errors gracefully', () => {
      // Pass invalid data to trigger error
      const result = dependencyResolver.calculateBlockReason(
        'task-1',
        null as any
      );

      expect(result).toBeUndefined();
    });
  });

  describe('validateDependencies', () => {
    it('should validate dependencies successfully', () => {
      const tasks = [
        createMockTask('task-1', 'Task 1'),
        createMockTask('task-2', 'Task 2'),
        createMockTask('task-3', 'Task 3'),
      ];

      const result = dependencyResolver.validateDependencies(
        'task-1',
        ['task-2', 'task-3'],
        tasks
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid dependencies', () => {
      const tasks = [
        createMockTask('task-1', 'Task 1'),
        createMockTask('task-2', 'Task 2'),
      ];

      const result = dependencyResolver.validateDependencies(
        'task-1',
        ['task-2', 'non-existent'],
        tasks
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Invalid dependencies: non-existent do not exist'
      );
    });

    it('should detect self-dependency', () => {
      const tasks = [createMockTask('task-1', 'Task 1')];

      const result = dependencyResolver.validateDependencies(
        'task-1',
        ['task-1'],
        tasks
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item cannot depend on itself');
    });

    it('should detect circular dependencies', () => {
      const tasks = [
        createMockTask('task-1', 'Task 1', TaskStatus.PENDING, ['task-2']),
        createMockTask('task-2', 'Task 2', TaskStatus.PENDING, ['task-3']),
        createMockTask('task-3', 'Task 3', TaskStatus.PENDING, ['task-1']),
      ];

      const result = dependencyResolver.validateDependencies(
        'task-1',
        ['task-2'],
        tasks
      );

      expect(result.isValid).toBe(false);
      expect(result.circularDependencies.length).toBeGreaterThan(0);
      expect(
        result.errors.some(e => e.includes('Circular dependencies detected'))
      ).toBe(true);
    });

    it('should warn about dependencies on completed items', () => {
      const tasks = [
        createMockTask('task-1', 'Task 1'),
        createMockTask('task-2', 'Task 2', TaskStatus.COMPLETED),
      ];

      const result = dependencyResolver.validateDependencies(
        'task-1',
        ['task-2'],
        tasks
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Dependencies on completed items: Task 2'
      );
    });
  });

  describe('getReadyItems', () => {
    it('should return tasks with no dependencies', () => {
      const tasks = [
        createMockTask('task-1', 'Task 1'),
        createMockTask('task-2', 'Task 2'),
        createMockTask('task-3', 'Task 3', TaskStatus.COMPLETED),
      ];

      const result = dependencyResolver.getReadyItems(tasks);

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['task-1', 'task-2']);
    });

    it('should return tasks with completed dependencies', () => {
      const tasks = [
        createMockTask('task-1', 'Task 1', TaskStatus.PENDING, ['task-2']),
        createMockTask('task-2', 'Task 2', TaskStatus.COMPLETED),
        createMockTask('task-3', 'Task 3', TaskStatus.PENDING, ['task-4']),
        createMockTask('task-4', 'Task 4', TaskStatus.PENDING),
      ];

      const result = dependencyResolver.getReadyItems(tasks);

      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['task-1', 'task-4']);
    });

    it('should exclude completed and blocked tasks', () => {
      const tasks = [
        createMockTask('task-1', 'Task 1', TaskStatus.COMPLETED),
        createMockTask('task-2', 'Task 2', TaskStatus.BLOCKED),
        createMockTask('task-3', 'Task 3', TaskStatus.PENDING),
      ];

      const result = dependencyResolver.getReadyItems(tasks);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task-3');
    });
  });

  describe('getBlockedItems', () => {
    it('should return tasks with incomplete dependencies', () => {
      const tasks = [
        createMockTask('task-1', 'Task 1', TaskStatus.PENDING, ['task-2']),
        createMockTask('task-2', 'Task 2', TaskStatus.PENDING),
        createMockTask('task-3', 'Task 3', TaskStatus.PENDING),
      ];

      const result = dependencyResolver.getBlockedItems(tasks);

      expect(result).toHaveLength(1);
      expect(result[0].item.id).toBe('task-1');
      expect(result[0].blockedBy).toHaveLength(1);
      expect(result[0].blockedBy[0].id).toBe('task-2');
    });

    it('should exclude completed tasks from blocked items', () => {
      const tasks = [
        createMockTask('task-1', 'Task 1', TaskStatus.COMPLETED, ['task-2']),
        createMockTask('task-2', 'Task 2', TaskStatus.PENDING),
      ];

      const result = dependencyResolver.getBlockedItems(tasks);

      expect(result).toHaveLength(0);
    });
  });
});
