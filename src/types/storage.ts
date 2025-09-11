/**
 * Storage backend interfaces and types
 */

import type { TodoList, TodoListSummary } from './todo.js';

export interface SaveOptions {
  backup?: boolean;
  validate?: boolean;
}

export interface LoadOptions {
  includeArchived?: boolean;
}

export interface ListOptions {
  context?: string;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export abstract class StorageBackend {
  abstract save(
    key: string,
    data: TodoList,
    options?: SaveOptions
  ): Promise<void>;
  abstract load(key: string, options?: LoadOptions): Promise<TodoList | null>;
  abstract delete(key: string, permanent?: boolean): Promise<void>;
  abstract list(options?: ListOptions): Promise<TodoListSummary[]>;
  abstract initialize(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;
  abstract shutdown(): Promise<void>;
}
