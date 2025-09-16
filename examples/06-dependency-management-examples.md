# Dependency Management Examples

This guide provides comprehensive examples for the 3 dependency management tools that enable sophisticated task relationship management and project workflow optimization.

## Tool Overview

| Tool | Purpose | Key Features |
|------|---------|--------------|
| `set_task_dependencies` | Set task prerequisites | Circular dependency prevention, validation |
| `get_ready_tasks` | Find available work | Priority sorting, actionable suggestions |
| `analyze_task_dependencies` | Project analysis | Critical path, bottlenecks, recommendations |

---

## set_task_dependencies

Set all dependencies for a task, replacing any existing dependencies.

### Example 1: Software Development Workflow

Setting up a typical development task sequence:

**Request:**
```json
{
  "name": "set_task_dependencies",
  "arguments": {
    "listId": "dev-project-123",
    "taskId": "deploy-prod-456",
    "dependencyIds": [
      "code-review-789",
      "run-tests-abc",
      "update-docs-def"
    ]
  }
}
```

**Response:**
```json
{
  "id": "deploy-prod-456",
  "title": "Deploy to production",
  "description": "Deploy application to production environment",
  "status": "pending",
  "priority": 5,
  "tags": ["deployment", "production"],
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T14:30:00.000Z",
  "estimatedDuration": 45,
  "dependencies": [
    "code-review-789",
    "run-tests-abc", 
    "update-docs-def"
  ],
  "message": "Dependencies updated successfully",
  "warnings": []
}
```

### Example 2: Content Creation Pipeline

Setting up content workflow dependencies:

**Request:**
```json
{
  "name": "set_task_dependencies", 
  "arguments": {
    "listId": "content-pipeline-456",
    "taskId": "publish-article-789",
    "dependencyIds": [
      "write-draft-123",
      "edit-content-456",
      "create-graphics-789",
      "seo-review-abc"
    ]
  }
}
```

**Response:**
```json
{
  "id": "publish-article-789",
  "title": "Publish blog article",
  "description": "Publish the completed article to the website",
  "status": "pending",
  "priority": 4,
  "tags": ["content", "publishing"],
  "createdAt": "2025-01-15T09:00:00.000Z",
  "updatedAt": "2025-01-15T15:45:00.000Z",
  "estimatedDuration": 15,
  "dependencies": [
    "write-draft-123",
    "edit-content-456", 
    "create-graphics-789",
    "seo-review-abc"
  ],
  "message": "Dependencies updated successfully",
  "warnings": []
}
```

### Example 3: Removing All Dependencies

Clearing dependencies from a task:

**Request:**
```json
{
  "name": "set_task_dependencies",
  "arguments": {
    "listId": "project-cleanup-789",
    "taskId": "independent-task-123",
    "dependencyIds": []
  }
}
```

**Response:**
```json
{
  "id": "independent-task-123",
  "title": "Update team documentation",
  "description": "Update the team wiki with recent changes",
  "status": "pending",
  "priority": 2,
  "tags": ["documentation"],
  "createdAt": "2025-01-15T11:00:00.000Z",
  "updatedAt": "2025-01-15T16:20:00.000Z",
  "estimatedDuration": 60,
  "dependencies": [],
  "message": "Dependencies updated successfully",
  "warnings": []
}
```

### Example 4: Event Planning Dependencies

Setting up event planning task relationships:

**Request:**
```json
{
  "name": "set_task_dependencies",
  "arguments": {
    "listId": "conference-planning-abc",
    "taskId": "send-invitations-def",
    "dependencyIds": [
      "finalize-venue-123",
      "confirm-speakers-456",
      "design-materials-789"
    ]
  }
}
```

**Response:**
```json
{
  "id": "send-invitations-def",
  "title": "Send conference invitations",
  "description": "Send invitations to all attendees with event details",
  "status": "pending",
  "priority": 4,
  "tags": ["marketing", "communication"],
  "createdAt": "2025-01-15T08:30:00.000Z",
  "updatedAt": "2025-01-15T17:10:00.000Z",
  "estimatedDuration": 120,
  "dependencies": [
    "finalize-venue-123",
    "confirm-speakers-456",
    "design-materials-789"
  ],
  "message": "Dependencies updated successfully",
  "warnings": []
}
```

### Example 5: Error - Circular Dependency

