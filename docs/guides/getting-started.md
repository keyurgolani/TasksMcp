# Getting Started Guide

This guide will walk you through your first steps with the MCP Task Manager, from basic task creation to advanced workflow management.

## Prerequisites

Before starting, ensure you have:
- ✅ **Installed the MCP Task Manager** - See [Installation Guide](installation.md)
- ✅ **Configured your MCP client** - Claude Desktop, Kiro IDE, or custom client
- ✅ **Verified the connection** - Server appears in available tools

## 🚀 Your First Todo List

Let's start by creating your first todo list and adding some tasks.

### Step 1: Create a Todo List

```json
{
  "tool": "create_list",
  "parameters": {
    "title": "My First Project",
    "description": "Learning the MCP Task Manager",
    "projectTag": "learning"
  }
}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "My First Project",
  "description": "Learning the MCP Task Manager",
  "taskCount": 0,
  "completedCount": 0,
  "progress": 0,
  "projectTag": "learning",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

Great! You've created your first todo list. Note the `id` - you'll use this to add tasks.

### Step 2: Add Your First Task

```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Learn basic task creation",
    "description": "Understand how to create and manage tasks",
    "priority": 4,
    "tags": ["learning", "basics"],
    "estimatedDuration": 30
  }
}
```

**Response:**
```json
{
  "id": "456e7890-e89b-12d3-a456-426614174001",
  "title": "Learn basic task creation",
  "description": "Understand how to create and manage tasks",
  "status": "pending",
  "priority": 4,
  "tags": ["learning", "basics"],
  "estimatedDuration": 30,
  "createdAt": "2024-01-15T10:05:00Z"
}
```

Excellent! You've added your first task. Let's add a few more to build a complete workflow.

### Step 3: Add More Tasks

```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Explore advanced features",
    "description": "Learn about dependencies, exit criteria, and bulk operations",
    "priority": 3,
    "tags": ["learning", "advanced"],
    "estimatedDuration": 60,
    "exitCriteria": [
      "Understand task dependencies",
      "Learn exit criteria system",
      "Try bulk operations"
    ]
  }
}
```

```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Build a real project",
    "description": "Apply knowledge to create a real project workflow",
    "priority": 5,
    "tags": ["learning", "project"],
    "estimatedDuration": 120,
    "dependencies": ["456e7890-e89b-12d3-a456-426614174001"]
  }
}
```

### Step 4: View Your Todo List

```json
{
  "tool": "show_tasks",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "format": "detailed",
    "groupBy": "priority"
  }
}
```

**Response:**
```
📋 My First Project (3 tasks, 0% complete)

🔥 CRITICAL PRIORITY (5):
  🔴 Build a real project
     📝 Apply knowledge to create a real project workflow
     ⏱️  120 min | 🏷️  learning, project
     🔗 Depends on: Learn basic task creation

🔶 HIGH PRIORITY (4):
  🔴 Learn basic task creation
     📝 Understand how to create and manage tasks
     ⏱️  30 min | 🏷️  learning, basics

🔸 MEDIUM PRIORITY (3):
  🔴 Explore advanced features
     📝 Learn about dependencies, exit criteria, and bulk operations
     ⏱️  60 min | 🏷️  learning, advanced
     ✅ Exit Criteria: 0/3 complete
        • Understand task dependencies
        • Learn exit criteria system
        • Try bulk operations
