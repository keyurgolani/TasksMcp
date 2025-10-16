# Dependency Management Tools

The MCP Task Manager includes 3 powerful dependency management tools that expose the sophisticated dependency resolution capabilities to AI agents. These tools enable you to establish task relationships, identify ready work, and analyze project structure.

## Overview

### What are Dependencies?

Task dependencies define relationships where one task must be completed before another can begin. This enables:

- **Proper work sequencing** - Ensure tasks are done based on dependencies
- **Bottleneck identification** - Find tasks that block multiple others
- **Work prioritization** - Focus on tasks that unblock the most work
- **Project analysis** - Understand critical paths and complexity

### Key Features

- **Circular dependency prevention** - Automatic detection and prevention of dependency loops
- **Ready task identification** - Find tasks with no incomplete dependencies
- **Critical path analysis** - Identify the longest chain of dependent tasks
- **Bottleneck detection** - Find tasks that block multiple others
- **Simple, user-friendly analysis** - Plain language recommendations

## Tools

### 1. set_task_dependencies

Set all dependencies for a task, replacing any existing dependencies.

#### Parameters

| Parameter       | Type           | Required | Description                                                                         |
| --------------- | -------------- | -------- | ----------------------------------------------------------------------------------- |
| `listId`        | string (UUID)  | Yes      | UUID of the list containing the task                                                |
| `taskId`        | string (UUID)  | Yes      | UUID of the task to set dependencies for                                            |
| `dependencyIds` | array of UUIDs | No       | Array of task IDs this task depends on (max 50, empty array or omitted removes all) |

#### Example Request

```json
{
  "name": "set_task_dependencies",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "987fcdeb-51a2-43d1-9f4e-123456789abc",
    "dependencyIds": [
      "456e7890-e89b-12d3-a456-426614174111",
      "789abcde-e89b-12d3-a456-426614174222"
    ]
  }
}
```

#### Example Response

```json
{
  "id": "987fcdeb-51a2-43d1-9f4e-123456789abc",
  "title": "Deploy to production",
  "description": "Deploy the application to production environment",
  "status": "pending",
  "priority": 4,
  "tags": ["deployment", "production"],
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T14:30:00.000Z",
  "estimatedDuration": 60,
  "dependencies": [
    "456e7890-e89b-12d3-a456-426614174111",
    "789abcde-e89b-12d3-a456-426614174222"
  ],
  "message": "Dependencies updated successfully",
  "warnings": []
}
```

#### Validation Rules

- **Task existence** - Task and all dependencies must exist in the same list
- **No self-dependencies** - Task cannot depend on itself
- **No circular dependencies** - Dependencies cannot create loops
- **Maximum dependencies** - Limited to 10 dependencies per task

#### Error Examples

```json
// Circular dependency detected
{
  "content": [{
    "type": "text",
    "text": "Validation error: Circular dependency detected: Task A -> Task B -> Task A"
  }],
  "isError": true
}

// Self-dependency attempt
{
  "content": [{
    "type": "text",
    "text": "Validation error: Task cannot depend on itself"
  }],
  "isError": true
}
```

---

### 2. get_ready_tasks

Get tasks that are ready to work on (have no incomplete dependencies).

#### Parameters

| Parameter | Type          | Required | Description                                                 |
| --------- | ------------- | -------- | ----------------------------------------------------------- |
| `listId`  | string (UUID) | Yes      | UUID of the list to get ready tasks from                    |
| `limit`   | number        | No       | Maximum number of ready tasks to return (1-50, default: 20) |

#### Example Request

```json
{
  "name": "get_ready_tasks",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "limit": 10
  }
}
```

#### Example Response

```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "readyTasks": [
    {
      "id": "task-001",
      "title": "Set up development environment",
      "description": "Install Node.js, npm, and project dependencies",
      "status": "pending",
      "priority": 5,
      "tags": ["setup", "development"],
      "estimatedDuration": 30,
      "createdAt": "2025-01-15T09:00:00.000Z",
      "updatedAt": "2025-01-15T09:00:00.000Z"
    },
    {
      "id": "task-002",
      "title": "Write project documentation",
      "description": "Create README and API documentation",
      "status": "pending",
      "priority": 3,
      "tags": ["documentation"],
      "estimatedDuration": 120,
      "createdAt": "2025-01-15T09:15:00.000Z",
      "updatedAt": "2025-01-15T09:15:00.000Z"
    }
  ],
  "totalReady": 5,
  "nextActions": [
    "Start with high-priority tasks: \"Set up development environment\"",
    "2 tasks are ready to work on. Focus on one at a time for best results.",
    "2 quick tasks (≤30 min) available for filling small time slots."
  ],
  "summary": {
    "totalTasks": 15,
    "completedTasks": 3,
    "readyTasks": 5,
    "blockedTasks": 7
  }
}
```