Attempting to create a circular dependency:

**Request:**
```json
{
  "name": "set_task_dependencies",
  "arguments": {
    "listId": "circular-test-123",
    "taskId": "task-a-456",
    "dependencyIds": ["task-b-789"]
  }
}
```

**Error Response:**
```json
{
  "content": [{
    "type": "text",
    "text": "Validation error: Circular dependency detected: task-a-456 -> task-b-789 -> task-c-abc -> task-a-456"
  }],
  "isError": true
}
```

---

## get_ready_tasks

Get tasks that are ready to work on (have no incomplete dependencies).

### Example 1: Development Sprint Planning

Finding ready tasks for a development sprint:

**Request:**
```json
{
  "name": "get_ready_tasks",
  "arguments": {
    "listId": "sprint-24-dev-123",
    "limit": 5
  }
}
```

**Response:**
```json
{
  "listId": "sprint-24-dev-123",
  "readyTasks": [
    {
      "id": "setup-env-456",
      "title": "Set up development environment",
      "description": "Install Node.js, dependencies, and configure IDE",
      "status": "pending",
      "priority": 5,
      "tags": ["setup", "environment"],
      "estimatedDuration": 30,
      "createdAt": "2025-01-15T09:00:00.000Z",
      "updatedAt": "2025-01-15T09:00:00.000Z"
    },
    {
      "id": "write-tests-789",
      "title": "Write unit tests for user service",
      "description": "Create comprehensive unit tests for user authentication",
      "status": "pending", 
      "priority": 4,
      "tags": ["testing", "backend"],
      "estimatedDuration": 90,
      "createdAt": "2025-01-15T09:15:00.000Z",
      "updatedAt": "2025-01-15T09:15:00.000Z"
    },
    {
      "id": "update-readme-abc",
      "title": "Update project README",
      "description": "Add installation and usage instructions",
      "status": "pending",
      "priority": 2,
      "tags": ["documentation"],
      "estimatedDuration": 45,
      "createdAt": "2025-01-15T09:30:00.000Z",
      "updatedAt": "2025-01-15T09:30:00.000Z"
    }
  ],
  "totalReady": 8,
  "nextActions": [
    "Start with high-priority tasks: \"Set up development environment\"",
    "3 tasks are ready to work on. Focus on one at a time for best results.",
    "1 quick task (≤30 min) available for filling small time slots."
  ],
  "summary": {
    "totalTasks": 25,
    "completedTasks": 8,
    "readyTasks": 8,
    "blockedTasks": 9
  }
}
```

### Example 2: Marketing Campaign Tasks

Finding ready marketing tasks:

**Request:**
```json
{
  "name": "get_ready_tasks",
  "arguments": {
    "listId": "q1-marketing-456",
    "limit": 3
  }
}
```

**Response:**
```json
{
  "listId": "q1-marketing-456",
  "readyTasks": [
    {
      "id": "research-keywords-123",
      "title": "Research SEO keywords",
      "description": "Identify high-value keywords for Q1 content strategy",
      "status": "pending",
      "priority": 4,
      "tags": ["seo", "research"],
      "estimatedDuration": 120,
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    },
    {
      "id": "design-social-templates-456",
      "title": "Design social media templates",
      "description": "Create reusable templates for social media posts",
      "status": "pending",
      "priority": 3,
      "tags": ["design", "social-media"],
      "estimatedDuration": 180,
      "createdAt": "2025-01-15T10:15:00.000Z",
      "updatedAt": "2025-01-15T10:15:00.000Z"
    }
  ],
  "totalReady": 2,
  "nextActions": [
    "Begin with: \"Research SEO keywords\"",
    "2 tasks are ready to work on. Focus on one at a time for best results."
  ],
  "summary": {
    "totalTasks": 15,
    "completedTasks": 5,
    "readyTasks": 2,
    "blockedTasks": 8
  }
}
```

### Example 3: No Ready Tasks - All Blocked

When all tasks are blocked by dependencies:

**Request:**
```json
{
  "name": "get_ready_tasks",
  "arguments": {
    "listId": "blocked-project-789",
    "limit": 10
  }
}
```

