/**
 * Core business logic for todo list management
 */

import { v4 as uuidv4 } from 'uuid';
import {
  TaskStatus,
  Priority,
  type TodoList,
  type TodoItem,
  type TodoListSummary,
  type ListAnalytics,
  type GetTodoListFilters,
  type GetTodoListSorting,
  type GetTodoListPagination,
  type ImplementationNote,
} from '../../shared/types/todo.js';
import type { StorageBackend, ListOptions } from '../../shared/types/storage.js';
import { logger } from '../../shared/utils/logger.js';
import {
  DependencyResolver,
  type DependencyGraph,
  type DependencyValidationResult,
} from '../tasks/dependency-manager.js';
import { AnalyticsManager } from '../../infrastructure/monitoring/analytics-manager.js';
import { FilteringUtils } from '../../shared/utils/filtering.js';
import { memoryCleanupManager, MemoryUtils } from '../../shared/utils/memory-cleanup.js';
import { memoryLeakDetector } from '../../infrastructure/monitoring/memory-leak-detector.js';
import { memoryLeakPrevention } from '../../shared/utils/memory-leak-prevention.js';
import { cacheManager } from '../../infrastructure/storage/cache-manager.js';
import { ActionPlanManager } from '../tasks/action-plan-manager.js';
import { NotesManager } from '../tasks/notes-manager.js';
import { CleanupSuggestionManager, type CleanupSuggestion } from './cleanup-suggestion-manager.js';
import { PrettyPrintFormatter } from '../../shared/utils/pretty-print-formatter.js';
import { ProjectManager } from './project-manager.js';

export interface CreateTodoListInput {
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
  }>;
  context?: string; // Deprecated, use projectTag
  projectTag?: string; // Enhanced field (v2)
  implementationNotes?: Array<{
    content: string;
    type: 'general' | 'technical' | 'decision' | 'learning';
  }>; // Initial implementation notes for the list
}

export interface GetTodoListInput {
  listId: string;
  includeCompleted?: boolean | undefined;
  includeArchived?: boolean | undefined;
  filters?: GetTodoListFilters | undefined;
  sorting?: GetTodoListSorting | undefined;
  pagination?: GetTodoListPagination | undefined;
}

export interface UpdateTodoListInput {
  listId: string;
  action:
    | 'add_item'
    | 'update_item'
    | 'remove_item'
    | 'update_status'
    | 'reorder'
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
    actionPlan?: string; // Action plan content
  };
  itemId?: string;
  newOrder?: string[]; // Array of item IDs for reordering
  stepId?: string; // For step progress updates
  stepStatus?: 'pending' | 'in_progress' | 'completed';
  stepNotes?: string;
  // Fields for adding notes
  noteContent?: string;
  noteType?: 'general' | 'technical' | 'decision' | 'learning';
}

export interface ListTodoListsInput {
  context?: string | undefined; // Deprecated, use projectTag
  projectTag?: string | undefined; // Enhanced field (v2)
  status?: 'active' | 'completed' | 'all' | undefined;
  includeArchived?: boolean | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface DeleteTodoListInput {
  listId: string;
  permanent?: boolean;
}

export interface DeleteTodoListResult {
  success: boolean;
  operation: 'archived' | 'deleted';
  message: string;
}

export class TodoListManager {
  private readonly dependencyResolver: DependencyResolver;
  private readonly analyticsManager: AnalyticsManager;
  private readonly actionPlanManager: ActionPlanManager;
  private readonly notesManager: NotesManager;
  private readonly cleanupSuggestionManager: CleanupSuggestionManager;
  private readonly prettyPrintFormatter: PrettyPrintFormatter;
  private readonly projectManager: ProjectManager;
  private readonly listCache = new Map<string, WeakRef<TodoList>>();
  private cleanupInterval: NodeJS.Timeout | undefined;
  private memoryCleanupInterval: NodeJS.Timeout | undefined;
  private isShuttingDown = false;
  private readonly MAX_CACHE_SIZE = 10; // Very aggressive memory management

