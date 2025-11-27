# Task MCP Unified

> ⚠️ **MAINTENANCE NOTICE**: This project is currently undergoing major architectural reform to eliminate technical debt and ensure future scalability. During this period, breaking changes may occur. We recommend waiting for the next stable release before using in production environments.

A comprehensive Model Context Protocol (MCP) server that provides enterprise-grade task management capabilities for AI agents. Built with domain-driven architecture, featuring task orchestration, dependency management, and **multi-interface support** (MCP, REST API) for seamless AI integration.

## 🤖 Agent-Friendly Features

The Task MCP Unified system is specifically designed to work seamlessly with AI agents like Claude Desktop and Kiro IDE, featuring a **domain-driven architecture** with comprehensive orchestration layers for enterprise-grade task management and **multi-agent coordination environments** where multiple AI agents work together on complex projects.

### 📚 Essential for AI Agents

**All agents should review the [Agent Best Practices Guide](./docs/guides/agent-best-practices.md)** for proven methodologies that maximize effectiveness:

- **Plan and Reflect**: Thorough planning before action, reflection after completion
- **Use Tools, Don't Guess**: Always investigate using available tools rather than making assumptions
- **Persist Until Complete**: Ensure all exit criteria are met before marking tasks complete

Key agent-friendly improvements include:

### ✨ Smart Parameter Preprocessing

- **Automatic Type Conversion**: Converts common agent input patterns before validation
  - String numbers → Numbers: `"5"` becomes `5`
  - JSON strings → Arrays: `'["tag1", "tag2"]'` becomes `["tag1", "tag2"]`
  - Boolean strings → Booleans: `"true"` becomes `true`, `"yes"` becomes `true`
- **Backward Compatible**: Existing integrations continue to work without changes
- **Performance Optimized**: <50ms overhead per request

### 🎯 Enhanced Error Messages

- **Visual Indicators**: Clear error formatting with emojis (❌, 💡, 📝)
- **Actionable Guidance**: Specific suggestions on how to fix validation errors
- **Tool-Specific Help**: Context-aware error messages based on the tool being used
- **Working Examples**: Include actual usage examples in error responses

### 🤝 Multi-Agent Orchestration Support

- **Task Dependencies**: Set up complex task relationships with prerequisite management and circular dependency detection
- **Ready Task Discovery**: Find tasks that are unblocked and ready for parallel execution using dependency-based ordering
- **Agent Prompt Templates**: Customize AI agent prompts with variable substitution for different task types
- **Parallel Execution**: Multiple agents can work on independent tasks simultaneously through orchestration layer
- **Progress Tracking**: Monitor completion status across distributed agent workflows with exit criteria system

### 🔧 Common Agent Patterns Supported

```javascript
// These all work seamlessly now:
{
  "priority": "5",                    // String number → 5
  "tags": '["urgent", "important"]',  // JSON string → array
  "includeCompleted": "true",         // String boolean → true
  "estimatedDuration": "120"          // String number → 120
}
```

### 📊 Validation Improvements

- **80%+ Success Rate**: For valid agent input patterns requiring conversion
- **Clear Error Guidance**: Non-technical error messages with helpful suggestions
- **Enum Suggestions**: Provides valid options when invalid choices are made
- **Multiple Error Handling**: Clear formatting when multiple validation issues occur

**Before Agent-Friendly Updates:**

```
Error: Expected number, received string at priority
```

**After Agent-Friendly Updates:**

```
❌ priority: Expected number, but received string
💡 Use numbers 1-5, where 5 is highest priority
📝 Example: 5 (highest) to 1 (lowest)

🔧 Common fixes:
1. Use numbers 1-5 for priority
   Example: {"priority": 5}
```

## 🚀 Quick Start

### Method 1: MCP Server (Recommended)

Start the MCP server using the dedicated CLI:

```bash
# Start MCP server with environment configuration
node mcp.js

# Or with custom configuration
NODE_ENV=production DATA_DIRECTORY=/path/to/data node mcp.js
```