#### Response Fields

- **readyTasks** - Array of tasks ready to work on (no incomplete dependencies)
- **totalReady** - Total number of ready tasks (before limit applied)
- **nextActions** - AI-generated suggestions for what to do next
- **summary** - Overview of project status

#### Next Action Examples

When tasks are ready:

- "Start with high-priority tasks: \"Task Name\""
- "Begin with: \"Task Name\""
- "5 tasks are ready to work on. Focus on one at a time for best results."
- "3 quick tasks (≤30 min) available for filling small time slots."

When no tasks are ready:

- "All tasks are completed! Consider adding new tasks or archiving this list."
- "7 tasks are blocked by dependencies. Focus on completing prerequisite tasks."
- "2 tasks are in progress. Consider completing them before starting new ones."

---

### 3. analyze_task_dependencies

Get a comprehensive analysis of task dependencies and project structure.

#### Parameters

| Parameter | Type          | Required | Description                 |
| --------- | ------------- | -------- | --------------------------- |
| `listId`  | string (UUID) | Yes      | UUID of the list to analyze |

#### Example Request

```json
{
  "name": "analyze_task_dependencies",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

#### Example Response

```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "summary": {
    "totalTasks": 12,
    "readyTasks": 3,
    "blockedTasks": 6,
    "tasksWithDependencies": 8
  },
  "criticalPath": [
    "task-setup",
    "task-database",
    "task-api",
    "task-frontend",
    "task-testing",
    "task-deployment"
  ],
  "issues": {
    "circularDependencies": [],
    "bottlenecks": ["task-database", "task-api"]
  },
  "recommendations": [
    "Focus on the critical path: Start with \"Set up development environment\" as it affects 5 other tasks.",
    "3 tasks are ready. Prioritize high-priority tasks like \"Database schema design\".",
    "Bottleneck alert: \"Database setup\" is blocking multiple tasks. Consider breaking it down or prioritizing it.",
    "Project is in early stages. Focus on completing foundational tasks to unlock more work."
  ]
}
```

#### Analysis Components

**Summary Statistics:**

- **totalTasks** - Total number of tasks in the list
- **readyTasks** - Tasks with no incomplete dependencies
- **blockedTasks** - Tasks waiting for dependencies
- **tasksWithDependencies** - Tasks that have at least one dependency

**Critical Path:**

- Array of task IDs representing the longest chain of dependent tasks
- Completing critical path tasks has the highest impact on project completion
- Tasks are returned based on dependency relationships

**Issues:**

- **circularDependencies** - Arrays of task IDs forming dependency loops
- **bottlenecks** - Task IDs that block 3 or more other tasks

**Recommendations:**

- Plain language suggestions for improving project flow
- Prioritization advice based on dependency analysis
- Specific actions to resolve bottlenecks and issues

#### Recommendation Types

**Critical Path Recommendations:**

- "Focus on the critical path: Start with \"Task Name\" as it affects X other tasks."

**Ready Task Recommendations:**

- "X tasks are ready. Prioritize high-priority tasks like \"Task Name\"."
- "No tasks are ready! Focus on completing \"Task Name\" which is blocking X other tasks."

**Bottleneck Recommendations:**

- "Bottleneck alert: \"Task Name\" is blocking multiple tasks. Consider breaking it down or prioritizing it."

**Progress Recommendations:**

- "Project is in early stages. Focus on completing foundational tasks to unlock more work."
- "Project is nearing completion! Focus on finishing remaining tasks and final reviews."

**Complexity Recommendations:**

- "High dependency complexity detected. Consider simplifying task relationships or breaking down complex tasks."

## Enhanced Existing Tools

The dependency management system also enhances existing tools with dependency-aware features:

### Enhanced add_task

The `add_task` tool now accepts an optional `dependencies` parameter:

```json
{
  "name": "add_task",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Deploy application",
    "description": "Deploy to production environment",
    "priority": 4,
    "dependencies": [
      "456e7890-e89b-12d3-a456-426614174111",
      "789abcde-e89b-12d3-a456-426614174222"
    ]
  }
}
```

### Enhanced get_list

The `get_list` tool now includes dependency information in task responses:

```json
{
  "id": "task-001",
  "title": "Task title",
  "dependencies": ["task-002", "task-003"],
  "isReady": false,
  "blockedBy": ["task-002"]
}
```

### Enhanced search_tool

The `search_tool` supports dependency-based filtering:

```json
{
  "name": "search_tool",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "hasDependencies": true,
    "isReady": false,
    "isBlocked": true
  }
}
```

### Enhanced show_tasks

The `show_tasks` tool now displays dependency status indicators:

```
📋 Project Tasks (Ready: 3, Blocked: 5)

