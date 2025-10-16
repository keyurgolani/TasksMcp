/**
 * Consolidated MCP Server
 * Uses domain-organized tools and handlers with orchestration layer only
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';

import { AgentPromptOrchestrator } from '../../core/orchestration/interfaces/agent-prompt-orchestrator.js';
import { DependencyOrchestrator } from '../../core/orchestration/interfaces/dependency-orchestrator.js';
import { ListOrchestrator } from '../../core/orchestration/interfaces/list-orchestrator.js';
import { SearchOrchestrator } from '../../core/orchestration/interfaces/search-orchestrator.js';
import { TaskOrchestrator } from '../../core/orchestration/interfaces/task-orchestrator.js';
import { SystemConfiguration } from '../../infrastructure/config/system-configuration.js';
import { LOGGER } from '../../shared/utils/logger.js';
import { getVersionInfo } from '../../shared/version.js';

import { ConsolidatedMcpHandlers } from './handlers/consolidated-handlers.js';
import { ALL_MCP_TOOLS } from './tools/consolidated-tools.js';

import type { TaskList } from '../../shared/types/task.js';

/**
 * Consolidated MCP Server
 * Implements domain-driven architecture with orchestration layer
 */
export class ConsolidatedMcpServer {
  private readonly server: Server;
  private handlers: ConsolidatedMcpHandlers | null = null;
  private transport: StdioServerTransport | null = null;

