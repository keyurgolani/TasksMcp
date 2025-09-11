# MCP Task Manager - AI Agent Configuration Guide

## Overview

The MCP Task Manager is a production-ready Model Context Protocol (MCP) server that provides intelligent task management capabilities specifically designed for AI agents. This comprehensive guide covers all 7 available MCP tools, configuration options, and AI agent integration patterns.

**Key Features:**
- 7 comprehensive MCP tools for complete task management
- AI-powered complexity analysis and task breakdown
- Advanced filtering, sorting, and search capabilities
- Persistent file-based storage with atomic operations
- Real-time analytics and progress tracking
- Natural language usage patterns optimized for AI agents

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
        "create_todo_list",
        "get_todo_list",
        "list_todo_lists",
        "update_todo_list",
        "delete_todo_list",
        "analyze_task_complexity",
        "search_todo_lists"
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
        "create_todo_list",
        "get_todo_list",
        "list_todo_lists",
        "update_todo_list",
        "delete_todo_list",
        "analyze_task_complexity",
        "search_todo_lists"
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
## Compl
ete MCP Tool Reference

### 1. create_todo_list

**Purpose:** Create structured todo lists with optional initial tasks and comprehensive metadata.

**Parameters:**
- `title` (required): List title (1-200 characters)
- `description` (optional): List description (max 2000 characters)
- `context` (optional): Project/context identifier (max 200 characters)
- `tasks` (optional): Array of initial tasks (max 100 tasks)

**Task Object Structure:**
- `title` (required): Task title (1-200 characters)
- `description` (optional): Task description (max 2000 characters)
- `priority` (optional): Priority level 1-5 (1=minimal, 5=critical, default: 3)
- `estimatedDuration` (optional): Estimated duration in minutes (positive integer)
- `tags` (optional): Array of tags (max 20 tags, each max 50 characters)

