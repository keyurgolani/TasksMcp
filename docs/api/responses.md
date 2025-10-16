# Response Formats

This document describes the standard response formats used by all MCP Task Manager tools.

## Standard Response Structure

All MCP tools follow the Model Context Protocol response format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Response content as JSON string or formatted text"
    }
  ],
  "isError": false
}
```

## Success Responses

### JSON Data Responses

Most tools return structured JSON data:

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"id\":\"123e4567-e89b-12d3-a456-426614174000\",\"title\":\"My List\",\"taskCount\":5}"
    }
  ],
  "isError": false
}
```

### Formatted Text Responses

Some tools (like `show_tasks`) return formatted text:

```json
{
  "content": [
    {
      "type": "text",
      "text": "📋 My Project (3 tasks, 33% complete)\n\n🔥 CRITICAL PRIORITY (5):\n  🔴 Important task\n     📝 Task description\n     ⏱️  60 min | 🏷️  urgent, important"
    }
  ],
  "isError": false
}
```

## Error Responses

### Standard Error Format

```json
{
  "content": [
    {
      "type": "text",
      "text": "❌ priority: Expected number, but received string\n💡 Use numbers 1-5, where 5 is highest priority\n📝 Example: 5 (highest) to 1 (lowest)\n\n🔧 Common fixes:\n1. Use numbers 1-5 for priority\n   Example: {\"priority\": 5}"
    }
  ],
  "isError": true
}
```

### Error Message Components

- **❌ Error Indicator**: Clear identification of the problem
- **💡 Guidance**: Explanation of what's expected
- **📝 Examples**: Working examples to follow
- **🔧 Common Fixes**: Step-by-step solutions

## Data Object Formats

### List Response Object

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Project Name",
  "description": "Project description",
  "taskCount": 10,
  "completedCount": 3,
  "progress": 30,
  "lastUpdated": "2024-01-15T10:30:00Z",
  "projectTag": "web-development",
  "createdAt": "2024-01-15T09:00:00Z"
}
```

### Task Response Object

```json
{
  "id": "456e7890-e89b-12d3-a456-426614174001",
  "title": "Implement user authentication",
  "description": "Build OAuth2 authentication system",
  "status": "pending",
  "priority": 4,
  "tags": ["backend", "security"],
  "createdAt": "2024-01-15T09:15:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "completedAt": null,
  "estimatedDuration": 240,
  "dependencies": ["789abcde-e89b-12d3-a456-426614174002"],
  "isReady": false,
  "blockedBy": ["789abcde-e89b-12d3-a456-426614174002"],
  "exitCriteria": [
    {
      "id": "criteria-uuid-1",
      "description": "Unit tests pass with >90% coverage",
      "isMet": false,

      "metAt": null,
      "notes": ""
    }
  ],
  "exitCriteriaProgress": 0,
  "canComplete": false
}
```

### Search Response Object

```json
{
  "results": [
    {
      "id": "task-uuid",
      "title": "Task title",
      "listId": "list-uuid",
      "listTitle": "List title",
      "priority": 4,
      "status": "pending",
      "relevanceScore": 0.95
    }
  ],
  "totalCount": 25,
  "hasMore": true,
  "query": "authentication",
  "filters": {
    "priority": [4, 5],
    "status": ["pending"]
  }
}
```

### Dependency Analysis Response

```json
{
  "summary": {
    "totalTasks": 8,
    "readyTasks": 2,
    "blockedTasks": 4,
    "tasksWithDependencies": 6
  },
  "criticalPath": [
    "setup-database",
    "create-user-model",
    "implement-auth",
    "deploy-production"
  ],
  "criticalPathDuration": 720,
  "bottlenecks": [
    {
      "taskId": "setup-database",
      "title": "Set up database schema",
      "blocksCount": 5,
      "blockedTasks": [
        "user-model",
        "product-catalog",
        "orders",
        "payments",
        "reports"
      ]
    }
  ],
  "issues": {
    "circularDependencies": [],
    "unreachableTasks": [],
    "warnings": [
      "Task 'deploy-production' has no dependencies but high complexity"
    ]
  },
  "recommendations": [
    "Focus on the critical path: Start with \"Set up database schema\" as it affects 5 other tasks.",
    "2 tasks are ready to start immediately.",
    "Consider breaking down \"Set up database schema\" as it's a major bottleneck."
  ]
}
```

### Bulk Operations Response (REST API Only - Not Available in MCP)

```json
{
  "results": [
    {
      "operation": {
        "type": "create",
        "data": { "title": "New Task 1" }
      },
      "success": true,
      "result": {
        "id": "new-task-uuid-1",
        "title": "New Task 1",
        "status": "pending"
      }
    },
    {
      "operation": {
        "type": "create",
        "data": { "title": "" }
      },
      "success": false,
      "error": "Title is required and cannot be empty"
    }
  ],
  "summary": {
    "total": 2,
    "successful": 1,
    "failed": 1,
    "successRate": 50
  }
}
```

## Status and Enum Values

### Task Status Values

| Status        | Description                        |
| ------------- | ---------------------------------- |
| `pending`     | Not yet started                    |
| `in_progress` | Currently being worked on          |
| `completed`   | Finished successfully              |
| `blocked`     | Cannot proceed due to dependencies |
| `cancelled`   | Abandoned or no longer needed      |

### Priority Levels

| Priority | Level    | Description                     |
| -------- | -------- | ------------------------------- |
| `1`      | Minimal  | Optional, lowest priority       |
| `2`      | Low      | Nice to have, when time permits |
| `3`      | Medium   | Normal priority (default)       |
| `4`      | High     | Important, time-sensitive       |
| `5`      | Critical | Urgent, blocking other work     |

### Task Ordering

Tasks are returned based on dependency completion status. The `get_ready_tasks` tool returns tasks that have no incomplete dependencies and are ready to work on.

## Response Examples by Tool Category

### List Management Responses

#### create_list

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"id\":\"123e4567-e89b-12d3-a456-426614174000\",\"title\":\"My Project\",\"description\":\"Project description\",\"taskCount\":0,\"completedCount\":0,\"progress\":0,\"createdAt\":\"2024-01-15T10:00:00Z\",\"projectTag\":\"development\"}"
    }
  ],
  "isError": false
}
```

