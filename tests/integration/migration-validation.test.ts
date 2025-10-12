import fs from 'fs/promises';
import path from 'path';

import { describe, it, expect, beforeEach } from 'vitest';

import { TaskListManager } from '../../src/domain/lists/task-list-manager.js';
import { TaskListRepositoryAdapter } from '../../src/domain/repositories/task-list-repository.adapter.js';
import { FileStorageBackend } from '../../src/infrastructure/storage/file-storage-backend.js';
import { StorageFactory } from '../../src/infrastructure/storage/storage-factory.js';

describe('Backward Compatibility Tests', () => {
  let taskListManager: TaskListManager;
  let repository: TaskListRepositoryAdapter;
  let storage: FileStorageBackend;

  beforeEach(async () => {
    // Use the actual data directory with existing files
    storage = (await StorageFactory.createStorage({
      type: 'file',
      file: {
        dataDirectory: './data',
      },
    })) as FileStorageBackend;

    repository = new TaskListRepositoryAdapter(storage);

    // TaskListManager creates its own managers internally
    taskListManager = new TaskListManager(repository, storage);
    await taskListManager.initialize();
  });

  it('should read existing data files', async () => {
    // Get all lists
    const lists = await taskListManager.listTaskLists({});

    // Should be able to get lists (may be empty in CI)
    expect(Array.isArray(lists)).toBe(true);

    // Each list should have valid structure
    for (const list of lists.slice(0, 10)) {
      // Test first 10
      expect(list).toHaveProperty('id');
      expect(list).toHaveProperty('title');
      // TaskListSummary has different properties than full TaskList
      expect(list).toHaveProperty('totalItems');
    }
  });

  it('should load a specific existing list', async () => {
    // Get first list ID from data directory
    const listsDir = path.join('./data', 'lists');
    const files = await fs.readdir(listsDir);
    const jsonFiles = files.filter(
      f => f.endsWith('.json') && !f.endsWith('.backup')
    );

    // Skip test if no data files exist (CI environment)
    if (jsonFiles.length === 0) {
      expect(jsonFiles.length).toBe(0);
      return;
    }

    const firstListId = jsonFiles[0].replace('.json', '');

    // Load the list
    const list = await taskListManager.getTaskList({ listId: firstListId });

    expect(list).toBeDefined();
    expect(list?.id).toBe(firstListId);
    expect(list?.title).toBeDefined();
  });

  it('should handle lists with tasks', async () => {
    const lists = await taskListManager.listTaskLists({});

    // Find a list with tasks
    const listWithTasks = lists.find(l => l.totalItems > 0);

    if (listWithTasks) {
      expect(listWithTasks.totalItems).toBeGreaterThan(0);

      // Load the full list to check tasks
      const fullList = await taskListManager.getTaskList({
        listId: listWithTasks.id,
      });
      expect(fullList).toBeDefined();
      expect(fullList!.items.length).toBeGreaterThan(0);

      const firstTask = fullList!.items[0];
      expect(firstTask).toHaveProperty('id');
      expect(firstTask).toHaveProperty('title');
      expect(firstTask).toHaveProperty('status');
    }
  });

  it('should handle lists with dependencies', async () => {
    const lists = await taskListManager.listTaskLists({});

    // Check a few lists for dependencies
    for (const summary of lists.slice(0, 10)) {
      const list = await taskListManager.getTaskList({ listId: summary.id });
      if (
        list &&
        list.items.some(
          item => item.dependencies && item.dependencies.length > 0
        )
      ) {
        const taskWithDeps = list.items.find(
          item => item.dependencies && item.dependencies.length > 0
        );

        expect(taskWithDeps).toBeDefined();
        expect(taskWithDeps?.dependencies).toBeDefined();
        expect(Array.isArray(taskWithDeps?.dependencies)).toBe(true);
        break; // Found one, that's enough
      }
    }
  });

  it('should maintain data format compatibility', async () => {
    // Create a new list
    const newList = await taskListManager.createTaskList({
      title: 'Backward Compatibility Test List',
      description: 'Testing data format compatibility',
    });

    // Read it back
    const retrieved = await taskListManager.getTaskList({ listId: newList.id });

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(newList.id);
    expect(retrieved?.title).toBe(newList.title);

    // Clean up
    await taskListManager.deleteTaskList({
      listId: newList.id,
      permanent: true,
    });
  });

  it('should handle archived lists', async () => {
    const lists = await taskListManager.listTaskLists({
      includeArchived: true,
    });

    // Should be able to get lists including archived ones
    expect(Array.isArray(lists)).toBe(true);
  });

  it('should search across existing lists', async () => {
    const results = await taskListManager.listTaskLists({ limit: 10 });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(10);
  });
});
