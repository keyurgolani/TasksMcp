/**
 * End-to-end integration tests for dependency management features
 * Tests complete workflows and user scenarios with all dependency tools working together
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { handleAddTask } from '../../src/api/handlers/add-task.js';
import { handleAnalyzeTaskDependencies } from '../../src/api/handlers/analyze-task-dependencies.js';
import { handleCompleteTask } from '../../src/api/handlers/complete-task.js';
import { handleGetList } from '../../src/api/handlers/get-list.js';
import { handleGetReadyTasks } from '../../src/api/handlers/get-ready-tasks.js';
import { handleSearchTool } from '../../src/api/handlers/search-tool.js';
import { handleSetTaskDependencies } from '../../src/api/handlers/set-task-dependencies.js';
import { handleShowTasks } from '../../src/api/handlers/show-tasks.js';
import { TaskListManager } from '../../src/domain/lists/task-list-manager.js';
import { MemoryStorageBackend } from '../../src/infrastructure/storage/memory-storage.js';
import { logger } from '../../src/shared/utils/logger.js';
import { TestCleanup } from '../setup.js';
import { createTaskListManager } from '../utils/test-helpers.js';

import type { CallToolRequest } from '../../src/shared/types/mcp-types.js';
import type { TaskList } from '../../src/shared/types/task.js';

describe('Dependency Management End-to-End Integration Tests', () => {
  let taskListManager: TaskListManager;
  let storage: MemoryStorageBackend;
  let testList: TaskList;

  beforeEach(async () => {
    storage = new MemoryStorageBackend();
    await storage.initialize();
    taskListManager = createTaskListManager(storage);
    await taskListManager.initialize();

    // Register for automatic cleanup
    TestCleanup.registerStorage(storage);
    TestCleanup.registerManager(taskListManager);

    // Create a test list for integration tests
    testList = await taskListManager.createTaskList({
      title: 'Integration Test Project',
      description: 'End-to-end testing of dependency management features',
      projectTag: 'integration-test',
      tasks: [],
    });
  });

  afterEach(async () => {
    // Cleanup is handled automatically by test setup
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
        return await handleAddTask(request, taskListManager);
      case 'set_task_dependencies':
        return await handleSetTaskDependencies(request, taskListManager);
      case 'get_ready_tasks':
        return await handleGetReadyTasks(request, taskListManager);
      case 'analyze_task_dependencies':
        return await handleAnalyzeTaskDependencies(request, taskListManager);
      case 'get_list':
        return await handleGetList(request, taskListManager);
      case 'search_tool':
        return await handleSearchTool(request, taskListManager);
      case 'show_tasks':
        return await handleShowTasks(request, taskListManager);
      case 'complete_task':
        return await handleCompleteTask(request, taskListManager);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  describe('Complete Project Workflow', () => {
    it('should handle a complete software development project workflow', async () => {
      // Step 1: Create foundational tasks
      const setupTaskResult = await callTool('add_task', {
        listId: testList.id,
        title: 'Setup Development Environment',
        description: 'Install tools, configure IDE, setup version control',
        priority: 5,
        tags: ['setup', 'foundation'],
        estimatedDuration: 120,
      });
      expect(setupTaskResult.isError).toBeFalsy();
      const setupTask = JSON.parse(setupTaskResult.content[0]!.text);

      const designTaskResult = await callTool('add_task', {
        listId: testList.id,
        title: 'Design System Architecture',
        description:
          'Create system design, define interfaces, plan database schema',
        priority: 4,
        tags: ['design', 'architecture'],
        estimatedDuration: 240,
        dependencies: [setupTask.id], // Depends on setup
      });
      expect(designTaskResult.isError).toBeFalsy();
      const designTask = JSON.parse(designTaskResult.content[0]!.text);

      // Step 2: Create implementation tasks that depend on design
      const backendTaskResult = await callTool('add_task', {
        listId: testList.id,
        title: 'Implement Backend API',
        description: 'Create REST API endpoints, implement business logic',
        priority: 4,
        tags: ['backend', 'api'],
        estimatedDuration: 480,
        dependencies: [designTask.id],
      });
      expect(backendTaskResult.isError).toBeFalsy();
      const backendTask = JSON.parse(backendTaskResult.content[0]!.text);

      const frontendTaskResult = await callTool('add_task', {
        listId: testList.id,
        title: 'Implement Frontend UI',
        description: 'Create user interface, implement client-side logic',
        priority: 3,
        tags: ['frontend', 'ui'],
        estimatedDuration: 360,
        dependencies: [designTask.id],
      });
      expect(frontendTaskResult.isError).toBeFalsy();
      const frontendTask = JSON.parse(frontendTaskResult.content[0]!.text);

      // Step 3: Create integration and testing tasks
      const integrationTaskResult = await callTool('add_task', {
        listId: testList.id,
        title: 'Integration Testing',
        description: 'Test API integration, end-to-end workflows',
        priority: 3,
        tags: ['testing', 'integration'],
        estimatedDuration: 180,
        dependencies: [backendTask.id, frontendTask.id],
      });
      expect(integrationTaskResult.isError).toBeFalsy();
      const integrationTask = JSON.parse(
        integrationTaskResult.content[0]!.text
      );

      const deploymentTaskResult = await callTool('add_task', {
        listId: testList.id,
        title: 'Deploy to Production',
        description: 'Setup CI/CD, deploy application, configure monitoring',
        priority: 2,
        tags: ['deployment', 'devops'],
        estimatedDuration: 240,
        dependencies: [integrationTask.id],
      });
      expect(deploymentTaskResult.isError).toBeFalsy();
      const _deploymentTask = JSON.parse(deploymentTaskResult.content[0]!.text);

      // Step 4: Analyze the project structure
      const analysisResult = await callTool('analyze_task_dependencies', {
        listId: testList.id,
      });
      expect(analysisResult.isError).toBeFalsy();
      const analysis = JSON.parse(analysisResult.content[0]!.text);

      expect(analysis.summary.totalTasks).toBe(6);
      expect(analysis.summary.tasksWithDependencies).toBe(5); // All except setup task
      expect(analysis.criticalPath.length).toBeGreaterThan(0);
      expect(analysis.recommendations.length).toBeGreaterThan(0);

      // Step 5: Get ready tasks (should only be setup task initially)
      const readyTasksResult = await callTool('get_ready_tasks', {
        listId: testList.id,
      });
      expect(readyTasksResult.isError).toBeFalsy();
      const readyTasks = JSON.parse(readyTasksResult.content[0]!.text);

      expect(readyTasks.readyTasks.length).toBe(1);
      expect(readyTasks.readyTasks[0]!.title).toBe(
        'Setup Development Environment'
      );

      // Step 6: Complete setup task and verify workflow progression
      const completeSetupResult = await callTool('complete_task', {
        listId: testList.id,
        taskId: setupTask.id,
      });
      expect(completeSetupResult.isError).toBeFalsy();

      // Step 7: Check ready tasks again (should now include design task)
      const readyTasksAfterSetupResult = await callTool('get_ready_tasks', {
        listId: testList.id,
      });
      expect(readyTasksAfterSetupResult.isError).toBeFalsy();
      const readyTasksAfterSetup = JSON.parse(
        readyTasksAfterSetupResult.content[0]!.text
      );

      expect(readyTasksAfterSetup.readyTasks.length).toBe(1);
      expect(readyTasksAfterSetup.readyTasks[0]!.title).toBe(
        'Design System Architecture'
      );

      // Step 8: Complete design task
      const completeDesignResult = await callTool('complete_task', {
        listId: testList.id,
        taskId: designTask.id,
      });
      expect(completeDesignResult.isError).toBeFalsy();

      // Step 9: Verify parallel tasks are now ready
      const readyTasksAfterDesignResult = await callTool('get_ready_tasks', {
        listId: testList.id,
      });
      expect(readyTasksAfterDesignResult.isError).toBeFalsy();
      const readyTasksAfterDesign = JSON.parse(
        readyTasksAfterDesignResult.content[0]!.text
      );

      expect(readyTasksAfterDesign.readyTasks.length).toBe(2); // Backend and Frontend
      const readyTitles = readyTasksAfterDesign.readyTasks.map(
        (task: any) => task.title
      );
      expect(readyTitles).toContain('Implement Backend API');
      expect(readyTitles).toContain('Implement Frontend UI');

      logger.info('Complete project workflow test completed successfully', {
        totalTasks: 6,
        criticalPathLength: analysis.criticalPath.length,
        finalReadyTasks: readyTasksAfterDesign.readyTasks.length,
      });
    });
  });

  describe('Dependency Modification Scenarios', () => {
    it('should handle dynamic dependency changes during project execution', async () => {
      // Create initial tasks
      const task1Result = await callTool('add_task', {
        listId: testList.id,
        title: 'Task 1 - Foundation',
        priority: 3,
      });
      const task1 = JSON.parse(task1Result.content[0]!.text);

      const task2Result = await callTool('add_task', {
        listId: testList.id,
        title: 'Task 2 - Build on Foundation',
        priority: 3,
        dependencies: [task1.id],
      });
      const task2 = JSON.parse(task2Result.content[0]!.text);

      const task3Result = await callTool('add_task', {
        listId: testList.id,
        title: 'Task 3 - Independent',
        priority: 3,
      });
      const task3 = JSON.parse(task3Result.content[0]!.text);

      // Verify initial state
      let readyTasksResult = await callTool('get_ready_tasks', {
        listId: testList.id,
      });
      let readyTasks = JSON.parse(readyTasksResult.content[0]!.text);
      expect(readyTasks.readyTasks.length).toBe(2); // Task 1 and Task 3

      // Scenario 1: Add dependency to previously independent task
      const addDependencyResult = await callTool('set_task_dependencies', {
        listId: testList.id,
        taskId: task3.id,
        dependencyIds: [task2.id], // Task 3 now depends on Task 2
      });
      expect(addDependencyResult.isError).toBeFalsy();

      // Verify Task 3 is no longer ready
      readyTasksResult = await callTool('get_ready_tasks', {
        listId: testList.id,
      });
      readyTasks = JSON.parse(readyTasksResult.content[0]!.text);
      expect(readyTasks.readyTasks.length).toBe(1); // Only Task 1

      // Scenario 2: Remove dependency
      const removeDependencyResult = await callTool('set_task_dependencies', {
        listId: testList.id,
        taskId: task3.id,
        dependencyIds: [], // Remove all dependencies
      });
      expect(removeDependencyResult.isError).toBeFalsy();

      // Verify Task 3 is ready again
      readyTasksResult = await callTool('get_ready_tasks', {
        listId: testList.id,
      });
      readyTasks = JSON.parse(readyTasksResult.content[0]!.text);
      expect(readyTasks.readyTasks.length).toBe(2); // Task 1 and Task 3 again

      // Scenario 3: Create complex dependency chain
      const task4Result = await callTool('add_task', {
        listId: testList.id,
        title: 'Task 4 - Complex Dependencies',
        priority: 3,
        dependencies: [task1.id, task3.id], // Depends on multiple tasks
      });
      const _task4 = JSON.parse(task4Result.content[0]!.text);

      // Analyze the complex structure
      const analysisResult = await callTool('analyze_task_dependencies', {
        listId: testList.id,
      });
      expect(analysisResult.isError).toBeFalsy();
      const analysis = JSON.parse(analysisResult.content[0]!.text);

      expect(analysis.summary.totalTasks).toBe(4);
      expect(analysis.summary.tasksWithDependencies).toBeGreaterThan(0);

      logger.info('Dynamic dependency changes test completed', {
        finalTaskCount: 4,
        tasksWithDependencies: analysis.summary.tasksWithDependencies,
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle circular dependency prevention gracefully', async () => {
      // Create tasks
      const task1Result = await callTool('add_task', {
        listId: testList.id,
        title: 'Task A',
        priority: 3,
      });
      const task1 = JSON.parse(task1Result.content[0]!.text);

      const task2Result = await callTool('add_task', {
        listId: testList.id,
        title: 'Task B',
        priority: 3,
        dependencies: [task1.id],
      });
      const task2 = JSON.parse(task2Result.content[0]!.text);

      // Attempt to create circular dependency (Task A depends on Task B)
      const circularResult = await callTool('set_task_dependencies', {
        listId: testList.id,
        taskId: task1.id,
        dependencyIds: [task2.id],
      });

      expect(circularResult.isError).toBe(true);
      expect(circularResult.content[0]!.text).toContain('Circular');

      // Verify system state is still valid
      const analysisResult = await callTool('analyze_task_dependencies', {
        listId: testList.id,
      });
      expect(analysisResult.isError).toBeFalsy();
      const analysis = JSON.parse(analysisResult.content[0]!.text);
      expect(analysis.issues.circularDependencies.length).toBe(0);

      logger.info('Circular dependency prevention test completed');
    });

    it('should handle invalid dependency references gracefully', async () => {
      const task1Result = await callTool('add_task', {
        listId: testList.id,
        title: 'Valid Task',
        priority: 3,
      });
      const task1 = JSON.parse(task1Result.content[0]!.text);

      // Attempt to set dependency on non-existent task (using valid UUID format)
      const invalidResult = await callTool('set_task_dependencies', {
        listId: testList.id,
        taskId: task1.id,
        dependencyIds: ['00000000-0000-0000-0000-000000000000'],
      });

      expect(invalidResult.isError).toBe(true);
      expect(invalidResult.content[0]!.text).toContain('do not exist');

      logger.info('Invalid dependency reference test completed');
    });

    it('should handle empty lists and edge cases', async () => {
      // Test with empty list
      const emptyListReadyResult = await callTool('get_ready_tasks', {
        listId: testList.id,
      });
      expect(emptyListReadyResult.isError).toBeFalsy();
      const emptyReadyTasks = JSON.parse(emptyListReadyResult.content[0]!.text);
      expect(emptyReadyTasks.readyTasks.length).toBe(0);

      const emptyAnalysisResult = await callTool('analyze_task_dependencies', {
        listId: testList.id,
      });
      expect(emptyAnalysisResult.isError).toBeFalsy();
      const emptyAnalysis = JSON.parse(emptyAnalysisResult.content[0]!.text);
      expect(emptyAnalysis.summary.totalTasks).toBe(0);

      logger.info('Empty list edge cases test completed');
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with realistic project sizes', async () => {
      // Create a realistic project with 50 tasks and complex dependencies
      const taskIds: string[] = [];

      // Create tasks in batches to simulate realistic project growth
      for (let i = 0; i < 50; i++) {
        const taskResult = await callTool('add_task', {
          listId: testList.id,
          title: `Project Task ${i + 1}`,
          description: `Task ${i + 1} in a realistic project scenario`,
          priority: Math.floor(Math.random() * 5) + 1,
          tags: [`phase-${Math.floor(i / 10)}`, `type-${i % 3}`],
          estimatedDuration: Math.floor(Math.random() * 240) + 30,
        });
        expect(taskResult.isError).toBeFalsy();
        const task = JSON.parse(taskResult.content[0]!.text);
        taskIds.push(task.id);
      }

      // Add realistic dependencies (each task depends on 0-3 previous tasks)
      for (let i = 5; i < taskIds.length; i++) {
        const dependencyCount = Math.floor(Math.random() * 3);
        if (dependencyCount > 0) {
          const dependencies = taskIds
            .slice(Math.max(0, i - 10), i)
            .sort(() => 0.5 - Math.random())
            .slice(0, dependencyCount);

          const setDepsResult = await callTool('set_task_dependencies', {
            listId: testList.id,
            taskId: taskIds[i]!,
            dependencyIds: dependencies,
          });
          expect(setDepsResult.isError).toBeFalsy();
        }
      }

      // Test all major operations with realistic data
      const startTime = performance.now();

      const analysisResult = await callTool('analyze_task_dependencies', {
        listId: testList.id,
      });
      expect(analysisResult.isError).toBeFalsy();

      const readyTasksResult = await callTool('get_ready_tasks', {
        listId: testList.id,
        limit: 20,
      });
      expect(readyTasksResult.isError).toBeFalsy();

      const filterResult = await callTool('search_tool', {
        listId: testList.id,
        hasDependencies: true,
      });
      expect(filterResult.isError).toBeFalsy();

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // Should complete in under 1 second

      const analysis = JSON.parse(analysisResult.content[0]!.text);
      const readyTasks = JSON.parse(readyTasksResult.content[0]!.text);

      logger.info('Performance under load test completed', {
        totalTasks: 50,
        tasksWithDependencies: analysis.summary.tasksWithDependencies,
        readyTasks: readyTasks.readyTasks.length,
        totalOperationTime: `${totalTime.toFixed(2)}ms`,
        criticalPathLength: analysis.criticalPath.length,
      });
    });
  });

  describe('User Experience Validation', () => {
    it('should provide clear and actionable feedback in all scenarios', async () => {
      // Create a small project to test user experience
      const task1Result = await callTool('add_task', {
        listId: testList.id,
        title: 'Research Requirements',
        priority: 4,
        tags: ['research', 'planning'],
      });
      const task1 = JSON.parse(task1Result.content[0]!.text);

      const task2Result = await callTool('add_task', {
        listId: testList.id,
        title: 'Create Prototype',
        priority: 3,
        dependencies: [task1.id],
      });
      const _task2 = JSON.parse(task2Result.content[0]!.text);

      // Test that analysis provides helpful recommendations
      const analysisResult = await callTool('analyze_task_dependencies', {
        listId: testList.id,
      });
      expect(analysisResult.isError).toBeFalsy();
      const analysis = JSON.parse(analysisResult.content[0]!.text);

      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.recommendations[0]).toContain('Research Requirements');

      // Test that ready tasks provide next actions
      const readyTasksResult = await callTool('get_ready_tasks', {
        listId: testList.id,
      });
      expect(readyTasksResult.isError).toBeFalsy();
      const readyTasks = JSON.parse(readyTasksResult.content[0]!.text);

      expect(readyTasks._methodologyGuidance).toBeDefined();
      expect(readyTasks._methodologyGuidance.dailyWorkflow).toBeInstanceOf(
        Array
      );

      // Test that show_tasks displays dependency information clearly
      const showTasksResult = await callTool('show_tasks', {
        listId: testList.id,
      });
      expect(showTasksResult.isError).toBeFalsy();
      const showOutput = showTasksResult.content[0]!.text;

      expect(showOutput).toContain('Research Requirements');
      expect(showOutput).toContain('Create Prototype');
      expect(showOutput).toContain('Dependencies:'); // Should show dependency info

      logger.info('User experience validation completed', {
        recommendationCount: analysis.recommendations.length,
        methodologyGuidanceProvided: !!readyTasks._methodologyGuidance,
        showOutputLength: showOutput.length,
      });
    });
  });
});
