# Task Management Examples

This document demonstrates how to use the 6 task management MCP tools with real-world examples. Each tool includes 5 different scenarios showing various ways to create, modify, and manage tasks within your todo lists.

## 1. add_task

### Example 1: High Priority Development Task
```json
{
  "name": "add_task",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "title": "Implement user authentication",
    "description": "Create secure login/logout functionality with JWT tokens",
    "priority": 5,
    "estimatedDuration": 480,
    "tags": ["auth", "security", "backend"]
  }
}
```

### Example 2: Simple Daily Task
```json
{
  "name": "add_task",
  "arguments": {
    "listId": "87654321-4321-4321-4321-210987654321",
    "title": "Review pull requests",
    "description": "Review and approve pending pull requests from team members",
    "priority": 3,
    "estimatedDuration": 60,
    "tags": ["review", "teamwork"]
  }
}
```

### Example 3: Learning Task with Resources
```json
{
  "name": "add_task",
  "arguments": {
    "listId": "abcdef12-3456-7890-abcd-ef1234567890",
    "title": "Study React Hooks",
    "description": "Complete React Hooks tutorial and build practice project",
    "priority": 4,
    "estimatedDuration": 300,
    "tags": ["learning", "react", "frontend"]
  }
}
```

### Example 4: Bug Fix Task
```json
{
  "name": "add_task",
  "arguments": {
    "listId": "fedcba98-7654-3210-fedc-ba9876543210",
    "title": "Fix memory leak in data processing",
    "description": "Investigate and resolve memory leak causing performance issues",
    "priority": 5,
    "estimatedDuration": 240,
    "tags": ["bugfix", "performance", "critical"]
  }
}
```

### Example 5: Documentation Task
```json
{
  "name": "add_task",
  "arguments": {
    "listId": "11111111-2222-3333-4444-555555555555",
    "title": "Update API documentation",
    "description": "Document new endpoints and update existing API specs",
    "priority": 2,
    "estimatedDuration": 120,
    "tags": ["documentation", "api"]
  }
}
```

## 2. update_task

### Example 1: Update Task Title and Description
```json
{
  "name": "update_task",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "taskId": "task1234-5678-9012-3456-789012345678",
    "title": "Implement OAuth 2.0 authentication",
    "description": "Create secure OAuth 2.0 login with Google and GitHub providers"
  }
}
```

### Example 2: Update Estimated Duration
```json
{
  "name": "update_task",
  "arguments": {
    "listId": "87654321-4321-4321-4321-210987654321",
    "taskId": "task2345-6789-0123-4567-890123456789",
    "estimatedDuration": 180
  }
}
```

### Example 3: Update Task Description Only
```json
{
  "name": "update_task",
  "arguments": {
    "listId": "abcdef12-3456-7890-abcd-ef1234567890",
    "taskId": "task3456-7890-1234-5678-901234567890",
    "description": "Complete advanced React Hooks tutorial, build todo app, and write unit tests"
  }
}
```

### Example 4: Update Title for Clarity
```json
{
  "name": "update_task",
  "arguments": {
    "listId": "fedcba98-7654-3210-fedc-ba9876543210",
    "taskId": "task4567-8901-2345-6789-012345678901",
    "title": "Fix critical memory leak in user data processing module"
  }
}
```

### Example 5: Update All Fields
```json
{
  "name": "update_task",
  "arguments": {
    "listId": "11111111-2222-3333-4444-555555555555",
    "taskId": "task5678-9012-3456-7890-123456789012",
    "title": "Create comprehensive API documentation with examples",
    "description": "Document all REST endpoints, WebSocket events, and provide code examples in multiple languages",
    "estimatedDuration": 360
  }
}
```

## 3. remove_task

### Example 1: Remove Completed Task
```json
{
  "name": "remove_task",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "taskId": "task1234-5678-9012-3456-789012345678"
  }
}
```

### Example 2: Remove Duplicate Task
```json
{
  "name": "remove_task",
  "arguments": {
    "listId": "87654321-4321-4321-4321-210987654321",
    "taskId": "task2345-6789-0123-4567-890123456789"
  }
}
```

### Example 3: Remove Cancelled Task
```json
{
  "name": "remove_task",
  "arguments": {
    "listId": "abcdef12-3456-7890-abcd-ef1234567890",
    "taskId": "task3456-7890-1234-5678-901234567890"
  }
}
```

