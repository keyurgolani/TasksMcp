# Configuration Examples

This document provides examples of configuring and integrating the MCP Task Manager with various AI agents and environments.

## MCP Client Configuration

### Claude Desktop Configuration

Add to your Claude Desktop `mcp.json` configuration file:

**macOS**: `~/Library/Application Support/Claude/mcp.json`  
**Windows**: `%APPDATA%/Claude/mcp.json`  
**Linux**: `~/.config/claude/mcp.json`

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "~/.claude/task-manager-data"
      }
    }
  }
}
```

### Kiro IDE Configuration

Add to your workspace `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "/tmp/task-list-mcp-data"
      },
      "disabled": false,
      "autoApprove": [
        "create_list",
        "get_list",
        "list_all_lists",
        "delete_list",
        "add_task",
        "update_task",
        "remove_task",
        "complete_task",
        "set_task_priority",
        "add_task_tags",
        "remove_task_tags",
        "search_tasks",
        "filter_tasks",
        "show_tasks",
        "set_task_dependencies",
        "get_ready_tasks",
        "analyze_task_dependencies"
      ]
    }
  }
}
```

### Generic MCP Client Configuration

For other MCP clients:

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "/tmp/task-list-mcp-data",
        "STORAGE_TYPE": "file"
      },
      "disabled": false,
      "autoApprove": [
        "create_list",
        "get_list",
        "list_all_lists",
        "delete_list",
        "add_task",
        "update_task",
        "remove_task",
        "complete_task",
        "set_task_priority",
        "add_task_tags",
        "remove_task_tags",
        "search_tasks",
        "filter_tasks",
        "show_tasks",
        "set_task_dependencies",
        "get_ready_tasks",
        "analyze_task_dependencies"
      ]
    }
  }
}
```

## Environment Configuration

### Core Environment Variables

| Variable         | Required | Default       | Description                                              |
| ---------------- | -------- | ------------- | -------------------------------------------------------- |
| `NODE_ENV`       | No       | `development` | Environment mode: `development`, `production`, or `test` |
| `MCP_LOG_LEVEL`  | No       | `info`        | Logging level: `error`, `warn`, `info`, or `debug`       |
| `DATA_DIRECTORY` | No       | `./data`      | Directory for persistent data storage                    |
| `STORAGE_TYPE`   | No       | `file`        | Storage backend: `file` or `memory`                      |

### Environment-Specific Configuration

#### Development Environment

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "development",
        "MCP_LOG_LEVEL": "debug",
        "DATA_DIRECTORY": "./dev-data",
        "STORAGE_TYPE": "file"
      }
    }
  }
}
```

**Development Features:**

- Verbose debug logging for troubleshooting
- Local data directory for easy access
- Enhanced error messages and stack traces
- Automatic data validation and consistency checks

#### Production Environment

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "warn",
        "DATA_DIRECTORY": "/var/lib/task-manager",
        "STORAGE_TYPE": "file"
      }
    }
  }
}
```

**Production Features:**

- Minimal logging for performance
- Secure data directory with proper permissions
- Optimized error handling
- Automatic backup and recovery mechanisms

#### Testing Environment

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "test",
        "MCP_LOG_LEVEL": "error",
        "DATA_DIRECTORY": "/tmp/test-data",
        "STORAGE_TYPE": "memory"
      }
    }
  }
}
```

**Testing Features:**

- Memory-only storage for fast test execution
- Minimal logging to reduce test noise
- Automatic cleanup between test runs
- Deterministic behavior for reliable testing

## Deployment Approaches

### NPX (Recommended for Production)

Uses the published npm package, automatically handles installation and updates:

```json
{
  "command": "npx",
  "args": ["task-list-mcp@latest"]
}
```

**Benefits:**

- Automatic package management
- Easy version control (`@latest`, `@1.2.3`, etc.)
- No local build management required
- Standard for production MCP servers

### Local Build (Development)

Uses a locally built version from source:

```json
{
  "command": "node",
  "args": ["/path/to/project/dist/index.js"],
  "cwd": "/path/to/project"
}
```

**Benefits:**

- Full control over source code
- Immediate testing of changes
- No network dependencies
- Good for development and testing

### Global Installation

Installs the package globally and runs directly:

```json
{
  "command": "task-list-mcp"
}
```

**Benefits:**

- Fastest startup time
- No repeated downloads
- Simple command structure

**Setup:**

```bash
npm install -g task-list-mcp
```

## Multi-Agent Setup Examples

### Team Development Environment

**Project Manager Agent (Claude Desktop):**

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "/shared/project-data"
      }
    }
  }
}
```

