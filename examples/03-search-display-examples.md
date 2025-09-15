# Search & Display Examples

This document shows how to use the 3 search and display MCP tools to find and view your tasks. Each tool includes 5 practical examples demonstrating different ways to search, filter, and display your task information.

## 1. search_tasks

### Example 1: Search by Keyword
```json
{
  "name": "search_tasks",
  "arguments": {
    "query": "authentication",
    "limit": 10
  }
}
```

### Example 2: Search in Specific List
```json
{
  "name": "search_tasks",
  "arguments": {
    "query": "bug fix",
    "listId": "12345678-1234-1234-1234-123456789012",
    "limit": 5
  }
}
```

### Example 3: Search for Learning Tasks
```json
{
  "name": "search_tasks",
  "arguments": {
    "query": "learn react",
    "limit": 20
  }
}
```

### Example 4: Search for Documentation
```json
{
  "name": "search_tasks",
  "arguments": {
    "query": "documentation",
    "listId": "87654321-4321-4321-4321-210987654321",
    "limit": 15
  }
}
```

### Example 5: Search for API Tasks
```json
{
  "name": "search_tasks",
  "arguments": {
    "query": "API endpoint",
    "limit": 25
  }
}
```

## 2. filter_tasks

### Example 1: Filter by High Priority
```json
{
  "name": "filter_tasks",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "priority": 5
  }
}
```

### Example 2: Filter by Status
```json
{
  "name": "filter_tasks",
  "arguments": {
    "listId": "87654321-4321-4321-4321-210987654321",
    "status": "pending"
  }
}
```

### Example 3: Filter by Tag
```json
{
  "name": "filter_tasks",
  "arguments": {
    "listId": "abcdef12-3456-7890-abcd-ef1234567890",
    "tag": "frontend"
  }
}
```

### Example 4: Filter Completed Tasks
```json
{
  "name": "filter_tasks",
  "arguments": {
    "listId": "fedcba98-7654-3210-fedc-ba9876543210",
    "status": "completed"
  }
}
```

### Example 5: Filter by Medium Priority and Tag
```json
{
  "name": "filter_tasks",
  "arguments": {
    "listId": "11111111-2222-3333-4444-555555555555",
    "priority": 3,
    "tag": "backend"
  }
}
```

## 3. show_tasks

### Example 1: Detailed View Grouped by Status
```json
{
  "name": "show_tasks",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "format": "detailed",
    "groupBy": "status",
    "includeCompleted": true
  }
}
```

### Example 2: Compact View Grouped by Priority
```json
{
  "name": "show_tasks",
  "arguments": {
    "listId": "87654321-4321-4321-4321-210987654321",
    "format": "compact",
    "groupBy": "priority",
    "includeCompleted": false
  }
}
```

### Example 3: Summary View Without Grouping
```json
{
  "name": "show_tasks",
  "arguments": {
    "listId": "abcdef12-3456-7890-abcd-ef1234567890",
    "format": "summary",
    "groupBy": "none",
    "includeCompleted": true
  }
}
```

### Example 4: Detailed View Active Tasks Only
```json
{
  "name": "show_tasks",
  "arguments": {
    "listId": "fedcba98-7654-3210-fedc-ba9876543210",
    "format": "detailed",
    "groupBy": "status",
    "includeCompleted": false
  }
}
```

### Example 5: Compact View All Tasks by Priority
```json
{
  "name": "show_tasks",
  "arguments": {
    "listId": "11111111-2222-3333-4444-555555555555",
    "format": "compact",
    "groupBy": "priority",
    "includeCompleted": true
  }
}
```

## Response Formats

### search_tasks Response
```json
{
  "results": [
    {
      "id": "task-uuid",
      "title": "Task Title",
      "description": "Task description",
      "status": "pending",
      "priority": 4,
      "tags": ["tag1", "tag2"],
      "createdAt": "2025-09-15T10:00:00.000Z",
      "updatedAt": "2025-09-15T10:00:00.000Z",
      "estimatedDuration": 120
    }
  ],
  "totalCount": 1,
  "hasMore": false
}
```

### filter_tasks Response
```json
{
  "results": [
    {
      "id": "task-uuid",
      "title": "Filtered Task",
      "description": "Task matching filter criteria",
      "status": "pending",
      "priority": 5,
      "tags": ["critical", "backend"],
      "createdAt": "2025-09-15T10:00:00.000Z",
      "updatedAt": "2025-09-15T10:00:00.000Z",
      "estimatedDuration": 240
    }
  ],
  "totalCount": 1,
  "hasMore": false
}
```

### show_tasks Response (Formatted Text)
```
# Project Name
Project description

## High Priority (2)

✅ **Completed Task** 🔴
   Task description here
   *Tags: tag1, tag2 | Duration: 120min | Created: 9/15/2025*

⏳ **Pending Task** 🔴
   Another task description
   *Tags: tag3, tag4 | Duration: 180min | Created: 9/15/2025*

## Medium Priority (1)

⏳ **Another Task** 🟠
   Task description
   *Tags: tag5 | Duration: 60min | Created: 9/15/2025*
```