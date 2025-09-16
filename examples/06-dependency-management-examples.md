# Dependency Management Examples

This document demonstrates comprehensive dependency management capabilities including task relationships, critical path analysis, and workflow optimization.

## Basic Dependency Operations

### Setting Task Dependencies
```json
{
  "tool": "set_task_dependencies",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "taskId": "e7e5a962-f706-4607-b7e1-95f44b9867ee",
    "dependencyIds": ["f47cd78e-962a-4860-a17e-49c67ab12da0"]
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
  "estimatedDuration": 240,
  "dependencies": ["f47cd78e-962a-4860-a17e-49c67ab12da0"],
  "message": "Dependencies updated successfully",
  "warnings": []
}
```

### Multiple Dependencies
```json
{
  "tool": "set_task_dependencies",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "taskId": "616496ad-87ad-4718-8ff1-68293c14077d",
    "dependencyIds": [
      "bc54482d-0f70-416b-987c-a6f15a98f16a",
      "62ab5565-5246-40be-953f-b2636c9753ba"
    ]
  }
}
```

### Clearing Dependencies
```json
{
  "tool": "set_task_dependencies",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "taskId": "62ab5565-5246-40be-953f-b2636c9753ba",
    "dependencyIds": []
  }
}
```

**Response:**
```json
{
  "id": "62ab5565-5246-40be-953f-b2636c9753ba",
  "title": "Build frontend application",
  "description": "Create React components, routing, and state management for the user interface",
  "status": "pending",
  "priority": 3,
  "tags": ["frontend", "react", "ui"],
  "createdAt": "2025-09-16T21:16:57.035Z",
  "updatedAt": "2025-09-16T21:18:45.123Z",
  "estimatedDuration": 360,
  "dependencies": [],
  "message": "Dependencies cleared successfully",
  "warnings": []
}
```

## Finding Ready Tasks

### Get All Ready Tasks
```json
{
  "tool": "get_ready_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d"
  }
}
```

**Response:**
```json
{
  "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
  "readyTasks": [
    {
      "id": "e7e5a962-f706-4607-b7e1-95f44b9867ee",
      "title": "Design database schema",
      "description": "Create ERD and define table structures for user management, content, and analytics",
      "status": "pending",
      "priority": 5,
      "tags": ["database", "design", "backend", "critical", "architecture"],
      "estimatedDuration": 240,
      "createdAt": "2025-09-16T21:16:46.741Z",
      "updatedAt": "2025-09-16T21:17:27.397Z"
    },
    {
      "id": "62ab5565-5246-40be-953f-b2636c9753ba",
      "title": "Build frontend application",
      "description": "Create React components, routing, and state management for the user interface",
      "status": "pending",
      "priority": 3,
      "tags": ["frontend", "react", "ui"],
      "estimatedDuration": 360,
      "createdAt": "2025-09-16T21:16:57.035Z",
      "updatedAt": "2025-09-16T21:16:57.035Z"
    }
  ],
  "totalReady": 2,
  "nextActions": [
    "Start with high-priority tasks: \"Design database schema\"",
    "2 tasks are ready to work on. Focus on one at a time for best results."
  ],
  "summary": {
    "totalTasks": 5,
    "completedTasks": 1,
    "readyTasks": 2,
    "blockedTasks": 2
  }
}
```

### Limited Ready Tasks
```json
{
  "tool": "get_ready_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "limit": 3
  }
}
```

## Dependency Analysis

### Complete Analysis with Visualization
```json
{
  "tool": "analyze_task_dependencies",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "format": "both",
    "dagStyle": "ascii"
  }
}
```

**Response:**
```json
{
  "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
  "summary": {
    "totalTasks": 5,
    "readyTasks": 2,
    "blockedTasks": 2,
    "tasksWithDependencies": 3
  },
  "criticalPath": [
    "f47cd78e-962a-4860-a17e-49c67ab12da0",
    "e7e5a962-f706-4607-b7e1-95f44b9867ee",
    "bc54482d-0f70-416b-987c-a6f15a98f16a",
    "616496ad-87ad-4718-8ff1-68293c14077d"
  ],
  "issues": {
    "circularDependencies": [],
    "bottlenecks": []
  },
  "recommendations": [
    "Focus on the critical path: Start with \"Design database schema\" as it affects 3 other tasks.",
    "2 tasks are ready. Prioritize high-priority tasks like \"Design database schema\"."
  ]
}

==================================================
DAG VISUALIZATION:
==================================================

Task Dependency Graph (DAG):

🟢 READY TO START:
  • Design database schema → [Implement backend API]
  • Build frontend application

🔴 BLOCKED TASKS:
  • Implement backend API ← blocked by [Design database schema]
  • Write comprehensive tests ← blocked by [Implement backend API]

✅ COMPLETED:
  • Set up development environment and tools

DEPENDENCY RELATIONSHIPS:
  Design database schema ← depends on: [Set up development environment and tools]
  Implement backend API ← depends on: [Design database schema]
  Write comprehensive tests ← depends on: [Implement backend API]
```

