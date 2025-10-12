/**
 * Unit tests to verify complete removal of task ordering features
 *
 * These tests ensure that:
 * - No task ordering code exists anywhere in codebase
 * - Dependencies determine execution order correctly
 * - get_ready_tasks returns unblocked tasks without ordering
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

import { DependencyResolver } from '../../../src/domain/tasks/dependency-manager.js';
import {
  TaskStatus,
  Priority,
  type Task,
} from '../../../src/shared/types/task.js';

describe('Task Ordering Removal Verification', () => {
  describe('Code Analysis', () => {
    it('should not contain any order field references in TypeScript files', () => {
      const srcDir = join(process.cwd(), 'src');
      const orderReferences = findOrderReferences(srcDir);

      // Filter out legitimate uses (like import order, sort order for notes, etc.)
      const taskOrderReferences = orderReferences.filter(
        ref =>
          !ref.content.includes('import') &&
          !ref.content.includes('sortOrder') &&
          !ref.content.includes('notes') &&
          !ref.content.includes('getNotesHistory') &&
          !ref.file.includes('notes-manager.ts')
      );

      expect(taskOrderReferences).toEqual([]);
    });

    it('should not contain any sorting functionality in search tools', () => {
      const searchToolPath = join(
        process.cwd(),
        'src/api/handlers/search-tool.ts'
      );
      const content = readFileSync(searchToolPath, 'utf-8');

      expect(content).not.toContain('sortBy');
      expect(content).not.toContain('sortOrder');
      expect(content).not.toContain('applySorting');
    });

    it('should not contain GetTaskListSorting interface', () => {
      const taskTypesPath = join(process.cwd(), 'src/shared/types/task.ts');
      const content = readFileSync(taskTypesPath, 'utf-8');

      expect(content).not.toContain('GetTaskListSorting');
    });

    it('should not have order field in ActionStep interface', () => {
      const taskTypesPath = join(process.cwd(), 'src/shared/types/task.ts');
      const content = readFileSync(taskTypesPath, 'utf-8');

      // Check that ActionStep interface doesn't have order field
      const actionStepMatch = content.match(
        /export interface ActionStep \{[^}]+\}/s
      );
      expect(actionStepMatch).toBeTruthy();
      expect(actionStepMatch![0]).not.toContain('order:');
    });

    it('should not have order field in ExitCriteria interface', () => {
      const taskTypesPath = join(process.cwd(), 'src/shared/types/task.ts');
      const content = readFileSync(taskTypesPath, 'utf-8');

      // Check that ExitCriteria interface doesn't have order field
      const exitCriteriaMatch = content.match(
        /export interface ExitCriteria \{[^}]+\}/s
      );
      expect(exitCriteriaMatch).toBeTruthy();
      expect(exitCriteriaMatch![0]).not.toContain('order:');
    });

    it('should not contain reorderItems method', () => {
      const taskListManagerPath = join(
        process.cwd(),
        'src/domain/lists/task-list-manager.ts'
      );
      const content = readFileSync(taskListManagerPath, 'utf-8');

      expect(content).not.toContain('reorderItems');
      expect(content).not.toContain('reorder');
    });
  });

  describe('Dependency-Based Ordering', () => {
    it('should return tasks based on dependency completion, not ordering', () => {
      const dependencyResolver = new DependencyResolver();

      // Create test tasks with dependencies
      const task1: Task = createTestTask('1', 'Task 1', []);
      const task2: Task = createTestTask('2', 'Task 2', ['1']);
      const task3: Task = createTestTask('3', 'Task 3', ['2']);
      const task4: Task = createTestTask('4', 'Task 4', []);

      const tasks = [task4, task3, task2, task1]; // Intentionally out of "order"

      // Get ready tasks (should be task1 and task4 since they have no dependencies)
      const readyTasks = dependencyResolver.getReadyItems(tasks);

      expect(readyTasks).toHaveLength(2);
      expect(readyTasks.map(t => t.id).sort()).toEqual(['1', '4']);

      dependencyResolver.cleanup();
    });

    it('should return ready tasks without any ordering constraints', () => {
      const dependencyResolver = new DependencyResolver();

      // Create tasks where dependency completion determines readiness
      const completedTask: Task = createTestTask(
        'completed',
        'Completed Task',
        [],
        TaskStatus.COMPLETED
      );
      const readyTask1: Task = createTestTask('ready1', 'Ready Task 1', [
        'completed',
      ]);
      const readyTask2: Task = createTestTask('ready2', 'Ready Task 2', [
        'completed',
      ]);
      const blockedTask: Task = createTestTask('blocked', 'Blocked Task', [
        'pending',
      ]);
      const pendingTask: Task = createTestTask('pending', 'Pending Task', []);

      const tasks = [
        blockedTask,
        readyTask2,
        pendingTask,
        readyTask1,
        completedTask,
      ];

      const readyTasks = dependencyResolver.getReadyItems(tasks);

      // Should return ready1, ready2, and pending (all have no incomplete dependencies)
      expect(readyTasks).toHaveLength(3);
      const readyIds = readyTasks.map(t => t.id).sort();
      expect(readyIds).toEqual(['pending', 'ready1', 'ready2']);

      dependencyResolver.cleanup();
    });

    it('should handle complex dependency chains without ordering', () => {
      const dependencyResolver = new DependencyResolver();

      // Create a complex dependency chain
      const taskA: Task = createTestTask('A', 'Task A', []);
      const taskB: Task = createTestTask('B', 'Task B', ['A']);
      const taskC: Task = createTestTask('C', 'Task C', ['A']);
      const taskD: Task = createTestTask('D', 'Task D', ['B', 'C']);
      const taskE: Task = createTestTask('E', 'Task E', []);

      const tasks = [taskD, taskB, taskE, taskC, taskA]; // Mixed order

      // Initially, only A and E should be ready
      let readyTasks = dependencyResolver.getReadyItems(tasks);
      expect(readyTasks.map(t => t.id).sort()).toEqual(['A', 'E']);

      // Complete task A
      taskA.status = TaskStatus.COMPLETED;
      taskA.completedAt = new Date();

      // Now B and C should be ready
      readyTasks = dependencyResolver.getReadyItems(tasks);
      expect(readyTasks.map(t => t.id).sort()).toEqual(['B', 'C', 'E']);

      dependencyResolver.cleanup();
    });
  });

  describe('MCP Tools Verification', () => {
    it('should not have sortBy or sortOrder parameters in search tool definition', () => {
      const toolsPath = join(process.cwd(), 'src/api/tools/definitions.ts');
      const content = readFileSync(toolsPath, 'utf-8');

      // Find the search_tool definition
      const searchToolMatch = content.match(
        /name: 'search_tool'[\s\S]*?(?=\{[\s\S]*?name: '|$)/
      );
      expect(searchToolMatch).toBeTruthy();

      const searchToolDef = searchToolMatch![0];
      expect(searchToolDef).not.toContain('sortBy');
      expect(searchToolDef).not.toContain('sortOrder');
    });

    it('should not reference sorting in tool descriptions', () => {
      const toolsPath = join(process.cwd(), 'src/api/tools/definitions.ts');
      const content = readFileSync(toolsPath, 'utf-8');

      // Check that search tool description doesn't mention sorting
      expect(content).not.toContain('sorting options');
      expect(content).toContain('flexible criteria'); // Should still mention filtering
    });
  });
});

/**
 * Helper function to recursively find order field references in TypeScript files
 */