**Response:**
```json
{
  "listId": "blocked-project-789",
  "readyTasks": [],
  "totalReady": 0,
  "nextActions": [
    "No tasks are ready! Focus on completing \"Database setup\" which is blocking 5 other tasks.",
    "3 tasks are in progress. Consider completing them before starting new ones."
  ],
  "summary": {
    "totalTasks": 12,
    "completedTasks": 2,
    "readyTasks": 0,
    "blockedTasks": 7
  }
}
```

### Example 4: Project Near Completion

When most tasks are completed:

**Request:**
```json
{
  "name": "get_ready_tasks",
  "arguments": {
    "listId": "finishing-project-abc",
    "limit": 5
  }
}
```

**Response:**
```json
{
  "listId": "finishing-project-abc",
  "readyTasks": [
    {
      "id": "final-testing-123",
      "title": "Perform final integration testing",
      "description": "Run complete test suite before release",
      "status": "pending",
      "priority": 5,
      "tags": ["testing", "final"],
      "estimatedDuration": 60,
      "createdAt": "2025-01-15T08:00:00.000Z",
      "updatedAt": "2025-01-15T08:00:00.000Z"
    }
  ],
  "totalReady": 1,
  "nextActions": [
    "Start with high-priority tasks: \"Perform final integration testing\"",
    "Project is nearing completion! Focus on finishing remaining tasks and final reviews."
  ],
  "summary": {
    "totalTasks": 20,
    "completedTasks": 18,
    "readyTasks": 1,
    "blockedTasks": 1
  }
}
```

### Example 5: All Tasks Completed

When project is finished:

**Request:**
```json
{
  "name": "get_ready_tasks",
  "arguments": {
    "listId": "completed-project-def",
    "limit": 10
  }
}
```

**Response:**
```json
{
  "listId": "completed-project-def",
  "readyTasks": [],
  "totalReady": 0,
  "nextActions": [
    "All tasks are completed! Consider adding new tasks or archiving this list."
  ],
  "summary": {
    "totalTasks": 15,
    "completedTasks": 15,
    "readyTasks": 0,
    "blockedTasks": 0
  }
}
```

---

## analyze_task_dependencies

Get comprehensive analysis of task dependencies and project structure.

### Example 1: Software Development Project Analysis

Analyzing a development project with complex dependencies:

**Request:**
```json
{
  "name": "analyze_task_dependencies",
  "arguments": {
    "listId": "web-app-development-123"
  }
}
```

**Response:**
```json
{
  "listId": "web-app-development-123",
  "summary": {
    "totalTasks": 18,
    "readyTasks": 4,
    "blockedTasks": 8,
    "tasksWithDependencies": 12
  },
  "criticalPath": [
    "setup-database-456",
    "create-user-model-789", 
    "implement-auth-abc",
    "build-user-interface-def",
    "integration-testing-ghi",
    "deploy-production-jkl"
  ],
  "issues": {
    "circularDependencies": [],
    "bottlenecks": ["setup-database-456", "implement-auth-abc"]
  },
  "recommendations": [
    "Focus on the critical path: Start with \"Setup database schema\" as it affects 5 other tasks.",
    "4 tasks are ready. Prioritize high-priority tasks like \"Setup database schema\".",
    "Bottleneck alert: \"Setup database schema\" is blocking multiple tasks. Consider breaking it down or prioritizing it.",
    "Project is in early stages. Focus on completing foundational tasks to unlock more work."
  ]
}
```

### Example 2: Marketing Campaign Analysis

Analyzing a marketing campaign with parallel workflows:

**Request:**
```json
{
  "name": "analyze_task_dependencies",
  "arguments": {
    "listId": "product-launch-campaign-456"
  }
}
```

**Response:**
```json
{
  "listId": "product-launch-campaign-456",
  "summary": {
    "totalTasks": 22,
    "readyTasks": 6,
    "blockedTasks": 10,
    "tasksWithDependencies": 16
  },
  "criticalPath": [
    "finalize-product-features-123",
    "create-marketing-materials-456",
    "setup-landing-page-789",
    "launch-ad-campaigns-abc",
    "monitor-metrics-def"
  ],
  "issues": {
    "circularDependencies": [],
    "bottlenecks": ["create-marketing-materials-456"]
  },
  "recommendations": [
    "Focus on the critical path: Start with \"Finalize product features\" as it affects 4 other tasks.",
    "6 tasks are ready. Consider starting with the oldest or highest priority task.",
    "Bottleneck alert: \"Create marketing materials\" is blocking multiple tasks. Consider breaking it down or prioritizing it.",
    "High dependency complexity detected. Consider simplifying task relationships or breaking down complex tasks."
  ]
}
```

