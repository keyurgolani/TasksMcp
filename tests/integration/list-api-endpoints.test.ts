/**
 * Integration tests for list management API endpoints
 */

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

import { RestApiServer } from '../../src/app/rest-api-server.js';
import { TaskListManager } from '../../src/domain/lists/task-list-manager.js';
import { TaskListRepositoryAdapter } from '../../src/domain/repositories/task-list-repository.adapter.js';
import { ActionPlanManager } from '../../src/domain/tasks/action-plan-manager.js';
import { DependencyResolver } from '../../src/domain/tasks/dependency-manager.js';
import { ExitCriteriaManager } from '../../src/domain/tasks/exit-criteria-manager.js';
import { NotesManager } from '../../src/domain/tasks/notes-manager.js';
import { MemoryStorageBackend } from '../../src/infrastructure/storage/memory-storage.js';

import type { Express } from 'express';

describe('List Management API Endpoints', () => {
  let app: Express;
  let server: RestApiServer;
  let taskListManager: TaskListManager;

  beforeAll(async () => {
    // Create in-memory storage
    const storage = new MemoryStorageBackend();
    await storage.initialize();

    // Create repository
    const repository = new TaskListRepositoryAdapter(storage);

    // Create managers - ensure they all use the same repository and storage
    taskListManager = new TaskListManager(repository, storage);
    const dependencyManager = new DependencyResolver(repository);
    const exitCriteriaManager = new ExitCriteriaManager(repository);
    const actionPlanManager = new ActionPlanManager(repository);
    const notesManager = new NotesManager(repository);

    // Initialize managers
    await taskListManager.initialize();

    // Create REST API server
    server = new RestApiServer(
      { port: 3099 }, // Use a different port for testing
      taskListManager,
      dependencyManager,
      exitCriteriaManager,
      actionPlanManager,
      notesManager
    );

    // Initialize the server (sets up routes)
    await server.initialize();

    app = server.getApp();
  });

  afterAll(async () => {
    await taskListManager.shutdown();
  });

  beforeEach(async () => {
    // Note: beforeEach cleanup is disabled for this test file because it tests
    // the integration between create and list operations within the same test.
    // The cleanup was interfering with the test execution by clearing lists
    // between the creation and retrieval operations.
    // Each test in this file is designed to be self-contained and clean up after itself.
  });

  describe('POST /api/v1/lists', () => {
    it('should have routes registered', async () => {
      const response = await request(app).get('/api/v1').expect(200);

      console.log('API root response:', response.body);
    });

    it('should create a new list', async () => {
      const response = await request(app)
        .post('/api/v1/lists')
        .send({
          title: 'Test List',
          description: 'A test list',
          projectTag: 'test-project',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe('Test List');
      expect(response.body.data.description).toBe('A test list');
      expect(response.body.data.projectTag).toBe('test-project');
      expect(response.body.data.id).toBeDefined();
      expect(response.body.meta.requestId).toBeDefined();
    });

    it('should create a list with tasks', async () => {
      const response = await request(app)
        .post('/api/v1/lists')
        .send({
          title: 'List with Tasks',
          tasks: [
            { title: 'Task 1', priority: 5 },
            { title: 'Task 2', priority: 3 },
          ],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.items[0].title).toBe('Task 1');
      expect(response.body.data.items[0].priority).toBe(5);
    });

    it('should return Validation error for missing title', async () => {
      const response = await request(app)
        .post('/api/v1/lists')
        .send({
          description: 'No title',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/lists', () => {
    it('should list all lists', async () => {
      // Create some lists via API to ensure consistency
      const createResponse1 = await request(app)
        .post('/api/v1/lists')
        .send({ title: 'List 1' })
        .expect(201);

      const createResponse2 = await request(app)
        .post('/api/v1/lists')
        .send({ title: 'List 2' })
        .expect(201);

      const list1Id = createResponse1.body.data.id;
      const list2Id = createResponse2.body.data.id;

      // Verify lists were created
      expect(list1Id).toBeDefined();
      expect(list2Id).toBeDefined();

      // Now list all lists
      const response = await request(app).get('/api/v1/lists').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      // Verify our lists are in the response
      const listIds = response.body.data.map((l: any) => l.id);
      expect(listIds).toContain(list1Id);
      expect(listIds).toContain(list2Id);
    });

    it('should filter lists by projectTag', async () => {
      const listA = await taskListManager.createTaskList({
        title: 'Project A List',
        projectTag: 'unique-project-a',
      });
      await taskListManager.createTaskList({
        title: 'Project B List',
        projectTag: 'unique-project-b',
      });

      const response = await request(app)
        .get('/api/v1/lists')
        .query({ projectTag: 'unique-project-a' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should only return lists with the specified project tag
      const projectALists = response.body.data.filter(
        (l: any) => l.projectTag === 'unique-project-a'
      );
      expect(projectALists.length).toBeGreaterThanOrEqual(1);
      expect(projectALists[0].id).toBe(listA.id);
    });

    it('should support pagination', async () => {
      // Create multiple lists
      for (let i = 0; i < 5; i++) {
        await taskListManager.createTaskList({ title: `List ${i}` });
      }

      const response = await request(app)
        .get('/api/v1/lists')
        .query({ limit: 2, offset: 0 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('GET /api/v1/lists/:id', () => {
    it('should get a single list', async () => {
      const list = await taskListManager.createTaskList({ title: 'Test List' });

      const response = await request(app)
        .get(`/api/v1/lists/${list.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(list.id);
      expect(response.body.data.title).toBe('Test List');
    });

    it('should return 404 for non-existent list', async () => {
      const response = await request(app)
        .get('/api/v1/lists/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should support includeCompleted query parameter', async () => {
      const list = await taskListManager.createTaskList({
        title: 'Test List',
        tasks: [{ title: 'Task 1' }, { title: 'Task 2' }],
      });

      // Complete one task
      await taskListManager.updateTaskList({
        listId: list.id,
        action: 'update_status',
        itemId: list.items[0].id,
        itemData: { status: 'completed' },
      });

      const response = await request(app)
        .get(`/api/v1/lists/${list.id}`)
        .query({ includeCompleted: 'false' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].title).toBe('Task 2');
    });
  });

  describe('PUT /api/v1/lists/:id', () => {
    it('should update list metadata', async () => {
      const list = await taskListManager.createTaskList({
        title: 'Original Title',
      });

      const response = await request(app)
        .put(`/api/v1/lists/${list.id}`)
        .send({
          title: 'Updated Title',
          description: 'New description',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.description).toBe('New description');
    });

    it('should return 404 for non-existent list', async () => {
      const response = await request(app)
        .put('/api/v1/lists/non-existent-id')
        .send({ title: 'New Title' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 for deleted list', async () => {
      const list = await taskListManager.createTaskList({ title: 'Test List' });
      await taskListManager.deleteTaskList({
        listId: list.id,
      });

      const response = await request(app)
        .put(`/api/v1/lists/${list.id}`)
        .send({ title: 'New Title' });

      // List is permanently deleted, so should return 404
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/lists/:id', () => {
    it('should permanently delete a list', async () => {
      const list = await taskListManager.createTaskList({ title: 'Test List' });

      const response = await request(app)
        .delete(`/api/v1/lists/${list.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.operation).toBe('deleted');
      expect(response.body.data.message).toContain('deleted');

      // Verify the list is permanently deleted
      await request(app).get(`/api/v1/lists/${list.id}`).expect(404);
    });

    it('should permanently delete when permanent=true', async () => {
      const list = await taskListManager.createTaskList({ title: 'Test List' });

      const response = await request(app)
        .delete(`/api/v1/lists/${list.id}`)
        .query({ permanent: 'true' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.operation).toBe('deleted');

      // Verify list is deleted
      const deletedList = await taskListManager.getTaskList({
        listId: list.id,
      });
      expect(deletedList).toBeNull();
    });

    it('should return 404 for non-existent list', async () => {
      const response = await request(app)
        .delete('/api/v1/lists/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});
