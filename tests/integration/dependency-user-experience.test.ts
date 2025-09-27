/**
 * User Experience tests for dependency management features
 * Tests that dependency features are intuitive, not overwhelming, and enhance existing tools
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TodoListManager } from '../../src/domain/lists/todo-list-manager.js';
import { MemoryStorageBackend } from '../../src/infrastructure/storage/memory-storage.js';
import { Priority, TaskStatus } from '../../src/shared/types/todo.js';
import type { TodoList, TodoItem } from '../../src/shared/types/todo.js';
import type { CallToolRequest } from '../../src/shared/types/mcp-types.js';

// Import dependency handlers
import { handleSetTaskDependencies } from '../../src/api/handlers/set-task-dependencies.js';
import { handleGetReadyTasks } from '../../src/api/handlers/get-ready-tasks.js';
import { handleAnalyzeTaskDependencies } from '../../src/api/handlers/analyze-task-dependencies.js';

// Import enhanced existing handlers
import { handleAddTask } from '../../src/api/handlers/add-task.js';
import { handleGetList } from '../../src/api/handlers/get-list.js';
import { handleSearchTool } from '../../src/api/handlers/search-tool.js';
import { handleShowTasks } from '../../src/api/handlers/show-tasks.js';

describe('Dependency Management User Experience Tests', () => {
  let todoListManager: TodoListManager;
  let storage: MemoryStorageBackend;
  let testList: TodoList;

  beforeEach(async () => {
    storage = new MemoryStorageBackend();
    todoListManager = new TodoListManager(storage);
    await todoListManager.initialize();

    // Create a simple test list for UX testing
    testList = await todoListManager.createTodoList({
      title: 'UX Test Project',
      description: 'Testing user experience of dependency features',
      tasks: [
        {
          title: 'Setup Project',
          description: 'Initialize the project structure',
          priority: Priority.HIGH,
          estimatedDuration: 60,
        },
        {
          title: 'Write Code',
          description: 'Implement the main functionality',
          priority: Priority.MEDIUM,
          estimatedDuration: 120,
        },
        {
          title: 'Write Tests',
          description: 'Create comprehensive test suite',
          priority: Priority.MEDIUM,
          estimatedDuration: 90,
        },
        {
          title: 'Deploy',
          description: 'Deploy to production',
          priority: Priority.HIGH,
          estimatedDuration: 30,
        },
      ],
      projectTag: 'ux-test',
    });
  });

  afterEach(async () => {
    await todoListManager.shutdown();
  });

  describe('Error Messages are Clear and Actionable', () => {
    it('should provide clear error message for circular dependencies', async () => {
      const task1 = testList.items[0]!;
      const task2 = testList.items[1]!;

      // Set task2 to depend on task1
      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            dependencyIds: [task1.id],
          },
        },
      }, todoListManager);

      // Try to create circular dependency (task1 depends on task2)
      const result = await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task1.id,
            dependencyIds: [task2.id],
          },
        },
      }, todoListManager);

      expect(result.isError).toBe(true);
      const errorMessage = result.content[0]?.text as string;
      
      // Error message should be clear and actionable
      expect(errorMessage).toContain('Circular dependencies detected');
      expect(errorMessage).toMatch(/circular.*dependencies/i);
      
      // Should not contain technical jargon or confusing details
      expect(errorMessage).not.toContain('graph');
      expect(errorMessage).not.toContain('node');
      expect(errorMessage).not.toContain('edge');
    });

    it('should provide helpful error message for self-dependency', async () => {
      const task1 = testList.items[0]!;

      const result = await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task1.id,
            dependencyIds: [task1.id],
          },
        },
      }, todoListManager);

      expect(result.isError).toBe(true);
      const errorMessage = result.content[0]?.text as string;
      
      expect(errorMessage).toContain('cannot depend on itself');
      expect(errorMessage).toMatch(/cannot.*depend.*itself/i);
      
      // Should be simple and clear
      expect(errorMessage.length).toBeLessThan(200);
    });

    it('should provide clear error message for non-existent dependencies', async () => {
      const task1 = testList.items[0]!;
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const result = await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task1.id,
            dependencyIds: [fakeId],
          },
        },
      }, todoListManager);

      expect(result.isError).toBe(true);
      const errorMessage = result.content[0]?.text as string;
      
      expect(errorMessage).toContain('Invalid dependencies');
      expect(errorMessage).toMatch(/not found|invalid|exist/i);
      
      // Should suggest what to do
      expect(errorMessage).toMatch(/check|verify|valid/i);
    });

    it('should provide helpful error message for invalid list ID', async () => {
      const fakeListId = '00000000-0000-0000-0000-000000000000';

      const result = await handleGetReadyTasks({
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: fakeListId,
          },
        },
      }, todoListManager);

      expect(result.isError).toBe(true);
      const errorMessage = result.content[0]?.text as string;
      
      expect(errorMessage).toContain('Todo list not found');
      expect(errorMessage).toMatch(/not found|does not exist/i);
      
      // Should be concise and clear
      expect(errorMessage.length).toBeLessThan(80);
    });
  });

  describe('Dependency Information Enhances Rather Than Clutters', () => {
    it('should include dependency info in get_list without overwhelming the response', async () => {
      const task1 = testList.items[0]!;
      const task2 = testList.items[1]!;

      // Set up a simple dependency
      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            dependencyIds: [task1.id],
          },
        },
      }, todoListManager);

      const result = await handleGetList({
        method: 'tools/call',
        params: {
          name: 'get_list',
          arguments: {
            listId: testList.id,
          },
        },
      }, todoListManager);

      expect(result.isError).toBeFalsy();
      const listData = JSON.parse(result.content[0]?.text as string);
      
      // Should include dependency information
      const task2InList = listData.tasks.find((task: any) => task.id === task2.id);
      expect(task2InList.dependencies).toEqual([task1.id]);
      expect(task2InList.isReady).toBe(false);
      
      // But should not overwhelm with too much detail
      expect(task2InList).not.toHaveProperty('dependencyGraph');
      expect(task2InList).not.toHaveProperty('criticalPath');
      expect(task2InList).not.toHaveProperty('complexityScore');
      
      // Should maintain all original task information
      expect(task2InList.title).toBe(task2.title);
      expect(task2InList.description).toBe(task2.description);
      expect(task2InList.priority).toBe(task2.priority);
      expect(task2InList.status).toBe(task2.status);
    });

    it('should show dependency status in show_tasks without cluttering the display', async () => {
      const task1 = testList.items[0]!;
      const task2 = testList.items[1]!;
      const task3 = testList.items[2]!;

      // Set up dependencies: task3 -> task2 -> task1
      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            dependencyIds: [task1.id],
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task3.id,
            dependencyIds: [task2.id],
          },
        },
      }, todoListManager);

      const result = await handleShowTasks({
        method: 'tools/call',
        params: {
          name: 'show_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      }, todoListManager);

      expect(result.isError).toBeFalsy();
      const displayText = result.content[0]?.text as string;
      
      // Should show dependency status clearly but not overwhelmingly
      expect(displayText).toMatch(/ready|blocked|dependencies/i);
      
      // Should not be overly verbose or technical
      expect(displayText).not.toContain('dependency graph');
      expect(displayText).not.toContain('circular dependency detection');
      expect(displayText).not.toContain('topological sort');
      
      // Should maintain readability
      const lines = displayText.split('\n');
      expect(lines.length).toBeLessThan(50); // Reasonable length for 4 tasks
      
      // Each task should be clearly identifiable
      expect(displayText).toContain(task1.title);
      expect(displayText).toContain(task2.title);
      expect(displayText).toContain(task3.title);
    });

    it('should provide intuitive filtering by dependency status', async () => {
      const task1 = testList.items[0]!;
      const task2 = testList.items[1]!;

      // Set up dependency
      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            dependencyIds: [task1.id],
          },
        },
      }, todoListManager);

      // Filter for ready tasks
      const readyResult = await handleSearchTool({
        method: 'tools/call',
        params: {
          name: 'search_tool',
          arguments: {
            listId: testList.id,
            isReady: true,
            includeDependencyInfo: true,
          },
        },
      }, todoListManager);

      expect(readyResult.isError).toBeFalsy();
      const readyData = JSON.parse(readyResult.content[0]?.text as string);
      
      // Should return ready tasks
      expect(readyData.results.length).toBeGreaterThan(0);
      for (const task of readyData.results) {
        expect(task.isReady).toBe(true);
      }

      // Filter for blocked tasks
      const blockedResult = await handleSearchTool({
        method: 'tools/call',
        params: {
          name: 'search_tool',
          arguments: {
            listId: testList.id,
            isBlocked: true,
            includeDependencyInfo: true,
          },
        },
      }, todoListManager);

      expect(blockedResult.isError).toBeFalsy();
      const blockedData = JSON.parse(blockedResult.content[0]?.text as string);
      
      // Should return blocked tasks
      expect(blockedData.results.length).toBeGreaterThan(0);
      for (const task of blockedData.results) {
        expect(task.isReady).toBe(false);
        expect(task.dependencies.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Dependency Features are Intuitive and Not Overwhelming', () => {
    it('should provide simple and actionable ready tasks suggestions', async () => {
      const task1 = testList.items[0]!;
      const task2 = testList.items[1]!;
      const task3 = testList.items[2]!;

      // Set up dependencies
      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            dependencyIds: [task1.id],
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task3.id,
            dependencyIds: [task2.id],
          },
        },
      }, todoListManager);

      const result = await handleGetReadyTasks({
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      }, todoListManager);

      expect(result.isError).toBeFalsy();
      const readyData = JSON.parse(result.content[0]?.text as string);
      
      // Should provide clear next actions
      expect(readyData.nextActions).toBeDefined();
      expect(readyData.nextActions.length).toBeGreaterThan(0);
      
      // Next actions should be in plain language
      for (const action of readyData.nextActions) {
        expect(action).toMatch(/start|focus|work|priority|task/i);
        expect(action).not.toContain('dependency graph');
        expect(action).not.toContain('topological');
        expect(action).not.toContain('algorithm');
        
        // Should be reasonably short and actionable
        expect(action.length).toBeLessThan(200);
      }

      // Should include summary information that's easy to understand
      expect(readyData.summary).toBeDefined();
      expect(readyData.summary.totalTasks).toBe(4);
      expect(readyData.summary.readyTasks).toBeGreaterThan(0);
      expect(readyData.summary.blockedTasks).toBeGreaterThan(0);
    });

    it('should provide user-friendly dependency analysis', async () => {
      const task1 = testList.items[0]!;
      const task2 = testList.items[1]!;
      const task3 = testList.items[2]!;
      const task4 = testList.items[3]!;

      // Set up a realistic dependency chain
      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            dependencyIds: [task1.id],
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task3.id,
            dependencyIds: [task2.id],
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task4.id,
            dependencyIds: [task3.id],
          },
        },
      }, todoListManager);

      const result = await handleAnalyzeTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'analyze_task_dependencies',
          arguments: {
            listId: testList.id,
          },
        },
      }, todoListManager);

      expect(result.isError).toBeFalsy();
      const analysisData = JSON.parse(result.content[0]?.text as string);
      
      // Should provide clear summary
      expect(analysisData.summary).toBeDefined();
      expect(analysisData.summary.totalTasks).toBe(4);
      expect(analysisData.summary.readyTasks).toBeGreaterThan(0);
      
      // Should identify critical path in user-friendly way
      expect(analysisData.criticalPath).toBeDefined();
      expect(analysisData.criticalPath.length).toBeGreaterThan(0);
      
      // Recommendations should be in plain language
      expect(analysisData.recommendations).toBeDefined();
      expect(analysisData.recommendations.length).toBeGreaterThan(0);
      
      for (const recommendation of analysisData.recommendations) {
        // Should be actionable and clear
        expect(recommendation).toMatch(/focus|start|complete|priority|task/i);
        
        // Should not be overly technical
        expect(recommendation).not.toContain('algorithm');
        expect(recommendation).not.toContain('complexity');
        expect(recommendation).not.toContain('optimization');
        
        // Should be reasonably concise
        expect(recommendation.length).toBeLessThan(300);
      }
    });

    it('should handle adding tasks with dependencies intuitively', async () => {
      const existingTask = testList.items[0]!;

      // Add a new task with dependencies using the enhanced add_task
      const result = await handleAddTask({
        method: 'tools/call',
        params: {
          name: 'add_task',
          arguments: {
            listId: testList.id,
            title: 'Review Code',
            description: 'Review the implemented code',
            priority: Priority.MEDIUM,
            dependencies: [existingTask.id],
          },
        },
      }, todoListManager);

      expect(result.isError).toBeFalsy();
      const taskData = JSON.parse(result.content[0]?.text as string);
      
      // Should successfully create task with dependencies
      expect(taskData.title).toBe('Review Code');
      expect(taskData.dependencies).toEqual([existingTask.id]);
      
      // Should provide clear confirmation (message field may not exist in add_task response)
      if (taskData.message) {
        expect(taskData.message).toMatch(/added|created|success/i);
      }
      
      // Should not overwhelm with technical details
      expect(taskData).not.toHaveProperty('dependencyGraph');
      expect(taskData).not.toHaveProperty('validationDetails');
    });
  });

  describe('Edge Cases are Handled Gracefully', () => {
    it('should handle empty lists gracefully', async () => {
      // Create an empty list
      const emptyList = await todoListManager.createTodoList({
        title: 'Empty List',
        description: 'A list with no tasks',
        tasks: [],
      });

      const readyResult = await handleGetReadyTasks({
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: emptyList.id,
          },
        },
      }, todoListManager);

      expect(readyResult.isError).toBeFalsy();
      const readyData = JSON.parse(readyResult.content[0]?.text as string);
      
      expect(readyData.readyTasks).toEqual([]);
      expect(readyData.totalReady).toBe(0);
      expect(readyData.nextActions).toBeDefined();
      expect(readyData.nextActions.length).toBeGreaterThan(0);
      
      // Should provide helpful guidance for empty lists
      const actionText = readyData.nextActions.join(' ');
      expect(actionText).toMatch(/completed|add|create|task/i);
    });

    it('should handle tasks with no dependencies gracefully', async () => {
      // All tasks in testList have no dependencies initially
      const result = await handleGetReadyTasks({
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      }, todoListManager);

      expect(result.isError).toBeFalsy();
      const readyData = JSON.parse(result.content[0]?.text as string);
      
      // All tasks should be ready
      expect(readyData.readyTasks.length).toBe(4);
      expect(readyData.totalReady).toBe(4);
      
      // Should provide appropriate guidance
      expect(readyData.nextActions.length).toBeGreaterThan(0);
      const actionText = readyData.nextActions.join(' ');
      expect(actionText).toMatch(/start|priority|high/i);
    });

    it('should handle analysis of lists with no dependencies', async () => {
      const result = await handleAnalyzeTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'analyze_task_dependencies',
          arguments: {
            listId: testList.id,
          },
        },
      }, todoListManager);

      expect(result.isError).toBeFalsy();
      const analysisData = JSON.parse(result.content[0]?.text as string);
      
      expect(analysisData.summary.totalTasks).toBe(4);
      expect(analysisData.summary.tasksWithDependencies).toBe(0);
      // Critical path may include tasks even without dependencies
      expect(analysisData.criticalPath).toBeDefined();
      expect(analysisData.issues.circularDependencies).toEqual([]);
      expect(analysisData.issues.bottlenecks).toEqual([]);
      
      // Should still provide useful recommendations
      expect(analysisData.recommendations.length).toBeGreaterThan(0);
      const recommendationText = analysisData.recommendations.join(' ');
      expect(recommendationText).toMatch(/ready|start|priority/i);
    });

    it('should handle filtering when no tasks match criteria', async () => {
      // Filter for blocked tasks when none exist
      const result = await handleSearchTool({
        method: 'tools/call',
        params: {
          name: 'search_tool',
          arguments: {
            listId: testList.id,
            isBlocked: true,
          },
        },
      }, todoListManager);

      expect(result.isError).toBeFalsy();
      const filterData = JSON.parse(result.content[0]?.text as string);
      
      expect(filterData.results).toEqual([]);
      expect(filterData.totalCount).toBe(0);
      expect(filterData.hasMore).toBe(false);
      
      // Should handle empty results gracefully without errors
    });

    it('should provide clear guidance when all tasks are completed', async () => {
      // Complete all tasks
      for (const task of testList.items) {
        await todoListManager.updateTodoList({
          listId: testList.id,
          action: 'update_status',
          itemId: task.id,
          itemData: { status: TaskStatus.COMPLETED },
        });
      }

      const result = await handleGetReadyTasks({
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      }, todoListManager);

      expect(result.isError).toBeFalsy();
      const readyData = JSON.parse(result.content[0]?.text as string);
      
      expect(readyData.readyTasks).toEqual([]);
      expect(readyData.totalReady).toBe(0);
      
      // Should provide positive completion message
      const actionText = readyData.nextActions.join(' ');
      expect(actionText).toMatch(/completed|done|finished|congratulations/i);
    });
  });

  describe('Response Formats are Consistent and User-Friendly', () => {
    it('should maintain consistent date formatting across all tools', async () => {
      const task1 = testList.items[0]!;
      const task2 = testList.items[1]!;

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            dependencyIds: [task1.id],
          },
        },
      }, todoListManager);

      // Check get_list date format
      const listResult = await handleGetList({
        method: 'tools/call',
        params: {
          name: 'get_list',
          arguments: {
            listId: testList.id,
          },
        },
      }, todoListManager);

      const listData = JSON.parse(listResult.content[0]?.text as string);
      const taskInList = listData.tasks[0];
      
      // Should use ISO string format
      expect(taskInList.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(taskInList.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Check ready tasks date format
      const readyResult = await handleGetReadyTasks({
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: testList.id,
          },
        },
      }, todoListManager);

      const readyData = JSON.parse(readyResult.content[0]?.text as string);
      if (readyData.readyTasks.length > 0) {
        const readyTask = readyData.readyTasks[0];
        expect(readyTask.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        expect(readyTask.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    });

    it('should use consistent field names across all dependency-enhanced tools', async () => {
      const task1 = testList.items[0]!;
      const task2 = testList.items[1]!;

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            dependencyIds: [task1.id],
          },
        },
      }, todoListManager);

      // Check field consistency across tools
      const tools = [
        () => handleGetList({
          method: 'tools/call',
          params: { name: 'get_list', arguments: { listId: testList.id } },
        }, todoListManager),
        () => handleSearchTool({
          method: 'tools/call',
          params: { name: 'search_tool', arguments: { listId: testList.id, includeDependencyInfo: true } },
        }, todoListManager),
        () => handleGetReadyTasks({
          method: 'tools/call',
          params: { name: 'get_ready_tasks', arguments: { listId: testList.id } },
        }, todoListManager),
      ];

      for (const toolCall of tools) {
        const result = await toolCall();
        expect(result.isError).toBeFalsy();
        
        const data = JSON.parse(result.content[0]?.text as string);
        let tasks: any[] = [];
        
        if (data.tasks) tasks = data.tasks;
        else if (data.results) tasks = data.results;
        else if (data.readyTasks) tasks = data.readyTasks;
        
        if (tasks.length > 0) {
          const task = tasks.find((t: any) => t.id === task2.id);
          if (task) {
            // Should have consistent dependency field names
            expect(task).toHaveProperty('dependencies');
            expect(task).toHaveProperty('isReady');
            expect(task.dependencies).toBeInstanceOf(Array);
            expect(typeof task.isReady).toBe('boolean');
          }
        }
      }
    });

    it('should provide appropriate response sizes (not too verbose, not too sparse)', async () => {
      const task1 = testList.items[0]!;
      const task2 = testList.items[1]!;

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: testList.id,
            taskId: task2.id,
            dependencyIds: [task1.id],
          },
        },
      }, todoListManager);

      // Test response sizes
      const analysisResult = await handleAnalyzeTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'analyze_task_dependencies',
          arguments: {
            listId: testList.id,
          },
        },
      }, todoListManager);

      const analysisText = analysisResult.content[0]?.text as string;
      const analysisData = JSON.parse(analysisText);
      
      // Should not be overly verbose
      expect(analysisText.length).toBeLessThan(5000); // Reasonable size for 4 tasks
      
      // Should include essential information
      expect(analysisData.summary).toBeDefined();
      expect(analysisData.recommendations).toBeDefined();
      expect(analysisData.criticalPath).toBeDefined();
      
      // Recommendations should be concise but helpful
      for (const rec of analysisData.recommendations) {
        expect(rec.length).toBeGreaterThan(10); // Not too sparse
        expect(rec.length).toBeLessThan(300); // Not too verbose
      }
    });
  });
});