### Method 2: REST API Server

Start the REST API server for programmatic access:

```bash
# Start REST API server with JSON/YAML configuration
node rest.js

# Server will be available at http://localhost:3000 by default
```

### Method 3: Local Development Installation

For development or customization:

```bash
# Clone and install
git clone https://github.com/keyurgolani/task-list-mcp.git
cd task-list-mcp
npm install

# Build the project
npm run build

# Start MCP server
node mcp.js

# Or start REST API server
node rest.js
```

## ⚡ MCP Client Configuration

Configure your MCP clients to connect to the Task MCP Unified server:

## 🔧 Manual MCP Client Configuration

If you prefer manual configuration or the automatic setup doesn't work:

### Claude Desktop Configuration

Add to your Claude Desktop `mcp.json` configuration file:

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
        "DATA_DIRECTORY": "~/.claude/task-manager-data"
      }
    }
  }
}
```

**Environment Variables Explained:**

- `NODE_ENV`: Environment mode (development, production, test) - controls logging and error handling
- `MCP_LOG_LEVEL`: Logging verbosity (error, warn, info, debug) - set to "info" for normal operation
- `DATA_DIRECTORY`: Directory for persistent data storage - will be created if it doesn't exist

**Setup Validation:**

1. Save the configuration file
2. Restart Claude Desktop
3. Verify the task-manager server appears in available tools
4. Test with: "Create a simple task list to test the connection"

### Kiro IDE Configuration

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

**Environment Variables Explained:**

- `NODE_ENV`: Environment mode (development, production, test) - controls logging and error handling
- `MCP_LOG_LEVEL`: Logging verbosity (error, warn, info, debug) - set to "info" for normal operation
- `DATA_DIRECTORY`: Directory for persistent data storage - will be created if it doesn't exist

**Auto-Approve Tools:** All 15 available MCP tools are included for seamless AI agent integration. Remove tools from this list if you want manual approval for specific operations.

**Setup Validation:**

1. Save the configuration file to `.kiro/settings/mcp.json`
2. Check the MCP Server view in the Kiro feature panel
3. Verify the task-manager server shows as "Connected"
4. Test with: "Create a task list for testing the MCP connection"

### Direct Command Line Usage

```bash
# Start MCP server
node mcp.js

# Start REST API server
node rest.js