  constructor(private readonly storage: StorageBackend) {
    this.dependencyResolver = new DependencyResolver();
    this.analyticsManager = new AnalyticsManager();
    this.actionPlanManager = new ActionPlanManager();
    this.notesManager = new NotesManager();
    this.cleanupSuggestionManager = new CleanupSuggestionManager();
    this.prettyPrintFormatter = new PrettyPrintFormatter();
    this.projectManager = new ProjectManager(storage);
    this.setupMemoryManagement();
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();
    
    // Initialize all enhanced components
    // Note: ProjectManager and CleanupSuggestionManager don't require async initialization

    // Initialize cache manager (it's a singleton but ensure it's set up)
    // The cache manager sets up its own memory management

    // Start memory leak prevention system
    memoryLeakPrevention.start();

    // Register cache with memory leak prevention
    memoryLeakPrevention.registerCache(
      'todo-list-cache',
      this.listCache as Map<unknown, unknown>
    );

    // Start memory leak detection
    memoryLeakDetector.startDetection(10000);

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

    logger.info('TodoListManager initialized successfully');
  }

  // Getter methods for enhanced components
  getActionPlanManager(): ActionPlanManager {
    return this.actionPlanManager;
  }

  getNotesManager(): NotesManager {
    return this.notesManager;
  }

  getCleanupSuggestionManager(): CleanupSuggestionManager {
    return this.cleanupSuggestionManager;
  }

  getPrettyPrintFormatter(): PrettyPrintFormatter {
    return this.prettyPrintFormatter;
  }

  getProjectManager(): ProjectManager {
    return this.projectManager;
  }