function findOrderReferences(
  dir: string
): Array<{ file: string; line: number; content: string }> {
  const references: Array<{ file: string; line: number; content: string }> = [];

  function searchDirectory(currentDir: string) {
    const items = readdirSync(currentDir);

    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules, dist, coverage, etc.
        if (!['node_modules', 'dist', 'coverage', '.git'].includes(item)) {
          searchDirectory(fullPath);
        }
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          // Look for order field references (but not import statements)
          if (
            (line.includes('order:') || line.includes('.order')) &&
            !line.trim().startsWith('//') &&
            !line.trim().startsWith('*')
          ) {
            references.push({
              file: fullPath,
              line: index + 1,
              content: line.trim(),
            });
          }
        });
      }
    }
  }

  searchDirectory(dir);
  return references;
}

/**
 * Helper function to create test tasks
 */
function createTestTask(
  id: string,
  title: string,
  dependencies: string[] = [],
  status: TaskStatus = TaskStatus.PENDING
): Task {
  return {
    id,
    title,
    description: `Test task: ${title}`,
    status,
    priority: Priority.MEDIUM,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: status === TaskStatus.COMPLETED ? new Date() : undefined,
    dependencies,
    estimatedDuration: 60,
    tags: ['test'],
    metadata: {},
    implementationNotes: [],
    exitCriteria: [],
  };
}
