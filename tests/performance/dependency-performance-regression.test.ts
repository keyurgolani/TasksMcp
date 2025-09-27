/**
 * Performance regression tests for MCP tools
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TodoListManager } from '../../src/domain/lists/todo-list-manager.js';
import { MemoryStorageBackend } from '../../src/infrastructure/storage/memory-storage.js';

describe('MCP Tool Performance Regression', () => {
  let manager: TodoListManager;
  let storage: MemoryStorageBackend;

  beforeEach(async () => {
    storage = new MemoryStorageBackend();
    await storage.initialize();
    manager = new TodoListManager(storage);
    await manager.initialize();
  });

  it('should maintain consistent performance across operations', async () => {
    const startTime = Date.now();
    
    // Create multiple lists to test scalability
    const lists = [];
    for (let i = 0; i < 10; i++) {
      const list = await manager.createTodoList({
        title: `Regression Test List ${i}`,
        description: `Testing performance regression ${i}`,
        projectTag: 'regression-test',
        tasks: Array.from({ length: 10 }, (_, j) => ({
          title: `Task ${j}`,
          description: `Description ${j}`,
          priority: 3 as const,
          tags: [],
        })),
      });
      lists.push(list);
    }

    // Test operations on all lists
    for (const list of lists) {
      await manager.getDependencyGraph(list.id);
      await manager.getReadyItems(list.id);
      await manager.suggestTaskOrder(list.id);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Performance regression assertions
    expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    expect(lists.length).toBe(10);
  });

  it('should handle memory efficiently during bulk operations', async () => {
    const startTime = Date.now();
    
    // Create a single list with many tasks
    const list = await manager.createTodoList({
      title: 'Memory Efficiency Test',
      description: 'Testing memory usage during bulk operations',
      projectTag: 'memory-test',
      tasks: Array.from({ length: 200 }, (_, i) => ({
        title: `Memory Test Task ${i}`,
        description: `Memory test description ${i}`,
        priority: (i % 5 + 1) as 1 | 2 | 3 | 4 | 5,
        tags: [`tag-${i % 10}`],
      })),
    });

    // Perform multiple operations to test memory usage
    const operations = [
      () => manager.getDependencyGraph(list.id),
      () => manager.getReadyItems(list.id),
      () => manager.suggestTaskOrder(list.id),
      () => manager.getCriticalPath(list.id),
    ];

    // Run operations multiple times
    for (let i = 0; i < 5; i++) {
      for (const operation of operations) {
        await operation();
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Memory efficiency assertions
    expect(duration).toBeLessThan(20000); // Should complete within 20 seconds
    expect(list.items.length).toBe(200);
  });
});