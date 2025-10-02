/**
 * MCP Task Manager Server
 * Main entry point for the Model Context Protocol server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { TodoListManager } from "../domain/lists/todo-list-manager.js";
import { ConfigManager, type ServerConfig } from "../infrastructure/config/index.js";
import { IntelligenceManager } from "../domain/intelligence/intelligence-manager.js";
import { errorHandler, type ErrorReport } from "../shared/errors/error-manager.js";
import { getVersionInfo } from "../shared/version.js";
import {
  performanceMonitor,
  type PerformanceBenchmark,
} from "../infrastructure/monitoring/performance-monitor.js";
import {
  memoryMonitor,
  type MemoryAlert,
} from "../infrastructure/monitoring/memory-monitor.js";
import { alertingManager } from "../infrastructure/monitoring/alerting-manager.js";
import { metricsCollector } from "../infrastructure/monitoring/metrics-collector.js";
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
  handleAnalyzeTask,
  handleGetTaskSuggestions,
  handleSetTaskDependencies,
  handleGetReadyTasks,
  handleAnalyzeTaskDependencies,
  handleSetTaskExitCriteria,
  handleUpdateExitCriteria,
  handleBulkTaskOperations,
} from "../api/handlers/index.js";
import { MCP_TOOLS } from "../api/tools/definitions.js";
import { logger } from "../shared/utils/logger.js";
import { preprocessParameters, type PreprocessingResult } from "../shared/utils/parameter-preprocessor.js";
import { formatZodError, createErrorContext } from "../shared/utils/error-formatter.js";

class McpTaskManagerServer {
  private readonly server: Server;
  private todoListManager: TodoListManager | null = null;
  private readonly intelligenceManager: IntelligenceManager;
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

    this.intelligenceManager = new IntelligenceManager();

    this.setupHandlers();
    this.setupMonitoring();
    this.setupErrorHandling();
  }

  private ensureTodoListManager(): TodoListManager {
    if (!this.todoListManager) {
      throw new Error("TodoListManager not initialized. Call start() first.");
    }
    return this.todoListManager;
  }

  /**
   * Sets up monitoring systems including performance tracking, memory monitoring, and error handling
   * Configures event listeners to process benchmarks, memory alerts, and error reports
   */
  private setupMonitoring(): void {
    // Increase max listeners to prevent warnings in test environments
    performanceMonitor.setMaxListeners(50);
    memoryMonitor.setMaxListeners(50);
    errorHandler.setMaxListeners(50);

    // Remove existing listeners to prevent duplicates
    performanceMonitor.removeAllListeners("benchmark");
    memoryMonitor.removeAllListeners("memoryAlert");
    errorHandler.removeAllListeners("error");

    performanceMonitor.on("benchmark", (benchmark: PerformanceBenchmark) => {
      metricsCollector.recordOperation(
        benchmark.name,
        benchmark.duration,
        benchmark.metadata?.["success"] !== false
      );
    });

    memoryMonitor.on("memoryAlert", (alert: MemoryAlert) => {
      void alertingManager.processMemoryAlert(alert);
    });

    errorHandler.on("error", (errorReport: ErrorReport) => {
      void alertingManager.processErrorReport(errorReport);
    });

    logger.debug("Monitoring systems configured");
  }

  /**
   * Configures centralized error handling system
   * Sets up error event listeners to log and process application errors
   */
  private setupErrorHandling(): void {
    // Remove existing listeners to prevent duplicates
    errorHandler.removeAllListeners("error");
    
    errorHandler.on("error", (errorReport: ErrorReport) => {
      logger.error("Application error handled", {
        errorId: errorReport.id,
        category: errorReport.category,
        severity: errorReport.severity,
        operation: errorReport.context.operation,
      });
    });

    logger.debug("Error handling configured");
  }



  /**
   * Sets up MCP request handlers for all supported tools
   * 
   * Configures two main handlers:
   * 1. ListToolsRequestSchema - Returns available MCP tools
   * 2. CallToolRequestSchema - Routes tool calls to appropriate handlers with monitoring
   */
  private setupHandlers(): void {
    // Handler for listing available tools with methodology guidance
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      return {
        tools: MCP_TOOLS,
        // Embed methodology guidance directly in the tools response
        _metadata: {
          bestPractices: {
            methodology: "Follow the three core principles for effective task management:",
            principles: [
              "🎯 PLAN AND REFLECT: Thoroughly investigate before action (use analyze_task, search_tool), reflect after completion",
              "🔍 USE TOOLS, DON'T GUESS: Always research using available tools rather than making assumptions",
              "✅ PERSIST UNTIL COMPLETE: Ensure all exit criteria are met before marking tasks complete"
            ],
            workflow: [
              "1. INVESTIGATE: Use analyze_task and search_tool to understand context",
              "2. PLAN: Create detailed action plans with specific exit criteria",
              "3. EXECUTE: Use update_task regularly to track progress",
              "4. VERIFY: Check all exit criteria before using complete_task",
              "5. REFLECT: Document learnings and outcomes"
            ],
            documentation: "Complete methodology guide: https://github.com/keyurgolani/task-list-mcp/blob/main/docs/guides/agent-best-practices.md"
          }
        }
      };
    });

    // Handler for executing tool calls with monitoring and error handling
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
   * 
   * Organizes tool routing by category:
   * - List management tools (create, get, list, delete)
   * - Task management tools (add, update, remove, complete, priority, tags)
   * - Search and display tools (search, filter, show)
   * - Intelligence tools (analyze, suggestions)
   * 
   * Includes parameter preprocessing and error formatting for agent-friendly responses.
   * 
   * @param toolName - Name of the tool to execute
   * @param request - MCP request object containing parameters
   * @returns Promise<unknown> - Result from the tool handler
   * @throws Error - If tool name is not recognized
   */
  public async routeToolCall(toolName: string, request: any): Promise<unknown> {
    // Preprocess parameters for agent-friendly type coercion
    const preprocessingResult = this.preprocessRequestParameters(toolName, request);
    
    // Update request with preprocessed parameters
    const processedRequest = {
      ...request,
      params: {
        ...request.params,
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

      // Intelligence tools
      if (this.isIntelligenceTool(toolName)) {
        return await this.handleIntelligenceTool(toolName, processedRequest);
      }

      // Dependency management tools
      if (this.isDependencyManagementTool(toolName)) {
        return await this.handleDependencyManagementTool(toolName, processedRequest);
      }

      // Exit criteria management tools
      if (this.isExitCriteriaManagementTool(toolName)) {
        return await this.handleExitCriteriaManagementTool(toolName, processedRequest);
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
  private async handleListManagementTool(toolName: string, request: any): Promise<unknown> {
    const todoListManager = this.ensureTodoListManager();

    switch (toolName) {
      case "create_list":
        return await this.executeWithMonitoring("create_list", 
          () => handleCreateList(request, todoListManager), request);
      
      case "get_list":
        return await this.executeWithMonitoring("get_list", 
          () => handleGetList(request, todoListManager), request);
      
      case "list_all_lists":
        return await this.executeWithMonitoring("list_all_lists", 
          () => handleListAllLists(request, todoListManager), request);
      
      case "delete_list":
        return await this.executeWithMonitoring("delete_list", 
          () => handleDeleteList(request, todoListManager), request);
      
      default:
        throw new Error(`Unknown list management tool: ${toolName}`);
    }
  }

  /**
   * Handle task management tools (add_task, update_task, remove_task, etc.)
   */
  private async handleTaskManagementTool(toolName: string, request: any): Promise<unknown> {
    const todoListManager = this.ensureTodoListManager();

    switch (toolName) {
      case "add_task":
        return await this.executeWithMonitoring("add_task", 
          () => handleAddTask(request, todoListManager), request);
      
      case "update_task":
        return await this.executeWithMonitoring("update_task", 
          () => handleUpdateTask(request, todoListManager), request);
      
      case "remove_task":
        return await this.executeWithMonitoring("remove_task", 
          () => handleRemoveTask(request, todoListManager), request);
      
      case "complete_task":
        return await this.executeWithMonitoring("complete_task", 
          () => handleCompleteTask(request, todoListManager), request);
      
      case "set_task_priority":
        return await this.executeWithMonitoring("set_task_priority", 
          () => handleSetTaskPriority(request, todoListManager), request);
      
      case "add_task_tags":
        return await this.executeWithMonitoring("add_task_tags", 
          () => handleAddTaskTags(request, todoListManager), request);
      
      case "bulk_task_operations":
        return await this.executeWithMonitoring("bulk_task_operations", 
          () => handleBulkTaskOperations(request, todoListManager), request);
      
      default:
        throw new Error(`Unknown task management tool: ${toolName}`);
    }
  }

  /**
   * Handle search and display tools (search_tool, show_tasks)
   */
  private async handleSearchDisplayTool(toolName: string, request: any): Promise<unknown> {
    const todoListManager = this.ensureTodoListManager();

    switch (toolName) {
      case "search_tool":
        return await this.executeWithMonitoring("search_tool", 
          () => handleSearchTool(request, todoListManager), request);
      
      case "show_tasks":
        return await this.executeWithMonitoring("show_tasks", 
          () => handleShowTasks(request, todoListManager), request);
      
      default:
        throw new Error(`Unknown search/display tool: ${toolName}`);
    }
  }

  /**
   * Handle intelligence tools (analyze_task, get_task_suggestions)
   */
  private async handleIntelligenceTool(toolName: string, request: any): Promise<unknown> {
    switch (toolName) {
      case "analyze_task":
        return await this.executeWithMonitoring("analyze_task", 
          () => handleAnalyzeTask(request, this.intelligenceManager), request);
      
      case "get_task_suggestions":
        return await this.executeWithMonitoring("get_task_suggestions", 
          () => handleGetTaskSuggestions(request, this.ensureTodoListManager(), this.intelligenceManager), 
          request);
      
      default:
        throw new Error(`Unknown intelligence tool: ${toolName}`);
    }
  }

  /**
   * Handle dependency management tools (set_task_dependencies, get_ready_tasks, analyze_task_dependencies)
   */
  private async handleDependencyManagementTool(toolName: string, request: any): Promise<unknown> {
    const todoListManager = this.ensureTodoListManager();

    switch (toolName) {
      case "set_task_dependencies":
        return await this.executeWithMonitoring("set_task_dependencies", 
          () => handleSetTaskDependencies(request, todoListManager), request);
      
      case "get_ready_tasks":
        return await this.executeWithMonitoring("get_ready_tasks", 
          () => handleGetReadyTasks(request, todoListManager), request);
      
      case "analyze_task_dependencies":
        return await this.executeWithMonitoring("analyze_task_dependencies", 
          () => handleAnalyzeTaskDependencies(request, todoListManager), request);
      
      default:
        throw new Error(`Unknown dependency management tool: ${toolName}`);
    }
  }

  /**
   * Handle exit criteria management tools (set_task_exit_criteria, update_exit_criteria)
   */
  private async handleExitCriteriaManagementTool(toolName: string, request: any): Promise<unknown> {
    const todoListManager = this.ensureTodoListManager();

    switch (toolName) {
      case "set_task_exit_criteria":
        return await this.executeWithMonitoring("set_task_exit_criteria", 
          () => handleSetTaskExitCriteria(request, todoListManager), request);
      
      case "update_exit_criteria":
        return await this.executeWithMonitoring("update_exit_criteria", 
          () => handleUpdateExitCriteria(request, todoListManager), request);
      
      default:
        throw new Error(`Unknown exit criteria management tool: ${toolName}`);
    }
  }

  /**
   * Preprocess request parameters for agent-friendly type coercion
   */
  private preprocessRequestParameters(toolName: string, request: any): PreprocessingResult {
    const parameters = request.params?.arguments || {};
    
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
  private handleToolCallError(error: unknown, toolName: string, request: any): never {
    const errorContext = createErrorContext(toolName, true);
    
    // Check if it's a Zod validation error
    if (error && typeof error === 'object' && 'issues' in error) {
      const formattedError = formatZodError(error as any, errorContext);
      
      logger.warn('Tool validation error with formatting', {
        toolName,
        originalError: (error as any).message,
        formattedError,
        parameters: request.params?.arguments,
      });
      
      throw new Error(formattedError);
    }
    
    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('Tool execution error', {
      toolName,
      error: errorMessage,
      parameters: request.params?.arguments,
    });
    
    throw error instanceof Error ? error : new Error(errorMessage);
  }

  // Tool category helper methods
  private isListManagementTool(toolName: string): boolean {
    return ["create_list", "get_list", "list_all_lists", "delete_list"].includes(toolName);
  }

  private isTaskManagementTool(toolName: string): boolean {
    return ["add_task", "update_task", "remove_task", "complete_task", "set_task_priority", "add_task_tags", "bulk_task_operations"].includes(toolName);
  }

  private isSearchDisplayTool(toolName: string): boolean {
    return ["search_tool", "show_tasks"].includes(toolName);
  }

  private isIntelligenceTool(toolName: string): boolean {
    return ["analyze_task", "get_task_suggestions"].includes(toolName);
  }

  private isDependencyManagementTool(toolName: string): boolean {
    return ["set_task_dependencies", "get_ready_tasks", "analyze_task_dependencies"].includes(toolName);
  }

  private isExitCriteriaManagementTool(toolName: string): boolean {
    return ["set_task_exit_criteria", "update_exit_criteria"].includes(toolName);
  }

  /**
   * Starts the MCP Task Manager server
   * 
   * Orchestrates the complete server startup process including:
   * - Data delegation layer initialization (router, aggregator, repository)
   * - Todo list manager setup with dependency injection
   * - Monitoring systems activation (performance and memory tracking)
   * - Stdio transport configuration for MCP communication
   * - Health checks for all configured data sources
   * 
   * @throws Error - If initialization, monitoring setup, or transport configuration fails
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
      // This wraps the multi-source repository to work with existing code
      const { TodoListRepositoryAdapter } = await import('../domain/repositories/todo-list-repository.adapter.js');
      
      // Get the first healthy backend for backward compatibility with ProjectManager
      const storageBackend = initResult.router.getAllSources()[0];
      if (!storageBackend) {
        throw new Error('No healthy storage backend available');
      }
      
      // Create adapter that uses the multi-source repository
      const repository = new TodoListRepositoryAdapter(storageBackend);
      
      // Create TodoListManager with repository (pass storage for backward compatibility with ProjectManager)
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

      if (this.config.monitoring.enabled) {
        performanceMonitor.startMonitoring(
          this.config.monitoring.performanceInterval ?? 5000
        );
        memoryMonitor.startMonitoring(
          this.config.monitoring.memoryInterval ?? 10000
        );

        logger.info("Monitoring systems started");
      }

      // Use stdio transport for MCP communication
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info(
        "MCP Task Manager server started successfully",
        {
          monitoring: this.config.monitoring.enabled,
          storage: this.config.storage.type,
          dataSources: routerStatus.total,
          healthySources: routerStatus.healthy,
          version: this.config.server.version,
          transport: "stdio",
        }
      );
    } catch (error) {
      logger.error("Failed to start MCP Task Manager server", { error });
      throw error;
    }
  }

  /**
   * Performs a health check on the server and its dependencies
   * @returns Promise<boolean> - true if server is healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.ensureTodoListManager().healthCheck();
    } catch (error) {
      logger.error("Server health check failed", { error });
      return false;
    }
  }

  /**
   * Executes an operation with comprehensive monitoring, error handling, and retry logic
   * @param operationName - Name of the operation for logging and metrics
   * @param operation - The operation function to execute
   * @param request - Optional request context for logging
   * @returns Promise<T> - Result of the operation
   */
  private async executeWithMonitoring<T>(
    operationName: string,
    operation: () => Promise<T>,
    request?: { params?: unknown }
  ): Promise<T> {
    const requestId = `req_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    return await performanceMonitor.timeOperation(
      operationName,
      async () => {
        return await errorHandler.executeWithRetry(
          operation,
          {
            operation: operationName,
            requestId,
            metadata: {
              params: request?.params,
            },
            timestamp: Date.now(),
          },
          {
            maxAttempts: 2, // Limited retries for MCP operations
            baseDelay: 1000,
            maxDelay: 5000,
            backoffMultiplier: 2,
            jitter: true,
          }
        );
      },
      {
        requestId,
        operation: operationName,
      }
    );
  }

  /**
   * Closes the server and cleans up resources
   * Shuts down monitoring systems and closes the todo list manager
   */
  async close(): Promise<void> {
    try {
      if (this.config.monitoring.enabled) {
        performanceMonitor.stopMonitoring();
        memoryMonitor.stopMonitoring();
        logger.info("Monitoring systems stopped");
      }

      if (this.todoListManager) {
        await this.todoListManager.shutdown();
        this.todoListManager = null;
      }

      logger.info("MCP Task Manager server closed successfully");
    } catch (error) {
      logger.error("Error during server shutdown", { error });
      throw error;
    }
  }
}

export { McpTaskManagerServer };
if (
  process.argv[1] !== undefined &&
  import.meta.url === `file://${process.argv[1]}` &&
  process.env["NODE_ENV"] !== "test"
) {
  const server = new McpTaskManagerServer();

  server.start().catch((error: unknown) => {
    logger.error("Failed to start server", { error });
    process.exit(1);
  });

  process.on("SIGINT", () => {
    logger.info("Received SIGINT, shutting down gracefully");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.info("Received SIGTERM, shutting down gracefully");
    process.exit(0);
  });
}
