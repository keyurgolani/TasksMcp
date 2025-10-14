/**
 * Unit tests for PrettyPrintFormatter
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  type TaskList,
  type Task,
  type ActionPlan,
  type ActionStep,
  type ImplementationNote,
  TaskStatus,
  Priority,
} from '../../../../src/shared/types/task.js';
import {
  PrettyPrintFormatter,
  type FormatOptions,
} from '../../../../src/shared/utils/pretty-print-formatter.js';

describe('PrettyPrintFormatter', () => {
  let formatter: PrettyPrintFormatter;
  let mockTaskList: TaskList;
  let mockTask: Task;
  let mockActionPlan: ActionPlan;

  beforeEach(() => {
    formatter = new PrettyPrintFormatter();

    // Create mock action steps
    const mockSteps: ActionStep[] = [
      {
        id: 'step-1',
        content: 'First step',
        status: 'completed',
        completedAt: new Date('2024-01-01'),
        order: 1,
      },
      {
        id: 'step-2',
        content: 'Second step',
        status: 'in_progress',
        order: 2,
      },
      {
        id: 'step-3',
        content: 'Third step',
        status: 'pending',
        order: 3,
      },
    ];

    // Create mock action plan
    mockActionPlan = {
      id: 'plan-1',
      content: 'Test action plan content',
      steps: mockSteps,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      version: 1,
    };

    // Create mock implementation notes
    const mockNotes: ImplementationNote[] = [
      {
        id: 'note-1',
        content: 'This is a technical note about implementation details',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        type: 'technical',
      },
      {
        id: 'note-2',
        content: 'This is a decision note',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        type: 'decision',
      },
    ];

    // Create mock task
    mockTask = {
      id: 'task-1',
      title: 'Test Task',
      description: 'This is a test task description',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      dependencies: ['task-0'],
      estimatedDuration: 60,
      tags: ['frontend', 'urgent'],
      metadata: {},
      actionPlan: mockActionPlan,
      implementationNotes: mockNotes,
    };

    // Create mock task list
    mockTaskList = {
      id: 'list-1',
      title: 'Test Project',
      description: 'A test project for unit testing',
      items: [
        mockTask,
        {
          id: 'task-2',
          title: 'Completed Task',
          status: TaskStatus.COMPLETED,
          priority: Priority.MEDIUM,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          completedAt: new Date('2024-01-02'),
          dependencies: [],
          tags: [],
          metadata: {},
          implementationNotes: [],
        },
        {
          id: 'task-3',
          title: 'Blocked Task',
          status: TaskStatus.BLOCKED,
          priority: Priority.CRITICAL,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          dependencies: [],
          tags: ['backend'],
          metadata: {},
          implementationNotes: [],
        },
      ],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      context: 'test-project',
      projectTag: 'test-project',

      totalItems: 3,
      completedItems: 1,
      progress: 33,
      analytics: {
        totalItems: 3,
        completedItems: 1,
        inProgressItems: 1,
        blockedItems: 1,
        progress: 33,
        averageCompletionTime: 60,
        estimatedTimeRemaining: 120,
        velocityMetrics: {
          itemsPerDay: 1,
          completionRate: 0.33,
        },
        complexityDistribution: {},
        tagFrequency: { frontend: 1, urgent: 1, backend: 1 },
        dependencyGraph: [],
      },
      metadata: {},
      implementationNotes: [
        {
          id: 'list-note-1',
          content: 'This is a list-level note',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          type: 'general',
        },
      ],
    };
  });

  describe('formatTaskList', () => {
    it('should format a complete task list with default options', () => {
      const result = formatter.formatTaskList(mockTaskList);

      expect(result.content).toContain('Test Project [test-project]');
      expect(result.content).toContain('Tasks: 1/3 completed');
      expect(result.content).toContain('List Notes:');
      expect(result.content).toContain('Test Task');
      expect(result.content).toContain('Completed Task');
      expect(result.content).toContain('Blocked Task');
      expect(result.metadata.itemCount).toBe(3);
    });

    it('should format task list with compact mode', () => {
      const options: Partial<FormatOptions> = { compactMode: true };
      const result = formatter.formatTaskList(mockTaskList, options);

      expect(result.content).toContain('Test Task');
      expect(result.content).toContain('60min, #frontend #urgent');
      expect(result.content).not.toContain('This is a test task description');
    });

    it('should format task list without notes', () => {
      const options: Partial<FormatOptions> = { includeNotes: false };
      const result = formatter.formatTaskList(mockTaskList, options);

      expect(result.content).not.toContain('List Notes:');
      expect(result.content).not.toContain('This is a list-level note');
    });

    it('should format task list without action plans', () => {
      const options: Partial<FormatOptions> = { includeActionPlans: false };
      const result = formatter.formatTaskList(mockTaskList, options);

      expect(result.content).not.toContain('Action Plan:');
      expect(result.content).not.toContain('First step');
    });

    it('should format task list without progress bars', () => {
      const options: Partial<FormatOptions> = { includeProgress: false };
      const result = formatter.formatTaskList(mockTaskList, options);

      expect(result.content).not.toContain('[█');
      expect(result.content).not.toContain('%]');
    });

    it('should format task list with colorized output', () => {
      const options: Partial<FormatOptions> = { colorize: true };
      const result = formatter.formatTaskList(mockTaskList, options);

      expect(result.content).toContain('\u001b['); // ANSI color codes
    });

    it('should group tasks by status', () => {
      const options: Partial<FormatOptions> = { groupBy: 'status' };
      const result = formatter.formatTaskList(mockTaskList, options);

      expect(result.content).toContain('In Progress (1)');
      expect(result.content).toContain('Completed (1)');
      expect(result.content).toContain('Blocked (1)');
    });

    it('should group tasks by priority', () => {
      const options: Partial<FormatOptions> = { groupBy: 'priority' };
      const result = formatter.formatTaskList(mockTaskList, options);

      expect(result.content).toContain('Critical (1)');
      expect(result.content).toContain('High (1)');
      expect(result.content).toContain('Medium (1)');
    });

    it('should handle empty task list', () => {
      const emptyList = {
        ...mockTaskList,
        items: [],
        totalItems: 0,
        completedItems: 0,
      };
      const result = formatter.formatTaskList(emptyList);

      expect(result.content).toContain('No tasks found');
      expect(result.metadata.itemCount).toBe(0);
    });

    it('should show task IDs when requested', () => {
      const options: Partial<FormatOptions> = { showIds: true };
      const result = formatter.formatTaskList(mockTaskList, options);

      expect(result.content).toContain('(list-1)');
      expect(result.content).toContain('(task-1)');
    });

    it('should respect maxWidth setting', () => {
      const options: Partial<FormatOptions> = { maxWidth: 40 };
      const result = formatter.formatTaskList(mockTaskList, options);

      const lines = result.content.split('\n');
      // Most lines should respect the width limit (allowing some flexibility for formatting)
      const longLines = lines.filter(
        line =>
          line.replace(
            new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g'),
            ''
          ).length > 50
      );
      expect(longLines.length).toBeLessThan(lines.length / 2);
    });
  });

  describe('formatTask', () => {
    it('should format a single task with all details', () => {
      const result = formatter.formatTask(mockTask);

      expect(result.content).toContain('◐ Test Task ⬆');
      expect(result.content).toContain('This is a test task description');
      expect(result.content).toContain('Duration: 60min');
      expect(result.content).toContain('Dependencies: 1');
      expect(result.content).toContain('Tags: #frontend #urgent');
      expect(result.content).toContain('Action Plan:');
      expect(result.content).toContain('Notes:');
    });

    it('should format task in compact mode', () => {
      const options: Partial<FormatOptions> = { compactMode: true };
      const result = formatter.formatTask(mockTask, options);

      expect(result.content).toContain('◐ Test Task ⬆');
      expect(result.content).not.toContain('This is a test task description');
      expect(result.content).not.toContain('Duration: 60min');
    });

    it('should handle task without optional fields', () => {
      const minimalTask: Task = {
        id: 'minimal-task',
        title: 'Minimal Task',
        status: TaskStatus.PENDING,
        priority: Priority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
        dependencies: [],
        tags: [],
        metadata: {},
        implementationNotes: [],
      };

      const result = formatter.formatTask(minimalTask);

      expect(result.content).toContain('○ Minimal Task');
      expect(result.content).not.toContain('Duration:');
      expect(result.content).not.toContain('Tags:');
      expect(result.content).not.toContain('Action Plan:');
    });

    it('should format completed task with completion date', () => {
      const completedTask: Task = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        completedAt: new Date('2024-01-15'),
      };

      const result = formatter.formatTask(completedTask);

      expect(result.content).toContain('● Test Task');
      expect(result.content).toContain('Completed:');
      // Check that some date is present (format may vary by locale)
      expect(result.content).toMatch(/Completed: \d+\/\d+\/\d+/);
    });
  });

  describe('formatTaskSummary', () => {
    it('should format summary statistics', () => {
      const result = formatter.formatTaskSummary(mockTaskList.items);

      expect(result.content).toContain('Task Summary:');
      expect(result.content).toContain('Total Tasks: 3');
      expect(result.content).toContain('Progress: 1/3 (33%)');
      expect(result.content).toContain('Status Breakdown:');
      expect(result.content).toContain('In Progress: 1');
      expect(result.content).toContain('Completed: 1');
      expect(result.content).toContain('Blocked: 1');
      expect(result.content).toContain('Priority Breakdown:');
      expect(result.content).toContain('Critical: 1');
      expect(result.content).toContain('High: 1');
      expect(result.content).toContain('Medium: 1');
    });

    it('should handle empty task array', () => {
      const result = formatter.formatTaskSummary([]);

      expect(result.content).toContain('Total Tasks: 0');
      expect(result.content).toContain('Progress: 0/0 (0%)');
    });

    it('should format summary without progress bars', () => {
      const options: Partial<FormatOptions> = { includeProgress: false };
      const result = formatter.formatTaskSummary(mockTaskList.items, options);

      expect(result.content).not.toContain('[█');
      expect(result.content).toContain('Total Tasks: 3');
    });
  });

  describe('formatProgressBar', () => {
    it('should format progress bar with completion', () => {
      const result = formatter.formatProgressBar(3, 10);

      expect(result).toContain('[');
      expect(result).toContain(']');
      expect(result).toContain('30%');
    });

    it('should format progress bar with no tasks', () => {
      const result = formatter.formatProgressBar(0, 0);

      expect(result).toContain('[no tasks]');
    });

    it('should format progress bar with full completion', () => {
      const result = formatter.formatProgressBar(5, 5);

      expect(result).toContain('100%');
    });

    it('should format colorized progress bar', () => {
      const options: Partial<FormatOptions> = { colorize: true };
      const result = formatter.formatProgressBar(2, 5, options);

      expect(result).toContain('\u001b['); // ANSI color codes
      expect(result).toContain('40%');
    });
  });

  describe('formatActionPlan', () => {
    it('should format action plan with steps', () => {
      const result = formatter.formatActionPlan(mockActionPlan);

      expect(result).toContain('Action Plan:');
      expect(result).toContain('Progress: 1/3 steps completed');
      expect(result).toContain('1. ● First step');
      expect(result).toContain('2. ◐ Second step');
      expect(result).toContain('3. ○ Third step');
    });

    it('should format action plan without progress', () => {
      const options: Partial<FormatOptions> = { includeProgress: false };
      const result = formatter.formatActionPlan(mockActionPlan, options);

      expect(result).toContain('Action Plan:');
      expect(result).not.toContain('Progress: 1/3 steps completed');
      expect(result).toContain('1. ● First step');
    });

    it('should handle action plan with no steps', () => {
      const planWithoutSteps: ActionPlan = {
        ...mockActionPlan,
        steps: [],
      };

      const result = formatter.formatActionPlan(planWithoutSteps);

      expect(result).toContain('Action Plan:');
      expect(result).toContain('Test action plan content');
    });

    it('should format colorized action plan', () => {
      const options: Partial<FormatOptions> = { colorize: true };
      const result = formatter.formatActionPlan(mockActionPlan, options);

      expect(result).toContain('\u001b['); // ANSI color codes
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle malformed task data gracefully', () => {
      const malformedTask = {
        ...mockTask,
        status: 'invalid-status' as TaskStatus,
        priority: 999 as Priority,
      };

      const result = formatter.formatTask(malformedTask);

      expect(result.content).toContain('Test Task');
      expect(result.metadata.itemCount).toBe(1);
    });

    it('should handle very long text content', () => {
      const longText = 'A'.repeat(1000);
      const taskWithLongContent: Task = {
        ...mockTask,
        title: longText,
        description: longText,
      };

      const options: Partial<FormatOptions> = {
        maxWidth: 80,
        truncateNotes: 50,
      };
      const result = formatter.formatTask(taskWithLongContent, options);

      expect(result.content).toContain('...');
      expect(result.content.length).toBeLessThan(longText.length * 2);
    });

    it('should handle null/undefined values gracefully', () => {
      const taskWithNulls: Task = {
        ...mockTask,
        description: undefined,
        estimatedDuration: undefined,
        completedAt: undefined,
        actionPlan: undefined,
        implementationNotes: [],
      };

      const result = formatter.formatTask(taskWithNulls);

      expect(result.content).toContain('Test Task');
      expect(result.metadata.itemCount).toBe(1);
    });

    it('should handle empty strings and arrays', () => {
      const emptyTask: Task = {
        ...mockTask,
        title: '',
        description: '',
        tags: [],
        dependencies: [],
        implementationNotes: [],
      };

      const result = formatter.formatTask(emptyTask);

      expect(result.metadata.itemCount).toBe(1);
    });

    it('should maintain consistent metadata', () => {
      const result = formatter.formatTaskList(mockTaskList);

      expect(result.metadata.itemCount).toBe(mockTaskList.items.length);
      expect(result.metadata.totalLines).toBeGreaterThan(0);
      expect(result.metadata.totalCharacters).toBe(result.content.length);
      expect(result.metadata.groupCount).toBeGreaterThan(0);
    });
  });

  describe('formatting consistency', () => {
    it('should produce consistent output for same input', () => {
      const result1 = formatter.formatTask(mockTask);
      const result2 = formatter.formatTask(mockTask);

      expect(result1.content).toBe(result2.content);
      expect(result1.metadata).toEqual(result2.metadata);
    });

    it('should handle different option combinations', () => {
      const options1: Partial<FormatOptions> = {
        colorize: true,
        compactMode: true,
        includeNotes: false,
      };

      const options2: Partial<FormatOptions> = {
        colorize: false,
        compactMode: false,
        includeActionPlans: false,
      };

      const result1 = formatter.formatTaskList(mockTaskList, options1);
      const result2 = formatter.formatTaskList(mockTaskList, options2);

      expect(result1.content).not.toBe(result2.content);
      expect(result1.metadata.itemCount).toBe(result2.metadata.itemCount);
    });
  });
});
