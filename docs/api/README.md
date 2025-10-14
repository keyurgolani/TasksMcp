# API Reference

This section provides complete technical documentation for the MCP Task Manager API.

## 📚 API Documentation

### Core References

- **[MCP Tools](tools.md)** - Complete documentation of all 20 tools
- **[Tool Schemas](schemas.md)** - Parameter specifications and validation rules
- **[Error Handling](errors.md)** - Error codes, messages, and recovery strategies
- **[Response Formats](responses.md)** - Standard response structures and formats

### Specialized Topics

- **[Dependency Management](dependency-management.md)** - Task relationships and workflow optimization
- **[Tool Performance](tool-performance.md)** - Performance characteristics and optimization
- **[Enhanced Tools](enhanced-tools.md)** - Advanced features and capabilities

## 🚀 Quick Start

### MCP Server Configuration

Configure your MCP client to connect to the task manager:

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "~/.task-manager-data"
      }
    }
  }
}
```

### Environment Variables

| Variable         | Default       | Description                                           |
| ---------------- | ------------- | ----------------------------------------------------- |
| `NODE_ENV`       | `development` | Environment mode: `development`, `production`, `test` |
| `MCP_LOG_LEVEL`  | `info`        | Logging level: `error`, `warn`, `info`, `debug`       |
| `DATA_DIRECTORY` | `./data`      | Directory for persistent data storage                 |
| `STORAGE_TYPE`   | `file`        | Storage backend: `file`, `memory`                     |

## 🛠️ Available Tools

### Tool Categories

The MCP Task Manager provides **20 focused tools** organized in 6 categories:

- **[List Management](tools.md#list-management-tools)** (4 tools): Create, retrieve, list, delete task lists
- **[Task Management](tools.md#task-management-tools)** (6 tools): Add, update, remove, complete tasks and manage priorities/tags
- **[Search & Display](tools.md#search--display-tools)** (3 tools): Search, filter, and display tasks with formatting
- **[Advanced Features](tools.md#advanced-features-tools)** (2 tools): Task analysis and AI-generated suggestions
- **[Exit Criteria Management](tools.md#exit-criteria-management-tools)** (2 tools): Define and track detailed completion requirements
- **[Dependency Management](tools.md#dependency-management-tools)** (3 tools): Manage task relationships and workflow optimization

### Recommended Tools

**Tier 1: Essential Tools**

- `search_tool` - Unified search and filtering
- `add_task` - Comprehensive task creation
- `show_tasks` - Rich formatted display
- `complete_task` - Quality-enforced completion
- `create_list` - Clean list creation

**Tier 2: Workflow Optimization**

- `get_ready_tasks` - Daily workflow planning
- `analyze_task_dependencies` - Project management insights
- `bulk_task_operations` - Batch efficiency
- `set_task_exit_criteria` - Quality control
- **Task Management (7 tools)**: `add_task`, `update_task`, `remove_task`, `complete_task`, `set_task_priority`, `add_task_tags`, `remove_task_tags`
- **Search & Display (3 tools)**: `search_tasks`, `filter_tasks`, `show_tasks`
- **Advanced Features (2 tools)**: `analyze_task`, `get_task_suggestions`

### Legacy Complex Tools

The original complex tools are still available but not recommended for new integrations:

1. **[create_task_list](./mcp-tools.md#create_task_list)** - Create new task lists with optional initial tasks
2. **[get_task_list](./mcp-tools.md#get_task_list)** - Retrieve task lists with advanced filtering and pagination
3. **[update_task_list](./mcp-tools.md#update_task_list)** - Update lists with add/modify/remove operations
4. **[list_task_lists](./mcp-tools.md#list_task_lists)** - List all task lists with filtering options
5. **[delete_task_list](./mcp-tools.md#delete_task_list)** - Delete task lists permanently

6. **[search_task_lists](./mcp-tools.md#search_task_lists)** - Search across all lists with relevance scoring

## Response Format

All MCP tools return responses in the standard MCP format:

### Successful Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"id\":\"uuid\",\"title\":\"...\",\"items\":[...],\"progress\":0.5,...}"
    }
  ]
}
```