```

Perfect! You can see your tasks organized by priority, with dependencies and exit criteria clearly displayed.

## 📝 Working with Tasks

### Completing Your First Task

Let's complete the basic task:

```json
{
  "tool": "complete_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001"
  }
}
```

**Response:**
```json
{
  "id": "456e7890-e89b-12d3-a456-426614174001",
  "title": "Learn basic task creation",
  "status": "completed",
  "completedAt": "2024-01-15T10:30:00Z",
  "progress": 100
}
```

Great! Now let's see what tasks are ready to work on:

```json
{
  "tool": "get_ready_tasks",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

**Response:**
```json
{
  "readyTasks": [
    {
      "id": "789abcde-e89b-12d3-a456-426614174002",
      "title": "Explore advanced features",
      "priority": 3,
      "estimatedDuration": 60,
      "isReady": true
    },
    {
      "id": "987fcdeb-e89b-12d3-a456-426614174003",
      "title": "Build a real project",
      "priority": 5,
      "estimatedDuration": 120,
      "isReady": true
    }
  ],
  "summary": {
    "totalReady": 2,
    "highestPriority": 5,
    "totalEstimatedTime": 180
  },
  "nextActions": [
    "Start with highest priority: \"Build a real project\" (Priority 5)",
    "2 tasks are ready to work on. Focus on one at a time for best results."
  ]
}
```

Excellent! Both remaining tasks are now ready since we completed their dependency.

## 🎯 Working with Exit Criteria

Let's work on the task with exit criteria to understand this powerful feature:

### Step 1: Update Exit Criteria Progress

```json
{
  "tool": "update_exit_criteria",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "789abcde-e89b-12d3-a456-426614174002",
    "criteriaId": "criteria-uuid-1",
    "isMet": true,
    "notes": "Learned about task dependencies through hands-on practice"
  }
}
```

### Step 2: Check Task Progress

```json
{
  "tool": "get_list",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

You'll see the task now shows partial completion (33% if 1 of 3 criteria are met).

### Step 3: Complete All Criteria

Continue updating the remaining exit criteria:

```json
{
  "tool": "update_exit_criteria",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "789abcde-e89b-12d3-a456-426614174002",
    "criteriaId": "criteria-uuid-2",
    "isMet": true,
    "notes": "Understood the exit criteria system and its benefits"
  }
}
```

```json
{
  "tool": "update_exit_criteria",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "789abcde-e89b-12d3-a456-426614174002",
    "criteriaId": "criteria-uuid-3",
    "isMet": true,
    "notes": "Successfully used bulk operations for multiple tasks"
  }
}
```

### Step 4: Complete the Task

Now that all exit criteria are met, you can complete the task:

```json
{
  "tool": "complete_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "789abcde-e89b-12d3-a456-426614174002"
  }
}
```

## 🔍 Searching and Filtering

As your projects grow, you'll need to find specific tasks quickly:

### Search by Text

```json
{
  "tool": "search_tool",
  "parameters": {
    "query": "project",
    "limit": 10
  }
}
```

### Filter by Criteria

```json
{
  "tool": "search_tool",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "status": ["pending", "in_progress"],
    "priority": [4, 5],
    "tags": ["learning"],
    "sortBy": "priority",
    "sortOrder": "desc"
  }
}
```

### Find Ready Tasks

```json
{
  "tool": "search_tool",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "isReady": true,
    "sortBy": "priority",
    "sortOrder": "desc"
  }
}
```

## 📊 Project Analysis

### Analyze Task Dependencies

```json
{
  "tool": "analyze_task_dependencies",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "format": "both",
    "dagStyle": "ascii"
  }
}
```

**Response:**
```
📊 DEPENDENCY ANALYSIS

Summary:
• Total Tasks: 3
• Ready Tasks: 1
• Blocked Tasks: 0
• Tasks with Dependencies: 1

Critical Path: Learn basic task creation → Build a real project (150 minutes)

🟢 READY TO START:
  • Explore advanced features (60 min, Priority 3)

🔵 COMPLETED:
  • Learn basic task creation (30 min, Priority 4) ✅

🟡 WAITING FOR DEPENDENCIES:
  (none)

DEPENDENCY RELATIONSHIPS:
  Build a real project ← depends on: [Learn basic task creation ✅]