**Response Format:**
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "context": "string",
  "items": [],
  "totalItems": 0,
  "completedItems": 0,
  "progress": 0.0,
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime",
  "isArchived": false
}
```

**Performance Characteristics:**
- Response time: ~5ms (typical)
- Maximum tasks per list: 100
- Atomic operation with rollback on failure

**Basic Example:**
```json
{
  "name": "create_todo_list",
  "arguments": {
    "title": "Website Redesign Project",
    "description": "Complete redesign of company website with modern UI/UX",
    "context": "web-development"
  }
}
```

**Advanced Example with Initial Tasks:**
```json
{
  "name": "create_todo_list",
  "arguments": {
    "title": "API Development Project",
    "description": "Backend API development for user management system",
    "context": "backend-api-v2",
    "tasks": [
      {
        "title": "Design database schema",
        "description": "Create ERD and define table structures for user management",
        "priority": 5,
        "estimatedDuration": 240,
        "tags": ["database", "design", "planning"]
      },
      {
        "title": "Implement user authentication",
        "description": "JWT-based authentication with refresh tokens and role management",
        "priority": 4,
        "estimatedDuration": 180,
        "tags": ["auth", "security", "implementation"]
      },
      {
        "title": "Create API documentation",
        "description": "OpenAPI specification with examples and testing guides",
        "priority": 3,
        "estimatedDuration": 120,
        "tags": ["documentation", "api", "testing"]
      }
    ]
  }
}
```

### 2. get_todo_list

**Purpose:** Retrieve a specific todo list by ID with advanced filtering, sorting, and pagination capabilities.

**Parameters:**
- `listId` (required): UUID of the todo list
- `includeCompleted` (optional): Include completed tasks (default: true)
- `filters` (optional): Advanced filtering options
- `sorting` (optional): Sort results by field and direction
- `pagination` (optional): Paginate results with limit and offset

**Advanced Filtering Options:**
- `status`: Filter by task status (single value or array): `pending`, `in_progress`, `completed`, `blocked`, `cancelled`
- `priority`: Filter by priority (single value or array): 1-5
- `tags`: Array of tags - items must have ALL specified tags
- `assignee`: Filter by assignee name (partial match)
- `dueDateBefore`/`dueDateAfter`: Filter by due date range (ISO datetime)
- `createdBefore`/`createdAfter`: Filter by creation date range (ISO datetime)
- `hasDescription`: Boolean - whether items must have a description
- `hasDependencies`: Boolean - whether items must have dependencies
- `estimatedDurationMin`/`estimatedDurationMax`: Filter by duration range (minutes)
- `searchText`: Text search in title, description, and tags

**Sorting Options:**
- `field`: Sort field - `title`, `status`, `priority`, `createdAt`, `updatedAt`, `completedAt`, `estimatedDuration`
- `direction`: Sort direction - `asc` or `desc`

**Pagination Options:**
- `limit`: Maximum items to return (1-1000)
- `offset`: Number of items to skip

**Response Format:**
Includes comprehensive analytics:
- Real-time progress tracking and completion statistics
- Velocity metrics (items per day, completion rate)
- Complexity distribution across priority levels
- Tag frequency analysis
- Dependency graph visualization data
- Processing metadata (filtering/pagination info)

**Performance Characteristics:**
- Response time: ~2ms (typical)
- Supports up to 1000 items per list
- Efficient filtering and sorting algorithms

**Basic Example:**
```json
{
  "name": "get_todo_list",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "includeCompleted": false
  }
}
```

**Advanced Filtering Example:**
```json
{
  "name": "get_todo_list",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "filters": {
      "status": ["pending", "in_progress"],
      "priority": [4, 5],
      "tags": ["urgent", "frontend"],
      "hasDescription": true,
      "searchText": "authentication",
      "createdAfter": "2024-01-01T00:00:00Z"
    },
    "sorting": {
      "field": "priority",
      "direction": "desc"
    },
    "pagination": {
      "limit": 10,
      "offset": 0
    }
  }
}
```#
## 3. update_todo_list

**Purpose:** Update an existing todo list with various operations including adding, updating, removing, and reordering items.

**Parameters:**
- `listId` (required): UUID of the todo list to update
- `action` (required): Type of operation - `add_item`, `update_item`, `remove_item`, `update_status`, `reorder`
- `itemData` (conditional): Data for the item being added or updated
- `itemId` (conditional): UUID of the item to update/remove
- `newOrder` (conditional): Array of item UUIDs for reordering

**Action-Specific Requirements:**

#### add_item
- `itemData.title` (required): Item title (1-200 characters)
- `itemData.description` (optional): Item description (max 2000 characters)
- `itemData.priority` (optional): Priority 1-5 (default: 3)
- `itemData.estimatedDuration` (optional): Duration in minutes
- `itemData.tags` (optional): Array of tags (max 20, each max 50 chars)
- `itemData.dependencies` (optional): Array of item UUIDs this item depends on (max 50)

#### update_item
- `itemId` (required): UUID of item to update
- `itemData`: Any combination of title, description, priority, estimatedDuration, tags, dependencies

#### remove_item
- `itemId` (required): UUID of item to remove

#### update_status
- `itemId` (required): UUID of item to update
- `itemData.status` (required): New status - `pending`, `in_progress`, `completed`, `blocked`, `cancelled`

#### reorder
- `newOrder` (required): Array of all item UUIDs in desired order

**Performance Characteristics:**
- Response time: ~3ms (typical)
- Atomic operations with rollback capability
- Dependency validation prevents circular references
- Automatic backup before destructive operations

**Add Item Example:**
```json
{
  "name": "update_todo_list",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "action": "add_item",
    "itemData": {
      "title": "Implement user registration endpoint",
      "description": "Create POST /api/users/register with validation and email verification",
      "priority": 4,
      "estimatedDuration": 90,
      "tags": ["api", "authentication", "backend"],
      "dependencies": ["database-schema-uuid"]
    }
  }
}
```

**Update Item Example:**
```json
{
  "name": "update_todo_list",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "action": "update_item",
    "itemId": "87654321-4321-4321-4321-210987654321",
    "itemData": {
      "title": "Updated: Implement user registration with OAuth",
      "priority": 5,
      "tags": ["api", "authentication", "oauth", "high-priority"],
      "estimatedDuration": 150
    }
  }
}
```

**Update Status Example:**
```json
{
  "name": "update_todo_list",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "action": "update_status",
    "itemId": "87654321-4321-4321-4321-210987654321",
    "itemData": {
      "status": "completed"
    }
  }
}
```

**Reorder Items Example:**
```json
{
  "name": "update_todo_list",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "action": "reorder",
    "newOrder": [
      "high-priority-item-uuid",
      "medium-priority-item-uuid",
      "low-priority-item-uuid"
    ]
  }
}
```

### 4. list_todo_lists

**Purpose:** List all todo lists with optional filtering and pagination for project management and overview.

**Parameters:**
- `context` (optional): Filter by context/project identifier (max 200 characters)
- `status` (optional): Filter by completion status - `active`, `completed`, `all` (default: `all`)
- `includeArchived` (optional): Include archived lists (default: false)
- `limit` (optional): Maximum number of lists to return (1-1000)
- `offset` (optional): Number of lists to skip for pagination (min: 0)

**Response Format:**
Array of todo list summaries with:
- Basic metadata (id, title, description, context)
- Progress statistics (totalItems, completedItems, progress)
- Timestamps (createdAt, updatedAt)
- Archive status

**Performance Characteristics:**
- Response time: ~1ms for small datasets, ~10ms for large datasets
- Efficient pagination for large numbers of lists
- Optimized for dashboard and overview displays

**List All Active Lists:**
```json
{
  "name": "list_todo_lists",
  "arguments": {
    "status": "active"
  }
}
```

**List by Context with Pagination:**
```json
{
  "name": "list_todo_lists",
  "arguments": {
    "context": "backend-development",
    "status": "active",
    "limit": 10,
    "offset": 0
  }
}
```

**List Completed Projects Including Archived:**
```json
{
  "name": "list_todo_lists",
  "arguments": {
    "status": "completed",
    "includeArchived": true,
    "limit": 20
  }
}
```

### 5. delete_todo_list

**Purpose:** Delete or archive a todo list with optional permanent deletion.

**Parameters:**
- `listId` (required): UUID of the todo list to delete
- `permanent` (optional): Whether to permanently delete (true) or archive (false, default)

**Response Format:**
```json
{
  "operation": "archived",
  "listId": "uuid",
  "timestamp": "ISO datetime"
}
```

**Performance Characteristics:**
- Response time: ~2ms for archive, ~5ms for permanent deletion
- Automatic backup before permanent deletion
- Atomic operation with rollback capability

**Archive List (Default):**
```json
{
  "name": "delete_todo_list",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012"
  }
}
```

**Permanently Delete List:**
```json
{
  "name": "delete_todo_list",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "permanent": true
  }
}
```### 6. analy
ze_task_complexity

**Purpose:** AI-powered analysis of task descriptions for complexity assessment and automatic task breakdown with intelligent pattern detection.

**Parameters:**
- `taskDescription` (required): Description of the task to analyze (1-10,000 characters)
- `context` (optional): Project or context identifier (max 200 characters)
- `autoCreate` (optional): Whether to automatically create a todo list if task is complex (default: false)
- `generateOptions` (optional): Options for task generation

**Generate Options:**
- `style` (optional): Style of generated tasks - `detailed`, `concise`, `technical`, `business` (default: `detailed`)
- `maxTasks` (optional): Maximum number of tasks to generate (1-20, default: 8)
- `includeTests` (optional): Whether to include testing tasks (default: true)
- `includeDependencies` (optional): Whether to include dependency management tasks (default: true)

**Response Structure:**
```json
{
  "analysis": {
    "isComplex": true,
    "confidence": 0.85,
    "complexity": {
      "overall": 7,
      "factors": {
        "technical": 8,
        "temporal": 6,
        "dependency": 5,
        "uncertainty": 4,
        "risk": 6,
        "scope": 7
      },
      "reasoning": "Task is considered complex due to technical requirements...",
      "confidence": 0.85,
      "breakdown": ["Technical complexity: 8/10", "Scope: 7/10"]
    },
    "estimatedDuration": 480,
    "reasoning": "Task is complex due to multiple technical components...",
    "suggestedTasks": [
      "Research and analyze requirements",
      "Design system architecture",
      "Implement core functionality",
      "Add comprehensive testing"
    ],
    "patterns": [
      {
        "type": "technical",
        "confidence": 0.9,
        "matches": ["api", "database", "authentication"]
      }
    ]
  },
  "autoCreated": false,
  "createdList": null
}
```

**Complexity Scoring (1-10 Scale):**
- **1-3**: Simple tasks (single component, clear requirements)
- **4-6**: Moderate tasks (multiple components, some dependencies)
- **7-8**: Complex tasks (many components, significant dependencies)
- **9-10**: Very complex tasks (system-wide changes, high uncertainty)

**Performance Characteristics:**
- Response time: ~50ms for analysis, +5ms if auto-creating list
- Advanced NLP processing with pattern recognition
- Confidence scoring for reliability assessment

**Basic Complexity Analysis:**
```json
{
  "name": "analyze_task_complexity",
  "arguments": {
    "taskDescription": "Implement a REST API with user authentication, database integration, and comprehensive testing",
    "context": "backend-development"
  }
}
```

**Auto-Create Todo List for Complex Tasks:**
```json
{
  "name": "analyze_task_complexity",
  "arguments": {
    "taskDescription": "Build a distributed microservices architecture using Docker, Kubernetes, and Redis with monitoring and CI/CD pipeline",
    "context": "microservices-project",
    "autoCreate": true,
    "generateOptions": {
      "style": "technical",
      "maxTasks": 12,
      "includeTests": true,
      "includeDependencies": true
    }
  }
}
```

**Business-Style Analysis:**
```json
{
  "name": "analyze_task_complexity",
  "arguments": {
    "taskDescription": "Launch new product feature with user onboarding, analytics tracking, and A/B testing",
    "generateOptions": {
      "style": "business",
      "maxTasks": 6,
      "includeTests": false
    }
  }
}
```

### 7. search_todo_lists

**Purpose:** Advanced search across all todo lists with relevance scoring, filtering, and pagination.

**Parameters:**
- `query` (required): Search query text (1-500 characters)
- `context` (optional): Limit search to specific context/project
- `filters` (optional): Additional filters to apply to search results
- `sorting` (optional): Sort search results
- `pagination` (optional): Paginate search results
- `includeArchived` (optional): Include archived lists in search (default: false)

**Search Filters:**
- `status`: Filter by task status (single value or array)
- `priority`: Filter by priority (single value or array)
- `tags`: Array of tags - items must have ALL specified tags
- `createdBefore`/`createdAfter`: Filter by creation date range
- `hasDescription`: Boolean - whether items must have a description
- `hasDependencies`: Boolean - whether items must have dependencies
- `estimatedDurationMin`/`estimatedDurationMax`: Filter by duration range

**Sorting Options:**
- `field`: Sort field - `relevance` (default), `title`, `status`, `priority`, `createdAt`, `updatedAt`
- `direction`: Sort direction - `asc` or `desc` (default: `desc`)

**Pagination Options:**
- `limit`: Maximum results to return (1-1000, default: 50)
- `offset`: Number of results to skip (default: 0)

**Response Structure:**
```json
{
  "results": [
    {
      "listId": "uuid",
      "listTitle": "string",
      "item": {
        "id": "uuid",
        "title": "string",
        "description": "string",
        "status": "pending",
        "priority": 4,
        "createdAt": "ISO datetime",
        "updatedAt": "ISO datetime",
        "tags": ["tag1", "tag2"]
      },
      "relevanceScore": 95.5,
      "matchType": "title",
      "matchText": "matching text"
    }
  ],
  "totalCount": 15,
  "searchTime": 45,
  "query": "search query",
  "hasMore": false
}
```

**Search Features:**
- **Relevance Scoring**: Results ranked by relevance with exact matches, prefix matches, and contains matches
- **Multi-field Search**: Searches across item titles, descriptions, and tags
- **Match Highlighting**: Shows which field matched and the matching text
- **Performance Optimized**: Fast search across large datasets with pagination support

**Performance Characteristics:**
- Response time: ~20ms for small datasets, ~100ms for large datasets
- Relevance scoring algorithm optimizes for user intent
- Efficient full-text search with caching

**Basic Search:**
```json
{
  "name": "search_todo_lists",
  "arguments": {
    "query": "frontend development"
  }
}
```

**Advanced Search with Filters:**
```json
{
  "name": "search_todo_lists",
  "arguments": {
    "query": "authentication",
    "context": "backend-project",
    "filters": {
      "status": ["pending", "in_progress"],
      "priority": [4, 5],
      "hasDescription": true,
      "tags": ["security"]
    },
    "sorting": {
      "field": "priority",
      "direction": "desc"
    },
    "pagination": {
      "limit": 20,
      "offset": 0
    }
  }
}
```##
 AI Agent Integration Patterns

### Tool Selection Decision Trees

#### Creating Todo Lists
**User Intent Patterns:**
- "Create a todo list for [project]" → `create_todo_list`
- "Set up a project plan for [description]" → `create_todo_list` with initial tasks
- "I need a task list for [context]" → `create_todo_list`

**Decision Logic:**
```
IF user mentions "create", "new", "setup", "start" + "todo", "list", "project"
THEN use create_todo_list
  IF user provides task details
  THEN include tasks array
  IF user mentions project/context
  THEN include context parameter
