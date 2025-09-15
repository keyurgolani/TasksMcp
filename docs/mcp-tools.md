# MCP Tools Documentation

## Overview

The MCP Task Manager provides 15 focused, easy-to-use tools for managing todo lists and tasks. Each tool has a single, clear purpose with minimal required parameters and consistent response formats.

**Last Updated**: September 15, 2025  
**Version**: 2.0.0 (Production Ready)  
**Total Tools**: 15 organized in 4 categories

## Tool Categories

- **List Management (4 tools)**: Create, retrieve, list, and delete todo lists
- **Task Management (6 tools)**: Add, update, remove, complete tasks and manage priorities/tags
- **Search & Display (3 tools)**: Search, filter, and display tasks with formatting
- **Advanced Features (2 tools)**: Task analysis and AI-generated suggestions

## Common Response Formats

### SimpleListResponse
```json
{
  "id": "uuid-string",
  "title": "List Title",
  "description": "Optional description",
  "taskCount": 5,
  "completedCount": 2,
  "progress": 40,
  "lastUpdated": "2024-01-15T10:30:00Z",
  "projectTag": "optional-project-tag"
}
```

### SimpleTaskResponse
```json
{
  "id": "uuid-string",
  "title": "Task Title",
  "description": "Optional description",
  "status": "pending",
  "priority": 3,
  "tags": ["tag1", "tag2"],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "estimatedDuration": 60
}
```

### SimpleSearchResponse
```json
{
  "results": [/* Array of SimpleTaskResponse */],
  "totalCount": 10,
  "hasMore": false
}
```

### Error Response
```json
{
  "error": "ValidationError",
  "message": "Title is required and cannot be empty",
  "code": "MISSING_REQUIRED_FIELD"
}
```

---

## List Management Tools

### 1. create_list

Creates a new todo list with basic information.

**Schema:**
```json
{
  "name": "create_list",
  "description": "Create a new todo list",
  "inputSchema": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 200,
        "description": "The title of the todo list"
      },
      "description": {
        "type": "string",
        "maxLength": 1000,
        "description": "Optional description of the list"
      },
      "projectTag": {
        "type": "string",
        "maxLength": 50,
        "description": "Optional project tag for organization"
      }
    },
    "required": ["title"]
  }
}
```

**Example Usage:**
```json
{
  "title": "Weekly Planning",
  "description": "Tasks for this week's planning session",
  "projectTag": "work"
}
```

**Response:** Returns a `SimpleListResponse` object.

---

### 2. get_list

Retrieves a specific todo list with its tasks.

**Schema:**
```json
{
  "name": "get_list",
  "description": "Get a specific todo list with its tasks",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list to retrieve"
      },
      "includeCompleted": {
        "type": "boolean",
        "default": true,
        "description": "Whether to include completed tasks"
      }
    },
    "required": ["listId"]
  }
}
```

**Example Usage:**
```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "includeCompleted": false
}
```

**Response:** Returns a `SimpleListResponse` with an additional `tasks` array containing `SimpleTaskResponse` objects.

---

### 3. list_all_lists

Gets all todo lists with basic information.

**Schema:**
```json
{
  "name": "list_all_lists",
  "description": "Get all todo lists with basic information",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectTag": {
        "type": "string",
        "maxLength": 50,
        "description": "Filter by project tag"
      },
      "includeArchived": {
        "type": "boolean",
        "default": false,
        "description": "Whether to include archived lists"
      },
      "limit": {
        "type": "number",
        "minimum": 1,
        "maximum": 100,
        "default": 50,
        "description": "Maximum number of lists to return"
      }
    },
    "required": []
  }
}
```

**Example Usage:**
```json
{
  "projectTag": "work",
  "limit": 10
}
```

**Response:** Returns an array of `SimpleListResponse` objects.

---

### 4. delete_list

Deletes or archives a todo list.

**Schema:**
```json
{
  "name": "delete_list",
  "description": "Delete or archive a todo list",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list to delete"
      },
      "permanent": {
        "type": "boolean",
        "default": false,
        "description": "Whether to permanently delete (true) or archive (false)"
      }
    },
    "required": ["listId"]
  }
}
```

**Example Usage:**
```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "permanent": false
}
```

**Response:** Returns a success confirmation message.

---

## Task Management Tools

### 5. add_task

Adds a new task to a todo list.

**Schema:**
```json
{
  "name": "add_task",
  "description": "Add a new task to a todo list",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list to add the task to"
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 200,
        "description": "The title of the task"
      },
      "description": {
        "type": "string",
        "maxLength": 1000,
        "description": "Optional description of the task"
      },
      "priority": {
        "type": "number",
        "minimum": 1,
        "maximum": 5,
        "default": 3,
        "description": "Task priority (1=lowest, 5=highest)"
      },
      "tags": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 50
        },
        "maxItems": 10,
        "description": "Optional tags for the task"
      },
      "estimatedDuration": {
        "type": "number",
        "minimum": 1,
        "description": "Estimated duration in minutes"
      }
    },
    "required": ["listId", "title"]
  }
}
```

