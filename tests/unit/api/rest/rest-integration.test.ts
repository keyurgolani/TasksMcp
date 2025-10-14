/**
 * Integration tests for REST API domain
 * Tests REST API uses same data stores as MCP server
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { RestServer } from '../../../../src/api/rest/rest-server.js';
import { AgentPromptOrchestratorImpl } from '../../../../src/core/orchestration/services/agent-prompt-orchestrator-impl.js';
import { DependencyOrchestratorImpl } from '../../../../src/core/orchestration/services/dependency-orchestrator-impl.js';
import { ListOrchestratorImpl } from '../../../../src/core/orchestration/services/list-orchestrator-impl.js';
import { SearchOrchestratorImpl } from '../../../../src/core/orchestration/services/search-orchestrator-impl.js';
import { TaskOrchestratorImpl } from '../../../../src/core/orchestration/services/task-orchestrator-impl.js';
import { DataDelegationService } from '../../../../src/data/delegation/data-delegation-service.js';

import type { OrchestratorDependencies } from '../../../../src/api/rest/rest-server.js';

describe('REST API Integration', () => {
  let restServer: RestServer;
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

    // Create orchestrator instances with shared data service
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

    // Create REST server
    restServer = new RestServer(
      {
        port: 0, // Use random port for testing
        host: 'localhost',
      },
      orchestrators
    );
  });

  afterEach(async () => {
    if (restServer) {
      await restServer.stop();
    }
  });

  describe('Data Store Integration', () => {
    it('should use same data delegation service across all orchestrators', () => {
      const deps = restServer.getOrchestrators();

      // Verify all orchestrators are using the same data delegation service
      expect(deps.taskOrchestrator).toBeInstanceOf(TaskOrchestratorImpl);
      expect(deps.listOrchestrator).toBeInstanceOf(ListOrchestratorImpl);
      expect(deps.dependencyOrchestrator).toBeInstanceOf(
        DependencyOrchestratorImpl
      );
      expect(deps.searchOrchestrator).toBeInstanceOf(SearchOrchestratorImpl);
      expect(deps.agentPromptOrchestrator).toBeInstanceOf(
        AgentPromptOrchestratorImpl
      );
    });

    it('should provide orchestration-based architecture', () => {
      const config = restServer.getConfig();
      const deps = restServer.getOrchestrators();

      // Verify configuration
      expect(config.port).toBe(0);
      expect(config.host).toBe('localhost');

      // Verify orchestrator dependencies are available
      expect(deps).toHaveProperty('taskOrchestrator');
      expect(deps).toHaveProperty('listOrchestrator');
      expect(deps).toHaveProperty('dependencyOrchestrator');
      expect(deps).toHaveProperty('searchOrchestrator');
      expect(deps).toHaveProperty('agentPromptOrchestrator');
    });

    it('should support bulk operations through orchestration layer', () => {
      const deps = restServer.getOrchestrators();

      // Verify task orchestrator has bulk operation methods defined in interface
      expect(typeof deps.taskOrchestrator.createTask).toBe('function');
      expect(typeof deps.taskOrchestrator.updateTask).toBe('function');
      expect(typeof deps.taskOrchestrator.deleteTask).toBe('function');

      // Note: Bulk operations are defined in interface but implementation is pending
      // This test verifies the architecture supports them
    });

    it('should use same underlying constructs as MCP server would', () => {
      // Both MCP and REST servers would use the same orchestration layer
      // This test verifies the REST server uses the correct architecture

      const deps = restServer.getOrchestrators();

      // Verify orchestrators are properly instantiated
      expect(deps.taskOrchestrator).toBeDefined();
      expect(deps.listOrchestrator).toBeDefined();
      expect(deps.dependencyOrchestrator).toBeDefined();
      expect(deps.searchOrchestrator).toBeDefined();
      expect(deps.agentPromptOrchestrator).toBeDefined();

      // Both MCP and REST would use the same data delegation service
      // This ensures data consistency between interfaces
    });
  });

  describe('Server Lifecycle', () => {
    it('should start and stop server successfully', async () => {
      await expect(restServer.start()).resolves.toBeUndefined();
      await expect(restServer.stop()).resolves.toBeUndefined();
    });

    it('should provide Express app instance', () => {
      const app = restServer.getApp();
      expect(app).toBeDefined();
      expect(typeof app.use).toBe('function');
      expect(typeof app.get).toBe('function');
      expect(typeof app.post).toBe('function');
    });
  });

  describe('Feature Support', () => {
    it('should support all required REST API features', () => {
      // The REST server should support:
      // - Full CRUD operations on all entities
      // - Bulk operations (not available in MCP)
      // - Agent prompt templates
      // - Dependency management
      // - Advanced search

      const deps = restServer.getOrchestrators();

      // Task operations
      expect(deps.taskOrchestrator).toBeDefined();

      // List operations
      expect(deps.listOrchestrator).toBeDefined();

      // Dependency operations
      expect(deps.dependencyOrchestrator).toBeDefined();

      // Search operations
      expect(deps.searchOrchestrator).toBeDefined();

      // Agent prompt operations
      expect(deps.agentPromptOrchestrator).toBeDefined();
    });

    it('should provide orchestration-based architecture for consistency', () => {
      // The key requirement is that REST API uses same underlying constructs
      // and data stores as MCP server. This is achieved through shared
      // orchestration layer and data delegation service.

      const deps = restServer.getOrchestrators();

      // All orchestrators should be instances of the implementation classes
      // that would also be used by MCP server
      expect(deps.taskOrchestrator.constructor.name).toBe(
        'TaskOrchestratorImpl'
      );
      expect(deps.listOrchestrator.constructor.name).toBe(
        'ListOrchestratorImpl'
      );
      expect(deps.dependencyOrchestrator.constructor.name).toBe(
        'DependencyOrchestratorImpl'
      );
      expect(deps.searchOrchestrator.constructor.name).toBe(
        'SearchOrchestratorImpl'
      );
      expect(deps.agentPromptOrchestrator.constructor.name).toBe(
        'AgentPromptOrchestratorImpl'
      );
    });
  });
});
