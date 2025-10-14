/**
 * Basic unit tests for REST API task controller
 * Tests core CRUD operations work correctly
 */

import { Request, Response } from 'express';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TaskController } from '../../../../../src/api/rest/controllers/task-controller.js';
import { TaskOrchestrator } from '../../../../../src/core/orchestration/interfaces/task-orchestrator.js';
import { TaskStatus } from '../../../../../src/domain/models/task.js';
import { OrchestrationError } from '../../../../../src/shared/errors/orchestration-error.js';

describe('TaskController - Basic Operations', () => {
  let taskController: TaskController;
  let mockTaskOrchestrator: TaskOrchestrator;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Create mock orchestrator with basic methods
    mockTaskOrchestrator = {
      createTask: vi.fn(),
      searchTasks: vi.fn(),
      getTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      completeTask: vi.fn(),
      setTaskPriority: vi.fn(),
      addTaskTags: vi.fn(),
      removeTaskTags: vi.fn(),
    } as any;

    taskController = new TaskController(mockTaskOrchestrator);

    // Create mock request and response
    mockRequest = {
      params: {},
      query: {},
      body: {},
      headers: { 'x-request-id': 'test-request-123' },
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('Core CRUD Operations', () => {
    it('should create task successfully', async () => {
      const taskData = {
        listId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        description: 'Test Description',
        priority: 3,
      };

      const createdTask = {
        id: 'task-123',
        ...taskData,
        status: TaskStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        dependencies: [],
        tags: [],
        implementationNotes: [],
        exitCriteria: [],
      };

      mockRequest.body = taskData;
      vi.mocked(mockTaskOrchestrator.createTask).mockResolvedValue(createdTask);

      await taskController.createTask(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockTaskOrchestrator.createTask).toHaveBeenCalledWith(taskData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: createdTask,
          message: 'Task created successfully',
        })
      );
    });

    it('should get task successfully', async () => {
      const task = {
        id: 'task-123',
        title: 'Test Task',
        status: TaskStatus.PENDING,
        priority: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        dependencies: [],
        tags: [],
        implementationNotes: [],
        exitCriteria: [],
      };

      mockRequest.params = { id: 'task-123' };
      vi.mocked(mockTaskOrchestrator.getTask).mockResolvedValue(task);

      await taskController.getTask(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockTaskOrchestrator.getTask).toHaveBeenCalledWith('task-123');
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: task,
        })
      );
    });

    it('should update task successfully', async () => {
      const updateData = {
        title: 'Updated Task',
        priority: 4,
      };

      const updatedTask = {
        id: 'task-123',
        title: 'Updated Task',
        priority: 4,
        status: TaskStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        dependencies: [],
        tags: [],
        implementationNotes: [],
        exitCriteria: [],
      };

      mockRequest.params = { id: 'task-123' };
      mockRequest.body = updateData;
      vi.mocked(mockTaskOrchestrator.updateTask).mockResolvedValue(updatedTask);

      await taskController.updateTask(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockTaskOrchestrator.updateTask).toHaveBeenCalledWith(
        'task-123',
        updateData
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: updatedTask,
          message: 'Task updated successfully',
        })
      );
    });

    it('should delete task successfully', async () => {
      mockRequest.params = { id: 'task-123' };
      vi.mocked(mockTaskOrchestrator.deleteTask).mockResolvedValue(undefined);

      await taskController.deleteTask(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockTaskOrchestrator.deleteTask).toHaveBeenCalledWith('task-123');
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Task deleted successfully',
        })
      );
    });

    it('should complete task successfully', async () => {
      const completedTask = {
        id: 'task-123',
        title: 'Test Task',
        status: TaskStatus.COMPLETED,
        priority: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
        dependencies: [],
        tags: [],
        implementationNotes: [],
        exitCriteria: [],
      };

      mockRequest.params = { id: 'task-123' };
      vi.mocked(mockTaskOrchestrator.completeTask).mockResolvedValue(
        completedTask
      );

      await taskController.completeTask(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockTaskOrchestrator.completeTask).toHaveBeenCalledWith(
        'task-123'
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: completedTask,
          message: 'Task completed successfully',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Validation errors', async () => {
      mockRequest.body = { title: '' }; // Invalid data

      await taskController.createTask(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            type: 'ValidationError',
            message: 'Invalid request data',
          }),
        })
      );
    });

    it('should handle orchestration errors with correct status codes', async () => {
      const taskData = {
        listId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
      };

      mockRequest.body = taskData;
      const orchestrationError = new OrchestrationError(
        'List not found',
        'createTask',
        taskData.listId,
        'valid UUID',
        'Please provide a valid list ID'
      );
      orchestrationError.name = 'ListNotFoundError';

      vi.mocked(mockTaskOrchestrator.createTask).mockRejectedValue(
        orchestrationError
      );

      await taskController.createTask(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            type: orchestrationError.name,
            message: orchestrationError.message,
            context: orchestrationError.context,
            actionableGuidance: orchestrationError.actionableGuidance,
          }),
        })
      );
    });

    it('should handle unexpected errors', async () => {
      mockRequest.params = { id: 'task-123' };
      vi.mocked(mockTaskOrchestrator.getTask).mockRejectedValue(
        new Error('Unexpected error')
      );

      await taskController.getTask(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            type: 'InternalServerError',
            message: 'An unexpected error occurred',
          }),
        })
      );
    });
  });

  describe('Request Validation', () => {
    it('should handle missing task ID', async () => {
      mockRequest.params = {};

      await taskController.getTask(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: { message: 'Task ID is required' },
        })
      );
    });

    it('should include request metadata in responses', async () => {
      const task = {
        id: 'task-123',
        title: 'Test Task',
        status: TaskStatus.PENDING,
        priority: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        dependencies: [],
        tags: [],
        implementationNotes: [],
        exitCriteria: [],
      };

      mockRequest.params = { id: 'task-123' };
      vi.mocked(mockTaskOrchestrator.getTask).mockResolvedValue(task);

      await taskController.getTask(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            requestId: 'test-request-123',
            timestamp: expect.any(String),
            duration: expect.any(Number),
          }),
        })
      );
    });
  });
});
