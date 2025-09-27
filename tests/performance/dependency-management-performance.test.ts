/**
 * Performance tests for dependency management features
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TodoListManager } from '../../src/domain/lists/todo-list-manager.js';
import { MemoryStorageBackend } from '../../src/infrastructure/storage/memory-storage.js';

describe('Core Dependency Tools Performance', () => {
  let manager: TodoListManager;
  let storage: MemoryStorageBackend;
  let listId: string;

  beforeEach(async () => {
    storage = new MemoryStorageBackend();
    await storage.initialize();
    manager = new TodoListManager(storage);
    await manager.initialize();
    
    const list = await manager.createTodoList({
      title: 'Performance Test List',
      description: 'Testing performance',
      projectTag: 'performance-test',
      tasks: [],
    });
    listId = list.id;
  });

  it('should handle dependency operations efficiently', async () => {
    const startTime = Date.now();
    
    // Create a list with multiple tasks
    const list = await manager.createTodoList({
      title: 'Performance Test List with Tasks',
      description: 'Testing performance with tasks',
      projectTag: 'performance-test',
      tasks: Array.from({ length: 50 }, (_, i) => ({
        title: `Task ${i}`,
        description: `Description ${i}`,
        priority: 3 as const,
        tags: [],
      })),
    });

    // Test dependency operations
    const dependencyGraph = await manager.getDependencyGraph(list.id);
    const readyItems = await manager.getReadyItems(list.id);
    const criticalPath = await manager.getCriticalPath(list.id);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Performance assertions
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    expect(dependencyGraph).toBeDefined();
    expect(readyItems).toBeDefined();
    expect(criticalPath).toBeDefined();
    expect(readyItems.length).toBeGreaterThan(0);
  });

  it('should maintain performance with large datasets', async () => {
    const startTime = Date.now();
    
    // Create a larger dataset
    const list = await manager.createTodoList({
      title: 'Large Performance Test List',
      description: 'Testing performance with large dataset',
      projectTag: 'performance-test',
      tasks: Array.from({ length: 100 }, (_, i) => ({
        title: `Large Task ${i}`,
        description: `Large Description ${i}`,
        priority: 3 as const,
        tags: [],
      })),
    });

    // Performance test operations
    const dependencyGraph = await manager.getDependencyGraph(list.id);
    const readyItems = await manager.getReadyItems(list.id);
    const suggestedOrder = await manager.suggestTaskOrder(list.id);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Performance assertions
    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    expect(dependencyGraph).toBeDefined();
    expect(readyItems).toBeDefined();
    expect(suggestedOrder).toBeDefined();
    expect(readyItems.length).toBe(100); // All tasks should be ready since no dependencies
  });
});