# List Management Examples

This document shows how to use the 4 list management MCP tools with practical examples. Each tool includes 5 different usage scenarios to help you understand the various ways to manage your todo lists.

## 1. create_list

### Example 1: Basic Project List
```json
{
  "name": "create_list",
  "arguments": {
    "title": "Website Redesign",
    "description": "Complete redesign of company website",
    "projectTag": "web-dev"
  }
}
```

### Example 2: Personal Task List
```json
{
  "name": "create_list",
  "arguments": {
    "title": "Daily Tasks",
    "description": "My daily personal and work tasks"
  }
}
```

### Example 3: Team Sprint Planning
```json
{
  "name": "create_list",
  "arguments": {
    "title": "Sprint 23 - Q4 Features",
    "description": "Development tasks for Q4 feature release",
    "projectTag": "sprint-23"
  }
}
```

### Example 4: Learning Goals
```json
{
  "name": "create_list",
  "arguments": {
    "title": "Learn TypeScript",
    "description": "Comprehensive TypeScript learning path with practical projects",
    "projectTag": "learning"
  }
}
```

### Example 5: Event Planning
```json
{
  "name": "create_list",
  "arguments": {
    "title": "Company Annual Meeting",
    "description": "Tasks for organizing the 2025 annual company meeting",
    "projectTag": "events"
  }
}
```

## 2. get_list

### Example 1: Get List with Completed Tasks
```json
{
  "name": "get_list",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "includeCompleted": true
  }
}
```

### Example 2: Get List Without Completed Tasks
```json
{
  "name": "get_list",
  "arguments": {
    "listId": "87654321-4321-4321-4321-210987654321",
    "includeCompleted": false
  }
}
```

### Example 3: Get Active Sprint List
```json
{
  "name": "get_list",
  "arguments": {
    "listId": "abcdef12-3456-7890-abcd-ef1234567890",
    "includeCompleted": false
  }
}
```

### Example 4: Get Complete Project History
```json
{
  "name": "get_list",
  "arguments": {
    "listId": "fedcba98-7654-3210-fedc-ba9876543210",
    "includeCompleted": true
  }
}
```

### Example 5: Get Learning Progress
```json
{
  "name": "get_list",
  "arguments": {
    "listId": "11111111-2222-3333-4444-555555555555",
    "includeCompleted": true
  }
}
```

## 3. list_all_lists

### Example 1: Get All Lists (Default)
```json
{
  "name": "list_all_lists",
  "arguments": {}
}
```

### Example 2: Get Limited Number of Lists
```json
{
  "name": "list_all_lists",
  "arguments": {
    "limit": 5
  }
}
```

### Example 3: Get Lists by Project Tag
```json
{
  "name": "list_all_lists",
  "arguments": {
    "projectTag": "web-dev",
    "limit": 10
  }
}
```

### Example 4: Get All Lists Including Archived
```json
{
  "name": "list_all_lists",
  "arguments": {
    "includeArchived": true,
    "limit": 20
  }
}
```

### Example 5: Get Sprint Lists Only
```json
{
  "name": "list_all_lists",
  "arguments": {
    "projectTag": "sprint",
    "includeArchived": false,
    "limit": 15
  }
}
```

## 4. delete_list

### Example 1: Archive a List (Default)
```json
{
  "name": "delete_list",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012"
  }
}
```

### Example 2: Permanently Delete a List
```json
{
  "name": "delete_list",
  "arguments": {
    "listId": "87654321-4321-4321-4321-210987654321",
    "permanent": true
  }
}
```

### Example 3: Archive Completed Project
```json
{
  "name": "delete_list",
  "arguments": {
    "listId": "abcdef12-3456-7890-abcd-ef1234567890",
    "permanent": false
  }
}
```

### Example 4: Delete Test List Permanently
```json
{
  "name": "delete_list",
  "arguments": {
    "listId": "testlist-1234-5678-9012-345678901234",
    "permanent": true
  }
}
```

### Example 5: Archive Old Sprint
```json
{
  "name": "delete_list",
  "arguments": {
    "listId": "sprint22-1234-5678-9012-345678901234",
    "permanent": false
  }
}
```