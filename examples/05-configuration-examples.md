# MCP Configuration Examples

This document shows how to configure the MCP Task Manager server with different MCP clients and environments. Use these examples to set up the server for your specific needs, whether for development, production, or team collaboration.

## Claude Desktop Configuration

### Example 1: Basic Production Setup
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "warn",
        "DATA_DIRECTORY": "~/.claude/task-manager-data"
      }
    }
  }
}
```

### Example 2: Development Setup with Debug Logging
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "development",
        "MCP_LOG_LEVEL": "debug",
        "DATA_DIRECTORY": "~/Documents/task-manager-dev",
        "STORAGE_TYPE": "file"
      }
    }
  }
}
```

### Example 3: Local Development Build
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["/path/to/task-list-mcp/dist/cli.js"],
      "env": {
        "NODE_ENV": "development",
        "MCP_LOG_LEVEL": "debug",
        "DATA_DIRECTORY": "./data"
      }
    }
  }
}
```

### Example 4: Memory Storage for Testing
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "test",
        "MCP_LOG_LEVEL": "error",
        "STORAGE_TYPE": "memory"
      }
    }
  }
}
```

### Example 5: Custom Data Directory
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "/Users/username/Projects/task-data"
      }
    }
  }
}
```

## Kiro IDE Configuration

### Example 1: Full Auto-Approve Setup
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "./task-data"
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
        "search_tasks",
        "filter_tasks",
        "show_tasks",
        "analyze_task",
        "get_task_suggestions"
      ]
    }
  }
}
```

### Example 2: Selective Auto-Approve (Read-Only Operations)
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "./task-data"
      },
      "disabled": false,
      "autoApprove": [
        "get_list",
        "list_all_lists",
        "search_tasks",
        "filter_tasks",
        "show_tasks",
        "analyze_task",
        "get_task_suggestions"
      ]
    }
  }
}
```

### Example 3: Development with Local Build
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "node",
      "args": ["dist/cli.js"],
      "env": {
        "NODE_ENV": "development",
        "MCP_LOG_LEVEL": "debug",
        "DATA_DIRECTORY": "./data",
        "STORAGE_TYPE": "file"
      },
      "disabled": false,
      "autoApprove": [
        "create_list",
        "get_list",
        "list_all_lists",
        "add_task",
        "update_task",
        "complete_task",
        "search_tasks",
        "show_tasks"
      ]
    }
  }
}
```

### Example 4: Team Collaboration Setup
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "warn",
        "DATA_DIRECTORY": "/shared/team-tasks"
      },
      "disabled": false,
      "autoApprove": [
        "get_list",
        "list_all_lists",
        "add_task",
        "update_task",
        "complete_task",
        "set_task_priority",
        "add_task_tags",
        "search_tasks",
        "filter_tasks",
        "show_tasks"
      ]
    }
  }
}
```

### Example 5: Minimal Setup (Manual Approval)
```json
{
  "mcpServers": {
    "task-manager": {
      "command": "npx",
      "args": ["task-list-mcp@latest"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Environment Variables Reference

### Core Variables
- **NODE_ENV**: `development` | `production` | `test`
  - Controls logging verbosity and error handling
  - Default: `development`

- **MCP_LOG_LEVEL**: `error` | `warn` | `info` | `debug`
  - Sets logging verbosity level
  - Default: `info`

- **DATA_DIRECTORY**: Path to data storage directory
  - Will be created if it doesn't exist
  - Default: `./data`

- **STORAGE_TYPE**: `file` | `memory`
  - Storage backend selection
  - Default: `file`

### Platform-Specific Paths

#### macOS
- Claude Desktop: `~/Library/Application Support/Claude/mcp.json`
- User data: `~/.claude/task-manager-data`
- Shared data: `/Users/Shared/task-manager-data`

#### Windows
- Claude Desktop: `%APPDATA%/Claude/mcp.json`
- User data: `%USERPROFILE%/.claude/task-manager-data`
- Shared data: `C:/ProgramData/task-manager-data`

#### Linux
- Claude Desktop: `~/.config/claude/mcp.json`
- User data: `~/.local/share/task-manager-data`
- Shared data: `/opt/task-manager-data`

## Troubleshooting Configuration

### Common Issues and Solutions

#### Server Won't Start
```bash
# Test command accessibility
npx task-list-mcp@latest --version

# Check with explicit environment
NODE_ENV=development npx task-list-mcp@latest --version
```

#### Permission Errors
```bash
# Check directory permissions
ls -la ~/.claude/task-manager-data

# Create directory with proper permissions
mkdir -p ~/.claude/task-manager-data
chmod 755 ~/.claude/task-manager-data
```

#### JSON Syntax Errors
```bash
# Validate JSON syntax
cat ~/.config/claude/mcp.json | jq .

# Or use online JSON validator
```

#### Environment Variables Not Working
1. Verify JSON syntax in configuration
2. Restart MCP client after changes
3. Check client logs for parsing errors
4. Test environment variables directly:
   ```bash
   NODE_ENV=production MCP_LOG_LEVEL=debug npx task-list-mcp@latest --version
   ```

### Validation Commands

```bash
# Test server startup
npx task-list-mcp@latest --version

# Test with specific environment
NODE_ENV=production MCP_LOG_LEVEL=info npx task-list-mcp@latest --help

# Validate data directory
mkdir -p "$DATA_DIRECTORY" && echo "Directory OK" || echo "Directory Error"

# Check Node.js version (must be 18+)
node --version
```