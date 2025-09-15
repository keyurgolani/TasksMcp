# MCP Tools - Practical Examples

## Overview

This document provides practical examples of using the 15 MCP tools for common task management scenarios. Each example includes the tool call, expected response, and explanation of the workflow.

## Example 1: Setting Up a New Development Sprint

### Scenario
A development team needs to set up a new sprint with tasks for a mobile app feature.

### Step-by-Step Implementation

**1. Create the sprint list**
```json
{
  "tool": "create_list",
  "parameters": {
    "title": "Mobile App - User Profile Feature",
    "description": "Sprint 23: Implement user profile management functionality",
    "projectTag": "mobile-app"
  }
}
```

**Expected Response:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Mobile App - User Profile Feature",
  "description": "Sprint 23: Implement user profile management functionality",
  "taskCount": 0,
  "completedCount": 0,
  "progress": 0,
  "lastUpdated": "2024-01-15T09:00:00Z",
  "projectTag": "mobile-app"
}
```

**2. Add backend tasks**
```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Create user profile API endpoints",
    "description": "Implement GET, PUT, POST endpoints for user profile management",
    "priority": 5,
    "tags": ["backend", "api", "critical"],
    "estimatedDuration": 240
  }
}
```

```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Set up profile image upload",
    "description": "Implement secure image upload with validation and storage",
    "priority": 4,
    "tags": ["backend", "storage", "security"],
    "estimatedDuration": 180
  }
}
```

**3. Add frontend tasks**
```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Design profile screen UI",
    "description": "Create responsive profile screen with edit capabilities",
    "priority": 4,
    "tags": ["frontend", "ui", "design"],
    "estimatedDuration": 120
  }
}
```

```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Implement profile form validation",
    "description": "Add client-side validation for profile form fields",
    "priority": 3,
    "tags": ["frontend", "validation"],
    "estimatedDuration": 90
  }
}
```

**4. View the complete sprint**
```json
{
  "tool": "show_tasks",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "format": "detailed",
    "groupBy": "priority",
    "includeCompleted": true
  }
}
```

## Example 2: Daily Standup Task Review

### Scenario
A team member needs to review their tasks for the daily standup meeting.

**1. Find all high-priority pending tasks**
```json
{
  "tool": "filter_tasks",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "pending",
    "priority": 5
  }
}
```

**Expected Response:**
```json
{
  "results": [
    {
      "id": "task-001",
      "title": "Create user profile API endpoints",
      "description": "Implement GET, PUT, POST endpoints for user profile management",
      "status": "pending",
      "priority": 5,
      "tags": ["backend", "api", "critical"],
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-01-15T09:00:00Z",
      "estimatedDuration": 240
    }
  ],
  "totalCount": 1,
  "hasMore": false
}
```

**2. Update task status to in-progress**
```json
{
  "tool": "update_task",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "taskId": "task-001",
    "description": "Implement GET, PUT, POST endpoints for user profile management - Started with GET endpoint"
  }
}
```

**3. Get a summary view for standup**
```json
{
  "tool": "show_tasks",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "format": "summary",
    "groupBy": "status",
    "includeCompleted": true
  }
}
```

## Example 3: Task Completion and Progress Tracking

### Scenario
Completing tasks and tracking progress throughout the day.

**1. Complete a finished task**
```json
{
  "tool": "complete_task",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "taskId": "task-002"
  }
}
```

**Expected Response:**
```json
{
  "id": "task-002",
  "title": "Set up profile image upload",
  "description": "Implement secure image upload with validation and storage",
  "status": "completed",
  "priority": 4,
  "tags": ["backend", "storage", "security"],
  "createdAt": "2024-01-15T09:00:00Z",
  "updatedAt": "2024-01-15T14:30:00Z",
  "estimatedDuration": 180
}
```

**2. Check overall progress**
```json
{
  "tool": "get_list",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "includeCompleted": true
  }
}
```

**3. Add tags to track completion**
```json
{
  "tool": "add_task_tags",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "taskId": "task-002",
    "tags": ["completed-today", "tested"]
  }
}
```

## Example 4: Task Analysis and Planning

### Scenario
Breaking down a complex task and getting AI assistance for planning.

**1. Analyze a complex task**
```json
{
  "tool": "analyze_task",
  "parameters": {
    "taskDescription": "Implement real-time chat functionality with message history, file sharing, and push notifications",
    "context": "React Native mobile app with Node.js backend and Socket.io",
    "maxSuggestions": 5
  }
}
```

**Expected Response:**
```json
{
  "complexityScore": 8.5,
  "estimatedHours": 40,
  "suggestions": [
    "Set up Socket.io server and client connection",
    "Create message database schema and models",
    "Implement real-time message sending and receiving",
    "Add file upload and sharing functionality",
    "Integrate push notification service (FCM/APNS)"
  ],
  "riskFactors": [
    "Real-time synchronization complexity",
    "File storage and security considerations",
    "Push notification platform differences"
  ]
}
```

**2. Get additional task suggestions**
```json
{
  "tool": "get_task_suggestions",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "style": "detailed",
    "maxSuggestions": 3
  }
}
```

**Expected Response:**
```json
{
  "suggestions": [
    {
      "title": "Write unit tests for profile API endpoints",
      "description": "Create comprehensive test suite covering all profile management endpoints with edge cases",
      "estimatedDuration": 120,
      "suggestedTags": ["testing", "backend", "quality-assurance"]
    },
    {
      "title": "Implement profile data caching",
      "description": "Add Redis caching layer for frequently accessed profile data to improve performance",
      "estimatedDuration": 90,
      "suggestedTags": ["performance", "caching", "backend"]
    },
    {
      "title": "Add profile analytics tracking",
      "description": "Implement analytics events for profile views, edits, and image uploads",
      "estimatedDuration": 60,
      "suggestedTags": ["analytics", "tracking", "metrics"]
    }
  ]
}
```

## Example 5: Cross-Project Task Management

### Scenario
Managing tasks across multiple projects and finding related work.

**1. Search for related tasks across all projects**
```json
{
  "tool": "search_tasks",
  "parameters": {
    "query": "authentication",
    "limit": 10
  }
}
```

**Expected Response:**
```json
{
  "results": [
    {
      "id": "task-auth-001",
      "title": "Implement OAuth2 authentication",
      "description": "Set up OAuth2 flow for Google and Facebook login",
      "status": "in_progress",
      "priority": 5,
      "tags": ["auth", "oauth", "security"],
      "createdAt": "2024-01-10T10:00:00Z",
      "updatedAt": "2024-01-14T16:30:00Z",
      "estimatedDuration": 300
    },
    {
      "id": "task-auth-002",
      "title": "Add JWT token validation middleware",
      "description": "Create middleware to validate JWT tokens on protected routes",
      "status": "pending",
      "priority": 4,
      "tags": ["auth", "jwt", "middleware"],
      "createdAt": "2024-01-12T14:00:00Z",
      "updatedAt": "2024-01-12T14:00:00Z",
      "estimatedDuration": 120
    }
  ],
  "totalCount": 2,
  "hasMore": false
}
```

**2. View all project lists**
```json
{
  "tool": "list_all_lists",
  "parameters": {
    "includeArchived": false,
    "limit": 20
  }
}
```

**3. Filter tasks by specific tag across a project**
```json
{
  "tool": "filter_tasks",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "tag": "security"
  }
}
```

## Example 6: Sprint Retrospective and Cleanup

### Scenario
End of sprint cleanup and task organization.

**1. View completed tasks for retrospective**
```json
{
  "tool": "filter_tasks",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "completed"
  }
}
```

**2. Update priorities for remaining tasks**
```json
{
  "tool": "set_task_priority",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "taskId": "task-003",
    "priority": 5
  }
}
```

**3. Remove obsolete tasks**
```json
{
  "tool": "remove_task",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "taskId": "task-obsolete-001"
  }
}
```

**4. Archive the completed sprint**
```json
{
  "tool": "delete_list",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "permanent": false
  }
}
```

## Example 7: Emergency Bug Fix Workflow

### Scenario
Handling urgent bug fixes and priority adjustments.

**1. Create urgent bug fix list**
```json
{
  "tool": "create_list",
  "parameters": {
    "title": "URGENT: Production Bug Fixes",
    "description": "Critical bugs found in production that need immediate attention",
    "projectTag": "hotfix"
  }
}
```

**2. Add critical bug task**
```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "bug-fix-list-id",
    "title": "Fix user login timeout issue",
    "description": "Users are getting logged out after 5 minutes instead of 30 minutes",
    "priority": 5,
    "tags": ["critical", "auth", "production", "hotfix"],
    "estimatedDuration": 45
  }
}
```

**3. Search for related authentication tasks**
```json
{
  "tool": "search_tasks",
  "parameters": {
    "query": "login timeout session",
    "limit": 5
  }
}
```

**4. Show urgent tasks in compact format**
```json
{
  "tool": "show_tasks",
  "parameters": {
    "listId": "bug-fix-list-id",
    "format": "compact",
    "groupBy": "priority",
    "includeCompleted": false
  }
}
```

## Error Handling Examples

### Example 1: Handling Invalid List ID
```json
{
  "tool": "get_list",
  "parameters": {
    "listId": "invalid-uuid-format"
  }
}
```

**Error Response:**
```json
{
  "error": "ValidationError",
  "message": "listId must be a valid UUID format",
  "code": "INVALID_UUID"
}
```

**Recovery Action:**
```json
{
  "tool": "list_all_lists",
  "parameters": {
    "limit": 10
  }
}
```

### Example 2: Handling Missing Task
```json
{
  "tool": "complete_task",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "taskId": "non-existent-task-id"
  }
}
```

**Error Response:**
```json
{
  "error": "NotFoundError",
  "message": "Task with ID 'non-existent-task-id' not found in list",
  "code": "TASK_NOT_FOUND"
}
```

**Recovery Action:**
```json
{
  "tool": "get_list",
  "parameters": {
    "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "includeCompleted": true
  }
}
```

## Performance Optimization Examples

### Example 1: Efficient Task Filtering
Instead of loading all tasks and filtering client-side:

**❌ Inefficient:**
```json
{
  "tool": "get_list",
  "parameters": {
    "listId": "large-list-id",
    "includeCompleted": true
  }
}
// Then filter client-side for high priority tasks
```

**✅ Efficient:**
```json
{
  "tool": "filter_tasks",
  "parameters": {
    "listId": "large-list-id",
    "priority": 5
  }
}
```

### Example 2: Targeted Search
Instead of broad searches:

**❌ Inefficient:**
```json
{
  "tool": "search_tasks",
  "parameters": {
    "query": "task",
    "limit": 100
  }
}
```

**✅ Efficient:**
```json
{
  "tool": "search_tasks",
  "parameters": {
    "query": "authentication security login",
    "listId": "specific-project-id",
    "limit": 10
  }
}
```

These examples demonstrate the practical usage of the MCP tools in real-world scenarios, showing how the focused, single-purpose tools can be combined to create powerful task management workflows.