💡 RECOMMENDATIONS:
1. Focus on "Explore advanced features" - it's ready and has no dependencies
2. Project is 67% complete with 1 task remaining
3. Estimated remaining time: 120 minutes
```

This analysis helps you understand your project structure and plan your work effectively.

## 🚀 Advanced Features

### Bulk Operations

When you have many tasks to manage, use bulk operations:

```json
{
  "tool": "bulk_task_operations",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "operations": [
      {
        "type": "create",
        "data": {
          "title": "Review documentation",
          "priority": 2,
          "tags": ["review"]
        }
      },
      {
        "type": "create",
        "data": {
          "title": "Write tests",
          "priority": 4,
          "tags": ["testing"]
        }
      },
      {
        "type": "set_priority",
        "taskId": "existing-task-id",
        "priority": 5
      }
    ]
  }
}
```

### Task Analysis

Get AI-powered insights about task complexity:

```json
{
  "tool": "analyze_task",
  "parameters": {
    "taskDescription": "Implement user authentication with OAuth2 and JWT tokens",
    "context": "Node.js web application with React frontend",
    "maxSuggestions": 5
  }
}
```

## 📋 Best Practices

### 1. Use Meaningful Titles and Descriptions
- **Good**: "Implement user login with OAuth2 integration"
- **Poor**: "Login stuff"

### 2. Set Appropriate Priorities
- **5 (Critical)**: Urgent, blocking other work
- **4 (High)**: Important, should be done soon
- **3 (Medium)**: Normal priority, default
- **2 (Low)**: Nice to have, when time permits
- **1 (Minimal)**: Optional, lowest priority

### 3. Use Tags for Organization
- **Project tags**: "frontend", "backend", "mobile"
- **Type tags**: "bug", "feature", "documentation"
- **Status tags**: "urgent", "blocked", "review-needed"

### 4. Set Realistic Time Estimates
- Break large tasks into smaller, estimable pieces
- Use past experience to guide estimates
- Include buffer time for unexpected issues

### 5. Use Exit Criteria for Quality Control
- Define clear completion requirements
- Include testing and review steps
- Ensure deliverables meet standards

### 6. Plan Dependencies Carefully
- Only set true prerequisites as dependencies
- Avoid circular dependencies
- Use dependency analysis to optimize workflows

## 🎯 Common Workflows

### Daily Planning Workflow

1. **Check ready tasks**:
   ```json
   {"tool": "get_ready_tasks", "parameters": {"listId": "project-id"}}
   ```

2. **Prioritize work**:
   ```json
   {"tool": "search_tool", "parameters": {"isReady": true, "sortBy": "priority"}}
   ```

3. **Update progress**:
   ```json
   {"tool": "update_exit_criteria", "parameters": {...}}
   ```

4. **Complete tasks**:
   ```json
   {"tool": "complete_task", "parameters": {...}}
   ```

### Project Setup Workflow

1. **Create project list**:
   ```json
   {"tool": "create_list", "parameters": {"title": "New Project"}}
   ```

2. **Add initial tasks**:
   ```json
   {"tool": "bulk_task_operations", "parameters": {"operations": [...]}}
   ```

3. **Set up dependencies**:
   ```json
   {"tool": "set_task_dependencies", "parameters": {...}}
   ```

4. **Analyze structure**:
   ```json
   {"tool": "analyze_task_dependencies", "parameters": {...}}
   ```

### Review and Cleanup Workflow

1. **Find completed tasks**:
   ```json
   {"tool": "search_tool", "parameters": {"status": ["completed"]}}
   ```

2. **Archive old projects**:
   ```json
   {"tool": "delete_list", "parameters": {"permanent": false}}
   ```

3. **Update priorities**:
   ```json
   {"tool": "bulk_task_operations", "parameters": {"operations": [...]}}
   ```

## 🆘 Troubleshooting

### Common Issues

#### "List not found" Error
- **Cause**: Using wrong list ID or list was deleted
- **Solution**: Use `list_all_lists` to find correct ID

#### "Task is blocked" Error
- **Cause**: Task has incomplete dependencies
- **Solution**: Use `get_ready_tasks` to find available work

#### "Exit criteria not met" Error
- **Cause**: Trying to complete task with unmet criteria
- **Solution**: Use `update_exit_criteria` to mark criteria as complete

### Getting Help

- **[Troubleshooting Guide](troubleshooting.md)** - Detailed problem solving
- **[FAQ](../reference/faq.md)** - Common questions and answers
- **[API Reference](../api/tools.md)** - Complete tool documentation

## 🎉 Next Steps

Congratulations! You've learned the basics of the MCP Task Manager. Here's what to explore next:

### Intermediate Topics
- **[Configuration Guide](configuration.md)** - Advanced setup options
- **[Multi-Agent Orchestration](multi-agent.md)** - Coordinate multiple AI agents
- **[Advanced Examples](../examples/advanced.md)** - Complex workflow patterns

### Advanced Topics
- **[Performance Optimization](../reference/performance.md)** - Scale to large projects
- **[Custom Integration](../examples/agents.md)** - Build custom AI agent workflows
- **[Contributing](../../CONTRIBUTING.md)** - Help improve the project

### Practice Projects
1. **Personal Task Management**: Organize your daily tasks
2. **Team Project**: Coordinate work across team members
3. **Software Development**: Manage development workflows
4. **Content Creation**: Organize writing and publishing tasks

You're now ready to build sophisticated task management workflows with the MCP Task Manager!