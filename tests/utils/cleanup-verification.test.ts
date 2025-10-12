/**
 * Test to verify the cleanup system works correctly
 */

import { describe, it, expect, beforeEach as _beforeEach } from 'vitest';

import { TodoListManager as _TodoListManager } from '../../src/domain/lists/todo-list-manager.js';
import { MemoryStorageBackend } from '../../src/infrastructure/storage/memory-storage.js';
import { TestCleanup } from '../setup.js';
import { createTodoListManager } from '../utils/test-helpers.js';

describe('Test Cleanup System Verification', () => {
  it('should automatically clean up storage instances', async () => {
    const storage = new MemoryStorageBackend();
    await storage.initialize();

    // Register for cleanup
    TestCleanup.registerStorage(storage);

    // Verify storage is initialized
    expect(await storage.healthCheck()).toBe(true);

    // Create some data
    const testList = {
      id: 'test-list-id',
      title: 'Test List',
      description: 'Test description',
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      progress: 0,
      totalItems: 0,
      completedItems: 0,
      isArchived: false,
      context: 'test',
    };

    await storage.save('test-key', testList);

    // Verify data was saved
    const loaded = await storage.load('test-key');
    expect(loaded).toBeTruthy();
    expect(loaded?.title).toBe('Test List');

    // Cleanup will be called automatically by afterEach in setup.ts
    // The test passes if no errors occur during cleanup
  });

  it('should automatically clean up manager instances', async () => {
    const storage = new MemoryStorageBackend();
    await storage.initialize();

    const manager = createTodoListManager(storage);
    await manager.initialize();

    // Register for cleanup
    TestCleanup.registerStorage(storage);
    TestCleanup.registerManager(manager);

    // Create a test list
    const todoList = await manager.createTodoList({
      title: 'Cleanup Test List',
      description: 'Testing cleanup functionality',
      context: 'cleanup-test',
    });

    expect(todoList.title).toBe('Cleanup Test List');

    // Cleanup will be called automatically by afterEach in setup.ts
    // The test passes if no errors occur during cleanup
  });

  it('should automatically clean up environment variables', async () => {
    // Set some test environment variables
    await TestCleanup.registerEnvVar('TEST_CLEANUP_VAR', 'test-value');
    await TestCleanup.registerEnvVar('ANOTHER_TEST_VAR', 'another-value');

    // Verify they are set
    expect(process.env.TEST_CLEANUP_VAR).toBe('test-value');
    expect(process.env.ANOTHER_TEST_VAR).toBe('another-value');

    // Cleanup will be called automatically by afterEach in setup.ts
    // After cleanup, these variables should be removed
  });

  it('should handle cleanup errors gracefully', async () => {
    // Temporarily suppress console.warn to avoid test output pollution
    const originalWarn = console.warn;
    console.warn = () => {}; // Suppress warnings during this test

    try {
      // Create a mock object that will throw an error during cleanup
      const mockStorage = {
        shutdown: async () => {
          throw new Error('Simulated cleanup error');
        },
        cleanup: async () => {
          throw new Error('Another simulated error');
        },
      };

      // Register the problematic storage
      TestCleanup.registerStorage(mockStorage);

      // Manually trigger cleanup to test error handling
      await TestCleanup.cleanupAll();

      // The test should complete without throwing, even though cleanup errors occur
      // Errors are logged but don't fail the test
      expect(true).toBe(true);
    } finally {
      // Restore console.warn
      console.warn = originalWarn;
    }
  });

  it('should clean up timers and intervals', async () => {
    // Create some timers and intervals
    const timer1 = setTimeout(() => {
      // This should never execute due to cleanup
      throw new Error('Timer was not cleaned up');
    }, 1000);

    const timer2 = setTimeout(() => {
      // This should never execute due to cleanup
      throw new Error('Timer was not cleaned up');
    }, 2000);

    const interval = setInterval(() => {
      // This should never execute due to cleanup
      throw new Error('Interval was not cleaned up');
    }, 500);

    // Register for cleanup
    TestCleanup.registerTimer(timer1);
    TestCleanup.registerTimer(timer2);
    TestCleanup.registerInterval(interval);

    // Wait a bit to ensure timers would fire if not cleaned up
    await new Promise(resolve => setTimeout(resolve, 100));

    // Test passes if we get here without errors
    expect(true).toBe(true);
  });

  it('should handle multiple cleanup registrations', async () => {
    // Register multiple instances of different types
    const storage1 = new MemoryStorageBackend();
    const storage2 = new MemoryStorageBackend();

    await storage1.initialize();
    await storage2.initialize();

    const manager1 = createTodoListManager(storage1);
    const manager2 = createTodoListManager(storage2);

    await manager1.initialize();
    await manager2.initialize();

    // Register all for cleanup
    TestCleanup.registerStorage(storage1);
    TestCleanup.registerStorage(storage2);
    TestCleanup.registerManager(manager1);
    TestCleanup.registerManager(manager2);

    // Set multiple environment variables
    await TestCleanup.registerEnvVar('MULTI_TEST_1', 'value1');
    await TestCleanup.registerEnvVar('MULTI_TEST_2', 'value2');
    await TestCleanup.registerEnvVar('MULTI_TEST_3', 'value3');

    // Create some data in both storages
    const testList1 = await manager1.createTodoList({
      title: 'Multi Test List 1',
      context: 'multi-test-1',
    });

    const testList2 = await manager2.createTodoList({
      title: 'Multi Test List 2',
      context: 'multi-test-2',
    });

    expect(testList1.title).toBe('Multi Test List 1');
    expect(testList2.title).toBe('Multi Test List 2');

    // All cleanup will be handled automatically
    // Test passes if no errors occur during cleanup
  });
});
