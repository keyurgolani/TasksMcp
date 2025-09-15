# MCP Task Manager - AI Agent Configuration Guide

## Overview

The MCP Task Manager is a production-ready Model Context Protocol (MCP) server that provides intelligent task management capabilities specifically designed for AI agents. This comprehensive guide covers the available MCP tools, configuration options, and AI agent integration patterns.

**Key Features:**
- 15 focused MCP tools for task management operations
- AI-powered complexity analysis and task suggestions
- Simple, agent-friendly tool schemas with minimal parameters
- Persistent file-based storage with atomic operations
- Natural language usage patterns optimized for AI agents
- Comprehensive search, filtering, and display capabilities

## Quick Setup for AI Agents

### Method 1: Install via npx (Recommended)

The fastest way to get started - no local installation required:

```bash
# Test the installation
npx task-list-mcp@latest --version

# Install the package
npx task-list-mcp@latest
```

### Method 2: Local Development Installation

For development or customization:

```bash
# Clone and setup
git clone https://github.com/keyurgolani/task-list-mcp.git
cd task-list-mcp
npm install && npm run build

# Validate server is working
npx task-list-mcp@latest --version
```

## MCP Client Configuration

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/mcp.json` (macOS) or `%APPDATA%/Claude/mcp.json` (Windows):

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

Add to workspace `.kiro/settings/mcp.json`:

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

## Environment Variables

### Core Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode: `development`, `production`, or `test` |
| `MCP_LOG_LEVEL` | No | `info` | Logging level: `error`, `warn`, `info`, or `debug` |
| `DATA_DIRECTORY` | No | `./data` | Directory for persistent data storage |
| `STORAGE_TYPE` | No | `file` | Storage backend: `file` or `memory` |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_CONCURRENT_OPERATIONS` | `100` | Maximum concurrent operations |
| `BACKUP_ENABLED` | `true` | Enable automatic backups |
| `PERFORMANCE_MONITORING` | `false` | Enable performance tracking |

### Environment-Specific Configuration

**Development Environment:**
```bash
export NODE_ENV=development
export MCP_LOG_LEVEL=debug
export DATA_DIRECTORY=./dev-data
export STORAGE_TYPE=file
```

**Production Environment:**
```bash
export NODE_ENV=production
export MCP_LOG_LEVEL=info
export DATA_DIRECTORY=/var/lib/task-list-mcp/data
export STORAGE_TYPE=file
export BACKUP_ENABLED=true
```

**Testing Environment:**
```bash
export NODE_ENV=test
export MCP_LOG_LEVEL=warn
export STORAGE_TYPE=memory
```
## Complete MCP Tool Reference

The MCP Task Manager provides 15 focused, easy-to-use tools organized into 4 categories. Each tool has a single, clear purpose with minimal required parameters.

### List Management Tools (4 tools)

#### 1. create_list
**Purpose:** Create new todo lists with simple parameters.

**Basic Example:**
```json
{
  "name": "create_list",
  "arguments": {
    "title": "Website Redesign Project",
    "description": "Complete redesign of company website with modern UI/UX",
    "projectTag": "web-development"
  }
}
```

#### 2. get_list
**Purpose:** Retrieve a specific todo list by ID.

**Basic Example:**
```json
{
  "name": "get_list",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "includeCompleted": false
  }
}
```

#### 3. list_all_lists
**Purpose:** Get all todo lists with basic information.

**Basic Example:**
```json
{
  "name": "list_all_lists",
  "arguments": {
    "projectTag": "web-development",
    "limit": 10
  }
}
```

#### 4. delete_list
**Purpose:** Delete or archive a todo list.

**Basic Example:**
```json
{
  "name": "delete_list",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "permanent": false
  }
}
```

### Task Management Tools (6 tools)

#### 5. add_task
**Purpose:** Add a new task to a todo list.

**Basic Example:**
```json
{
  "name": "add_task",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "title": "Design database schema",
    "description": "Create ERD and define table structures",
    "priority": 5,
    "estimatedDuration": 240,
    "tags": ["database", "design", "planning"]
  }
}
```

#### 6. update_task
**Purpose:** Update basic task properties.

**Basic Example:**
```json
{
  "name": "update_task",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "taskId": "87654321-4321-4321-4321-210987654321",
    "title": "Updated: Design comprehensive database schema",
    "estimatedDuration": 300
  }
}
```

