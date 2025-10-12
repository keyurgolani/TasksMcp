/**
 * Core business logic for todo list management
 */

import { v4 as uuidv4 } from 'uuid';

import { cacheManager } from '../../infrastructure/storage/cache-manager.js';
import {
  TaskStatus,
  Priority,
  type TaskList,
  type Task,
  type TaskListSummary,
  type ListAnalytics,
  type GetTaskListFilters,
  type GetTaskListPagination,
  type ImplementationNote,
  type ExitCriteria,
  type ActionPlan,
  type DependencyNode,
} from '../../shared/types/task.js';
import { FilteringUtils } from '../../shared/utils/filtering.js';
import { logger } from '../../shared/utils/logger.js';
import {
  memoryCleanupManager,
  MemoryUtils,
} from '../../shared/utils/memory-cleanup.js';
import { memoryLeakPrevention } from '../../shared/utils/memory-leak-prevention.js';
import { PrettyPrintFormatter } from '../../shared/utils/pretty-print-formatter.js';
import { ActionPlanManager } from '../tasks/action-plan-manager.js';
import {
  DependencyResolver,
  type DependencyGraph,
  type DependencyValidationResult,
} from '../tasks/dependency-manager.js';
import { ExitCriteriaManager } from '../tasks/exit-criteria-manager.js';
import { NotesManager } from '../tasks/notes-manager.js';

import { ProjectManager } from './project-manager.js';

import type {
  StorageBackend,
  ListOptions,
} from '../../shared/types/storage.js';
import type { SortOptions } from '../repositories/task-list.repository.js';
import type { ITaskListRepository } from '../repositories/task-list.repository.js';

export interface CreateTaskListInput {
  title: string;
  description?: string;
  tasks?: Array<{
    title: string;
    description?: string;
    priority?: Priority;
    estimatedDuration?: number;
    tags?: string[];
    actionPlan?: string; // Action plan content for the task
    implementationNotes?: Array<{
      content: string;
      type: 'general' | 'technical' | 'decision' | 'learning';
    }>; // Initial implementation notes for the task
    exitCriteria?: string[]; // Exit criteria descriptions for the task
  }>;
  context?: string; // Deprecated, use projectTag
  projectTag?: string; // v2 field
  implementationNotes?: Array<{
    content: string;
    type: 'general' | 'technical' | 'decision' | 'learning';
  }>; // Initial implementation notes for the list
}

export interface GetTaskListInput {
  listId: string;
  includeCompleted?: boolean | undefined;
  filters?: GetTaskListFilters | undefined;
  sorting?: SortOptions | undefined;
  pagination?: GetTaskListPagination | undefined;
}

export interface UpdateTaskListInput {
  listId: string;
  action:
    | 'add_item'
    | 'update_item'
    | 'remove_item'
    | 'update_status'
    | 'update_action_plan'
    | 'update_step_progress'
    | 'add_task_note'
    | 'add_list_note';
  itemData?: {
    title?: string;
    description?: string;
    priority?: Priority;
    status?: TaskStatus;
    estimatedDuration?: number;
    tags?: string[];
    dependencies?: string[];
    actionPlan?: string | ActionPlan; // Action plan content (string) or ActionPlan object
    exitCriteria?: string[]; // Exit criteria descriptions (for creating new)
    exitCriteriaObjects?: ExitCriteria[]; // Exit criteria objects (for updating existing)
    implementationNotes?: ImplementationNote[]; // Implementation notes array
  };
  itemId?: string;
  stepId?: string; // For step progress updates
  stepStatus?: 'pending' | 'in_progress' | 'completed';
  stepNotes?: string;
  // Fields for adding notes
  noteContent?: string;
  noteType?: 'general' | 'technical' | 'decision' | 'learning';
}

export interface ListTaskListsInput {
  context?: string | undefined; // Deprecated, use projectTag
  projectTag?: string | undefined; // v2 field
  status?: 'active' | 'completed' | 'all' | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface DeleteTaskListInput {
  listId: string;
  permanent?: boolean;
}

export interface DeleteTaskListResult {
  success: boolean;
  operation: 'archived' | 'deleted';
  message: string;
}

export class TaskListManager {
  private readonly dependencyResolver: DependencyResolver;

  private readonly actionPlanManager: ActionPlanManager;
  private readonly notesManager: NotesManager;
  private readonly exitCriteriaManager: ExitCriteriaManager;

  private readonly prettyPrintFormatter: PrettyPrintFormatter;
  private readonly projectManager: ProjectManager;
  private readonly listCache = new Map<string, WeakRef<TaskList>>();
  private cleanupInterval: NodeJS.Timeout | undefined;
  private memoryCleanupInterval: NodeJS.Timeout | undefined;
  private isShuttingDown = false;
  private readonly MAX_CACHE_SIZE = 10; // Very aggressive memory management

  // Keep storage reference for backward compatibility with ProjectManager
  private readonly storage: StorageBackend | undefined;

  constructor(
    private readonly repository: ITaskListRepository,
    storage?: StorageBackend
  ) {
    this.dependencyResolver = new DependencyResolver(repository);

    this.actionPlanManager = new ActionPlanManager(repository);
    this.notesManager = new NotesManager(repository);
    this.exitCriteriaManager = new ExitCriteriaManager(repository);

    this.prettyPrintFormatter = new PrettyPrintFormatter();
    this.storage = storage;
    // ProjectManager still needs storage for now - will be refactored in task 4
    this.projectManager = new ProjectManager(storage!);
    this.setupMemoryManagement();
  }

  async initialize(): Promise<void> {
    // Repository health check instead of storage initialization
    const isHealthy = await this.repository.healthCheck();
    if (!isHealthy) {
      throw new Error('Repository health check failed');
    }

    // Initialize all components
    // Note: ProjectManager doesn't require async initialization

    // Initialize cache manager (it's a singleton but ensure it's set up)
    // The cache manager sets up its own memory management

    // Start memory leak prevention system
    memoryLeakPrevention.start();

    // Register cache with memory leak prevention
    memoryLeakPrevention.registerCache(
      'todo-list-cache',
      this.listCache as Map<unknown, unknown>
    );

    // Register cleanup tasks
    memoryCleanupManager.registerCleanupTask({
      name: 'todo-list-manager-cache',
      cleanup: () => this.cleanupCache(),
      priority: 'medium',
    });

    memoryCleanupManager.registerCleanupTask({
      name: 'todo-list-manager-shutdown',
      cleanup: () => this.shutdown(),
      priority: 'high',
    });

    logger.info('TaskListManager initialized successfully');
  }

  // Getter methods for components
  getActionPlanManager(): ActionPlanManager {
    return this.actionPlanManager;
  }

  getNotesManager(): NotesManager {
    return this.notesManager;
  }

  getPrettyPrintFormatter(): PrettyPrintFormatter {
    return this.prettyPrintFormatter;
  }

  getProjectManager(): ProjectManager {
    return this.projectManager;
  }

