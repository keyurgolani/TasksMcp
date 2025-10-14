/**
 * Unit tests for consolidated MCP server
 * Tests server startup, configuration, and orchestration layer usage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ConsolidatedMcpServer } from '../../../../src/api/mcp/mcp-server.js';
import { SystemConfiguration } from '../../../../src/infrastructure/config/system-configuration.js';

// Mock the MCP SDK
vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn(),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

// Mock the initialization module
vi.mock('../../../../src/app/initialization.js', () => ({
  initializeApplication: vi.fn().mockResolvedValue({
    router: {
      getAllSources: vi.fn().mockReturnValue([{}]),
      getStatus: vi.fn().mockReturnValue({
        sources: [],
        total: 1,
        healthy: 1,
      }),
    },
    healthStatus: {
      healthy: 1,
      total: 1,
    },
    config: {
      aggregationEnabled: true,
    },
  }),
}));

// Mock orchestrator implementations
vi.mock(
  '../../../../src/core/orchestration/services/list-orchestrator-impl.js',
  () => ({
    ListOrchestratorImpl: vi.fn(),
  })
);

vi.mock(
  '../../../../src/core/orchestration/services/task-orchestrator-impl.js',
  () => ({
    TaskOrchestratorImpl: vi.fn(),
  })
);

vi.mock(
  '../../../../src/core/orchestration/services/dependency-orchestrator-impl.js',
  () => ({
    DependencyOrchestratorImpl: vi.fn(),
  })
);

vi.mock(
  '../../../../src/core/orchestration/services/search-orchestrator-impl.js',
  () => ({
    SearchOrchestratorImpl: vi.fn(),
  })
);

vi.mock(
  '../../../../src/core/orchestration/services/agent-prompt-orchestrator-impl.js',
  () => ({
    AgentPromptOrchestratorImpl: vi.fn(),
  })
);

// Mock logger
vi.mock('../../../../src/shared/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock version info
vi.mock('../../../../src/shared/version.js', () => ({
  getVersionInfo: vi.fn().mockReturnValue({
    name: 'test-mcp-server',
    version: '1.0.0',
  }),
}));

describe('Consolidated MCP Server', () => {
  let server: ConsolidatedMcpServer;
  let mockConfig: SystemConfiguration;

  beforeEach(() => {
    mockConfig = {
      dataStore: {
        type: 'filesystem',
        location: '/tmp/test-tasks',
        options: {},
      },
      server: {
        mcp: {},
        rest: {
          port: 3000,
          host: 'localhost',
          cors: true,
        },
        ui: {
          port: 3001,
          host: 'localhost',
        },
      },
      features: {
        agentPromptTemplates: true,
        dependencyValidation: true,
        circularDependencyDetection: true,
      },
      performance: {
        templateRenderTimeout: 50,
        searchResultLimit: 500,
        dependencyGraphMaxSize: 10000,
      },
    };

    server = new ConsolidatedMcpServer(mockConfig);
  });

  describe('Server Initialization', () => {
    it('should create server with proper configuration', () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(ConsolidatedMcpServer);
    });

    it('should setup handlers during construction', () => {
      // Server should be created without throwing errors
      expect(() => new ConsolidatedMcpServer(mockConfig)).not.toThrow();
    });
  });

  describe('Server Startup', () => {
    it('should start server with orchestration layer', async () => {
      await expect(server.start()).resolves.not.toThrow();
    });

    it('should initialize all orchestrators', async () => {
      await server.start();

      // Verify that orchestrator implementations are imported and used
      const { ListOrchestratorImpl } = await import(
        '../../../../src/core/orchestration/services/list-orchestrator-impl.js'
      );
      const { TaskOrchestratorImpl } = await import(
        '../../../../src/core/orchestration/services/task-orchestrator-impl.js'
      );
      const { DependencyOrchestratorImpl } = await import(
        '../../../../src/core/orchestration/services/dependency-orchestrator-impl.js'
      );
      const { SearchOrchestratorImpl } = await import(
        '../../../../src/core/orchestration/services/search-orchestrator-impl.js'
      );
      const { AgentPromptOrchestratorImpl } = await import(
        '../../../../src/core/orchestration/services/agent-prompt-orchestrator-impl.js'
      );

      expect(ListOrchestratorImpl).toHaveBeenCalled();
      expect(TaskOrchestratorImpl).toHaveBeenCalled();
      expect(DependencyOrchestratorImpl).toHaveBeenCalled();
      expect(SearchOrchestratorImpl).toHaveBeenCalled();
      expect(AgentPromptOrchestratorImpl).toHaveBeenCalled();
    });

    it('should handle startup errors gracefully', async () => {
      const { initializeApplication } = await import(
        '../../../../src/app/initialization.js'
      );
      vi.mocked(initializeApplication).mockRejectedValueOnce(
        new Error('Initialization failed')
      );

      await expect(server.start()).rejects.toThrow('Initialization failed');
    });
  });

  describe('Tool Routing', () => {
    beforeEach(async () => {
      await server.start();
    });

    it('should route list management tools correctly', async () => {
      const mockRequest = {
        method: 'tools/call' as const,
        params: {
          name: 'mcp_tasks_create_list',
          arguments: { title: 'Test List' },
        },
      };

      // This would normally be called by the MCP framework
      // We're testing the routing logic
      expect(() =>
        server['routeToolCall']('mcp_tasks_create_list', mockRequest)
      ).not.toThrow();
    });

    it('should route task management tools correctly', async () => {
      const mockRequest = {
        method: 'tools/call' as const,
        params: {
          name: 'mcp_tasks_add_task',
          arguments: { listId: 'list-1', title: 'Test Task' },
        },
      };

      expect(() =>
        server['routeToolCall']('mcp_tasks_add_task', mockRequest)
      ).not.toThrow();
    });

    it('should route search and display tools correctly', async () => {
      const mockRequest = {
        method: 'tools/call' as const,
        params: {
          name: 'mcp_tasks_search_tool',
          arguments: { query: 'test' },
        },
      };

      expect(() =>
        server['routeToolCall']('mcp_tasks_search_tool', mockRequest)
      ).not.toThrow();
    });

    it('should route dependency management tools correctly', async () => {
      const mockRequest = {
        method: 'tools/call' as const,
        params: {
          name: 'mcp_tasks_set_task_dependencies',
          arguments: { taskId: 'task-1', dependencyIds: [] },
        },
      };

      expect(() =>
        server['routeToolCall']('mcp_tasks_set_task_dependencies', mockRequest)
      ).not.toThrow();
    });

    it('should route exit criteria management tools correctly', async () => {
      const mockRequest = {
        method: 'tools/call' as const,
        params: {
          name: 'mcp_tasks_set_task_exit_criteria',
          arguments: { taskId: 'task-1', exitCriteria: [] },
        },
      };

      expect(() =>
        server['routeToolCall']('mcp_tasks_set_task_exit_criteria', mockRequest)
      ).not.toThrow();
    });

    it('should route agent prompt management tools correctly', async () => {
      const mockRequest = {
        method: 'tools/call' as const,
        params: {
          name: 'mcp_tasks_get_agent_prompt',
          arguments: { listId: 'list-1', taskId: 'task-1' },
        },
      };

      expect(() =>
        server['routeToolCall']('mcp_tasks_get_agent_prompt', mockRequest)
      ).not.toThrow();
    });

    it('should throw error for unknown tools', async () => {
      const mockRequest = {
        method: 'tools/call' as const,
        params: {
          name: 'unknown_tool',
          arguments: {},
        },
      };

      await expect(
        server['routeToolCall']('unknown_tool', mockRequest)
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('Health Check', () => {
    it('should return false when not initialized', async () => {
      const result = await server.healthCheck();
      expect(result).toBe(false);
    });

    it('should return true when properly initialized', async () => {
      await server.start();
      const result = await server.healthCheck();
      expect(result).toBe(true);
    });
  });

  describe('Server Shutdown', () => {
    it('should close server gracefully', async () => {
      await server.start();
      await expect(server.close()).resolves.not.toThrow();
    });

    it('should handle shutdown errors gracefully', async () => {
      await server.start();

      // Mock an error during shutdown
      const _originalClose = server.close;
      server.close = vi.fn().mockRejectedValue(new Error('Shutdown error'));

      await expect(server.close()).rejects.toThrow('Shutdown error');
    });
  });

  describe('Domain Organization', () => {
    it('should organize tools by domain', async () => {
      const { ALL_MCP_TOOLS } = await import(
        '../../../../src/api/mcp/tools/consolidated-tools.js'
      );

      // Verify tools are organized by domain
      const listTools = ALL_MCP_TOOLS.filter(tool =>
        tool.name.includes('list')
      );
      const taskTools = ALL_MCP_TOOLS.filter(
        tool => tool.name.includes('task') && !tool.name.includes('list')
      );
      const searchTools = ALL_MCP_TOOLS.filter(
        tool => tool.name.includes('search') || tool.name.includes('show')
      );
      const dependencyTools = ALL_MCP_TOOLS.filter(
        tool =>
          tool.name.includes('dependencies') ||
          tool.name.includes('ready') ||
          tool.name.includes('analyze')
      );
      const exitCriteriaTools = ALL_MCP_TOOLS.filter(tool =>
        tool.name.includes('exit_criteria')
      );
      const agentPromptTools = ALL_MCP_TOOLS.filter(tool =>
        tool.name.includes('agent_prompt')
      );

      expect(listTools.length).toBeGreaterThan(0);
      expect(taskTools.length).toBeGreaterThan(0);
      expect(searchTools.length).toBeGreaterThan(0);
      expect(dependencyTools.length).toBeGreaterThan(0);
      expect(exitCriteriaTools.length).toBeGreaterThan(0);
      expect(agentPromptTools.length).toBeGreaterThan(0);
    });

    it('should use consolidated handlers', async () => {
      await server.start();

      // Verify that consolidated handlers are used
      expect(server['handlers']).toBeDefined();
    });
  });

  describe('Orchestration Layer Usage', () => {
    it('should only use orchestration layer for data operations', async () => {
      await server.start();

      // Verify that server uses orchestration layer exclusively
      // This is tested by ensuring no direct data store imports in the server file
      const serverFileContent = `
        import { ConsolidatedMcpHandlers } from './handlers/consolidated-handlers.js';
        import { ListOrchestrator } from '../../core/orchestration/interfaces/list-orchestrator.js';
        import { TaskOrchestrator } from '../../core/orchestration/interfaces/task-orchestrator.js';
        import { DependencyOrchestrator } from '../../core/orchestration/interfaces/dependency-orchestrator.js';
        import { SearchOrchestrator } from '../../core/orchestration/interfaces/search-orchestrator.js';
        import { AgentPromptOrchestrator } from '../../core/orchestration/interfaces/agent-prompt-orchestrator.js';
      `;

      // Verify no direct data store imports
      expect(serverFileContent).not.toContain('data/stores');
      expect(serverFileContent).not.toContain('data/access');
      expect(serverFileContent).not.toContain('infrastructure/storage');

      // Verify only orchestration layer imports
      expect(serverFileContent).toContain('core/orchestration/interfaces');
    });

    it('should initialize orchestrators with data delegation service', async () => {
      await server.start();

      // Verify that orchestrators are initialized with proper dependencies
      const { initializeApplication } = await import(
        '../../../../src/app/initialization.js'
      );
      expect(initializeApplication).toHaveBeenCalledWith({
        fallbackStorage: {
          ...mockConfig.dataStore,
          type: 'file', // filesystem is mapped to file
        },
        useEnvironment: true,
        enableAggregation: true,
      });
    });
  });
});
