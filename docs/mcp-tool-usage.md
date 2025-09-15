# MCP Tool Usage Guide

This guide provides practical examples and usage patterns for the MCP Task Manager's 15 tools.

**Last Updated**: September 15, 2025  
**Version**: 2.0.0 (Production Ready)  
**Coverage**: All 15 MCP tools with practical examples

## Quick Reference

### List Management Tools

#### create_list
**Purpose:** Create a new todo list with basic information.

**Basic Usage:**
```json
{
  "name": "create_list",
  "arguments": {
    "title": "Website Redesign",
    "description": "Tasks for the company website redesign project",
    "projectTag": "web-design"
  }
}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Website Redesign",
  "description": "Tasks for the company website redesign project",
  "taskCount": 0,
  "completedCount": 0,
  "progress": 0,
  "lastUpdated": "2024-01-15T10:30:00Z",
  "projectTag": "web-design"
}
```

#### get_list
**Purpose:** Retrieve a specific todo list by ID.

**Basic Usage:**
```json
{
  "name": "get_list",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "includeCompleted": false
  }
}
```

#### list_all_lists
**Purpose:** Get all todo lists with basic information.

**Basic Usage:**
```json
{
  "name": "list_all_lists",
  "arguments": {
    "projectTag": "web-design",
    "limit": 10
  }
}
```

#### delete_list
**Purpose:** Delete or archive a todo list.

**Basic Usage:**
```json
{
  "name": "delete_list",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "permanent": false
  }
}
```

### Task Management Tools

#### add_task
**Purpose:** Add a new task to a todo list.

**Basic Usage:**
```json
{
  "name": "add_task",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Create wireframes",
    "description": "Design wireframes for main pages",
    "priority": 4,
    "tags": ["design", "wireframes"],
    "estimatedDuration": 120
  }
}
```

#### update_task
**Purpose:** Update basic task properties.

**Basic Usage:**
```json
{
  "name": "update_task",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001",
    "title": "Create detailed wireframes",
    "estimatedDuration": 180
  }
}
```

#### remove_task
**Purpose:** Remove a task from a todo list.

**Basic Usage:**
```json
{
  "name": "remove_task",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001"
  }
}
```

#### complete_task
**Purpose:** Mark a task as completed.

**Basic Usage:**
```json
{
  "name": "complete_task",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001"
  }
}
```

#### set_task_priority
**Purpose:** Change task priority.

**Basic Usage:**
```json
{
  "name": "set_task_priority",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001",
    "priority": 5
  }
}
```

#### add_task_tags
**Purpose:** Add tags to a task.

**Basic Usage:**
```json
{
  "name": "add_task_tags",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001",
    "tags": ["urgent", "client-facing"]
  }
}
```

### Search & Display Tools

#### search_tasks
**Purpose:** Search tasks by text query.

**Basic Usage:**
```json
{
  "name": "search_tasks",
  "arguments": {
    "query": "wireframes",
    "limit": 10
  }
}
```

#### filter_tasks
**Purpose:** Filter tasks by specific criteria.

**Basic Usage:**
```json
{
  "name": "filter_tasks",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "pending",
    "priority": 4
  }
}
```

#### show_tasks
**Purpose:** Display tasks in formatted output.

**Basic Usage:**
```json
{
  "name": "show_tasks",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "format": "detailed",
    "groupBy": "priority",
    "includeCompleted": false
  }
}
```

### Advanced Features Tools

#### analyze_task
**Purpose:** Analyze task complexity and get suggestions.

**Basic Usage:**
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

#### get_task_suggestions
**Purpose:** Get AI-generated task suggestions for a list.

**Basic Usage:**
```json
{
  "name": "get_task_suggestions",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "style": "practical",
    "maxSuggestions": 5
  }
}
```

## Common Workflows

### Creating a Project with Tasks

1. **Create the list:**
```json
{
  "name": "create_list",
  "arguments": {
    "title": "Mobile App Development",
    "description": "Tasks for the new mobile app project",
    "projectTag": "mobile-app"
  }
}
```

2. **Add initial tasks:**
```json
{
  "name": "add_task",
  "arguments": {
    "listId": "list-uuid-here",
    "title": "Set up development environment",
    "priority": 5,
    "tags": ["setup", "development"]
  }
}
```

3. **Get suggestions for more tasks:**
```json
{
  "name": "get_task_suggestions",
  "arguments": {
    "listId": "list-uuid-here",
    "style": "technical",
    "maxSuggestions": 5
  }
}
```

### Daily Task Management

1. **View pending high-priority tasks:**
```json
{
  "name": "filter_tasks",
  "arguments": {
    "listId": "list-uuid-here",
    "status": "pending",
    "priority": 4
  }
}
```

2. **Complete a task:**
```json
{
  "name": "complete_task",
  "arguments": {
    "listId": "list-uuid-here",
    "taskId": "task-uuid-here"
  }
}
```

3. **View progress:**
```json
{
  "name": "show_tasks",
  "arguments": {
    "listId": "list-uuid-here",
    "format": "summary",
    "groupBy": "status"
  }
}
```

### Project Analysis

1. **Analyze complex tasks:**
```json
{
  "name": "analyze_task",
  "arguments": {
    "taskDescription": "Build complete user management system with authentication, authorization, and profile management",
    "context": "React frontend with Node.js backend"
  }
}
```

2. **Search for related tasks:**
```json
{
  "name": "search_tasks",
  "arguments": {
    "query": "authentication",
    "limit": 20
  }
}
```

## Error Handling

All tools return consistent error responses:

```json
{
  "error": "ValidationError",
  "message": "listId must be a valid UUID format",
  "code": "INVALID_UUID"
}
```

Common error types:
- **ValidationError**: Invalid parameters
- **NotFoundError**: Resource not found
- **OperationError**: Operation failed

## Best Practices

1. **Use specific tools**: Instead of complex operations, use focused tools like `set_task_priority` or `add_task_tags`
2. **Chain operations**: Break complex workflows into multiple simple tool calls
3. **Handle errors**: Always check for error responses
4. **Use appropriate limits**: Set reasonable limits for search operations
5. **Validate UUIDs**: Ensure UUIDs are properly formatted before making calls

## Performance Tips

- Use `filter_tasks` instead of `search_tasks` when you know the specific criteria
- Set appropriate limits on search and list operations
- Use `includeCompleted: false` when you only need pending tasks
- Cache list IDs to avoid repeated `list_all_lists` calls

For complete tool schemas and advanced examples, see [mcp-tools.md](./mcp-tools.md).