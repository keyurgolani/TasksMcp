/**
 * Unit tests for TaskOrchestratorImpl
 * Tests centralized task management with business rule enforcement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { DependencyOrchestrator } from '../../../../../src/core/orchestration/interfaces/dependency-orchestrator';
import { TaskOrchestratorImpl } from '../../../../../src/core/orchestration/services/task-orchestrator-impl';
import { TaskValidator } from '../../../../../src/core/orchestration/validators/task-validator';
import { DataDelegationService } from '../../../../../src/data/delegation/data-delegation-service';
import {
  Task,
  TaskStatus,
  Priority,
} from '../../../../../src/domain/models/task';
import {
  ValidationError,
  StatusTransitionError,
  TaskNotFoundError,
} from '../../../../../src/shared/errors/orchestration-error';
import {
  CreateTaskData,
  UpdateTaskData,
} from '../../../../../src/shared/types/task-operations';

describe('TaskOrchestratorImpl', () => {
  let taskOrchestrator: TaskOrchestratorImpl;
  let mockValidator: TaskValidator;
  let mockDataDelegation: DataDelegationService;
  let mockDependencyOrchestrator: DependencyOrchestrator;

  const mockTask: Task = {
    id: 'test-task-id',
    listId: 'test-list-id',
    title: 'Test Task',
    description: 'Test Description',
    status: TaskStatus.PENDING,
    priority: Priority.MEDIUM,
    createdAt: new Date(),
    updatedAt: new Date(),
    dependencies: [],
    tags: [],
    metadata: {},
    implementationNotes: [],
    exitCriteria: [],
  };

  beforeEach(() => {
    mockValidator = {
      validate: vi.fn(),
      validateTags: vi.fn(),
    } as any;

    mockDataDelegation = {
      execute: vi.fn(),
    } as any;

    mockDependencyOrchestrator = {
      calculateBlockReason: vi.fn(),
      setTaskDependencies: vi.fn(),
      detectCircularDependencies: vi.fn(),
      getReadyTasks: vi.fn(),
      analyzeDependencies: vi.fn(),
      validateDependencies: vi.fn(),
      validate: vi.fn(),
      handleError: vi.fn(),
      delegateData: vi.fn(),
    } as any;

    taskOrchestrator = new TaskOrchestratorImpl(
      mockValidator,
      mockDataDelegation,
      mockDependencyOrchestrator
    );
  });

  describe('createTask', () => {
    it('should create a task successfully with valid data', async () => {
      const createData: CreateTaskData = {
        title: 'New Task',
        description: 'New Description',
        priority: Priority.HIGH,
      };

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      vi.mocked(mockDataDelegation.execute).mockResolvedValue(mockTask);

      const result = await taskOrchestrator.createTask(createData);

      expect(result).toEqual(mockTask);
      expect(mockValidator.validate).toHaveBeenCalledWith(createData);
      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'create',
        entity: 'task',
        data: createData,
      });
    });

    it('should throw ValidationError when validation fails', async () => {
      const createData: CreateTaskData = {
        title: '',
      };

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: false,
        errors: [
          {
            field: 'title',
            message: 'Title is required',
            currentValue: '',
            expectedValue: 'non-empty string',
            actionableGuidance: 'Provide a valid title',
          },
        ],
        warnings: [],
      });

      await expect(taskOrchestrator.createTask(createData)).rejects.toThrow(
        ValidationError
      );
      expect(mockDataDelegation.execute).not.toHaveBeenCalled();
    });

    it('should handle data delegation errors', async () => {
      const createData: CreateTaskData = {
        title: 'New Task',
      };

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      vi.mocked(mockDataDelegation.execute).mockRejectedValue(
        new Error('Data store error')
      );

      await expect(taskOrchestrator.createTask(createData)).rejects.toThrow(
        'Data store error'
      );
    });
  });

  describe('updateTask', () => {
    it('should update a task successfully', async () => {
      const updateData: UpdateTaskData = {
        title: 'Updated Task',
        description: 'Updated Description',
      };

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const updatedTask = { ...mockTask, ...updateData };
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(updatedTask);

      const result = await taskOrchestrator.updateTask('test-id', updateData);

      expect(result).toEqual(updatedTask);
      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'update',
        entity: 'task',
        data: { id: 'test-id', ...updateData },
      });
    });

    it('should throw TaskNotFoundError when task does not exist', async () => {
      const updateData: UpdateTaskData = {
        title: 'Updated Task',
      };

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      vi.mocked(mockDataDelegation.execute).mockResolvedValue(null);

      await expect(
        taskOrchestrator.updateTask('non-existent-id', updateData)
      ).rejects.toThrow(TaskNotFoundError);
    });
  });

  describe('setTaskStatus', () => {
    it('should set task status with valid transition', async () => {
      const currentTask = { ...mockTask, status: TaskStatus.PENDING };
      const updatedTask = { ...currentTask, status: TaskStatus.IN_PROGRESS };

      // Mock getTask call
      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(currentTask) // getTask call
        .mockResolvedValueOnce(updatedTask); // updateTask call

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const result = await taskOrchestrator.setTaskStatus(
        'test-id',
        TaskStatus.IN_PROGRESS
      );

      expect(result).toEqual(updatedTask);
    });

    it('should throw StatusTransitionError for invalid transition', async () => {
      const currentTask = { ...mockTask, status: TaskStatus.COMPLETED };

      vi.mocked(mockDataDelegation.execute).mockResolvedValue(currentTask);

      await expect(
        taskOrchestrator.setTaskStatus('test-id', TaskStatus.PENDING)
      ).rejects.toThrow(StatusTransitionError);
    });

    it('should handle all valid status transitions', async () => {
      // Test pending -> in_progress
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      const inProgressTask = { ...pendingTask, status: TaskStatus.IN_PROGRESS };

      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(pendingTask)
        .mockResolvedValueOnce(inProgressTask);

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      let result = await taskOrchestrator.setTaskStatus(
        'test-id',
        TaskStatus.IN_PROGRESS
      );
      expect(result.status).toBe(TaskStatus.IN_PROGRESS);

      // Test pending -> cancelled
      const cancelledFromPendingTask = {
        ...pendingTask,
        status: TaskStatus.CANCELLED,
      };

      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(pendingTask)
        .mockResolvedValueOnce(cancelledFromPendingTask);

      result = await taskOrchestrator.setTaskStatus(
        'test-id',
        TaskStatus.CANCELLED
      );
      expect(result.status).toBe(TaskStatus.CANCELLED);

      // Test in_progress -> completed
      const completedTask = {
        ...inProgressTask,
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      };

      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(inProgressTask)
        .mockResolvedValueOnce(completedTask);

      result = await taskOrchestrator.setTaskStatus(
        'test-id',
        TaskStatus.COMPLETED
      );
      expect(result.status).toBe(TaskStatus.COMPLETED);

      // Test in_progress -> blocked
      const blockedTask = { ...inProgressTask, status: TaskStatus.BLOCKED };

      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(inProgressTask)
        .mockResolvedValueOnce(blockedTask);

      result = await taskOrchestrator.setTaskStatus(
        'test-id',
        TaskStatus.BLOCKED
      );
      expect(result.status).toBe(TaskStatus.BLOCKED);

      // Test blocked -> in_progress
      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(blockedTask)
        .mockResolvedValueOnce(inProgressTask);

      result = await taskOrchestrator.setTaskStatus(
        'test-id',
        TaskStatus.IN_PROGRESS
      );
      expect(result.status).toBe(TaskStatus.IN_PROGRESS);

      // Test cancelled -> pending (reactivation)
      const cancelledTask = { ...mockTask, status: TaskStatus.CANCELLED };
      const reactivatedTask = { ...cancelledTask, status: TaskStatus.PENDING };

      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(cancelledTask)
        .mockResolvedValueOnce(reactivatedTask);

      result = await taskOrchestrator.setTaskStatus(
        'test-id',
        TaskStatus.PENDING
      );
      expect(result.status).toBe(TaskStatus.PENDING);

      // Test in_progress -> cancelled
      const cancelledFromInProgressTask = {
        ...inProgressTask,
        status: TaskStatus.CANCELLED,
      };

      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(inProgressTask)
        .mockResolvedValueOnce(cancelledFromInProgressTask);

      result = await taskOrchestrator.setTaskStatus(
        'test-id',
        TaskStatus.CANCELLED
      );
      expect(result.status).toBe(TaskStatus.CANCELLED);

      // Test blocked -> cancelled
      const cancelledFromBlockedTask = {
        ...blockedTask,
        status: TaskStatus.CANCELLED,
      };

      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(blockedTask)
        .mockResolvedValueOnce(cancelledFromBlockedTask);

      result = await taskOrchestrator.setTaskStatus(
        'test-id',
        TaskStatus.CANCELLED
      );
      expect(result.status).toBe(TaskStatus.CANCELLED);
    });

    it('should allow same-status transitions (no-op)', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };

      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(pendingTask)
        .mockResolvedValueOnce(pendingTask);

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const result = await taskOrchestrator.setTaskStatus(
        'test-id',
        TaskStatus.PENDING
      );

      expect(result.status).toBe(TaskStatus.PENDING);
    });

    it('should throw StatusTransitionError for all invalid transitions', async () => {
      // Test completed -> any other status (terminal state)
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED };
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(completedTask);

      await expect(
        taskOrchestrator.setTaskStatus('test-id', TaskStatus.PENDING)
      ).rejects.toThrow(StatusTransitionError);

      await expect(
        taskOrchestrator.setTaskStatus('test-id', TaskStatus.IN_PROGRESS)
      ).rejects.toThrow(StatusTransitionError);

      await expect(
        taskOrchestrator.setTaskStatus('test-id', TaskStatus.BLOCKED)
      ).rejects.toThrow(StatusTransitionError);

      await expect(
        taskOrchestrator.setTaskStatus('test-id', TaskStatus.CANCELLED)
      ).rejects.toThrow(StatusTransitionError);

      // Test pending -> blocked (invalid)
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(pendingTask);

      await expect(
        taskOrchestrator.setTaskStatus('test-id', TaskStatus.BLOCKED)
      ).rejects.toThrow(StatusTransitionError);

      await expect(
        taskOrchestrator.setTaskStatus('test-id', TaskStatus.COMPLETED)
      ).rejects.toThrow(StatusTransitionError);

      // Test blocked -> completed (invalid)
      const blockedTask = { ...mockTask, status: TaskStatus.BLOCKED };
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(blockedTask);

      await expect(
        taskOrchestrator.setTaskStatus('test-id', TaskStatus.COMPLETED)
      ).rejects.toThrow(StatusTransitionError);

      await expect(
        taskOrchestrator.setTaskStatus('test-id', TaskStatus.PENDING)
      ).rejects.toThrow(StatusTransitionError);

      // Test cancelled -> any status except pending (invalid)
      const cancelledTask = { ...mockTask, status: TaskStatus.CANCELLED };
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(cancelledTask);

      await expect(
        taskOrchestrator.setTaskStatus('test-id', TaskStatus.IN_PROGRESS)
      ).rejects.toThrow(StatusTransitionError);

      await expect(
        taskOrchestrator.setTaskStatus('test-id', TaskStatus.COMPLETED)
      ).rejects.toThrow(StatusTransitionError);

      await expect(
        taskOrchestrator.setTaskStatus('test-id', TaskStatus.BLOCKED)
      ).rejects.toThrow(StatusTransitionError);
    });

    it('should provide detailed error information for invalid transitions', async () => {
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED };
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(completedTask);

      try {
        await taskOrchestrator.setTaskStatus('test-id', TaskStatus.PENDING);
        expect.fail('Should have thrown StatusTransitionError');
      } catch (error) {
        expect(error).toBeInstanceOf(StatusTransitionError);
        expect(error.message).toContain(
          'Invalid status transition from completed to pending'
        );
        expect(error.currentStatus).toBe(TaskStatus.COMPLETED);
        expect(error.targetStatus).toBe(TaskStatus.PENDING);
        expect(error.actionableGuidance).toContain(
          'Valid transitions from completed:'
        );
      }
    });

    it('should set completedAt when transitioning to completed status', async () => {
      const currentTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };
      const completedTask = {
        ...currentTask,
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      };

      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(currentTask)
        .mockResolvedValueOnce(completedTask);

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const result = await taskOrchestrator.setTaskStatus(
        'test-id',
        TaskStatus.COMPLETED
      );

      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.completedAt).toBeDefined();
    });
  });

  describe('setTaskPriority', () => {
    it('should set task priority successfully', async () => {
      const updatedTask = { ...mockTask, priority: Priority.HIGH };

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      vi.mocked(mockDataDelegation.execute).mockResolvedValue(updatedTask);

      const result = await taskOrchestrator.setTaskPriority(
        'test-id',
        Priority.HIGH
      );

      expect(result).toEqual(updatedTask);
    });

    it('should throw ValidationError for invalid priority', async () => {
      await expect(
        taskOrchestrator.setTaskPriority('test-id', 10 as Priority)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('addTaskTags', () => {
    it('should add tags successfully', async () => {
      const currentTask = { ...mockTask, tags: ['existing'] };
      const updatedTask = { ...currentTask, tags: ['existing', 'new-tag'] };

      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(currentTask) // getTask call
        .mockResolvedValueOnce(updatedTask); // updateTask call

      vi.mocked(mockValidator.validateTags).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const result = await taskOrchestrator.addTaskTags('test-id', ['new-tag']);

      expect(result).toEqual(updatedTask);
      expect(mockValidator.validateTags).toHaveBeenCalledWith(['new-tag']);
    });

    it('should throw ValidationError for invalid tags', async () => {
      vi.mocked(mockValidator.validateTags).mockReturnValue({
        isValid: false,
        errors: [
          {
            field: 'tags[0]',
            message: 'Invalid tag format',
            currentValue: 'invalid tag!',
            expectedValue: 'valid tag format',
            actionableGuidance:
              'Use only letters, numbers, hyphens, and underscores',
          },
        ],
        warnings: [],
      });

      await expect(
        taskOrchestrator.addTaskTags('test-id', ['invalid tag!'])
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('removeTaskTags', () => {
    it('should remove tags successfully', async () => {
      const currentTask = { ...mockTask, tags: ['tag1', 'tag2', 'tag3'] };
      const updatedTask = { ...currentTask, tags: ['tag1', 'tag3'] };

      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(currentTask) // getTask call
        .mockResolvedValueOnce(updatedTask); // updateTask call

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const result = await taskOrchestrator.removeTaskTags('test-id', ['tag2']);

      expect(result).toEqual(updatedTask);
    });
  });

  describe('getTask', () => {
    it('should get task successfully', async () => {
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(mockTask);

      const result = await taskOrchestrator.getTask('test-id');

      expect(result).toEqual(mockTask);
      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'read',
        entity: 'task',
        filters: { id: 'test-id' },
      });
    });

    it('should throw TaskNotFoundError when task does not exist', async () => {
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(null);

      await expect(taskOrchestrator.getTask('non-existent-id')).rejects.toThrow(
        TaskNotFoundError
      );
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(undefined);

      await taskOrchestrator.deleteTask('test-id');

      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'delete',
        entity: 'task',
        filters: { id: 'test-id' },
      });
    });
  });

  describe('completeTask', () => {
    it('should complete task successfully', async () => {
      const currentTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };
      const completedTask = {
        ...currentTask,
        status: TaskStatus.COMPLETED,
        completedAt: expect.any(Date),
      };

      vi.mocked(mockDataDelegation.execute)
        .mockResolvedValueOnce(currentTask) // getTask call
        .mockResolvedValueOnce(completedTask); // updateTask call

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const result = await taskOrchestrator.completeTask('test-id');

      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.completedAt).toBeDefined();
    });
  });

  describe('blockReason functionality', () => {
    it('should not populate blockReason when getting task (performance optimization)', async () => {
      const taskWithDependencies = {
        ...mockTask,
        dependencies: ['dep-1', 'dep-2'],
        status: TaskStatus.PENDING,
      };

      vi.mocked(mockDataDelegation.execute).mockResolvedValue(
        taskWithDependencies
      );

      const result = await taskOrchestrator.getTask('test-id');

      // BlockReason is not calculated during getTask for performance reasons
      expect(result.blockReason).toBeUndefined();
      expect(
        mockDependencyOrchestrator.calculateBlockReason
      ).not.toHaveBeenCalled();
    });

    it('should not populate blockReason for completed tasks', async () => {
      const completedTaskWithDependencies = {
        ...mockTask,
        dependencies: ['dep-1'],
        status: TaskStatus.COMPLETED,
      };

      vi.mocked(mockDataDelegation.execute).mockResolvedValue(
        completedTaskWithDependencies
      );

      const result = await taskOrchestrator.getTask('test-id');

      expect(result.blockReason).toBeUndefined();
      expect(
        mockDependencyOrchestrator.calculateBlockReason
      ).not.toHaveBeenCalled();
    });

    it('should not populate blockReason for tasks without dependencies', async () => {
      const taskWithoutDependencies = {
        ...mockTask,
        dependencies: [],
        status: TaskStatus.PENDING,
      };

      vi.mocked(mockDataDelegation.execute).mockResolvedValue(
        taskWithoutDependencies
      );

      const result = await taskOrchestrator.getTask('test-id');

      expect(result.blockReason).toBeUndefined();
      expect(
        mockDependencyOrchestrator.calculateBlockReason
      ).not.toHaveBeenCalled();
    });

    it('should not calculate blockReason during getTask (performance optimization)', async () => {
      const taskWithDependencies = {
        ...mockTask,
        dependencies: ['dep-1'],
        status: TaskStatus.PENDING,
      };

      vi.mocked(mockDataDelegation.execute).mockResolvedValue(
        taskWithDependencies
      );

      const result = await taskOrchestrator.getTask('test-id');

      expect(result.blockReason).toBeUndefined();
      expect(
        mockDependencyOrchestrator.calculateBlockReason
      ).not.toHaveBeenCalled();
    });

    it('should not calculate blockReason during getTask to avoid errors', async () => {
      const taskWithDependencies = {
        ...mockTask,
        dependencies: ['dep-1'],
        status: TaskStatus.PENDING,
      };

      vi.mocked(mockDataDelegation.execute).mockResolvedValue(
        taskWithDependencies
      );

      const result = await taskOrchestrator.getTask('test-id');

      // BlockReason calculation is skipped for performance, so no errors occur
      expect(result.blockReason).toBeUndefined();
      expect(
        mockDependencyOrchestrator.calculateBlockReason
      ).not.toHaveBeenCalled();
    });

    it('should not populate blockReason in search results (performance optimization)', async () => {
      const tasksWithDependencies = [
        {
          ...mockTask,
          id: 'task-1',
          dependencies: ['dep-1'],
          status: TaskStatus.PENDING,
        },
        {
          ...mockTask,
          id: 'task-2',
          dependencies: ['dep-2'],
          status: TaskStatus.IN_PROGRESS,
        },
        {
          ...mockTask,
          id: 'task-3',
          dependencies: [],
          status: TaskStatus.PENDING,
        },
      ];

      const searchResult = {
        tasks: tasksWithDependencies,
        total: 3,
        offset: 0,
        limit: 10,
        hasMore: false,
      };

      vi.mocked(mockDataDelegation.execute).mockResolvedValue(searchResult);

      const result = await taskOrchestrator.searchTasks({ query: 'test' });

      // BlockReason is not calculated during search for performance reasons
      expect(result.tasks[0].blockReason).toBeUndefined();
      expect(result.tasks[1].blockReason).toBeUndefined();
      expect(result.tasks[2].blockReason).toBeUndefined();
      expect(
        mockDependencyOrchestrator.calculateBlockReason
      ).not.toHaveBeenCalled();
    });
  });
});