# With environment variables
NODE_ENV=production DATA_DIRECTORY=/custom/path node mcp.js
```

## 🔧 Environment Configuration

### Core Environment Variables

The Task MCP Unified system supports several environment variables to customize its behavior:

| Variable         | Required | Default       | Description                                              |
| ---------------- | -------- | ------------- | -------------------------------------------------------- |
| `NODE_ENV`       | No       | `development` | Environment mode: `development`, `production`, or `test` |
| `MCP_LOG_LEVEL`  | No       | `info`        | Logging verbosity: `error`, `warn`, `info`, or `debug`   |
| `DATA_DIRECTORY` | No       | `./data`      | Directory for persistent data storage                    |
| `STORAGE_TYPE`   | No       | `file`        | Storage backend: `file` or `memory`                      |

### Environment-Specific Configuration Examples

#### Development Environment

```json
{
  "mcpServers": {
    "task-mcp-unified": {
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

**Development Features:**

- Verbose debug logging for troubleshooting
- Local data directory for easy access
- Enhanced error messages and stack traces
- Automatic data validation and consistency checks

#### Production Environment

```json
{
  "mcpServers": {
    "task-mcp-unified": {
      "command": "node",
      "args": ["/path/to/task-mcp-unified/mcp.js"],
      "env": {
        "NODE_ENV": "production",
        "MCP_LOG_LEVEL": "warn",
        "DATA_DIRECTORY": "/var/lib/task-mcp-unified"
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
    "task-mcp-unified": {
      "command": "node",
      "args": ["/path/to/task-mcp-unified/mcp.js"],
      "env": {
        "NODE_ENV": "test",
        "MCP_LOG_LEVEL": "error",
        "DATA_DIRECTORY": "/tmp/task-mcp-unified-tests"
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

### Environment Variable Details

#### `NODE_ENV`

Controls the overall behavior and optimization level:

- **`development`**: Enhanced debugging, verbose logging, development-friendly error messages
- **`production`**: Optimized performance, minimal logging, production-ready error handling
- **`test`**: Fast execution, minimal output, deterministic behavior

#### `MCP_LOG_LEVEL`

Controls logging verbosity:

- **`error`**: Only critical errors (recommended for production)
- **`warn`**: Errors and warnings (good balance for most use cases)
- **`info`**: Errors, warnings, and informational messages (default)
- **`debug`**: All messages including detailed debugging information (development only)

#### `DATA_DIRECTORY`

Specifies where persistent data is stored:

- Must be writable by the process running the MCP server
- Will be created automatically if it doesn't exist
- Should be backed up regularly in production environments
- Use absolute paths for production deployments

#### `STORAGE_TYPE`

Selects the storage backend:

- **`file`**: Persistent file-based storage with atomic operations (default)
- **`memory`**: In-memory storage for testing and development (data lost on restart)

Note: Storage type is configured through the system configuration management domain.

### Configuration Troubleshooting

#### Common Configuration Issues

**Server Won't Start**

```bash
# Check if the server starts
node mcp.js

# Test with minimal configuration
NODE_ENV=development node mcp.js
```

**Permission Errors**

```bash
# Check directory permissions
ls -la /path/to/data/directory

# Create directory with proper permissions
mkdir -p ~/.local/share/task-manager
chmod 755 ~/.local/share/task-manager
```

**Environment Variable Not Working**

1. Verify JSON syntax in configuration file
2. Restart your MCP client after configuration changes
3. Check client logs for environment variable parsing errors
4. Test environment variables directly:
   ```bash
   NODE_ENV=production MCP_LOG_LEVEL=debug node mcp.js
   ```

**Data Directory Issues**

```bash
# Verify directory exists and is writable
test -w /path/to/data/directory && echo "Writable" || echo "Not writable"

# Check disk space
df -h /path/to/data/directory

# Check for permission issues
ls -la /path/to/data/directory
```

#### Validation Steps

1. **Test Configuration Syntax**

   ```bash
   # Validate JSON syntax
   cat ~/.config/claude/mcp.json | jq .
   ```

2. **Verify Server Startup**

   ```bash
   # Test server starts with your configuration
   node mcp.js
   ```

3. **Check Environment Variables**

   ```bash
   # Test with explicit environment variables
   NODE_ENV=production MCP_LOG_LEVEL=info node mcp.js
   ```

4. **Validate Data Directory**

   ```bash
   # Ensure directory is accessible
   mkdir -p "$DATA_DIRECTORY" && echo "Directory OK" || echo "Directory Error"
   ```

5. **Test MCP Client Connection**
   - Restart your MCP client after configuration changes
   - Look for the task-manager server in available tools
   - Try creating a simple task list to verify functionality

## 🛠️ Available MCP Tools

The Task MCP Unified system provides **17 focused MCP tools** organized into 5 categories for intelligent task management and multi-agent orchestration:

### List Management (4 tools)

1. **`create_list`** - Create new task lists with simple parameters
2. **`get_list`** - Retrieve a specific task list by ID with optional filtering
3. **`list_all_lists`** - Get all task lists with basic information and filtering
4. **`delete_list`** - Delete a task list permanently

### Task Management (7 tools)

5. **`add_task`** - Add new tasks with priority, tags, dependencies, exit criteria, and agent prompt templates
6. **`update_task`** - Update task properties (title, description, duration, exit criteria, agent prompts)
7. **`get_agent_prompt`** - Get rendered agent prompt with variable substitution for multi-agent environments
8. **`remove_task`** - Remove tasks from lists
9. **`complete_task`** - Mark tasks as completed with automatic progress tracking
10. **`set_task_priority`** - Change task priority levels (1-5 scale)
11. **`add_task_tags`** - Add organizational tags to tasks
12. **`remove_task_tags`** - Remove organizational tags from tasks
    - **Automatic Blocking Detection**: Tasks automatically show why they're blocked by dependencies

### Search & Display (2 tools)

13. **`search_tool`** - Unified search and filtering with comprehensive criteria support
14. **`show_tasks`** - Display formatted task lists with grouping and styling options

### Dependency Management (3 tools)

15. **`set_task_dependencies`** - Set task prerequisites and relationships for workflow management
16. **`get_ready_tasks`** - Find tasks ready for execution (no incomplete dependencies)
17. **`analyze_task_dependencies`** - Analyze project structure, critical paths, and bottlenecks with **DAG visualization**

### Exit Criteria Management (2 tools)

18. **`set_task_exit_criteria`** - Define specific completion requirements for quality control
19. **`update_exit_criteria`** - Track progress on individual exit criteria throughout task execution

### Removed Features

The following features have been completely removed from the system as part of the architectural cleanup:

- **Intelligence Tools**: Task suggestion features, task complexity evaluation features, and AI-powered recommendations have been removed
- **Monitoring Systems**: Performance monitoring, alerting, and resource usage tracking
- **Statistics Management**: Task statistics calculation and reporting
- **Caching Systems**: All caching implementations have been removed
- **Bulk Operations in MCP**: Bulk operations are only available through the REST API
- **Task Ordering**: Tasks are now ordered by dependencies only, not manual ordering
- **Archiving**: Only permanent deletion is supported

### Quick Examples

#### `create_list`

Creates a new task list with simple parameters.

```json
{
  "name": "create_list",
  "arguments": {
    "title": "My Project Tasks",
    "description": "Tasks for the new project",
    "projectTag": "project-alpha"
  }
}
```

#### `add_task`

Adds a new task to a task list.

```json
{
  "name": "add_task",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "title": "Set up development environment",
    "description": "Install Node.js, npm, and project dependencies",
    "priority": 4,
    "estimatedDuration": 60,
    "tags": ["setup", "development"]
  }
}
```

#### `get_list`

Retrieves a specific task list by ID.

```json
{
  "name": "get_list",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "includeCompleted": false
  }
}
```

### 📖 Documentation

For complete documentation:

- **[Installation Guide](./docs/guides/installation.md)** - Setup and configuration
- **[Getting Started](./docs/guides/getting-started.md)** - Basic usage tutorial
- **[API Reference](./docs/api/tools.md)** - Complete tool documentation
- **[Examples](./docs/examples/)** - Usage examples and patterns
- **[Troubleshooting](./docs/guides/troubleshooting.md)** - Common issues and solutions

**See:** [docs/readme.md](./docs/readme.md) - Complete Documentation Index

## 🤖 Multi-Agent Orchestration

The MCP Task Manager is uniquely designed to support **multi-agent environments** where an orchestration agent coordinates multiple specialized agents working on different tasks in parallel.

### Key Orchestration Features

#### Task Dependency Management

- **Set Prerequisites**: Define which tasks must be completed before others can begin
- **Prevent Conflicts**: Automatic circular dependency detection and prevention
- **Workflow Control**: Ensure proper task sequencing across multiple agents
- **DAG Visualization**: Visual representation of task dependencies in multiple formats

#### Ready Task Discovery

- **Find Available Work**: Identify tasks with no incomplete dependencies
- **Dependency-Based Ordering**: Get ready tasks based on dependency completion
- **Parallel Execution**: Multiple agents can work on independent ready tasks simultaneously

#### Project Analysis & Optimization

- **Critical Path Analysis**: Identify the longest chain of dependent tasks
- **Bottleneck Detection**: Find tasks that block multiple others
- **Progress Monitoring**: Track completion status across distributed workflows
- **Visual DAG Analysis**: ASCII, DOT (Graphviz), and Mermaid format dependency graphs

### Multi-Agent Workflow Example

```json
// 1. Orchestration agent sets up task dependencies
{
  "name": "set_task_dependencies",
  "arguments": {
    "listId": "web-app-project",
    "taskId": "deploy-frontend",
    "dependencyIds": ["build-ui", "run-tests", "code-review"]
  }
}

// 2. Orchestration agent finds ready tasks for assignment
{
  "name": "get_ready_tasks",
  "arguments": {
    "listId": "web-app-project",
    "limit": 5
  }
}
// Returns: ["setup-database", "write-docs", "design-api"]

// 3. Orchestration agent assigns tasks to specialized agents:
// - Database Agent → "setup-database"
// - Documentation Agent → "write-docs"
// - API Agent → "design-api"

// 4. As tasks complete, more become ready for assignment
// 5. Process continues until all tasks are completed
```

### Benefits for Multi-Agent Systems

- **Increased Throughput**: Multiple agents work in parallel on independent tasks
- **Optimal Resource Utilization**: No agent waits unnecessarily for blocked tasks
- **Intelligent Scheduling**: Automatic identification of the most impactful work
- **Scalable Coordination**: Handles complex projects with hundreds of interdependent tasks
- **Fault Tolerance**: Failed tasks don't block unrelated work streams

### Supported Multi-Agent Patterns

- **Specialized Agent Teams**: Different agents for frontend, backend, testing, documentation
- **Pipeline Processing**: Sequential stages with parallel work within each stage
- **Feature Teams**: Multiple agents working on different features simultaneously
- **Quality Gates**: Dependency-based approval workflows with multiple reviewers

This makes the MCP Task Manager ideal for:

- **Large Development Projects** with multiple specialized AI agents
- **Content Creation Pipelines** with writers, editors, and publishers
- **Research Projects** with data collection, analysis, and reporting agents
- **Business Process Automation** with multiple workflow participants

**For complete multi-agent orchestration documentation, see:** [docs/guides/multi-agent.md](./docs/guides/multi-agent.md)

## 🧪 Testing Your Installation

### Quick Health Check

```bash
# Test MCP server startup
node mcp.js

# Test REST API server startup
node rest.js

# Run health check
npm run health
```

### Test MCP Protocol

```bash
# Start the MCP server and test basic functionality
node mcp.js

# In another terminal, test the REST API
curl http://localhost:3000/health
```

### Verify MCP Client Connection

After configuring your MCP client:

1. **Claude Desktop**: Restart Claude Desktop and look for the task-mcp-unified server in the available tools
2. **Kiro IDE**: Check the MCP Server view in the Kiro feature panel
3. **Custom client**: Send a `tools/list` request to verify the server responds

### Development Testing (Local Installation)

```bash
# Run health check
npm run health

# Run all tests
npm run test:run

# Run tests with coverage
npm run test:coverage
```

## 📋 Usage Examples

### Creating Your First Task List

Once configured in your MCP client, you can use natural language:

**In Claude Desktop:**

> "Create a task list called 'Website Redesign' with tasks for planning, design, and development"

**In Kiro IDE:**

> "I need a task list for my API project with initial setup tasks"

The MCP server will automatically:

- Create structured task lists with proper metadata
- Generate unique IDs for tracking
- Calculate progress and completion statistics
- Store data persistently using file-based storage with atomic operations

### Retrieving Task Lists

> "Show me the task list with ID abc-123-def"
> "Get my project tasks but exclude completed items"

## 🔧 Development

### Development Commands

```bash
# Build the project
npm run build

# Start the server
npm start
```

### Development Workflow

1. **Make changes** to source code in `src/`
2. **Build for production**: `npm run build`
3. **Test MCP integration**: Use manual protocol test with your MCP client

## 📁 Project Structure

```
src/
├── api/                    # Interface layer (MCP, REST)
│   ├── handlers/          # MCP tool implementations (17 tools)
│   ├── mcp/              # MCP server and tools
│   ├── rest/             # REST API server and routes
│   └── tools/            # Tool definitions and schemas
├── core/                  # Core orchestration layer
│   └── orchestration/    # Business logic orchestrators
├── domain/               # Domain models and business logic
│   ├── models/          # Task and TaskList models
│   ├── tasks/           # Task-specific domain logic
│   └── repositories/    # Repository interfaces
├── data/                 # Data layer
│   ├── access/          # Data access implementations
│   └── delegation/      # Data delegation service
├── infrastructure/       # Infrastructure concerns
│   ├── config/          # Configuration management
│   └── storage/         # Storage backends
├── shared/              # Shared utilities and types
│   ├── types/           # TypeScript interfaces
│   ├── utils/           # Utility functions
│   └── errors/          # Error handling
└── app/                 # Application entry points
    ├── cli.ts           # Main CLI interface
    ├── health-check.ts  # Health check utilities
    └── server.ts        # Server initialization

mcp.js                   # MCP server CLI
rest.js                  # REST API server CLI

docs/
├── api/                 # API documentation
├── guides/              # User guides
├── examples/            # Usage examples
└── reference/           # Reference materials
```

## Quality Standards

This project follows enterprise-grade standards:

- **Zero TypeScript errors**: Strict mode enabled with comprehensive checks and no `any` types
- **Domain-Driven Architecture**: Clean separation of concerns with orchestration layers
- **MCP Protocol Compliance**: All tools follow MCP specification with enhanced error handling
- **Comprehensive Testing**: 95% line coverage, 90% branch coverage requirements
- **Production Ready**: Optimized for performance and reliability with proper error handling

## 🚨 Troubleshooting

### Installation Issues

#### Node.js and Dependencies

```bash
# Check Node.js version (18.0.0+ required)
node --version

# Install dependencies
npm install

# Build the project
npm run build

# Test the build
node mcp.js
```

### Server Issues

#### Server Won't Start

```bash
# Test the MCP server directly
node mcp.js

# Test the REST API server
node rest.js

# Check with verbose logging
MCP_LOG_LEVEL=debug node mcp.js

# For local development
npm run build && node mcp.js
```

#### MCP Client Can't Connect

1. **Check configuration syntax**: Ensure JSON is valid
2. **Verify command paths**: `node` must be in PATH and path to mcp.js must be correct
3. **Test server manually**: Run `node mcp.js` from terminal first
4. **Check client logs**: Look for connection errors in MCP client
5. **Restart client**: Restart Claude Desktop or Kiro after config changes

#### Permission Errors

```bash
# For local development
chmod +x mcp.js
chmod +x rest.js

# Check data directory permissions
mkdir -p /path/to/data/directory
chmod 755 /path/to/data/directory
```

### Configuration Issues

#### Configuration Issues

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
2. **Check server name** matches configuration (should be "task-mcp-unified")
3. **Verify command accessibility**: Run `node mcp.js` in terminal
4. **Check environment variables** in the configuration
5. **Verify file paths**: Ensure the path to mcp.js is correct in the configuration

### Getting Help

1. **Test installation**: `node mcp.js` and `node rest.js`
2. **Check verbose logs**: Set `MCP_LOG_LEVEL=debug` to see detailed output
3. **Validate configuration**: Check JSON syntax and file paths
4. **Check prerequisites**: Ensure Node.js 18+ and npm are installed
5. **Review client logs**: Check your MCP client's log files for connection errors
6. **Run health check**: `npm run health` to verify system status

### Common Error Messages

- **"command not found: node"** → Install Node.js 18+
- **"EACCES: permission denied"** → Fix file permissions with `chmod +x`
- **"Module not found"** → Run `npm install` and `npm run build`
- **"Connection refused"** → Check if server starts manually with `node mcp.js`
- **"Cannot find module"** → Ensure project is built with `npm run build`

## 📊 Performance & Limitations

### Current Implementation Status

- **Domain-driven architecture**: Clean separation with orchestration layers
- **File-based storage**: Persistent storage with atomic operations and backup capabilities
- **Memory storage option**: Available for development and testing
- **Complete CRUD operations**: Full create, read, update, delete functionality through orchestration
- **Multi-interface support**: Both MCP and REST API servers
- **Agent prompt templates**: Variable substitution for multi-agent environments
- **Dependency management**: Circular dependency detection and ready task identification
- **No authentication**: Open access (suitable for development only)

### Performance Characteristics

- **Response time**: ~5ms for create operations, ~2ms for read operations
- **Template rendering**: <10ms for simple templates, <50ms for complex templates
- **Dependency analysis**: O(n) circular dependency detection
- **Concurrent operations**: Supports 100+ simultaneous requests
- **Memory usage**: Stable under load, ~145MB typical usage
- **Data volume**: Supports 1000+ items per task list, unlimited lists
- **Throughput**: ~900 operations per second sustained
- **Storage**: Atomic file operations with backup and recovery

## 🛣️ Roadmap

### Current Status (v2.5.0) ✅

- **Complete**: 17 focused MCP tools for comprehensive task management
- **Complete**: Domain-driven architecture with orchestration layers
- **Complete**: Agent prompt template system with variable substitution
- **Complete**: Circular dependency detection and management
- **Complete**: File-based storage with atomic operations and backup
- **Complete**: Comprehensive error handling and recovery systems
- **Complete**: Multi-interface support (MCP and REST API servers)
- **Complete**: Production-ready CLI interfaces and configuration

### Phase 2: Enhanced Features (Future)

- React UI domain with Storybook design system
- Advanced search indexing and performance optimization
- Enhanced agent prompt template features
- Additional REST API endpoints for bulk operations

### Phase 3: Production Features (Future)

- Database backend support (PostgreSQL, MongoDB)
- Authentication and authorization systems
- Rate limiting and security hardening
- Real-time collaboration features
- REST API interface alongside MCP

### Phase 4: Enterprise Readiness (Future)

- Advanced analytics and reporting dashboards
- Multi-tenant support with data isolation
- API rate limiting and monitoring
- Integration with external project management tools

## 📦 Installation Methods Summary

| Method    | Command                    | Use Case                   | Prerequisites    |
| --------- | -------------------------- | -------------------------- | ---------------- |
| **npx**   | `npx task-list-mcp@latest` | Quick start, always latest | Node.js 18+, npm |
| **Local** | `git clone && npm install` | Development, customization | Node.js 18+, git |

### Implementation Status

- ✅ **17 MCP Tools**: Complete tool set organized in 5 categories
- ✅ **Domain-Driven Architecture**: Clean separation with orchestration layers
- ✅ **MCP Protocol**: Fully compliant with MCP SDK 1.0.0+
- ✅ **Multi-Interface Support**: Both MCP and REST API servers
- ✅ **Agent Prompt Templates**: Variable substitution for multi-agent environments
- ✅ **Dependency Management**: Circular dependency detection and ready task identification
- ✅ **CLI Interfaces**: Separate MCP and REST server CLIs
- ✅ **Storage Systems**: File and memory storage with atomic operations
- ✅ **Error Handling**: Comprehensive error handling with recovery mechanisms
- ✅ **TypeScript**: Strict TypeScript with zero `any` types and comprehensive testing
- ✅ **Production Ready**: Optimized for performance and reliability
- ✅ **Documentation**: Complete API documentation and examples

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and ensure they build: `npm run build`
4. Commit your changes: `git commit -m 'feat: add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Development Standards

- **TypeScript strict mode**: No `any` types allowed
- **MCP protocol compliance**: All tools must follow MCP specification
- **Production ready**: Optimized for performance and reliability
