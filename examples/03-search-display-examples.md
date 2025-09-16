# Search and Display Examples

This document demonstrates the search, filtering, and display capabilities of the MCP Task Manager.

## Task Search

### Basic Text Search
```json
{
  "tool": "search_tasks",
  "parameters": {
    "query": "database"
  }
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "e7e5a962-f706-4607-b7e1-95f44b9867ee",
      "title": "Design database schema",
      "description": "Create ERD and define table structures for user management, content, and analytics",
      "status": "pending",
      "priority": 5,
      "tags": ["database", "design", "backend", "critical", "architecture"],
      "createdAt": "2025-09-16T21:16:46.741Z",
      "updatedAt": "2025-09-16T21:17:27.397Z",
      "estimatedDuration": 240
    }
  ],
  "totalCount": 1,
  "hasMore": false
}
```

### Search Within Specific List
```json
{
  "tool": "search_tasks",
  "parameters": {
    "query": "frontend",
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "limit": 5
  }
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "62ab5565-5246-40be-953f-b2636c9753ba",
      "title": "Build frontend application",
      "description": "Create React components, routing, and state management for the user interface",
      "status": "pending",
      "priority": 3,
      "tags": ["frontend", "react", "ui"],
      "createdAt": "2025-09-16T21:16:57.035Z",
      "updatedAt": "2025-09-16T21:16:57.035Z",
      "estimatedDuration": 360
    }
  ],
  "totalCount": 1,
  "hasMore": false
}
```

## Task Filtering

### Filter by Priority
```json
{
  "tool": "filter_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "priority": 5
  }
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "f47cd78e-962a-4860-a17e-49c67ab12da0",
      "title": "Set up development environment and tools",
      "description": "Install Node.js 18+, npm, VS Code, and configure ESLint, Prettier, and Git hooks",
      "status": "completed",
      "priority": 5,
      "tags": ["setup", "environment", "urgent"],
      "createdAt": "2025-09-16T21:16:40.611Z",
      "updatedAt": "2025-09-16T21:17:18.466Z",
      "estimatedDuration": 90,
      "dependencies": [],
      "isReady": false
    },
    {
      "id": "e7e5a962-f706-4607-b7e1-95f44b9867ee",
      "title": "Design database schema",
      "description": "Create ERD and define table structures for user management, content, and analytics",
      "status": "pending",
      "priority": 5,
      "tags": ["database", "design", "backend", "critical", "architecture"],
      "createdAt": "2025-09-16T21:16:46.741Z",
      "updatedAt": "2025-09-16T21:17:27.397Z",
      "estimatedDuration": 240,
      "dependencies": ["f47cd78e-962a-4860-a17e-49c67ab12da0"],
      "isReady": true
    }
  ],
  "totalCount": 2,
  "hasMore": false
}
```

### Filter by Status and Readiness
```json
{
  "tool": "filter_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "status": "pending",
    "isReady": true
  }
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "e7e5a962-f706-4607-b7e1-95f44b9867ee",
      "title": "Design database schema",
      "description": "Create ERD and define table structures for user management, content, and analytics",
      "status": "pending",
      "priority": 5,
      "tags": ["database", "design", "backend", "critical", "architecture"],
      "createdAt": "2025-09-16T21:16:46.741Z",
      "updatedAt": "2025-09-16T21:17:27.397Z",
      "estimatedDuration": 240,
      "dependencies": ["f47cd78e-962a-4860-a17e-49c67ab12da0"],
      "isReady": true
    },
    {
      "id": "62ab5565-5246-40be-953f-b2636c9753ba",
      "title": "Build frontend application",
      "description": "Create React components, routing, and state management for the user interface",
      "status": "pending",
      "priority": 3,
      "tags": ["frontend", "react", "ui"],
      "createdAt": "2025-09-16T21:16:57.035Z",
      "updatedAt": "2025-09-16T21:16:57.035Z",
      "estimatedDuration": 360,
      "dependencies": [],
      "isReady": true
    }
  ],
  "totalCount": 2,
  "hasMore": false
}
```

### Filter by Dependencies and Tags
```json
{
  "tool": "filter_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "hasDependencies": true,
    "tag": "backend"
  }
}
```

**Response:**
```json
{
  "results": [
    {
      "id": "e7e5a962-f706-4607-b7e1-95f44b9867ee",
      "title": "Design database schema",
      "description": "Create ERD and define table structures for user management, content, and analytics",
      "status": "pending",
      "priority": 5,
      "tags": ["database", "design", "backend", "critical", "architecture"],
      "createdAt": "2025-09-16T21:16:46.741Z",
      "updatedAt": "2025-09-16T21:17:27.397Z",
      "estimatedDuration": 240,
      "dependencies": ["f47cd78e-962a-4860-a17e-49c67ab12da0"],
      "isReady": true
    },
    {
      "id": "bc54482d-0f70-416b-987c-a6f15a98f16a",
      "title": "Implement backend API",
      "description": "Build REST API endpoints for authentication, user management, and core features",
      "status": "pending",
      "priority": 3,
      "tags": ["backend", "api", "development"],
      "createdAt": "2025-09-16T21:16:52.295Z",
      "updatedAt": "2025-09-16T21:16:52.295Z",
      "estimatedDuration": 480,
      "dependencies": ["e7e5a962-f706-4607-b7e1-95f44b9867ee"],
      "isReady": false,
      "blockedBy": ["e7e5a962-f706-4607-b7e1-95f44b9867ee"]
    }
  ],
  "totalCount": 2,
  "hasMore": false
}
```