```

#### Retrieving Information
**User Intent Patterns:**
- "Show me [project] tasks" → `get_todo_list` with context filtering
- "What's the status of [list]?" → `get_todo_list` with basic parameters
- "Show me all my projects" → `list_todo_lists`
- "List all my projects" → `list_todo_lists`
- "Find all tasks about [topic]" → `search_todo_lists`
- "Find tasks about [topic]" → `search_todo_lists`
- "Search for [keyword]" → `search_todo_lists`

**Decision Logic:**
```
IF user wants specific list AND has list ID
THEN use get_todo_list
ELSE IF user wants to find/search tasks OR mentions "find all tasks about"
THEN use search_todo_lists
ELSE IF user wants overview/all lists OR mentions "show me all my projects"
THEN use list_todo_lists
```

#### Modifying Tasks
**User Intent Patterns:**
- "Add a task [description]" → `update_todo_list` with add_item action
- "Mark [task] as completed" → `update_todo_list` with update_status action
- "Update [task] priority to high" → `update_todo_list` with update_item action
- "Remove [task]" → `update_todo_list` with remove_item action

**Decision Logic:**
```
IF user mentions "add", "create new task"
THEN use update_todo_list with action: add_item
ELSE IF user mentions "mark as", "set status", "complete"
THEN use update_todo_list with action: update_status
ELSE IF user mentions "update", "change", "modify"
THEN use update_todo_list with action: update_item
ELSE IF user mentions "remove", "delete task"
THEN use update_todo_list with action: remove_item
```

#### Analyzing Complexity
**User Intent Patterns:**
- "How complex is [task]?" → `analyze_task_complexity`
- "Break down this project: [description]" → `analyze_task_complexity` with autoCreate
- "Is this task simple or complex?" → `analyze_task_complexity`

**Decision Logic:**
```
IF user asks about complexity OR mentions "break down", "analyze"
THEN use analyze_task_complexity
  IF user wants automatic task creation
  THEN set autoCreate: true
  IF user specifies style preference
  THEN set generateOptions.style
