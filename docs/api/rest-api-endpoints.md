# REST API Endpoints

## Overview

The Task MCP Unified system provides a comprehensive REST API that mirrors the MCP tools functionality. The REST API is particularly useful for web applications, bulk operations (not available in MCP), and integrations that prefer HTTP-based communication.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Currently, the REST API does not require authentication. This may change in future versions for production deployments.

## Common Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": {
    /* response data */
  },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "details": {
    /* error details */
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## List Management Endpoints

### GET /lists

Get all task lists.

**Query Parameters:**

- `projectTag` (optional): Filter by project tag
- `limit` (optional): Maximum number of lists to return (default: 50)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "List Title",
      "description": "List description",
      "taskCount": 5,
      "completedCount": 2,
      "progress": 40,
      "lastUpdated": "2024-01-15T10:30:00Z",
      "projectTag": "project-tag"
    }
  ]
}
```

### POST /lists

Create a new task list.

**Request Body:**

```json
{
  "title": "New List",
  "description": "Optional description",
  "projectTag": "optional-tag"
}
```

### GET /lists/:listId

Get a specific task list with its tasks.

**Query Parameters:**

- `includeCompleted` (optional): Include completed tasks (default: true)

### PUT /lists/:listId

Update list metadata.

**Request Body:**

```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "projectTag": "updated-tag"
}
```

### DELETE /lists/:listId

Delete a task list permanently.

## Task Management Endpoints

### POST /lists/:listId/tasks

Add a new task to a list.

**Request Body:**

```json
{
  "title": "Task Title",
  "description": "Task description",
  "priority": 3,
  "tags": ["tag1", "tag2"],
  "estimatedDuration": 60,
  "dependencies": ["task-uuid"],
  "exitCriteria": ["Criteria 1", "Criteria 2"]
}
```

### PUT /lists/:listId/tasks/:taskId

Update a task.

**Request Body:**

```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "priority": 4
}
```

### DELETE /lists/:listId/tasks/:taskId

Remove a task from a list.

### POST /lists/:listId/tasks/:taskId/complete

Mark a task as completed.

### PUT /lists/:listId/tasks/:taskId/priority

Update task priority.

**Request Body:**

```json
{
  "priority": 5
}
```

### POST /lists/:listId/tasks/:taskId/tags

Add tags to a task.

**Request Body:**

```json
{
  "tags": ["new-tag", "another-tag"]
}
```

### DELETE /lists/:listId/tasks/:taskId/tags

Remove tags from a task.

**Request Body:**

```json
{
  "tags": ["tag-to-remove"]
}
```

## Search and Display Endpoints

### GET /lists/:listId/tasks/search

Search and filter tasks.

**Query Parameters:**

- `query` (optional): Text search query
- `status` (optional): Filter by status (pending, in_progress, completed)
- `priority` (optional): Filter by priority (1-5)
- `tags` (optional): Filter by tags (comma-separated)
- `isReady` (optional): Filter ready tasks (true/false)
- `isBlocked` (optional): Filter blocked tasks (true/false)
- `limit` (optional): Maximum results (default: 50)

### GET /lists/:listId/tasks/ready

Get tasks that are ready to work on (no incomplete dependencies).

**Query Parameters:**

- `limit` (optional): Maximum number of tasks (default: 20)

## Dependency Management Endpoints

### PUT /lists/:listId/tasks/:taskId/dependencies

Set task dependencies.

**Request Body:**

```json
{
  "dependencyIds": ["task-uuid-1", "task-uuid-2"]
}
```

### GET /lists/:listId/dependencies/analyze

Analyze task dependencies and project structure.

**Query Parameters:**

- `format` (optional): Output format (analysis, dag, both)
- `dagStyle` (optional): DAG visualization style (ascii, dot, mermaid)

## Exit Criteria Management Endpoints

### PUT /lists/:listId/tasks/:taskId/exit-criteria

Set exit criteria for a task.

**Request Body:**

```json
{
  "exitCriteria": ["Criteria 1", "Criteria 2", "Criteria 3"]
}
```

### PUT /lists/:listId/tasks/:taskId/exit-criteria/:criteriaId

Update specific exit criteria status.

**Request Body:**

```json
{
  "isMet": true,
  "notes": "Criteria completed successfully"
}
```

## Bulk Operations Endpoints (REST API Only - Not Available in MCP)

### POST /lists/:listId/tasks/bulk

Perform multiple task operations in a single request.

**Request Body:**

```json
{
  "operations": [
    {
      "type": "create",
      "data": {
        "title": "New Task",
        "priority": 3
      }
    },
    {
      "type": "update",
      "taskId": "task-uuid",
      "data": {
        "priority": 5
      }
    },
    {
      "type": "complete",
      "taskId": "task-uuid"
    }
  ]
}
```

**Supported Operation Types:**

- `create`: Create a new task
- `update`: Update an existing task
- `complete`: Mark a task as completed
- `delete`: Remove a task
- `set_priority`: Update task priority
- `add_tags`: Add tags to a task
- `remove_tags`: Remove tags from a task

## Error Handling

The API provides detailed error messages for validation failures and other issues:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "field": "priority",
    "message": "Priority must be between 1 and 5",
    "received": "10"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Rate Limiting

Currently, no rate limiting is implemented. This may be added in future versions for production deployments.

## CORS Support

The API includes CORS support for cross-origin requests from web applications.

## Health Check

### GET /health

Check API server health status.

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "version": "2.5.0"
  }
}
```
