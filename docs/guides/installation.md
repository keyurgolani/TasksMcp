# Installation Guide

This guide covers all installation methods for the Task MCP Unified system, from quick setup to development environments with both MCP and REST API servers.

## 🚀 Quick Installation (Recommended)

The fastest way to get started with the Task MCP Unified system:

### Method 1: Local Installation

```bash
# Clone the repository
git clone https://github.com/keyurgolani/task-list-mcp.git
cd task-list-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Test the installation
node mcp.js --help
node rest.js --help
```

This method:

- ✅ Full control over configuration
- ✅ Both MCP and REST API servers
- ✅ Domain-driven architecture
- ✅ Agent prompt template support
- ✅ Dependency management features

## 🔧 MCP Client Configuration

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/mcp.json`  
**Windows**: `%APPDATA%/Claude/mcp.json`  
**Linux**: `~/.config/claude/mcp.json`

```json
{
  "mcpServers": {
    "task-mcp-unified": {
      "command": "node",
      "args": ["/path/to/task-mcp-unified/mcp.js"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "~/.claude/task-mcp-unified-data"
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
    "task-mcp-unified": {
      "command": "node",
      "args": ["/path/to/task-mcp-unified/mcp.js"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "/tmp/task-mcp-unified-data"
      },
      "disabled": false,
      "autoApprove": [
        "create_list",
        "get_list",
        "list_all_lists",
        "delete_list",
        "add_task",
        "update_task",
        "get_agent_prompt",
        "remove_task",
        "complete_task",
        "set_task_priority",
        "add_task_tags",
        "remove_task_tags",
        "search_tool",
        "show_tasks",
        "set_task_dependencies",
        "get_ready_tasks",
        "analyze_task_dependencies",
        "set_task_exit_criteria",
        "update_exit_criteria"
      ]
    }
  }
}
```

### Generic MCP Client

For other MCP clients, use this configuration template:

```json
{
  "mcpServers": {
    "task-mcp-unified": {
      "command": "node",
      "args": ["/path/to/task-mcp-unified/mcp.js"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "info",
        "DATA_DIRECTORY": "/path/to/data/directory"
      }
    }
  }
}
```

## 🛠️ Development Installation

For development, customization, or contributing:

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **npm**: 7.0.0 or higher
- **Git**: Latest version

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/keyurgolani/task-list-mcp.git
cd task-list-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Test that everything works
npm test

# Run health check
npm run health
```

### Development Configuration

For development, use these environment variables:

```bash
export NODE_ENV=development
export MCP_LOG_LEVEL=debug
export DATA_DIRECTORY=./dev-data
```

### Development MCP Client Configuration

```json
{
  "mcpServers": {
    "task-mcp-unified-dev": {
      "command": "node",
      "args": ["/path/to/task-mcp-unified/mcp.js"],
      "env": {
        "NODE_ENV": "development",
        "MCP_LOG_LEVEL": "debug",
        "DATA_DIRECTORY": "./dev-data"
      }
    }
  }
}
```

### REST API Server Configuration

The REST API server can be configured via JSON/YAML files or environment variables:

```bash
# Start REST API server
node rest.js

# With custom configuration
PORT=4000 HOST=0.0.0.0 node rest.js
```

## 🔧 Environment Configuration

### Core Environment Variables

| Variable         | Required | Default       | Description                                              |
| ---------------- | -------- | ------------- | -------------------------------------------------------- |
| `NODE_ENV`       | No       | `development` | Environment mode: `development`, `production`, or `test` |
| `MCP_LOG_LEVEL`  | No       | `info`        | Logging verbosity: `error`, `warn`, `info`, or `debug`   |
| `DATA_DIRECTORY` | No       | `./data`      | Directory for persistent data storage                    |
| `STORAGE_TYPE`   | No       | `file`        | Storage backend: `file` or `memory`                      |

### Environment-Specific Configurations

#### Production Environment

```bash
export NODE_ENV=production
export MCP_LOG_LEVEL=warn
export DATA_DIRECTORY=/var/lib/task-manager
export STORAGE_TYPE=file
export BACKUP_ENABLED=true
```

**Features:**

- Minimal logging for performance
- Secure data directory with proper permissions
- Optimized error handling
- Automatic backup and recovery mechanisms

#### Development Environment

```bash
export NODE_ENV=development
export MCP_LOG_LEVEL=debug
export DATA_DIRECTORY=./dev-data
export STORAGE_TYPE=file
```

**Features:**

- Verbose debug logging for troubleshooting
- Local data directory for easy access
- Enhanced error messages and stack traces
- Automatic data validation and consistency checks

#### Testing Environment

```bash
export NODE_ENV=test
export MCP_LOG_LEVEL=error
export DATA_DIRECTORY=/tmp/test-data
export STORAGE_TYPE=memory
```

**Features:**

- Memory-only storage for fast test execution
- Minimal logging to reduce test noise
- Automatic cleanup between test runs
- Deterministic behavior for reliable testing

## ✅ Installation Verification

### Quick Version Check

```bash
# Test npx installation
npx task-list-mcp@latest --version

# Expected output:
# MCP Task Manager v2.3.0
# Node.js v18.x.x
# Platform: darwin arm64
```

### Test MCP Protocol

```bash
# Start the server and test basic functionality
npx task-list-mcp@latest --help
```

### Verify MCP Client Connection

After configuring your MCP client:

1. **Claude Desktop**: Restart Claude Desktop and look for the task-manager server in the available tools
2. **Kiro IDE**: Check the MCP Server view in the Kiro feature panel
3. **Custom client**: Send a `tools/list` request to verify the server responds

### Health Check

```bash
# For development installation
npm run health

# For npx installation
npx task-list-mcp@latest --health
```

Expected output:

```
✅ MCP Task Manager Health Check
✅ Server: Running
✅ Storage: Initialized
✅ Tools: 20 available
✅ Memory: 145MB used
✅ Performance: All systems normal
```

## 🚨 Troubleshooting Installation

### Common Issues

#### npx Installation Problems

```bash
# Check npm version (npm 7.0.0+ recommended)
npm --version

# Clear npm cache
npm cache clean --force

# Try with explicit version
npx task-list-mcp@latest --version

# If still failing, check Node.js version
node --version  # Must be 18.0.0+
```

#### Server Won't Start

```bash
# Test the server directly
npx task-list-mcp@latest --version

# Check with verbose logging
npx task-list-mcp@latest --verbose

# For local development
npm run build && node dist/cli.js --version
```

#### MCP Client Can't Connect

1. **Check configuration syntax**: Ensure JSON is valid
2. **Verify command paths**: `npx` must be in PATH
3. **Test server manually**: Run the command from terminal first
4. **Check client logs**: Look for connection errors in MCP client
5. **Restart client**: Restart Claude Desktop or Kiro after config changes

#### Permission Errors

```bash
# For npx (may need to fix npm permissions)
npm config get prefix
npm config set prefix ~/.npm-global

# For local development
chmod +x dist/cli.js
```

### Configuration Issues

#### Automatic Setup Fails

```bash
# Check if config directories exist
ls -la ~/Library/Application\ Support/Claude/  # macOS
ls -la ~/.kiro/settings/                       # Kiro workspace

# Create directories if missing
mkdir -p ~/Library/Application\ Support/Claude/
mkdir -p ~/.kiro/settings/
```

#### Server Not Found in MCP Client

1. **Restart the MCP client** after configuration changes
2. **Check server name** matches configuration (should be "task-manager")
3. **Verify command accessibility**: Run `npx task-list-mcp@latest --version` in terminal
4. **Check environment variables** in the configuration

### Data Directory Issues

#### Directory Creation

```bash
# Create data directory with proper permissions
mkdir -p ~/.local/share/task-manager
chmod 755 ~/.local/share/task-manager
```

#### Permission Problems

```bash
# Check directory permissions
ls -la /path/to/data/directory

# Fix permissions if needed
chmod 755 /path/to/data/directory
chown $USER /path/to/data/directory
```

#### Disk Space

```bash
# Check available disk space
df -h /path/to/data/directory

# Clean up old data if needed
rm -rf /path/to/data/directory/backups/old-*
```

## 🔄 Updates and Maintenance

### Updating npx Installation

```bash
# npx automatically uses the latest version
npx task-list-mcp@latest --version

# Force cache clear if needed
npm cache clean --force
npx task-list-mcp@latest --version
```

### Updating Global Installation

```bash
# Update to latest version
npm update -g task-list-mcp

# Or reinstall
npm uninstall -g task-list-mcp
npm install -g task-list-mcp
```

### Updating Development Installation

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Rebuild
npm run build

# Run tests
npm test
```

## 📊 System Requirements

### Minimum Requirements

- **Node.js**: 18.0.0 or higher
- **Memory**: 512MB RAM
- **Storage**: 100MB for application + data storage
- **OS**: Windows, macOS, or Linux

### Recommended for Production

- **Node.js**: 18.17.0 or higher
- **Memory**: 2GB+ RAM
- **Storage**: SSD with 1GB+ available space
- **OS**: Linux (Ubuntu 20.04+ or CentOS 8+)

### Performance Expectations

- **Response Time**: ~5ms for create operations, ~2ms for read operations
- **Throughput**: ~900 operations per second sustained
- **Memory Usage**: Stable under load, ~145MB typical usage
- **Data Volume**: Supports 1000+ items per task list, unlimited lists

## 🎯 Next Steps

After successful installation:

1. **[Getting Started Guide](getting-started.md)** - Learn the basics
2. **[Configuration Guide](configuration.md)** - Advanced configuration options
3. **[API Reference](../api/tools.md)** - Complete tool documentation
4. **[Examples](../examples/basic.md)** - Practical usage examples

## 📞 Getting Help

### Diagnostics

```bash
# Run comprehensive health check
npx task-list-mcp@latest --health

# Test with debug logging
export MCP_LOG_LEVEL=debug
npx task-list-mcp@latest --version

# Validate installation
npm run validate  # For development installation
```

### Support Resources

- **[Troubleshooting Guide](troubleshooting.md)** - Common issues and solutions
- **[FAQ](../reference/faq.md)** - Frequently asked questions
- **GitHub Issues** - Bug reports and feature requests
- **Documentation** - Comprehensive guides and examples

---

You're now ready to start using the MCP Task Manager! Continue with the [Getting Started Guide](getting-started.md) to learn the basics.