### Example 3: Simple Project with Few Dependencies

Analyzing a straightforward project:

**Request:**
```json
{
  "name": "analyze_task_dependencies",
  "arguments": {
    "listId": "simple-website-789"
  }
}
```

**Response:**
```json
{
  "listId": "simple-website-789",
  "summary": {
    "totalTasks": 8,
    "readyTasks": 3,
    "blockedTasks": 2,
    "tasksWithDependencies": 3
  },
  "criticalPath": [
    "design-wireframes-123",
    "build-html-structure-456",
    "add-styling-789",
    "deploy-website-abc"
  ],
  "issues": {
    "circularDependencies": [],
    "bottlenecks": []
  },
  "recommendations": [
    "Focus on the critical path: Start with \"Design wireframes\" as it affects 3 other tasks.",
    "3 tasks are ready. Consider starting with the oldest or highest priority task.",
    "Project is in early stages. Focus on completing foundational tasks to unlock more work."
  ]
}
```

### Example 4: Project with Circular Dependencies

Analyzing a project with dependency issues:

**Request:**
```json
{
  "name": "analyze_task_dependencies",
  "arguments": {
    "listId": "problematic-project-abc"
  }
}
```

**Response:**
```json
{
  "listId": "problematic-project-abc",
  "summary": {
    "totalTasks": 15,
    "readyTasks": 0,
    "blockedTasks": 12,
    "tasksWithDependencies": 10
  },
  "criticalPath": [],
  "issues": {
    "circularDependencies": [
      ["task-a-123", "task-b-456", "task-c-789", "task-a-123"],
      ["task-x-abc", "task-y-def", "task-x-abc"]
    ],
    "bottlenecks": []
  },
  "recommendations": [
    "No tasks are ready. Check for circular dependencies or review task statuses.",
    "2 circular dependencies detected. Review and break these cycles to unblock progress."
  ]
}
```

### Example 5: Nearly Complete Project

Analyzing a project nearing completion:

**Request:**
```json
{
  "name": "analyze_task_dependencies",
  "arguments": {
    "listId": "finishing-touches-def"
  }
}
```

**Response:**
```json
{
  "listId": "finishing-touches-def",
  "summary": {
    "totalTasks": 20,
    "readyTasks": 2,
    "blockedTasks": 1,
    "tasksWithDependencies": 8
  },
  "criticalPath": [
    "final-review-123",
    "deploy-to-production-456"
  ],
  "issues": {
    "circularDependencies": [],
    "bottlenecks": []
  },
  "recommendations": [
    "Focus on the critical path: Start with \"Final code review\" as it affects 1 other task.",
    "2 tasks are ready. Consider starting with the oldest or highest priority task.",
    "Project is nearing completion! Focus on finishing remaining tasks and final reviews."
  ]
}
```

---

## Enhanced Tool Examples

### Enhanced add_task with Dependencies

Creating a task with initial dependencies:

**Request:**
```json
{
  "name": "add_task",
  "arguments": {
    "listId": "new-feature-123",
    "title": "Deploy new feature",
    "description": "Deploy the user dashboard feature to production",
    "priority": 5,
    "tags": ["deployment", "feature"],
    "estimatedDuration": 30,
    "dependencies": [
      "code-review-456",
      "qa-testing-789",
      "update-docs-abc"
    ]
  }
}
```

**Response:**
```json
{
  "id": "deploy-feature-def",
  "title": "Deploy new feature",
  "description": "Deploy the user dashboard feature to production",
  "status": "pending",
  "priority": 5,
  "tags": ["deployment", "feature"],
  "createdAt": "2025-01-15T16:00:00.000Z",
  "updatedAt": "2025-01-15T16:00:00.000Z",
  "estimatedDuration": 30,
  "dependencies": [
    "code-review-456",
    "qa-testing-789", 
    "update-docs-abc"
  ],
  "message": "Task created successfully with dependencies"
}
```

### Enhanced filter_tasks with Dependency Filters

Filtering tasks by dependency status:

