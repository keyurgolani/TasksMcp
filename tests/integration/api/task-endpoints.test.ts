/**
 * Integration tests for task management API endpoints
 */

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';

import { RestApiServer } from '../../../src/app/rest-api-server.js';
import { TaskListManager } from '../../../src/domain/lists/task-list-manager.js';
import { TaskListRepositoryAdapter } from '../../../src/domain/repositories/task-list-repository.adapter.js';
import { ActionPlanManager } from '../../../src/domain/tasks/action-plan-manager.js';
import { DependencyResolver } from '../../../src/domain/tasks/dependency-manager.js';
import { ExitCriteriaManager } from '../../../src/domain/tasks/exit-criteria-manager.js';
import { NotesManager } from '../../../src/domain/tasks/notes-manager.js';
import { MemoryStorageBackend } from '../../../src/infrastructure/storage/memory-storage.js';
import { TaskStatus } from '../../../src/shared/types/task.js';

import type { Express } from 'express';

describe('Task Management API Endpoints', () => {
  let server: RestApiServer;
  let app: Express;
  let testListId: string;

  beforeAll(async () => {
    // Create in-memory storage backend
    const storage = new MemoryStorageBackend();
    await storage.initialize();

    // Create repository
    const repository = new TaskListRepositoryAdapter(storage);

    // Create managers
    const taskListManager = new TaskListManager(repository, storage);
    const dependencyManager = new DependencyResolver(repository);
    const exitCriteriaManager = new ExitCriteriaManager(repository);
    const actionPlanManager = new ActionPlanManager(repository);
    const notesManager = new NotesManager(repository);
    // Create and initialize server
    server = new RestApiServer(
      { port: 3099 }, // Use a different port for testing
      taskListManager,
      dependencyManager,
      exitCriteriaManager,
      actionPlanManager,
      notesManager
    );

    await server.initialize();
    app = server.getApp();
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  beforeEach(async () => {
    // Create a test list before each test
    const response = await request(app).post('/api/v1/lists').send({
      title: 'Test List for Tasks',
      description: 'A list for testing task endpoints',
    });

    expect(response.status).toBe(201);
    testListId = response.body.data.id;
  });

  describe('POST /api/v1/tasks', () => {
    it('should create a new task', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .send({
          listId: testListId,
          title: 'Test Task',
          description: 'A test task',
          priority: 3,
          estimatedDuration: 60,
          tags: ['test', 'api'],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        title: 'Test Task',
        description: 'A test task',
        priority: 3,
        estimatedDuration: 60,
        tags: ['test', 'api'],
        status: TaskStatus.PENDING,
      });
      expect(response.body.data.id).toBeDefined();
      expect(response.body.meta.requestId).toBeDefined();
    });

    it('should create a task with dependencies', async () => {
      // Create first task
      const task1Response = await request(app).post('/api/v1/tasks').send({
        listId: testListId,
        title: 'Task 1',
      });

      const task1Id = task1Response.body.data.id;

      // Create second task with dependency
      const response = await request(app)
        .post('/api/v1/tasks')
        .send({
          listId: testListId,
          title: 'Task 2',
          dependencies: [task1Id],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.dependencies).toEqual([task1Id]);
    });

    it('should reject task with invalid list ID', async () => {
      const response = await request(app).post('/api/v1/tasks').send({
        listId: '00000000-0000-0000-0000-000000000000',
        title: 'Test Task',
      });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject task with invalid dependencies', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .send({
          listId: testListId,
          title: 'Test Task',
          dependencies: ['00000000-0000-0000-0000-000000000000'],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/tasks', () => {
    beforeEach(async () => {
      // Create some test tasks
      await request(app)
        .post('/api/v1/tasks')
        .send({
          listId: testListId,
          title: 'Task 1',
          priority: 5,
          tags: ['urgent'],
        });

      await request(app)
        .post('/api/v1/tasks')
        .send({
          listId: testListId,
          title: 'Task 2',
          priority: 3,
          tags: ['normal'],
        });

      await request(app)
        .post('/api/v1/tasks')
        .send({
          listId: testListId,
          title: 'Task 3',
          priority: 1,
          tags: ['low'],
        });
    });

    it('should search tasks in a specific list', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .query({ listId: testListId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta.pagination).toBeDefined();
      expect(response.body.meta.pagination.total).toBe(3);
    });

    it('should filter tasks by priority', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .query({ listId: testListId, priority: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Task 1');
    });

    it('should filter tasks by tags', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .query({ listId: testListId, tags: 'urgent' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].tags).toContain('urgent');
    });

    it('should search tasks by text', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .query({ listId: testListId, search: 'Task 2' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Task 2');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .query({ listId: testListId, limit: 2, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.pagination.hasMore).toBe(true);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      const response = await request(app).post('/api/v1/tasks').send({
        listId: testListId,
        title: 'Test Task',
      });

      taskId = response.body.data.id;
    });

    it('should get a single task', async () => {
      const response = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .query({ listId: testListId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(taskId);
      expect(response.body.data.title).toBe('Test Task');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .query({ listId: testListId });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should require listId query parameter', async () => {
      const response = await request(app).get(`/api/v1/tasks/${taskId}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      const response = await request(app).post('/api/v1/tasks').send({
        listId: testListId,
        title: 'Original Title',
        priority: 3,
      });

      taskId = response.body.data.id;
    });

    it('should update a task', async () => {
      const response = await request(app)
        .put(`/api/v1/tasks/${taskId}`)
        .query({ listId: testListId })
        .send({
          title: 'Updated Title',
          priority: 5,
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.priority).toBe(5);
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should update task status', async () => {
      const response = await request(app)
        .put(`/api/v1/tasks/${taskId}`)
        .query({ listId: testListId })
        .send({
          status: TaskStatus.IN_PROGRESS,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .put('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .query({ listId: testListId })
        .send({
          title: 'Updated Title',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      const response = await request(app).post('/api/v1/tasks').send({
        listId: testListId,
        title: 'Task to Delete',
      });

      taskId = response.body.data.id;
    });

    it('should delete a task', async () => {
      const response = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .query({ listId: testListId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify task is deleted
      const getResponse = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .query({ listId: testListId });

      expect(getResponse.status).toBe(404);
    });

    it('should not delete task with dependents', async () => {
      // Create a dependent task
      const dependentResponse = await request(app)
        .post('/api/v1/tasks')
        .send({
          listId: testListId,
          title: 'Dependent Task',
          dependencies: [taskId],
        });

      expect(dependentResponse.status).toBe(201);

      // Try to delete the task
      const response = await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .query({ listId: testListId });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/tasks/:id/complete', () => {
    let taskId: string;

    beforeEach(async () => {
      const response = await request(app).post('/api/v1/tasks').send({
        listId: testListId,
        title: 'Task to Complete',
      });

      taskId = response.body.data.id;
    });

    it('should complete a task', async () => {
      const response = await request(app)
        .post(`/api/v1/tasks/${taskId}/complete`)
        .query({ listId: testListId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(TaskStatus.COMPLETED);
      expect(response.body.data.completedAt).toBeDefined();
    });

    it('should not complete task with incomplete dependencies', async () => {
      // Create dependency
      const dep1Response = await request(app).post('/api/v1/tasks').send({
        listId: testListId,
        title: 'Dependency Task',
      });

      const dep1Id = dep1Response.body.data.id;

      // Create task with dependency
      const task2Response = await request(app)
        .post('/api/v1/tasks')
        .send({
          listId: testListId,
          title: 'Task with Dependency',
          dependencies: [dep1Id],
        });

      const task2Id = task2Response.body.data.id;

      // Try to complete task without completing dependency
      const response = await request(app)
        .post(`/api/v1/tasks/${task2Id}/complete`)
        .query({ listId: testListId });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should complete task after dependencies are completed', async () => {
      // Create dependency
      const dep1Response = await request(app).post('/api/v1/tasks').send({
        listId: testListId,
        title: 'Dependency Task',
      });

      const dep1Id = dep1Response.body.data.id;

      // Create task with dependency
      const task2Response = await request(app)
        .post('/api/v1/tasks')
        .send({
          listId: testListId,
          title: 'Task with Dependency',
          dependencies: [dep1Id],
        });

      const task2Id = task2Response.body.data.id;

      // Complete dependency first
      await request(app)
        .post(`/api/v1/tasks/${dep1Id}/complete`)
        .query({ listId: testListId });

      // Now complete the task
      const response = await request(app)
        .post(`/api/v1/tasks/${task2Id}/complete`)
        .query({ listId: testListId });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(TaskStatus.COMPLETED);
    });

    it('should return 409 for already completed task', async () => {
      // Complete the task first
      await request(app)
        .post(`/api/v1/tasks/${taskId}/complete`)
        .query({ listId: testListId });

      // Try to complete again
      const response = await request(app)
        .post(`/api/v1/tasks/${taskId}/complete`)
        .query({ listId: testListId });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });
});
