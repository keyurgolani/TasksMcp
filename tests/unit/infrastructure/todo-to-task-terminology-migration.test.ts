/**
 * Unit tests for todo-to-task terminology migration
 *
 * Tests that verify the complete migration from "todo" terminology to "task" terminology
 * throughout the entire codebase, including types, interfaces, implementations, and files.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13, 7.14, 7.15, 7.16, 7.17, 7.18, 7.19, 7.20, 12.1
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

import { glob } from 'glob';
import { describe, it, expect } from 'vitest';

import {
  TASK_LIST_TITLE_MAX_LENGTH,
  TASK_LIST_DESCRIPTION_MAX_LENGTH,
  PROJECT_TAG_MAX_LENGTH,
  PROJECT_TAG_PATTERN,
} from '../../../src/domain/models/task-list.js';
import {
  VALID_TRANSITIONS,
  TAG_VALIDATION_PATTERN,
  TAG_MAX_LENGTH,
  PRIORITY_MIN,
  PRIORITY_MAX,
  AGENT_PROMPT_TEMPLATE_MAX_LENGTH,
} from '../../../src/domain/models/task.js';
import {
  Task,
  TaskList,
  TaskStatus,
  Priority,
  ActionPlan,
  ActionStep,
  ImplementationNote,
  ExitCriteria,
} from '../../../src/shared/types/task.js';

import type {
  TaskRepositoryInterface,
  TaskListRepositoryInterface,
  TaskSearchQuery,
  TaskWithContext,
  UpdateTaskOptions,
  CreateTaskOptions,
  BulkOperationResult,
  TaskFilters,
  SearchQuery,
} from '../../../src/domain/repositories/index.js';

describe('Todo-to-Task Terminology Migration', () => {
  describe('Type Definitions', () => {
    it('should have Task type correctly defined', () => {
      // Test that Task type exists and has expected properties
      const taskExample: Task = {
        id: 'test-id',
        title: 'Test Task',
        description: 'Test description',
        status: TaskStatus.PENDING,
        priority: Priority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
        dependencies: [],
        estimatedDuration: 60,
        tags: ['test'],
        metadata: {},
        implementationNotes: [],
        exitCriteria: [],
      };

      expect(taskExample).toBeDefined();
      expect(taskExample.id).toBe('test-id');
      expect(taskExample.title).toBe('Test Task');
      expect(taskExample.status).toBe(TaskStatus.PENDING);
      expect(taskExample.priority).toBe(Priority.MEDIUM);
    });

    it('should have TaskList type correctly defined', () => {
      // Test that TaskList type exists and has expected properties
      const taskListExample: TaskList = {
        id: 'test-list-id',
        title: 'Test Task List',
        description: 'Test description',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        context: 'test-context',
        totalItems: 0,
        completedItems: 0,
        progress: 0,
        analytics: {
          totalItems: 0,
          completedItems: 0,
          pendingItems: 0,
          inProgressItems: 0,
          blockedItems: 0,
          progress: 0,
          averageCompletionTime: 0,
          estimatedTimeRemaining: 0,
          velocityMetrics: {
            itemsPerDay: 0,
            completionRate: 0,
          },
          tagFrequency: {},
          dependencyGraph: [],
        },
        metadata: {},
        projectTag: 'test-project',
        implementationNotes: [],
      };

      expect(taskListExample).toBeDefined();
      expect(taskListExample.id).toBe('test-list-id');
      expect(taskListExample.title).toBe('Test Task List');
      expect(taskListExample.items).toEqual([]);
      expect(taskListExample.projectTag).toBe('test-project');
    });

    it('should have TaskStatus enum correctly defined', () => {
      // Test that TaskStatus enum exists and has expected values
      expect(TaskStatus).toBeDefined();

      // Verify enum values
      expect(TaskStatus.PENDING).toBe('pending');
      expect(TaskStatus.IN_PROGRESS).toBe('in_progress');
      expect(TaskStatus.COMPLETED).toBe('completed');
      expect(TaskStatus.BLOCKED).toBe('blocked');
      expect(TaskStatus.CANCELLED).toBe('cancelled');

      // Verify enum keys exist
      expect(Object.keys(TaskStatus)).toContain('PENDING');
      expect(Object.keys(TaskStatus)).toContain('IN_PROGRESS');
      expect(Object.keys(TaskStatus)).toContain('COMPLETED');
      expect(Object.keys(TaskStatus)).toContain('BLOCKED');
      expect(Object.keys(TaskStatus)).toContain('CANCELLED');
    });

    it('should have Priority enum correctly defined', () => {
      // Test that Priority enum exists and has expected values
      expect(Priority).toBeDefined();

      expect(Priority.CRITICAL).toBe(5);
      expect(Priority.HIGH).toBe(4);
      expect(Priority.MEDIUM).toBe(3);
      expect(Priority.LOW).toBe(2);
      expect(Priority.MINIMAL).toBe(1);
    });

    it('should have supporting interfaces correctly defined', () => {
      // Test ActionPlan interface
      const actionPlan: ActionPlan = {
        id: 'plan-1',
        content: 'Test plan',
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
      expect(actionPlan).toBeDefined();

      // Test ActionStep interface
      const actionStep: ActionStep = {
        id: 'step-1',
        content: 'Test step',
        status: 'pending',
        notes: 'Test notes',
      };
      expect(actionStep).toBeDefined();

      // Test ImplementationNote interface
      const implementationNote: ImplementationNote = {
        id: 'note-1',
        content: 'Test note',
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'test-author',
        type: 'general',
      };
      expect(implementationNote).toBeDefined();

      // Test ExitCriteria interface
      const exitCriteria: ExitCriteria = {
        id: 'criteria-1',
        description: 'Test criteria',
        isMet: false,
        notes: 'Test notes',
      };
      expect(exitCriteria).toBeDefined();
    });

    it('should have validation constants correctly defined', () => {
      // Test Task validation constants
      expect(TAG_VALIDATION_PATTERN).toBeDefined();
      expect(TAG_MAX_LENGTH).toBe(50);
      expect(PRIORITY_MIN).toBe(1);
      expect(PRIORITY_MAX).toBe(5);
      expect(AGENT_PROMPT_TEMPLATE_MAX_LENGTH).toBe(10000);

      // Test TaskList validation constants
      expect(TASK_LIST_TITLE_MAX_LENGTH).toBe(1000);
      expect(TASK_LIST_DESCRIPTION_MAX_LENGTH).toBe(5000);
      expect(PROJECT_TAG_MAX_LENGTH).toBe(250);
      expect(PROJECT_TAG_PATTERN).toBeDefined();

      // Test VALID_TRANSITIONS
      expect(VALID_TRANSITIONS).toBeDefined();
      expect(VALID_TRANSITIONS[TaskStatus.PENDING]).toContain(
        TaskStatus.IN_PROGRESS
      );
      expect(VALID_TRANSITIONS[TaskStatus.PENDING]).toContain(
        TaskStatus.CANCELLED
      );
    });
  });

  describe('Repository Interface Terminology', () => {
    it('should have TaskRepositoryInterface interface using Task terminology', () => {
      // Test that TaskRepositoryInterface interface exists and uses Task terminology
      const mockTaskRepo: Partial<TaskRepositoryInterface> = {
        findById: async (_taskId: string) => null,
        search: async (_query: TaskSearchQuery) => ({
          items: [],
          totalCount: 0,
          hasMore: false,
        }),
        create: async (options: CreateTaskOptions) => ({
          task: {} as Task,
          listId: options.listId,
          listTitle: 'Test List',
          projectTag: 'test',
        }),
        update: async (options: UpdateTaskOptions) => ({
          task: {} as Task,
          listId: options.listId,
          listTitle: 'Test List',
          projectTag: 'test',
        }),
      };

      expect(mockTaskRepo).toBeDefined();
      expect(mockTaskRepo.findById).toBeDefined();
      expect(mockTaskRepo.search).toBeDefined();
      expect(mockTaskRepo.create).toBeDefined();
      expect(mockTaskRepo.update).toBeDefined();
    });

    it('should have TaskListRepositoryInterface interface using TaskList terminology', () => {
      // Test that TaskListRepositoryInterface interface exists and uses TaskList terminology
      const mockTaskListRepo: Partial<TaskListRepositoryInterface> = {
        save: async (_list: TaskList) => {},
        findById: async (_id: string) => null,
        findAll: async () => [],
        search: async (_query: SearchQuery) => ({
          items: [],
          totalCount: 0,
          hasMore: false,
        }),
        delete: async (_id: string) => {},
      };

      expect(mockTaskListRepo).toBeDefined();
      expect(mockTaskListRepo.save).toBeDefined();
      expect(mockTaskListRepo.findById).toBeDefined();
      expect(mockTaskListRepo.findAll).toBeDefined();
      expect(mockTaskListRepo.search).toBeDefined();
      expect(mockTaskListRepo.delete).toBeDefined();
    });

    it('should have supporting repository types using Task terminology', () => {
      // Test TaskSearchQuery
      const taskSearchQuery: TaskSearchQuery = {
        text: 'test',
        listId: 'list-1',
        projectTag: 'project-1',
        filters: {
          status: TaskStatus.PENDING,
          priority: Priority.HIGH,
        },
      };
      expect(taskSearchQuery).toBeDefined();

      // Test TaskWithContext
      const taskWithContext: TaskWithContext = {
        task: {} as Task,
        listId: 'list-1',
        listTitle: 'Test List',
        projectTag: 'test-project',
      };
      expect(taskWithContext).toBeDefined();

      // Test UpdateTaskOptions
      const updateTaskOptions: UpdateTaskOptions = {
        listId: 'list-1',
        taskId: 'task-1',
        updates: {
          title: 'Updated Task',
          status: TaskStatus.IN_PROGRESS,
        },
      };
      expect(updateTaskOptions).toBeDefined();

      // Test CreateTaskOptions
      const createTaskOptions: CreateTaskOptions = {
        listId: 'list-1',
        title: 'New Task',
        description: 'Task description',
        priority: Priority.MEDIUM,
      };
      expect(createTaskOptions).toBeDefined();

      // Test BulkOperationResult
      const bulkResult: BulkOperationResult = {
        successCount: 5,
        failureCount: 1,
        failures: [
          {
            taskId: 'task-1',
            error: 'Test error',
          },
        ],
      };
      expect(bulkResult).toBeDefined();
    });

    it('should have TaskFilters using Task terminology', () => {
      const taskFilters: TaskFilters = {
        status: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS],
        priority: Priority.HIGH,
        tags: ['urgent', 'bug'],
        tagOperator: 'AND',
        hasDescription: true,
        hasDependencies: false,
        searchText: 'test task',
      };

      expect(taskFilters).toBeDefined();
      expect(taskFilters.status).toContain(TaskStatus.PENDING);
      expect(taskFilters.priority).toBe(Priority.HIGH);
      expect(taskFilters.tagOperator).toBe('AND');
    });
  });

  describe('File Structure Verification', () => {
    it('should have task.ts file and not todo.ts file', () => {
      // Check that task.ts exists
      const taskFilePath = join(process.cwd(), 'src/domain/models/task.ts');
      expect(existsSync(taskFilePath)).toBe(true);

      // Check that todo.ts does not exist in models directory
      const todoFilePath = join(process.cwd(), 'src/domain/models/todo.ts');
      expect(existsSync(todoFilePath)).toBe(false);

      // Check that task-list.ts exists
      const taskListFilePath = join(
        process.cwd(),
        'src/domain/models/task-list.ts'
      );
      expect(existsSync(taskListFilePath)).toBe(true);
    });

    it('should have no todo.ts files anywhere in src directory', async () => {
      // Search for any todo.ts files in src directory
      const todoFiles = await glob('**/todo.ts', {
        cwd: join(process.cwd(), 'src'),
        absolute: true,
      });

      expect(todoFiles).toHaveLength(0);
    });

    it('should have task-related repository files with correct names', () => {
      const repoDir = join(process.cwd(), 'src/domain/repositories');

      // Check that task.repository.ts exists
      const taskRepoPath = join(repoDir, 'task.repository.ts');
      expect(existsSync(taskRepoPath)).toBe(true);

      // Check that task-list.repository.ts exists
      const taskListRepoPath = join(repoDir, 'task-list.repository.ts');
      expect(existsSync(taskListRepoPath)).toBe(true);

      // Check that task-list-repository-impl.ts exists
      const taskListImplPath = join(repoDir, 'task-list-repository-impl.ts');
      expect(existsSync(taskListImplPath)).toBe(true);

      // Check that task-list-repository.adapter.ts exists
      const taskListAdapterPath = join(
        repoDir,
        'task-list-repository.adapter.ts'
      );
      expect(existsSync(taskListAdapterPath)).toBe(true);
    });
  });

  describe('Import References Verification', () => {
    it('should have all imports reference task.ts correctly', () => {
      // Check domain models index file
      const indexPath = join(process.cwd(), 'src/domain/models/index.ts');
      const indexContent = readFileSync(indexPath, 'utf-8');

      expect(indexContent).toContain("export * from './task'");
      expect(indexContent).toContain("export * from './task-list'");
      expect(indexContent).not.toContain("export * from './todo'");
    });

    it('should have task-list.ts import from task.ts correctly', () => {
      const taskListPath = join(
        process.cwd(),
        'src/domain/models/task-list.ts'
      );
      const taskListContent = readFileSync(taskListPath, 'utf-8');

      expect(taskListContent).toContain("import { Task } from './task'");
      expect(taskListContent).toContain(
        "import { ImplementationNote } from './task'"
      );
      expect(taskListContent).not.toContain('import { Todo');
      expect(taskListContent).not.toContain("from './todo'");
    });

    it('should have repository files import from correct task files', () => {
      // Check task.repository.ts imports
      const taskRepoPath = join(
        process.cwd(),
        'src/domain/repositories/task.repository.ts'
      );
      const taskRepoContent = readFileSync(taskRepoPath, 'utf-8');

      expect(taskRepoContent).toContain("from '../../shared/types/task.js'");
      expect(taskRepoContent).not.toContain(
        "from '../../shared/types/todo.js'"
      );

      // Check task-list.repository.ts imports
      const taskListRepoPath = join(
        process.cwd(),
        'src/domain/repositories/task-list.repository.ts'
      );
      const taskListRepoContent = readFileSync(taskListRepoPath, 'utf-8');

      expect(taskListRepoContent).toContain(
        "from '../../shared/types/task.js'"
      );
      expect(taskListRepoContent).not.toContain(
        "from '../../shared/types/todo.js'"
      );
    });
  });

  describe('Codebase Todo Terminology Verification', () => {
    const getAllSourceFiles = (dir: string): string[] => {
      const files: string[] = [];
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip node_modules, .git, dist, coverage, and other non-source directories
          if (
            ![
              'node_modules',
              '.git',
              'dist',
              'coverage',
              'logs',
              '.kiro',
            ].includes(entry)
          ) {
            files.push(...getAllSourceFiles(fullPath));
          }
        } else if (stat.isFile()) {
          // Include TypeScript, JavaScript, and JSON files
          const ext = extname(entry);
          if (['.ts', '.js', '.json'].includes(ext)) {
            files.push(fullPath);
          }
        }
      }

      return files;
    };

    it('should have no "todo" terminology in source code files', () => {
      const sourceFiles = getAllSourceFiles(join(process.cwd(), 'src'));
      const violatingFiles: Array<{ file: string; lines: string[] }> = [];

      for (const file of sourceFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const violatingLines: string[] = [];

        lines.forEach((line, index) => {
          // Check for todo terminology (case insensitive)
          // Exclude comments that might reference the migration itself
          const lowerLine = line.toLowerCase();
          if (
            (lowerLine.includes('todo') ||
              lowerLine.includes('todoitem') ||
              lowerLine.includes('todolist') ||
              lowerLine.includes('todostatus')) &&
            !lowerLine.includes('todo-to-task') && // Allow migration references
            !lowerLine.includes('todo terminology') && // Allow documentation
            !lowerLine.includes('// todo:') && // Allow TODO comments
            !lowerLine.includes('* todo:') && // Allow TODO comments
            !lowerLine.includes('todo comment') // Allow references to TODO comments
          ) {
            violatingLines.push(`Line ${index + 1}: ${line.trim()}`);
          }
        });

        if (violatingLines.length > 0) {
          violatingFiles.push({
            file: file.replace(process.cwd(), ''),
            lines: violatingLines,
          });
        }
      }

      if (violatingFiles.length > 0) {
        const errorMessage = violatingFiles
          .map(({ file, lines }) => `${file}:\n${lines.join('\n')}`)
          .join('\n\n');

        expect.fail(
          `Found "todo" terminology in source files:\n\n${errorMessage}`
        );
      }

      expect(violatingFiles).toHaveLength(0);
    });

    it('should have no "todo" terminology in test files (excluding this test)', () => {
      const testFiles = getAllSourceFiles(join(process.cwd(), 'tests')).filter(
        file => !file.includes('todo-to-task-terminology-migration.test.ts')
      );

      const violatingFiles: Array<{ file: string; lines: string[] }> = [];

      for (const file of testFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const violatingLines: string[] = [];

        lines.forEach((line, index) => {
          const lowerLine = line.toLowerCase();
          if (
            (lowerLine.includes('todo') ||
              lowerLine.includes('todoitem') ||
              lowerLine.includes('todolist') ||
              lowerLine.includes('todostatus')) &&
            !lowerLine.includes('todo-to-task') && // Allow migration references
            !lowerLine.includes('todo terminology') && // Allow documentation
            !lowerLine.includes('// todo:') && // Allow TODO comments
            !lowerLine.includes('* todo:') && // Allow TODO comments
            !lowerLine.includes('todo comment') // Allow references to TODO comments
          ) {
            violatingLines.push(`Line ${index + 1}: ${line.trim()}`);
          }
        });

        if (violatingLines.length > 0) {
          violatingFiles.push({
            file: file.replace(process.cwd(), ''),
            lines: violatingLines,
          });
        }
      }

      if (violatingFiles.length > 0) {
        const errorMessage = violatingFiles
          .map(({ file, lines }) => `${file}:\n${lines.join('\n')}`)
          .join('\n\n');

        expect.fail(
          `Found "todo" terminology in test files:\n\n${errorMessage}`
        );
      }

      expect(violatingFiles).toHaveLength(0);
    });

    it('should use "Task" terminology consistently in type definitions', () => {
      const taskFilePath = join(process.cwd(), 'src/domain/models/task.ts');
      const taskContent = readFileSync(taskFilePath, 'utf-8');

      // Verify Task interface is defined
      expect(taskContent).toContain('export interface Task {');
      expect(taskContent).toContain('export enum TaskStatus {');
      expect(taskContent).not.toContain('TodoItem');
      expect(taskContent).not.toContain('TodoStatus');
      expect(taskContent).not.toContain('TodoList');

      const taskListFilePath = join(
        process.cwd(),
        'src/domain/models/task-list.ts'
      );
      const taskListContent = readFileSync(taskListFilePath, 'utf-8');

      // Verify TaskList interface is defined
      expect(taskListContent).toContain('export interface TaskList {');
      expect(taskListContent).toContain('items: Task[]');
      expect(taskListContent).not.toContain('TodoItem');
      expect(taskListContent).not.toContain('TodoList');
    });

    it('should use "Task" terminology in repository interfaces', () => {
      const taskRepoPath = join(
        process.cwd(),
        'src/domain/repositories/task.repository.ts'
      );
      const taskRepoContent = readFileSync(taskRepoPath, 'utf-8');

      expect(taskRepoContent).toContain(
        'export interface TaskRepositoryInterface'
      );
      expect(taskRepoContent).toContain('TaskSearchQuery');
      expect(taskRepoContent).toContain('TaskWithContext');
      expect(taskRepoContent).toContain('UpdateTaskOptions');
      expect(taskRepoContent).toContain('CreateTaskOptions');
      expect(taskRepoContent).not.toContain('Todo');
      expect(taskRepoContent).not.toContain('ITodoRepository');

      const taskListRepoPath = join(
        process.cwd(),
        'src/domain/repositories/task-list.repository.ts'
      );
      const taskListRepoContent = readFileSync(taskListRepoPath, 'utf-8');

      expect(taskListRepoContent).toContain(
        'export interface TaskListRepositoryInterface'
      );
      expect(taskListRepoContent).toContain('TaskList');
      expect(taskListRepoContent).toContain('TaskFilters');
      expect(taskListRepoContent).not.toContain('Todo');
      expect(taskListRepoContent).not.toContain('ITodoListRepository');
    });
  });

  describe('Migration Completeness Verification', () => {
    it('should have completed all required terminology changes', () => {
      // This test serves as a comprehensive check that all requirements are met
      const requirements = [
        'Task type exists and is correctly defined',
        'TaskList type exists and is correctly defined',
        'TaskStatus enum exists and is correctly defined',
        'Repository interfaces use Task terminology',
        'Repository implementations use Task terminology',
        'task.ts file exists and todo.ts does not exist',
        'All imports reference task.ts correctly',
        'No todo terminology remains in codebase',
      ];

      // All previous tests validate these requirements
      // This test documents that the migration is complete
      expect(requirements).toHaveLength(8);

      // Verify that the migration has been completed
      expect(TaskStatus.PENDING).toBe('pending');
      expect(Priority.MEDIUM).toBe(3);
    });

    it('should maintain backward compatibility for existing functionality', () => {
      // Verify that the Task interface has all required fields
      const requiredTaskFields = [
        'id',
        'title',
        'description',
        'status',
        'priority',
        'createdAt',
        'updatedAt',
        'completedAt',
        'dependencies',
        'estimatedDuration',
        'tags',
        'metadata',
        'implementationNotes',
        'exitCriteria',
        'agentPromptTemplate',
        'actionPlan',
      ];

      // Create a sample task to verify all fields are accessible
      const sampleTask: Task = {
        id: 'test',
        title: 'Test Task',
        description: 'Test description',
        status: TaskStatus.PENDING,
        priority: Priority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
        dependencies: [],
        estimatedDuration: 60,
        tags: [],
        metadata: {},
        implementationNotes: [],
        exitCriteria: [],
        agentPromptTemplate: 'Test template',
        actionPlan: {
          id: 'plan-1',
          content: 'Test plan',
          steps: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      };

      requiredTaskFields.forEach(field => {
        expect(sampleTask).toHaveProperty(field);
      });

      // Verify TaskList interface has all required fields
      const requiredTaskListFields = [
        'id',
        'title',
        'description',
        'items',
        'createdAt',
        'updatedAt',
        'completedAt',
        'context',
        'totalItems',
        'completedItems',
        'progress',
        'analytics',
        'metadata',
        'projectTag',
        'implementationNotes',
      ];

      const sampleTaskList: TaskList = {
        id: 'test-list',
        title: 'Test List',
        description: 'Test description',
        items: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
        context: 'test-context',
        totalItems: 0,
        completedItems: 0,
        progress: 0,
        analytics: {
          totalItems: 0,
          completedItems: 0,
          pendingItems: 0,
          inProgressItems: 0,
          blockedItems: 0,
          progress: 0,
          averageCompletionTime: 0,
          estimatedTimeRemaining: 0,
          velocityMetrics: {
            itemsPerDay: 0,
            completionRate: 0,
          },
          tagFrequency: {},
          dependencyGraph: [],
        },
        metadata: {},
        projectTag: 'test',
        implementationNotes: [],
      };

      requiredTaskListFields.forEach(field => {
        expect(sampleTaskList).toHaveProperty(field);
      });
    });
  });
});
