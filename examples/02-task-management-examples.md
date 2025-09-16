# Task Management Examples

This document demonstrates comprehensive task management capabilities through real-world examples.

## Adding Tasks

### Basic Task
```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "title": "Set up development environment"
  }
}
```

### Complete Task with All Parameters
```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "title": "Set up development environment",
    "description": "Install Node.js, npm, and configure development tools",
    "priority": 5,
    "estimatedDuration": 120,
    "tags": ["setup", "environment", "urgent"]
  }
}
```

**Response:**
```json
{
  "id": "f47cd78e-962a-4860-a17e-49c67ab12da0",
  "title": "Set up development environment",
  "description": "Install Node.js, npm, and configure development tools",
  "status": "pending",
  "priority": 5,
  "tags": ["setup", "environment", "urgent"],
  "createdAt": "2025-09-16T21:16:40.611Z",
  "updatedAt": "2025-09-16T21:16:40.611Z",
  "estimatedDuration": 120,
  "dependencies": [],
  "isReady": true
}
```

### Task with Dependencies
```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "title": "Design database schema",
    "description": "Create ERD and define table structures for user management, content, and analytics",
    "priority": 4,
    "estimatedDuration": 240,
    "tags": ["database", "design", "backend"],
    "dependencies": ["f47cd78e-962a-4860-a17e-49c67ab12da0"]
  }
}
```

**Response:**
```json
{
  "id": "e7e5a962-f706-4607-b7e1-95f44b9867ee",
  "title": "Design database schema",
  "description": "Create ERD and define table structures for user management, content, and analytics",
  "status": "pending",
  "priority": 4,
  "tags": ["database", "design", "backend"],
  "createdAt": "2025-09-16T21:16:46.741Z",
  "updatedAt": "2025-09-16T21:16:46.741Z",
  "estimatedDuration": 240,
  "dependencies": ["f47cd78e-962a-4860-a17e-49c67ab12da0"],
  "isReady": false,
  "blockedBy": ["f47cd78e-962a-4860-a17e-49c67ab12da0"]
}
```

## Updating Tasks

### Update Task Details
```json
{
  "tool": "update_task",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "taskId": "f47cd78e-962a-4860-a17e-49c67ab12da0",
    "title": "Set up development environment and tools",
    "description": "Install Node.js 18+, npm, VS Code, and configure ESLint, Prettier, and Git hooks",
    "estimatedDuration": 90
  }
}
```

**Response:**
```json
{
  "id": "f47cd78e-962a-4860-a17e-49c67ab12da0",
  "title": "Set up development environment and tools",
  "description": "Install Node.js 18+, npm, VS Code, and configure ESLint, Prettier, and Git hooks",
  "status": "pending",
  "priority": 5,
  "tags": ["setup", "environment", "urgent"],
  "createdAt": "2025-09-16T21:16:40.611Z",
  "updatedAt": "2025-09-16T21:17:14.145Z",
  "estimatedDuration": 90
}
```

## Task Status Management

### Complete a Task
```json
{
  "tool": "complete_task",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "taskId": "f47cd78e-962a-4860-a17e-49c67ab12da0"
  }
}
```

**Response:**
```json
{
  "id": "f47cd78e-962a-4860-a17e-49c67ab12da0",
  "title": "Set up development environment and tools",
  "description": "Install Node.js 18+, npm, VS Code, and configure ESLint, Prettier, and Git hooks",
  "status": "completed",
  "priority": 5,
  "tags": ["setup", "environment", "urgent"],
  "createdAt": "2025-09-16T21:16:40.611Z",
  "updatedAt": "2025-09-16T21:17:18.466Z",
  "estimatedDuration": 90
}
```

### Change Task Priority
```json
{
  "tool": "set_task_priority",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "taskId": "e7e5a962-f706-4607-b7e1-95f44b9867ee",
    "priority": 5
  }
}
```

**Response:**
```json
{
  "id": "e7e5a962-f706-4607-b7e1-95f44b9867ee",
  "title": "Design database schema",
  "description": "Create ERD and define table structures for user management, content, and analytics",
  "status": "pending",
  "priority": 5,
  "tags": ["database", "design", "backend"],
  "createdAt": "2025-09-16T21:16:46.741Z",
  "updatedAt": "2025-09-16T21:17:22.601Z",
  "estimatedDuration": 240
}
```

### Add Tags to Task
```json
{
  "tool": "add_task_tags",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "taskId": "e7e5a962-f706-4607-b7e1-95f44b9867ee",
    "tags": ["critical", "architecture"]
  }
}
```

**Response:**
```json
{
  "id": "e7e5a962-f706-4607-b7e1-95f44b9867ee",
  "title": "Design database schema",
  "description": "Create ERD and define table structures for user management, content, and analytics",
  "status": "pending",
  "priority": 5,
  "tags": ["database", "design", "backend", "critical", "architecture"],
  "createdAt": "2025-09-16T21:16:46.741Z",
  "updatedAt": "2025-09-16T21:17:27.397Z",
  "estimatedDuration": 240
}
```

## Task Removal

### Remove Task from List
```json
{
  "tool": "remove_task",
  "parameters": {
    "listId": "83aeb714-ae8a-43c9-a2bd-9ef687ed8575",
    "taskId": "2bce2623-9e41-4220-aa67-eca6b627b0fd"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task 2bce2623-9e41-4220-aa67-eca6b627b0fd removed from list 83aeb714-ae8a-43c9-a2bd-9ef687ed8575",
  "listId": "83aeb714-ae8a-43c9-a2bd-9ef687ed8575",
  "taskId": "2bce2623-9e41-4220-aa67-eca6b627b0fd"
}
```

## Priority Levels

- **5 (Critical)**: Urgent tasks that block other work
- **4 (High)**: Important tasks with significant impact
- **3 (Medium)**: Standard priority tasks
- **2 (Low)**: Nice-to-have tasks
- **1 (Lowest)**: Optional or future tasks

## Task Status Flow

1. **pending** → Initial state when task is created
2. **in_progress** → Task is actively being worked on
3. **completed** → Task has been finished
4. **blocked** → Task cannot proceed due to dependencies
5. **cancelled** → Task has been cancelled

## Best Practices

1. **Use descriptive titles** that clearly state what needs to be done
2. **Add detailed descriptions** for complex tasks
3. **Set realistic time estimates** to help with planning
4. **Use tags consistently** for better organization and filtering
5. **Set appropriate priorities** based on urgency and importance
6. **Define dependencies** to ensure proper task sequencing
7. **Update task details** as requirements change
8. **Complete tasks promptly** to unblock dependent tasks

## Common Task Patterns

### Setup Tasks
- High priority (4-5)
- Tags: ["setup", "environment", "configuration"]
- Often dependencies for other tasks

### Development Tasks
- Medium priority (3)
- Tags: ["development", "feature", "implementation"]
- May have dependencies on design/setup tasks

### Testing Tasks
- Medium to low priority (2-3)
- Tags: ["testing", "quality", "validation"]
- Usually depend on development tasks

### Documentation Tasks
- Low priority (1-2)
- Tags: ["documentation", "writing"]
- Often done after implementation