#### list_all_lists

```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"id\":\"list-1\",\"title\":\"Project A\",\"taskCount\":5,\"progress\":60},{\"id\":\"list-2\",\"title\":\"Project B\",\"taskCount\":3,\"progress\":33}]"
    }
  ],
  "isError": false
}
```

### Task Management Responses

#### add_task

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"id\":\"456e7890-e89b-12d3-a456-426614174001\",\"title\":\"New Task\",\"status\":\"pending\",\"priority\":3,\"createdAt\":\"2024-01-15T10:15:00Z\"}"
    }
  ],
  "isError": false
}
```

#### complete_task

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"id\":\"456e7890-e89b-12d3-a456-426614174001\",\"title\":\"Completed Task\",\"status\":\"completed\",\"completedAt\":\"2024-01-15T11:30:00Z\",\"progress\":100}"
    }
  ],
  "isError": false
}
```

### Search & Display Responses

#### search_tool

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"results\":[{\"id\":\"task-1\",\"title\":\"Urgent task\",\"priority\":5,\"relevanceScore\":0.95}],\"totalCount\":1,\"hasMore\":false}"
    }
  ],
  "isError": false
}
```

#### show_tasks

```json
{
  "content": [
    {
      "type": "text",
      "text": "📋 My Project (3 tasks, 33% complete)\n\n🔥 CRITICAL PRIORITY (5):\n  🔴 Urgent task\n     📝 Critical task description\n     ⏱️  120 min | 🏷️  urgent, critical\n\n🔶 HIGH PRIORITY (4):\n  🔴 Important task\n     📝 Important task description\n     ⏱️  60 min | 🏷️  important"
    }
  ],
  "isError": false
}
```

### Advanced Features Responses

#### analyze_task

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"complexity\":{\"score\":7.5,\"level\":\"High\",\"factors\":[\"Multiple components\",\"External dependencies\"]},\"estimatedDuration\":360,\"confidence\":0.85,\"suggestions\":[\"Break into smaller tasks\",\"Plan for integration testing\"]}"
    }
  ],
  "isError": false
}
```

#### get_task_suggestions

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"suggestions\":[{\"title\":\"Set up development environment\",\"description\":\"Configure local development tools\",\"priority\":4,\"estimatedDuration\":60}],\"context\":\"Based on existing project tasks\",\"confidence\":0.75}"
    }
  ],
  "isError": false
}
```

## Response Validation

### JSON Response Validation

All JSON responses should be valid JSON that can be parsed:

```javascript
try {
  const data = JSON.parse(response.content[0].text);
  // Process data
} catch (error) {
  // Handle parsing error
}
```

### Text Response Validation

Formatted text responses use consistent formatting:

- **Emojis**: Visual indicators for status and priority
- **Indentation**: Consistent spacing for hierarchy
- **Sections**: Clear separation between different parts
- **Metadata**: Consistent format for timestamps, durations, tags

### Error Response Validation

Error responses always have `isError: true` and include:

- Clear error description
- Actionable guidance
- Working examples
- Specific fix suggestions

---

This response format documentation provides complete coverage of all response types. For specific tool responses, see the [Tools Documentation](tools.md).
