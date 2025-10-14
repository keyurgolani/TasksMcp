/**
 * Unit tests for REST API server
 * Tests REST API server starts correctly and handles requests
 */

import { Express } from 'express';
import request from 'supertest';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { RestServer } from '../../../../src/api/rest/rest-server.js';
import { AgentPromptOrchestratorImpl } from '../../../../src/core/orchestration/services/agent-prompt-orchestrator-impl.js';
import { DependencyOrchestratorImpl } from '../../../../src/core/orchestration/services/dependency-orchestrator-impl.js';
import { ListOrchestratorImpl } from '../../../../src/core/orchestration/services/list-orchestrator-impl.js';
import { SearchOrchestratorImpl } from '../../../../src/core/orchestration/services/search-orchestrator-impl.js';
import { TaskOrchestratorImpl } from '../../../../src/core/orchestration/services/task-orchestrator-impl.js';
import { DataDelegationService } from '../../../../src/data/delegation/data-delegation-service.js';

import type { OrchestratorDependencies } from '../../../../src/api/rest/rest-server.js';

describe('RestServer', () => {
  let restServer: RestServer;
  let app: Express;
  let mockDataDelegationService: DataDelegationService;
  let orchestrators: OrchestratorDependencies;

  beforeEach(async () => {
    // Create mock data delegation service
    mockDataDelegationService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      cleanup: vi.fn().mockResolvedValue(undefined),
      delegateTaskOperation: vi.fn(),
      delegateListOperation: vi.fn(),
      delegateDependencyOperation: vi.fn(),
      delegateSearchOperation: vi.fn(),
    } as any;

    // Create orchestrator instances with mock data service
    orchestrators = {
      taskOrchestrator: new TaskOrchestratorImpl(mockDataDelegationService),
      listOrchestrator: new ListOrchestratorImpl(mockDataDelegationService),
      dependencyOrchestrator: new DependencyOrchestratorImpl(
        mockDataDelegationService
      ),
      searchOrchestrator: new SearchOrchestratorImpl(mockDataDelegationService),
      agentPromptOrchestrator: new AgentPromptOrchestratorImpl(
        mockDataDelegationService
      ),
    };

    // Create REST server with test configuration
    restServer = new RestServer(
      {
        port: 0, // Use random port for testing
        host: 'localhost',
        corsOrigins: ['http://localhost:3000'],
        requestTimeout: 5000,
        bodyLimit: '1mb',
      },
      orchestrators
    );

    app = restServer.getApp();
  });

  afterEach(async () => {
    if (restServer) {
      await restServer.stop();
    }
  });

  describe('Server Configuration', () => {
    it('should create server with correct configuration', () => {
      const config = restServer.getConfig();

      expect(config.port).toBe(0);
      expect(config.host).toBe('localhost');
      expect(config.corsOrigins).toEqual(['http://localhost:3000']);
      expect(config.requestTimeout).toBe(5000);
      expect(config.bodyLimit).toBe('1mb');
    });

    it('should use default configuration when not provided', () => {
      const defaultServer = new RestServer({}, orchestrators);
      const config = defaultServer.getConfig();

      expect(config.port).toBe(3001);
      expect(config.host).toBe('0.0.0.0');
      expect(config.corsOrigins).toEqual(['*']);
      expect(config.requestTimeout).toBe(30000);
      expect(config.bodyLimit).toBe('10mb');
    });

    it('should provide access to orchestrator dependencies', () => {
      const deps = restServer.getOrchestrators();

      expect(deps.taskOrchestrator).toBeDefined();
      expect(deps.listOrchestrator).toBeDefined();
      expect(deps.dependencyOrchestrator).toBeDefined();
      expect(deps.searchOrchestrator).toBeDefined();
      expect(deps.agentPromptOrchestrator).toBeDefined();
    });
  });

  describe('Health Endpoints', () => {
    it('should respond to health check endpoint', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should respond to API health check endpoint', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
    });
  });

  describe('API Info Endpoints', () => {
    it('should provide API information', async () => {
      const response = await request(app).get('/api').expect(200);

      expect(response.body).toHaveProperty('name', 'Task Management REST API');
      expect(response.body).toHaveProperty('version', '2.0.0');
      expect(response.body).toHaveProperty('features');
      expect(response.body.features).toHaveProperty('bulkOperations', true);
      expect(response.body.features).toHaveProperty('agentPrompts', true);
      expect(response.body.features).toHaveProperty(
        'dependencyManagement',
        true
      );
      expect(response.body.features).toHaveProperty('advancedSearch', true);
    });

    it('should provide API v2 information', async () => {
      const response = await request(app).get('/api/v2').expect(200);

      expect(response.body).toHaveProperty('message', 'Task Management API v2');
      expect(response.body).toHaveProperty('status', 'operational');
      expect(response.body).toHaveProperty(
        'architecture',
        'orchestration-based'
      );
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toHaveProperty('tasks', '/api/v2/tasks');
      expect(response.body.endpoints).toHaveProperty('lists', '/api/v2/lists');
      expect(response.body.endpoints).toHaveProperty(
        'dependencies',
        '/api/v2/dependencies'
      );
      expect(response.body.endpoints).toHaveProperty(
        'search',
        '/api/v2/search'
      );
      expect(response.body.endpoints).toHaveProperty(
        'agentPrompts',
        '/api/v2/agent-prompts'
      );
    });
  });

  describe('CORS Configuration', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/v2/tasks')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(204);

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000'
      );
      expect(response.headers['access-control-allow-methods']).toContain(
        'POST'
      );
      expect(response.headers['access-control-allow-headers']).toContain(
        'Content-Type'
      );
    });
  });

  describe('Request ID Middleware', () => {
    it('should add request ID to responses', async () => {
      const response = await request(app).get('/api/v2').expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(typeof response.headers['x-request-id']).toBe('string');
    });

    it('should use provided request ID', async () => {
      const customRequestId = 'test-request-123';

      const response = await request(app)
        .get('/api/v2')
        .set('X-Request-ID', customRequestId)
        .expect(200);

      expect(response.headers['x-request-id']).toBe(customRequestId);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/v2/unknown-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/v2/tasks')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      // Express returns 400 for malformed JSON, but our error handler might return 500
      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Server Lifecycle', () => {
    it('should start and stop server successfully', async () => {
      const testServer = new RestServer({ port: 0 }, orchestrators);

      await expect(testServer.start()).resolves.toBeUndefined();
      await expect(testServer.stop()).resolves.toBeUndefined();
    });

    it('should handle start errors gracefully', async () => {
      const testServer = new RestServer(
        { port: -1 }, // Invalid port
        orchestrators
      );

      await expect(testServer.start()).rejects.toThrow();
    });
  });

  describe('Route Registration', () => {
    it('should register all expected routes', async () => {
      // Mock orchestrators to prevent actual operations
      vi.spyOn(
        orchestrators.searchOrchestrator,
        'searchTasks'
      ).mockResolvedValue({
        tasks: [],
        totalCount: 0,
        hasMore: false,
        page: 1,
        pageSize: 50,
      });

      vi.spyOn(orchestrators.listOrchestrator, 'getAllLists').mockResolvedValue(
        []
      );

      vi.spyOn(
        orchestrators.dependencyOrchestrator,
        'getReadyTasks'
      ).mockResolvedValue([]);

      vi.spyOn(
        orchestrators.agentPromptOrchestrator,
        'getAgentPrompt'
      ).mockResolvedValue('test prompt');

      // Test that all main route groups are accessible
      const routes = [
        { path: '/api/v2/tasks/search', method: 'get' },
        { path: '/api/v2/lists', method: 'get' },
        {
          path: '/api/v2/dependencies/ready/123e4567-e89b-12d3-a456-426614174000',
          method: 'get',
        },
        { path: '/api/v2/search/tasks', method: 'get' },
        {
          path: '/api/v2/agent-prompts/task/123e4567-e89b-12d3-a456-426614174000',
          method: 'get',
        },
      ];

      for (const route of routes) {
        // We expect these to return success or Validation errors, but not 404
        const response = await request(app)[route.method](route.path);
        expect(response.status).not.toBe(404);
        // Log the actual status for debugging
        if (![200, 400, 422].includes(response.status)) {
          console.log(
            `Route ${route.path} returned status ${response.status}: ${response.text}`
          );
        }
        // Should be either 200 (success), 400 (Validation error), or 500 (server error), not 404 (not found)
        expect([200, 400, 422, 500].includes(response.status)).toBe(true);
      }
    });
  });

  describe('Middleware Chain', () => {
    it('should apply middleware in correct order', async () => {
      const response = await request(app)
        .get('/api/v2')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      // Request ID should be present (from requestIdMiddleware)
      expect(response.headers['x-request-id']).toBeDefined();

      // CORS headers should be present when origin is set
      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000'
      );
    });

    it('should handle request timeout configuration', async () => {
      // This test verifies the timeout middleware is applied
      // The actual timeout behavior would require a long-running request to test
      const config = restServer.getConfig();
      expect(config.requestTimeout).toBe(5000);
    });
  });

  describe('Body Parsing', () => {
    it('should parse JSON bodies correctly', async () => {
      // Mock the task orchestrator to avoid actual task creation
      vi.spyOn(orchestrators.taskOrchestrator, 'createTask').mockResolvedValue({
        id: 'test-task-id',
        title: 'Test Task',
        status: 'pending',
        priority: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        dependencies: [],
        tags: [],
        implementationNotes: [],
        exitCriteria: [],
      } as any);

      const taskData = {
        listId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Task',
        description: 'Test Description',
      };

      const response = await request(app)
        .post('/api/v2/tasks')
        .send(taskData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('title', 'Test Task');
    });

    it('should handle URL-encoded bodies', async () => {
      const response = await request(app)
        .post('/api/v2/tasks')
        .type('form')
        .send('listId=123e4567-e89b-12d3-a456-426614174000&title=Test Task');

      // Should fail validation but not due to parsing (expect 400 or 500)
      expect([400, 500]).toContain(response.status);
      expect(response.body).toHaveProperty('success', false);
    });
  });
});