#### 7. remove_task
**Purpose:** Remove a task from a todo list.

**Basic Example:**
```json
{
  "name": "remove_task",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "taskId": "87654321-4321-4321-4321-210987654321"
  }
}
```

#### 8. complete_task
**Purpose:** Mark a task as completed.

**Basic Example:**
```json
{
  "name": "complete_task",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "taskId": "87654321-4321-4321-4321-210987654321"
  }
}
```

#### 9. set_task_priority
**Purpose:** Change task priority.

**Basic Example:**
```json
{
  "name": "set_task_priority",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "taskId": "87654321-4321-4321-4321-210987654321",
    "priority": 5
  }
}
```

#### 10. add_task_tags
**Purpose:** Add tags to a task.

**Basic Example:**
```json
{
  "name": "add_task_tags",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "taskId": "87654321-4321-4321-4321-210987654321",
    "tags": ["urgent", "client-facing"]
  }
}
```

### Search & Display Tools (3 tools)

#### 11. search_tasks
**Purpose:** Search tasks by text query.

**Basic Example:**
```json
{
  "name": "search_tasks",
  "arguments": {
    "query": "database schema",
    "limit": 10
  }
}
```

#### 12. filter_tasks
**Purpose:** Filter tasks by specific criteria.

**Basic Example:**
```json
{
  "name": "filter_tasks",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "status": "pending",
    "priority": 4
  }
}
```

#### 13. show_tasks
**Purpose:** Display tasks in formatted output.

**Basic Example:**
```json
{
  "name": "show_tasks",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "format": "detailed",
    "groupBy": "priority",
    "includeCompleted": false
  }
}
```

### Advanced Features Tools (2 tools)

#### 14. analyze_task
**Purpose:** Analyze task complexity and get suggestions.

**Basic Example:**
```json
{
  "name": "analyze_task",
  "arguments": {
    "taskDescription": "Implement user authentication with OAuth2 and JWT tokens",
    "context": "Node.js web application",
    "maxSuggestions": 5
  }
}
```

#### 15. get_task_suggestions
**Purpose:** Get AI-generated task suggestions for a list.

**Basic Example:**
```json
{
  "name": "get_task_suggestions",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "style": "practical",
    "maxSuggestions": 5
  }
}
```

For complete tool schemas, parameter details, and advanced examples, see [docs/mcp-tools.md](./docs/mcp-tools.md).

## AI Agent Integration Patterns

### Tool Selection Decision Trees

#### Creating Todo Lists
**User Intent Patterns:**
- "Create a todo list for [project]" → `create_list`
- "Set up a project plan for [description]" → `create_list` + `add_task` for each task
- "I need a task list for [context]" → `create_list`

**Decision Logic:**
```
IF user mentions "create", "new", "setup", "start" + "todo", "list", "project"
THEN use create_list
  IF user mentions project/context
  THEN include projectTag parameter
  IF user provides task details
  THEN follow up with add_task calls
```

#### Retrieving Information
**User Intent Patterns:**
- "Show me [project] tasks" → `get_list` or `filter_tasks` by project
- "What's the status of [list]?" → `get_list` with basic parameters
- "Show me all my projects" → `list_all_lists`
- "List all my projects" → `list_all_lists`
- "Find all tasks about [topic]" → `search_tasks`
- "Find tasks about [topic]" → `search_tasks`
- "Search for [keyword]" → `search_tasks`

**Decision Logic:**
```
IF user wants specific list AND has list ID
THEN use get_list
ELSE IF user wants to find/search tasks OR mentions "find all tasks about"
THEN use search_tasks
ELSE IF user wants overview/all lists OR mentions "show me all my projects"
THEN use list_all_lists
```

#### Modifying Tasks
**User Intent Patterns:**
- "Add a task [description]" → `add_task`
- "Mark [task] as completed" → `complete_task`
- "Update [task] priority to high" → `set_task_priority`
- "Remove [task]" → `remove_task`
- "Add tags to [task]" → `add_task_tags`