## Task Display Formats

### Detailed View Grouped by Priority
```json
{
  "tool": "show_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "format": "detailed",
    "groupBy": "priority"
  }
}
```

**Response:**
```
# Development Project Alpha
A comprehensive web application development project with frontend, backend, and deployment components

## Critical Priority (2)

✅ **Set up development environment and tools** 🔴 🆓
   Install Node.js 18+, npm, VS Code, and configure ESLint, Prettier, and Git hooks
   *Tags: setup, environment, urgent | Duration: 90min | Created: 9/16/2025*

⏳ **Design database schema** 🔴 ✅
   Create ERD and define table structures for user management, content, and analytics
   *Tags: database, design, backend, critical, architecture | Duration: 240min | Dependencies: 1 (Ready) | Created: 9/16/2025*

## Medium Priority (2)

⏳ **Implement backend API** 🟡 ⛔
   Build REST API endpoints for authentication, user management, and core features
   *Tags: backend, api, development | Duration: 480min | Dependencies: 1 (Blocked) | Created: 9/16/2025*

⏳ **Build frontend application** 🟡 🆓
   Create React components, routing, and state management for the user interface
   *Tags: frontend, react, ui | Duration: 360min | Created: 9/16/2025*

## Low Priority (1)

⏳ **Write comprehensive tests** 🟢 ⛔
   Write unit tests, integration tests, and end-to-end tests for all components
   *Tags: testing, quality, automation | Duration: 300min | Dependencies: 2 (Blocked) | Created: 9/16/2025*
```

### Compact View Grouped by Status
```json
{
  "tool": "show_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "format": "compact",
    "groupBy": "status",
    "includeCompleted": true
  }
}
```

**Response:**
```
# Development Project Alpha
A comprehensive web application development project with frontend, backend, and deployment components

## Pending (4)

⏳ 🔴 ✅ Design database schema [database, design, backend, critical, architecture] (240min) (1 deps)
⏳ 🟡 ⛔ Implement backend API [backend, api, development] (480min) (1 deps)
⏳ 🟡 🆓 Build frontend application [frontend, react, ui] (360min)
⏳ 🟢 ⛔ Write comprehensive tests [testing, quality, automation] (300min) (2 deps)

## Completed (1)

✅ 🔴 🆓 Set up development environment and tools [setup, environment, urgent] (90min)
```

### Summary View
```json
{
  "tool": "show_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "format": "summary",
    "groupBy": "none"
  }
}
```

**Response:**
```
# Development Project Alpha - Summary
A comprehensive web application development project with frontend, backend, and deployment components

**Total Tasks:** 5
**Completed:** 1
**Progress:** 20.0%
**Last Updated:** 9/16/2025
**Project:** web-app

**Status Breakdown:**
- Completed: 1
- Pending: 4

**Priority Breakdown:**
- Low: 1
- Medium: 2
- Critical: 2
```

## Display Format Legend

### Status Icons
- ✅ Completed
- ⏳ Pending
- 🔄 In Progress
- ⛔ Blocked
- ❌ Cancelled

### Priority Colors
- 🔴 Critical (Priority 5)
- 🟠 High (Priority 4)
- 🟡 Medium (Priority 3)
- 🟢 Low (Priority 2)
- ⚪ Lowest (Priority 1)

### Dependency Status
- ✅ Ready (all dependencies completed)
- ⛔ Blocked (has incomplete dependencies)
- 🆓 No dependencies

## Best Practices

### Search Tips
1. **Use specific keywords** from task titles and descriptions
2. **Search within lists** to narrow results for large projects
3. **Set appropriate limits** to avoid overwhelming results
4. **Use partial matches** - search finds substrings

### Filtering Tips
1. **Combine filters** for precise results (e.g., priority + status)
2. **Use isReady filter** to find actionable tasks
3. **Filter by tags** to focus on specific work types
4. **Use hasDependencies** to understand task relationships

### Display Tips
1. **Use detailed format** for comprehensive task review
2. **Use compact format** for quick overviews
3. **Use summary format** for project status reports
4. **Group by priority** for work prioritization
5. **Group by status** for workflow management
6. **Include completed tasks** for progress tracking

## Common Use Cases

### Daily Standup
- Filter by `isReady: true` and `status: "pending"`
- Use compact format grouped by priority

### Sprint Planning
- Use detailed format grouped by priority
- Include completed tasks to track progress

### Project Status Report
- Use summary format for high-level overview
- Filter by specific tags or priorities as needed

### Dependency Management
- Filter by `hasDependencies: true` or `isBlocked: true`
- Use detailed format to see dependency relationships