/**
 * Performance tests for large datasets and complex operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TodoListManager } from '../../src/domain/lists/todo-list-manager.js';
import { MemoryStorageBackend } from '../../src/infrastructure/storage/memory-storage.js';
import { PrettyPrintFormatter } from '../../src/shared/utils/pretty-print-formatter.js';
import { ActionPlanManager } from '../../src/domain/tasks/action-plan-manager.js';
import { NotesManager } from '../../src/domain/tasks/notes-manager.js';
import { CleanupSuggestionManager } from '../../src/domain/lists/cleanup-suggestion-manager.js';
import { ProjectManager } from '../../src/domain/lists/project-manager.js';
import type { TodoList, TodoItem } from '../../src/shared/types/todo.js';
import { TaskStatus, Priority } from '../../src/shared/types/todo.js';

describe('Performance Tests', () => {
  let todoListManager: TodoListManager;
  let storage: MemoryStorageBackend;
  let formatter: PrettyPrintFormatter;
  let actionPlanManager: ActionPlanManager;
  let notesManager: NotesManager;
  let cleanupManager: CleanupSuggestionManager;
  let projectManager: ProjectManager;

  beforeEach(async () => {
    storage = new MemoryStorageBackend();
    await storage.initialize();
    todoListManager = new TodoListManager(storage);
    await todoListManager.initialize();
    
    formatter = new PrettyPrintFormatter();
    actionPlanManager = new ActionPlanManager();
    notesManager = new NotesManager();
    cleanupManager = new CleanupSuggestionManager();
    projectManager = new ProjectManager(storage);
  });

  afterEach(async () => {
    await todoListManager.shutdown();
    await storage.cleanup?.();
  });

  describe('Large Dataset Operations', () => {
    it('should handle 1000 todo lists efficiently', async () => {
      const startTime = performance.now();
      const listIds: string[] = [];

      // Create 1000 todo lists
      for (let i = 0; i < 1000; i++) {
        const list = await todoListManager.createTodoList({
          title: `Performance Test List ${i}`,
          description: `Test list number ${i} for performance testing`,
          projectTag: `project-${i % 10}`, // 10 different projects
          tasks: [
            {
              title: `Task 1 for list ${i}`,
              description: `First task in list ${i}`,
              priority: Priority.MEDIUM,
              tags: [`tag-${i % 5}`, 'performance'],
              estimatedDuration: 60,
            },
            {
              title: `Task 2 for list ${i}`,
              description: `Second task in list ${i}`,
              priority: Priority.LOW,
              tags: [`tag-${i % 3}`, 'test'],
              estimatedDuration: 30,
            },
          ],
        });
        listIds.push(list.id);
      }

      const creationTime = performance.now() - startTime;

      // Test retrieval performance
      const retrievalStartTime = performance.now();
      const allLists = await Promise.all(
        listIds.map(id => todoListManager.getTodoList({ listId: id }))
      );
      const retrievalTime = performance.now() - retrievalStartTime;

      expect(allLists).toHaveLength(1000);
      expect(allLists.every(list => list !== null)).toBe(true);
      
      // Performance expectations (adjust based on requirements)
      expect(creationTime).toBeLessThan(10000); // 10 seconds
      expect(retrievalTime).toBeLessThan(5000); // 5 seconds
    });

    it('should handle large todo lists with many tasks efficiently', async () => {
      const startTime = performance.now();

      // Create tasks for a large list
      const tasks = Array.from({ length: 500 }, (_, i) => ({
        title: `Large List Task ${i}`,
        description: `Task number ${i} in a large todo list`,
        priority: [Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW, Priority.MINIMAL][i % 5]!,
        tags: [`category-${i % 10}`, `type-${i % 3}`, 'large-list'],
        estimatedDuration: Math.floor(Math.random() * 240) + 30,
        actionPlan: `1. Analyze task ${i}\n2. Plan implementation\n3. Execute task\n4. Review results`,
        implementationNotes: [
          {
            content: `Implementation note for task ${i}`,
            type: 'technical' as const,
          },
        ],
      }));

      const list = await todoListManager.createTodoList({
        title: 'Large Performance Test List',
        description: 'A list with 500 tasks for performance testing',
        projectTag: 'performance-test',
        tasks,
        implementationNotes: [
          {
            content: 'This is a large list for performance testing',
            type: 'general',
          },
        ],
      });

      const creationTime = performance.now() - startTime;

      // Test retrieval performance
      const retrievalStartTime = performance.now();
      const retrievedList = await todoListManager.getTodoList({ listId: list.id });
      const retrievalTime = performance.now() - retrievalStartTime;

      expect(retrievedList).toBeDefined();
      expect(retrievedList!.items).toHaveLength(500);
      
      // Performance expectations
      expect(creationTime).toBeLessThan(5000); // 5 seconds
      expect(retrievalTime).toBeLessThan(1000); // 1 second
    });

    it('should handle complex filtering and searching efficiently', async () => {
      // Create diverse dataset
      const projects = ['web-app', 'mobile-app', 'api-service', 'data-pipeline', 'ml-model'];
      const statuses = [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.BLOCKED];
      const priorities = [Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW, Priority.MINIMAL];

      const listIds: string[] = [];
      
      for (let i = 0; i < 100; i++) {
        const list = await todoListManager.createTodoList({
          title: `Search Test List ${i}`,
          projectTag: projects[i % projects.length]!,
          tasks: Array.from({ length: 10 }, (_, j) => ({
            title: `Task ${j} - ${['frontend', 'backend', 'database', 'testing', 'deployment'][j % 5]}`,
            description: `Detailed description for task ${j} in list ${i}`,
            priority: priorities[j % priorities.length]!,
            tags: [`skill-${j % 3}`, `team-${j % 4}`, 'searchable'],
            estimatedDuration: (j + 1) * 30,
          })),
        });
        listIds.push(list.id);

        // Update some tasks to different statuses
        for (let j = 0; j < 5; j++) {
          await todoListManager.updateTodoList({
            listId: list.id,
            action: 'update_status',
            itemId: list.items[j]!.id,
            itemData: { status: statuses[j % statuses.length] },
          });
        }
      }

      // Test complex filtering performance
      const filterStartTime = performance.now();
      
      const filteredLists = await todoListManager.listTodoLists({
        filters: {
          context: 'web-app',
          status: 'active',
        },
        sorting: {
          field: 'updatedAt',
          direction: 'desc',
        },
        pagination: {
          limit: 50,
          offset: 0,
        },
      });

      const filterTime = performance.now() - filterStartTime;

      expect(filteredLists.length).toBeGreaterThan(0);
      expect(filterTime).toBeLessThan(1000); // 1 second
    });
  });

  describe('Pretty Print Performance', () => {
    it('should format large lists efficiently', async () => {
      // Create a large list for formatting
      const tasks = Array.from({ length: 200 }, (_, i) => ({
        title: `Format Test Task ${i}`,
        description: `Task ${i} with detailed description for formatting performance testing`,
        priority: [Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW][i % 4]!,
        tags: [`category-${i % 5}`, `type-${i % 3}`],
        estimatedDuration: (i + 1) * 15,
        actionPlan: `1. Step one for task ${i}\n2. Step two for task ${i}\n3. Step three for task ${i}`,
        implementationNotes: [
          {
            content: `Note ${i} for formatting test`,
            type: 'general' as const,
          },
        ],
      }));

      const list = await todoListManager.createTodoList({
        title: 'Large Formatting Test List',
        description: 'A list for testing pretty print performance',
        projectTag: 'format-test',
        tasks,
      });

      // Test formatting performance with different options
      const formatTests = [
        { name: 'Basic formatting', options: {} },
        { name: 'With action plans', options: { includeActionPlans: true } },
        { name: 'With notes', options: { includeNotes: true } },
        { name: 'Compact mode', options: { compactMode: true } },
        { name: 'Full formatting', options: { 
          includeActionPlans: true, 
          includeNotes: true, 
          includeProgress: true,
          groupBy: 'priority' as const,
        }},
      ];

      for (const test of formatTests) {
        const startTime = performance.now();
        const result = formatter.formatTaskList(list, test.options);
        const formatTime = performance.now() - startTime;
        
        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);
        expect(formatTime).toBeLessThan(500); // 500ms
      }
    });

    it('should handle colorized output efficiently', async () => {
      const tasks = Array.from({ length: 100 }, (_, i) => ({
        title: `Color Test Task ${i}`,
        priority: [Priority.CRITICAL, Priority.HIGH, Priority.MEDIUM, Priority.LOW][i % 4]!,
        tags: [`tag-${i % 3}`],
      }));

      const list = await todoListManager.createTodoList({
        title: 'Color Test List',
        projectTag: 'color-test',
        tasks,
      });

      const startTime = performance.now();
      const result = formatter.formatTaskList(list, { 
        colorize: true,
        includeProgress: true,
        groupBy: 'status',
      });
      const formatTime = performance.now() - startTime;

      expect(result.content).toContain('\x1b['); // ANSI color codes
      expect(formatTime).toBeLessThan(200); // 200ms
    });
  });

  describe('Action Plan Performance', () => {
    it('should handle complex action plans efficiently', async () => {
      // Create action plan with many steps
      const complexActionPlan = Array.from({ length: 50 }, (_, i) => 
        `${i + 1}. Complex step ${i + 1} with detailed description and multiple sub-tasks`
      ).join('\n');

      const startTime = performance.now();
      
      const actionPlan = await actionPlanManager.createActionPlan({
        taskId: 'performance-test-task',
        content: complexActionPlan,
      });

      const creationTime = performance.now() - startTime;

      expect(actionPlan.steps).toHaveLength(50);
      expect(creationTime).toBeLessThan(100); // 100ms

      // Test batch step updates
      const batchStartTime = performance.now();
      
      const updates = actionPlan.steps.slice(0, 25).map(step => ({
        stepId: step.id,
        status: 'completed' as const,
        notes: `Completed step: ${step.content}`,
      }));

      const updatedPlan = await actionPlanManager.batchUpdateSteps(actionPlan, updates);
      
      const batchTime = performance.now() - batchStartTime;

      expect(updatedPlan.steps.filter(s => s.status === 'completed')).toHaveLength(25);
      expect(batchTime).toBeLessThan(50); // 50ms
    });

    it('should calculate progress efficiently for large plans', async () => {
      const largeActionPlan = Array.from({ length: 100 }, (_, i) => 
        `${i + 1}. Step ${i + 1}`
      ).join('\n');

      const actionPlan = await actionPlanManager.createActionPlan({
        taskId: 'large-plan-test',
        content: largeActionPlan,
      });

      // Complete random steps
      const completedSteps = actionPlan.steps.filter((_, i) => i % 3 === 0);
      for (const step of completedSteps) {
        step.status = 'completed';
        step.completedAt = new Date();
      }

      const startTime = performance.now();
      const progress = actionPlanManager.calculatePlanProgress(actionPlan);
      const progressTime = performance.now() - startTime;

      expect(progress).toBeCloseTo(34, 1); // ~34% completed (every 3rd step: 0,3,6...99 = 34 steps)
      expect(progressTime).toBeLessThan(10); // 10ms
    });
  });

  describe('Notes Performance', () => {
    it('should handle large numbers of notes efficiently', async () => {
      const notes = Array.from({ length: 1000 }, (_, i) => ({
        entityId: `entity-${i % 10}`,
        entityType: 'task' as const,
        content: `Performance test note ${i} with detailed content for testing search and filtering capabilities`,
        type: ['general', 'technical', 'decision', 'learning'][i % 4] as const,
      }));

      const startTime = performance.now();
      
      const createdNotes = await Promise.all(
        notes.map(note => notesManager.createNote(note))
      );

      const creationTime = performance.now() - startTime;

      expect(createdNotes).toHaveLength(1000);
      expect(creationTime).toBeLessThan(1000); // 1 second

      // Test search performance
      const searchStartTime = performance.now();
      
      const searchResults = await notesManager.searchNotes(createdNotes, {
        query: 'performance test',
        noteType: 'technical',
        limit: 50,
      });

      const searchTime = performance.now() - searchStartTime;

      expect(searchResults.notes.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(100); // 100ms
    });

    it('should format large note collections efficiently', async () => {
      const notes = Array.from({ length: 200 }, (_, i) => ({
        id: `note-${i}`,
        content: `Formatting test note ${i} with content that needs to be displayed properly`,
        type: ['general', 'technical', 'decision', 'learning'][i % 4] as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const startTime = performance.now();
      const formatted = notesManager.formatNotesForDisplay(notes, {
        groupByType: true,
        includeMetadata: true,
      });
      const formatTime = performance.now() - startTime;

      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(0);
      expect(formatTime).toBeLessThan(100); // 100ms
    });
  });

  describe('Cleanup Suggestions Performance', () => {
    it('should generate cleanup suggestions for large datasets efficiently', async () => {
      // Create many completed lists
      const completedLists: TodoList[] = [];
      
      for (let i = 0; i < 500; i++) {
        const list = await todoListManager.createTodoList({
          title: `Completed List ${i}`,
          projectTag: `project-${i % 20}`,
          tasks: [
            {
              title: `Task ${i}`,
              priority: Priority.MEDIUM,
            },
          ],
        });

        // Mark as completed with varying ages
        const daysAgo = Math.floor(Math.random() * 30) + 1;
        list.completedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        list.progress = 100;
        list.completedItems = list.totalItems;
        
        // Mark all items as completed
        list.items.forEach(item => {
          item.status = 'completed' as any;
          item.completedAt = list.completedAt;
        });
        
        completedLists.push(list);
      }

      const startTime = performance.now();
      const suggestions = cleanupManager.generateCleanupSuggestions(completedLists);
      const suggestionTime = performance.now() - startTime;

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestionTime).toBeLessThan(500); // 500ms

      // Test batch suggestions
      const batchStartTime = performance.now();
      const batchSuggestions = cleanupManager.batchCleanupSuggestions(completedLists);
      const batchTime = performance.now() - batchStartTime;

      expect(batchSuggestions.suggestions.length).toBeGreaterThan(0);
      expect(batchTime).toBeLessThan(200); // 200ms
    });
  });

  describe('Project Management Performance', () => {
    it('should handle project statistics for many projects efficiently', async () => {
      // Create lists across many projects
      const projects = Array.from({ length: 50 }, (_, i) => `project-${i}`);
      
      for (const project of projects) {
        for (let i = 0; i < 10; i++) {
          await todoListManager.createTodoList({
            title: `${project} List ${i}`,
            projectTag: project,
            tasks: Array.from({ length: 5 }, (_, j) => ({
              title: `Task ${j}`,
              priority: Priority.MEDIUM,
            })),
          });
        }
      }

      const startTime = performance.now();
      const projectList = await projectManager.listProjects();
      const listTime = performance.now() - startTime;

      expect(projectList.length).toBe(projects.length);
      expect(listTime).toBeLessThan(1000); // 1 second

      // Test individual project statistics
      const statsStartTime = performance.now();
      const stats = await projectManager.getProjectStatistics(projects[0]!);
      const statsTime = performance.now() - statsStartTime;

      expect(stats.totalLists).toBe(10);
      expect(statsTime).toBeLessThan(100); // 100ms
    });
  });

  describe('Memory Usage', () => {
    it('should maintain reasonable memory usage with large datasets', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create a substantial dataset
      const listIds: string[] = [];
      
      for (let i = 0; i < 100; i++) {
        const list = await todoListManager.createTodoList({
          title: `Memory Test List ${i}`,
          projectTag: `memory-project-${i % 5}`,
          tasks: Array.from({ length: 20 }, (_, j) => ({
            title: `Memory Task ${j}`,
            description: `Task ${j} for memory usage testing with detailed description`,
            priority: Priority.MEDIUM,
            actionPlan: `1. Memory step 1\n2. Memory step 2\n3. Memory step 3`,
            implementationNotes: [
              {
                content: `Memory note ${j} with content`,
                type: 'general' as const,
              },
            ],
            tags: [`memory-tag-${j % 3}`],
          })),
          implementationNotes: [
            {
              content: `List-level memory note ${i}`,
              type: 'general',
            },
          ],
        });
        listIds.push(list.id);
      }

      const afterCreationMemory = process.memoryUsage();
      
      // Perform various operations
      await Promise.all(listIds.map(id => todoListManager.getTodoList({ listId: id })));
      
      const finalMemory = process.memoryUsage();
      
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseKB = memoryIncrease / 1024;
      
      // Memory usage should be reasonable (adjust based on requirements)
      expect(memoryIncreaseKB).toBeLessThan(50000); // 50MB for 100 lists with 20 tasks each
    });
  });
});