  constructor(private config: SystemConfiguration) {
    const versionInfo = getVersionInfo();

    this.server = new Server(
      {
        name: versionInfo.name,
        version: versionInfo.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Sets up MCP request handlers using consolidated tools and handlers
   */
  private setupHandlers(): void {
    // Handler for listing available tools with methodology guidance
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      return {
        tools: ALL_MCP_TOOLS,
        _metadata: {
          bestPractices: {
            methodology:
              'Follow the three core principles for effective task management:',
            principles: [
              '🎯 PLAN AND REFLECT: Thoroughly investigate before action (use search_tool), reflect after completion',
              "🔍 USE TOOLS, DON'T GUESS: Always research using available tools rather than making assumptions",
              '✅ PERSIST UNTIL COMPLETE: Ensure all exit criteria are met before marking tasks complete',
            ],
            workflow: [
              '1. INVESTIGATE: Use search_tool to understand context',
              '2. PLAN: Create detailed action plans with specific exit criteria',
              '3. EXECUTE: Use update_task regularly to track progress',
              '4. VERIFY: Check all exit criteria before using complete_task',
              '5. REFLECT: Document learnings and outcomes',
            ],
            documentation:
              'Complete methodology guide: https://github.com/keyurgolani/task-list-mcp/blob/main/docs/guides/agent-best-practices.md',
          },
        },
      };
    });

    // Handler for executing tool calls with consolidated routing
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name } = request.params;
      const result = await this.routeToolCall(name, request);
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result),
          },
        ],
      };
    });
  }

  /**
   * Routes tool calls to appropriate consolidated handlers
   */
  private async routeToolCall(
    toolName: string,
    request: CallToolRequest
  ): Promise<unknown> {
    if (!this.handlers) {
      throw new Error('MCP Server not initialized. Call start() first.');
    }

    try {
      // Route to appropriate handler based on tool name
      switch (toolName) {
        // List Management Tools
        case 'mcp_tasks_create_list':
          return await this.handlers.createList(request);
        case 'mcp_tasks_get_list':
          return await this.handlers.getList(request);
        case 'mcp_tasks_list_all_lists':
          return await this.handlers.listAllLists(request);
        case 'mcp_tasks_delete_list':
          return await this.handlers.deleteList(request);
        case 'mcp_tasks_update_list_metadata':
          return await this.handlers.updateListMetadata(request);

        // Task Management Tools
        case 'mcp_tasks_add_task':
          return await this.handlers.addTask(request);
        case 'mcp_tasks_update_task':
          return await this.handlers.updateTask(request);
        case 'mcp_tasks_complete_task':
          return await this.handlers.completeTask(request);
        case 'mcp_tasks_remove_task':
          return await this.handlers.removeTask(request);
        case 'mcp_tasks_set_task_priority':
          return await this.handlers.setTaskPriority(request);
        case 'mcp_tasks_add_task_tags':
          return await this.handlers.addTaskTags(request);
        case 'mcp_tasks_remove_task_tags':
          return await this.handlers.removeTaskTags(request);
        case 'mcp_tasks_set_task_status':
          return await this.handlers.setTaskStatus(request);

        // Search and Display Tools
        case 'mcp_tasks_search_tool':
          return await this.handlers.searchTool(request);
        case 'mcp_tasks_show_tasks':
          return await this.handlers.showTasks(request);

        // Dependency Management Tools
        case 'mcp_tasks_set_task_dependencies':
          return await this.handlers.setTaskDependencies(request);
        case 'mcp_tasks_get_ready_tasks':
          return await this.handlers.getReadyTasks(request);
        case 'mcp_tasks_analyze_task_dependencies':
          return await this.handlers.analyzeTaskDependencies(request);

        // Exit Criteria Management Tools
        case 'mcp_tasks_set_task_exit_criteria':
          return await this.handlers.setTaskExitCriteria(request);
        case 'mcp_tasks_update_exit_criteria':
          return await this.handlers.updateExitCriteria(request);

        // Agent Prompt Management Tools
        case 'mcp_tasks_get_agent_prompt':
          return await this.handlers.getAgentPrompt(request);

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      LOGGER.error('Tool execution error', {
        toolName,
        error: error instanceof Error ? error.message : String(error),
        parameters: request.params.arguments,
      });
      throw error;
    }
  }

  /**
   * Starts the consolidated MCP server with orchestration layer
   */
  async start(): Promise<void> {
    try {
      // Initialize orchestration layer
      const orchestrators = await this.initializeOrchestrators();

      // Create consolidated handlers with orchestrators
      this.handlers = new ConsolidatedMcpHandlers(
        orchestrators.listOrchestrator,
        orchestrators.taskOrchestrator,
        orchestrators.dependencyOrchestrator,
        orchestrators.searchOrchestrator,
        orchestrators.agentPromptOrchestrator
      );

      // Use stdio transport for MCP communication
      this.transport = new StdioServerTransport();
      await this.server.connect(this.transport);

      LOGGER.info('Consolidated MCP Server started successfully', {
        toolsCount: ALL_MCP_TOOLS.length,
        domains: [
          'List Management',
          'Task Management',
          'Search & Display',
          'Dependency Management',
          'Exit Criteria Management',
          'Agent Prompt Management',
        ],
        transport: 'stdio',
      });
    } catch (error) {
      LOGGER.error('Failed to start Consolidated MCP Server', { error });
      throw error;
    }
  }

  /**
   * Initializes all orchestrators with proper dependencies
   */
  private async initializeOrchestrators(): Promise<{
    listOrchestrator: ListOrchestrator;
    taskOrchestrator: TaskOrchestrator;
    dependencyOrchestrator: DependencyOrchestrator;
    searchOrchestrator: SearchOrchestrator;
    agentPromptOrchestrator: AgentPromptOrchestrator;
  }> {
    // Import orchestrator implementations
    const { ListOrchestratorImpl } = await import(
      '../../core/orchestration/services/list-orchestrator-impl.js'
    );
    const { TaskOrchestratorImpl } = await import(
      '../../core/orchestration/services/task-orchestrator-impl.js'
    );
    const { DependencyOrchestratorImpl } = await import(
      '../../core/orchestration/services/dependency-orchestrator-impl.js'
    );

    // Initialize data delegation layer
    const { initializeApplication } = await import(
      '../../app/initialization.js'
    );
    // Map filesystem to file for storage factory compatibility
    const fallbackStorage = {
      ...this.config.dataStore,
      type:
        this.config.dataStore.type === 'filesystem'
          ? ('file' as const)
          : (this.config.dataStore.type as 'memory' | 'file' | 'postgresql'),
    };

    const initResult = await initializeApplication({
      fallbackStorage: fallbackStorage,
      useEnvironment: true,
      enableAggregation: true,
    });

    // Create data access service from router
    // const { DataAccessServiceImpl } = await import(
    //   '../../data/access/data-access-service.js'
    // );
    const { DataDelegationService } = await import(
      '../../data/delegation/data-delegation-service.js'
    );

    // Create data access service from the router (avoiding direct storage imports)
    const dataAccessService = {
      async create(_entity: string, data: unknown): Promise<unknown> {
        const entityData = data as { id: string };
        await initResult.router.routeOperation({
          type: 'write',
          key: entityData.id,
          data: data as TaskList,
        });
        return data;
      },
      async read(
        _entity: string,
        filters?: Record<string, unknown>
      ): Promise<unknown> {
        if (filters?.['id']) {
          return await initResult.router.routeOperation({
            type: 'read',
            key: filters['id'] as string,
          });
        }
        // For list operations, use the orchestration layer
        const { ListOrchestratorImpl } = await import(
          '../../core/orchestration/services/list-orchestrator-impl.js'
        );
        const { ListValidator } = await import(
          '../../core/orchestration/validators/list-validator.js'
        );
        const listValidator = new ListValidator();
        const listOrchestrator = new ListOrchestratorImpl(
          listValidator,
          dataDelegationService
        );
        return await listOrchestrator.getAllLists();
      },
      async update(_entity: string, data: unknown): Promise<unknown> {
        const entityData = data as { id: string };
        await initResult.router.routeOperation({
          type: 'write',
          key: entityData.id,
          data: data as TaskList,
        });
        return data;
      },
      async delete(
        _entity: string,
        filters?: Record<string, unknown>
      ): Promise<void> {
        if (filters?.['id']) {
          await initResult.router.routeOperation({
            type: 'delete',
            key: filters['id'] as string,
          });
        }
      },
      async search(
        _entity: string,
        criteria?: Record<string, unknown>
      ): Promise<unknown> {
        // For search operations, use the orchestration layer
        const { SearchOrchestratorImpl } = await import(
          '../../core/orchestration/services/search-orchestrator-impl.js'
        );
        const searchOrchestrator = new SearchOrchestratorImpl(
          dataDelegationService
        );
        return await searchOrchestrator.searchLists(criteria || {});
      },
    };

    const dataDelegationService = new DataDelegationService(dataAccessService);

    // Import validator classes
    const { ListValidator } = await import(
      '../../core/orchestration/validators/list-validator.js'
    );
    const { TaskValidator } = await import(
      '../../core/orchestration/validators/task-validator.js'
    );
    // const { DependencyValidator } = await import(
    //   '../../core/orchestration/validators/dependency-validator.js'
    // );

    // Create validators
    const listValidator = new ListValidator();
    const taskValidator = new TaskValidator();
    // const dependencyValidator = new DependencyValidator();

    // Create orchestrator implementations
    const listOrchestrator = new ListOrchestratorImpl(
      listValidator,
      dataDelegationService
    );
    const dependencyOrchestrator = new DependencyOrchestratorImpl(
      dataDelegationService
    );
    const taskOrchestrator = new TaskOrchestratorImpl(
      taskValidator,
      dataDelegationService
    );

    // Import missing orchestrator implementations
    const { SearchOrchestratorImpl } = await import(
      '../../core/orchestration/services/search-orchestrator-impl.js'
    );
    const { AgentPromptOrchestratorImpl } = await import(
      '../../core/orchestration/services/agent-prompt-orchestrator-impl.js'
    );

    // Import additional validators (not used directly in current implementation)
    // const { SearchValidator } = await import(
    //   '../../core/orchestration/validators/search-validator.js'
    // );
    // const { AgentPromptValidator } = await import(
    //   '../../core/orchestration/validators/agent-prompt-validator.js'
    // );
    // const { TemplateEngine } = await import(
    //   '../../shared/utils/template-engine.js'
    // );

    // Create additional validators and services
    // Validators are created but not used directly in current implementation
    // const searchValidator = new SearchValidator();
    // const agentPromptValidator = new AgentPromptValidator();
    // const templateEngine = new TemplateEngine();

    // Create search orchestrator
    const searchOrchestrator = new SearchOrchestratorImpl(
      dataDelegationService
    );

    // Create agent prompt orchestrator
    const agentPromptOrchestrator = new AgentPromptOrchestratorImpl(
      dataDelegationService
    );

    return {
      listOrchestrator,
      taskOrchestrator,
      dependencyOrchestrator,
      searchOrchestrator,
      agentPromptOrchestrator,
    };
  }

  /**
   * Performs a health check on the server and its dependencies
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.handlers) {
        return false;
      }
      // Health check implementation
      return true;
    } catch (error) {
      LOGGER.error('Server health check failed', { error });
      return false;
    }
  }

  /**
   * Stops the server and cleans up resources
   */
  async stop(): Promise<void> {
    try {
      if (this.transport && typeof this.transport.close === 'function') {
        await this.transport.close();
        this.transport = null;
      }
      this.handlers = null;
      LOGGER.info('Consolidated MCP Server stopped successfully');
    } catch (error) {
      LOGGER.error('Error during server shutdown', { error });
      throw error;
    }
  }

  /**
   * Closes the server and cleans up resources
   * @deprecated Use stop() instead
   */
  async close(): Promise<void> {
    return this.stop();
  }
}