  async createTaskList(input: CreateTaskListInput): Promise<TaskList> {
    try {
      logger.info('Creating new task list', {
        title: input.title,
        context: input.context,
        projectTag: input.projectTag,
      });

      const now = new Date();
      const listId = uuidv4();

      // Create todo items from input tasks
      const items: Task[] = [];
      if (input.tasks) {
        for (const taskInput of input.tasks) {
          const item: Task = {
            id: uuidv4(),
            title: taskInput.title,
            ...(taskInput.description !== undefined && {
              description: taskInput.description,
            }),
            status: TaskStatus.PENDING,
            priority: taskInput.priority ?? (3 as Priority),
            createdAt: now,
            updatedAt: now,
            dependencies: [],
            ...(taskInput.estimatedDuration !== undefined && {
              estimatedDuration: taskInput.estimatedDuration,
            }),
            tags: taskInput.tags ?? [],
            metadata: {},
            // v2 fields
            implementationNotes: [],
            exitCriteria: [],
          };

          // Create action plan if provided
          if (taskInput.actionPlan) {
            try {
              const actionPlan = await this.actionPlanManager.createActionPlan({
                taskId: item.id,
                content: taskInput.actionPlan,
              });
              item.actionPlan = actionPlan;
            } catch (error) {
              logger.warn('Failed to create action plan for task', {
                taskId: item.id,
                taskTitle: item.title,
                error,
              });
              // Continue without action plan rather than failing the entire operation
            }
          }

          // Add implementation notes if provided
          if (taskInput.implementationNotes) {
            try {
              for (const noteInput of taskInput.implementationNotes) {
                const note = await this.notesManager.addTaskNote(
                  item.id,
                  noteInput.content,
                  noteInput.type
                );
                item.implementationNotes.push(note);
              }
            } catch (error) {
              logger.warn('Failed to create implementation notes for task', {
                taskId: item.id,
                taskTitle: item.title,
                error,
              });
              // Continue without notes rather than failing the entire operation
            }
          }

          items.push(item);
        }
      }

      // Calculate initial analytics
      const analytics = this.calculateAnalytics(items);

      const todoList: TaskList = {
        id: listId,
        title: input.title,
        ...(input.description !== undefined && {
          description: input.description,
        }),
        items,
        createdAt: now,
        updatedAt: now,
        context: input.projectTag ?? input.context ?? 'default',
        isArchived: false,
        totalItems: analytics.totalItems,
        completedItems: analytics.completedItems,
        progress: analytics.progress,
        analytics,
        metadata: {},
        // v2 fields
        projectTag: input.projectTag ?? input.context ?? 'default',
        implementationNotes: [],
      };

      // Add list-level implementation notes if provided
      if (input.implementationNotes) {
        try {
          for (const noteInput of input.implementationNotes) {
            const note = await this.notesManager.addListNote(
              listId,
              noteInput.content,
              noteInput.type
            );
            todoList.implementationNotes.push(note);
          }
        } catch (error) {
          logger.warn('Failed to create implementation notes for list', {
            listId,
            listTitle: input.title,
            error,
          });
          // Continue without notes rather than failing the entire operation
        }
      }

      // Save to repository
      await this.repository.save(todoList);

      // Cache the list in both caches
      cacheManager.setTodoList(listId, todoList);
      this.addToCache(listId, todoList);

      logger.info('Todo list created successfully', {
        id: listId,
        title: input.title,
        itemCount: items.length,
      });

      return todoList;
    } catch (error) {
      logger.error('Failed to create todo list', { title: input.title, error });
      throw error;
    }
  }

  async getTaskList(input: GetTaskListInput): Promise<TaskList | null> {
    try {
      logger.debug('Retrieving task list with advanced filtering', {
        listId: input.listId,
        hasFilters: !!input.filters,

        hasPagination: !!input.pagination,
      });

      // Check high-performance cache first
      let todoList = cacheManager.getTaskList(input.listId) as TaskList | null;

      // If we have a cached list but it's archived, don't return it (archived lists are not returned by default)
      if (todoList?.isArchived === true) {
        logger.debug('Todo list is archived, not returning', {
          listId: input.listId,
        });
        return null;
      }

      if (!todoList) {
        // Check legacy cache as fallback
        const cachedRef = this.listCache.get(input.listId);
        todoList = (cachedRef?.deref() ?? null) as TaskList | null;

        if (!todoList) {
          const loadedList = await this.repository.findById(input.listId);

          if (loadedList === null) {
            logger.debug('Task list not found', { listId: input.listId });
            return null;
          }

          todoList = loadedList;

          // Update both caches
          cacheManager.setTodoList(input.listId, todoList);
          this.addToCache(input.listId, todoList);
        } else {
          // Update high-performance cache from legacy cache
          cacheManager.setTodoList(input.listId, todoList);
        }
      }

      // Start with all items
      let processedItems = [...todoList.items];

      // Apply legacy includeCompleted filter for backward compatibility
      if (input.includeCompleted === false) {
        processedItems = processedItems.filter(
          item => item.status !== TaskStatus.COMPLETED
        );
      }

      // Validate advanced filtering parameters
      if (input.filters) {
        FilteringUtils.validateFilters(input.filters);
      }

      if (input.pagination) {
        FilteringUtils.validatePagination(input.pagination);
      }

      // Apply advanced filtering, sorting, and pagination
      const processingResult = FilteringUtils.processItems(
        processedItems,
        input.filters,
        input.sorting,
        input.pagination
      );

      // Calculate analytics for the full list (before filtering)
      const fullListAnalytics = this.calculateAnalytics(todoList.items);

      // Calculate analytics for filtered items if filtering was applied
      const displayedAnalytics =
        input.filters != null || input.includeCompleted === false
          ? this.calculateAnalytics(processingResult.items)
          : fullListAnalytics;

      // Create the response with processed items
      const resultList: TaskList = {
        ...todoList,
        items: processingResult.items,
        totalItems: displayedAnalytics.totalItems, // Use analytics total items
        completedItems: displayedAnalytics.completedItems,
        progress: displayedAnalytics.progress,
        analytics: {
          ...displayedAnalytics,
          // Add metadata about filtering/pagination - keep the filtered totalItems
          // Add pagination metadata to analytics
          ...(input.pagination && {
            paginationMetadata: {
              filteredCount: processingResult.filteredCount,
              hasMore: processingResult.hasMore,
              offset: input.pagination.offset ?? 0,
              limit: input.pagination.limit ?? processingResult.filteredCount,
            },
          }),
        },
        // Add processing metadata
        metadata: {
          ...todoList.metadata,
          processingInfo: {
            originalItemCount: todoList.items.length,
            filteredItemCount: processingResult.filteredCount,
            displayedItemCount: processingResult.items.length,
            hasMore: processingResult.hasMore,
            filtersApplied: !!input.filters,
            sortingApplied: !!input.sorting,
            paginationApplied: !!input.pagination,
          },
        },
      };

      logger.info('Todo list retrieved successfully with advanced processing', {
        id: todoList.id,
        title: todoList.title,
        originalCount: todoList.items.length,
        filteredCount: processingResult.filteredCount,
        displayedCount: processingResult.items.length,
        hasMore: processingResult.hasMore,
      });

      // Add formatted notes for display
      const result = this.enhanceListWithNotes(resultList);

      return result;
    } catch (error) {
      logger.error('Failed to retrieve todo list', {
        listId: input.listId,
        error,
      });
      throw error;
    }
  }

