/**
 * Unit tests for REST API task controller
 * Tests task controller provides full CRUD operations on tasks
 */

import { Request, Response } from 'express';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { TaskController } from '../../../../../src/api/rest/controllers/task-controller.js';
import { TaskOrchestrator } from '../../../../../src/core/orchestration/interfaces/task-orchestrator.js';
import { TaskStatus } from '../../../../../src/domain/models/task.js';
import {
  OrchestrationError,
  StatusTransitionError,
} from '../../../../../src/shared/errors/orchestration-error.js';

describe('TaskController', () => {
  let taskController: TaskController;
  let mockTaskOrchestrator: TaskOrchestrator;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Create mock orchestrator
    mockTaskOrchestrator = {
      createTask: vi.fn(),
      searchTasks: vi.fn(),
      getTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      completeTask: vi.fn(),
      setTaskPriority: vi.fn(),
      setTaskStatus: vi.fn(),
      addTaskTags: vi.fn(),
      removeTaskTags: vi.fn(),
      // Bulk operations (interface defined but implementation pending)
      createBulkTasks: vi.fn(),
      updateBulkTasks: vi.fn(),
      deleteBulkTasks: vi.fn(),
      completeBulkTasks: vi.fn(),
      setBulkTaskPriority: vi.fn(),
      addBulkTaskTags: vi.fn(),
      removeBulkTaskTags: vi.fn(),
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

  describe('createTask', () => {
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
          meta: expect.objectContaining({
            requestId: 'test-request-123',
            timestamp: expect.any(String),
            duration: expect.any(Number),
          }),
        })
      );
    });

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

    it('should handle orchestration errors', async () => {
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
  });

  describe('searchTasks', () => {
    it('should search tasks successfully', async () => {
      const searchResult = {
        tasks: [
          {
            id: 'task-1',
            title: 'Task 1',
            status: TaskStatus.PENDING,
            priority: 3,
            createdAt: new Date(),
            updatedAt: new Date(),
            dependencies: [],
            tags: [],
            implementationNotes: [],
            exitCriteria: [],
          },
        ],
        total: 1,
        offset: 0,
        limit: 50,
        hasMore: false,
      };

      mockRequest.query = {
        listId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'pending',
        priority: '3',
      };

      vi.mocked(mockTaskOrchestrator.searchTasks).mockResolvedValue(
        searchResult
      );

      await taskController.searchTasks(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockTaskOrchestrator.searchTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          listId: '123e4567-e89b-12d3-a456-426614174000',
          status: 'pending',
          priority: 3,
        })
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: searchResult.tasks,
          meta: expect.objectContaining({
            pagination: {
              total: 1,
              offset: 0,
              limit: 50,
              hasMore: false,
            },
          }),
        })
      );
    });

    it('should handle search with tags', async () => {
      mockRequest.query = {
        tags: 'urgent,bug-fix',
      };

      const searchResult = {
        tasks: [],
        total: 0,
        offset: 0,
        limit: 50,
        hasMore: false,
      };

      vi.mocked(mockTaskOrchestrator.searchTasks).mockResolvedValue(
        searchResult
      );

      await taskController.searchTasks(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockTaskOrchestrator.searchTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['urgent', 'bug-fix'],
        })
      );
    });
  });

  describe('getTask', () => {
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
  });

  describe('updateTask', () => {
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
  });

  describe('deleteTask', () => {
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
  });

  describe('completeTask', () => {
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

  describe('setTaskPriority', () => {
    it('should set task priority successfully', async () => {
      const updatedTask = {
        id: 'task-123',
        title: 'Test Task',
        priority: 5,
        status: TaskStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        dependencies: [],
        tags: [],
        implementationNotes: [],
        exitCriteria: [],
      };

      mockRequest.params = { id: 'task-123' };
      mockRequest.body = { priority: 5 };
      vi.mocked(mockTaskOrchestrator.setTaskPriority).mockResolvedValue(
        updatedTask
      );

      await taskController.setTaskPriority(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockTaskOrchestrator.setTaskPriority).toHaveBeenCalledWith(
        'task-123',
        5
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: updatedTask,
          message: 'Task priority updated successfully',
        })
      );
    });
  });

  describe('setTaskStatus', () => {
    it('should set task status successfully', async () => {
      const updatedTask = {
        id: 'task-123',
        title: 'Test Task',
        status: TaskStatus.IN_PROGRESS,
        priority: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        dependencies: [],
        tags: [],
        implementationNotes: [],
        exitCriteria: [],
      };

      mockRequest.params = { id: 'task-123' };
      mockRequest.body = { status: 'in_progress' };
      vi.mocked(mockTaskOrchestrator.setTaskStatus).mockResolvedValue(
        updatedTask
      );

      await taskController.setTaskStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockTaskOrchestrator.setTaskStatus).toHaveBeenCalledWith(
        'task-123',
        'in_progress'
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: updatedTask,
          message: 'Task status updated successfully',
        })
      );
    });

    it('should handle orchestration errors in setTaskStatus', async () => {
      const orchestrationError = new StatusTransitionError(
        'Invalid status transition from completed to pending',
        'completed',
        'pending',
        ['pending', 'in_progress', 'blocked', 'cancelled']
      );

      mockRequest.params = { id: 'task-123' };
      mockRequest.body = { status: 'pending' };
      vi.mocked(mockTaskOrchestrator.setTaskStatus).mockRejectedValue(
        orchestrationError
      );

      await taskController.setTaskStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(409); // Status transition error
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            type: 'StatusTransitionError',
            message: 'Invalid status transition from completed to pending',
          }),
        })
      );
    });
  });

  describe('addTaskTags', () => {
    it('should add task tags successfully', async () => {
      const updatedTask = {
        id: 'task-123',
        title: 'Test Task',
        tags: ['urgent', 'bug-fix'],
        status: TaskStatus.PENDING,
        priority: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        dependencies: [],
        implementationNotes: [],
        exitCriteria: [],
      };

      mockRequest.params = { id: 'task-123' };
      mockRequest.body = { tags: ['urgent', 'bug-fix'] };
      vi.mocked(mockTaskOrchestrator.addTaskTags).mockResolvedValue(
        updatedTask
      );

      await taskController.addTaskTags(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockTaskOrchestrator.addTaskTags).toHaveBeenCalledWith(
        'task-123',
        ['urgent', 'bug-fix']
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: updatedTask,
          message: 'Tags added successfully',
        })
      );
    });
  });

  describe('removeTaskTags', () => {
    it('should remove task tags successfully', async () => {
      const updatedTask = {
        id: 'task-123',
        title: 'Test Task',
        tags: [],
        status: TaskStatus.PENDING,
        priority: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        dependencies: [],
        implementationNotes: [],
        exitCriteria: [],
      };

      mockRequest.params = { id: 'task-123' };
      mockRequest.body = { tags: ['urgent'] };
      vi.mocked(mockTaskOrchestrator.removeTaskTags).mockResolvedValue(
        updatedTask
      );

      await taskController.removeTaskTags(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockTaskOrchestrator.removeTaskTags).toHaveBeenCalledWith(
        'task-123',
        ['urgent']
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: updatedTask,
          message: 'Tags removed successfully',
        })
      );
    });
  });

  describe('Bulk Operations', () => {
    describe('createBulkTasks', () => {
      it('should create bulk tasks successfully', async () => {
        const tasksData = [
          {
            listId: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Task 1',
          },
          {
            listId: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Task 2',
          },
        ];

        const createdTasks = tasksData.map((data, index) => ({
          id: `task-${index + 1}`,
          ...data,
          status: TaskStatus.PENDING,
          priority: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
          dependencies: [],
          tags: [],
          implementationNotes: [],
          exitCriteria: [],
        }));

        mockRequest.body = { tasks: tasksData };
        vi.mocked(mockTaskOrchestrator.createBulkTasks).mockResolvedValue(
          createdTasks
        );

        await taskController.createBulkTasks(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockTaskOrchestrator.createBulkTasks).toHaveBeenCalledWith(
          tasksData
        );
        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: createdTasks,
            message: '2 tasks created successfully',
            meta: expect.objectContaining({
              bulkOperation: true,
              processedCount: 2,
            }),
          })
        );
      });

      it('should handle bulk creation Validation errors', async () => {
        mockRequest.body = { tasks: [] }; // Empty array

        await taskController.createBulkTasks(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              type: 'ValidationError',
            }),
          })
        );
      });
    });

    describe('updateBulkTasks', () => {
      it('should update bulk tasks successfully', async () => {
        const updates = [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            data: { title: 'Updated Task 1' },
          },
          { id: '550e8400-e29b-41d4-a716-446655440002', data: { priority: 4 } },
        ];

        const updatedTasks = updates.map(update => ({
          id: update.id,
          title: update.data.title || 'Default Title',
          priority: update.data.priority || 3,
          status: TaskStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
          dependencies: [],
          tags: [],
          implementationNotes: [],
          exitCriteria: [],
        }));

        mockRequest.body = { updates };
        vi.mocked(mockTaskOrchestrator.updateBulkTasks).mockResolvedValue(
          updatedTasks
        );

        await taskController.updateBulkTasks(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockTaskOrchestrator.updateBulkTasks).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              id: '550e8400-e29b-41d4-a716-446655440001',
              data: expect.objectContaining({ title: 'Updated Task 1' }),
            }),
            expect.objectContaining({
              id: '550e8400-e29b-41d4-a716-446655440002',
              data: expect.objectContaining({ priority: 4 }),
            }),
          ])
        );
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: updatedTasks,
            message: '2 tasks updated successfully',
            meta: expect.objectContaining({
              bulkOperation: true,
              processedCount: 2,
            }),
          })
        );
      });
    });

    describe('deleteBulkTasks', () => {
      it('should delete bulk tasks successfully', async () => {
        const taskIds = [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
          '550e8400-e29b-41d4-a716-446655440003',
        ];

        mockRequest.body = { taskIds };
        vi.mocked(mockTaskOrchestrator.deleteBulkTasks).mockResolvedValue(3);

        await taskController.deleteBulkTasks(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockTaskOrchestrator.deleteBulkTasks).toHaveBeenCalledWith(
          taskIds
        );
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: '3 tasks deleted successfully',
            meta: expect.objectContaining({
              bulkOperation: true,
              processedCount: 3,
            }),
          })
        );
      });
    });

    describe('completeBulkTasks', () => {
      it('should complete bulk tasks successfully', async () => {
        const taskIds = [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
        ];
        const completedTasks = taskIds.map(id => ({
          id,
          title: `Task ${id}`,
          status: TaskStatus.COMPLETED,
          priority: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
          completedAt: new Date(),
          dependencies: [],
          tags: [],
          implementationNotes: [],
          exitCriteria: [],
        }));

        mockRequest.body = { taskIds };
        vi.mocked(mockTaskOrchestrator.completeBulkTasks).mockResolvedValue(
          completedTasks
        );

        await taskController.completeBulkTasks(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockTaskOrchestrator.completeBulkTasks).toHaveBeenCalledWith(
          taskIds
        );
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: completedTasks,
            message: '2 tasks completed successfully',
            meta: expect.objectContaining({
              bulkOperation: true,
              processedCount: 2,
            }),
          })
        );
      });
    });

    describe('setBulkTaskPriority', () => {
      it('should set bulk task priority successfully', async () => {
        const taskIds = [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
        ];
        const priority = 5;
        const updatedTasks = taskIds.map(id => ({
          id,
          title: `Task ${id}`,
          priority,
          status: TaskStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
          dependencies: [],
          tags: [],
          implementationNotes: [],
          exitCriteria: [],
        }));

        mockRequest.body = { taskIds, priority };
        vi.mocked(mockTaskOrchestrator.setBulkTaskPriority).mockResolvedValue(
          updatedTasks
        );

        await taskController.setBulkTaskPriority(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockTaskOrchestrator.setBulkTaskPriority).toHaveBeenCalledWith(
          taskIds,
          priority
        );
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: updatedTasks,
            message: 'Priority updated for 2 tasks',
            meta: expect.objectContaining({
              bulkOperation: true,
              processedCount: 2,
            }),
          })
        );
      });
    });

    describe('addBulkTaskTags', () => {
      it('should add bulk task tags successfully', async () => {
        const taskIds = [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
        ];
        const tags = ['urgent', 'bug-fix'];
        const updatedTasks = taskIds.map(id => ({
          id,
          title: `Task ${id}`,
          tags,
          status: TaskStatus.PENDING,
          priority: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
          dependencies: [],
          implementationNotes: [],
          exitCriteria: [],
        }));

        mockRequest.body = { taskIds, tags };
        vi.mocked(mockTaskOrchestrator.addBulkTaskTags).mockResolvedValue(
          updatedTasks
        );

        await taskController.addBulkTaskTags(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockTaskOrchestrator.addBulkTaskTags).toHaveBeenCalledWith(
          taskIds,
          tags
        );
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: updatedTasks,
            message: 'Tags added to 2 tasks',
            meta: expect.objectContaining({
              bulkOperation: true,
              processedCount: 2,
            }),
          })
        );
      });
    });

    describe('removeBulkTaskTags', () => {
      it('should remove bulk task tags successfully', async () => {
        const taskIds = [
          '550e8400-e29b-41d4-a716-446655440001',
          '550e8400-e29b-41d4-a716-446655440002',
        ];
        const tags = ['urgent'];
        const updatedTasks = taskIds.map(id => ({
          id,
          title: `Task ${id}`,
          tags: [],
          status: TaskStatus.PENDING,
          priority: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
          dependencies: [],
          implementationNotes: [],
          exitCriteria: [],
        }));

        mockRequest.body = { taskIds, tags };
        vi.mocked(mockTaskOrchestrator.removeBulkTaskTags).mockResolvedValue(
          updatedTasks
        );

        await taskController.removeBulkTaskTags(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockTaskOrchestrator.removeBulkTaskTags).toHaveBeenCalledWith(
          taskIds,
          tags
        );
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: updatedTasks,
            message: 'Tags removed from 2 tasks',
            meta: expect.objectContaining({
              bulkOperation: true,
              processedCount: 2,
            }),
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
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

    it('should map orchestration errors to correct HTTP status codes', async () => {
      const testCases = [
        { errorName: 'ValidationError', expectedStatus: 400 },
        { errorName: 'TaskNotFoundError', expectedStatus: 404 },
        { errorName: 'ListNotFoundError', expectedStatus: 404 },
        { errorName: 'StatusTransitionError', expectedStatus: 409 },
        { errorName: 'CircularDependencyError', expectedStatus: 409 },
        { errorName: 'UnknownError', expectedStatus: 500 },
      ];

      for (const testCase of testCases) {
        const error = new OrchestrationError('Test error', 'test');
        error.name = testCase.errorName;

        mockRequest.params = { id: 'task-123' };
        vi.mocked(mockTaskOrchestrator.getTask).mockRejectedValue(error);

        await taskController.getTask(
          mockRequest as Request,
          mockResponse as Response
        );

        expect(mockResponse.status).toHaveBeenCalledWith(
          testCase.expectedStatus
        );
      }
    });
  });
});