**Decision Logic:**
```
IF user mentions "add", "create new task"
THEN use add_task
ELSE IF user mentions "mark as", "complete", "done"
THEN use complete_task
ELSE IF user mentions "priority", "set priority"
THEN use set_task_priority
ELSE IF user mentions "remove", "delete task"
THEN use remove_task
ELSE IF user mentions "tag", "add tags"
THEN use add_task_tags
ELSE IF user mentions "update", "change", "modify"
THEN use update_task
```

#### Analyzing Complexity
**User Intent Patterns:**
- "How complex is [task]?" → `analyze_task`
- "Break down this project: [description]" → `analyze_task`
- "Is this task simple or complex?" → `analyze_task`
- "Get suggestions for [list]" → `get_task_suggestions`

**Decision Logic:**
```
IF user asks about complexity OR mentions "break down", "analyze"
THEN use analyze_task
  IF user specifies context
  THEN include context parameter
  IF user wants suggestions for existing list
  THEN use get_task_suggestions instead
```

### Natural Language Usage Patterns

#### Creating Todo Lists

**Simple Creation:**
```
User: "Create a todo list for website redesign"
Agent: Uses create_list with:
{
  "title": "Website Redesign",
  "projectTag": "website-redesign"
}
```

**Complex Creation with Tasks:**
```
User: "Set up a project for API development with tasks for authentication, database, and testing"
Agent: 
1. Uses create_list with:
{
  "title": "API Development Project",
  "projectTag": "api-development"
}
2. Then uses add_task for each task:
{
  "listId": "new-list-id",
  "title": "Implement authentication system",
  "priority": 4
}
```

#### Retrieving and Searching

**Get Specific List:**
```
User: "Show me my backend project tasks, only the incomplete ones"
Agent: Uses get_list with:
{
  "listId": "backend-project-uuid",
  "includeCompleted": false
}
```

**List All Projects:**
```
User: "Show me all my projects"
Agent: Uses list_all_lists with:
{
  "limit": 50
}
```

**Search Across Lists:**
```
User: "Find all tasks related to authentication that are high priority"
Agent: Uses search_tasks with:
{
  "query": "authentication",
  "limit": 20
}
Then uses filter_tasks to check priority levels.
```

**Find Tasks About Topic:**
```
User: "Find all tasks about testing"
Agent: Uses search_tasks with:
{
  "query": "testing"
}
```

#### Updating Tasks

**Add Task:**
```
User: "Add a task to review the API documentation with high priority"
Agent: Uses add_task with:
{
  "listId": "current-list-uuid",
  "title": "Review API documentation",
  "priority": 4,
  "tags": ["review", "documentation"]
}
```

**Update Status:**
```
User: "Mark the database setup task as completed"
Agent: Uses complete_task with:
{
  "listId": "current-list-uuid",
  "taskId": "database-task-uuid"
}
```

#### Complexity Analysis

**Simple Analysis:**
```
User: "How complex is implementing user authentication with JWT?"
Agent: Uses analyze_task with:
{
  "taskDescription": "Implement user authentication with JWT tokens"
}
```

**Get Suggestions:**
```
User: "What other tasks should I add to my web development project?"
Agent: Uses get_task_suggestions with:
{
  "listId": "web-dev-project-uuid",
  "style": "practical",
  "maxSuggestions": 5
}
```

### Error Handling and Recovery

#### Common Error Scenarios

**Validation Errors:**
```javascript
// Handle validation errors gracefully
if (result.isError && result.content[0].text.includes("Validation error")) {
  return "I need more information. Please provide [specific missing parameter].";
}
```

**Not Found Errors:**
```javascript
// Handle missing resources
if (result.isError && result.content[0].text.includes("not found")) {
  return "I couldn't find that todo list. Would you like me to search for it or create a new one?";
}
```

**Storage Errors:**
```javascript
// Handle storage failures
if (result.isError && result.content[0].text.includes("storage")) {
  return "There was a temporary issue saving your data. Let me try again.";
}
```

#### Recovery Patterns

**Retry Logic:**
```javascript
async function callWithRetry(toolName, args, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await callMCPTool(toolName, args);
      if (!result.isError) return result;
      
      if (i === maxRetries - 1) throw new Error(result.content[0].text);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

**Graceful Degradation:**
```javascript
// Fallback to simpler operations if complex ones fail
try {
  const result = await callMCPTool('get_list', complexArgs);
  return result;
} catch (error) {
  // Fallback to basic retrieval
  const fallbackResult = await callMCPTool('get_list', { listId: args.listId });
  return fallbackResult;
}
```

### Conversation Flow Examples

#### Project Setup Flow
```
User: "I need to start a new web development project"
Agent: "I'll create a todo list for your web development project. What specific aspects should we include?"