  async createTodoList(input: CreateTodoListInput): Promise<TodoList> {
    try {
      logger.info('Creating new todo list', {
        title: input.title,
        context: input.context,
        projectTag: input.projectTag,
      });

      const now = new Date();
      const listId = uuidv4();

      // Create todo items from input tasks
      const items: TodoItem[] = [];
      if (input.tasks) {
        for (const taskInput of input.tasks) {
          const item: TodoItem = {
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
            // Enhanced fields (v2)
            implementationNotes: [],
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

      const todoList: TodoList = {
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
        // Enhanced fields (v2)
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

      // Save to storage
      await this.storage.save(listId, todoList, { validate: true });

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

  async getTodoList(input: GetTodoListInput): Promise<TodoList | null> {
    try {
      logger.debug('Retrieving todo list with advanced filtering', {
        listId: input.listId,
        hasFilters: !!input.filters,
        hasSorting: !!input.sorting,
        hasPagination: !!input.pagination,
      });

      // Check high-performance cache first
      let todoList = cacheManager.getTodoList(input.listId);

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
        todoList = cachedRef?.deref() ?? null;

        if (!todoList) {
          const loadedList = await this.storage.load(input.listId, {
            includeArchived: true, // Include archived lists for retrieval, filter later if needed
          });

          if (loadedList === null) {
            logger.debug('Todo list not found', { listId: input.listId });
            return null;
          }

          // If the list is archived and we don't want archived lists, return null
          if (loadedList.isArchived && input.includeArchived !== true) {
            logger.debug('Todo list is archived, not returning', {
              listId: input.listId,
            });
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
      if (input.sorting) {
        FilteringUtils.validateSorting(input.sorting);
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
          ? this.analyticsManager.calculateFilteredAnalytics(
              todoList.items,
              processingResult.items
            )
          : fullListAnalytics;

      // Create the response with processed items
      const resultList: TodoList = {
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

      // Enhance the result with formatted notes for display
      const enhancedResult = this.enhanceListWithNotes(resultList);

      return enhancedResult;
    } catch (error) {
      logger.error('Failed to retrieve todo list', {
        listId: input.listId,
        error,
      });
      throw error;
    }
  }

  async updateTodoList(input: UpdateTodoListInput): Promise<TodoList> {
    try {
      logger.info('Updating todo list', {
        listId: input.listId,
        action: input.action,
        itemId: input.itemId,
      });

      // Load the existing todo list
      const todoList = await this.storage.load(input.listId, {
        includeArchived: true,
      });

      if (!todoList) {
        throw new Error(`Todo list not found: ${input.listId}`);
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

        case 'reorder':
          if (input.newOrder === undefined) {
            throw new Error('newOrder is required for reorder action');
          }
          updatedItems = this.reorderItems(updatedItems, input.newOrder);
          break;

        case 'update_action_plan':
          if (input.itemId === undefined) {
            throw new Error('itemId is required for update_action_plan action');
          }
          if (input.itemData?.actionPlan === undefined) {
            throw new Error('actionPlan is required for update_action_plan action');
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
            throw new Error('itemId is required for update_step_progress action');
          }
          if (input.stepId === undefined) {
            throw new Error('stepId is required for update_step_progress action');
          }
          if (input.stepStatus === undefined) {
            throw new Error('stepStatus is required for update_step_progress action');
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

        case 'add_list_note':
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

        default:
          throw new Error(`Unknown action: ${String(input.action)}`);
      }

      // Calculate updated analytics
      const analytics = this.calculateAnalytics(updatedItems);

      // Update the todo list
      const updatedTodoList: TodoList = {
        ...todoList,
        items: updatedItems,
        updatedAt: now,
        totalItems: analytics.totalItems,
        completedItems: analytics.completedItems,
        progress: analytics.progress,
        analytics,
      };

      // Save to storage
      await this.storage.save(input.listId, updatedTodoList, {
        validate: true,
      });

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
    items: TodoItem[],
    itemId: string,
    actionPlanContent: string,
    now: Date
  ): Promise<TodoItem[]> {
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
      throw new Error(`Failed to update action plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const updatedItem: TodoItem = {
      ...existingItem,
      actionPlan: updatedActionPlan,
      updatedAt: now,
    };

    const updatedItems = [...items];
    updatedItems[itemIndex] = updatedItem;
    return updatedItems;
  }

  private async updateStepProgress(
    items: TodoItem[],
    itemId: string,
    stepId: string,
    stepStatus: 'pending' | 'in_progress' | 'completed',
    stepNotes?: string,
    now?: Date
  ): Promise<TodoItem[]> {
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
    const suggestedStatus = this.actionPlanManager.suggestTaskStatusUpdate(updatedActionPlan);
    let updatedTaskStatus = existingItem.status;
    
    if (suggestedStatus && suggestedStatus !== existingItem.status) {
      // Only auto-update if it's a logical progression
      if (
        (existingItem.status === TaskStatus.PENDING && suggestedStatus === 'in_progress') ||
        (existingItem.status === TaskStatus.IN_PROGRESS && suggestedStatus === 'completed')
      ) {
        updatedTaskStatus = suggestedStatus as TaskStatus;
        logger.info('Auto-updating task status based on action plan progress', {
          itemId,
          oldStatus: existingItem.status,
          newStatus: updatedTaskStatus,
          planProgress: this.actionPlanManager.calculatePlanProgress(updatedActionPlan),
        });
      }
    }

    const updatedItem: TodoItem = {
      ...existingItem,
      actionPlan: updatedActionPlan,
      status: updatedTaskStatus,
      updatedAt: now || new Date(),
    };

    // Set completedAt if status changed to completed
    if (updatedTaskStatus === TaskStatus.COMPLETED && existingItem.status !== TaskStatus.COMPLETED) {
      updatedItem.completedAt = now || new Date();
    } else if (updatedTaskStatus !== TaskStatus.COMPLETED && existingItem.completedAt) {
      delete updatedItem.completedAt;
    }

    const updatedItems = [...items];
    updatedItems[itemIndex] = updatedItem;
    return updatedItems;
  }

  private async addTaskNote(
    items: TodoItem[],
    itemId: string,
    noteContent: string,
    noteType: 'general' | 'technical' | 'decision' | 'learning',
    now: Date
  ): Promise<TodoItem[]> {
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
      throw new Error(`Failed to add task note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const updatedItem: TodoItem = {
      ...existingItem,
      implementationNotes: [...existingItem.implementationNotes, newNote],
      updatedAt: now,
    };

    const updatedItems = [...items];
    updatedItems[itemIndex] = updatedItem;
    return updatedItems;
  }

  private async addItem(
    items: TodoItem[],
    itemData: UpdateTodoListInput['itemData'],
    now: Date
  ): Promise<TodoItem[]> {
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

    const newItem: TodoItem = {
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
      // Enhanced fields (v2)
      implementationNotes: [],
    };

    // Create action plan if provided
    if (itemData.actionPlan) {
      try {
        const actionPlan = await this.actionPlanManager.createActionPlan({
          taskId: newItemId,
          content: itemData.actionPlan,
        });
        newItem.actionPlan = actionPlan;
      } catch (error) {
        logger.warn('Failed to create action plan for new item', {
          itemId: newItemId,
          itemTitle: newItem.title,
          error,
        });
        // Continue without action plan rather than failing the entire operation
      }
    }

    return [...items, newItem];
  }

  private async updateItem(
    items: TodoItem[],
    itemId: string,
    itemData: UpdateTodoListInput['itemData'],
    now: Date
  ): Promise<TodoItem[]> {
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

    const updatedItem: TodoItem = {
      id: existingItem.id,
      title: itemData?.title ?? existingItem.title,
      status: itemData?.status ?? existingItem.status,
      priority: itemData?.priority ?? existingItem.priority,
      createdAt: existingItem.createdAt,
      updatedAt: now,
      dependencies: itemData?.dependencies ?? existingItem.dependencies,
      tags: itemData?.tags ?? existingItem.tags,
      metadata: existingItem.metadata,
      // Enhanced fields (v2)
      implementationNotes: existingItem.implementationNotes || [],
      ...(existingItem.actionPlan && { actionPlan: existingItem.actionPlan }), // Preserve existing action plan
    };

    // Update action plan if provided
    if (itemData?.actionPlan !== undefined) {
      try {
        if (existingItem.actionPlan) {
          // Update existing action plan
          updatedItem.actionPlan = await this.actionPlanManager.updateActionPlan(
            existingItem.actionPlan,
            { content: itemData.actionPlan }
          );
        } else {
          // Create new action plan
          updatedItem.actionPlan = await this.actionPlanManager.createActionPlan({
            taskId: itemId,
            content: itemData.actionPlan,
          });
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

  private removeItem(items: TodoItem[], itemId: string): TodoItem[] {
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
    items: TodoItem[],
    itemId: string,
    newStatus: TaskStatus,
    now: Date
  ): TodoItem[] {
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

    const updatedItem: TodoItem = {
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

  private reorderItems(items: TodoItem[], newOrder: string[]): TodoItem[] {
    // Validate that all item IDs are present
    const existingIds = new Set(items.map(item => item.id));
    const providedIds = new Set(newOrder);

    if (existingIds.size !== providedIds.size) {
      throw new Error('Reorder must include all existing item IDs');
    }

    for (const id of newOrder) {
      if (!existingIds.has(id)) {
        throw new Error(`Invalid item ID in reorder: ${id}`);
      }
    }

    // Create a map for quick lookup
    const itemMap = new Map(items.map(item => [item.id, item]));

    // Return items in the new order
    return newOrder.map(id => {
      const item = itemMap.get(id);
      if (item === undefined) {
        throw new Error(`Item not found during reorder: ${id}`);
      }
      return item;
    });
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
   * Gets the dependency graph for a todo list
   */
  async getDependencyGraph(listId: string): Promise<DependencyGraph> {
    try {
      logger.debug('Getting dependency graph', { listId });

      const todoList = await this.storage.load(listId, {
        includeArchived: false,
      });

      if (!todoList) {
        throw new Error(`Todo list not found: ${listId}`);
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

      const todoList = await this.storage.load(listId, {
        includeArchived: false,
      });

      if (!todoList) {
        throw new Error(`Todo list not found: ${listId}`);
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
  async getReadyItems(listId: string): Promise<TodoItem[]> {
    try {
      logger.debug('Getting ready items', { listId });

      const todoList = await this.storage.load(listId, {
        includeArchived: false,
      });

      if (!todoList) {
        throw new Error(`Todo list not found: ${listId}`);
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
  ): Promise<Array<{ item: TodoItem; blockedBy: TodoItem[] }>> {
    try {
      logger.debug('Getting blocked items', { listId });

      const todoList = await this.storage.load(listId, {
        includeArchived: false,
      });

      if (!todoList) {
        throw new Error(`Todo list not found: ${listId}`);
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
   * Suggests optimal task ordering based on dependencies and priorities
   */
  async suggestTaskOrder(listId: string): Promise<TodoItem[]> {
    try {
      logger.debug('Suggesting task order', { listId });

      const todoList = await this.storage.load(listId, {
        includeArchived: false,
      });

      if (!todoList) {
        throw new Error(`Todo list not found: ${listId}`);
      }

      const orderedItems = this.dependencyResolver.suggestTaskOrder(
        todoList.items
      );

      logger.info('Task order suggested successfully', {
        listId,
        totalItems: todoList.items.length,
        orderedCount: orderedItems.length,
      });

      return orderedItems;
    } catch (error) {
      logger.error('Failed to suggest task order', { listId, error });
      throw error;
    }
  }

  /**
   * Calculates the critical path through the dependency graph
   */
  async getCriticalPath(listId: string): Promise<string[]> {
    try {
      logger.debug('Calculating critical path', { listId });

      const todoList = await this.storage.load(listId, {
        includeArchived: false,
      });

      if (!todoList) {
        throw new Error(`Todo list not found: ${listId}`);
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
  async getActionPlanProgress(listId: string, itemId: string): Promise<{
    progress: number;
    statusText: string;
    nextStep?: string;
    completedToday: number;
    estimatedCompletion?: string;
  } | null> {
    try {
      logger.debug('Getting action plan progress', { listId, itemId });

      const todoList = await this.storage.load(listId, {
        includeArchived: false,
      });

      if (!todoList) {
        throw new Error(`Todo list not found: ${listId}`);
      }

      const item = todoList.items.find(item => item.id === itemId);
      if (!item) {
        throw new Error(`Item not found: ${itemId}`);
      }

      if (!item.actionPlan) {
        return null;
      }

      const progressSummary = this.actionPlanManager.getProgressSummary(item.actionPlan);

      logger.info('Action plan progress retrieved successfully', {
        listId,
        itemId,
        progress: progressSummary.progress,
      });

      return progressSummary;
    } catch (error) {
      logger.error('Failed to get action plan progress', { listId, itemId, error });
      throw error;
    }
  }

  /**
   * Gets all tasks with action plans in a list
   */
  async getTasksWithActionPlans(listId: string): Promise<Array<{
    item: TodoItem;
    progressSummary: ReturnType<ActionPlanManager['getProgressSummary']>;
  }>> {
    try {
      logger.debug('Getting tasks with action plans', { listId });

      const todoList = await this.storage.load(listId, {
        includeArchived: false,
      });

      if (!todoList) {
        throw new Error(`Todo list not found: ${listId}`);
      }

      const tasksWithPlans = todoList.items
        .filter(item => item.actionPlan)
        .map(item => ({
          item,
          progressSummary: this.actionPlanManager.getProgressSummary(item.actionPlan!),
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

  async listTodoLists(input: ListTodoListsInput): Promise<TodoListSummary[]> {
    try {
      logger.debug('Listing todo lists', {
        context: input.context,
        projectTag: input.projectTag,
        status: input.status,
        includeArchived: input.includeArchived,
      });

      // Check cache first
      // Handle both projectTag and context for backward compatibility
      const contextParam = input.projectTag ?? input.context;
      const cacheOptions = {
        ...(contextParam !== undefined && { context: contextParam }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.includeArchived !== undefined && {
          includeArchived: input.includeArchived,
        }),
        ...(input.limit !== undefined && { limit: input.limit }),
        ...(input.offset !== undefined && { offset: input.offset }),
      };
      const cacheKey = cacheManager.generateSummaryKey(cacheOptions);

      let summaries = cacheManager.getSummaryList(cacheKey);

      if (!summaries) {
        // Get list summaries from storage
        const listOptions: ListOptions = {
          includeArchived: input.includeArchived ?? false,
        };

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

        summaries = await this.storage.list(listOptions);

        // Cache the results
        cacheManager.setSummaryList(cacheKey, summaries);
      }

      // Filter by status if specified
      let filteredSummaries = summaries;
      if (input.status !== undefined && input.status !== 'all') {
        filteredSummaries = summaries.filter(summary => {
          if (input.status === 'completed') {
            return summary.progress === 100;
          } else if (input.status === 'active') {
            return summary.progress < 100;
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

      return filteredSummaries;
    } catch (error) {
      logger.error('Failed to list todo lists', {
        context: input.context,
        status: input.status,
        error,
      });
      throw error;
    }
  }

  async deleteTodoList(
    input: DeleteTodoListInput
  ): Promise<DeleteTodoListResult> {
    try {
      logger.info('Deleting todo list', {
        listId: input.listId,
        permanent: input.permanent,
      });

      // Check if the list exists
      const todoList = await this.storage.load(input.listId, {
        includeArchived: true,
      });

      if (!todoList) {
        throw new Error(`Todo list not found: ${input.listId}`);
      }

      if (input.permanent === true) {
        // Permanently delete the list
        await this.storage.delete(input.listId, true);

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
        const archivedList: TodoList = {
          ...todoList,
          isArchived: true,
          updatedAt: now,
        };

        // Set completedAt only if the list is fully completed
        if (todoList.progress === 100) {
          archivedList.completedAt = todoList.completedAt ?? now;
        }

        await this.storage.save(input.listId, archivedList, { validate: true });

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
      return await this.storage.healthCheck();
    } catch (error) {
      logger.error('TodoListManager health check failed', { error });
      return false;
    }
  }

  private calculateAnalytics(items: TodoItem[]): ListAnalytics {
    return this.analyticsManager.calculateListAnalytics(items);
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

    // Memory pressure monitoring and aggressive cleanup
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
  private addToCache(key: string, todoList: TodoList): void {
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
      logger.debug('TodoListManager cache cleanup completed', {
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

    logger.info('TodoListManager aggressive cache cleanup completed', {
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
        const createdAt = note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt);
        const updatedAt = note.updatedAt instanceof Date ? note.updatedAt : new Date(note.updatedAt);
        
        return {
          ...note,
          content, // Use truncated content
          isTruncated, // Include truncation flag
          createdAt, // Ensure it's a Date object
          updatedAt, // Ensure it's a Date object
        };
      } catch (error) {
        logger.warn('Failed to format note for display', { noteId: note.id, error });
        // Return the original note if formatting fails
        return note;
      }
    });
  }

  /**
   * Enhances todo list with formatted notes for display
   */
  private enhanceListWithNotes(todoList: TodoList): TodoList {
    // Format list-level notes
    const formattedListNotes = this.formatNotesForDisplay(
      todoList.implementationNotes || []
    );

    // Format task-level notes for each item
    const enhancedItems = todoList.items.map(item => {
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
      items: enhancedItems,
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
    logger.info('TodoListManager shutting down');

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
    this.analyticsManager.cleanup();

    // Shutdown storage backend
    await this.storage.shutdown();

    // Stop memory leak detection
    memoryLeakDetector.stopDetection();

    logger.info('TodoListManager shutdown completed');
  }

  /**
   * Generate cleanup suggestions for completed task lists
   */
  async generateCleanupSuggestions(projectTag?: string): Promise<CleanupSuggestion[]> {
    try {
      logger.debug('Generating cleanup suggestions', { projectTag });

      // Get all list summaries first
      const listSummaries = await this.listTodoLists({
        includeArchived: false, // Don't include archived lists in cleanup suggestions
        ...(projectTag && { context: projectTag }),
      });

      // Load full TodoList objects for analysis
      const allLists: TodoList[] = [];
      for (const summary of listSummaries) {
        const fullList = await this.getTodoList({ listId: summary.id });
        if (fullList) {
          allLists.push(fullList);
        }
      }

      const suggestions = this.cleanupSuggestionManager.generateCleanupSuggestions(allLists, {
        ...(projectTag && { projectTag }),
        respectDeclineHistory: true,
        maxSuggestions: 5, // Limit suggestions to avoid overwhelming users
      });

      logger.info('Cleanup suggestions generated', {
        count: suggestions.length,
        projectTag,
        totalListsAnalyzed: allLists.length,
      });

      return suggestions;
    } catch (error) {
      logger.error('Failed to generate cleanup suggestions', { error, projectTag });
      throw error;
    }
  }

  /**
   * Mark cleanup as declined for a specific list
   */
  async markCleanupDeclined(listId: string): Promise<void> {
    try {
      logger.debug('Marking cleanup as declined', { listId });

      // Load the full list first
      const list = await this.getTodoList({ listId });
      if (!list) {
        throw new Error(`List not found: ${listId}`);
      }

      const updatedList = this.cleanupSuggestionManager.markCleanupDeclined(list);
      await this.storage.save(listId, updatedList);

      logger.info('Cleanup decline recorded', { listId });
    } catch (error) {
      logger.error('Failed to mark cleanup as declined', { error, listId });
      throw error;
    }
  }

  /**
   * Perform batch cleanup operations on multiple lists
   */
  async performBatchCleanup(listIds: string[], permanent = false): Promise<{
    success: boolean;
    operation: 'archived' | 'deleted';
    listsProcessed: number;
    totalSpaceSaved: number;
    errors: string[];
  }> {
    try {
      logger.info('Starting batch cleanup operation', {
        listIds,
        permanent,
        listCount: listIds.length,
      });

      // Load all the lists first
      const lists: TodoList[] = [];
      for (const listId of listIds) {
        const list = await this.getTodoList({ listId });
        if (list) {
          lists.push(list);
        }
      }

      const result = await this.cleanupSuggestionManager.performCleanup(lists, listIds, permanent);

      // Convert the result to match expected interface
      const cleanupResult = {
        success: result.success,
        operation: permanent ? 'deleted' as const : 'archived' as const,
        listsProcessed: result.processedLists.length,
        totalSpaceSaved: result.processedLists.reduce((total, list) => 
          total + (list.items.length * 1024), 0), // Rough estimate
        errors: result.errors,
      };

      logger.info('Batch cleanup operation completed', {
        success: cleanupResult.success,
        listsProcessed: cleanupResult.listsProcessed,
        totalSpaceSaved: cleanupResult.totalSpaceSaved,
        errorCount: cleanupResult.errors.length,
      });

      return cleanupResult;
    } catch (error) {
      logger.error('Batch cleanup operation failed', { error, listIds, permanent });
      throw error;
    }
  }
}
