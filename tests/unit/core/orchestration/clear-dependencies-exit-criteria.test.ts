/**
 * Unit tests for clearing dependencies and exit criteria functionality
 * Tests the ability to clear dependencies and exit criteria by passing empty arrays
 * Requirement 6.8: Add ability to clear dependencies and exit criteria
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { DependencyOrchestrator } from '../../../../src/core/orchestration/interfaces/dependency-orchestrator.js';
import { DependencyOrchestratorImpl } from '../../../../src/core/orchestration/services/dependency-orchestrator-impl.js';
import { TaskOrchestratorImpl } from '../../../../src/core/orchestration/services/task-orchestrator-impl.js';
import { TaskValidator } from '../../../../src/core/orchestration/validators/task-validator.js';
import { DataDelegationService } from '../../../../src/data/delegation/data-delegation-service.js';
import { Task } from '../../../../src/domain/models/task.js';

describe('Clear Dependencies and Exit Criteria', () => {
  let dependencyOrchestrator: DependencyOrchestratorImpl;
  let taskOrchestrator: TaskOrchestratorImpl;
  let mockDataDelegation: DataDelegationService;
  let mockValidator: TaskValidator;
  let mockDependencyOrchestrator: DependencyOrchestrator;

  const mockTask: Task = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test task description',
    status: 'pending',
    priority: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    dependencies: ['dep-1', 'dep-2'],
    tags: [],
    metadata: {},
    exitCriteria: [
      {
        id: 'criteria-1',
        description: 'Complete unit tests',
        isMet: false,
        updatedAt: new Date(),
      },
      {
        id: 'criteria-2',
        description: 'Code review approved',
        isMet: false,
        updatedAt: new Date(),
      },
    ],
    implementationNotes: [],
  };

  beforeEach(() => {
    mockDataDelegation = {
      execute: vi.fn(),
    } as unknown as DataDelegationService;

    mockValidator = {
      validate: vi
        .fn()
        .mockReturnValue({ isValid: true, errors: [], warnings: [] }),
    } as unknown as TaskValidator;

    mockDependencyOrchestrator = {
      setTaskDependencies: vi.fn(),
      detectCircularDependencies: vi.fn(),
      calculateBlockReason: vi.fn(),
      getReadyTasks: vi.fn(),
      analyzeDependencies: vi.fn(),
      validate: vi.fn(),
      handleError: vi.fn(),
      delegateData: vi.fn(),
    } as unknown as DependencyOrchestrator;

    dependencyOrchestrator = new DependencyOrchestratorImpl(mockDataDelegation);
    taskOrchestrator = new TaskOrchestratorImpl(
      mockValidator,
      mockDataDelegation,
      mockDependencyOrchestrator
    );

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('Clear Dependencies with Empty Array', () => {
    it('should clear all dependencies when empty array is provided', async () => {
      // Mock getting the task
      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(mockTask) // First call to get task
        .mockResolvedValueOnce(undefined); // Second call to update task

      await dependencyOrchestrator.setTaskDependencies('task-1', []);

      // Verify the update operation was called with empty dependencies
      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'update',
        entity: 'task',
        data: { id: 'task-1', dependencies: [] },
      });
    });

    it('should handle clearing dependencies when task has no existing dependencies', async () => {
      const taskWithNoDeps = { ...mockTask, dependencies: [] };

      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(taskWithNoDeps)
        .mockResolvedValueOnce(undefined);

      await dependencyOrchestrator.setTaskDependencies('task-1', []);

      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'update',
        entity: 'task',
        data: { id: 'task-1', dependencies: [] },
      });
    });

    it('should validate task exists before clearing dependencies', async () => {
      vi.mocked(mockDataDelegation.execute).mockResolvedValueOnce(null);

      await expect(
        dependencyOrchestrator.setTaskDependencies('non-existent-task', [])
      ).rejects.toThrow();
    });
  });

  describe('Clear Exit Criteria with Empty Array', () => {
    it('should clear all exit criteria when empty array is provided', async () => {
      const updatedTask = { ...mockTask, exitCriteria: [] };

      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(mockTask) // Get task
        .mockResolvedValueOnce(updatedTask); // Update task

      const result = await taskOrchestrator.setTaskExitCriteria('task-1', []);

      // Verify the update operation was called with empty exit criteria
      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'update',
        entity: 'task',
        data: { id: 'task-1', exitCriteria: [] },
      });

      expect(result.exitCriteria).toEqual([]);
    });

    it('should handle clearing exit criteria when task has no existing criteria', async () => {
      const taskWithNoCriteria = { ...mockTask, exitCriteria: [] };

      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(taskWithNoCriteria)
        .mockResolvedValueOnce(taskWithNoCriteria);

      const result = await taskOrchestrator.setTaskExitCriteria('task-1', []);

      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'update',
        entity: 'task',
        data: { id: 'task-1', exitCriteria: [] },
      });

      expect(result.exitCriteria).toEqual([]);
    });

    it('should validate task exists before clearing exit criteria', async () => {
      vi.mocked(mockDataDelegation.execute).mockResolvedValueOnce(null);

      await expect(
        taskOrchestrator.setTaskExitCriteria('non-existent-task', [])
      ).rejects.toThrow();
    });
  });

  describe('Combined Operations', () => {
    it('should be able to clear both dependencies and exit criteria for the same task', async () => {
      const clearedTask = {
        ...mockTask,
        dependencies: [],
        exitCriteria: [],
      };

      // Mock calls for clearing dependencies
      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(mockTask) // Get task for dependencies
        .mockResolvedValueOnce(undefined) // Update dependencies
        .mockResolvedValueOnce(mockTask) // Get task for exit criteria
        .mockResolvedValueOnce(clearedTask); // Update exit criteria

      // Clear dependencies first
      await dependencyOrchestrator.setTaskDependencies('task-1', []);

      // Then clear exit criteria
      const result = await taskOrchestrator.setTaskExitCriteria('task-1', []);

      // Verify both operations were called correctly
      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'update',
        entity: 'task',
        data: { id: 'task-1', dependencies: [] },
      });

      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'update',
        entity: 'task',
        data: { id: 'task-1', exitCriteria: [] },
      });

      expect(result.dependencies).toEqual([]);
      expect(result.exitCriteria).toEqual([]);
    });
  });

  describe('Validation and Error Handling', () => {
    it('should handle empty arrays without validation errors', async () => {
      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(undefined);

      // Should not throw any validation errors
      await expect(
        dependencyOrchestrator.setTaskDependencies('task-1', [])
      ).resolves.not.toThrow();
    });

    it('should handle data delegation errors gracefully', async () => {
      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(mockTask)
        .mockRejectedValueOnce(new Error('Database error'));

      await expect(
        dependencyOrchestrator.setTaskDependencies('task-1', [])
      ).rejects.toThrow('Database error');
    });
  });
});
