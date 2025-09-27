# Advanced Workflow Examples

This document demonstrates advanced features including AI-powered analysis, dependency management, and multi-agent orchestration patterns.

## AI-Powered Task Analysis

### Simple Task Analysis

```json
{
  "tool": "analyze_task",
  "parameters": {
    "taskDescription": "Build a real-time chat application with WebSocket support, user authentication, message persistence, and file sharing capabilities",
    "context": "Web application development project using Node.js and React",
    "maxSuggestions": 3
  }
}
```

**Response:**
```json
{
  "isComplex": false,
  "complexityScore": 4,
  "confidence": 25,
  "estimatedDuration": 732,
  "reasoning": "Task appears straightforward (score: 4/10). Can likely be completed as a single task.",
  "suggestions": [],
  "breakdown": [
    "Technical complexity: 8/10 - Requires programming expertise"
  ]
}
```

### Complex Task Analysis

```json
{
  "tool": "analyze_task",
  "parameters": {
    "taskDescription": "Design and implement a complete e-commerce platform with user management, product catalog, shopping cart, payment processing, order management, inventory tracking, analytics dashboard, mobile app, admin panel, and deployment to AWS with CI/CD pipeline",
    "context": "Enterprise software development with microservices architecture",
    "maxSuggestions": 5
  }
}
```

**Response:**
```json
{
  "isComplex": true,
  "complexityScore": 9,
  "confidence": 85,
  "estimatedDuration": 2400,
  "reasoning": "This is a highly complex task (score: 9/10) that should be broken down into smaller, manageable components.",
  "suggestions": [
    "Break into separate microservices: User service, Product service, Order service, Payment service",
    "Create separate tasks for frontend (web app) and mobile app development",
    "Set up infrastructure and CI/CD pipeline as foundational tasks",
    "Implement core features first, then add advanced analytics and admin features",
    "Consider using existing solutions for payment processing and authentication"
  ],
  "breakdown": [
    "User Management System - 240 minutes",
    "Product Catalog with Search - 360 minutes", 
    "Shopping Cart and Checkout - 300 minutes",
    "Payment Processing Integration - 180 minutes",
    "Order Management System - 240 minutes"
  ]
}
```

### Get Task Suggestions

```json
{
  "tool": "get_task_suggestions",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "style": "practical",
    "maxSuggestions": 5
  }
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "title": "Set up automated testing framework",
      "description": "Implement unit and integration tests for reliable development",
      "priority": 4,
      "estimatedDuration": 180,
      "tags": ["testing", "automation", "quality"],
      "reasoning": "Testing is crucial for maintaining code quality as the project grows"
    },
    {
      "title": "Implement error logging and monitoring",
      "description": "Set up comprehensive error tracking and performance monitoring",
      "priority": 3,
      "estimatedDuration": 120,
      "tags": ["monitoring", "logging", "operations"],
      "reasoning": "Essential for production readiness and debugging"
    }
  ],
  "context": {
    "existingTasks": 5,
    "completedTasks": 1,
    "averagePriority": 4.2,
    "commonTags": ["setup", "backend", "database"]
  }
}
```

## Dependency Management

### Setting Task Dependencies

**Basic Dependencies:**
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

**Multiple Dependencies:**
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

### Finding Ready Tasks

```json
{
  "tool": "get_ready_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "limit": 10
  }
}
```

**Response:**
```json
{
  "readyTasks": [
    {
      "id": "f47cd78e-962a-4860-a17e-49c67ab12da0",
      "title": "Set up development environment and tools",
      "priority": 5,
      "estimatedDuration": 90,
      "tags": ["setup", "environment", "urgent"],
      "isReady": true,
      "blockedTasks": ["e7e5a962-f706-4607-b7e1-95f44b9867ee"]
    }
  ],
  "summary": {
    "totalReady": 1,
    "totalBlocked": 4,
    "highestPriority": 5,
    "totalEstimatedTime": 90
  },
  "recommendations": [
    "Focus on \"Set up development environment and tools\" first - it unblocks 1 other task",
    "Consider breaking down blocked tasks if dependencies are taking too long"
  ]
}
```