### Example 4: Remove Outdated Task
```json
{
  "name": "remove_task",
  "arguments": {
    "listId": "fedcba98-7654-3210-fedc-ba9876543210",
    "taskId": "task4567-8901-2345-6789-012345678901"
  }
}
```

### Example 5: Remove Test Task
```json
{
  "name": "remove_task",
  "arguments": {
    "listId": "11111111-2222-3333-4444-555555555555",
    "taskId": "task5678-9012-3456-7890-123456789012"
  }
}
```

## 4. complete_task

### Example 1: Complete Development Task
```json
{
  "name": "complete_task",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "taskId": "task1234-5678-9012-3456-789012345678"
  }
}
```

### Example 2: Complete Review Task
```json
{
  "name": "complete_task",
  "arguments": {
    "listId": "87654321-4321-4321-4321-210987654321",
    "taskId": "task2345-6789-0123-4567-890123456789"
  }
}
```

### Example 3: Complete Learning Task
```json
{
  "name": "complete_task",
  "arguments": {
    "listId": "abcdef12-3456-7890-abcd-ef1234567890",
    "taskId": "task3456-7890-1234-5678-901234567890"
  }
}
```

### Example 4: Complete Bug Fix
```json
{
  "name": "complete_task",
  "arguments": {
    "listId": "fedcba98-7654-3210-fedc-ba9876543210",
    "taskId": "task4567-8901-2345-6789-012345678901"
  }
}
```

### Example 5: Complete Documentation
```json
{
  "name": "complete_task",
  "arguments": {
    "listId": "11111111-2222-3333-4444-555555555555",
    "taskId": "task5678-9012-3456-7890-123456789012"
  }
}
```

## 5. set_task_priority

### Example 1: Set Critical Priority
```json
{
  "name": "set_task_priority",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "taskId": "task1234-5678-9012-3456-789012345678",
    "priority": 5
  }
}
```

### Example 2: Set High Priority
```json
{
  "name": "set_task_priority",
  "arguments": {
    "listId": "87654321-4321-4321-4321-210987654321",
    "taskId": "task2345-6789-0123-4567-890123456789",
    "priority": 4
  }
}
```

### Example 3: Set Medium Priority
```json
{
  "name": "set_task_priority",
  "arguments": {
    "listId": "abcdef12-3456-7890-abcd-ef1234567890",
    "taskId": "task3456-7890-1234-5678-901234567890",
    "priority": 3
  }
}
```

### Example 4: Set Low Priority
```json
{
  "name": "set_task_priority",
  "arguments": {
    "listId": "fedcba98-7654-3210-fedc-ba9876543210",
    "taskId": "task4567-8901-2345-6789-012345678901",
    "priority": 2
  }
}
```

### Example 5: Set Lowest Priority
```json
{
  "name": "set_task_priority",
  "arguments": {
    "listId": "11111111-2222-3333-4444-555555555555",
    "taskId": "task5678-9012-3456-7890-123456789012",
    "priority": 1
  }
}
```

## 6. add_task_tags

### Example 1: Add Development Tags
```json
{
  "name": "add_task_tags",
  "arguments": {
    "listId": "12345678-1234-1234-1234-123456789012",
    "taskId": "task1234-5678-9012-3456-789012345678",
    "tags": ["frontend", "react", "typescript"]
  }
}
```

### Example 2: Add Priority Tags
```json
{
  "name": "add_task_tags",
  "arguments": {
    "listId": "87654321-4321-4321-4321-210987654321",
    "taskId": "task2345-6789-0123-4567-890123456789",
    "tags": ["urgent", "critical", "hotfix"]
  }
}
```

### Example 3: Add Category Tags
```json
{
  "name": "add_task_tags",
  "arguments": {
    "listId": "abcdef12-3456-7890-abcd-ef1234567890",
    "taskId": "task3456-7890-1234-5678-901234567890",
    "tags": ["learning", "tutorial", "practice"]
  }
}
```

### Example 4: Add Team Tags
```json
{
  "name": "add_task_tags",
  "arguments": {
    "listId": "fedcba98-7654-3210-fedc-ba9876543210",
    "taskId": "task4567-8901-2345-6789-012345678901",
    "tags": ["backend-team", "database", "optimization"]
  }
}
```

### Example 5: Add Status Tags
```json
{
  "name": "add_task_tags",
  "arguments": {
    "listId": "11111111-2222-3333-4444-555555555555",
    "taskId": "task5678-9012-3456-7890-123456789012",
    "tags": ["in-progress", "needs-review", "documentation"]
  }
}
```