```

### Natural Language Usage Patterns

#### Creating Todo Lists

**Simple Creation:**
```
User: "Create a todo list for website redesign"
Agent: Uses create_todo_list with:
{
  "title": "Website Redesign",
  "context": "website-redesign"
}
```

**Complex Creation with Tasks:**
```
User: "Set up a project for API development with tasks for authentication, database, and testing"
Agent: Uses create_todo_list with:
{
  "title": "API Development Project",
  "context": "api-development",
  "tasks": [
    {"title": "Implement authentication system", "priority": 4},
    {"title": "Design and setup database", "priority": 5},
    {"title": "Create comprehensive tests", "priority": 3}
  ]
}
```

#### Retrieving and Searching

**Get Specific List:**
```
User: "Show me my backend project tasks, only the incomplete ones"
Agent: Uses get_todo_list with:
{
  "listId": "backend-project-uuid",
  "includeCompleted": false
}
```

**List All Projects:**
```
User: "Show me all my projects"
Agent: Uses list_todo_lists with:
{
  "status": "all"
}
```

**Search Across Lists:**
```
User: "Find all tasks related to authentication that are high priority"
Agent: Uses search_todo_lists with:
{
  "query": "authentication",
  "filters": {
    "priority": [4, 5]
  }
}
```

**Find Tasks About Topic:**
```
User: "Find all tasks about testing"
Agent: Uses search_todo_lists with:
{
  "query": "testing"
}
```

#### Updating Tasks

**Add Task:**
```
User: "Add a task to review the API documentation with high priority"
Agent: Uses update_todo_list with:
{
  "listId": "current-list-uuid",
  "action": "add_item",
  "itemData": {
    "title": "Review API documentation",
    "priority": 4,
    "tags": ["review", "documentation"]
  }
}
```

**Update Status:**
```
User: "Mark the database setup task as completed"
Agent: Uses update_todo_list with:
{
  "listId": "current-list-uuid",
  "action": "update_status",
  "itemId": "database-task-uuid",
  "itemData": {"status": "completed"}
}
```

#### Complexity Analysis

**Simple Analysis:**
```
User: "How complex is implementing user authentication with JWT?"
Agent: Uses analyze_task_complexity with:
{
  "taskDescription": "Implement user authentication with JWT tokens"
}
```

**Auto-Create from Analysis:**
```
User: "Break down this project and create a todo list: Build a real-time chat app"
Agent: Uses analyze_task_complexity with:
{
  "taskDescription": "Build a real-time chat application with React, Node.js, and Socket.io",
  "autoCreate": true,
  "generateOptions": {
    "style": "technical",
    "maxTasks": 10
  }
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
  const result = await callMCPTool('get_todo_list', complexArgs);
  return result;
} catch (error) {
  // Fallback to basic retrieval
  const fallbackResult = await callMCPTool('get_todo_list', { listId: args.listId });
  return fallbackResult;
}
```

### Conversation Flow Examples

#### Project Setup Flow
```
User: "I need to start a new web development project"
Agent: "I'll create a todo list for your web development project. What specific aspects should we include?"

