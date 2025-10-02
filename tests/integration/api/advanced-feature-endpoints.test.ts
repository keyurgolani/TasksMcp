/**
 * Integration tests for advanced feature API endpoints
 * Tests exit criteria, action plans, and notes endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';
import type { Express } from 'express';
import request from 'supertest';
import { RestApiServer } from '../../../src/app/rest-api-server.js';
import { TodoListManager } from '../../../src/domain/lists/todo-list-manager.js';
import { DependencyResolver } from '../../../src/domain/tasks/dependency-manager.js';
import { ExitCriteriaManager } from '../../../src/domain/tasks/exit-criteria-manager.js';
import { ActionPlanManager } from '../../../src/domain/tasks/action-plan-manager.js';
import { NotesManager } from '../../../src/domain/tasks/notes-manager.js';
import { IntelligenceManager } from '../../../src/domain/intelligence/intelligence-manager.js';
import { TodoListRepositoryAdapter } from '../../../src/domain/repositories/todo-list-repository.adapter.js';
import { MemoryStorageBackend } from '../../../src/infrastructure/storage/memory-storage.js';
import type { TodoList, TodoItem } from '../../../src/shared/types/todo.js';

describe('Advanced Feature API Endpoints', () => {
  let server: RestApiServer;
  let app: Express;
  let storage: MemoryStorageBackend;
  let todoListManager: TodoListManager;
  let testList: TodoList;
  let testTask: TodoItem;

  beforeEach(async () => {
    // Initialize storage and managers
    storage = new MemoryStorageBackend();
    await storage.initialize();

    // Create repository adapter
    const repository = new TodoListRepositoryAdapter(storage);

    todoListManager = new TodoListManager(repository, storage);
    const dependencyManager = new DependencyResolver(repository);
    const exitCriteriaManager = new ExitCriteriaManager(repository);
    const actionPlanManager = new ActionPlanManager(repository);
    const notesManager = new NotesManager(repository);
    const intelligenceManager = new IntelligenceManager();

    // Create API server
    server = new RestApiServer(
      {
        port: 0, // Use random port for testing
        corsOrigins: ['*'],
        authEnabled: false,
      },
      todoListManager,
      dependencyManager,
      exitCriteriaManager,
      actionPlanManager,
      notesManager,
      intelligenceManager
    );

    await server.initialize();
    app = server.getApp();
    await server.start();

    // Create test list and task
    testList = await todoListManager.createTodoList({
      title: 'Test List for Advanced Features',
      description: 'Testing exit criteria, action plans, and notes',
    });

    const updatedList = await todoListManager.updateTodoList({
      listId: testList.id,
      action: 'add_item',
      itemData: {
        title: 'Test Task',
        description: 'Task for testing advanced features',
      },
    });

    testTask = updatedList.items[0]!;
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Exit Criteria Endpoints', () => {
    describe('GET /api/v1/exit-criteria/task/:taskId', () => {
      it('should get empty exit criteria for task without criteria', async () => {
        const response = await request(app)
          .get(`/api/v1/exit-criteria/task/${testTask.id}`)
          .query({ listId: testList.id })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.exitCriteria).toEqual([]);
        expect(response.body.data.stats).toBeDefined();
        expect(response.body.data.stats.total).toBe(0);
      });

      it('should get exit criteria for task with criteria', async () => {
        // Add exit criteria first
        await request(app)
          .post(`/api/v1/exit-criteria/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            description: 'Test criteria 1',
            order: 0,
          })
          .expect(201);

        await request(app)
          .post(`/api/v1/exit-criteria/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            description: 'Test criteria 2',
            order: 1,
          })
          .expect(201);

        const response = await request(app)
          .get(`/api/v1/exit-criteria/task/${testTask.id}`)
          .query({ listId: testList.id })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.exitCriteria).toHaveLength(2);
        expect(response.body.data.stats.total).toBe(2);
        expect(response.body.data.stats.met).toBe(0);
        expect(response.body.data.stats.unmet).toBe(2);
      });

      it('should return 404 for non-existent task', async () => {
        const response = await request(app)
          .get('/api/v1/exit-criteria/task/non-existent-id')
          .query({ listId: testList.id })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NOT_FOUND');
      });

      it('should return 400 without listId query parameter', async () => {
        const response = await request(app)
          .get(`/api/v1/exit-criteria/task/${testTask.id}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('BAD_REQUEST');
      });
    });

    describe('POST /api/v1/exit-criteria/task/:taskId', () => {
      it('should add exit criteria to task', async () => {
        const response = await request(app)
          .post(`/api/v1/exit-criteria/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            description: 'All tests pass',
            order: 0,
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.description).toBe('All tests pass');
        expect(response.body.data.isMet).toBe(false);
        expect(response.body.data.order).toBe(0);
      });

      it('should validate description length', async () => {
        const response = await request(app)
          .post(`/api/v1/exit-criteria/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            description: '',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject description over 500 characters', async () => {
        const longDescription = 'a'.repeat(501);
        const response = await request(app)
          .post(`/api/v1/exit-criteria/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            description: longDescription,
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/v1/exit-criteria/:id', () => {
      it('should update exit criteria description', async () => {
        // Create criteria first
        const createResponse = await request(app)
          .post(`/api/v1/exit-criteria/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            description: 'Original description',
          })
          .expect(201);

        const criteriaId = createResponse.body.data.id;

        // Update criteria
        const response = await request(app)
          .put(`/api/v1/exit-criteria/${criteriaId}`)
          .query({ listId: testList.id, taskId: testTask.id })
          .send({
            description: 'Updated description',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.description).toBe('Updated description');
        expect(response.body.data.id).toBe(criteriaId);
      });

      it('should mark criteria as met', async () => {
        // Create criteria first
        const createResponse = await request(app)
          .post(`/api/v1/exit-criteria/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            description: 'Test criteria',
          })
          .expect(201);

        const criteriaId = createResponse.body.data.id;

        // Mark as met
        const response = await request(app)
          .put(`/api/v1/exit-criteria/${criteriaId}`)
          .query({ listId: testList.id, taskId: testTask.id })
          .send({
            isMet: true,
            notes: 'Completed successfully',
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.isMet).toBe(true);
        expect(response.body.data.notes).toBe('Completed successfully');
        expect(response.body.data.metAt).toBeDefined();
      });

      it('should return 404 for non-existent criteria', async () => {
        const response = await request(app)
          .put('/api/v1/exit-criteria/non-existent-id')
          .query({ listId: testList.id, taskId: testTask.id })
          .send({
            description: 'Updated',
          })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NOT_FOUND');
      });
    });
  });

  describe('Action Plan Endpoints', () => {
    describe('GET /api/v1/action-plans/task/:taskId', () => {
      it('should return 404 for task without action plan', async () => {
        const response = await request(app)
          .get(`/api/v1/action-plans/task/${testTask.id}`)
          .query({ listId: testList.id })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NOT_FOUND');
      });

      it('should get action plan for task', async () => {
        // Create action plan first
        const planContent = `
1. Set up project structure
2. Implement core functionality
3. Write tests
4. Deploy to production
        `.trim();

        await request(app)
          .post(`/api/v1/action-plans/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            content: planContent,
          })
          .expect(201);

        const response = await request(app)
          .get(`/api/v1/action-plans/task/${testTask.id}`)
          .query({ listId: testList.id })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.actionPlan).toBeDefined();
        expect(response.body.data.actionPlan.content).toBe(planContent);
        expect(response.body.data.actionPlan.steps).toHaveLength(4);
        expect(response.body.data.stats).toBeDefined();
        expect(response.body.data.stats.totalSteps).toBe(4);
        expect(response.body.data.progressSummary).toBeDefined();
      });
    });

    describe('POST /api/v1/action-plans/task/:taskId', () => {
      it('should create action plan for task', async () => {
        const planContent = `
- Step 1: Initialize project
- Step 2: Configure dependencies
- Step 3: Write code
        `.trim();

        const response = await request(app)
          .post(`/api/v1/action-plans/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            content: planContent,
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.content).toBe(planContent);
        expect(response.body.data.steps).toHaveLength(3);
        expect(response.body.data.version).toBe(1);
      });

      it('should parse various bullet formats', async () => {
        const planContent = `
1. Numbered item
- Dash item
* Asterisk item
+ Plus item
[ ] Checkbox item
        `.trim();

        const response = await request(app)
          .post(`/api/v1/action-plans/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            content: planContent,
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.steps).toHaveLength(5);
      });

      it('should reject content that is too short', async () => {
        const response = await request(app)
          .post(`/api/v1/action-plans/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            content: 'short',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject duplicate action plan creation', async () => {
        const planContent = '1. Step one\n2. Step two';

        // Create first plan
        await request(app)
          .post(`/api/v1/action-plans/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            content: planContent,
          })
          .expect(201);

        // Try to create second plan
        const response = await request(app)
          .post(`/api/v1/action-plans/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            content: planContent,
          })
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('CONFLICT');
      });
    });

    describe('PUT /api/v1/action-plans/:id', () => {
      it('should update action plan content', async () => {
        // Create plan first
        const originalContent = '1. Original step';
        const createResponse = await request(app)
          .post(`/api/v1/action-plans/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            content: originalContent,
          })
          .expect(201);

        const planId = createResponse.body.data.id;

        // Update plan
        const updatedContent = '1. Updated step\n2. New step';
        const response = await request(app)
          .put(`/api/v1/action-plans/${planId}`)
          .query({ listId: testList.id, taskId: testTask.id })
          .send({
            content: updatedContent,
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.content).toBe(updatedContent);
        expect(response.body.data.steps).toHaveLength(2);
        expect(response.body.data.version).toBe(2);
      });

      it('should return 404 for non-existent plan', async () => {
        const response = await request(app)
          .put('/api/v1/action-plans/non-existent-id')
          .query({ listId: testList.id, taskId: testTask.id })
          .send({
            content: '1. Updated step',
          })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('NOT_FOUND');
      });
    });
  });

  describe('Notes Endpoints', () => {
    describe('GET /api/v1/notes/task/:taskId', () => {
      it('should get empty notes for task without notes', async () => {
        const response = await request(app)
          .get(`/api/v1/notes/task/${testTask.id}`)
          .query({ listId: testList.id })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.notes).toEqual([]);
        expect(response.body.data.stats).toBeDefined();
        expect(response.body.data.stats.total).toBe(0);
      });

      it('should get notes for task with notes', async () => {
        // Add notes first
        await request(app)
          .post(`/api/v1/notes/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            content: 'Technical note about implementation',
            type: 'technical',
          })
          .expect(201);

        await request(app)
          .post(`/api/v1/notes/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            content: 'Decision to use approach A over B',
            type: 'decision',
          })
          .expect(201);

        const response = await request(app)
          .get(`/api/v1/notes/task/${testTask.id}`)
          .query({ listId: testList.id })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.notes).toHaveLength(2);
        expect(response.body.data.stats.total).toBe(2);
        expect(response.body.data.stats.byType.technical).toBe(1);
        expect(response.body.data.stats.byType.decision).toBe(1);
      });
    });

    describe('POST /api/v1/notes/task/:taskId', () => {
      it('should add technical note to task', async () => {
        const response = await request(app)
          .post(`/api/v1/notes/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            content: 'Using async/await for better readability',
            type: 'technical',
            author: 'test-user',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBeDefined();
        expect(response.body.data.content).toBe('Using async/await for better readability');
        expect(response.body.data.type).toBe('technical');
        expect(response.body.data.author).toBe('test-user');
        expect(response.body.data.createdAt).toBeDefined();
      });

      it('should add decision note to task', async () => {
        const response = await request(app)
          .post(`/api/v1/notes/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            content: 'Decided to use PostgreSQL over MongoDB for better transaction support',
            type: 'decision',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.type).toBe('decision');
      });

      it('should add learning note to task', async () => {
        const response = await request(app)
          .post(`/api/v1/notes/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            content: 'Learned that connection pooling significantly improves performance',
            type: 'learning',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.type).toBe('learning');
      });

      it('should add general note to task', async () => {
        const response = await request(app)
          .post(`/api/v1/notes/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            content: 'General observation about the task',
            type: 'general',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.type).toBe('general');
      });

      it('should validate note content length', async () => {
        const response = await request(app)
          .post(`/api/v1/notes/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            content: 'ab', // Too short
            type: 'general',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should validate note type', async () => {
        const response = await request(app)
          .post(`/api/v1/notes/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            content: 'Valid content',
            type: 'invalid-type',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('VALIDATION_ERROR');
      });

      it('should reject note content over 10000 characters', async () => {
        const longContent = 'a'.repeat(10001);
        const response = await request(app)
          .post(`/api/v1/notes/task/${testTask.id}`)
          .query({ listId: testList.id })
          .send({
            content: longContent,
            type: 'general',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle archived list for exit criteria', async () => {
      // Archive the list
      await todoListManager.deleteTodoList({
        listId: testList.id,
        permanent: false,
      });

      // Archived lists are not accessible, so we get 404
      const response = await request(app)
        .post(`/api/v1/exit-criteria/task/${testTask.id}`)
        .query({ listId: testList.id })
        .send({
          description: 'Test criteria',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle archived list for action plans', async () => {
      // Archive the list
      await todoListManager.deleteTodoList({
        listId: testList.id,
        permanent: false,
      });

      // Archived lists are not accessible, so we get 404
      const response = await request(app)
        .post(`/api/v1/action-plans/task/${testTask.id}`)
        .query({ listId: testList.id })
        .send({
          content: '1. Test step',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle archived list for notes', async () => {
      // Archive the list
      await todoListManager.deleteTodoList({
        listId: testList.id,
        permanent: false,
      });

      // Archived lists are not accessible, so we get 404
      const response = await request(app)
        .post(`/api/v1/notes/task/${testTask.id}`)
        .query({ listId: testList.id })
        .send({
          content: 'Test note',
          type: 'general',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });
});