🟢 Ready Tasks:
  • Set up development environment (Priority: 5) [30min]
  • Write documentation (Priority: 3) [2h]

🔴 Blocked Tasks:
  • Deploy to production (Priority: 4) [1h]
    ↳ Waiting for: Run tests, Code review
```

## Common Workflows

### 1. Setting Up Project Dependencies

```json
// 1. Create tasks first
{"name": "add_task", "arguments": {"listId": "...", "title": "Setup environment"}}
{"name": "add_task", "arguments": {"listId": "...", "title": "Install dependencies"}}
{"name": "add_task", "arguments": {"listId": "...", "title": "Configure database"}}

// 2. Set up dependencies
{"name": "set_task_dependencies", "arguments": {
  "listId": "...",
  "taskId": "install-deps-id",
  "dependencyIds": ["setup-env-id"]
}}

{"name": "set_task_dependencies", "arguments": {
  "listId": "...",
  "taskId": "config-db-id",
  "dependencyIds": ["install-deps-id"]
}}
```

### 2. Daily Work Planning

```json
// 1. Get ready tasks
{"name": "get_ready_tasks", "arguments": {"listId": "...", "limit": 5}}

// 2. Analyze project status
{"name": "analyze_task_dependencies", "arguments": {"listId": "..."}}

// 3. Filter by priority if needed
{"name": "search_tool", "arguments": {
  "listId": "...",
  "isReady": true,
  "priority": 4
}}
```

### 3. Project Health Check

```json
// 1. Analyze dependencies
{"name": "analyze_task_dependencies", "arguments": {"listId": "..."}}

// 2. Check for blocked tasks
{"name": "search_tool", "arguments": {"listId": "...", "isBlocked": true}}

// 3. Review critical path
// Use criticalPath from analysis response to prioritize work
```

## Best Practices

### Dependency Design

1. **Keep dependencies simple** - Avoid complex dependency chains when possible
2. **Break down large tasks** - Large tasks with many dependencies should be split
3. **Use meaningful relationships** - Only create dependencies that represent real prerequisites
4. **Regular review** - Periodically analyze dependencies to identify bottlenecks

### Work Planning

1. **Start with ready tasks** - Always check `get_ready_tasks` before planning work
2. **Focus on critical path** - Prioritize tasks on the critical path for maximum impact
3. **Address bottlenecks** - Resolve tasks that block multiple others first
4. **Monitor progress** - Use `analyze_task_dependencies` to track project health

### Error Prevention

1. **Validate before setting** - Ensure all dependency IDs exist before setting them
2. **Avoid circular dependencies** - The system prevents these, but design carefully
3. **Limit dependency count** - Keep dependencies under 5 per task when possible
4. **Document complex relationships** - Use task descriptions to explain complex dependencies

## Troubleshooting

### Common Issues

**"Circular dependency detected"**

- Review the dependency chain shown in the error
- Remove one dependency to break the loop
- Consider if the circular relationship indicates tasks should be combined

**"No tasks are ready"**

- Check `analyze_task_dependencies` for bottlenecks
- Look for tasks with status "in_progress" that need completion
- Review if some dependencies are no longer needed

**"Task not found"**

- Verify all task IDs exist in the specified list
- Check that you're using the correct list ID
- Ensure tasks haven't been deleted

### Performance Considerations

- **Large dependency graphs** - Analysis may take longer with 100+ tasks
- **Complex relationships** - Deeply nested dependencies (>10 levels) may impact performance
- **Frequent updates** - Batch dependency updates when possible

## Migration from Manual Tracking

If you're currently tracking dependencies manually:

1. **Audit existing relationships** - List all current task dependencies
2. **Start with critical path** - Set up the most important dependencies first
3. **Use analysis tools** - Let the system identify issues in your dependency design
4. **Iterate and improve** - Use recommendations to optimize your task structure

---

**Next Steps:**

- Try the [Advanced Workflow Examples](../examples/advanced.md) for dependency management patterns
- Learn about [Enhanced Tool Features](./enhanced-tools.md)
- Review [Performance Optimization](./tool-performance.md) for large projects
