# MCP Task Manager API Reference

## Overview

The MCP Task Manager provides a comprehensive set of MCP (Model Context Protocol) tools for intelligent task management. This API reference covers all available tools, their parameters, response formats, and usage examples.

## Base Configuration

### MCP Server Setup

The MCP Task Manager runs as an MCP server that communicates via the Model Context Protocol. Configure your MCP client to connect to the server:

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["/path/to/task-list-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "STORAGE_TYPE": "file",
        "DATA_DIRECTORY": "./data"
      }
    }
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE_TYPE` | `file` | Storage backend: `file`, `memory` |
| `DATA_DIRECTORY` | `./data` | Directory for file storage |
| `NODE_ENV` | `development` | Environment mode |
| `MAX_ITEMS_PER_LIST` | `1000` | Maximum items per todo list |
| `MAX_LISTS_PER_CONTEXT` | `100` | Maximum lists per context |

## Available Tools

### Core CRUD Operations

1. **[create_todo_list](./mcp-tools.md#create_todo_list)** - Create new todo lists with optional initial tasks
2. **[get_todo_list](./mcp-tools.md#get_todo_list)** - Retrieve todo lists with advanced filtering and pagination
3. **[update_todo_list](./mcp-tools.md#update_todo_list)** - Update lists with add/modify/remove/reorder operations
4. **[list_todo_lists](./mcp-tools.md#list_todo_lists)** - List all todo lists with filtering options
5. **[delete_todo_list](./mcp-tools.md#delete_todo_list)** - Delete or archive todo lists

### Advanced Features

6. **[analyze_task_complexity](./mcp-tools.md#analyze_task_complexity)** - AI-powered task complexity analysis and breakdown
7. **[search_todo_lists](./mcp-tools.md#search_todo_lists)** - Search across all lists with relevance scoring

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

### TodoList Object
```typescript
interface TodoList {
  id: string;                    // Unique identifier (UUID)
  title: string;                 // List title (1-200 chars)
  description?: string;          // Optional description (max 2000 chars)
  items: TodoItem[];            // Array of todo items
  createdAt: string;            // ISO datetime
  updatedAt: string;            // ISO datetime
  completedAt?: string;         // ISO datetime when all items completed
  context?: string;             // Project/context identifier
  isArchived: boolean;          // Archive status
  totalItems: number;           // Total number of items
  completedItems: number;       // Number of completed items
  progress: number;             // Completion percentage (0-100)
  analytics: ListAnalytics;     // Real-time analytics
}
```

### TodoItem Object
```typescript
interface TodoItem {
  id: string;                   // Unique identifier (UUID)
  title: string;                // Item title (1-200 chars)
  description?: string;         // Optional description (max 2000 chars)
  status: TaskStatus;           // Current status
  priority: number;             // Priority level (1-5)
  createdAt: string;           // ISO datetime
  updatedAt: string;           // ISO datetime
  completedAt?: string;        // ISO datetime when completed
  estimatedDuration?: number;   // Estimated duration in minutes
  tags: string[];              // Array of tags (max 20, each max 50 chars)
  dependencies: string[];       // Array of prerequisite item IDs
  assignee?: string;           // Assigned person/agent
}
```

### TaskStatus Enum
```typescript
enum TaskStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress", 
  COMPLETED = "completed",
  BLOCKED = "blocked",
  CANCELLED = "cancelled"
}
```

### ListAnalytics Object
```typescript
interface ListAnalytics {
  totalItems: number;
  completedItems: number;
  inProgressItems: number;
  blockedItems: number;
  progress: number;              // Percentage (0-100)
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
- **AI complexity analysis**: < 2 seconds

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
- **API Version**: 1.0.0 (stable)

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

- Review [MCP Tools Documentation](./mcp-tools.md) for detailed tool specifications
- Check [Error Handling Guide](./error-handling.md) for error management
- See [Examples](../examples/) for practical usage scenarios
- Visit [Development Guide](../development/) for integration details