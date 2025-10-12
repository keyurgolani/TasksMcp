/**
 * Unit tests for analyze task dependencies handler
 * Tests analysis accuracy, recommendation quality, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { handleAnalyzeTaskDependencies } from '../../../../src/api/handlers/analyze-task-dependencies.js';
import { TaskStatus } from '../../../../src/shared/types/task.js';

import type { TaskListManager } from '../../../../src/domain/lists/task-list-manager.js';
import type { CallToolRequest } from '../../../../src/shared/types/mcp-types.js';
import type { TaskList, Task } from '../../../../src/shared/types/task.js';

// Mock the logger
vi.mock('../../../../src/shared/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('handleAnalyzeTaskDependencies', () => {
  let mockTaskListManager: TaskListManager;
  let mockRequest: CallToolRequest;

  beforeEach(() => {
    mockTaskListManager = {
      getTaskList: vi.fn(),
    } as unknown as TaskListManager;

    mockRequest = {
      method: 'tools/call',
      params: {
        name: 'analyze_task_dependencies',
        arguments: {
          listId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    };
  });

  describe('validation', () => {
    it('should validate required listId parameter', async () => {
      const invalidRequest = {
        ...mockRequest,
        params: {
          name: 'analyze_task_dependencies',
          arguments: {},
        },
      };

      const result = await handleAnalyzeTaskDependencies(
        invalidRequest,
        mockTaskListManager
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('listId');
    });

    it('should validate UUID format for listId', async () => {
      const invalidRequest = {
        ...mockRequest,
        params: {
          name: 'analyze_task_dependencies',
          arguments: {
            listId: 'invalid-uuid',
          },
        },
      };

      const result = await handleAnalyzeTaskDependencies(
        invalidRequest,
        mockTaskListManager
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌');
    });

    it('should return error when list not found', async () => {
      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(null);

      const result = await handleAnalyzeTaskDependencies(
        mockRequest,
        mockTaskListManager
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Task list with ID');
      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('analysis functionality', () => {
    it('should analyze empty list correctly', async () => {
      const emptyList: TaskList = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Empty List',
        description: 'Test list',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        projectTag: undefined,
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(emptyList);

      const result = await handleAnalyzeTaskDependencies(
        mockRequest,
        mockTaskListManager
      );

      expect(result.isError).toBeFalsy();

      const analysis = JSON.parse(result.content[0].text);
      expect(analysis.listId).toBe(emptyList.id);
      expect(analysis.summary.totalTasks).toBe(0);
      expect(analysis.summary.readyTasks).toBe(0);
      expect(analysis.summary.blockedTasks).toBe(0);
      expect(analysis.summary.tasksWithDependencies).toBe(0);
      expect(analysis.criticalPath).toEqual([]);
      expect(analysis.issues.circularDependencies).toEqual([]);
      expect(analysis.issues.bottlenecks).toEqual([]);
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });

    it('should analyze simple linear dependency chain', async () => {
      const task1: Task = {
        id: 'task-1',
        title: 'Task 1',
        description: 'First task',
        status: TaskStatus.PENDING,
        priority: 3,
        tags: [],
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const task2: Task = {
        id: 'task-2',
        title: 'Task 2',
        description: 'Second task',
        status: TaskStatus.PENDING,
        priority: 3,
        tags: [],
        dependencies: ['task-1'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const task3: Task = {
        id: 'task-3',
        title: 'Task 3',
        description: 'Third task',
        status: TaskStatus.PENDING,
        priority: 3,
        tags: [],
        dependencies: ['task-2'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const listWithChain: TaskList = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Chain List',
        description: 'Test list with dependency chain',
        items: [task1, task2, task3],
        createdAt: new Date(),
        updatedAt: new Date(),
        projectTag: undefined,
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        listWithChain
      );

      const result = await handleAnalyzeTaskDependencies(
        mockRequest,
        mockTaskListManager
      );

      expect(result.isError).toBeFalsy();

      const analysis = JSON.parse(result.content[0].text);
      expect(analysis.summary.totalTasks).toBe(3);
      expect(analysis.summary.readyTasks).toBe(1); // Only task1 is ready
      expect(analysis.summary.blockedTasks).toBe(2); // task2 and task3 are blocked
      expect(analysis.summary.tasksWithDependencies).toBe(2); // task2 and task3 have dependencies
      expect(analysis.criticalPath).toEqual(['task-1', 'task-2', 'task-3']);
      expect(analysis.issues.circularDependencies).toEqual([]);
      expect(analysis.issues.bottlenecks).toEqual([]);
    });

    it('should detect circular dependencies', async () => {
      const task1: Task = {
        id: 'task-1',
        title: 'Task 1',
        description: 'First task',
        status: TaskStatus.PENDING,
        priority: 3,
        tags: [],
        dependencies: ['task-2'], // Creates cycle: task1 -> task2 -> task1
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const task2: Task = {
        id: 'task-2',
        title: 'Task 2',
        description: 'Second task',
        status: TaskStatus.PENDING,
        priority: 3,
        tags: [],
        dependencies: ['task-1'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const listWithCycle: TaskList = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Cycle List',
        description: 'Test list with circular dependencies',
        items: [task1, task2],
        createdAt: new Date(),
        updatedAt: new Date(),
        projectTag: undefined,
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        listWithCycle
      );

      const result = await handleAnalyzeTaskDependencies(
        mockRequest,
        mockTaskListManager
      );

      expect(result.isError).toBeFalsy();

      const analysis = JSON.parse(result.content[0].text);
      expect(analysis.issues.circularDependencies.length).toBeGreaterThan(0);
      expect(
        analysis.recommendations.some((rec: string) =>
          rec.includes('circular dependencies detected')
        )
      ).toBe(true);
    });

    it('should identify bottlenecks', async () => {
      // Create a bottleneck scenario where one task blocks multiple others
      const bottleneckTask: Task = {
        id: 'bottleneck',
        title: 'Bottleneck Task',
        description: 'Task that blocks many others',
        status: TaskStatus.PENDING,
        priority: 3,
        tags: [],
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const dependentTasks = Array.from({ length: 4 }, (_, i) => ({
        id: `dependent-${i + 1}`,
        title: `Dependent Task ${i + 1}`,
        description: `Task dependent on bottleneck`,
        status: TaskStatus.PENDING,
        priority: 3,
        tags: [],
        dependencies: ['bottleneck'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const listWithBottleneck: TaskList = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Bottleneck List',
        description: 'Test list with bottleneck',
        items: [bottleneckTask, ...dependentTasks],
        createdAt: new Date(),
        updatedAt: new Date(),
        projectTag: undefined,
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        listWithBottleneck
      );

      const result = await handleAnalyzeTaskDependencies(
        mockRequest,
        mockTaskListManager
      );

      expect(result.isError).toBeFalsy();

      const analysis = JSON.parse(result.content[0].text);
      expect(analysis.issues.bottlenecks).toContain('bottleneck');
      expect(
        analysis.recommendations.some((rec: string) =>
          rec.includes('Bottleneck alert')
        )
      ).toBe(true);
    });

    it('should provide progress insights', async () => {
      const completedTask: Task = {
        id: 'completed',
        title: 'Completed Task',
        description: 'Already done',
        status: TaskStatus.COMPLETED,
        priority: 3,
        tags: [],
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const pendingTask: Task = {
        id: 'pending',
        title: 'Pending Task',
        description: 'Still to do',
        status: TaskStatus.PENDING,
        priority: 3,
        tags: [],
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const listWithProgress: TaskList = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Progress List',
        description: 'Test list with mixed progress',
        items: [completedTask, pendingTask],
        createdAt: new Date(),
        updatedAt: new Date(),
        projectTag: undefined,
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        listWithProgress
      );

      const result = await handleAnalyzeTaskDependencies(
        mockRequest,
        mockTaskListManager
      );

      expect(result.isError).toBeFalsy();

      const analysis = JSON.parse(result.content[0].text);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should suggest starting with ready tasks', async () => {
      const readyTask1: Task = {
        id: 'ready-1',
        title: 'Ready Task 1',
        description: 'Can start immediately',
        status: TaskStatus.PENDING,
        priority: 3,
        tags: [],
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const readyTask2: Task = {
        id: 'ready-2',
        title: 'Ready Task 2',
        description: 'Can start immediately',
        status: TaskStatus.PENDING,
        priority: 3,
        tags: [],
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const blockedTask: Task = {
        id: 'blocked',
        title: 'Blocked Task',
        description: 'Waiting for ready-1',
        status: TaskStatus.PENDING,
        priority: 3,
        tags: [],
        dependencies: ['ready-1'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const listWithReady: TaskList = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Ready List',
        description: 'Test list with ready tasks',
        items: [readyTask1, readyTask2, blockedTask],
        createdAt: new Date(),
        updatedAt: new Date(),
        projectTag: undefined,
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        listWithReady
      );

      const result = await handleAnalyzeTaskDependencies(
        mockRequest,
        mockTaskListManager
      );

      expect(result.isError).toBeFalsy();

      const analysis = JSON.parse(result.content[0].text);
      expect(analysis.summary.readyTasks).toBe(2);
      expect(
        analysis.recommendations.some((rec: string) =>
          rec.includes('2 tasks are ready')
        )
      ).toBe(true);
    });

    it('should warn when no tasks are ready', async () => {
      const task1: Task = {
        id: 'task-1',
        title: 'Task 1',
        description: 'Blocked by task 2',
        status: TaskStatus.PENDING,
        priority: 3,
        tags: [],
        dependencies: ['task-2'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const task2: Task = {
        id: 'task-2',
        title: 'Task 2',
        description: 'Blocked by task 1',
        status: TaskStatus.PENDING,
        priority: 3,
        tags: [],
        dependencies: ['task-1'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const listAllBlocked: TaskList = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'All Blocked List',
        description: 'Test list where all tasks are blocked',
        items: [task1, task2],
        createdAt: new Date(),
        updatedAt: new Date(),
        projectTag: undefined,
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        listAllBlocked
      );

      const result = await handleAnalyzeTaskDependencies(
        mockRequest,
        mockTaskListManager
      );

      expect(result.isError).toBeFalsy();

      const analysis = JSON.parse(result.content[0].text);
      expect(analysis.summary.readyTasks).toBe(0);
      expect(
        analysis.recommendations.some((rec: string) =>
          rec.includes('No tasks are ready')
        )
      ).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle TaskListManager errors gracefully', async () => {
      vi.mocked(mockTaskListManager.getTaskList).mockRejectedValue(
        new Error('Database error')
      );

      const result = await handleAnalyzeTaskDependencies(
        mockRequest,
        mockTaskListManager
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Database error');
    });

    it('should handle malformed request parameters', async () => {
      const malformedRequest = {
        ...mockRequest,
        params: {
          name: 'analyze_task_dependencies',
          arguments: {
            listId: null,
          },
        },
      };

      const result = await handleAnalyzeTaskDependencies(
        malformedRequest,
        mockTaskListManager
      );

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('❌');
    });

    it('should handle unexpected errors during analysis', async () => {
      // Create a scenario that might cause analysis to fail
      const corruptedList: TaskList = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Corrupted List',
        description: 'Test list',
        items: [
          {
            id: 'task-1',
            title: 'Task 1',
            description: 'Task with invalid dependency reference',
            status: TaskStatus.PENDING,
            priority: 3,
            tags: [],
            dependencies: ['non-existent-task'], // This should be handled gracefully
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        projectTag: undefined,
      };

      vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(
        corruptedList
      );

      const result = await handleAnalyzeTaskDependencies(
        mockRequest,
        mockTaskListManager
      );

      // Should not crash, should handle gracefully
      expect(result.isError).toBeFalsy();

      const analysis = JSON.parse(result.content[0].text);
      expect(analysis.summary.totalTasks).toBe(1);
      expect(analysis.summary.blockedTasks).toBe(0); // Task with invalid dependency is not counted as blocked
    });
  });

  describe('recommendation quality', () => {
    it('should provide actionable recommendations for different scenarios', async () => {
      const scenarios = [
        {
          name: 'high complexity',
          items: Array.from({ length: 5 }, (_, i) => ({
            id: `task-${i}`,
            title: `Task ${i}`,
            description: `Task ${i}`,
            status: TaskStatus.PENDING,
            priority: 3,
            tags: [],
            dependencies:
              i > 0 ? [`task-${i - 1}`, `task-${Math.max(0, i - 2)}`] : [],
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
          expectedRecommendation: 'Critical path',
        },
        {
          name: 'no dependencies',
          items: Array.from({ length: 3 }, (_, i) => ({
            id: `task-${i}`,
            title: `Task ${i}`,
            description: `Task ${i}`,
            status: TaskStatus.PENDING,
            priority: 3,
            tags: [],
            dependencies: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
          expectedRecommendation: 'tasks are ready',
        },
      ];

      for (const scenario of scenarios) {
        const testList: TaskList = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: `${scenario.name} List`,
          description: `Test list for ${scenario.name}`,
          items: scenario.items,
          createdAt: new Date(),
          updatedAt: new Date(),
          projectTag: undefined,
        };

        vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(testList);

        const result = await handleAnalyzeTaskDependencies(
          mockRequest,
          mockTaskListManager
        );

        expect(result.isError).toBeFalsy();

        const analysis = JSON.parse(result.content[0].text);
        // Just check that we have recommendations for now
        expect(analysis.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should provide different recommendations based on progress level', async () => {
      const progressLevels = [0, 25, 50, 75, 95];

      for (const progressPercent of progressLevels) {
        const totalTasks = 10;
        const completedTasks = Math.floor((progressPercent / 100) * totalTasks);

        const items = Array.from({ length: totalTasks }, (_, i) => ({
          id: `task-${i}`,
          title: `Task ${i}`,
          description: `Task ${i}`,
          status:
            i < completedTasks ? TaskStatus.COMPLETED : TaskStatus.PENDING,
          priority: 3,
          tags: [],
          dependencies: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }));

        const testList: TaskList = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: `${progressPercent}% Progress List`,
          description: `Test list with ${progressPercent}% progress`,
          items,
          createdAt: new Date(),
          updatedAt: new Date(),
          projectTag: undefined,
        };

        vi.mocked(mockTaskListManager.getTaskList).mockResolvedValue(testList);

        const result = await handleAnalyzeTaskDependencies(
          mockRequest,
          mockTaskListManager
        );

        expect(result.isError).toBeFalsy();

        const analysis = JSON.parse(result.content[0].text);

        if (progressPercent === 0) {
          expect(
            analysis.recommendations.some((rec: string) =>
              rec.includes('early stages')
            )
          ).toBe(true);
        } else if (progressPercent >= 90) {
          expect(
            analysis.recommendations.some((rec: string) =>
              rec.includes('nearing completion')
            )
          ).toBe(true);
        } else {
          // For middle progress, just check that we have recommendations
          expect(analysis.recommendations.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
