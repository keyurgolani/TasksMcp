/**
 * Integration tests for advanced feature API endpoints
 * Tests exit criteria, action plans, and notes endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { RestApiServer } from '../../src/app/rest-api-server.js';
import { TodoListManager } from '../../src/domain/lists/todo-list-manager.js';
import { ActionPlanManager } from '../../src/domain/tasks/action-plan-manager.js';
import { DependencyResolver } from '../../src/domain/tasks/dependency-manager.js';
import { ExitCriteriaManager } from '../../src/domain/tasks/exit-criteria-manager.js';
import { NotesManager } from '../../src/domain/tasks/notes-manager.js';
import { MemoryStorageBackend } from '../../src/infrastructure/storage/memory-storage.js';

import type { ApiConfig } from '../../src/shared/types/api.js';

describe('Advanced Features API', () => {
  let server: RestApiServer;
  let baseUrl: string;
  let testListId: string;
  let testTaskId: string;

  beforeAll(async () => {
    // Create in-memory storage
    const storage = new MemoryStorageBackend();
    await storage.initialize();

    // Create repository
    const { TodoListRepositoryAdapter } = await import(
      '../../src/domain/repositories/todo-list-repository.adapter.js'
    );
    const repository = new TodoListRepositoryAdapter(storage);

    // Create managers
    const todoListManager = new TodoListManager(repository, storage);
    const dependencyResolver = new DependencyResolver(repository);
    const exitCriteriaManager = new ExitCriteriaManager(repository);
    const actionPlanManager = new ActionPlanManager(repository);
    const notesManager = new NotesManager(repository);

    // Create server with test configuration
    const config: Partial<ApiConfig> = {
      port: 3099, // Use different port for tests
      corsOrigins: ['*'],
      authEnabled: false,
    };

    server = new RestApiServer(
      config,
      todoListManager,
      dependencyResolver,
      exitCriteriaManager,
      actionPlanManager,
      notesManager
    );

    await server.initialize();
    await server.start();

    baseUrl = `http://localhost:${config.port}`;

    // Create a test list and task
    const listResponse = await fetch(`${baseUrl}/api/v1/lists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test List for Advanced Features',
        description: 'Test list',
      }),
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      throw new Error(
        `Failed to create test list: ${listResponse.status} - ${errorText}`
      );
    }

    const listData = await listResponse.json();
    if (!listData.data || !listData.data.id) {
      throw new Error(`Invalid list response: ${JSON.stringify(listData)}`);
    }
    testListId = listData.data.id;

    const taskResponse = await fetch(`${baseUrl}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listId: testListId,
        title: 'Test Task',
        description: 'Test task for advanced features',
      }),
    });
    const taskData = await taskResponse.json();
    testTaskId = taskData.data.id;
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Exit Criteria Endpoints', () => {
    it('should get task exit criteria (initially empty)', async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/exit-criteria/task/${testTaskId}?listId=${testListId}`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.exitCriteria).toEqual([]);
      // Exit criteria should be empty array for new task
      expect(Array.isArray(data.data.exitCriteria)).toBe(true);
    });

    it('should add exit criteria to task', async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/exit-criteria/task/${testTaskId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listId: testListId,
            description: 'All unit tests pass',
            order: 0,
          }),
        }
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.description).toBe('All unit tests pass');
      expect(data.data.isMet).toBe(false);
      expect(data.data.id).toBeDefined();
    });

    it('should update exit criteria', async () => {
      // First, get the criteria ID
      const getResponse = await fetch(
        `${baseUrl}/api/v1/exit-criteria/task/${testTaskId}?listId=${testListId}`
      );
      const getData = await getResponse.json();
      const criteriaId = getData.data.exitCriteria[0].id;

      // Update the criteria
      const response = await fetch(
        `${baseUrl}/api/v1/exit-criteria/${criteriaId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listId: testListId,
            taskId: testTaskId,
            isMet: true,
            notes: 'All tests passing',
          }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.isMet).toBe(true);
      expect(data.data.notes).toBe('All tests passing');
      expect(data.data.metAt).toBeDefined();
    });
  });

  describe('Action Plan Endpoints', () => {
    it('should create action plan for task', async () => {
      const actionPlanContent = `
1. Set up test environment
2. Write unit tests
3. Run tests
4. Fix any failures
5. Commit changes
      `.trim();

      const response = await fetch(
        `${baseUrl}/api/v1/action-plans/task/${testTaskId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listId: testListId,
            content: actionPlanContent,
          }),
        }
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.content).toBe(actionPlanContent);
      expect(data.data.steps).toBeDefined();
      expect(data.data.steps.length).toBeGreaterThan(0);
      expect(data.data.version).toBe(1);
    });

    it('should get action plan for task', async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/action-plans/task/${testTaskId}?listId=${testListId}`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.actionPlan).toBeDefined();
      expect(data.data.actionPlan).toBeDefined();
      expect(data.data.actionPlan.steps).toBeInstanceOf(Array);
      expect(data.data.actionPlan.steps.length).toBeGreaterThan(0);
    });

    it('should update action plan', async () => {
      // First, get the plan ID
      const getResponse = await fetch(
        `${baseUrl}/api/v1/action-plans/task/${testTaskId}?listId=${testListId}`
      );
      const getData = await getResponse.json();
      const planId = getData.data.actionPlan.id;

      const updatedContent = `
1. Set up test environment
2. Write comprehensive unit tests
3. Run tests with coverage
4. Fix any failures
5. Review and commit changes
      `.trim();

      const response = await fetch(`${baseUrl}/api/v1/action-plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: testListId,
          taskId: testTaskId,
          content: updatedContent,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.content).toBe(updatedContent);
      expect(data.data.version).toBe(2);
    });

    it('should complete action plan step', async () => {
      // First, get the plan and step IDs
      const getResponse = await fetch(
        `${baseUrl}/api/v1/action-plans/task/${testTaskId}?listId=${testListId}`
      );
      const getData = await getResponse.json();
      const planId = getData.data.actionPlan.id;
      const stepId = getData.data.actionPlan.steps[0].id;

      const response = await fetch(
        `${baseUrl}/api/v1/action-plans/${planId}/steps/${stepId}/complete?listId=${testListId}&taskId=${testTaskId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notes: 'Environment set up successfully',
          }),
        }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.step.status).toBe('completed');
      expect(data.data.step.notes).toBe('Environment set up successfully');
      expect(data.data.step.completedAt).toBeDefined();
    });
  });

  describe('Notes Endpoints', () => {
    it('should get task notes (initially empty)', async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/notes/task/${testTaskId}?listId=${testListId}`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.notes).toEqual([]);
      // Notes should be empty array for new task
      expect(Array.isArray(data.data.notes)).toBe(true);
    });

    it('should add note to task', async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/notes/task/${testTaskId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listId: testListId,
            content: 'This is a technical note about the implementation',
            type: 'technical',
            author: 'test-user',
          }),
        }
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.content).toBe(
        'This is a technical note about the implementation'
      );
      expect(data.data.type).toBe('technical');
      expect(data.data.author).toBe('test-user');
      expect(data.data.id).toBeDefined();
    });

    it('should get task notes with statistics', async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/notes/task/${testTaskId}?listId=${testListId}`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.notes.length).toBe(1);
      expect(data.data.notes[0].type).toBe('technical');
      expect(data.data.notes[0].content).toBe(
        'This is a technical note about the implementation'
      );
    });

    it('should filter notes by type', async () => {
      // Add another note of different type
      await fetch(`${baseUrl}/api/v1/notes/task/${testTaskId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listId: testListId,
          content: 'This is a general note',
          type: 'general',
        }),
      });

      // Filter by technical type
      const response = await fetch(
        `${baseUrl}/api/v1/notes/task/${testTaskId}?listId=${testListId}&type=technical`
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.notes.length).toBe(1);
      expect(data.data.notes[0].type).toBe('technical');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent task', async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/exit-criteria/task/00000000-0000-0000-0000-000000000000?listId=${testListId}`
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid exit criteria description', async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/exit-criteria/task/${testTaskId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            listId: testListId,
            description: '', // Empty description
          }),
        }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('should return 400 for missing listId query parameter', async () => {
      const response = await fetch(
        `${baseUrl}/api/v1/exit-criteria/task/${testTaskId}` // Missing listId
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });
});