  async updateTaskList(input: UpdateTaskListInput): Promise<TaskList> {
    try {
      logger.info('Updating task list', {
        listId: input.listId,
        action: input.action,
        itemId: input.itemId,
      });

      // Load the existing todo list
      const todoList = await this.repository.findById(input.listId);

      if (!todoList) {
        throw new Error(`Task list not found: ${input.listId}`);
      }

      if (todoList.isArchived) {
        throw new Error('Cannot update archived todo list');
      }

      const now = new Date();
      let updatedItems = [...(todoList.items ?? [])];

      switch (input.action) {
        case 'add_item':
          updatedItems = await this.addItem(updatedItems, input.itemData, now);
          break;

        case 'update_item':
          if (input.itemId === undefined) {
            throw new Error('itemId is required for update_item action');
          }
          updatedItems = await this.updateItem(
            updatedItems,
            input.itemId,
            input.itemData,
            now
          );
          break;

        case 'remove_item':
          if (input.itemId === undefined) {
            throw new Error('itemId is required for remove_item action');
          }
          updatedItems = this.removeItem(updatedItems, input.itemId);
          break;

        case 'update_status':
          if (input.itemId === undefined) {
            throw new Error('itemId is required for update_status action');
          }
          if (input.itemData?.status === undefined) {
            throw new Error('status is required for update_status action');
          }
          updatedItems = this.updateItemStatus(
            updatedItems,
            input.itemId,
            input.itemData.status,
            now
          );
          break;

        case 'update_action_plan':
          if (input.itemId === undefined) {
            throw new Error('itemId is required for update_action_plan action');
          }
          if (input.itemData?.actionPlan === undefined) {
            throw new Error(
              'actionPlan is required for update_action_plan action'
            );
          }
          if (typeof input.itemData.actionPlan !== 'string') {
            throw new Error(
              'actionPlan must be a string for update_action_plan action'
            );
          }
          updatedItems = await this.updateItemActionPlan(
            updatedItems,
            input.itemId,
            input.itemData.actionPlan,
            now
          );
          break;

        case 'update_step_progress':
          if (input.itemId === undefined) {
            throw new Error(
              'itemId is required for update_step_progress action'
            );
          }
          if (input.stepId === undefined) {
            throw new Error(
              'stepId is required for update_step_progress action'
            );
          }
          if (input.stepStatus === undefined) {
            throw new Error(
              'stepStatus is required for update_step_progress action'
            );
          }
          updatedItems = await this.updateStepProgress(
            updatedItems,
            input.itemId,
            input.stepId,
            input.stepStatus,
            input.stepNotes,
            now
          );
          break;

        case 'add_task_note':
          if (input.itemId === undefined) {
            throw new Error('itemId is required for add_task_note action');
          }
          if (input.noteContent === undefined) {
            throw new Error('noteContent is required for add_task_note action');
          }
          if (input.noteType === undefined) {
            throw new Error('noteType is required for add_task_note action');
          }
          updatedItems = await this.addTaskNote(
            updatedItems,
            input.itemId,
            input.noteContent,
            input.noteType,
            now
          );
          break;

        case 'add_list_note': {
          if (input.noteContent === undefined) {
            throw new Error('noteContent is required for add_list_note action');
          }
          if (input.noteType === undefined) {
            throw new Error('noteType is required for add_list_note action');
          }
          // For list notes, we need to update the todoList directly
          const listNote = await this.notesManager.addListNote(
            input.listId,
            input.noteContent,
            input.noteType
          );
          todoList.implementationNotes.push(listNote);
          todoList.updatedAt = now;
          break;
        }

        default:
          throw new Error(`Unknown action: ${String(input.action)}`);
      }

      // Calculate updated analytics
      const analytics = this.calculateAnalytics(updatedItems);

      // Update the todo list
      const updatedTodoList: TaskList = {
        ...todoList,
        items: updatedItems,
        updatedAt: now,
        totalItems: analytics.totalItems,
        completedItems: analytics.completedItems,
        progress: analytics.progress,
        analytics,
      };

      // Save to repository
      await this.repository.save(updatedTodoList);

      // Update both caches with the new version
      cacheManager.setTodoList(input.listId, updatedTodoList);
      this.addToCache(input.listId, updatedTodoList);

      // Invalidate summary and search caches since list data has changed
      // (but keep the updated todo list in cache)
      cacheManager.invalidateTodoList(input.listId);
      cacheManager.setTodoList(input.listId, updatedTodoList); // Re-add the updated list

      logger.info('Todo list updated successfully', {
        id: input.listId,
        action: input.action,
        itemCount: updatedItems.length,
      });

      return updatedTodoList;
    } catch (error) {
      logger.error('Failed to update todo list', {
        listId: input.listId,
        action: input.action,
        error,
      });
      throw error;
    }
  }

  private async updateItemActionPlan(
    items: Task[],
    itemId: string,
    actionPlanContent: string,
    now: Date
  ): Promise<Task[]> {
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error(`Item not found: ${itemId}`);
    }

    const existingItem = items[itemIndex];
    if (!existingItem) {
      throw new Error(`Item not found: ${itemId}`);
    }