### Dependency Analysis

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
  "analysis": {
    "totalTasks": 5,
    "readyTasks": 1,
    "blockedTasks": 4,
    "criticalPath": [
      "f47cd78e-962a-4860-a17e-49c67ab12da0",
      "e7e5a962-f706-4607-b7e1-95f44b9867ee",
      "bc54482d-0f70-416b-987c-a6f15a98f16a"
    ],
    "criticalPathDuration": 570,
    "bottlenecks": [
      {
        "taskId": "f47cd78e-962a-4860-a17e-49c67ab12da0",
        "title": "Set up development environment and tools",
        "blocksCount": 1,
        "impact": "high"
      }
    ]
  },
  "visualization": {
    "ascii": "f47cd78e → e7e5a962 → bc54482d\n           ↓\n        62ab5565",
    "mermaid": "graph TD\n  A[Set up environment] --> B[Design database]\n  B --> C[Implement API]\n  B --> D[Create frontend]"
  },
  "recommendations": [
    "Focus on completing \"Set up development environment and tools\" first to unblock other work",
    "Consider if any dependencies can be removed or made optional",
    "The critical path will take approximately 570 minutes to complete"
  ]
}
```

## Multi-Agent Orchestration

### Pattern 1: Parallel Feature Development

**Setup: Create feature tasks with dependencies**
```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "web-app-project",
    "title": "Implement user authentication",
    "tags": ["backend", "security"],
    "dependencies": ["setup-database"]
  }
}
```

```json
{
  "tool": "add_task", 
  "parameters": {
    "listId": "web-app-project",
    "title": "Design user interface",
    "tags": ["frontend", "ui"],
    "dependencies": ["create-wireframes"]
  }
}
```

**Orchestration: Find ready tasks**
```json
{
  "tool": "get_ready_tasks",
  "parameters": {"listId": "web-app-project", "limit": 5}
}
```

**Returns:** `["setup-database", "create-wireframes"]` - can be assigned to different agents

**Assignment:**
- Database Agent → "setup-database"
- Design Agent → "create-wireframes"
- Both work in parallel, unlocking more tasks when complete

### Pattern 2: Pipeline Processing

**Setup: Content creation pipeline**
```json
{
  "tool": "set_task_dependencies",
  "parameters": {
    "listId": "content-pipeline",
    "taskId": "publish-article",
    "dependencyIds": ["write-draft", "edit-content", "create-graphics", "seo-review"]
  }
}
```

**Orchestration: As each stage completes, next becomes ready**
- Stage 1: Writer Agent → "write-draft"
- Stage 2: Editor Agent → "edit-content" (after draft complete)
- Stage 3: Designer Agent → "create-graphics" (parallel with editing)
- Stage 4: SEO Agent → "seo-review" (after content ready)
- Stage 5: Publisher Agent → "publish-article" (after all complete)

### Pattern 3: Quality Gates

**Setup: Code deployment with multiple approvals**
```json
{
  "tool": "set_task_dependencies",
  "parameters": {
    "listId": "deployment",
    "taskId": "deploy-production",
    "dependencyIds": ["code-review-1", "code-review-2", "security-scan", "performance-test"]
  }
}
```

**Orchestration: Multiple review agents work in parallel**
- Review Agent 1 → "code-review-1"
- Review Agent 2 → "code-review-2" 
- Security Agent → "security-scan"
- Performance Agent → "performance-test"
- All must complete before deployment agent can proceed

## Complex Workflow Examples

### Large Software Development Project

```bash
# Orchestration Agent Workflow:

# 1. Analyze current project state
analyze_task_dependencies → Identify bottlenecks and critical path

# 2. Find available work
get_ready_tasks → Get list of unblocked tasks

