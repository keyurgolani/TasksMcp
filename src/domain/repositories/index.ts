/**
 * Repository interfaces for domain aggregates
 *
 * This module exports all repository interfaces defined in the domain layer.
 * These interfaces define the contract for data access operations without
 * coupling to specific storage implementations.
 *
 * Following Domain-Driven Design principles:
 * - Repositories provide collection-like interfaces for aggregates
 * - They abstract persistence details from domain logic
 * - They enable dependency injection and testability
 * - They support multiple storage backend implementations
 */

// TaskList repository
export type {
  ITaskListRepository,
  FindOptions,
  TaskFilters,
  SortOptions,
  PaginationOptions,
  SearchQuery,
  SearchResult,
} from './task-list.repository.js';

// Task repository
export type {
  ITaskRepository,
  TaskSearchQuery,
  TaskWithContext,
  UpdateTaskOptions,
  CreateTaskOptions,
  BulkOperationResult,
} from './task.repository.js';

// Repository implementations
export { TaskListRepositoryAdapter } from './task-list-repository.adapter.js';
export { TaskListRepository } from './task-list-repository-impl.js';
export type { TaskListWithSource } from './task-list-repository-impl.js';