    let updatedActionPlan;
    try {
      if (existingItem.actionPlan) {
        // Update existing action plan
        updatedActionPlan = await this.actionPlanManager.updateActionPlan(
          existingItem.actionPlan,
          { content: actionPlanContent }
        );
      } else {
        // Create new action plan
        updatedActionPlan = await this.actionPlanManager.createActionPlan({
          taskId: itemId,
          content: actionPlanContent,
        });
      }
    } catch (error) {
      logger.error('Failed to update action plan', { itemId, error });
      throw new Error(
        `Failed to update action plan: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }

    const updatedItem: Task = {
      ...existingItem,
      actionPlan: updatedActionPlan,
      updatedAt: now,
    };

    const updatedItems = [...items];
    updatedItems[itemIndex] = updatedItem;
    return updatedItems;
  }

  private async updateStepProgress(
    items: Task[],
    itemId: string,
    stepId: string,
    stepStatus: 'pending' | 'in_progress' | 'completed',
    stepNotes?: string,
    now?: Date
  ): Promise<Task[]> {
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error(`Item not found: ${itemId}`);
    }

    const existingItem = items[itemIndex];
    if (!existingItem) {
      throw new Error(`Item not found: ${itemId}`);
    }

    if (!existingItem.actionPlan) {
      throw new Error(`Item does not have an action plan: ${itemId}`);
    }

    let updatedActionPlan;
    try {
      updatedActionPlan = await this.actionPlanManager.updateStepProgress(
        existingItem.actionPlan,
        {
          planId: existingItem.actionPlan.id,
          stepId,
          status: stepStatus,
          ...(stepNotes !== undefined && { notes: stepNotes }),
        }
      );
    } catch (error) {
      logger.error('Failed to update step progress', { itemId, stepId, error });
      throw error;
    }

    // Check if we should suggest a task status update
    const suggestedStatus =
      this.actionPlanManager.suggestTaskStatusUpdate(updatedActionPlan);
    let updatedTaskStatus = existingItem.status;

    if (suggestedStatus && suggestedStatus !== existingItem.status) {
      // Only auto-update if it's a logical progression
      if (
        (existingItem.status === TaskStatus.PENDING &&
          suggestedStatus === 'in_progress') ||
        (existingItem.status === TaskStatus.IN_PROGRESS &&
          suggestedStatus === 'completed')
      ) {
        updatedTaskStatus = suggestedStatus as TaskStatus;
        logger.info('Auto-updating task status based on action plan progress', {
          itemId,
          oldStatus: existingItem.status,
          newStatus: updatedTaskStatus,
          planProgress:
            this.actionPlanManager.calculatePlanProgress(updatedActionPlan),
        });
      }
    }

    const updatedItem: Task = {
      ...existingItem,
      actionPlan: updatedActionPlan,
      status: updatedTaskStatus,
      updatedAt: now || new Date(),
    };

    // Set completedAt if status changed to completed
    if (
      updatedTaskStatus === TaskStatus.COMPLETED &&
      existingItem.status !== TaskStatus.COMPLETED
    ) {
      updatedItem.completedAt = now || new Date();
    } else if (
      updatedTaskStatus !== TaskStatus.COMPLETED &&
      existingItem.completedAt
    ) {
      delete updatedItem.completedAt;
    }

    const updatedItems = [...items];
    updatedItems[itemIndex] = updatedItem;
    return updatedItems;
  }

  private async addTaskNote(
    items: Task[],
    itemId: string,
    noteContent: string,
    noteType: 'general' | 'technical' | 'decision' | 'learning',
    now: Date
  ): Promise<Task[]> {
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error(`Item not found: ${itemId}`);
    }

    const existingItem = items[itemIndex];
    if (!existingItem) {
      throw new Error(`Item not found: ${itemId}`);
    }

    let newNote;
    try {
      newNote = await this.notesManager.addTaskNote(
        itemId,
        noteContent,
        noteType
      );
    } catch (error) {
      logger.error('Failed to add task note', { itemId, error });
      throw new Error(
        `Failed to add task note: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }

    const updatedItem: Task = {
      ...existingItem,
      implementationNotes: [...existingItem.implementationNotes, newNote],
      updatedAt: now,
    };

    const updatedItems = [...items];
    updatedItems[itemIndex] = updatedItem;
    return updatedItems;
  }

  private async addItem(
    items: Task[],
    itemData: UpdateTaskListInput['itemData'],
    now: Date
  ): Promise<Task[]> {
    if (itemData?.title === undefined || itemData.title.length === 0) {
      throw new Error('Title is required for new items');
    }

    // Validate dependencies using DependencyResolver
    const newItemId = uuidv4();
    if (itemData.dependencies && itemData.dependencies.length > 0) {
      const validation = this.dependencyResolver.validateDependencies(
        newItemId,
        itemData.dependencies,
        items
      );

      if (!validation.isValid) {
        throw new Error(
          `Dependency validation failed: ${validation.errors.join(', ')}`
        );
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        logger.warn('Dependency warnings for new item', {
          itemId: newItemId,
          warnings: validation.warnings,
        });
      }
    }

    const newItem: Task = {
      id: newItemId,
      title: itemData.title,
      ...(itemData.description !== undefined && {
        description: itemData.description,
      }),
      status: TaskStatus.PENDING,
      priority: itemData.priority ?? Priority.MEDIUM,
      createdAt: now,
      updatedAt: now,
      dependencies: itemData.dependencies ?? [],
      ...(itemData.estimatedDuration !== undefined && {
        estimatedDuration: itemData.estimatedDuration,
      }),
      tags: itemData.tags ?? [],
      metadata: {},
      // v2 fields
      implementationNotes: [],
      exitCriteria: [],
    };

    // Create action plan if provided
    if (itemData.actionPlan) {
      try {
        if (typeof itemData.actionPlan === 'string') {
          // Create new action plan from content string
          const actionPlan = await this.actionPlanManager.createActionPlan({
            taskId: newItemId,
            content: itemData.actionPlan,
          });
          newItem.actionPlan = actionPlan;
        } else {
          // Use provided ActionPlan object directly
          newItem.actionPlan = itemData.actionPlan;
        }
      } catch (error) {
        logger.warn('Failed to create action plan for new item', {
          itemId: newItemId,
          itemTitle: newItem.title,
          error,
        });
        // Continue without action plan rather than failing the entire operation
      }
    }

    // Create exit criteria if provided
    if (itemData.exitCriteria && itemData.exitCriteria.length > 0) {
      try {
        const exitCriteria = [];
        for (let i = 0; i < itemData.exitCriteria.length; i++) {
          const criteriaDescription = itemData.exitCriteria[i];
          if (criteriaDescription && criteriaDescription.trim()) {
            const criteria = await this.exitCriteriaManager.createExitCriteria({
              taskId: newItemId,
              description: criteriaDescription.trim(),
            });
            exitCriteria.push(criteria);
          }
        }
        newItem.exitCriteria = exitCriteria;
      } catch (error) {
        logger.warn('Failed to create exit criteria for new item', {
          itemId: newItemId,
          itemTitle: newItem.title,
          error,
        });
        // Continue without exit criteria rather than failing the entire operation
      }
    }

    return [...items, newItem];
  }

  private async updateItem(
    items: Task[],
    itemId: string,
    itemData: UpdateTaskListInput['itemData'],
    now: Date
  ): Promise<Task[]> {
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error(`Item not found: ${itemId}`);
    }

    const existingItem = items[itemIndex];
    if (!existingItem) {
      throw new Error(`Item not found: ${itemId}`);
    }

    // Validate dependencies if provided using DependencyResolver
    if (itemData?.dependencies && itemData.dependencies.length > 0) {
      const validation = this.dependencyResolver.validateDependencies(
        itemId,
        itemData.dependencies,
        items
      );

      if (!validation.isValid) {
        throw new Error(
          `Dependency validation failed: ${validation.errors.join(', ')}`
        );
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        logger.warn('Dependency warnings for item update', {
          itemId,
          warnings: validation.warnings,
        });
      }
    }

