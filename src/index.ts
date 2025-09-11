/**
 * MCP Task Manager Server
 * Main entry point for the Model Context Protocol server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { TodoListManager } from './core/todo-list-manager.js';
import { StorageFactory } from './storage/storage-factory.js';
import { ConfigManager, type ServerConfig } from './config/index.js';
import { IntelligenceManager } from './intelligence/intelligence-manager.js';
// import { TransactionManager } from './core/transaction-manager.js';
import { errorHandler, type ErrorReport } from './core/error-handler.js';
import {
  performanceMonitor,
  type PerformanceBenchmark,
} from './monitoring/performance-monitor.js';
import {
  memoryMonitor,
  type MemoryAlert,
} from './monitoring/memory-monitor.js';
import { alertingManager } from './monitoring/alerting-manager.js';
import { metricsCollector } from './monitoring/metrics-collector.js';
import { handleCreateTodoList } from './handlers/create-todo-list.js';
import { handleGetTodoList } from './handlers/get-todo-list.js';
import { handleUpdateTodoList } from './handlers/update-todo-list.js';
import { handleListTodoLists } from './handlers/list-todo-lists.js';
import { handleDeleteTodoList } from './handlers/delete-todo-list.js';
import { handleAnalyzeTaskComplexity } from './handlers/analyze-task-complexity.js';
import { handleSearchTodoLists } from './handlers/search-todo-lists.js';
import { logger } from './utils/logger.js';

class McpTaskManagerServer {
  private readonly server: Server;
  private todoListManager: TodoListManager | null = null;
  private readonly intelligenceManager: IntelligenceManager;
  // private readonly transactionManager: TransactionManager; // Reserved for future atomic operations
  private readonly config: ServerConfig;

  constructor() {
    // Load configuration
    const configManager = ConfigManager.getInstance();
    this.config = configManager.getConfig();

    this.server = new Server(
      {
        name: this.config.server.name,
        version: this.config.server.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.intelligenceManager = new IntelligenceManager();
    // this.transactionManager = new TransactionManager(storageBackend);

    this.setupHandlers();
    this.setupMonitoring();
    this.setupErrorHandling();
  }

  private ensureTodoListManager(): TodoListManager {
    if (!this.todoListManager) {
      throw new Error('TodoListManager not initialized. Call start() first.');
    }
    return this.todoListManager;
  }

  private setupMonitoring(): void {
    // Setup performance monitoring
    performanceMonitor.on('benchmark', (benchmark: PerformanceBenchmark) => {
      metricsCollector.recordOperation(
        benchmark.name,
        benchmark.duration,
        benchmark.metadata?.['success'] !== false
      );
    });

    // Setup memory monitoring
    memoryMonitor.on('memoryAlert', (alert: MemoryAlert) => {
      void alertingManager.processMemoryAlert(alert);
    });

    // Setup error monitoring
    errorHandler.on('error', (errorReport: ErrorReport) => {
      void alertingManager.processErrorReport(errorReport);
    });

    // Setup alerting for metrics (metrics collector doesn't emit events in current implementation)
    // This would be implemented if metrics collector was extended to emit events

    logger.debug('Monitoring systems configured');
  }

  private setupErrorHandling(): void {
    // Setup global error handling
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

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, () => {
      return {
        tools: [
          {
            name: 'create_todo_list',
            description: 'Create a new todo list with optional initial tasks',
            inputSchema: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                  description: 'Title of the todo list',
                  minLength: 1,
                  maxLength: 200,
                },
                description: {
                  type: 'string',
                  description: 'Optional description of the todo list',
                  maxLength: 2000,
                },
                tasks: {
                  type: 'array',
                  description: 'Optional array of initial tasks',
                  maxItems: 100,
                  items: {
                    type: 'object',
                    properties: {
                      title: {
                        type: 'string',
                        description: 'Task title',
                        minLength: 1,
                        maxLength: 200,
                      },
                      description: {
                        type: 'string',
                        description: 'Task description',
                        maxLength: 2000,
                      },
                      priority: {
                        type: 'number',
                        description: 'Task priority (1-5, where 5 is highest)',
                        minimum: 1,
                        maximum: 5,
                      },
                      estimatedDuration: {
                        type: 'number',
                        description: 'Estimated duration in minutes',
                        minimum: 1,
                      },
                      tags: {
                        type: 'array',
                        description: 'Task tags',
                        maxItems: 20,
                        items: {
                          type: 'string',
                          maxLength: 50,
                        },
                      },
                    },
                    required: ['title'],
                  },
                },
                context: {
                  type: 'string',
                  description: 'Context or project identifier',
                  maxLength: 200,
                },
              },
              required: ['title'],
            },
          },
          {
            name: 'get_todo_list',
            description:
              'Retrieve a specific todo list by ID with advanced filtering, sorting, and pagination',
            inputSchema: {
              type: 'object',
              properties: {
                listId: {
                  type: 'string',
                  description: 'UUID of the todo list to retrieve',
                  format: 'uuid',
                },
                includeCompleted: {
                  type: 'boolean',
                  description:
                    'Whether to include completed items (default: true)',
                  default: true,
                },
                filters: {
                  type: 'object',
                  description: 'Advanced filtering options',
                  properties: {
                    status: {
                      oneOf: [
                        {
                          type: 'string',
                          enum: [
                            'pending',
                            'in_progress',
                            'completed',
                            'blocked',
                            'cancelled',
                          ],
                        },
                        {
                          type: 'array',
                          items: {
                            type: 'string',
                            enum: [
                              'pending',
                              'in_progress',
                              'completed',
                              'blocked',
                              'cancelled',
                            ],
                          },
                        },
                      ],
                    },
                    priority: {
                      oneOf: [
                        {
                          type: 'number',
                          minimum: 1,
                          maximum: 5,
                        },
                        {
                          type: 'array',
                          items: {
                            type: 'number',
                            minimum: 1,
                            maximum: 5,
                          },
                        },
                      ],
                    },
                    tags: {
                      type: 'array',
                      description: 'Items must have ALL specified tags',
                      items: {
                        type: 'string',
                        maxLength: 50,
                      },
                    },
                    assignee: {
                      type: 'string',
                      description: 'Filter by assignee name',
                    },
                    dueDateBefore: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Items due before this date',
                    },
                    dueDateAfter: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Items due after this date',
                    },
                    createdBefore: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Items created before this date',
                    },
                    createdAfter: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Items created after this date',
                    },
                    hasDescription: {
                      type: 'boolean',
                      description: 'Whether items must have a description',
                    },
                    hasDependencies: {
                      type: 'boolean',
                      description: 'Whether items must have dependencies',
                    },
                    estimatedDurationMin: {
                      type: 'number',
                      minimum: 0,
                      description: 'Minimum estimated duration in minutes',
                    },
                    estimatedDurationMax: {
                      type: 'number',
                      minimum: 0,
                      description: 'Maximum estimated duration in minutes',
                    },
                    searchText: {
                      type: 'string',
                      description:
                        'Text to search in title, description, and tags',
                    },
                  },
                },
                sorting: {
                  type: 'object',
                  description: 'Sorting options',
                  properties: {
                    field: {
                      type: 'string',
                      enum: [
                        'title',
                        'status',
                        'priority',
                        'createdAt',
                        'updatedAt',
                        'completedAt',
                        'estimatedDuration',
                      ],
                    },
                    direction: {
                      type: 'string',
                      enum: ['asc', 'desc'],
                    },
                  },
                  required: ['field', 'direction'],
                },
                pagination: {
                  type: 'object',
                  description: 'Pagination options',
                  properties: {
                    limit: {
                      type: 'number',
                      minimum: 1,
                      maximum: 1000,
                    },
                    offset: {
                      type: 'number',
                      minimum: 0,
                    },
                  },
                },
              },
              required: ['listId'],
            },
          },
          {
            name: 'update_todo_list',
            description: 'Update an existing todo list with various operations',
            inputSchema: {
              type: 'object',
              properties: {
                listId: {
                  type: 'string',
                  description: 'UUID of the todo list to update',
                  format: 'uuid',
                },
                action: {
                  type: 'string',
                  description: 'Type of update operation to perform',
                  enum: [
                    'add_item',
                    'update_item',
                    'remove_item',
                    'update_status',
                    'reorder',
                  ],
                },
                itemData: {
                  type: 'object',
                  description: 'Data for the item being added or updated',
                  properties: {
                    title: {
                      type: 'string',
                      description: 'Item title',
                      minLength: 1,
                      maxLength: 200,
                    },
                    description: {
                      type: 'string',
                      description: 'Item description',
                      maxLength: 2000,
                    },
                    priority: {
                      type: 'number',
                      description: 'Item priority (1-5, where 5 is highest)',
                      minimum: 1,
                      maximum: 5,
                    },
                    status: {
                      type: 'string',
                      description: 'Item status',
                      enum: [
                        'pending',
                        'in_progress',
                        'completed',
                        'blocked',
                        'cancelled',
                      ],
                    },
                    estimatedDuration: {
                      type: 'number',
                      description: 'Estimated duration in minutes',
                      minimum: 1,
                    },
                    tags: {
                      type: 'array',
                      description: 'Item tags',
                      maxItems: 20,
                      items: {
                        type: 'string',
                        maxLength: 50,
                      },
                    },
                    dependencies: {
                      type: 'array',
                      description:
                        'Array of item IDs that this item depends on',
                      maxItems: 50,
                      items: {
                        type: 'string',
                        format: 'uuid',
                      },
                    },
                  },
                },
                itemId: {
                  type: 'string',
                  description: 'UUID of the item to update or remove',
                  format: 'uuid',
                },
                newOrder: {
                  type: 'array',
                  description: 'New order of item IDs for reordering',
                  items: {
                    type: 'string',
                    format: 'uuid',
                  },
                },
              },
              required: ['listId', 'action'],
            },
          },
          {
            name: 'list_todo_lists',
            description: 'List all todo lists with optional filtering',
            inputSchema: {
              type: 'object',
              properties: {
                context: {
                  type: 'string',
                  description: 'Filter by context or project identifier',
                  maxLength: 200,
                },
                status: {
                  type: 'string',
                  description: 'Filter by completion status',
                  enum: ['active', 'completed', 'all'],
                  default: 'all',
                },
                includeArchived: {
                  type: 'boolean',
                  description:
                    'Whether to include archived lists (default: false)',
                  default: false,
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of lists to return',
                  minimum: 1,
                  maximum: 1000,
                },
                offset: {
                  type: 'number',
                  description: 'Number of lists to skip for pagination',
                  minimum: 0,
                },
              },
            },
          },
          {
            name: 'delete_todo_list',
            description: 'Delete or archive a todo list',
            inputSchema: {
              type: 'object',
              properties: {
                listId: {
                  type: 'string',
                  description: 'UUID of the todo list to delete',
                  format: 'uuid',
                },
                permanent: {
                  type: 'boolean',
                  description:
                    'Whether to permanently delete (true) or archive (false, default)',
                  default: false,
                },
              },
              required: ['listId'],
            },
          },
          {
            name: 'analyze_task_complexity',
            description:
              'Analyze task complexity and suggest breakdown into subtasks',
            inputSchema: {
              type: 'object',
              properties: {
                taskDescription: {
                  type: 'string',
                  description: 'Description of the task to analyze',
                  minLength: 1,
                  maxLength: 10000,
                },
                context: {
                  type: 'string',
                  description: 'Optional context or project identifier',
                  maxLength: 200,
                },
                autoCreate: {
                  type: 'boolean',
                  description:
                    'Whether to automatically create a todo list if task is complex',
                  default: false,
                },
                generateOptions: {
                  type: 'object',
                  description: 'Options for task generation',
                  properties: {
                    style: {
                      type: 'string',
                      description: 'Style of generated tasks',
                      enum: ['detailed', 'concise', 'technical', 'business'],
                    },
                    maxTasks: {
                      type: 'number',
                      description: 'Maximum number of tasks to generate',
                      minimum: 1,
                      maximum: 20,
                    },
                    includeTests: {
                      type: 'boolean',
                      description: 'Whether to include testing tasks',
                    },
                    includeDependencies: {
                      type: 'boolean',
                      description:
                        'Whether to include dependency management tasks',
                    },
                  },
                },
              },
              required: ['taskDescription'],
            },
          },
          {
            name: 'search_todo_lists',
            description:
              'Search across all todo lists for items matching criteria',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query text',
                  minLength: 1,
                  maxLength: 500,
                },
                context: {
                  type: 'string',
                  description: 'Optional context to limit search scope',
                  maxLength: 200,
                },
                filters: {
                  type: 'object',
                  description: 'Optional filters to apply to search results',
                  properties: {
                    status: {
                      oneOf: [
                        {
                          type: 'string',
                          enum: [
                            'pending',
                            'in_progress',
                            'completed',
                            'blocked',
                            'cancelled',
                          ],
                        },
                        {
                          type: 'array',
                          items: {
                            type: 'string',
                            enum: [
                              'pending',
                              'in_progress',
                              'completed',
                              'blocked',
                              'cancelled',
                            ],
                          },
                        },
                      ],
                    },
                    priority: {
                      oneOf: [
                        {
                          type: 'number',
                          minimum: 1,
                          maximum: 5,
                        },
                        {
                          type: 'array',
                          items: {
                            type: 'number',
                            minimum: 1,
                            maximum: 5,
                          },
                        },
                      ],
                    },
                    tags: {
                      type: 'array',
                      description: 'Items must have ALL specified tags',
                      items: {
                        type: 'string',
                        maxLength: 50,
                      },
                    },
                    createdBefore: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Items created before this date',
                    },
                    createdAfter: {
                      type: 'string',
                      format: 'date-time',
                      description: 'Items created after this date',
                    },
                    hasDescription: {
                      type: 'boolean',
                      description: 'Whether items must have a description',
                    },
                    hasDependencies: {
                      type: 'boolean',
                      description: 'Whether items must have dependencies',
                    },
                    estimatedDurationMin: {
                      type: 'number',
                      minimum: 0,
                      description: 'Minimum estimated duration in minutes',
                    },
                    estimatedDurationMax: {
                      type: 'number',
                      minimum: 0,
                      description: 'Maximum estimated duration in minutes',
                    },
                  },
                },
                sorting: {
                  type: 'object',
                  description: 'Sorting options for search results',
                  properties: {
                    field: {
                      type: 'string',
                      enum: [
                        'relevance',
                        'title',
                        'status',
                        'priority',
                        'createdAt',
                        'updatedAt',
                      ],
                      default: 'relevance',
                    },
                    direction: {
                      type: 'string',
                      enum: ['asc', 'desc'],
                      default: 'desc',
                    },
                  },
                  required: ['field', 'direction'],
                },
                pagination: {
                  type: 'object',
                  description: 'Pagination options',
                  properties: {
                    limit: {
                      type: 'number',
                      minimum: 1,
                      maximum: 1000,
                      default: 50,
                    },
                    offset: {
                      type: 'number',
                      minimum: 0,
                      default: 0,
                    },
                  },
                },
                includeArchived: {
                  type: 'boolean',
                  description: 'Whether to include archived lists in search',
                  default: false,
                },
              },
              required: ['query'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name } = request.params;

      switch (name) {
        case 'create_todo_list':
          return await this.executeWithMonitoring(
            'create_todo_list',
            () => handleCreateTodoList(request, this.ensureTodoListManager()),
            request
          );

        case 'get_todo_list':
          return await this.executeWithMonitoring(
            'get_todo_list',
            () => handleGetTodoList(request, this.ensureTodoListManager()),
            request
          );

        case 'update_todo_list':
          return await this.executeWithMonitoring(
            'update_todo_list',
            () => handleUpdateTodoList(request, this.ensureTodoListManager()),
            request
          );

        case 'list_todo_lists':
          return await this.executeWithMonitoring(
            'list_todo_lists',
            () => handleListTodoLists(request, this.ensureTodoListManager()),
            request
          );

        case 'delete_todo_list':
          return await this.executeWithMonitoring(
            'delete_todo_list',
            () => handleDeleteTodoList(request, this.ensureTodoListManager()),
            request
          );

        case 'analyze_task_complexity':
          return await this.executeWithMonitoring(
            'analyze_task_complexity',
            () =>
              handleAnalyzeTaskComplexity(
                request,
                this.intelligenceManager,
                this.ensureTodoListManager()
              ),
            request
          );

        case 'search_todo_lists':
          return await this.executeWithMonitoring(
            'search_todo_lists',
            () => handleSearchTodoLists(request, this.ensureTodoListManager()),
            request
          );

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async start(): Promise<void> {
    try {
      // Initialize storage backend and managers
      const storageBackend = await StorageFactory.create(this.config.storage);
      this.todoListManager = new TodoListManager(storageBackend);

      // Initialize the todo list manager
      await this.todoListManager.initialize();

      // Start monitoring systems
      if (this.config.monitoring.enabled) {
        performanceMonitor.startMonitoring(
          this.config.monitoring.performanceInterval ?? 5000
        );
        memoryMonitor.startMonitoring(
          this.config.monitoring.memoryInterval ?? 10000
        );
        logger.info('Monitoring systems started');
      }

      // Create transport and connect
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      logger.info('MCP Task Manager server started successfully', {
        monitoring: this.config.monitoring.enabled,
        storage: this.config.storage.type,
        version: this.config.server.version,
      });
    } catch (error) {
      logger.error('Failed to start MCP Task Manager server', { error });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      return await this.ensureTodoListManager().healthCheck();
    } catch (error) {
      logger.error('Server health check failed', { error });
      return false;
    }
  }

  private async executeWithMonitoring<T>(
    operationName: string,
    operation: () => Promise<T>,
    request?: { params?: unknown }
  ): Promise<T> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
}

// Export the server class for CLI usage
export { McpTaskManagerServer };

// Start the server if this file is run directly
if (
  process.argv[1] !== undefined &&
  import.meta.url === `file://${process.argv[1]}`
) {
  const server = new McpTaskManagerServer();

  server.start().catch((error: unknown) => {
    logger.error('Failed to start server', { error });
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    process.exit(0);
  });
}
