/**
 * Tests for dependency validation utilities
 */

import { describe, it, expect } from 'vitest';

import {
  TaskStatus,
  Priority,
  type Task,
} from '../../../../src/shared/types/task.js';
import {
  validateDependencyIds,
  validateTaskDependencies,
  detectCircularDependencies,
  createDependencyErrorResponse,
  formatDependencyValidationError,
  deduplicateDependencies,
  DependencyIdsSchema,
  TaskIdSchema,
  ListIdSchema,
} from '../../../../src/shared/utils/dependency-validation.js';

describe('Dependency Validation Utilities', () => {
  const mockTasks: Task[] = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Task 1',
      status: TaskStatus.PENDING,
      priority: Priority.MEDIUM,
      createdAt: new Date(),
      updatedAt: new Date(),
      dependencies: [],
      tags: [],
      metadata: {},
      implementationNotes: [],
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      title: 'Task 2',
      status: TaskStatus.COMPLETED,
      priority: Priority.HIGH,
      createdAt: new Date(),
      updatedAt: new Date(),
      dependencies: [],
      tags: [],
      metadata: {},
      implementationNotes: [],
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      title: 'Task 3',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.LOW,
      createdAt: new Date(),
      updatedAt: new Date(),
      dependencies: ['550e8400-e29b-41d4-a716-446655440001'],
      tags: [],
      metadata: {},
      implementationNotes: [],
    },
  ];

  describe('validateDependencyIds', () => {
    it('should validate valid dependencies', () => {
      const result = validateDependencyIds(
        '550e8400-e29b-41d4-a716-446655440003',
        ['550e8400-e29b-41d4-a716-446655440001'],
        mockTasks
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid dependency IDs', () => {
      const result = validateDependencyIds(
        '550e8400-e29b-41d4-a716-446655440001',
        ['invalid-id'],
        mockTasks
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Invalid dependencies: invalid-id do not exist'
      );
    });

    it('should detect self-dependency', () => {
      const result = validateDependencyIds(
        '550e8400-e29b-41d4-a716-446655440001',
        ['550e8400-e29b-41d4-a716-446655440001'],
        mockTasks
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Task cannot depend on itself');
    });

    it('should warn about dependencies on completed tasks', () => {
      const result = validateDependencyIds(
        '550e8400-e29b-41d4-a716-446655440001',
        ['550e8400-e29b-41d4-a716-446655440002'],
        mockTasks
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Dependencies on completed tasks: Task 2'
      );
    });

    it('should warn about duplicate dependencies', () => {
      const result = validateDependencyIds(
        '550e8400-e29b-41d4-a716-446655440003',
        [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440001',
        ],
        mockTasks
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Duplicate dependencies detected and will be removed'
      );
    });

    it('should detect circular dependencies', () => {
      // Create tasks with circular dependencies: task-1 -> task-2 -> task-1
      const tasksWithCircular: Task[] = [
        {
          ...mockTasks[0],
          id: '550e8400-e29b-41d4-a716-446655440001',
          dependencies: ['550e8400-e29b-41d4-a716-446655440002'],
        },
        {
          ...mockTasks[1],
          id: '550e8400-e29b-41d4-a716-446655440002',
          status: TaskStatus.PENDING,
          dependencies: [],
        },
      ];

      const result = validateDependencyIds(
        '550e8400-e29b-41d4-a716-446655440002',
        ['550e8400-e29b-41d4-a716-446655440001'],
        tasksWithCircular
      );

      expect(result.isValid).toBe(false);
      expect(result.circularDependencies).toHaveLength(1);
      expect(
        result.errors.some(e => e.includes('Circular dependencies detected'))
      ).toBe(true);
    });
  });

  describe('detectCircularDependencies', () => {
    it('should detect simple circular dependency', () => {
      const tasksWithCircular: Task[] = [
        {
          ...mockTasks[0],
          id: '550e8400-e29b-41d4-a716-446655440001',
          dependencies: ['550e8400-e29b-41d4-a716-446655440002'],
        },
        {
          ...mockTasks[1],
          id: '550e8400-e29b-41d4-a716-446655440002',
          status: TaskStatus.PENDING,
          dependencies: [],
        },
      ];

      const cycles = detectCircularDependencies(
        '550e8400-e29b-41d4-a716-446655440002',
        ['550e8400-e29b-41d4-a716-446655440001'],
        tasksWithCircular
      );

      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toContain('550e8400-e29b-41d4-a716-446655440001');
      expect(cycles[0]).toContain('550e8400-e29b-41d4-a716-446655440002');
    });

    it('should detect complex circular dependency chain', () => {
      const tasksWithCircular: Task[] = [
        {
          ...mockTasks[0],
          id: '550e8400-e29b-41d4-a716-446655440001',
          dependencies: ['550e8400-e29b-41d4-a716-446655440002'],
        },
        {
          ...mockTasks[1],
          id: '550e8400-e29b-41d4-a716-446655440002',
          status: TaskStatus.PENDING,
          dependencies: ['550e8400-e29b-41d4-a716-446655440003'],
        },
        {
          ...mockTasks[2],
          id: '550e8400-e29b-41d4-a716-446655440003',
          dependencies: [],
        },
      ];

      const cycles = detectCircularDependencies(
        '550e8400-e29b-41d4-a716-446655440003',
        ['550e8400-e29b-41d4-a716-446655440001'],
        tasksWithCircular
      );

      expect(cycles).toHaveLength(1);
      expect(cycles[0]).toContain('550e8400-e29b-41d4-a716-446655440001');
      expect(cycles[0]).toContain('550e8400-e29b-41d4-a716-446655440002');
      expect(cycles[0]).toContain('550e8400-e29b-41d4-a716-446655440003');
    });

    it('should return empty array when no circular dependencies exist', () => {
      const cycles = detectCircularDependencies(
        '550e8400-e29b-41d4-a716-446655440001',
        ['550e8400-e29b-41d4-a716-446655440002'],
        mockTasks
      );

      expect(cycles).toHaveLength(0);
    });

    it('should handle empty dependencies', () => {
      const cycles = detectCircularDependencies(
        '550e8400-e29b-41d4-a716-446655440001',
        [],
        mockTasks
      );

      expect(cycles).toHaveLength(0);
    });
  });

  describe('validateTaskDependencies', () => {
    it('should perform comprehensive validation with valid inputs', () => {
      const result = validateTaskDependencies(
        '550e8400-e29b-41d4-a716-446655440003',
        ['550e8400-e29b-41d4-a716-446655440001'],
        mockTasks
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate task ID format', () => {
      const result = validateTaskDependencies(
        'invalid-task-id',
        ['550e8400-e29b-41d4-a716-446655440001'],
        mockTasks
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid task ID format');
    });

    it('should validate dependency IDs format', () => {
      const result = validateTaskDependencies(
        '550e8400-e29b-41d4-a716-446655440001',
        ['invalid-dep-id'],
        mockTasks
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(e => e.includes('uuid') || e.includes('Invalid'))
      ).toBe(true);
    });

    it('should enforce maximum dependency limit', () => {
      const tooManyDeps = Array(51).fill(
        '550e8400-e29b-41d4-a716-446655440000'
      );
      const result = validateTaskDependencies(
        '550e8400-e29b-41d4-a716-446655440001',
        tooManyDeps,
        mockTasks
      );

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(e => e.includes('Maximum 50 dependencies'))
      ).toBe(true);
    });

    it('should handle validation exceptions gracefully', () => {
      // Pass null as allTasks to trigger an exception
      const result = validateTaskDependencies(
        '550e8400-e29b-41d4-a716-446655440001',
        ['550e8400-e29b-41d4-a716-446655440002'],

        null as any
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Validation failed'))).toBe(
        true
      );
    });
  });

  describe('createDependencyErrorResponse', () => {
    it('should create error response for invalid dependencies', () => {
      const validation = {
        isValid: false,
        errors: ['Invalid dependencies: invalid-id do not exist'],
        warnings: [],
        circularDependencies: [],
      };

      const response = createDependencyErrorResponse(validation, 'task-1');

      expect(response.error).toBe('Dependency validation failed');
      expect(response.code).toBe('INVALID_DEPENDENCY_ERROR');
      expect(response.details.taskId).toBe('task-1');
      expect(response.details.invalidDependencies).toContain('invalid-id');
      expect(response.details.suggestions).toContain(
        'Verify that all dependency task IDs exist in the same list'
      );
    });

    it('should create error response for circular dependencies', () => {
      const validation = {
        isValid: false,
        errors: ['Circular dependencies detected: task-1 → task-2 → task-1'],
        warnings: [],
        circularDependencies: [['task-1', 'task-2', 'task-1']],
      };

      const response = createDependencyErrorResponse(validation, 'task-1');

      expect(response.code).toBe('CIRCULAR_DEPENDENCY_ERROR');
      expect(response.details.circularChains).toHaveLength(1);
      expect(response.details.suggestions).toContain(
        'Remove one or more dependencies to break the circular chain'
      );
    });

    it('should create error response for self-dependency', () => {
      const validation = {
        isValid: false,
        errors: ['Task cannot depend on itself'],
        warnings: [],
        circularDependencies: [],
      };

      const response = createDependencyErrorResponse(validation, 'task-1');

      expect(response.code).toBe('SELF_DEPENDENCY_ERROR');
      expect(response.details.suggestions).toContain(
        'Remove the task ID from its own dependencies list'
      );
    });

    it('should include suggestions for warnings', () => {
      const validation = {
        isValid: true,
        errors: [],
        warnings: [
          'Dependencies on completed tasks: Task 2',
          'Duplicate dependencies detected',
        ],
        circularDependencies: [],
      };

      const response = createDependencyErrorResponse(validation, 'task-1');

      expect(response.details.suggestions).toContain(
        'Consider removing dependencies on completed tasks as they are already done'
      );
      expect(response.details.suggestions).toContain(
        'Remove duplicate dependencies from the list'
      );
    });
  });

  describe('formatDependencyValidationError', () => {
    it('should format validation errors correctly', () => {
      const validation = {
        isValid: false,
        errors: ['Invalid dependencies: invalid-id do not exist'],
        warnings: ['Duplicate dependencies detected'],
        circularDependencies: [['task-1', 'task-2', 'task-1']],
      };

      const formatted = formatDependencyValidationError(validation);

      expect(formatted).toContain('Dependency validation failed:');
      expect(formatted).toContain(
        'Invalid dependencies: invalid-id do not exist'
      );
      expect(formatted).toContain('Warnings:');
      expect(formatted).toContain('Circular dependencies detected:');
      expect(formatted).toContain('task-1 → task-2 → task-1');
    });

    it('should include suggestions for common issues', () => {
      const validation = {
        isValid: false,
        errors: ['Invalid dependencies: invalid-id do not exist'],
        warnings: [],
        circularDependencies: [],
      };

      const formatted = formatDependencyValidationError(validation);

      expect(formatted).toContain('Suggestions:');
      expect(formatted).toContain('Verify that all dependency task IDs exist');
    });
  });

  describe('deduplicateDependencies', () => {
    it('should remove duplicate dependency IDs', () => {
      const dependencies = ['task-1', 'task-2', 'task-1', 'task-3', 'task-2'];
      const result = deduplicateDependencies(dependencies);

      expect(result).toEqual(['task-1', 'task-2', 'task-3']);
    });

    it('should preserve order of first occurrence', () => {
      const dependencies = ['task-3', 'task-1', 'task-2', 'task-1'];
      const result = deduplicateDependencies(dependencies);

      expect(result).toEqual(['task-3', 'task-1', 'task-2']);
    });

    it('should handle empty array', () => {
      const result = deduplicateDependencies([]);

      expect(result).toEqual([]);
    });
  });

  describe('Validation Schemas', () => {
    describe('DependencyIdsSchema', () => {
      it('should validate valid dependency IDs array', () => {
        const validIds = [
          '550e8400-e29b-41d4-a716-446655440000',
          '550e8400-e29b-41d4-a716-446655440001',
        ];
        const result = DependencyIdsSchema.parse(validIds);

        expect(result).toEqual(validIds);
      });

      it('should reject non-UUID strings', () => {
        expect(() => {
          DependencyIdsSchema.parse(['invalid-id']);
        }).toThrow();
      });

      it('should reject arrays with more than 10 items', () => {
        const tooManyIds = Array(51).fill(
          '550e8400-e29b-41d4-a716-446655440000'
        );

        expect(() => {
          DependencyIdsSchema.parse(tooManyIds);
        }).toThrow('Maximum 50 dependencies allowed per task');
      });

      it('should default to empty array', () => {
        const result = DependencyIdsSchema.parse(undefined);

        expect(result).toEqual([]);
      });
    });

    describe('TaskIdSchema', () => {
      it('should validate valid UUID', () => {
        const validId = '550e8400-e29b-41d4-a716-446655440000';
        const result = TaskIdSchema.parse(validId);

        expect(result).toBe(validId);
      });

      it('should reject invalid UUID', () => {
        expect(() => {
          TaskIdSchema.parse('invalid-id');
        }).toThrow();
      });
    });

    describe('ListIdSchema', () => {
      it('should validate valid UUID', () => {
        const validId = '550e8400-e29b-41d4-a716-446655440000';
        const result = ListIdSchema.parse(validId);

        expect(result).toBe(validId);
      });

      it('should reject invalid UUID', () => {
        expect(() => {
          ListIdSchema.parse('invalid-id');
        }).toThrow();
      });
    });
  });
});