User: "Frontend with React, backend API, and database setup"
Agent: 
1. Uses create_list to create the project
2. Uses add_task for each major component
Response: "Created 'Web Development Project' with 3 initial tasks covering frontend, backend, and database. Would you like me to analyze any specific task for complexity?"

User: "Yes, analyze the backend API task"
Agent: Uses analyze_task
Response: "The backend API task is moderately complex (6/10). Would you like me to get suggestions for additional related tasks?"
```

#### Task Management Flow
```
User: "Show me my current projects"
Agent: Uses list_all_lists
Response: "You have 3 active projects: Web Development (60% complete), Mobile App (25% complete), and Database Migration (90% complete). Which would you like to work on?"

User: "Let's work on the mobile app. Show me the pending tasks"
Agent: Uses filter_tasks with status filter
Response: "Mobile App project has 8 pending tasks. The highest priority items are: 1) User interface design, 2) API integration. Would you like to start with one of these?"

User: "Mark the UI design as completed"
Agent: Uses complete_task
Response: "Marked 'User interface design' as completed. The project is now 30% complete. Need any help with the next steps?"
```#
# Performance Considerations

### Response Time Targets
- **Basic CRUD operations**: < 10ms (current: ~5ms create, ~2ms read)
- **Complex queries with filtering**: < 50ms
- **Search operations**: < 100ms
- **Complexity analysis**: < 100ms

### Data Limitations
- **Maximum items per list**: 1000
- **Maximum lists per installation**: Unlimited (limited by storage)
- **Maximum concurrent operations**: 100+
- **Search result limit**: 1000 per query

### Best Practices for AI Agents

#### Batch Operations
```javascript
// Instead of multiple single operations
const tasks = ["task1", "task2", "task3"];
const listResult = await callMCPTool('create_list', {title: "Project"});
for (const task of tasks) {
  await callMCPTool('add_task', {listId: listResult.id, title: task});
}
```

#### Efficient Filtering
```javascript
// Use specific filters to reduce data transfer
const result = await callMCPTool('get_list', {
  listId: id,
  includeCompleted: false,
  filters: {
    priority: [4, 5],
    status: ['pending', 'in_progress']
  },
  pagination: { limit: 10 }
});
```

#### Context Management
```javascript
// Maintain context for related operations
class TodoContext {
  constructor() {
    this.currentListId = null;
    this.currentContext = null;
  }
  
  async createList(title, projectTag) {
    const result = await callMCPTool('create_list', {title, projectTag});
    this.currentListId = result.id;
    this.currentProjectTag = projectTag;
    return result;
  }
  
  async addTask(title, priority = 3) {
    if (!this.currentListId) throw new Error("No active list");
    return await callMCPTool('add_task', {
      listId: this.currentListId,
      title,
      itemData: {title, priority}
    });
  }
}
```

## Testing and Validation

### Configuration Testing

**Test MCP Client Connection:**
```bash
# Test server startup
npx task-list-mcp@latest --version
```

**Validate Configuration:**
```javascript
// Test basic functionality
const testConfig = async () => {
  try {
    const result = await callMCPTool('create_list', {
      title: "Test List"
    });
    console.log("✅ Configuration working:", result.id);
    
    // Cleanup
    await callMCPTool('delete_list', {
      listId: result.id,
      permanent: true
    });
  } catch (error) {
    console.error("❌ Configuration error:", error.message);
  }
};
```

### Integration Testing

**Test All Tools:**
```javascript
const testAllTools = async () => {
  const tests = [
    () => callMCPTool('create_list', {title: "Test"}),
    () => callMCPTool('list_all_lists', {}),
    () => callMCPTool('analyze_task', {
      taskDescription: "Simple test task"
    }),
    () => callMCPTool('search_tasks', {query: "test"})
  ];
  
  for (const test of tests) {
    try {
      await test();
      console.log("✅ Test passed");
    } catch (error) {
      console.error("❌ Test failed:", error.message);
    }
  }
};
```

## Troubleshooting

### Common Issues

#### Server Won't Start
```bash
# Check Node.js version (requires 18.0.0+)
node --version

