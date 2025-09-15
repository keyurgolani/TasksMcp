/**
 * Memory cleanup utilities and best practices
 * @deprecated Use ../managers/memory-cleanup-manager.js instead
 */

// Re-export from the new location for backward compatibility
export {
  MemoryCleanupManager,
  MemoryUtils,
  memoryCleanupManager,
  type CleanupTask,
} from './memory-cleanup-manager.js';