### Error Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: [specific error message]"
    }
  ],
  "isError": true
}
```

## Data Models

### TaskList Object

```typescript
interface TaskList {
  id: string; // Unique identifier (UUID)
  title: string; // List title (1-200 chars)
  description?: string; // Optional description (max 2000 chars)
  items: Task[]; // Array of tasks
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
  completedAt?: string; // ISO datetime when all items completed
  context?: string; // Project/context identifier
  isArchived: boolean; // Archive status
  totalItems: number; // Total number of items
  completedItems: number; // Number of completed items
  progress: number; // Completion percentage (0-100)
  analytics: ListAnalytics; // Real-time analytics
}
```

### Task Object

```typescript
interface Task {
  id: string; // Unique identifier (UUID)
  title: string; // Item title (1-200 chars)
  description?: string; // Optional description (max 2000 chars)
  status: TaskStatus; // Current status
  priority: number; // Priority level (1-5)
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
  completedAt?: string; // ISO datetime when completed
  estimatedDuration?: number; // Estimated duration in minutes
  tags: string[]; // Array of tags (max 20, each max 50 chars)
  dependencies: string[]; // Array of prerequisite item IDs
  assignee?: string; // Assigned person/agent
}
```

### TaskStatus Enum

```typescript
enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled',
}
```

### ListAnalytics Object

```typescript
interface ListAnalytics {
  totalItems: number;
  completedItems: number;
  inProgressItems: number;
  blockedItems: number;
  progress: number; // Percentage (0-100)
  averageCompletionTime: number; // Minutes
  estimatedTimeRemaining: number; // Minutes
  velocityMetrics: {
    itemsPerDay: number;
    completionRate: number;
  };
  complexityDistribution: Record<number, number>;
  tagFrequency: Record<string, number>;
}
```

## Authentication & Security

### Current Implementation

- **No authentication required** (suitable for development and trusted environments)
- **Input validation** on all parameters using Zod schemas
- **Rate limiting** configurable per deployment
- **Data isolation** by workspace/context

### Production Considerations

- Implement authentication middleware for production deployments
- Use HTTPS/TLS for encrypted communication
- Configure appropriate rate limits
- Set up audit logging for compliance

## Performance Characteristics

### Response Times

- **Basic CRUD operations**: ~5ms for create, ~2ms for read
- **Complex queries with filtering**: < 500ms
- **Bulk operations**: < 5 seconds

### Scalability Limits

- **Items per list**: 1,000 (configurable)
- **Lists per context**: 100 (configurable)
- **Concurrent operations**: 100+ simultaneous requests
- **Memory usage**: Stable under load, < 500MB typical

### Storage Performance

- **File storage**: Atomic operations with backup/rollback
- **Memory storage**: Fast operations, no persistence

## Error Handling

See [Error Handling Guide](./error-handling.md) for comprehensive error codes, handling patterns, and recovery strategies.

## Examples

See [MCP Tools Documentation](./mcp-tools.md) for detailed examples of each tool, including:

- Parameter specifications
- Request/response examples
- Error scenarios
- Usage patterns
- Best practices

## Version Compatibility

- **MCP Protocol**: Compatible with MCP SDK 1.0.0+
- **Node.js**: Requires Node.js 18.0.0+
- **TypeScript**: Built with TypeScript 5.0+
- **API Version**: 2.0.0 (stable)
- **Last Updated**: September 15, 2025

## Rate Limiting

Default rate limits (configurable):

- **Per client**: 1000 requests per minute
- **Per operation**: 100 requests per minute
- **Bulk operations**: 10 requests per minute

Configure via environment variables:

```bash
RATE_LIMIT_REQUESTS_PER_MINUTE=1000
RATE_LIMIT_BULK_REQUESTS_PER_MINUTE=10
```

## Health Monitoring

### Health Check Endpoint

The server provides health monitoring capabilities:

```bash
# Check server health
node dist/health-check.js

# Expected response
✅ HEALTHY - All systems operational
```

### Metrics Available

- Request count and response times
- Error rates by operation
- Memory usage and garbage collection
- Storage backend health
- Cache hit/miss ratios

## Next Steps

### For New Integrations (Recommended)

- Start with [Tools Documentation](../mcp-tools.md) for agent-friendly tools
- Review [Tool Schemas Reference](./tool-schemas.md) for quick parameter reference
- Check [Practical Examples](../examples/) for real-world usage scenarios

### For Legacy Integrations

- Review [MCP Tools Documentation](./mcp-tools.md) for detailed tool specifications
- Check [Error Handling Guide](./error-handling.md) for error management
- See [Examples](../examples/) for practical usage scenarios
- Visit [Development Guide](../development/) for integration details

### Migration

- Use the [Migration Guide](../mcp-tools.md#migration-from-complex-tools) to transition from complex tools