# Rebuild the project
npm run build

# Check file permissions
ls -la dist/index.js
```

#### MCP Client Connection Issues
```bash
# Verify server is running
ps aux | grep task-list-mcp

# Check MCP client logs
# Claude Desktop: ~/Library/Logs/Claude/
# Kiro IDE: Check MCP Server view in feature panel
```

#### Tool Call Failures
```javascript
// Enable debug logging
process.env.MCP_LOG_LEVEL = 'debug';

// Check parameter validation
const validateParams = (toolName, params) => {
  // Add validation logic based on tool requirements
  console.log(`Calling ${toolName} with:`, JSON.stringify(params, null, 2));
};
```

### Debug Mode

**Enable Detailed Logging:**
```bash
export NODE_ENV=development
export MCP_LOG_LEVEL=debug
npx task-list-mcp@latest
```

**Health Check:**
```bash
# Check server health
curl http://localhost:3000/health

# Or use built-in health check
node dist/health-check.js
```

### Configuration Troubleshooting

#### Environment Variable Issues
```bash
# Verify environment variables are set
echo $NODE_ENV
echo $MCP_LOG_LEVEL
echo $DATA_DIRECTORY

# Test with explicit environment variables
NODE_ENV=production MCP_LOG_LEVEL=info npx task-list-mcp@latest
```

#### Data Directory Problems
```bash
# Check directory permissions
ls -la /tmp/task-list-mcp-data

# Create directory if missing
mkdir -p /tmp/task-list-mcp-data
chmod 755 /tmp/task-list-mcp-data
```

#### Storage Backend Issues
```bash
# Test with memory storage for debugging
export STORAGE_TYPE=memory
npx task-list-mcp@latest

# Check file storage integrity
ls -la ./data/lists/
```

## Support and Resources

### Getting Help

1. **Health Check**: Run `node dist/health-check.js`
2. **Manual Testing**: Test with your MCP client
3. **Debug Logs**: Enable debug mode with `MCP_LOG_LEVEL=debug`
4. **Configuration Validation**: Test with minimal configuration first

### Validation Steps

**Before Deployment:**
1. Test all 15 MCP tools individually
2. Verify environment variable handling
3. Test with target MCP clients
4. Validate performance under load
5. Check error handling scenarios

**Configuration Checklist:**
- [ ] All environment variables properly set
- [ ] Data directory exists and is writable
- [ ] MCP client configuration syntax is valid
- [ ] Auto-approve list includes all required tools
- [ ] Server starts without errors
- [ ] Basic tool calls work correctly

### Additional Resources

- **GitHub Repository**: [task-list-mcp](https://github.com/keyurgolani/task-list-mcp)
- **MCP Protocol Documentation**: [Model Context Protocol](https://modelcontextprotocol.io/)
- **Performance**: Sub-10ms response times for standard operations
- **Example Configurations**: See `examples/` directory for client-specific setups

### Development Roadmap

#### Current Capabilities (v1.0.0)
- ✅ Complete CRUD operations (create, retrieve, update, delete, reorder)
- ✅ List management (list all, delete, archive)
- ✅ Task dependency management with circular detection
- ✅ AI-powered complexity analysis with intelligent task generation
- ✅ File-based persistent storage with atomic operations
- ✅ Memory-based storage for development/testing
- ✅ Advanced filtering and search capabilities
- ✅ Automatic backup and rollback capabilities
- ✅ MCP protocol compliance
- ✅ Input validation and error handling

#### Phase 2: Enhanced Intelligence (In Progress)
- 📋 Advanced natural language processing
- 📋 Improved complexity scoring algorithms
- 📋 Real-time analytics and progress tracking
- 📋 Predictive task completion estimates

#### Phase 3: Production Features (Planned)
- 📋 Database backend support (PostgreSQL, MongoDB)
- 📋 Authentication and authorization
- 📋 Rate limiting and security hardening


---

**Last Updated**: September 15, 2025  
**Version**: 2.0.0 (Production Ready)  
**MCP Protocol**: Compatible with MCP SDK 1.0.0+  
**Total MCP Tools**: 15 focused tools for complete task management