**Example Usage:**
```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Review project proposal",
  "description": "Review the Q1 project proposal document",
  "priority": 4,
  "tags": ["review", "urgent"],
  "estimatedDuration": 30
}
```

**Response:** Returns a `SimpleTaskResponse` object.

---

### 6. update_task

Updates basic properties of a task.

**Schema:**
```json
{
  "name": "update_task",
  "description": "Update basic properties of a task",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list containing the task"
      },
      "taskId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the task to update"
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 200,
        "description": "New title for the task"
      },
      "description": {
        "type": "string",
        "maxLength": 1000,
        "description": "New description for the task"
      },
      "estimatedDuration": {
        "type": "number",
        "minimum": 1,
        "description": "New estimated duration in minutes"
      }
    },
    "required": ["listId", "taskId"]
  }
}
```

**Example Usage:**
```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "taskId": "456e7890-e89b-12d3-a456-426614174001",
  "title": "Review updated project proposal",
  "estimatedDuration": 45
}
```

**Response:** Returns a `SimpleTaskResponse` object.

---

### 7. remove_task

Removes a task from a todo list.

**Schema:**
```json
{
  "name": "remove_task",
  "description": "Remove a task from a todo list",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list containing the task"
      },
      "taskId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the task to remove"
      }
    },
    "required": ["listId", "taskId"]
  }
}
```

**Example Usage:**
```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "taskId": "456e7890-e89b-12d3-a456-426614174001"
}
```

**Response:** Returns a success confirmation message.

---

### 8. complete_task

Marks a task as completed.

**Schema:**
```json
{
  "name": "complete_task",
  "description": "Mark a task as completed",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list containing the task"
      },
      "taskId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the task to complete"
      }
    },
    "required": ["listId", "taskId"]
  }
}
```

**Example Usage:**
```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "taskId": "456e7890-e89b-12d3-a456-426614174001"
}
```

**Response:** Returns a `SimpleTaskResponse` object with updated status.

---

### 9. set_task_priority

Changes the priority of a task.

**Schema:**
```json
{
  "name": "set_task_priority",
  "description": "Change the priority of a task",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list containing the task"
      },
      "taskId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the task to update"
      },
      "priority": {
        "type": "number",
        "minimum": 1,
        "maximum": 5,
        "description": "New priority level (1=lowest, 5=highest)"
      }
    },
    "required": ["listId", "taskId", "priority"]
  }
}
```

**Example Usage:**
```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "taskId": "456e7890-e89b-12d3-a456-426614174001",
  "priority": 5
}
```

**Response:** Returns a `SimpleTaskResponse` object with updated priority.

---

### 10. add_task_tags

Adds tags to a task.

**Schema:**
```json
{
  "name": "add_task_tags",
  "description": "Add tags to a task",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list containing the task"
      },
      "taskId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the task to update"
      },
      "tags": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 50
        },
        "minItems": 1,
        "maxItems": 10,
        "description": "Tags to add to the task"
      }
    },
    "required": ["listId", "taskId", "tags"]
  }
}
```

**Example Usage:**
```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "taskId": "456e7890-e89b-12d3-a456-426614174001",
  "tags": ["urgent", "client-facing"]
}
```

**Response:** Returns a `SimpleTaskResponse` object with updated tags.

---

## Search & Display Tools

### 11. search_tasks

Searches tasks by text across titles and descriptions.

**Schema:**
```json
{
  "name": "search_tasks",
  "description": "Search tasks by text across titles and descriptions",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "minLength": 1,
        "maxLength": 200,
        "description": "Text to search for in task titles and descriptions"
      },
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "Optional: limit search to specific list"
      },
      "limit": {
        "type": "number",
        "minimum": 1,
        "maximum": 100,
        "default": 20,
        "description": "Maximum number of results to return"
      }
    },
    "required": ["query"]
  }
}
```

**Example Usage:**
```json
{
  "query": "project proposal",
  "limit": 10
}
```

**Response:** Returns a `SimpleSearchResponse` object.

---

### 12. filter_tasks

Filters tasks by specific criteria.

**Schema:**
```json
{
  "name": "filter_tasks",
  "description": "Filter tasks by specific criteria",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list to filter tasks from"
      },
      "status": {
        "type": "string",
        "enum": ["pending", "in_progress", "completed", "blocked", "cancelled"],
        "description": "Filter by task status"
      },
      "priority": {
        "type": "number",
        "minimum": 1,
        "maximum": 5,
        "description": "Filter by specific priority level"
      },
      "tag": {
        "type": "string",
        "maxLength": 50,
        "description": "Filter by specific tag"
      }
    },
    "required": ["listId"]
  }
}
```