### Analysis Only (No Visualization)
```json
{
  "tool": "analyze_task_dependencies",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "format": "analysis"
  }
}
```

**Response:**
```json
{
  "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
  "summary": {
    "totalTasks": 5,
    "readyTasks": 2,
    "blockedTasks": 2,
    "tasksWithDependencies": 3
  },
  "criticalPath": [
    "f47cd78e-962a-4860-a17e-49c67ab12da0",
    "e7e5a962-f706-4607-b7e1-95f44b9867ee",
    "bc54482d-0f70-416b-987c-a6f15a98f16a",
    "616496ad-87ad-4718-8ff1-68293c14077d"
  ],
  "issues": {
    "circularDependencies": [],
    "bottlenecks": []
  },
  "recommendations": [
    "Focus on the critical path: Start with \"Design database schema\" as it affects 3 other tasks.",
    "2 tasks are ready. Prioritize high-priority tasks like \"Design database schema\"."
  ]
}
```

## Visualization Formats

### Mermaid Diagram
```json
{
  "tool": "analyze_task_dependencies",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "format": "dag",
    "dagStyle": "mermaid"
  }
}
```

**Response:**
```
graph TD
  T1["Set up development environment and tools"]:::completed
  T2["Design database schema"]:::pending
  T3["Implement backend API"]:::pending
  T4["Build frontend application"]:::pending
  T5["Write comprehensive tests"]:::pending

  T1 --> T2
  T2 --> T3
  T3 --> T5

  classDef completed fill:#90EE90,stroke:#333,stroke-width:2px
  classDef inProgress fill:#87CEEB,stroke:#333,stroke-width:2px
  classDef blocked fill:#F08080,stroke:#333,stroke-width:2px
  classDef pending fill:#FFFFE0,stroke:#333,stroke-width:2px
  classDef cancelled fill:#D3D3D3,stroke:#333,stroke-width:2px
```

### Graphviz DOT Format
```json
{
  "tool": "analyze_task_dependencies",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "format": "dag",
    "dagStyle": "dot"
  }
}
```

**Response:**
```
digraph TaskDAG {
  rankdir=TB;
  node [shape=box, style=rounded];

  "Set up development environment and tools" [fillcolor=lightgreen, style="rounded,filled", penwidth=3];
  "Design database schema" [fillcolor=lightyellow, style="rounded,filled", penwidth=3];
  "Implement backend API" [fillcolor=lightyellow, style="rounded,filled"];
  "Build frontend application" [fillcolor=lightyellow, style="rounded,filled"];
  "Write comprehensive tests" [fillcolor=lightyellow, style="rounded,filled"];

  "Set up development environment and tools" -> "Design database schema";
  "Design database schema" -> "Implement backend API";
  "Implement backend API" -> "Write comprehensive tests";
}
```

## Complex Dependency Scenarios

### Parallel Development Tracks
```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "title": "Set up CI/CD pipeline",
    "description": "Configure GitHub Actions for automated testing and deployment",
    "priority": 3,
    "tags": ["devops", "automation", "ci-cd"],
    "dependencies": ["f47cd78e-962a-4860-a17e-49c67ab12da0"]
  }
}
```

### Integration Tasks with Multiple Dependencies
```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "title": "Integration testing",
    "description": "Test frontend and backend integration with end-to-end scenarios",
    "priority": 2,
    "tags": ["testing", "integration", "e2e"],
    "dependencies": [
      "bc54482d-0f70-416b-987c-a6f15a98f16a",
      "62ab5565-5246-40be-953f-b2636c9753ba"
    ]
  }
}
```

### Deployment Dependencies
```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "title": "Deploy to production",
    "description": "Deploy application to production environment with monitoring",
    "priority": 1,
    "tags": ["deployment", "production", "monitoring"],
    "dependencies": [
      "616496ad-87ad-4718-8ff1-68293c14077d",
      "integration-task-id",
      "ci-cd-task-id"
    ]
  }
}
```