**Developer Agent (Kiro IDE):**

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "development",
        "MCP_LOG_LEVEL": "debug",
        "DATA_DIRECTORY": "/shared/project-data"
      },
      "autoApprove": [
        "get_ready_tasks",
        "complete_task",
        "update_task",
        "add_task_tags"
      ]
    }
  }
}
```

### Specialized Agent Roles

**Frontend Development Agent:**

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "DATA_DIRECTORY": "/shared/frontend-tasks"
      },
      "autoApprove": ["get_ready_tasks", "filter_tasks", "complete_task"]
    }
  }
}
```

**Backend Development Agent:**

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "DATA_DIRECTORY": "/shared/backend-tasks"
      },
      "autoApprove": [
        "get_ready_tasks",
        "analyze_task_dependencies",
        "complete_task"
      ]
    }
  }
}
```

## Security Configuration

### Restricted Access Configuration

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "warn",
        "DATA_DIRECTORY": "/secure/task-data"
      },
      "autoApprove": ["get_list", "search_tasks", "filter_tasks", "show_tasks"],
      "disabledTools": ["delete_list"]
    }
  }
}
```

### Read-Only Configuration

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "STORAGE_TYPE": "file"
      },
      "autoApprove": [
        "get_list",
        "list_all_lists",
        "search_tasks",
        "filter_tasks",
        "show_tasks",
        "get_ready_tasks",
        "analyze_task_dependencies"
      ],
      "disabledTools": [
        "create_list",
        "delete_list",
        "add_task",
        "update_task",
        "remove_task",
        "complete_task",
        "set_task_priority",
        "add_task_tags",
        "remove_task_tags",
        "set_task_dependencies"
      ]
    }
  }
}
```

## Performance Configuration

### High-Performance Setup

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "error",
        "DATA_DIRECTORY": "/fast-ssd/task-data",
        "STORAGE_TYPE": "file",
        "MAX_CONCURRENT_OPERATIONS": "200",
        "PERFORMANCE_MONITORING": "false"
      }
    }
  }
}
```

### Memory-Optimized Setup

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "warn",
        "STORAGE_TYPE": "memory",
        "BACKUP_ENABLED": "false"
      }
    }
  }
}
```

## Troubleshooting Configuration

### Debug Configuration

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest", "--verbose"],
      "env": {
        "NODE_ENV": "development",
        "MCP_LOG_LEVEL": "debug",
        "DATA_DIRECTORY": "./debug-data",
        "STORAGE_TYPE": "file"
      }
    }
  }
}
```

### Validation Configuration

```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "test",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "/tmp/validation-test",
        "STORAGE_TYPE": "memory"
      },
      "autoApprove": []
    }
  }
}
```

## Configuration Validation

### Test Configuration

```bash
# Test server startup
npx task-list-mcp@latest --version

# Test with specific environment
NODE_ENV=production MCP_LOG_LEVEL=debug npx task-list-mcp@latest --help

# Validate data directory permissions
mkdir -p /path/to/data/directory
chmod 755 /path/to/data/directory
```

### Health Check

```bash
# Basic health check
curl http://localhost:3000/health

# Or use built-in health check
node -e "
const { spawn } = require('child_process');
const server = spawn('npx', ['task-list-mcp@latest']);
setTimeout(() => {
  server.kill();
  console.log('✅ Server started successfully');
}, 2000);
"
```

## Best Practices

### Environment Variables

- Use absolute paths for production data directories
- Set appropriate log levels for each environment
- Use memory storage only for testing
- Configure proper file permissions for data directories

### Auto-Approval Settings

- Start with minimal auto-approval for security
- Add tools gradually based on trust and usage patterns
- Use read-only configurations for monitoring agents
- Disable destructive operations in production

### Multi-Agent Coordination

- Use shared data directories for team collaboration
- Configure different log levels for different agent roles
- Set up role-based auto-approval lists
- Monitor resource usage across multiple agents

### Security

- Use restricted data directory permissions
- Disable unnecessary tools for specific use cases
- Monitor and log all operations in production
- Regular backup of data directories

These configuration examples provide a foundation for setting up the MCP Task Manager in various environments and use cases, from simple personal productivity to complex multi-agent enterprise workflows.
