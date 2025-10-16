/**
 * Integration tests for REST API server
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { RestApiServer } from '../../src/app/rest-api-server.js';
import { TaskListManager } from '../../src/domain/lists/task-list-manager.js';
import { ActionPlanManager } from '../../src/domain/tasks/action-plan-manager.js';
import { DependencyResolver } from '../../src/domain/tasks/dependency-manager.js';
import { ExitCriteriaManager } from '../../src/domain/tasks/exit-criteria-manager.js';
import { NotesManager } from '../../src/domain/tasks/notes-manager.js';
import { StorageFactory } from '../../src/infrastructure/storage/storage-factory.js';

import type { StorageBackend } from '../../src/shared/types/storage.js';

describe('REST API Server', () => {
  let server: RestApiServer;
  let storage: StorageBackend;
  let taskListManager: TaskListManager;
  let dependencyManager: DependencyResolver;
  let exitCriteriaManager: ExitCriteriaManager;
  let actionPlanManager: ActionPlanManager;
  let notesManager: NotesManager;

  beforeAll(async () => {
    try {
      // Initialize storage with memory backend for testing
      storage = await StorageFactory.createStorage({
        type: 'memory',
      });
      await storage.initialize();

      // Initialize managers
      taskListManager = new TaskListManager(storage);
      dependencyManager = new DependencyResolver();
      exitCriteriaManager = new ExitCriteriaManager(storage);
      actionPlanManager = new ActionPlanManager(storage);
      notesManager = new NotesManager(storage);

      // Create server
      server = new RestApiServer(
        {
          port: 3099, // Use different port for testing
          corsOrigins: ['*'],
        },
        taskListManager,
        dependencyManager,
        exitCriteriaManager,
        actionPlanManager,
        notesManager
      );

      // Initialize routes before starting
      await server.initialize();
      await server.start();

      // Wait a bit for server to be fully ready
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Failed to start server in beforeAll:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      if (server) {
        await server.stop();
      }
      // Memory storage doesn't have cleanup method
    } catch (error) {
      console.error('Error stopping server:', error);
    }
  });

  it('should start the server successfully', () => {
    expect(server).toBeDefined();
    expect(server.getConfig().port).toBe(3099);
    expect(server.isRunning()).toBe(true);
  });

  it('should respond to health check endpoint', async () => {
    const response = await fetch('http://localhost:3099/health');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('checks');
  });

  it('should respond to API info endpoint', async () => {
    const response = await fetch('http://localhost:3099/api');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('endpoints');
  });

  it('should respond to API v1 endpoint', async () => {
    const response = await fetch('http://localhost:3099/api/v1');
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('endpoints');
  });

  it('should return 404 for undefined routes', async () => {
    const response = await fetch('http://localhost:3099/nonexistent');
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('error');
  });

  it('should include request ID in response headers', async () => {
    const response = await fetch('http://localhost:3099/health');
    expect(response.headers.has('x-request-id')).toBe(true);
    expect(response.headers.get('x-request-id')).toBeTruthy();
  });
});
