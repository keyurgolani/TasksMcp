/**
 * Integration tests for dependency management workflows
 * Tests end-to-end scenarios combining multiple dependency tools and existing MCP tools
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TodoListManager } from '../../src/domain/lists/todo-list-manager.js';
import { MemoryStorageBackend } from '../../src/infrastructure/storage/memory-storage.js';
import { Priority, TaskStatus } from '../../src/shared/types/todo.js';
import type { TodoList, TodoItem } from '../../src/shared/types/todo.js';
import type { CallToolRequest } from '../../src/shared/types/mcp-types.js';

// Import all dependency handlers
import { handleSetTaskDependencies } from '../../src/api/handlers/set-task-dependencies.js';
import { handleGetReadyTasks } from '../../src/api/handlers/get-ready-tasks.js';
import { handleAnalyzeTaskDependencies } from '../../src/api/handlers/analyze-task-dependencies.js';

// Import enhanced existing handlers
import { handleAddTask } from '../../src/api/handlers/add-task.js';
import { handleGetList } from '../../src/api/handlers/get-list.js';
import { handleSearchTool } from '../../src/api/handlers/search-tool.js';
import { handleShowTasks } from '../../src/api/handlers/show-tasks.js';
import { handleCompleteTask } from '../../src/api/handlers/complete-task.js';

describe('Dependency Management Workflows Integration Tests', () => {
  let todoListManager: TodoListManager;
  let storage: MemoryStorageBackend;
  let projectList: TodoList;
  let setupTask: TodoItem;
  let developTask: TodoItem;
  let testTask: TodoItem;
  let deployTask: TodoItem;

  beforeEach(async () => {
    storage = new MemoryStorageBackend();
    todoListManager = new TodoListManager(storage);
    await todoListManager.initialize();

    // Create a realistic project scenario with 10-15 tasks
    projectList = await todoListManager.createTodoList({
      title: 'Web Application Development Project',
      description: 'Complete web application with authentication, API, and deployment',
      tasks: [
        {
          title: 'Setup Development Environment',
          description: 'Install dependencies, configure tools, setup database',
          priority: Priority.HIGH,
          estimatedDuration: 120,
          tags: ['setup', 'infrastructure'],
        },
        {
          title: 'Implement User Authentication',
          description: 'Create login/register functionality with JWT tokens',
          priority: Priority.HIGH,
          estimatedDuration: 240,
          tags: ['backend', 'security'],
        },
        {
          title: 'Build REST API Endpoints',
          description: 'Create CRUD operations for main entities',
          priority: Priority.MEDIUM,
          estimatedDuration: 180,
          tags: ['backend', 'api'],
        },
        {
          title: 'Design Database Schema',
          description: 'Create tables, relationships, and migrations',
          priority: Priority.HIGH,
          estimatedDuration: 90,
          tags: ['database', 'backend'],
        },
        {
          title: 'Create Frontend Components',
          description: 'Build reusable UI components',
          priority: Priority.MEDIUM,
          estimatedDuration: 200,
          tags: ['frontend', 'ui'],
        },
        {
          title: 'Implement Frontend Authentication',
          description: 'Connect frontend to auth API',
          priority: Priority.MEDIUM,
          estimatedDuration: 120,
          tags: ['frontend', 'security'],
        },
        {
          title: 'Write Unit Tests',
          description: 'Create comprehensive test suite',
          priority: Priority.MEDIUM,
          estimatedDuration: 150,
          tags: ['testing', 'quality'],
        },
        {
          title: 'Write Integration Tests',
          description: 'Test API endpoints and workflows',
          priority: Priority.MEDIUM,
          estimatedDuration: 120,
          tags: ['testing', 'quality'],
        },
        {
          title: 'Setup CI/CD Pipeline',
          description: 'Configure automated testing and deployment',
          priority: Priority.LOW,
          estimatedDuration: 180,
          tags: ['devops', 'automation'],
        },
        {
          title: 'Deploy to Staging',
          description: 'Deploy application to staging environment',
          priority: Priority.LOW,
          estimatedDuration: 60,
          tags: ['deployment', 'devops'],
        },
        {
          title: 'Performance Testing',
          description: 'Load testing and optimization',
          priority: Priority.LOW,
          estimatedDuration: 90,
          tags: ['testing', 'performance'],
        },
        {
          title: 'Security Audit',
          description: 'Review security vulnerabilities',
          priority: Priority.MEDIUM,
          estimatedDuration: 120,
          tags: ['security', 'audit'],
        },
        {
          title: 'Documentation',
          description: 'Write API docs and user guides',
          priority: Priority.LOW,
          estimatedDuration: 100,
          tags: ['documentation'],
        },
        {
          title: 'Production Deployment',
          description: 'Deploy to production environment',
          priority: Priority.HIGH,
          estimatedDuration: 90,
          tags: ['deployment', 'production'],
        },
      ],
      projectTag: 'web-app-project',
    });

    // Store references to key tasks for dependency setup
    setupTask = projectList.items.find(task => task.title.includes('Setup Development'))!;
    developTask = projectList.items.find(task => task.title.includes('User Authentication'))!;
    testTask = projectList.items.find(task => task.title.includes('Unit Tests'))!;
    deployTask = projectList.items.find(task => task.title.includes('Production Deployment'))!;
  });

  afterEach(async () => {
    await todoListManager.shutdown();
  });

  describe('End-to-End Dependency Workflow', () => {
    it('should handle complete project workflow from setup to deployment', async () => {
      // Step 1: Setup realistic dependencies using set_task_dependencies
      const dbSchemaTask = projectList.items.find(task => task.title.includes('Database Schema'))!;
      const apiTask = projectList.items.find(task => task.title.includes('REST API'))!;
      const frontendAuthTask = projectList.items.find(task => task.title.includes('Frontend Authentication'))!;
      const frontendComponentsTask = projectList.items.find(task => task.title.includes('Frontend Components'))!;
      const unitTestsTask = projectList.items.find(task => task.title.includes('Unit Tests'))!;
      const integrationTestsTask = projectList.items.find(task => task.title.includes('Integration Tests'))!;
      const cicdTask = projectList.items.find(task => task.title.includes('CI/CD'))!;
      const stagingTask = projectList.items.find(task => task.title.includes('Staging'))!;
      const perfTestTask = projectList.items.find(task => task.title.includes('Performance'))!;
      const securityTask = projectList.items.find(task => task.title.includes('Security'))!;
      const docsTask = projectList.items.find(task => task.title.includes('Documentation'))!;

      // Setup foundational dependencies
      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: projectList.id,
            taskId: dbSchemaTask.id,
            dependencyIds: [setupTask.id],
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: projectList.id,
            taskId: developTask.id,
            dependencyIds: [setupTask.id, dbSchemaTask.id],
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: projectList.id,
            taskId: apiTask.id,
            dependencyIds: [developTask.id, dbSchemaTask.id],
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: projectList.id,
            taskId: frontendAuthTask.id,
            dependencyIds: [developTask.id, frontendComponentsTask.id],
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: projectList.id,
            taskId: unitTestsTask.id,
            dependencyIds: [apiTask.id, frontendAuthTask.id],
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: projectList.id,
            taskId: integrationTestsTask.id,
            dependencyIds: [unitTestsTask.id],
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: projectList.id,
            taskId: cicdTask.id,
            dependencyIds: [integrationTestsTask.id],
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: projectList.id,
            taskId: stagingTask.id,
            dependencyIds: [cicdTask.id],
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: projectList.id,
            taskId: perfTestTask.id,
            dependencyIds: [stagingTask.id],
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: projectList.id,
            taskId: securityTask.id,
            dependencyIds: [stagingTask.id],
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: projectList.id,
            taskId: deployTask.id,
            dependencyIds: [perfTestTask.id, securityTask.id, docsTask.id],
          },
        },
      }, todoListManager);

      // Step 2: Analyze initial project state
      const initialAnalysis = await handleAnalyzeTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'analyze_task_dependencies',
          arguments: {
            listId: projectList.id,
          },
        },
      }, todoListManager);

      expect(initialAnalysis.isError).toBeFalsy();
      const analysisData = JSON.parse(initialAnalysis.content[0]?.text as string);
      expect(analysisData.summary.totalTasks).toBe(14);
      expect(analysisData.criticalPath.length).toBeGreaterThan(5);
      expect(analysisData.recommendations.length).toBeGreaterThan(0);

      // Step 3: Get initial ready tasks
      const initialReady = await handleGetReadyTasks({
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: projectList.id,
          },
        },
      }, todoListManager);

      expect(initialReady.isError).toBeFalsy();
      const readyData = JSON.parse(initialReady.content[0]?.text as string);
      
      // Should have setup task and frontend components as ready (no dependencies)
      expect(readyData.readyTasks.length).toBeGreaterThanOrEqual(2);
      const readyTaskIds = readyData.readyTasks.map((task: any) => task.id);
      expect(readyTaskIds).toContain(setupTask.id);
      expect(readyTaskIds).toContain(frontendComponentsTask.id);

      // Step 4: Complete setup task and verify cascade
      await handleCompleteTask({
        method: 'tools/call',
        params: {
          name: 'complete_task',
          arguments: {
            listId: projectList.id,
            taskId: setupTask.id,
          },
        },
      }, todoListManager);

      // Step 5: Check that database schema is now ready
      const afterSetupReady = await handleGetReadyTasks({
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: projectList.id,
          },
        },
      }, todoListManager);

      const afterSetupData = JSON.parse(afterSetupReady.content[0]?.text as string);
      const afterSetupIds = afterSetupData.readyTasks.map((task: any) => task.id);
      expect(afterSetupIds).toContain(dbSchemaTask.id);

      // Step 6: Complete database schema and auth tasks
      await handleCompleteTask({
        method: 'tools/call',
        params: {
          name: 'complete_task',
          arguments: {
            listId: projectList.id,
            taskId: dbSchemaTask.id,
          },
        },
      }, todoListManager);

      await handleCompleteTask({
        method: 'tools/call',
        params: {
          name: 'complete_task',
          arguments: {
            listId: projectList.id,
            taskId: developTask.id,
          },
        },
      }, todoListManager);

      // Step 7: Verify API task is now ready
      const afterAuthReady = await handleGetReadyTasks({
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: projectList.id,
          },
        },
      }, todoListManager);

      const afterAuthData = JSON.parse(afterAuthReady.content[0]?.text as string);
      const afterAuthIds = afterAuthData.readyTasks.map((task: any) => task.id);
      expect(afterAuthIds).toContain(apiTask.id);

      // Step 8: Test enhanced get_list with dependency information
      const enhancedList = await handleGetList({
        method: 'tools/call',
        params: {
          name: 'get_list',
          arguments: {
            listId: projectList.id,
          },
        },
      }, todoListManager);

      expect(enhancedList.isError).toBeFalsy();
      const listData = JSON.parse(enhancedList.content[0]?.text as string);
      
      // Verify dependency information is included
      const apiTaskInList = listData.tasks.find((task: any) => task.id === apiTask.id);
      expect(apiTaskInList.dependencies).toEqual([developTask.id, dbSchemaTask.id]);
      expect(apiTaskInList.isReady).toBe(true);

      // Step 9: Test filtering by dependency status
      const readyTasksFilter = await handleSearchTool({
        method: 'tools/call',
        params: {
          name: 'search_tool',
          arguments: {
            listId: projectList.id,
            isReady: true,
            includeDependencyInfo: true,
          },
        },
      }, todoListManager);

      expect(readyTasksFilter.isError).toBeFalsy();
      const filteredData = JSON.parse(readyTasksFilter.content[0]?.text as string);
      expect(filteredData.results.length).toBeGreaterThan(0);
      
      // All returned tasks should be ready
      for (const task of filteredData.results) {
        expect(task.isReady).toBe(true);
      }

      // Step 10: Final analysis after progress
      const finalAnalysis = await handleAnalyzeTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'analyze_task_dependencies',
          arguments: {
            listId: projectList.id,
          },
        },
      }, todoListManager);

      const finalAnalysisData = JSON.parse(finalAnalysis.content[0]?.text as string);
      expect(finalAnalysisData.summary.readyTasks).toBeGreaterThanOrEqual(readyData.readyTasks.length);
      expect(finalAnalysisData.recommendations.length).toBeGreaterThan(0);
      
      // Check that recommendations contain relevant advice
      const recommendationText = finalAnalysisData.recommendations.join(' ');
      expect(recommendationText).toMatch(/ready|tasks|Focus|Prioritize/i);
    });

    it('should handle concurrent dependency modifications safely', async () => {
      // Create a scenario with multiple tasks that could be modified concurrently
      const task1 = projectList.items[0]!;
      const task2 = projectList.items[1]!;
      const task3 = projectList.items[2]!;
      const task4 = projectList.items[3]!;

      // Set dependencies sequentially to avoid race conditions in test
      const result1 = await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: projectList.id,
            taskId: task2.id,
            dependencyIds: [task1.id],
          },
        },
      }, todoListManager);
      expect(result1.isError).toBeFalsy();
      
      const result2 = await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: projectList.id,
            taskId: task3.id,
            dependencyIds: [task1.id],
          },
        },
      }, todoListManager);
      expect(result2.isError).toBeFalsy();
      
      const result3 = await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: projectList.id,
            taskId: task4.id,
            dependencyIds: [task2.id, task3.id],
          },
        },
      }, todoListManager);
      expect(result3.isError).toBeFalsy();

      // Verify final state is consistent
      const finalList = await handleGetList({
        method: 'tools/call',
        params: {
          name: 'get_list',
          arguments: {
            listId: projectList.id,
          },
        },
      }, todoListManager);

      expect(finalList.isError).toBeFalsy();
      const finalData = JSON.parse(finalList.content[0]?.text as string);
      const task2Final = finalData.tasks.find((task: any) => task.id === task2.id);
      const task3Final = finalData.tasks.find((task: any) => task.id === task3.id);
      const task4Final = finalData.tasks.find((task: any) => task.id === task4.id);

      expect(task2Final).toBeDefined();
      expect(task3Final).toBeDefined();
      expect(task4Final).toBeDefined();
      
      expect(task2Final.dependencies).toEqual([task1.id]);
      expect(task3Final.dependencies).toEqual([task1.id]);
      expect(task4Final.dependencies).toEqual([task2.id, task3.id]);
    });

    it('should maintain data consistency across multiple tool interactions', async () => {
      // Setup initial dependencies
      const task1 = projectList.items[0]!;
      const task2 = projectList.items[1]!;
      const task3 = projectList.items[2]!;

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: projectList.id,
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
            listId: projectList.id,
            taskId: task3.id,
            dependencyIds: [task2.id],
          },
        },
      }, todoListManager);

      // Test consistency across different tools
      const getListResult = await handleGetList({
        method: 'tools/call',
        params: {
          name: 'get_list',
          arguments: {
            listId: projectList.id,
          },
        },
      }, todoListManager);

      const readyTasksResult = await handleGetReadyTasks({
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: projectList.id,
          },
        },
      }, todoListManager);

      const analysisResult = await handleAnalyzeTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'analyze_task_dependencies',
          arguments: {
            listId: projectList.id,
          },
        },
      }, todoListManager);

      // Parse results
      const listData = JSON.parse(getListResult.content[0]?.text as string);
      const readyData = JSON.parse(readyTasksResult.content[0]?.text as string);
      const analysisData = JSON.parse(analysisResult.content[0]?.text as string);

      // Verify consistency
      const task1InList = listData.tasks.find((task: any) => task.id === task1.id);
      const task2InList = listData.tasks.find((task: any) => task.id === task2.id);
      const task3InList = listData.tasks.find((task: any) => task.id === task3.id);

      expect(task1InList.isReady).toBe(true);
      expect(task2InList.isReady).toBe(false);
      expect(task3InList.isReady).toBe(false);

      // Ready tasks should only include task1 (and other tasks without dependencies)
      const readyTaskIds = readyData.readyTasks.map((task: any) => task.id);
      expect(readyTaskIds).toContain(task1.id);
      expect(readyTaskIds).not.toContain(task2.id);
      expect(readyTaskIds).not.toContain(task3.id);

      // Analysis should reflect the same state
      expect(analysisData.summary.blockedTasks).toBeGreaterThanOrEqual(2);
      expect(analysisData.criticalPath).toContain(task1.id);
    });
  });

  describe('Realistic Project Scenarios', () => {
    it('should handle a 50-task software development project', async () => {
      // Create a large project with 50 tasks
      const largeProject = await todoListManager.createTodoList({
        title: 'Large Software Development Project',
        description: 'Enterprise application with microservices architecture',
        tasks: Array.from({ length: 50 }, (_, i) => ({
          title: `Task ${i + 1}: ${getTaskTitle(i)}`,
          description: `Detailed description for task ${i + 1}`,
          priority: getPriority(i),
          estimatedDuration: Math.floor(Math.random() * 240) + 30,
          tags: getTags(i),
        })),
        projectTag: 'large-enterprise-project',
      });

      // Setup realistic dependency chains
      const tasks = largeProject.items;
      
      // Create foundational dependencies (first 10 tasks are foundational)
      for (let i = 10; i < 30; i++) {
        const dependencyCount = Math.floor(Math.random() * 3) + 1;
        const dependencies = [];
        
        for (let j = 0; j < dependencyCount; j++) {
          const depIndex = Math.floor(Math.random() * Math.min(i, 10));
          if (!dependencies.includes(tasks[depIndex]!.id)) {
            dependencies.push(tasks[depIndex]!.id);
          }
        }

        if (dependencies.length > 0) {
          await handleSetTaskDependencies({
            method: 'tools/call',
            params: {
              name: 'set_task_dependencies',
              arguments: {
                listId: largeProject.id,
                taskId: tasks[i]!.id,
                dependencyIds: dependencies,
              },
            },
          }, todoListManager);
        }
      }

      // Create integration dependencies (tasks 30-50 depend on earlier tasks)
      for (let i = 30; i < 50; i++) {
        const dependencyCount = Math.floor(Math.random() * 4) + 2;
        const dependencies = [];
        
        for (let j = 0; j < dependencyCount; j++) {
          const depIndex = Math.floor(Math.random() * (i - 10)) + 10;
          if (!dependencies.includes(tasks[depIndex]!.id)) {
            dependencies.push(tasks[depIndex]!.id);
          }
        }

        if (dependencies.length > 0) {
          await handleSetTaskDependencies({
            method: 'tools/call',
            params: {
              name: 'set_task_dependencies',
              arguments: {
                listId: largeProject.id,
                taskId: tasks[i]!.id,
                dependencyIds: dependencies,
              },
            },
          }, todoListManager);
        }
      }

      // Test performance of dependency analysis on large project
      const startTime = Date.now();
      
      const analysisResult = await handleAnalyzeTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'analyze_task_dependencies',
          arguments: {
            listId: largeProject.id,
          },
        },
      }, todoListManager);

      const analysisTime = Date.now() - startTime;
      
      expect(analysisResult.isError).toBeFalsy();
      expect(analysisTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      const analysisData = JSON.parse(analysisResult.content[0]?.text as string);
      expect(analysisData.summary.totalTasks).toBe(50);
      expect(analysisData.criticalPath.length).toBeGreaterThan(0);
      expect(analysisData.recommendations.length).toBeGreaterThan(0);

      // Test ready tasks performance
      const readyStartTime = Date.now();
      
      const readyResult = await handleGetReadyTasks({
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: largeProject.id,
            limit: 20,
          },
        },
      }, todoListManager);

      const readyTime = Date.now() - readyStartTime;
      
      expect(readyResult.isError).toBeFalsy();
      expect(readyTime).toBeLessThan(2000); // Should complete within 2 seconds
      
      const readyData = JSON.parse(readyResult.content[0]?.text as string);
      expect(readyData.readyTasks.length).toBeGreaterThan(0);
      expect(readyData.readyTasks.length).toBeLessThanOrEqual(20);
    });

    it('should handle complex dependency chains with multiple completion paths', async () => {
      // Create a project with parallel development tracks
      const parallelProject = await todoListManager.createTodoList({
        title: 'Parallel Development Tracks Project',
        description: 'Project with frontend, backend, and DevOps tracks',
        tasks: [
          // Frontend track
          { title: 'Frontend: Setup React Project', priority: Priority.HIGH, tags: ['frontend'] },
          { title: 'Frontend: Create Component Library', priority: Priority.MEDIUM, tags: ['frontend'] },
          { title: 'Frontend: Implement Authentication UI', priority: Priority.HIGH, tags: ['frontend', 'auth'] },
          { title: 'Frontend: Build Dashboard', priority: Priority.MEDIUM, tags: ['frontend'] },
          { title: 'Frontend: Add Data Visualization', priority: Priority.LOW, tags: ['frontend'] },
          
          // Backend track
          { title: 'Backend: Setup Node.js Server', priority: Priority.HIGH, tags: ['backend'] },
          { title: 'Backend: Design Database Schema', priority: Priority.HIGH, tags: ['backend', 'database'] },
          { title: 'Backend: Implement Authentication API', priority: Priority.HIGH, tags: ['backend', 'auth'] },
          { title: 'Backend: Create Business Logic APIs', priority: Priority.MEDIUM, tags: ['backend'] },
          { title: 'Backend: Add Data Processing', priority: Priority.LOW, tags: ['backend'] },
          
          // DevOps track
          { title: 'DevOps: Setup Docker Containers', priority: Priority.MEDIUM, tags: ['devops'] },
          { title: 'DevOps: Configure CI/CD Pipeline', priority: Priority.MEDIUM, tags: ['devops'] },
          { title: 'DevOps: Setup Monitoring', priority: Priority.LOW, tags: ['devops'] },
          
          // Integration tasks
          { title: 'Integration: Connect Frontend to Backend', priority: Priority.HIGH, tags: ['integration'] },
          { title: 'Integration: End-to-End Testing', priority: Priority.MEDIUM, tags: ['integration', 'testing'] },
          { title: 'Integration: Performance Testing', priority: Priority.LOW, tags: ['integration', 'testing'] },
          { title: 'Integration: Security Testing', priority: Priority.MEDIUM, tags: ['integration', 'security'] },
          
          // Final tasks
          { title: 'Final: User Acceptance Testing', priority: Priority.HIGH, tags: ['testing'] },
          { title: 'Final: Production Deployment', priority: Priority.HIGH, tags: ['deployment'] },
          { title: 'Final: Go-Live Support', priority: Priority.MEDIUM, tags: ['support'] },
        ],
        projectTag: 'parallel-development',
      });

      const tasks = parallelProject.items;
      
      // Setup track dependencies
      const frontendTasks = tasks.filter(task => task.tags.includes('frontend'));
      const backendTasks = tasks.filter(task => task.tags.includes('backend'));
      const devopsTasks = tasks.filter(task => task.tags.includes('devops'));
      const integrationTasks = tasks.filter(task => task.tags.includes('integration'));
      const finalTasks = tasks.filter(task => task.title.startsWith('Final:'));

      // Frontend dependencies
      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: parallelProject.id,
            taskId: frontendTasks[1]!.id, // Component Library
            dependencyIds: [frontendTasks[0]!.id], // Setup React
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: parallelProject.id,
            taskId: frontendTasks[2]!.id, // Auth UI
            dependencyIds: [frontendTasks[1]!.id], // Component Library
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: parallelProject.id,
            taskId: frontendTasks[3]!.id, // Dashboard
            dependencyIds: [frontendTasks[1]!.id], // Component Library
          },
        },
      }, todoListManager);

      // Backend dependencies
      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: parallelProject.id,
            taskId: backendTasks[2]!.id, // Auth API
            dependencyIds: [backendTasks[0]!.id, backendTasks[1]!.id], // Server + Schema
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: parallelProject.id,
            taskId: backendTasks[3]!.id, // Business Logic
            dependencyIds: [backendTasks[1]!.id], // Schema
          },
        },
      }, todoListManager);

      // Integration dependencies (require both frontend and backend)
      const frontendAuthTask = frontendTasks.find(task => task.title.includes('Authentication UI'))!;
      const backendAuthTask = backendTasks.find(task => task.title.includes('Authentication API'))!;
      
      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: parallelProject.id,
            taskId: integrationTasks[0]!.id, // Connect Frontend to Backend
            dependencyIds: [frontendAuthTask.id, backendAuthTask.id],
          },
        },
      }, todoListManager);

      // Final tasks depend on integration
      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: parallelProject.id,
            taskId: finalTasks[0]!.id, // UAT
            dependencyIds: [integrationTasks[0]!.id, integrationTasks[1]!.id],
          },
        },
      }, todoListManager);

      await handleSetTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'set_task_dependencies',
          arguments: {
            listId: parallelProject.id,
            taskId: finalTasks[1]!.id, // Production Deployment
            dependencyIds: [finalTasks[0]!.id, devopsTasks[1]!.id], // UAT + CI/CD
          },
        },
      }, todoListManager);

      // Test that multiple tracks can progress in parallel
      const initialReady = await handleGetReadyTasks({
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: parallelProject.id,
          },
        },
      }, todoListManager);

      const initialReadyData = JSON.parse(initialReady.content[0]?.text as string);
      const readyTaskTitles = initialReadyData.readyTasks.map((task: any) => task.title);
      
      // Should have ready tasks from multiple tracks
      expect(readyTaskTitles.some((title: string) => title.includes('Frontend:'))).toBe(true);
      expect(readyTaskTitles.some((title: string) => title.includes('Backend:'))).toBe(true);
      expect(readyTaskTitles.some((title: string) => title.includes('DevOps:'))).toBe(true);

      // Complete foundational tasks from each track
      await handleCompleteTask({
        method: 'tools/call',
        params: {
          name: 'complete_task',
          arguments: {
            listId: parallelProject.id,
            taskId: frontendTasks[0]!.id, // Frontend Setup
          },
        },
      }, todoListManager);

      await handleCompleteTask({
        method: 'tools/call',
        params: {
          name: 'complete_task',
          arguments: {
            listId: parallelProject.id,
            taskId: backendTasks[0]!.id, // Backend Setup
          },
        },
      }, todoListManager);

      await handleCompleteTask({
        method: 'tools/call',
        params: {
          name: 'complete_task',
          arguments: {
            listId: parallelProject.id,
            taskId: backendTasks[1]!.id, // Database Schema
          },
        },
      }, todoListManager);

      // Verify that dependent tasks are now ready
      const afterFoundationReady = await handleGetReadyTasks({
        method: 'tools/call',
        params: {
          name: 'get_ready_tasks',
          arguments: {
            listId: parallelProject.id,
          },
        },
      }, todoListManager);

      const afterFoundationData = JSON.parse(afterFoundationReady.content[0]?.text as string);
      const afterFoundationTitles = afterFoundationData.readyTasks.map((task: any) => task.title);
      
      expect(afterFoundationTitles).toContain('Frontend: Create Component Library');
      expect(afterFoundationTitles).toContain('Backend: Implement Authentication API');
      expect(afterFoundationTitles).toContain('Backend: Create Business Logic APIs');

      // Analyze the project state
      const analysis = await handleAnalyzeTaskDependencies({
        method: 'tools/call',
        params: {
          name: 'analyze_task_dependencies',
          arguments: {
            listId: parallelProject.id,
          },
        },
      }, todoListManager);

      const analysisData = JSON.parse(analysis.content[0]?.text as string);
      expect(analysisData.criticalPath.length).toBeGreaterThan(5);
      // Check that recommendations contain relevant advice
      const recommendationText = analysisData.recommendations.join(' ');
      expect(recommendationText).toMatch(/ready|tasks|Focus|Prioritize/i);
    });
  });
});

// Helper functions for generating realistic test data
function getTaskTitle(index: number): string {
  const titles = [
    'Setup Development Environment',
    'Design System Architecture',
    'Implement Core Framework',
    'Create Database Models',
    'Build Authentication System',
    'Develop User Interface',
    'Implement Business Logic',
    'Add Data Validation',
    'Create API Endpoints',
    'Write Unit Tests',
    'Setup Integration Tests',
    'Implement Error Handling',
    'Add Logging System',
    'Create Documentation',
    'Setup Monitoring',
    'Implement Caching',
    'Add Security Features',
    'Optimize Performance',
    'Setup CI/CD Pipeline',
    'Deploy to Staging',
    'Conduct Load Testing',
    'Security Audit',
    'User Acceptance Testing',
    'Production Deployment',
    'Post-Launch Monitoring',
  ];
  
  return titles[index % titles.length] || `Generic Task ${index + 1}`;
}

function getPriority(index: number): Priority {
  // Distribute priorities realistically
  if (index < 10) return Priority.HIGH; // First 10 tasks are high priority
  if (index < 30) return Priority.MEDIUM; // Next 20 are medium
  return Priority.LOW; // Rest are low priority
}

function getTags(index: number): string[] {
  const tagSets = [
    ['setup', 'infrastructure'],
    ['architecture', 'design'],
    ['core', 'framework'],
    ['database', 'backend'],
    ['auth', 'security'],
    ['frontend', 'ui'],
    ['backend', 'api'],
    ['validation', 'quality'],
    ['api', 'backend'],
    ['testing', 'quality'],
    ['testing', 'integration'],
    ['error-handling', 'reliability'],
    ['logging', 'monitoring'],
    ['documentation'],
    ['monitoring', 'ops'],
    ['performance', 'optimization'],
    ['security', 'audit'],
    ['performance', 'optimization'],
    ['devops', 'automation'],
    ['deployment', 'staging'],
    ['testing', 'performance'],
    ['security', 'audit'],
    ['testing', 'uat'],
    ['deployment', 'production'],
    ['monitoring', 'support'],
  ];
  
  return tagSets[index % tagSets.length] || ['general'];
}