/**
 * Test helper utilities for creating TaskListManager instances
 * with the repository pattern
 */

import { TaskListManager } from '../../src/domain/lists/task-list-manager.js';
import { TaskListRepositoryAdapter } from '../../src/domain/repositories/task-list-repository.adapter.js';

import type { StorageBackend } from '../../src/shared/types/storage.js';

/**
 * Creates a TaskListManager instance with repository pattern
 *
 * This helper wraps the storage backend in a repository adapter
 * and creates a TaskListManager with both the repository and storage
 * (storage is needed for backward compatibility with ProjectManager)
 *
 * IMPORTANT: The storage backend must be initialized BEFORE calling this function.
 *
 * @param storage - The storage backend to use (must be initialized)
 * @returns A configured TaskListManager instance
 *
 * @example
 * ```typescript
 * const storage = new MemoryStorageBackend();
 * await storage.initialize(); // MUST initialize first!
 * const manager = createTaskListManager(storage);
 * await manager.initialize();
 * ```
 */
export function createTaskListManager(
  storage: StorageBackend
): TaskListManager {
  const repository = new TaskListRepositoryAdapter(storage);
  return new TaskListManager(repository, storage);
}
