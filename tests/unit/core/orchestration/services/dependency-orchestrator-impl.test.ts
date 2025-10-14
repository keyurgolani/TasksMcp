/**
 * Unit tests for DependencyOrchestratorImpl
 * Tests circular dependency detection, prevention, and performance requirements
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { DependencyOrchestratorImpl } from '../../../../../src/core/orchestration/services/dependency-orchestrator-impl';
import { DataDelegationService } from '../../../../../src/data/delegation/data-delegation-service';
import { Task } from '../../../../../src/domain/models/task';
import { CircularDependencyError } from '../../../../../src/shared/errors/orchestration-error';
import { DependencyGraph } from '../../../../../src/shared/types/dependency';

describe('DependencyOrchestratorImpl', () => {
  let orchestrator: DependencyOrchestratorImpl;
  let mockDataDelegation: DataDelegationService;

  beforeEach(() => {
    mockDataDelegation = {
      execute: vi.fn(),
    } as unknown as DataDelegationService;

    orchestrator = new DependencyOrchestratorImpl(mockDataDelegation);
  });

  describe('detectCircularDependencies', () => {
    it('should detect simple circular dependency', () => {
      const graph: DependencyGraph = {
        nodes: new Map([
          [
            'task1',
            {
              id: 'task1',
              title: 'Task 1',
              status: 'pending',
              dependencies: ['task2'],
              dependents: [],
              depth: 0,
              isBlocked: false,
            },
          ],
          [
            'task2',
            {
              id: 'task2',
              title: 'Task 2',
              status: 'pending',
              dependencies: ['task1'],
              dependents: [],
              depth: 0,
              isBlocked: false,
            },
          ],
        ]),
        edges: new Map([
          ['task1', ['task2']],
          ['task2', ['task1']],
        ]),
      };

      const result = orchestrator.detectCircularDependencies(graph);

      expect(result.hasCircularDependency).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0].tasks).toEqual(['task1', 'task2', 'task1']);
      expect(result.affectedTasks).toEqual(
        expect.arrayContaining(['task1', 'task2'])
      );
    });

    it('should detect complex circular dependency chain', () => {
      const graph: DependencyGraph = {
        nodes: new Map([
          [
            'task1',
            {
              id: 'task1',
              title: 'Task 1',
              status: 'pending',
              dependencies: ['task2'],
              dependents: [],
              depth: 0,
              isBlocked: false,
            },
          ],
          [
            'task2',
            {
              id: 'task2',
              title: 'Task 2',
              status: 'pending',
              dependencies: ['task3'],
              dependents: [],
              depth: 0,
              isBlocked: false,
            },
          ],
          [
            'task3',
            {
              id: 'task3',
              title: 'Task 3',
              status: 'pending',
              dependencies: ['task1'],
              dependents: [],
              depth: 0,
              isBlocked: false,
            },
          ],
        ]),
        edges: new Map([
          ['task1', ['task2']],
          ['task2', ['task3']],
          ['task3', ['task1']],
        ]),
      };

      const result = orchestrator.detectCircularDependencies(graph);

      expect(result.hasCircularDependency).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0].tasks).toEqual([
        'task1',
        'task2',
        'task3',
        'task1',
      ]);
      expect(result.affectedTasks).toEqual(
        expect.arrayContaining(['task1', 'task2', 'task3'])
      );
    });

    it('should detect multiple separate circular dependencies', () => {
      const graph: DependencyGraph = {
        nodes: new Map([
          [
            'task1',
            {
              id: 'task1',
              title: 'Task 1',
              status: 'pending',
              dependencies: ['task2'],
              dependents: [],
              depth: 0,
              isBlocked: false,
            },
          ],
          [
            'task2',
            {
              id: 'task2',
              title: 'Task 2',
              status: 'pending',
              dependencies: ['task1'],
              dependents: [],
              depth: 0,
              isBlocked: false,
            },
          ],
          [
            'task3',
            {
              id: 'task3',
              title: 'Task 3',
              status: 'pending',
              dependencies: ['task4'],
              dependents: [],
              depth: 0,
              isBlocked: false,
            },
          ],
          [
            'task4',
            {
              id: 'task4',
              title: 'Task 4',
              status: 'pending',
              dependencies: ['task3'],
              dependents: [],
              depth: 0,
              isBlocked: false,
            },
          ],
        ]),
        edges: new Map([
          ['task1', ['task2']],
          ['task2', ['task1']],
          ['task3', ['task4']],
          ['task4', ['task3']],
        ]),
      };

      const result = orchestrator.detectCircularDependencies(graph);

      expect(result.hasCircularDependency).toBe(true);
      expect(result.cycles).toHaveLength(2);
      expect(result.affectedTasks).toEqual(
        expect.arrayContaining(['task1', 'task2', 'task3', 'task4'])
      );
    });

    it('should not detect circular dependencies in valid DAG', () => {
      const graph: DependencyGraph = {
        nodes: new Map([
          [
            'task1',
            {
              id: 'task1',
              title: 'Task 1',
              status: 'pending',
              dependencies: [],
              dependents: [],
              depth: 0,
              isBlocked: false,
            },
          ],
          [
            'task2',
            {
              id: 'task2',
              title: 'Task 2',
              status: 'pending',
              dependencies: ['task1'],
              dependents: [],
              depth: 0,
              isBlocked: false,
            },
          ],
          [
            'task3',
            {
              id: 'task3',
              title: 'Task 3',
              status: 'pending',
              dependencies: ['task1'],
              dependents: [],
              depth: 0,
              isBlocked: false,
            },
          ],
          [
            'task4',
            {
              id: 'task4',
              title: 'Task 4',
              status: 'pending',
              dependencies: ['task2', 'task3'],
              dependents: [],
              depth: 0,
              isBlocked: false,
            },
          ],
        ]),
        edges: new Map([
          ['task1', []],
          ['task2', ['task1']],
          ['task3', ['task1']],
          ['task4', ['task2', 'task3']],
        ]),
      };

      const result = orchestrator.detectCircularDependencies(graph);

      expect(result.hasCircularDependency).toBe(false);
      expect(result.cycles).toHaveLength(0);
      expect(result.affectedTasks).toHaveLength(0);
    });

    it('should handle empty graph', () => {
      const graph: DependencyGraph = {
        nodes: new Map(),
        edges: new Map(),
      };

      const result = orchestrator.detectCircularDependencies(graph);

      expect(result.hasCircularDependency).toBe(false);
      expect(result.cycles).toHaveLength(0);
      expect(result.affectedTasks).toHaveLength(0);
    });

    it('should handle self-dependency', () => {
      const graph: DependencyGraph = {
        nodes: new Map([
          [
            'task1',
            {
              id: 'task1',
              title: 'Task 1',
              status: 'pending',
              dependencies: ['task1'],
              dependents: [],
              depth: 0,
              isBlocked: false,
            },
          ],
        ]),
        edges: new Map([['task1', ['task1']]]),
      };

      const result = orchestrator.detectCircularDependencies(graph);

      expect(result.hasCircularDependency).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0].tasks).toEqual(['task1', 'task1']);
      expect(result.affectedTasks).toEqual(['task1']);
    });

    it('should perform in O(V + E) time complexity', () => {
      // Create a large graph to test performance
      const nodeCount = 1000;
      const nodes = new Map();
      const edges = new Map();

      // Create a linear chain (no cycles) - worst case for DFS
      for (let i = 0; i < nodeCount; i++) {
        const taskId = `task${i}`;
        nodes.set(taskId, {
          id: taskId,
          title: `Task ${i}`,
          status: 'pending',
          dependencies: i > 0 ? [`task${i - 1}`] : [],
          dependents: [],
          depth: 0,
          isBlocked: false,
        });
        edges.set(taskId, i > 0 ? [`task${i - 1}`] : []);
      }

      const graph: DependencyGraph = { nodes, edges };

      const startTime = performance.now();
      const result = orchestrator.detectCircularDependencies(graph);
      const endTime = performance.now();

      const executionTime = endTime - startTime;

      expect(result.hasCircularDependency).toBe(false);
      expect(executionTime).toBeLessThan(100); // Should complete in under 100ms for 1000 nodes
    });
  });

  describe('setTaskDependencies', () => {
    beforeEach(() => {
      // Mock the getTask method to return valid tasks
      vi.mocked(mockDataDelegation.execute).mockImplementation(
        async operation => {
          if (operation.type === 'read' && operation.entity === 'task') {
            const taskId = (operation.filters as any).id;
            return {
              id: taskId,
              title: `Task ${taskId}`,
              status: 'pending',
              dependencies: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            } as Task;
          }
          return null;
        }
      );
    });

    it('should prevent circular dependencies when setting task dependencies', async () => {
      // Mock buildDependencyGraph to return a graph with circular dependency
      const mockBuildGraph = vi.spyOn(
        orchestrator as any,
        'buildDependencyGraph'
      );
      mockBuildGraph.mockResolvedValue({
        nodes: new Map([
          ['task1', { id: 'task1', dependencies: ['task2'] }],
          ['task2', { id: 'task2', dependencies: ['task1'] }],
        ]),
        edges: new Map([
          ['task1', ['task2']],
          ['task2', ['task1']],
        ]),
      });

      await expect(
        orchestrator.setTaskDependencies('task1', ['task2'])
      ).rejects.toThrow(CircularDependencyError);

      mockBuildGraph.mockRestore();
    });

    it('should provide detailed error message for circular dependencies', async () => {
      // Mock buildDependencyGraph to return a graph with circular dependency
      const mockBuildGraph = vi.spyOn(
        orchestrator as any,
        'buildDependencyGraph'
      );
      mockBuildGraph.mockResolvedValue({
        nodes: new Map([
          ['task1', { id: 'task1', dependencies: ['task2'] }],
          ['task2', { id: 'task2', dependencies: ['task3'] }],
          ['task3', { id: 'task3', dependencies: ['task1'] }],
        ]),
        edges: new Map([
          ['task1', ['task2']],
          ['task2', ['task3']],
          ['task3', ['task1']],
        ]),
      });

      try {
        await orchestrator.setTaskDependencies('task1', ['task2']);
        expect.fail('Should have thrown CircularDependencyError');
      } catch (error) {
        expect(error).toBeInstanceOf(CircularDependencyError);
        expect((error as CircularDependencyError).message).toContain(
          'Circular dependency detected in chain'
        );
        expect((error as CircularDependencyError).message).toContain('→');
        expect((error as CircularDependencyError).actionableGuidance).toContain(
          'remove one of the following dependencies'
        );
      }

      mockBuildGraph.mockRestore();
    });

    it('should allow valid dependencies without cycles', async () => {
      // Mock buildDependencyGraph to return a valid DAG
      const mockBuildGraph = vi.spyOn(
        orchestrator as any,
        'buildDependencyGraph'
      );
      mockBuildGraph.mockResolvedValue({
        nodes: new Map([
          ['task1', { id: 'task1', dependencies: ['task2'] }],
          ['task2', { id: 'task2', dependencies: [] }],
        ]),
        edges: new Map([
          ['task1', ['task2']],
          ['task2', []],
        ]),
      });

      // Mock the update operation
      vi.mocked(mockDataDelegation.execute).mockImplementation(
        async operation => {
          if (operation.type === 'update') {
            return { success: true };
          }
          if (operation.type === 'read') {
            return {
              id: (operation.filters as any).id,
              title: 'Test Task',
              status: 'pending',
              dependencies: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            } as Task;
          }
          return null;
        }
      );

      await expect(
        orchestrator.setTaskDependencies('task1', ['task2'])
      ).resolves.not.toThrow();

      mockBuildGraph.mockRestore();
    });
  });

  describe('validateDependencies', () => {
    beforeEach(() => {
      // Mock the getTask method to return valid tasks
      vi.mocked(mockDataDelegation.execute).mockImplementation(
        async operation => {
          if (operation.type === 'read' && operation.entity === 'task') {
            const taskId = (operation.filters as any).id;
            if (taskId === 'nonexistent') {
              throw new Error('Task not found');
            }
            return {
              id: taskId,
              title: `Task ${taskId}`,
              status: 'pending',
              dependencies: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            } as Task;
          }
          return null;
        }
      );
    });

    it('should validate dependencies successfully for valid tasks', async () => {
      const result = await orchestrator.validateDependencies('list1', [
        'task1',
        'task2',
      ]);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid dependency references', async () => {
      const result = await orchestrator.validateDependencies('list1', [
        'task1',
        'nonexistent',
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Dependency task nonexistent not found');
    });

    it('should detect circular dependencies in validation', async () => {
      // Mock buildDependencyGraph to return a circular dependency
      const mockBuildGraph = vi.spyOn(
        orchestrator as any,
        'buildDependencyGraph'
      );
      mockBuildGraph.mockResolvedValue({
        nodes: new Map([
          [
            'temp-validation-123',
            { id: 'temp-validation-123', dependencies: ['task1'] },
          ],
          ['task1', { id: 'task1', dependencies: ['temp-validation-123'] }],
        ]),
        edges: new Map([
          ['temp-validation-123', ['task1']],
          ['task1', ['temp-validation-123']],
        ]),
      });

      const result = await orchestrator.validateDependencies('list1', [
        'task1',
      ]);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(error =>
          error.includes('Circular dependency detected')
        )
      ).toBe(true);

      mockBuildGraph.mockRestore();
    });
  });

  describe('calculateBlockReason', () => {
    it('should calculate block reason for task with incomplete dependencies', async () => {
      // Mock task retrieval
      vi.mocked(mockDataDelegation.execute).mockImplementation(
        async operation => {
          const taskId = (operation.filters as any).id;
          if (taskId === 'blocked-task') {
            return {
              id: 'blocked-task',
              title: 'Blocked Task',
              status: 'pending',
              dependencies: ['dep1', 'dep2'],
              createdAt: new Date(),
              updatedAt: new Date(),
            } as Task;
          }
          if (taskId === 'dep1') {
            return {
              id: 'dep1',
              title: 'Dependency 1',
              status: 'in_progress',
              estimatedDuration: 120,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as Task;
          }
          if (taskId === 'dep2') {
            return {
              id: 'dep2',
              title: 'Dependency 2',
              status: 'pending',
              createdAt: new Date(),
              updatedAt: new Date(),
            } as Task;
          }
          return null;
        }
      );

      const blockReason =
        await orchestrator.calculateBlockReason('blocked-task');

      expect(blockReason.blockedBy).toEqual(['dep1', 'dep2']);
      expect(blockReason.details).toHaveLength(2);
      expect(blockReason.details[0].taskId).toBe('dep1');
      expect(blockReason.details[0].status).toBe('in_progress');
      expect(blockReason.details[0].estimatedCompletion).toBeInstanceOf(Date);
      expect(blockReason.details[1].taskId).toBe('dep2');
      expect(blockReason.details[1].status).toBe('pending');
    });
  });

  describe('getReadyTasks', () => {
    it('should return tasks with no incomplete dependencies', async () => {
      // Mock search operation to return tasks
      vi.mocked(mockDataDelegation.execute).mockImplementation(
        async operation => {
          if (operation.type === 'search') {
            return [
              {
                id: 'ready-task',
                title: 'Ready Task',
                status: 'pending',
                dependencies: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              },
              {
                id: 'blocked-task',
                title: 'Blocked Task',
                status: 'pending',
                dependencies: ['incomplete-dep'],
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ] as Task[];
          }
          if (operation.type === 'read') {
            const taskId = (operation.filters as any).id;
            if (taskId === 'incomplete-dep') {
              return {
                id: 'incomplete-dep',
                title: 'Incomplete Dependency',
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
              } as Task;
            }
          }
          return null;
        }
      );

      const readyTasks = await orchestrator.getReadyTasks('list1');

      expect(readyTasks).toHaveLength(1);
      expect(readyTasks[0].id).toBe('ready-task');
    });

    it('should respect limit parameter', async () => {
      // Mock search operation to return multiple ready tasks
      vi.mocked(mockDataDelegation.execute).mockImplementation(
        async operation => {
          if (operation.type === 'search') {
            return [
              { id: 'task1', dependencies: [], status: 'pending' },
              { id: 'task2', dependencies: [], status: 'pending' },
              { id: 'task3', dependencies: [], status: 'pending' },
            ] as Task[];
          }
          return null;
        }
      );

      const readyTasks = await orchestrator.getReadyTasks('list1', 2);

      expect(readyTasks.length).toBeLessThanOrEqual(2);
    });
  });
});