    const updatedItem: Task = {
      id: existingItem.id,
      title: itemData?.title ?? existingItem.title,
      status: itemData?.status ?? existingItem.status,
      priority: itemData?.priority ?? existingItem.priority,
      createdAt: existingItem.createdAt,
      updatedAt: now,
      dependencies: itemData?.dependencies ?? existingItem.dependencies,
      tags: itemData?.tags ?? existingItem.tags,
      metadata: existingItem.metadata,
      // v2 fields
      implementationNotes:
        itemData?.implementationNotes ?? existingItem.implementationNotes ?? [],
      exitCriteria: existingItem.exitCriteria || [], // Will be updated later if provided
      ...(existingItem.actionPlan && { actionPlan: existingItem.actionPlan }), // Preserve existing action plan
    };

    // Update action plan if provided
    if (itemData?.actionPlan !== undefined) {
      try {
        // Check if actionPlan is an object (ActionPlan) or a string (content)
        if (typeof itemData.actionPlan === 'string') {
          // String content provided
          if (existingItem.actionPlan) {
            // Update existing action plan
            updatedItem.actionPlan =
              await this.actionPlanManager.updateActionPlan(
                existingItem.actionPlan,
                { content: itemData.actionPlan }
              );
          } else {
            // Create new action plan
            updatedItem.actionPlan =
              await this.actionPlanManager.createActionPlan({
                taskId: itemId,
                content: itemData.actionPlan,
              });
          }
        } else {
          // ActionPlan object provided - use it directly
          updatedItem.actionPlan = itemData.actionPlan;
        }
      } catch (error) {
        logger.warn('Failed to update action plan during item update', {
          itemId,
          error,
        });
        // Continue with the update without the action plan change
      }
    }

    // Handle optional properties
    if (itemData?.description !== undefined) {
      updatedItem.description = itemData.description;
    } else if (existingItem.description !== undefined) {
      updatedItem.description = existingItem.description;
    }

    if (itemData?.estimatedDuration !== undefined) {
      updatedItem.estimatedDuration = itemData.estimatedDuration;
    } else if (existingItem.estimatedDuration !== undefined) {
      updatedItem.estimatedDuration = existingItem.estimatedDuration;
    }

    // Handle exit criteria updates
    if (itemData?.exitCriteriaObjects !== undefined) {
      // Direct update with ExitCriteria objects (preserves IDs and state)
      updatedItem.exitCriteria = [...itemData.exitCriteriaObjects];
    } else if (itemData?.exitCriteria !== undefined) {
      // Create new criteria from descriptions (replaces all existing)
      try {
        const exitCriteria = [];
        for (let i = 0; i < itemData.exitCriteria.length; i++) {
          const criteriaDescription = itemData.exitCriteria[i];
          if (criteriaDescription && criteriaDescription.trim()) {
            const criteria = await this.exitCriteriaManager.createExitCriteria({
              taskId: itemId,
              description: criteriaDescription.trim(),
            });
            exitCriteria.push(criteria);
          }
        }
        updatedItem.exitCriteria = exitCriteria;
      } catch (error) {
        logger.warn('Failed to update exit criteria during item update', {
          itemId,
          error,
        });
        // Continue with existing exit criteria
        updatedItem.exitCriteria = existingItem.exitCriteria || [];
      }
    } else {
      // Preserve existing exit criteria
      updatedItem.exitCriteria = existingItem.exitCriteria || [];
    }

    // Handle completedAt field based on status changes
    if (
      itemData?.status === TaskStatus.COMPLETED &&
      existingItem.status !== TaskStatus.COMPLETED
    ) {
      // Item is being marked as completed
      updatedItem.completedAt = now;
    } else if (
      itemData?.status !== TaskStatus.COMPLETED &&
      itemData?.status !== undefined
    ) {
      // Item is being marked as not completed
      delete updatedItem.completedAt;
    } else if (existingItem.completedAt !== undefined) {
      // Preserve existing completedAt if no status change
      updatedItem.completedAt = existingItem.completedAt;
    }

    const updatedItems = [...items];
    updatedItems[itemIndex] = updatedItem;
    return updatedItems;
  }

  private removeItem(items: Task[], itemId: string): Task[] {
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error(`Item not found: ${itemId}`);
    }

    // Remove the item
    const updatedItems = items.filter(item => item.id !== itemId);

