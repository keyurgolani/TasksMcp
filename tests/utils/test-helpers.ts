/**
 * Test helper utilities for creating TodoListManager instances
 * with the repository pattern
 */

import { TodoListManager } from '../../src/domain/lists/todo-list-manager.js';
import { TodoListRepositoryAdapter } from '../../src/domain/repositories/todo-list-repository.adapter.js';

import type { StorageBackend } from '../../src/shared/types/storage.js';

/**
 * Creates a TodoListManager instance with repository pattern
 *
 * This helper wraps the storage backend in a repository adapter
 * and creates a TodoListManager with both the repository and storage
 * (storage is needed for backward compatibility with ProjectManager)
 *
 * IMPORTANT: The storage backend must be initialized BEFORE calling this function.
 *
 * @param storage - The storage backend to use (must be initialized)
 * @returns A configured TodoListManager instance
 *
 * @example
 * ```typescript
 * const storage = new MemoryStorageBackend();
 * await storage.initialize(); // MUST initialize first!
 * const manager = createTodoListManager(storage);
 * await manager.initialize();
 * ```
 */
export function createTodoListManager(
  storage: StorageBackend
): TodoListManager {
  const repository = new TodoListRepositoryAdapter(storage);
  return new TodoListManager(repository, storage);
}