**Example Usage:**
```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "pending",
  "priority": 4
}
```

**Response:** Returns a `SimpleSearchResponse` object.

---

### 13. show_tasks

Displays tasks with formatted output and grouping options.

**Schema:**
```json
{
  "name": "show_tasks",
  "description": "Display tasks with formatted output and grouping options",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list to display tasks from"
      },
      "format": {
        "type": "string",
        "enum": ["compact", "detailed", "summary"],
        "default": "detailed",
        "description": "Display format style"
      },
      "groupBy": {
        "type": "string",
        "enum": ["status", "priority", "none"],
        "default": "status",
        "description": "How to group the tasks"
      },
      "includeCompleted": {
        "type": "boolean",
        "default": true,
        "description": "Whether to include completed tasks"
      }
    },
    "required": ["listId"]
  }
}
```

**Example Usage:**
```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "format": "compact",
  "groupBy": "priority",
  "includeCompleted": false
}
```

**Response:** Returns a formatted text string with the task display.

---

## Advanced Features Tools

### 14. analyze_task

Analyzes task complexity and provides suggestions.

**Schema:**
```json
{
  "name": "analyze_task",
  "description": "Analyze task complexity and provide suggestions",
  "inputSchema": {
    "type": "object",
    "properties": {
      "taskDescription": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1000,
        "description": "Description of the task to analyze"
      },
      "context": {
        "type": "string",
        "maxLength": 500,
        "description": "Optional context about the project or domain"
      },
      "maxSuggestions": {
        "type": "number",
        "minimum": 1,
        "maximum": 10,
        "default": 5,
        "description": "Maximum number of suggestions to return"
      }
    },
    "required": ["taskDescription"]
  }
}
```

**Example Usage:**
```json
{
  "taskDescription": "Implement user authentication system with OAuth2",
  "context": "Web application using Node.js and React",
  "maxSuggestions": 3
}
```

**Response:** Returns an object with complexity score and suggestions array.

---

### 15. get_task_suggestions

Gets AI-generated task suggestions for a list.

**Schema:**
```json
{
  "name": "get_task_suggestions",
  "description": "Get AI-generated task suggestions for a list",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list to generate suggestions for"
      },
      "style": {
        "type": "string",
        "enum": ["creative", "practical", "detailed"],
        "default": "practical",
        "description": "Style of suggestions to generate"
      },
      "maxSuggestions": {
        "type": "number",
        "minimum": 1,
        "maximum": 10,
        "default": 5,
        "description": "Maximum number of suggestions to return"
      }
    },
    "required": ["listId"]
  }
}
```

**Example Usage:**
```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "style": "practical",
  "maxSuggestions": 5
}
```

**Response:** Returns an array of suggested tasks with titles and descriptions.

---

## Common Usage Workflows

The following section demonstrates typical task management workflows using the tools.

## Common Usage Workflows

### Workflow 1: Creating a New Project with Tasks

**Step 1: Create a new list**
```json
{
  "tool": "create_list",
  "parameters": {
    "title": "Website Redesign Project",
    "description": "Tasks for the company website redesign",
    "projectTag": "web-design"
  }
}
```

**Step 2: Add initial tasks**
```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Create wireframes",
    "description": "Design wireframes for main pages",
    "priority": 4,
    "tags": ["design", "wireframes"],
    "estimatedDuration": 120
  }
}
```

```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Set up development environment",
    "description": "Configure local dev environment with new framework",
    "priority": 5,
    "tags": ["setup", "development"],
    "estimatedDuration": 60
  }
}
```

**Step 3: View the list with tasks**
```json
{
  "tool": "get_list",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "includeCompleted": true
  }
}
```

### Workflow 2: Daily Task Management

**Step 1: Find high-priority pending tasks**
```json
{
  "tool": "filter_tasks",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "pending",
    "priority": 4
  }
}
```

**Step 2: Update task with more details**
```json
{
  "tool": "update_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001",
    "description": "Create wireframes for homepage, about page, and contact page using Figma",
    "estimatedDuration": 180
  }
}
```

**Step 3: Complete a task**
```json
{
  "tool": "complete_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001"
  }
}
```

**Step 4: Display progress**
```json
{
  "tool": "show_tasks",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "format": "summary",
    "groupBy": "status"
  }
}
```

### Workflow 3: Task Organization and Planning

**Step 1: Search for related tasks across all lists**
```json
{
  "tool": "search_tasks",
  "parameters": {
    "query": "database migration",
    "limit": 10
  }
}
```

