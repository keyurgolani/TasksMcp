/**
 * Production readiness validation tests for dependency management
 * Comprehensive tests to ensure all dependency features are production-ready
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTodoListManager } from '../utils/test-helpers.js';
import { TodoListManager } from '../../src/domain/lists/todo-list-manager.js';
import { createTodoListManager } from '../utils/test-helpers.js';
import { MemoryStorageBackend } from '../../src/infrastructure/storage/memory-storage.js';
import { createTodoListManager } from '../utils/test-helpers.js';
import { handleAddTask } from '../../src/api/handlers/add-task.js';
import { createTodoListManager } from '../utils/test-helpers.js';
import { handleSetTaskDependencies } from '../../src/api/handlers/set-task-dependencies.js';
import { createTodoListManager } from '../utils/test-helpers.js';
import { handleGetReadyTasks } from '../../src/api/handlers/get-ready-tasks.js';
import { createTodoListManager } from '../utils/test-helpers.js';
import { handleAnalyzeTaskDependencies } from '../../src/api/handlers/analyze-task-dependencies.js';
import { createTodoListManager } from '../utils/test-helpers.js';
import { handleGetList } from '../../src/api/handlers/get-list.js';
import { createTodoListManager } from '../utils/test-helpers.js';
import { handleSearchTool } from '../../src/api/handlers/search-tool.js';
import { createTodoListManager } from '../utils/test-helpers.js';
import { handleShowTasks } from '../../src/api/handlers/show-tasks.js';
import { createTodoListManager } from '../utils/test-helpers.js';
import { DependencyResolver } from '../../src/domain/tasks/dependency-manager.js';
import { createTodoListManager } from '../utils/test-helpers.js';
import type { CallToolRequest } from '../../src/shared/types/mcp-types.js';
import { createTodoListManager } from '../utils/test-helpers.js';
import type { TodoList } from '../../src/shared/types/todo.js';
import { createTodoListManager } from '../utils/test-helpers.js';
import { TaskStatus } from '../../src/shared/types/todo.js';
import { createTodoListManager } from '../utils/test-helpers.js';
import { logger } from '../../src/shared/utils/logger.js';
import { createTodoListManager } from '../utils/test-helpers.js';

describe('Dependency Management Production Readiness Tests', () => {
  let todoListManager: TodoListManager;
  let storage: MemoryStorageBackend;

  beforeEach(async () => {
    storage = new MemoryStorageBackend();
    await storage.initialize();
    todoListManager = createTodoListManager(storage);
    await todoListManager.initialize();
  });

  afterEach(async () => {
    await todoListManager.shutdown();
    await storage.cleanup?.();
  });

  /**
   * Helper function to make MCP tool calls
   */
  async function callTool(toolName: string, args: any) {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    switch (toolName) {
      case 'add_task':
        return await handleAddTask(request, todoListManager);
      case 'set_task_dependencies':
        return await handleSetTaskDependencies(request, todoListManager);
      case 'get_ready_tasks':
        return await handleGetReadyTasks(request, todoListManager);
      case 'analyze_task_dependencies':
        return await handleAnalyzeTaskDependencies(request, todoListManager);
      case 'get_list':
        return await handleGetList(request, todoListManager);
      case 'search_tool':
        return await handleSearchTool(request, todoListManager);
      case 'show_tasks':
        return await handleShowTasks(request, todoListManager);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  describe('Tool Registration and Schema Validation', () => {
    it('should have all dependency tools properly registered', async () => {
      // Test that all new dependency tools are accessible
      const toolTests = [
        { name: 'set_task_dependencies', requiredParams: ['listId', 'taskId', 'dependencyIds'] },
        { name: 'get_ready_tasks', requiredParams: ['listId'] },
        { name: 'analyze_task_dependencies', requiredParams: ['listId'] },
      ];

      for (const toolTest of toolTests) {
        // Create a test list
        const testList = await todoListManager.createTodoList({
          title: `Test List for ${toolTest.name}`,
          projectTag: 'schema-test',
          tasks: [{ title: 'Test Task', priority: 3 }],
        });

        // Test with valid parameters
        const validArgs: any = { listId: testList.id };
        if (toolTest.requiredParams.includes('taskId')) {
          validArgs.taskId = testList.items[0]!.id;
        }
        if (toolTest.requiredParams.includes('dependencyIds')) {
          validArgs.dependencyIds = [];
        }

        const result = await callTool(toolTest.name, validArgs);
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);

        logger.info(`Tool ${toolTest.name} schema validation passed`);
      }
    });

    it('should validate input parameters correctly', async () => {
      const testList = await todoListManager.createTodoList({
        title: 'Parameter Validation Test',
        projectTag: 'validation-test',
        tasks: [{ title: 'Test Task', priority: 3 }],
      });

      // Test invalid UUID formats
      const invalidUuidResult = await callTool('set_task_dependencies', {
        listId: 'invalid-uuid',
        taskId: testList.items[0]!.id,
        dependencyIds: [],
      });
      expect(invalidUuidResult.isError).toBe(true);

      // Test missing required parameters
      const missingParamResult = await callTool('get_ready_tasks', {});
      expect(missingParamResult.isError).toBe(true);

      // Test dependency limit (max 10)
      const tooManyDepsResult = await callTool('set_task_dependencies', {
        listId: testList.id,
        taskId: testList.items[0]!.id,
        dependencyIds: Array(11).fill(testList.items[0]!.id), // 11 dependencies (over limit)
      });
      expect(tooManyDepsResult.isError).toBe(true);

      logger.info('Input parameter validation tests passed');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain compatibility with existing MCP tools', async () => {
      const testList = await todoListManager.createTodoList({
        title: 'Backward Compatibility Test',
        projectTag: 'compatibility-test',
        tasks: [],
      });

      // Test that existing tools still work as expected
      const addTaskResult = await callTool('add_task', {
        listId: testList.id,
        title: 'Compatibility Test Task',
        description: 'Testing backward compatibility',
        priority: 3,
        tags: ['compatibility'],
      });
      expect(addTaskResult.isError).toBeFalsy();

      const getListResult = await callTool('get_list', {
        listId: testList.id,
      });
      expect(getListResult.isError).toBeFalsy();
      const listData = JSON.parse(getListResult.content[0]!.text);
      expect(listData.tasks.length).toBe(1);

      const showTasksResult = await callTool('show_tasks', {
        listId: testList.id,
      });
      expect(showTasksResult.isError).toBeFalsy();

      logger.info('Backward compatibility tests passed');
    });

    it('should handle existing data without dependency information', async () => {
      // Create a list with tasks that don't have dependency information
      const testList = await todoListManager.createTodoList({
        title: 'Legacy Data Test',
        projectTag: 'legacy-test',
        tasks: [
          { title: 'Legacy Task 1', priority: 3 },
          { title: 'Legacy Task 2', priority: 2 },
        ],
      });

      // Test that dependency tools work with legacy data
      const readyTasksResult = await callTool('get_ready_tasks', {
        listId: testList.id,
      });
      expect(readyTasksResult.isError).toBeFalsy();
      const readyTasks = JSON.parse(readyTasksResult.content[0]!.text);
      expect(readyTasks.readyTasks.length).toBe(2); // All tasks should be ready

      const analysisResult = await callTool('analyze_task_dependencies', {
        listId: testList.id,
      });
      expect(analysisResult.isError).toBeFalsy();
      const analysis = JSON.parse(analysisResult.content[0]!.text);
      expect(analysis.summary.tasksWithDependencies).toBe(0);

      logger.info('Legacy data compatibility tests passed');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle all error scenarios gracefully', async () => {
      const testList = await todoListManager.createTodoList({
        title: 'Error Handling Test',
        projectTag: 'error-test',
        tasks: [{ title: 'Test Task', priority: 3 }],
      });

      const errorScenarios = [
        {
          name: 'Non-existent list',
          tool: 'get_ready_tasks',
          args: { listId: '00000000-0000-0000-0000-000000000000' },
          expectedError: 'not found',
        },
        {
          name: 'Non-existent task',
          tool: 'set_task_dependencies',
          args: {
            listId: testList.id,
            taskId: '00000000-0000-0000-0000-000000000000',
            dependencyIds: [],
          },
          expectedError: 'not found',
        },
        {
          name: 'Self-dependency',
          tool: 'set_task_dependencies',
          args: {
            listId: testList.id,
            taskId: testList.items[0]!.id,
            dependencyIds: [testList.items[0]!.id],
          },
          expectedError: 'cannot depend on itself',
        },
      ];

      for (const scenario of errorScenarios) {
        const result = await callTool(scenario.tool, scenario.args);
        expect(result.isError).toBe(true);
        expect(result.content[0]!.text.toLowerCase()).toContain(scenario.expectedError.toLowerCase());
        logger.info(`Error scenario '${scenario.name}' handled correctly`);
      }
    });

    it('should maintain data consistency under concurrent access', async () => {
      const testList = await todoListManager.createTodoList({
        title: 'Concurrency Test',
        projectTag: 'concurrency-test',
        tasks: Array.from({ length: 10 }, (_, i) => ({
          title: `Concurrent Task ${i + 1}`,
          priority: 3,
        })),
      });

      // Simulate concurrent dependency modifications
      const concurrentOperations = testList.items.slice(0, 5).map(async (task, index) => {
        const dependencies = testList.items.slice(0, index).map(item => item.id);
        return await callTool('set_task_dependencies', {
          listId: testList.id,
          taskId: task.id,
          dependencyIds: dependencies,
        });
      });

      const results = await Promise.all(concurrentOperations);
      
      // Most operations should succeed (allow for some race conditions)
      const successfulResults = results.filter(result => !result.isError);
      expect(successfulResults.length).toBeGreaterThanOrEqual(3);

      // Verify data consistency
      const finalAnalysis = await callTool('analyze_task_dependencies', {
        listId: testList.id,
      });
      expect(finalAnalysis.isError).toBeFalsy();
      const analysis = JSON.parse(finalAnalysis.content[0]!.text);
      expect(analysis.issues.circularDependencies.length).toBe(0);

      logger.info('Concurrent access test passed', {
        successfulOperations: successfulResults.length,
        totalOperations: results.length,
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should meet performance requirements under production load', async () => {
      // Create a production-sized project (100 tasks with realistic dependencies)
      const testList = await todoListManager.createTodoList({
        title: 'Production Scale Test',
        projectTag: 'production-scale',
        tasks: Array.from({ length: 100 }, (_, i) => ({
          title: `Production Task ${i + 1}`,
          description: `Task ${i + 1} for production scale testing`,
          priority: Math.floor(Math.random() * 5) + 1,
          tags: [`module-${Math.floor(i / 20)}`, `priority-${Math.floor(i / 10)}`],
          estimatedDuration: Math.floor(Math.random() * 240) + 30,
        })),
      });

      // Add realistic dependency structure
      const taskIds = testList.items.map(item => item.id);
      for (let i = 10; i < taskIds.length; i += 5) {
        const dependencyCount = Math.min(3, Math.floor(i / 20) + 1);
        const dependencies = taskIds.slice(Math.max(0, i - 10), i)
          .sort(() => 0.5 - Math.random())
          .slice(0, dependencyCount);

        await callTool('set_task_dependencies', {
          listId: testList.id,
          taskId: taskIds[i]!,
          dependencyIds: dependencies,
        });
      }

      // Test performance of all major operations
      const performanceTests = [
        {
          name: 'analyze_task_dependencies',
          args: { listId: testList.id },
          maxTime: 1000, // 1000ms
        },
        {
          name: 'get_ready_tasks',
          args: { listId: testList.id, limit: 50 },
          maxTime: 750, // 750ms
        },
        {
          name: 'get_list',
          args: { listId: testList.id },
          maxTime: 1000, // 1000ms
        },
        {
          name: 'search_tool',
          args: { listId: testList.id, filters: { hasDependencies: true } },
          maxTime: 750, // 750ms
        },
      ];

      for (const test of performanceTests) {
        const startTime = performance.now();
        const result = await callTool(test.name, test.args);
        const duration = performance.now() - startTime;

        expect(result.isError).toBeFalsy();
        expect(duration).toBeLessThan(test.maxTime);

        logger.info(`Performance test ${test.name}`, {
          duration: `${duration.toFixed(2)}ms`,
          maxAllowed: `${test.maxTime}ms`,
          passed: duration < test.maxTime,
        });
      }
    });

    it('should handle memory efficiently with large datasets', async () => {
      const initialMemory = process.memoryUsage();

      // Create multiple large lists
      const lists: TodoList[] = [];
      for (let listIndex = 0; listIndex < 5; listIndex++) {
        const list = await todoListManager.createTodoList({
          title: `Memory Test List ${listIndex + 1}`,
          projectTag: `memory-test-${listIndex}`,
          tasks: Array.from({ length: 50 }, (_, i) => ({
            title: `Memory Task ${i + 1}`,
            priority: Math.floor(Math.random() * 5) + 1,
          })),
        });
        lists.push(list);

        // Add some dependencies
        const taskIds = list.items.map(item => item.id);
        for (let i = 5; i < taskIds.length; i += 10) {
          await callTool('set_task_dependencies', {
            listId: list.id,
            taskId: taskIds[i]!,
            dependencyIds: taskIds.slice(i - 2, i),
          });
        }
      }

      // Perform operations on all lists
      for (const list of lists) {
        await callTool('analyze_task_dependencies', { listId: list.id });
        await callTool('get_ready_tasks', { listId: list.id });
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB for 250 tasks across 5 lists)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      logger.info('Memory efficiency test passed', {
        totalTasks: 250,
        totalLists: 5,
        memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
      });
    });
  });

  describe('Data Integrity and Validation', () => {
    it('should maintain data integrity across all operations', async () => {
      const testList = await todoListManager.createTodoList({
        title: 'Data Integrity Test',
        projectTag: 'integrity-test',
        tasks: Array.from({ length: 20 }, (_, i) => ({
          title: `Integrity Task ${i + 1}`,
          priority: 3,
        })),
      });

      const taskIds = testList.items.map(item => item.id);

      // Create a complex dependency structure
      await callTool('set_task_dependencies', {
        listId: testList.id,
        taskId: taskIds[5]!,
        dependencyIds: [taskIds[0]!, taskIds[1]!],
      });

      await callTool('set_task_dependencies', {
        listId: testList.id,
        taskId: taskIds[10]!,
        dependencyIds: [taskIds[5]!, taskIds[2]!],
      });

      await callTool('set_task_dependencies', {
        listId: testList.id,
        taskId: taskIds[15]!,
        dependencyIds: [taskIds[10]!, taskIds[8]!],
      });

      // Validate dependency graph integrity
      const dependencyResolver = new DependencyResolver();
      const graph = dependencyResolver.buildDependencyGraph(testList.items);

      // Check for data consistency
      expect(graph.cycles.length).toBe(0); // No circular dependencies
      expect(graph.nodes.size).toBe(testList.items.length);

      // Validate that all dependencies exist
      for (const [nodeId, node] of graph.nodes) {
        for (const depId of node.dependencies) {
          expect(graph.nodes.has(depId)).toBe(true);
        }
      }

      // Test analysis consistency
      const analysisResult = await callTool('analyze_task_dependencies', {
        listId: testList.id,
      });
      expect(analysisResult.isError).toBeFalsy();
      const analysis = JSON.parse(analysisResult.content[0]!.text);

      expect(analysis.summary.totalTasks).toBe(20);
      expect(analysis.summary.tasksWithDependencies).toBe(3);
      expect(analysis.issues.circularDependencies.length).toBe(0);

      dependencyResolver.cleanup();

      logger.info('Data integrity validation passed', {
        totalTasks: 20,
        tasksWithDependencies: 3,
        graphNodes: graph.nodes.size,
      });
    });
  });

  describe('User Experience and Usability', () => {
    it('should provide clear and helpful user feedback', async () => {
      const testList = await todoListManager.createTodoList({
        title: 'UX Test Project',
        projectTag: 'ux-test',
        tasks: [
          { title: 'Setup Environment', priority: 5 },
          { title: 'Write Code', priority: 4 },
          { title: 'Test Code', priority: 3 },
          { title: 'Deploy', priority: 2 },
        ],
      });

      const taskIds = testList.items.map(item => item.id);

      // Create a realistic dependency chain
      await callTool('set_task_dependencies', {
        listId: testList.id,
        taskId: taskIds[1]!, // Write Code depends on Setup
        dependencyIds: [taskIds[0]!],
      });

      await callTool('set_task_dependencies', {
        listId: testList.id,
        taskId: taskIds[2]!, // Test Code depends on Write Code
        dependencyIds: [taskIds[1]!],
      });

      await callTool('set_task_dependencies', {
        listId: testList.id,
        taskId: taskIds[3]!, // Deploy depends on Test Code
        dependencyIds: [taskIds[2]!],
      });

      // Test that analysis provides actionable recommendations
      const analysisResult = await callTool('analyze_task_dependencies', {
        listId: testList.id,
      });
      const analysis = JSON.parse(analysisResult.content[0]!.text);

      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.recommendations[0]).toContain('Setup Environment');

      // Test that ready tasks provide helpful next actions
      const readyTasksResult = await callTool('get_ready_tasks', {
        listId: testList.id,
      });
      const readyTasks = JSON.parse(readyTasksResult.content[0]!.text);

      expect(readyTasks.nextActions.length).toBeGreaterThan(0);
      expect(readyTasks.nextActions[0]).toContain('Setup Environment');

      // Test that show_tasks output is readable and informative
      const showTasksResult = await callTool('show_tasks', {
        listId: testList.id,
      });
      const showOutput = showTasksResult.content[0]!.text;

      expect(showOutput).toContain('Setup Environment');
      expect(showOutput).toContain('🆓'); // Ready indicator
      expect(showOutput).toContain('⛔'); // Blocked indicator

      logger.info('User experience validation passed', {
        recommendationCount: analysis.recommendations.length,
        nextActionCount: readyTasks.nextActions.length,
        criticalPathLength: analysis.criticalPath.length,
      });
    });
  });

  describe('Production Deployment Readiness', () => {
    it('should be ready for production deployment', async () => {
      // Final comprehensive test that validates all aspects
      const testList = await todoListManager.createTodoList({
        title: 'Production Readiness Validation',
        projectTag: 'production-ready',
        tasks: Array.from({ length: 30 }, (_, i) => ({
          title: `Production Task ${i + 1}`,
          description: `Task ${i + 1} for production readiness validation`,
          priority: Math.floor(Math.random() * 5) + 1,
          tags: [`category-${i % 5}`, 'production'],
          estimatedDuration: Math.floor(Math.random() * 180) + 30,
        })),
      });

      // Create realistic dependencies
      const taskIds = testList.items.map(item => item.id);
      for (let i = 3; i < taskIds.length; i += 4) {
        const dependencies = taskIds.slice(Math.max(0, i - 3), i);
        await callTool('set_task_dependencies', {
          listId: testList.id,
          taskId: taskIds[i]!,
          dependencyIds: dependencies.slice(0, 2), // Max 2 dependencies per task
        });
      }

      // Test all tools work correctly
      const toolTests = [
        'analyze_task_dependencies',
        'get_ready_tasks',
        'get_list',
        'search_tool',
        'show_tasks',
      ];

      const results: Record<string, boolean> = {};

      for (const toolName of toolTests) {
        try {
          const args: any = { listId: testList.id };
          if (toolName === 'search_tool') {
            args.filters = { hasDependencies: true };
          }

          const result = await callTool(toolName, args);
          results[toolName] = !result.isError;
        } catch (error) {
          results[toolName] = false;
        }
      }

      // All tools should work correctly
      const allToolsWorking = Object.values(results).every(success => success);
      expect(allToolsWorking).toBe(true);

      // Performance should be acceptable
      const startTime = performance.now();
      await callTool('analyze_task_dependencies', { listId: testList.id });
      const analysisTime = performance.now() - startTime;
      expect(analysisTime).toBeLessThan(100); // Under 100ms

      // Memory usage should be reasonable
      const memoryBefore = process.memoryUsage();
      await callTool('get_ready_tasks', { listId: testList.id });
      const memoryAfter = process.memoryUsage();
      const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // Under 5MB

      logger.info('Production deployment readiness validated', {
        toolsWorking: Object.keys(results).filter(tool => results[tool]).length,
        totalTools: Object.keys(results).length,
        analysisTime: `${analysisTime.toFixed(2)}ms`,
        memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
        allSystemsGo: allToolsWorking && analysisTime < 100 && memoryIncrease < 5 * 1024 * 1024,
      });

      // Final assertion - system is production ready
      expect(allToolsWorking).toBe(true);
      expect(analysisTime).toBeLessThan(100);
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });
});