## Filtering by Dependency Status

### Find Tasks with Dependencies
```json
{
  "tool": "filter_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "hasDependencies": true
  }
}
```

### Find Blocked Tasks
```json
{
  "tool": "filter_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "isBlocked": true
  }
}
```

### Find Ready Tasks (Alternative Method)
```json
{
  "tool": "filter_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "isReady": true,
    "status": "pending"
  }
}
```

## Dependency Management Patterns

### Sequential Development Pattern
```
Setup → Design → Implementation → Testing → Deployment
```

Example dependency chain:
1. "Set up development environment" (no dependencies)
2. "Design database schema" (depends on #1)
3. "Implement backend API" (depends on #2)
4. "Write comprehensive tests" (depends on #3)
5. "Deploy to production" (depends on #4)

### Parallel Development Pattern
```
Setup → Design → Implementation (Frontend + Backend) → Integration → Deployment
```

Example parallel tracks:
1. "Set up development environment" (no dependencies)
2. "Design database schema" (depends on #1)
3. "Implement backend API" (depends on #2)
4. "Build frontend application" (depends on #1, parallel to #3)
5. "Integration testing" (depends on #3 and #4)
6. "Deploy to production" (depends on #5)

### Feature Branch Pattern
```
Setup → Feature Design → Feature Implementation → Feature Testing → Integration
```

Example feature development:
1. "Set up feature branch" (depends on main setup)
2. "Design user authentication" (depends on #1)
3. "Implement auth backend" (depends on #2)
4. "Implement auth frontend" (depends on #2)
5. "Test authentication flow" (depends on #3 and #4)
6. "Merge to main branch" (depends on #5)

## Best Practices

### Dependency Design
1. **Keep chains reasonable** - Avoid overly long dependency chains
2. **Enable parallelism** - Design tasks that can run in parallel
3. **Use logical grouping** - Group related dependencies together
4. **Consider team capacity** - Don't create too many parallel tracks
5. **Plan for integration** - Include integration tasks for parallel work

### Dependency Management
1. **Review dependencies regularly** - Ensure they still make sense
2. **Update as requirements change** - Dependencies may need adjustment
3. **Clear unnecessary dependencies** - Remove dependencies that are no longer needed
4. **Use ready tasks** - Focus on what can be done now
5. **Monitor critical path** - Understand what affects project timeline

### Workflow Optimization
1. **Start with ready tasks** - Always work on tasks that can be started
2. **Prioritize critical path** - Focus on tasks that unblock others
3. **Identify bottlenecks** - Look for tasks that block many others
4. **Plan parallel work** - Assign independent tasks to different team members
5. **Complete dependencies first** - Finish blocking tasks to unblock others

## Common Dependency Scenarios

### Software Development Project
```
Environment Setup → Architecture Design → Database Design
                                      ↓
Frontend Development ← API Development ← Database Implementation
                ↓                    ↓
            UI Testing ← Integration Testing → System Testing
                                      ↓
                              Deployment → Monitoring
```

### Content Creation Project
```
Research → Content Strategy → Content Outline
                           ↓
Writing ← Design Assets ← Content Creation
    ↓         ↓              ↓
Review → Editing → Final Review → Publishing
```

### Marketing Campaign
```
Market Research → Campaign Strategy → Creative Brief
                                   ↓
Asset Creation ← Copy Writing ← Campaign Materials
            ↓         ↓              ↓
    Review → Testing → Launch → Monitoring → Analysis
```

## Troubleshooting Dependencies

### Circular Dependencies
If you try to create a circular dependency, the system will prevent it:
```json
{
  "error": "Circular dependency detected",
  "details": "Task A depends on Task B, which depends on Task A"
}
```

### Missing Dependencies
If you reference a non-existent task:
```json
{
  "error": "Dependency not found",
  "details": "Task with ID 'invalid-id' does not exist"
}
```

### Dependency Warnings
The system may provide warnings for complex dependency structures:
```json
{
  "warnings": [
    "Task has 5+ dependencies, consider breaking it down",
    "Long dependency chain detected (6 levels deep)"
  ]
}
```

## Performance Considerations

### Large Dependency Graphs
- Use `limit` parameter when getting ready tasks
- Consider breaking down complex tasks with many dependencies
- Use visualization to understand complex relationships
- Monitor performance with large numbers of tasks

### Frequent Dependency Updates
- Batch dependency updates when possible
- Use analysis tools to understand impact of changes
- Consider caching for frequently accessed dependency information
- Monitor system performance with frequent updates