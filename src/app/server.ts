/**
 * MCP Task Manager Server
 * Main entry point for the Model Context Protocol server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { ZodError } from 'zod';

import {
  handleCreateList,
  handleGetList,
  handleListAllLists,
  handleDeleteList,
  handleAddTask,
  handleUpdateTask,
  handleRemoveTask,
  handleCompleteTask,
  handleSetTaskPriority,
  handleAddTaskTags,
  handleSearchTool,
  handleShowTasks,
  handleSetTaskDependencies,
  handleGetReadyTasks,
  handleAnalyzeTaskDependencies,
  handleSetTaskExitCriteria,
  handleUpdateExitCriteria,
} from '../api/handlers/index.js';
import { MCP_TOOLS } from '../api/tools/definitions.js';
import { TodoListManager } from '../domain/lists/todo-list-manager.js';
import {
  ConfigManager,
  type ServerConfig,
} from '../infrastructure/config/index.js';
import {
  errorHandler,
  type ErrorReport,
} from '../shared/errors/error-manager.js';
import {
  formatZodError,
  createErrorContext,
} from '../shared/utils/error-formatter.js';
import { logger } from '../shared/utils/logger.js';
import {
  preprocessParameters,
  type PreprocessingResult,
} from '../shared/utils/parameter-preprocessor.js';
import { getVersionInfo } from '../shared/version.js';

class McpTaskManagerServer {
  private readonly server: Server;
  private todoListManager: TodoListManager | null = null;

  private readonly config: ServerConfig;

  constructor() {
    const configManager = ConfigManager.getInstance();
    this.config = configManager.getConfig();
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
    this.setupErrorHandling();
  }

  private ensureTodoListManager(): TodoListManager {
    if (!this.todoListManager) {
      throw new Error('TodoListManager not initialized. Call start() first.');
    }
    return this.todoListManager;
  }

  /**
   * Configures centralized error handling system
   * Sets up error event listeners to log and process application errors
   */
  private setupErrorHandling(): void {
    // Remove existing listeners to prevent duplicates
    errorHandler.removeAllListeners('error');

    errorHandler.on('error', (errorReport: ErrorReport) => {
      logger.error('Application error handled', {
        errorId: errorReport.id,
        category: errorReport.category,
        severity: errorReport.severity,
        operation: errorReport.context.operation,
      });
    });

    logger.debug('Error handling configured');
  }

  /**
   * Sets up MCP request handlers for all supported tools
   *
   * Configures two main handlers:
   * 1. ListToolsRequestSchema - Returns available MCP tools
   * 2. CallToolRequestSchema - Routes tool calls to appropriate handlers
   */
  private setupHandlers(): void {
    // Handler for listing available tools with methodology guidance
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      return {
        tools: MCP_TOOLS,
        // Embed methodology guidance directly in the tools response
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

    // Handler for executing tool calls with error handling
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
   * Routes tool calls to appropriate handlers based on tool name
   */
  public async routeToolCall(
    toolName: string,
    request: Record<string, unknown>
  ): Promise<unknown> {
    // Preprocess parameters for agent-friendly type coercion
    const preprocessingResult = this.preprocessRequestParameters(
      toolName,
      request
    );

    // Update request with preprocessed parameters
    const processedRequest = {
      ...request,
      params: {
        ...(request['params'] as Record<string, unknown>),
        arguments: preprocessingResult.parameters,
      },
    };
    try {
      // List management tools
      if (this.isListManagementTool(toolName)) {
        return await this.handleListManagementTool(toolName, processedRequest);
      }

      // Task management tools
      if (this.isTaskManagementTool(toolName)) {
        return await this.handleTaskManagementTool(toolName, processedRequest);
      }

      // Search and display tools
      if (this.isSearchDisplayTool(toolName)) {
        return await this.handleSearchDisplayTool(toolName, processedRequest);
      }

      // Dependency management tools
      if (this.isDependencyManagementTool(toolName)) {
        return await this.handleDependencyManagementTool(
          toolName,
          processedRequest
        );
      }

      // Exit criteria management tools
      if (this.isExitCriteriaManagementTool(toolName)) {
        return await this.handleExitCriteriaManagementTool(
          toolName,
          processedRequest
        );
      }

      throw new Error(`Unknown tool: ${toolName}`);
    } catch (error) {
      // Error handling with agent-friendly messages
      return this.handleToolCallError(error, toolName, request);
    }
  }

  /**
   * Handle list management tools (create_list, get_list, list_all_lists, delete_list)
   */
  private async handleListManagementTool(
    toolName: string,
    request: Record<string, unknown>
  ): Promise<unknown> {
    const todoListManager = this.ensureTodoListManager();

    switch (toolName) {
      case 'create_list':
        return await handleCreateList(
          request as CallToolRequest,
          todoListManager
        );

      case 'get_list':
        return await handleGetList(request as CallToolRequest, todoListManager);

      case 'list_all_lists':
        return await handleListAllLists(
          request as CallToolRequest,
          todoListManager
        );

      case 'delete_list':
        return await handleDeleteList(
          request as CallToolRequest,
          todoListManager
        );

      default:
        throw new Error(`Unknown list management tool: ${toolName}`);
    }
  }

  /**
   * Handle task management tools (add_task, update_task, remove_task, etc.)
   */
  private async handleTaskManagementTool(
    toolName: string,
    request: Record<string, unknown>
  ): Promise<unknown> {
    const todoListManager = this.ensureTodoListManager();

    switch (toolName) {
      case 'add_task':
        return await handleAddTask(request as CallToolRequest, todoListManager);

      case 'update_task':
        return await handleUpdateTask(
          request as CallToolRequest,
          todoListManager
        );

      case 'remove_task':
        return await handleRemoveTask(
          request as CallToolRequest,
          todoListManager
        );

      case 'complete_task':
        return await handleCompleteTask(
          request as CallToolRequest,
          todoListManager
        );

      case 'set_task_priority':
        return await handleSetTaskPriority(
          request as CallToolRequest,
          todoListManager
        );

      case 'add_task_tags':
        return await handleAddTaskTags(
          request as CallToolRequest,
          todoListManager
        );

      default:
        throw new Error(`Unknown task management tool: ${toolName}`);
    }
  }

  /**
   * Handle search and display tools (search_tool, show_tasks)
   */
  private async handleSearchDisplayTool(
    toolName: string,
    request: Record<string, unknown>
  ): Promise<unknown> {
    const todoListManager = this.ensureTodoListManager();

    switch (toolName) {
      case 'search_tool':
        return await handleSearchTool(
          request as CallToolRequest,
          todoListManager
        );

      case 'show_tasks':
        return await handleShowTasks(
          request as CallToolRequest,
          todoListManager
        );

      default:
        throw new Error(`Unknown search/display tool: ${toolName}`);
    }
  }

  /**
   * Handle dependency management tools (set_task_dependencies, get_ready_tasks, analyze_task_dependencies)
   */
  private async handleDependencyManagementTool(
    toolName: string,
    request: Record<string, unknown>
  ): Promise<unknown> {
    const todoListManager = this.ensureTodoListManager();

    switch (toolName) {
      case 'set_task_dependencies':
        return await handleSetTaskDependencies(
          request as CallToolRequest,
          todoListManager
        );

      case 'get_ready_tasks':
        return await handleGetReadyTasks(
          request as CallToolRequest,
          todoListManager
        );

      case 'analyze_task_dependencies':
        return await handleAnalyzeTaskDependencies(
          request as CallToolRequest,
          todoListManager
        );

      default:
        throw new Error(`Unknown dependency management tool: ${toolName}`);
    }
  }

  /**
   * Handle exit criteria management tools (set_task_exit_criteria, update_exit_criteria)
   */
  private async handleExitCriteriaManagementTool(
    toolName: string,
    request: Record<string, unknown>
  ): Promise<unknown> {
    const todoListManager = this.ensureTodoListManager();

    switch (toolName) {
      case 'set_task_exit_criteria':
        return await handleSetTaskExitCriteria(
          request as CallToolRequest,
          todoListManager
        );

      case 'update_exit_criteria':
        return await handleUpdateExitCriteria(
          request as CallToolRequest,
          todoListManager
        );

      default:
        throw new Error(`Unknown exit criteria management tool: ${toolName}`);
    }
  }

  /**
   * Preprocess request parameters for agent-friendly type coercion
   */
  private preprocessRequestParameters(
    toolName: string,
    request: Record<string, unknown>
  ): PreprocessingResult {
    const parameters =
      (request['params'] as { arguments?: Record<string, unknown> })
        ?.arguments || {};

    // Apply parameter preprocessing
    const result = preprocessParameters(parameters);

    // Log preprocessing actions for debugging
    if (result.conversions.length > 0) {
      logger.debug('Parameter preprocessing applied', {
        toolName,
        conversionsCount: result.conversions.length,
        conversions: result.conversions.map(c => ({
          parameter: c.parameter,
          type: c.conversionType,
          from: typeof c.originalValue,
          to: typeof c.convertedValue,
        })),
      });
    }

    // Log any preprocessing errors
    if (result.errors.length > 0) {
      logger.warn('Parameter preprocessing errors', {
        toolName,
        errors: result.errors,
      });
    }

    return result;
  }

  /**
   * Handle tool call errors with formatting
   */
  private handleToolCallError(
    error: unknown,
    toolName: string,
    request: Record<string, unknown>
  ): never {
    const errorContext = createErrorContext(toolName, true);

    // Check if it's a Zod validation error
    if (error && typeof error === 'object' && 'issues' in error) {
      const originalInput = (
        request['params'] as { arguments?: Record<string, unknown> }
      )?.arguments;
      const formattedError = formatZodError(error as ZodError, errorContext);

      logger.warn('Tool validation error with formatting', {
        toolName,
        originalError: (error as unknown as Error).message,
        formattedError,
        parameters: originalInput,
      });

      throw new Error(formattedError);
    }

    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Tool execution error', {
      toolName,
      error: errorMessage,
      parameters: (request['params'] as { arguments?: Record<string, unknown> })
        ?.arguments,
    });

    throw error instanceof Error ? error : new Error(errorMessage);
  }

  // Tool category helper methods
  private isListManagementTool(toolName: string): boolean {
    return [
      'create_list',
      'get_list',
      'list_all_lists',
      'delete_list',
    ].includes(toolName);
  }

  private isTaskManagementTool(toolName: string): boolean {
    return [
      'add_task',
      'update_task',
      'remove_task',
      'complete_task',
      'set_task_priority',
      'add_task_tags',
    ].includes(toolName);
  }

  private isSearchDisplayTool(toolName: string): boolean {
    return ['search_tool', 'show_tasks'].includes(toolName);
  }

  private isDependencyManagementTool(toolName: string): boolean {
    return [
      'set_task_dependencies',
      'get_ready_tasks',
      'analyze_task_dependencies',
    ].includes(toolName);
  }

  private isExitCriteriaManagementTool(toolName: string): boolean {
    return ['set_task_exit_criteria', 'update_exit_criteria'].includes(
      toolName
    );
  }

  /**
   * Starts the MCP Task Manager server
   */
  async start(): Promise<void> {
    try {
      // Initialize data delegation layer with multi-source support
      const { initializeApplication } = await import('./initialization.js');

      const initResult = await initializeApplication({
        fallbackStorage: this.config.storage,
        useEnvironment: true,
        enableAggregation: true,
      });

      logger.info('Data delegation layer initialized', {
        healthySources: initResult.healthStatus.healthy,
        totalSources: initResult.healthStatus.total,
        aggregationEnabled: initResult.config.aggregationEnabled,
      });

      // Create repository adapter for backward compatibility
      const { TodoListRepositoryAdapter } = await import(
        '../domain/repositories/todo-list-repository.adapter.js'
      );

      // Get the first healthy backend for backward compatibility with ProjectManager
      const storageBackend = initResult.router.getAllSources()[0];
      if (!storageBackend) {
        throw new Error('No healthy storage backend available');
      }

      // Create adapter that uses the multi-source repository
      const repository = new TodoListRepositoryAdapter(storageBackend);

      // Create TodoListManager with repository
      this.todoListManager = new TodoListManager(repository, storageBackend);
      await this.todoListManager.initialize();

      // Log health status of all sources
      const routerStatus = initResult.router.getStatus();
      logger.info('Data source health status', {
        sources: routerStatus.sources.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type,
          healthy: s.healthy,
          readonly: s.readonly,
          priority: s.priority,
        })),
      });

      // Use stdio transport for MCP communication
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('MCP Task Manager server started successfully', {
        storage: this.config.storage.type,
        dataSources: routerStatus.total,
        healthySources: routerStatus.healthy,
        version: this.config.server.version,
        transport: 'stdio',
      });
    } catch (error) {
      logger.error('Failed to start MCP Task Manager server', { error });
      throw error;
    }
  }

  /**
   * Performs a health check on the server and its dependencies
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.ensureTodoListManager().healthCheck();
    } catch (error) {
      logger.error('Server health check failed', { error });
      return false;
    }
  }

  /**
   * Closes the server and cleans up resources
   */
  async close(): Promise<void> {
    try {
      if (this.todoListManager) {
        await this.todoListManager.shutdown();
        this.todoListManager = null;
      }

      logger.info('MCP Task Manager server closed successfully');
    } catch (error) {
      logger.error('Error during server shutdown', { error });
      throw error;
    }
  }
}

export { McpTaskManagerServer };
if (
  process.argv[1] !== undefined &&
  import.meta.url === `file://${process.argv[1]}` &&
  process.env['NODE_ENV'] !== 'test'
) {
  const server = new McpTaskManagerServer();

  server.start().catch((error: unknown) => {
    logger.error('Failed to start server', { error });
    process.exit(1);
  });

  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    process.exit(0);
  });
}