User: "Frontend with React, backend API, and database setup"
Agent: Uses create_todo_list with comprehensive tasks
Response: "Created 'Web Development Project' with 8 tasks covering frontend, backend, and database. Would you like me to analyze any specific task for complexity?"

User: "Yes, analyze the backend API task"
Agent: Uses analyze_task_complexity
Response: "The backend API task is moderately complex (6/10). I've identified 5 subtasks. Should I break it down into separate tasks?"
```

#### Task Management Flow
```
User: "Show me my current projects"
Agent: Uses list_todo_lists
Response: "You have 3 active projects: Web Development (60% complete), Mobile App (25% complete), and Database Migration (90% complete). Which would you like to work on?"

User: "Let's work on the mobile app. Show me the pending tasks"
Agent: Uses get_todo_list with status filter
Response: "Mobile App project has 8 pending tasks. The highest priority items are: 1) User interface design, 2) API integration. Would you like to start with one of these?"

User: "Mark the UI design as in progress"
Agent: Uses update_todo_list with update_status
Response: "Updated 'User interface design' to in progress. The project is now 30% complete. Need any help with the next steps?"
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
for (const task of tasks) {
  await callMCPTool('update_todo_list', {action: 'add_item', ...});
}

// Use single operation with multiple tasks
await callMCPTool('create_todo_list', {
  title: "Project",
  tasks: tasks.map(title => ({title}))
});
```

#### Efficient Filtering
```javascript
// Use specific filters to reduce data transfer
const result = await callMCPTool('get_todo_list', {
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
  
  async createList(title, context) {
    const result = await callMCPTool('create_todo_list', {title, context});
    this.currentListId = result.id;
    this.currentContext = context;
    return result;
  }
  
  async addTask(title, priority = 3) {
    if (!this.currentListId) throw new Error("No active list");
    return await callMCPTool('update_todo_list', {
      listId: this.currentListId,
      action: 'add_item',
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
    const result = await callMCPTool('create_todo_list', {
      title: "Test List"
    });
    console.log("✅ Configuration working:", result.id);
    
    // Cleanup
    await callMCPTool('delete_todo_list', {
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
    () => callMCPTool('create_todo_list', {title: "Test"}),
    () => callMCPTool('list_todo_lists', {}),
    () => callMCPTool('analyze_task_complexity', {
      taskDescription: "Simple test task"
    }),
    () => callMCPTool('search_todo_lists', {query: "test"})
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
1. Test all 7 MCP tools individually
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
- 📋 Docker containerization and Kubernetes deployment

---

**Last Updated**: December 11, 2024  
**Version**: 1.0.0 (Production Ready)  
**MCP Protocol**: Compatible with MCP SDK 1.0.0+  
**Total MCP Tools**: 7 comprehensive tools for complete task management