# 3. Assign tasks to specialized agents:
# - Frontend Agent: UI components (if design complete)
# - Backend Agent: API endpoints (if database ready)  
# - Testing Agent: Unit tests (if code available)
# - DevOps Agent: Infrastructure (if requirements defined)

# 4. Monitor progress and reassign as tasks complete
# 5. Repeat until project completion
```

### Content Creation Pipeline

```bash
# Multi-Agent Content Workflow:

# 1. Content Manager Agent sets up pipeline
set_task_dependencies → Define content workflow stages

# 2. Find ready content pieces
get_ready_tasks → Identify articles ready for next stage

# 3. Assign to specialized agents:
# - Research Agent: Gather information and sources
# - Writing Agent: Create initial drafts
# - Editing Agent: Review and improve content
# - SEO Agent: Optimize for search engines
# - Publishing Agent: Format and publish

# 4. Pipeline flows automatically as each stage completes
```

## Advanced Search and Filtering

### Complex Multi-Criteria Search

```json
{
  "tool": "search_tasks",
  "parameters": {
    "query": "authentication security",
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "priority": [4, 5],
    "status": ["pending", "in_progress"],
    "tags": ["backend", "security"],
    "isReady": true,
    "sortBy": "priority",
    "sortOrder": "desc",
    "limit": 10
  }
}
```

### Filter by Time Estimates

```json
{
  "tool": "filter_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "estimatedDurationMin": 60,
    "estimatedDurationMax": 240,
    "sortBy": "estimatedDuration"
  }
}
```

### Advanced Display Options

```json
{
  "tool": "show_tasks",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "format": "detailed",
    "groupBy": "status",
    "includeCompleted": true,
    "showDependencies": true,
    "showBlockedBy": true,
    "showEstimates": true
  }
}
```

## Performance Optimization

### Batch Operations

**Create Multiple Related Tasks:**
```json
{
  "tool": "bulk_task_operations",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "operations": [
      {
        "type": "create",
        "data": {
          "title": "Set up user authentication API",
          "priority": 5,
          "tags": ["backend", "auth", "api"],
          "estimatedDuration": 180
        }
      },
      {
        "type": "create",
        "data": {
          "title": "Implement JWT token handling",
          "priority": 4,
          "tags": ["backend", "auth", "security"],
          "estimatedDuration": 120
        }
      },
      {
        "type": "create",
        "data": {
          "title": "Add password hashing and validation",
          "priority": 4,
          "tags": ["backend", "auth", "security"],
          "estimatedDuration": 90
        }
      }
    ]
  }
}
```

**Update Multiple Task Priorities:**
```json
{
  "tool": "bulk_task_operations",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "operations": [
      {
        "type": "set_priority",
        "taskId": "task-id-1",
        "priority": 5
      },
      {
        "type": "set_priority",
        "taskId": "task-id-2",
        "priority": 4
      },
      {
        "type": "add_tags",
        "taskId": "task-id-3",
        "tags": ["urgent", "client-facing"]
      }
    ]
  }
}
```

## Best Practices for Advanced Workflows

### Task Design
- **Atomic Tasks**: Create tasks that can be completed independently by a single agent
- **Clear Dependencies**: Only set dependencies that represent true prerequisites
- **Balanced Workload**: Design tasks with similar complexity for parallel execution

### Dependency Management
- **Minimize Dependencies**: Reduce coupling between tasks where possible
- **Parallel Paths**: Create multiple independent work streams
- **Critical Path Focus**: Prioritize tasks on the critical path

### Multi-Agent Coordination
- **Role-Based Assignment**: Assign tasks based on agent specialization
- **Progress Monitoring**: Regular check-ins on task completion status
- **Dynamic Rebalancing**: Reassign work based on agent availability and progress

### Performance Optimization
- **Batch Operations**: Use bulk operations for multiple related changes
- **Efficient Filtering**: Use specific criteria to reduce data transfer
- **Context Management**: Maintain context for related operations

These advanced patterns enable sophisticated project management and multi-agent orchestration workflows that can scale to handle complex, multi-phase projects with hundreds of interdependent tasks.