# MCP Server and Client Integration

## Overview

The Task MCP Unified system implements the Model Context Protocol (MCP) to provide seamless integration with AI agents and development environments. This guide covers server setup, client configuration, and integration patterns.

## MCP Server Architecture

### Server Components

The MCP server consists of several key components:

- **Tool Definitions**: Schema definitions for all 20 available tools
- **Request Handlers**: Processing logic for each tool request
- **Validation Layer**: Input validation and error handling
- **Orchestration Interface**: Business logic and data access
- **Response Formatting**: Consistent response structure

### Server Startup

The MCP server starts automatically when invoked by an MCP client:

```bash
# Direct execution
node dist/app/cli.js

# Via NPX (recommended)
npx task-list-mcp@latest

# With environment variables
NODE_ENV=production MCP_LOG_LEVEL=info npx task-list-mcp@latest
```

### Environment Configuration

The server accepts configuration through environment variables:

```bash
export NODE_ENV=production
export MCP_LOG_LEVEL=info
export DATA_DIRECTORY=/path/to/data
export STORAGE_TYPE=file
```

## MCP Client Configuration

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/mcp.json`

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "~/.claude/task-data"
      }
    }
  }
}
```

### Kiro IDE

Add to your workspace `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "development",
        "MCP_LOG_LEVEL": "debug",
        "DATA_DIRECTORY": "/tmp/task-data"
      },
      "disabled": false,
      "autoApprove": [
        "create_list",
        "get_list",
        "add_task",
        "update_task",
        "complete_task",
        "search_tool",
        "show_tasks"
      ]
    }
  }
}
```

### Generic MCP Clients

For other MCP-compatible clients:

```json
{
  "servers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "DATA_DIRECTORY": "/path/to/data"
      }
    }
  }
}
```

## Tool Integration Patterns

### Basic Tool Usage

All tools follow consistent request/response patterns:

```json
{
  "method": "tools/call",
  "params": {
    "name": "create_list",
    "arguments": {
      "title": "My Project Tasks",
      "description": "Tasks for the new project",
      "projectTag": "web-development"
    }
  }
}
```

### Error Handling

The server provides comprehensive error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "❌ title: Required field missing\n💡 Provide a title for the task list\n📝 Example: \"My Project Tasks\"",
    "data": {
      "field": "title",
      "expectedType": "string",
      "actionableGuidance": "Provide a title for the task list"
    }
  }
}
```

### Parameter Preprocessing

The server automatically converts common AI agent patterns:

- String numbers: `"5"` → `5`
- JSON string arrays: `'["tag1", "tag2"]'` → `["tag1", "tag2"]`
- Boolean strings: `"true"` → `true`

## Multi-Agent Coordination

### Shared Data Directory

Multiple agents can share the same data directory for collaboration:

```json
{
  "mcpServers": {
    "task-manager-pm": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "DATA_DIRECTORY": "/shared/project-data",
        "MCP_LOG_LEVEL": "info"
      }
    },
    "task-manager-dev": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "DATA_DIRECTORY": "/shared/project-data",
        "MCP_LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Role-Based Auto-Approval

Configure different auto-approval lists for different agent roles:

```json
{
  "mcpServers": {
    "task-manager-readonly": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "autoApprove": [
        "get_list",
        "list_all_lists",
        "search_tool",
        "show_tasks",
        "get_ready_tasks",
        "analyze_task_dependencies"
      ],
      "disabledTools": [
        "create_list",
        "delete_list",
        "add_task",
        "remove_task",
        "complete_task"
      ]
    }
  }
}
```

## Performance Optimization

### Connection Management

- The server handles multiple concurrent connections efficiently
- Each tool call is processed independently
- No persistent state between requests

### Response Optimization

- The server provides direct responses without buffering
- Clients can implement their own optimization strategies
- Use appropriate `limit` parameters for large result sets

### Resource Usage

- Memory usage scales with data directory size
- CPU usage is minimal for typical operations
- Network overhead is low due to efficient JSON responses

## Security Considerations

### Data Directory Permissions

Ensure proper file system permissions:

```bash
# Create secure data directory
mkdir -p /secure/task-data
chmod 750 /secure/task-data
chown user:group /secure/task-data
```

### Environment Variables

Avoid hardcoding sensitive information:

```bash
# Use environment variables
export DATA_DIRECTORY=/secure/task-data
export MCP_LOG_LEVEL=warn

# Not recommended
# DATA_DIRECTORY=/path/with/secrets npx task-list-mcp@latest
```

### Network Security

- The MCP server communicates via stdio, not network ports
- No network exposure by default
- Client-server communication is local only

## Troubleshooting

### Common Issues

**Server Won't Start**

```bash
# Check Node.js version
node --version  # Should be >= 18

# Check package availability
npx task-list-mcp@latest --version

# Check permissions
ls -la /path/to/data/directory
```

**Tool Calls Failing**

```bash
# Enable debug logging
MCP_LOG_LEVEL=debug npx task-list-mcp@latest

# Check data directory
ls -la $DATA_DIRECTORY

# Verify JSON syntax in requests
```

**Performance Issues**

```bash
# Check data directory size
du -sh $DATA_DIRECTORY

# Monitor memory usage
ps aux | grep task-list-mcp

# Use appropriate limits
# {"name": "search_tool", "arguments": {"limit": 50}}
```

### Debug Configuration

For troubleshooting, use verbose logging:

```json
{
  "mcpServers": {
    "task-manager-debug": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "development",
        "MCP_LOG_LEVEL": "debug",
        "DATA_DIRECTORY": "/tmp/debug-data"
      }
    }
  }
}
```

### Log Analysis

The server provides structured logging:

```
[2024-01-15T10:30:00Z] INFO: MCP server started
[2024-01-15T10:30:01Z] DEBUG: Tool call received: create_list
[2024-01-15T10:30:01Z] DEBUG: Validation passed for create_list
[2024-01-15T10:30:01Z] INFO: List created: 123e4567-e89b-12d3-a456-426614174000
```

## Integration Examples

### Basic Workflow

1. **Start MCP client with server configuration**
2. **Create a task list**
3. **Add tasks with dependencies**
4. **Use search and filtering**
5. **Complete tasks and track progress**

### Advanced Patterns

- **Multi-agent collaboration** with shared data directories
- **Role-based access control** with auto-approval lists
- **Workflow automation** with dependency management
- **Progress tracking** with exit criteria and status updates

## Best Practices

### Configuration

- Use NPX for production deployments
- Set appropriate log levels for each environment
- Use absolute paths for data directories
- Configure proper file permissions

### Tool Usage

- Use `search_tool` for unified searching and filtering
- Implement proper error handling in client code
- Use appropriate limits for large result sets
- Follow the agent best practices methodology

### Multi-Agent Setup

- Share data directories for collaboration
- Use different log levels for different roles
- Configure role-appropriate auto-approval lists
- Monitor resource usage across agents

### Security

- Use restricted data directory permissions
- Avoid hardcoding sensitive information
- Monitor and log operations in production
- Regular backup of data directories

This guide provides the foundation for integrating the Task MCP Unified system with various MCP clients and development environments.