**Step 2: Add tags to organize tasks**
```json
{
  "tool": "add_task_tags",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001",
    "tags": ["backend", "database", "migration"]
  }
}
```

**Step 3: Adjust priorities based on dependencies**
```json
{
  "tool": "set_task_priority",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001",
    "priority": 5
  }
}
```

**Step 4: Get AI suggestions for additional tasks**
```json
{
  "tool": "get_task_suggestions",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "style": "practical",
    "maxSuggestions": 3
  }
}
```

### Workflow 4: Project Analysis and Optimization

**Step 1: Analyze complex task for breakdown**
```json
{
  "tool": "analyze_task",
  "parameters": {
    "taskDescription": "Implement complete user authentication system with social login, password reset, and role-based access control",
    "context": "Node.js REST API with PostgreSQL database",
    "maxSuggestions": 5
  }
}
```

**Step 2: Filter tasks by specific criteria**
```json
{
  "tool": "filter_tasks",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "tag": "urgent"
  }
}
```

**Step 3: Display detailed view of remaining work**
```json
{
  "tool": "show_tasks",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "format": "detailed",
    "groupBy": "priority",
    "includeCompleted": false
  }
}
```

### Workflow 5: Project Cleanup and Archival

**Step 1: View all project lists**
```json
{
  "tool": "list_all_lists",
  "parameters": {
    "projectTag": "web-design",
    "includeArchived": false
  }
}
```

**Step 2: Remove unnecessary tasks**
```json
{
  "tool": "remove_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001"
  }
}
```

**Step 3: Archive completed project list**
```json
{
  "tool": "delete_list",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "permanent": false
  }
}
```

## Error Handling Examples

### Common Error Scenarios

**Invalid UUID Format:**
```json
{
  "error": "ValidationError",
  "message": "listId must be a valid UUID format",
  "code": "INVALID_UUID"
}
```

**List Not Found:**
```json
{
  "error": "NotFoundError",
  "message": "Todo list with ID '123e4567-e89b-12d3-a456-426614174000' not found",
  "code": "LIST_NOT_FOUND"
}
```

**Task Not Found:**
```json
{
  "error": "NotFoundError",
  "message": "Task with ID '456e7890-e89b-12d3-a456-426614174001' not found in list",
  "code": "TASK_NOT_FOUND"
}
```

**Validation Error:**
```json
{
  "error": "ValidationError",
  "message": "Title is required and cannot be empty",
  "code": "MISSING_REQUIRED_FIELD"
}
```

**Priority Out of Range:**
```json
{
  "error": "ValidationError",
  "message": "Priority must be between 1 and 5",
  "code": "INVALID_PRIORITY"
}
```

## Best Practices

### Tool Selection Guidelines

1. **Use focused tools**: Instead of complex update operations, use specific tools like `set_task_priority` or `add_task_tags`
2. **Chain simple operations**: Break complex workflows into multiple simple tool calls
3. **Validate inputs**: Always check required parameters before making tool calls
4. **Handle errors gracefully**: Implement proper error handling for all tool calls
5. **Use appropriate limits**: Set reasonable limits for search and list operations

### Performance Considerations

1. **Batch operations**: When possible, group related operations together
2. **Use filters**: Apply filters to reduce data transfer and processing
3. **Limit results**: Use appropriate limits for search and list operations
4. **Cache responses**: Cache frequently accessed list and task data when appropriate

### Agent Integration Tips

1. **Schema validation**: Always validate parameters against the tool schemas
2. **Error recovery**: Implement retry logic for transient errors
3. **Progress tracking**: Use the progress information in list responses for status updates
4. **Context awareness**: Use search and filter tools to maintain context across conversations

## Migration from Complex Tools

If you're migrating from the previous complex tool interface, here's a mapping guide:

### Tool Mapping

| Old Complex Tool | New Tools |
|------------------|---------------------|
| `create_todo_list` | `create_list` |
| `get_todo_list` | `get_list`, `show_tasks` |
| `update_todo_list` | `update_task`, `complete_task`, `set_task_priority`, `add_task_tags` |
| `list_todo_lists` | `list_all_lists` |
| `delete_todo_list` | `delete_list` |
| `analyze_task_complexity` | `analyze_task` |
| `search_todo_lists` | `search_tasks`, `filter_tasks` |
| `show_tasks` (complex) | `show_tasks` |

### Parameter Simplification

- **Nested objects**: Replaced with flat parameter structures
- **Complex filters**: Split into separate filter tools
- **Action enums**: Replaced with dedicated tools for each action
- **Optional complexity**: Reduced to essential parameters only

This interface maintains all functionality while providing a much more agent-friendly experience.