**Request:**
```json
{
  "name": "filter_tasks",
  "arguments": {
    "listId": "project-overview-456",
    "isReady": true,
    "priority": 4
  }
}
```

**Response:**
```json
{
  "listId": "project-overview-456",
  "tasks": [
    {
      "id": "high-priority-ready-123",
      "title": "Implement user authentication",
      "status": "pending",
      "priority": 4,
      "isReady": true,
      "dependencies": [],
      "estimatedDuration": 120
    }
  ],
  "totalMatching": 1,
  "filters": {
    "isReady": true,
    "priority": 4
  }
}
```

### Enhanced get_list with Dependency Information

Getting a list with dependency details:

**Request:**
```json
{
  "name": "get_list",
  "arguments": {
    "listId": "dependency-example-789",
    "includeCompleted": false
  }
}
```

**Response:**
```json
{
  "id": "dependency-example-789",
  "title": "Web Development Project",
  "items": [
    {
      "id": "task-001",
      "title": "Setup development environment",
      "status": "pending",
      "priority": 5,
      "dependencies": [],
      "isReady": true
    },
    {
      "id": "task-002", 
      "title": "Build user interface",
      "status": "pending",
      "priority": 4,
      "dependencies": ["task-001"],
      "isReady": false,
      "blockedBy": ["task-001"]
    }
  ],
  "totalItems": 2,
  "completedItems": 0,
  "progress": 0
}
```

---

## Common Workflows

### 1. Project Setup Workflow

```bash
# 1. Create project tasks
add_task: "Setup environment" (no dependencies)
add_task: "Install dependencies" (depends on setup)
add_task: "Configure database" (depends on install)
add_task: "Write tests" (depends on configure)

# 2. Set up dependency chain
set_task_dependencies: install -> [setup]
set_task_dependencies: configure -> [install] 
set_task_dependencies: tests -> [configure]

# 3. Check what's ready to work on
get_ready_tasks: Should show "Setup environment"

# 4. Analyze project structure
analyze_task_dependencies: Shows critical path and recommendations
```

### 2. Daily Planning Workflow

```bash
# 1. Check ready tasks for today
get_ready_tasks: limit=5

# 2. If no ready tasks, analyze why
analyze_task_dependencies: Check bottlenecks and issues

# 3. Filter by priority if many ready tasks
filter_tasks: isReady=true, priority>=4

# 4. Start work on highest priority ready task
```

### 3. Project Health Check

```bash
# 1. Get overall project analysis
analyze_task_dependencies: Full project overview

# 2. Check for blocked tasks
filter_tasks: isBlocked=true

# 3. Identify bottlenecks from analysis
# Focus on tasks in bottlenecks array

# 4. Check critical path progress
# Prioritize tasks on critical path
```

### 4. Dependency Troubleshooting

```bash
# 1. If circular dependency error occurs:
analyze_task_dependencies: Check issues.circularDependencies

# 2. Review the circular chain
# Remove one dependency to break the loop

# 3. If no tasks are ready:
get_ready_tasks: Check nextActions for guidance
filter_tasks: status="in_progress" (complete these first)

# 4. Verify dependency setup
analyze_task_dependencies: Review recommendations
```

---

## Best Practices

### Dependency Design
- **Keep it simple**: Avoid complex dependency chains when possible
- **Break down large tasks**: Tasks with many dependencies should be split
- **Use meaningful relationships**: Only create dependencies that represent real prerequisites
- **Regular review**: Use analysis tools to identify and resolve bottlenecks

### Work Planning
- **Start with ready tasks**: Always check `get_ready_tasks` before planning work
- **Focus on critical path**: Prioritize tasks that affect the most other tasks
- **Address bottlenecks**: Complete tasks that block multiple others first
- **Monitor progress**: Regular analysis helps maintain project health

### Error Prevention
- **Validate before setting**: Ensure all dependency IDs exist
- **Avoid circular dependencies**: Design carefully to prevent loops
- **Limit dependency count**: Keep under 5 dependencies per task when possible
- **Document complex relationships**: Use descriptions to explain complex dependencies

---

**Next Steps:**
- Review [Dependency Management API Documentation](../docs/api/dependency-management.md)
- Learn about [Enhanced Tool Features](../docs/api/enhanced-tools.md)
- Check [Performance Optimization](../docs/api/tool-performance.md) for large projects