    // Remove this item from any dependencies
    return updatedItems.map(item => ({
      ...item,
      dependencies: item.dependencies.filter(dep => dep !== itemId),
    }));
  }

  private updateItemStatus(
    items: Task[],
    itemId: string,
    newStatus: TaskStatus,
    now: Date
  ): Task[] {
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error(`Item not found: ${itemId}`);
    }

    const existingItem = items[itemIndex];
    if (!existingItem) {
      throw new Error(`Item not found: ${itemId}`);
    }

    // Validate status transition
    if (!this.isValidStatusTransition(existingItem.status, newStatus)) {
      throw new Error(
        `Invalid status transition from ${existingItem.status} to ${newStatus}`
      );
    }

    const updatedItem: Task = {
      ...existingItem,
      status: newStatus,
      updatedAt: now,
    };

    // Handle completion timestamp
    if (newStatus === TaskStatus.COMPLETED) {
      updatedItem.completedAt = now;
    } else if (existingItem.completedAt) {
      // Remove completedAt if moving away from completed status
      delete updatedItem.completedAt;
    }

    const updatedItems = [...items];
    updatedItems[itemIndex] = updatedItem;
    return updatedItems;
  }

  private isValidStatusTransition(
    currentStatus: TaskStatus,
    newStatus: TaskStatus
  ): boolean {
    // Allow same status (no-op transitions)
    if (currentStatus === newStatus) {
      return true;
    }

    // Define valid transitions
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      [TaskStatus.PENDING]: [
        TaskStatus.IN_PROGRESS,
        TaskStatus.COMPLETED,
        TaskStatus.BLOCKED,
        TaskStatus.CANCELLED,
      ],
      [TaskStatus.IN_PROGRESS]: [
        TaskStatus.COMPLETED,
        TaskStatus.BLOCKED,
        TaskStatus.PENDING,
        TaskStatus.CANCELLED,
      ],
      [TaskStatus.COMPLETED]: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS],
      [TaskStatus.BLOCKED]: [
        TaskStatus.PENDING,
        TaskStatus.IN_PROGRESS,
        TaskStatus.CANCELLED,
      ],
      [TaskStatus.CANCELLED]: [TaskStatus.PENDING],
    };

    return validTransitions[currentStatus]?.includes(newStatus) ?? false;
  }

  /**
   * Gets the dependency graph for a task list
   */
  async getDependencyGraph(listId: string): Promise<DependencyGraph> {
    try {
      logger.debug('Getting dependency graph', { listId });

      const todoList = await this.repository.findById(listId);

      if (!todoList) {
        throw new Error(`Task list not found: ${listId}`);
      }

      const graph = this.dependencyResolver.buildDependencyGraph(
        todoList.items
      );

      logger.info('Dependency graph retrieved successfully', {
        listId,
        nodeCount: graph.nodes.size,
        cycleCount: graph.cycles.length,
      });

      return graph;
    } catch (error) {
      logger.error('Failed to get dependency graph', { listId, error });
      throw error;
    }
  }

  /**
   * Validates dependencies for an item without modifying the list
   */
  async validateItemDependencies(
    listId: string,
    itemId: string,
    dependencies: string[]
  ): Promise<DependencyValidationResult> {
    try {
      logger.debug('Validating item dependencies', {
        listId,
        itemId,
        dependencies,
      });

      const todoList = await this.repository.findById(listId);

      if (!todoList) {
        throw new Error(`Task list not found: ${listId}`);
      }

      const validation = this.dependencyResolver.validateDependencies(
        itemId,
        dependencies,
        todoList.items
      );

      logger.debug('Item dependencies validated', {
        listId,
        itemId,
        isValid: validation.isValid,
        errorCount: validation.errors.length,
      });

      return validation;
    } catch (error) {
      logger.error('Failed to validate item dependencies', {
        listId,
        itemId,
        error,
      });
      throw error;
    }
  }

  /**
   * Gets items that are ready to be worked on (no blocking dependencies)
   */
  async getReadyItems(listId: string): Promise<Task[]> {
    try {
      logger.debug('Getting ready items', { listId });

      const todoList = await this.repository.findById(listId);

      if (!todoList) {
        throw new Error(`Task list not found: ${listId}`);
      }

      const readyItems = this.dependencyResolver.getReadyItems(todoList.items);

      logger.info('Ready items retrieved successfully', {
        listId,
        totalItems: todoList.items.length,
        readyCount: readyItems.length,
      });

      return readyItems;
    } catch (error) {
      logger.error('Failed to get ready items', { listId, error });
      throw error;
    }
  }

  /**
   * Gets items that are blocked by dependencies
   */
  async getBlockedItems(
    listId: string
  ): Promise<Array<{ item: Task; blockedBy: Task[] }>> {
    try {
      logger.debug('Getting blocked items', { listId });

      const todoList = await this.repository.findById(listId);

      if (!todoList) {
        throw new Error(`Task list not found: ${listId}`);
      }

      const blockedItems = this.dependencyResolver.getBlockedItems(
        todoList.items
      );

      logger.info('Blocked items retrieved successfully', {
        listId,
        totalItems: todoList.items.length,
        blockedCount: blockedItems.length,
      });

      return blockedItems;
    } catch (error) {
      logger.error('Failed to get blocked items', { listId, error });
      throw error;
    }
  }

  /**
   * Calculates the critical path through the dependency graph
   */
  async getCriticalPath(listId: string): Promise<string[]> {
    try {
      logger.debug('Calculating critical path', { listId });

      const todoList = await this.repository.findById(listId);

      if (!todoList) {
        throw new Error(`Task list not found: ${listId}`);
      }

      const criticalPath = this.dependencyResolver.calculateCriticalPath(
        todoList.items
      );

      logger.info('Critical path calculated successfully', {
        listId,
        pathLength: criticalPath.length,
      });

      return criticalPath;
    } catch (error) {
      logger.error('Failed to calculate critical path', { listId, error });
      throw error;
    }
  }

  /**
   * Gets action plan progress for a specific task
   */
  async getActionPlanProgress(
    listId: string,
    itemId: string
  ): Promise<{
    progress: number;
    statusText: string;
    nextStep?: string;
    completedToday: number;
    estimatedCompletion?: string;
  } | null> {
    try {
      logger.debug('Getting action plan progress', { listId, itemId });

      const todoList = await this.repository.findById(listId);

      if (!todoList) {
        throw new Error(`Task list not found: ${listId}`);
      }

      const item = todoList.items.find(item => item.id === itemId);
      if (!item) {
        throw new Error(`Item not found: ${itemId}`);
      }

      if (!item.actionPlan) {
        return null;
      }

      const progressSummary = this.actionPlanManager.getProgressSummary(
        item.actionPlan
      );

      logger.info('Action plan progress retrieved successfully', {
        listId,
        itemId,
        progress: progressSummary.progress,
      });

      return progressSummary;
    } catch (error) {
      logger.error('Failed to get action plan progress', {
        listId,
        itemId,
        error,
      });
      throw error;
    }
  }

  /**
   * Gets all tasks with action plans in a list
   */
  async getTasksWithActionPlans(listId: string): Promise<
    Array<{
      item: Task;
      progressSummary: ReturnType<ActionPlanManager['getProgressSummary']>;
    }>
  > {
    try {
      logger.debug('Getting tasks with action plans', { listId });

      const todoList = await this.repository.findById(listId);

      if (!todoList) {
        throw new Error(`Task list not found: ${listId}`);
      }

      const tasksWithPlans = todoList.items
        .filter(item => item.actionPlan)
        .map(item => ({
          item,
          progressSummary: this.actionPlanManager.getProgressSummary(
            item.actionPlan!
          ),
        }));

      logger.info('Tasks with action plans retrieved successfully', {
        listId,
        taskCount: tasksWithPlans.length,
      });

      return tasksWithPlans;
    } catch (error) {
      logger.error('Failed to get tasks with action plans', { listId, error });
      throw error;
    }
  }

  async listTaskLists(input: ListTaskListsInput): Promise<TaskListSummary[]> {
    try {
      logger.debug('Listing task lists', {
        context: input.context,
        projectTag: input.projectTag,
        status: input.status,
      });

      // Check cache first
      // Handle both projectTag and context for backward compatibility
      const contextParam = input.projectTag ?? input.context;
      const cacheOptions = {
        ...(contextParam !== undefined && { context: contextParam }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.limit !== undefined && { limit: input.limit }),
        ...(input.offset !== undefined && { offset: input.offset }),
      };
      const cacheKey = cacheManager.generateSummaryKey(cacheOptions);

      let summaries = cacheManager.getSummaryList(cacheKey) as
        | TaskListSummary[]
        | null;

      if (!summaries) {
        // Get list summaries from storage
        const listOptions: ListOptions = {};

        // Handle both projectTag and context for backward compatibility
        if (contextParam !== undefined) {
          listOptions.context = contextParam;
        }
        if (input.limit !== undefined) {
          listOptions.limit = input.limit;
        }
        if (input.offset !== undefined) {
          listOptions.offset = input.offset;
        }

        // Use repository to search for summaries
        const searchQuery: Record<string, unknown> = {};

        if (contextParam !== undefined) {
          searchQuery['projectTag'] = contextParam;
        }

        if (input.status !== 'all' && input.status !== undefined) {
          searchQuery['status'] = input.status;
        }

        if (input.limit !== undefined || input.offset !== undefined) {
          const pagination: Record<string, number> = {};
          if (input.limit !== undefined) {
            pagination['limit'] = input.limit;
          }
          if (input.offset !== undefined) {
            pagination['offset'] = input.offset;
          }
          searchQuery['pagination'] = pagination;
        }

        const searchResult = await this.repository.searchSummaries(searchQuery);

        summaries = searchResult.items;

        // Cache the results
        cacheManager.setSummaryList(cacheKey, summaries);
      }

      // Filter by status if specified
      let filteredSummaries = summaries;
      if (input.status !== undefined && input.status !== 'all') {
        filteredSummaries = summaries.filter(summary => {
          const typedSummary = summary as TaskListSummary;
          if (input.status === 'completed') {
            return typedSummary.progress === 100;
          } else if (input.status === 'active') {
            return typedSummary.progress < 100;
          }
          return true;
        });
      }

      logger.info('Todo lists listed successfully', {
        totalCount: summaries.length,
        filteredCount: filteredSummaries.length,
        context: input.context,
        status: input.status,
      });

      return filteredSummaries as TaskListSummary[];
    } catch (error) {
      logger.error('Failed to list todo lists', {
        context: input.context,
        status: input.status,
        error,
      });
      throw error;
    }
  }

  async deleteTaskList(
    input: DeleteTaskListInput
  ): Promise<DeleteTaskListResult> {
    try {
      logger.info('Deleting todo list', {
        listId: input.listId,
        permanent: input.permanent,
      });

      // Check if the list exists
      const todoList = await this.repository.findById(input.listId);

      if (!todoList) {
        throw new Error(`Task list not found: ${input.listId}`);
      }

      if (input.permanent === true) {
        // Permanently delete the list
        await this.repository.delete(input.listId, true);

        // Remove from both caches
        cacheManager.invalidateTodoList(input.listId);
        this.listCache.delete(input.listId);

        logger.info('Todo list permanently deleted', {
          id: input.listId,
          title: todoList.title,
        });

        return {
          success: true,
          operation: 'deleted',
          message: `Todo list "${todoList.title}" has been permanently deleted`,
        };
      } else {
        // Archive the list
        const now = new Date();
        const archivedList: TaskList = {
          ...todoList,
          isArchived: true,
          updatedAt: now,
        };

        // Set completedAt only if the list is fully completed
        if (todoList.progress === 100) {
          archivedList.completedAt = todoList.completedAt ?? now;
        }

        await this.repository.save(archivedList);

        // Invalidate summary and search caches since list status has changed
        cacheManager.invalidateTodoList(input.listId);

        // Update both caches with the archived version
        cacheManager.setTodoList(input.listId, archivedList);
        this.addToCache(input.listId, archivedList);

        logger.info('Todo list archived', {
          id: input.listId,
          title: todoList.title,
        });

        return {
          success: true,
          operation: 'archived',
          message: `Todo list "${todoList.title}" has been archived`,
        };
      }
    } catch (error) {
      logger.error('Failed to delete todo list', {
        listId: input.listId,
        permanent: input.permanent,
        error,
      });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      return await this.repository.healthCheck();
    } catch (error) {
      logger.error('TaskListManager health check failed', { error });
      return false;
    }
  }

  private calculateAnalytics(items: Task[]): ListAnalytics {
    const totalItems = items.length;
    const completedItems = items.filter(
      item => item.status === 'completed'
    ).length;
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    return {
      totalItems,
      completedItems,
      pendingItems: totalItems - completedItems,
      inProgressItems: items.filter(item => item.status === 'in_progress')
        .length,
      blockedItems: items.filter(item => item.status === 'blocked').length,
      progress,
      averageCompletionTime: this.calculateAverageCompletionTime(items),
      estimatedTimeRemaining: this.calculateEstimatedTimeRemaining(items),
      velocityMetrics: {
        itemsPerDay: this.calculateItemsPerDay(items),
        completionRate:
          totalItems > 0 ? (completedItems / totalItems) * 100 : 0,
      },

      tagFrequency: this.calculateTagFrequency(items),
      dependencyGraph: this.buildDependencyGraph(items),
    };
  }

  /**
   * Calculate average completion time from completed tasks
   */
  private calculateAverageCompletionTime(items: Task[]): number {
    const completedItems = items.filter(item => item.status === 'completed');
    if (completedItems.length === 0) return 0;

    // Estimation based on estimated duration
    const totalEstimated = completedItems.reduce(
      (sum, item) => sum + (item.estimatedDuration || 60),
      0
    ); // Default 60 minutes if not specified
    return totalEstimated / completedItems.length;
  }

  /**
   * Calculate estimated time remaining for incomplete tasks
   */
  private calculateEstimatedTimeRemaining(items: Task[]): number {
    const incompleteItems = items.filter(item => item.status !== 'completed');
    return incompleteItems.reduce(
      (sum, item) => sum + (item.estimatedDuration || 60),
      0
    ); // Default 60 minutes if not specified
  }

  /**
   * Calculate items completed per day
   */
  private calculateItemsPerDay(items: Task[]): number {
    const completedItems = items.filter(item => item.status === 'completed');
    if (completedItems.length === 0) return 0;

    // Calculation based on creation to completion time
    const now = new Date();
    const oldestCompleted = completedItems.reduce((oldest, item) =>
      item.createdAt < oldest.createdAt ? item : oldest
    );

    // oldestCompleted cannot be undefined since we checked completedItems.length > 0
    const daysSinceOldest = Math.max(
      1,
      (now.getTime() - oldestCompleted!.createdAt.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return completedItems.length / daysSinceOldest;
  }

  /**
   * Calculate tag frequency
   */
  private calculateTagFrequency(items: Task[]): Record<string, number> {
    const frequency: Record<string, number> = {};
    items.forEach(item => {
      if (item.tags) {
        item.tags.forEach(tag => {
          frequency[tag] = (frequency[tag] || 0) + 1;
        });
      }
    });
    return frequency;
  }

  /**
   * Build dependency graph
   */
  private buildDependencyGraph(items: Task[]): DependencyNode[] {
    return items
      .filter(item => item.dependencies && item.dependencies.length > 0)
      .map(item => {
        const dependents = items
          .filter(other => other.dependencies?.includes(item.id))
          .map(other => other.id);

        return {
          id: item.id,
          title: item.title,
          dependencies: item.dependencies || [],
          dependents,
          depth: 0, // Could be calculated properly if needed
          isBlocked: (item.dependencies || []).some(
            depId => items.find(i => i.id === depId)?.status !== 'completed'
          ),
        };
      });
  }

  /**
   * Setup memory management and cleanup
   */
  private setupMemoryManagement(): void {
    // More frequent cache cleanup to prevent memory buildup
    this.cleanupInterval = setInterval(() => {
      if (!this.isShuttingDown) {
        this.performCacheCleanup();
      }
    }, 15000); // Every 15 seconds (was 60 seconds)

    // Memory pressure cleanup
    this.memoryCleanupInterval = setInterval(() => {
      if (!this.isShuttingDown) {
        this.performMemoryPressureCleanup();
      }
    }, 10000); // Every 10 seconds

    // Register cleanup tasks with memory cleanup manager
    memoryCleanupManager.registerCleanupTask({
      name: 'todo-list-manager-cache-cleanup',
      cleanup: () => this.performAggressiveCacheCleanup(),
      priority: 'high',
    });

    memoryCleanupManager.registerCleanupTask({
      name: 'todo-list-manager-shutdown',
      cleanup: () => this.shutdown(),
      priority: 'critical',
    });
  }

  /**
   * Add item to cache with size management
   */
  private addToCache(key: string, todoList: TaskList): void {
    // Perform cleanup if cache is getting large or under memory pressure
    if (
      this.listCache.size >= this.MAX_CACHE_SIZE ||
      MemoryUtils.isMemoryPressure()
    ) {
      this.performCacheCleanup();
    }

    // If still at capacity after cleanup, remove oldest entries
    if (this.listCache.size >= this.MAX_CACHE_SIZE) {
      const keysToRemove = Array.from(this.listCache.keys()).slice(
        0,
        Math.ceil(this.MAX_CACHE_SIZE / 3)
      ); // Remove 1/3 of entries

      for (const keyToRemove of keysToRemove) {
        this.listCache.delete(keyToRemove);
      }
    }

    this.listCache.set(key, new WeakRef(todoList));
  }

  /**
   * Perform regular cache cleanup
   */
  private performCacheCleanup(): void {
    // Clean up dead references
    const deadKeys: string[] = [];
    for (const [key, ref] of this.listCache.entries()) {
      if (ref.deref() === undefined) {
        deadKeys.push(key);
      }
    }

    for (const key of deadKeys) {
      this.listCache.delete(key);
    }

    // Aggressive size-based cleanup
    if (this.listCache.size > this.MAX_CACHE_SIZE) {
      const keysToRemove = Array.from(this.listCache.keys()).slice(
        0,
        Math.floor(this.listCache.size / 2)
      );

      for (const key of keysToRemove) {
        this.listCache.delete(key);
      }
    }

    // Cache cleanup completed

    if (deadKeys.length > 0 || this.listCache.size > this.MAX_CACHE_SIZE) {
      logger.debug('TaskListManager cache cleanup completed', {
        deadReferencesRemoved: deadKeys.length,
        cacheSize: this.listCache.size,
        maxCacheSize: this.MAX_CACHE_SIZE,
      });
    }
  }

  /**
   * Perform memory pressure-based cleanup
   */
  private performMemoryPressureCleanup(): void {
    if (MemoryUtils.isMemoryPressure()) {
      logger.warn('Memory pressure detected, performing aggressive cleanup');
      this.performAggressiveCacheCleanup();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        logger.debug('Forced garbage collection due to memory pressure');
      }
    }
  }

  /**
   * Perform aggressive cache cleanup
   */
  private performAggressiveCacheCleanup(): void {
    const initialSize = this.listCache.size;

    // Clear all cache entries
    this.listCache.clear();

    logger.info('TaskListManager aggressive cache cleanup completed', {
      clearedEntries: initialSize,
      memoryPressure: MemoryUtils.isMemoryPressure(),
    });
  }

  /**
   * Public method for aggressive cleanup (used by tests and emergency situations)
   */
  aggressiveCleanup(): void {
    this.performAggressiveCacheCleanup();

    // Also clear the high-performance cache
    cacheManager.invalidateAll();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      logger.debug('Forced garbage collection during aggressive cleanup');
    }
  }

  /**
   * Clean up cache and remove dead references
   */
  private cleanupCache(): void {
    this.performCacheCleanup();
  }

  /**
   * Clear all caches (useful for testing)
   */
  clearAllCaches(): void {
    this.listCache.clear();
    cacheManager.invalidateAll();
  }

  /**
   * Formats implementation notes for display in todo list responses
   */
  private formatNotesForDisplay(
    notes: ImplementationNote[],
    maxLength: number = 200
  ): ImplementationNote[] {
    if (!notes || !Array.isArray(notes)) {
      return [];
    }

    return notes.map(note => {
      try {
        const { content, isTruncated } = this.notesManager.truncateNoteContent(
          note.content,
          maxLength
        );

        // Ensure createdAt and updatedAt are Date objects
        const createdAt =
          note.createdAt instanceof Date
            ? note.createdAt
            : new Date(note.createdAt);
        const updatedAt =
          note.updatedAt instanceof Date
            ? note.updatedAt
            : new Date(note.updatedAt);

        return {
          ...note,
          content, // Use truncated content
          isTruncated, // Include truncation flag
          createdAt, // Ensure it's a Date object
          updatedAt, // Ensure it's a Date object
        };
      } catch (error) {
        logger.warn('Failed to format note for display', {
          noteId: note.id,
          error,
        });
        // Return the original note if formatting fails
        return note;
      }
    });
  }

  /**
   * Enhances todo list with formatted notes for display
   */
  private enhanceListWithNotes(todoList: TaskList): TaskList {
    // Format list-level notes
    const formattedListNotes = this.formatNotesForDisplay(
      todoList.implementationNotes || []
    );

    // Format task-level notes for each item
    const items = todoList.items.map(item => {
      const formattedItemNotes = this.formatNotesForDisplay(
        item.implementationNotes || []
      );

      return {
        ...item,
        implementationNotes: formattedItemNotes,
      };
    });

    return {
      ...todoList,
      implementationNotes: formattedListNotes,
      items: items,
    };
  }

  /**
   * Shutdown and cleanup all resources
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('TaskListManager shutting down');

    // Clear intervals
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval);
      this.memoryCleanupInterval = undefined;
    }

    // Shutdown cache manager
    cacheManager.shutdown();

    // Clear cache
    this.listCache.clear();

    // Cleanup internal managers
    this.dependencyResolver.cleanup();

    // Shutdown storage backend if available (for backward compatibility)
    if (this.storage) {
      await this.storage.shutdown();
    }

    logger.info('TaskListManager shutdown completed');
  }

  /**
   * Update list metadata (title, description, projectTag)
   * This is a convenience method for updating list-level properties
   */
  async updateListMetadata(
    listId: string,
    updates: {
      title?: string;
      description?: string;
      projectTag?: string;
    }
  ): Promise<TaskList> {
    try {
      logger.info('Updating list metadata', { listId, updates });

      // Load the existing list
      const existingList = await this.repository.findById(listId);

      if (!existingList) {
        throw new Error(`Task list not found: ${listId}`);
      }

      // Create updated list with new metadata
      const updatedList: TaskList = {
        ...existingList,
        ...(updates.title && { title: updates.title }),
        ...(updates.description !== undefined && {
          description: updates.description,
        }),
        ...(updates.projectTag && {
          projectTag: updates.projectTag,
          context: updates.projectTag, // Keep context in sync for backward compatibility
        }),
        updatedAt: new Date(),
      };

      // Save to repository
      await this.repository.save(updatedList);

      // Update both caches
      cacheManager.setTodoList(listId, updatedList);
      this.addToCache(listId, updatedList);

      // Invalidate summary cache
      cacheManager.invalidateTodoList(listId);
      cacheManager.setTodoList(listId, updatedList);

      logger.info('List metadata updated successfully', { listId });

      return updatedList;
    } catch (error) {
      logger.error('Failed to update list metadata', { listId, error });
      throw error;
    }
  }
}
