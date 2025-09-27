# Basic Usage Examples

This guide provides practical examples for common task management scenarios using the MCP Task Manager.

## 🚀 Getting Started Examples

### Creating Your First Todo List

**Scenario**: You want to organize tasks for a new project.

```json
{
  "tool": "create_list",
  "parameters": {
    "title": "Website Redesign Project",
    "description": "Complete redesign of company website with modern UI/UX",
    "projectTag": "web-development"
  }
}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Website Redesign Project",
  "description": "Complete redesign of company website with modern UI/UX",
  "taskCount": 0,
  "completedCount": 0,
  "progress": 0,
  "projectTag": "web-development",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Adding Tasks with Different Priorities

**High Priority Task:**
```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Create wireframes for main pages",
    "description": "Design wireframes for home, about, services, and contact pages",
    "priority": 5,
    "tags": ["design", "wireframes", "urgent"],
    "estimatedDuration": 240
  }
}
```

**Medium Priority Task:**
```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Research competitor websites",
    "description": "Analyze 5 competitor websites for design inspiration and best practices",
    "priority": 3,
    "tags": ["research", "analysis"],
    "estimatedDuration": 120
  }
}
```

**Low Priority Task:**
```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Update company logo",
    "description": "Consider updating the company logo for the new website",
    "priority": 2,
    "tags": ["design", "branding"],
    "estimatedDuration": 60
  }
}
```

## 📋 Daily Task Management

### Viewing Your Tasks

**Show all tasks organized by priority:**
```json
{
  "tool": "show_tasks",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "format": "detailed",
    "groupBy": "priority",
    "includeCompleted": false
  }
}
```

**Response:**
```
📋 Website Redesign Project (3 tasks, 0% complete)

🔥 CRITICAL PRIORITY (5):
  🔴 Create wireframes for main pages
     📝 Design wireframes for home, about, services, and contact pages
     ⏱️  240 min | 🏷️  design, wireframes, urgent

🔸 MEDIUM PRIORITY (3):
  🔴 Research competitor websites
     📝 Analyze 5 competitor websites for design inspiration and best practices
     ⏱️  120 min | 🏷️  research, analysis

🔹 LOW PRIORITY (2):
  🔴 Update company logo
     📝 Consider updating the company logo for the new website
     ⏱️  60 min | 🏷️  design, branding
```

### Finding Tasks to Work On

**Get ready tasks (no dependencies blocking):**
```json
{
  "tool": "get_ready_tasks",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "limit": 5
  }
}
```

**Response:**
```json
{
  "readyTasks": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "title": "Create wireframes for main pages",
      "priority": 5,
      "estimatedDuration": 240,
      "tags": ["design", "wireframes", "urgent"],
      "isReady": true
    },
    {
      "id": "789abcde-e89b-12d3-a456-426614174002",
      "title": "Research competitor websites",
      "priority": 3,
      "estimatedDuration": 120,
      "tags": ["research", "analysis"],
      "isReady": true
    }
  ],
  "summary": {
    "totalReady": 3,
    "highestPriority": 5,
    "totalEstimatedTime": 420
  },
  "nextActions": [
    "Start with highest priority: \"Create wireframes for main pages\" (Priority 5)",
    "3 tasks are ready to work on. Focus on one at a time for best results."
  ]
}
```

## 🔍 Searching and Filtering

### Search by Text

**Find all tasks related to "design":**
```json
{
  "tool": "search_tool",
  "parameters": {
    "query": "design",
    "limit": 10
  }
}
```

### Filter by Priority

**Find high-priority tasks:**
```json
{
  "tool": "search_tool",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "priority": [4, 5],
    "sortBy": "priority",
    "sortOrder": "desc"
  }
}
```

### Filter by Tags

**Find all research-related tasks:**
```json
{
  "tool": "search_tool",
  "parameters": {
    "tags": ["research"],
    "tagOperator": "AND",
    "sortBy": "createdAt"
  }
}
```

### Complex Filtering

**Find pending high-priority tasks with specific tags:**
```json
{
  "tool": "search_tool",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "status": ["pending"],
    "priority": [4, 5],
    "tags": ["design", "urgent"],
    "tagOperator": "OR",
    "sortBy": "priority",
    "sortOrder": "desc",
    "limit": 5
  }
}
```

## ✅ Completing Tasks

### Simple Task Completion

```json
{
  "tool": "complete_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "789abcde-e89b-12d3-a456-426614174002"
  }
}
```

**Response:**
```json
{
  "id": "789abcde-e89b-12d3-a456-426614174002",
  "title": "Research competitor websites",
  "status": "completed",
  "completedAt": "2024-01-15T14:30:00Z",
  "progress": 100
}
```

### Updating Task Properties

**Change task priority:**
```json
{
  "tool": "set_task_priority",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001",
    "priority": 4
  }
}
```

**Add tags to a task:**
```json
{
  "tool": "add_task_tags",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001",
    "tags": ["client-review", "milestone"]
  }
}
```

**Update task details:**
```json
{
  "tool": "update_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174001",
    "title": "Create and review wireframes for main pages",
    "description": "Design wireframes for home, about, services, and contact pages. Include client review session.",
    "estimatedDuration": 300
  }
}
```

## 📊 Project Overview

### List All Your Projects

```json
{
  "tool": "list_all_lists",
  "parameters": {
    "limit": 20
  }
}
```

**Response:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Website Redesign Project",
    "taskCount": 3,
    "completedCount": 1,
    "progress": 33,
    "projectTag": "web-development",
    "lastUpdated": "2024-01-15T14:30:00Z"
  },
  {
    "id": "987fcdeb-e89b-12d3-a456-426614174003",
    "title": "Marketing Campaign Q1",
    "taskCount": 8,
    "completedCount": 3,
    "progress": 38,
    "projectTag": "marketing",
    "lastUpdated": "2024-01-14T16:45:00Z"
  }
]
```

### Filter Projects by Tag

```json
{
  "tool": "list_all_lists",
  "parameters": {
    "projectTag": "web-development",
    "limit": 10
  }
}
```

### Get Detailed Project View

```json
{
  "tool": "get_list",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "includeCompleted": true
  }
}
```

## 🎯 Task Analysis

### Analyze Task Complexity

```json
{
  "tool": "analyze_task",
  "parameters": {
    "taskDescription": "Create a responsive website header with navigation menu, logo, and search functionality",
    "context": "React.js frontend development project",
    "maxSuggestions": 3
  }
}
```

**Response:**
```json
{
  "complexity": {
    "score": 6.5,
    "level": "Medium-High",
    "factors": [
      "Multiple components required",
      "Responsive design considerations",
      "Interactive functionality",
      "Integration requirements"
    ]
  },
  "estimatedDuration": 180,
  "confidence": 0.75,
  "suggestions": [
    "Break down into smaller tasks: Logo component, Navigation menu, Search functionality",
    "Consider mobile-first responsive design approach",
    "Plan for accessibility requirements (ARIA labels, keyboard navigation)"
  ]
}
```

### Get Task Suggestions

```json
{
  "tool": "get_task_suggestions",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "style": "practical",
    "maxSuggestions": 5
  }
}
```

## 🔄 Bulk Operations

### Create Multiple Tasks at Once

```json
{
  "tool": "bulk_task_operations",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "operations": [
      {
        "type": "create",
        "data": {
          "title": "Set up development environment",
          "priority": 4,
          "tags": ["setup", "development"],
          "estimatedDuration": 60
        }
      },
      {
        "type": "create",
        "data": {
          "title": "Install required dependencies",
          "priority": 4,
          "tags": ["setup", "dependencies"],
          "estimatedDuration": 30
        }
      },
      {
        "type": "create",
        "data": {
          "title": "Configure build system",
          "priority": 3,
          "tags": ["setup", "build"],
          "estimatedDuration": 90
        }
      }
    ]
  }
}
```

### Update Multiple Task Priorities

```json
{
  "tool": "bulk_task_operations",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
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
        "type": "set_priority",
        "taskId": "task-id-3",
        "priority": 3
      }
    ]
  }
}
```

## 🗂️ Project Management

### Archive Completed Projects

```json
{
  "tool": "delete_list",
  "parameters": {
    "listId": "completed-project-id",
    "permanent": false
  }
}
```

### Permanently Delete Old Projects

```json
{
  "tool": "delete_list",
  "parameters": {
    "listId": "old-project-id",
    "permanent": true
  }
}
```

## 📈 Progress Tracking

### Check Project Progress

```json
{
  "tool": "get_list",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000"
  }
}
```

The response includes progress information:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Website Redesign Project",
  "taskCount": 5,
  "completedCount": 2,
  "progress": 40,
  "tasks": [...]
}
```

### Track Time Estimates

**View total estimated time:**
```json
{
  "tool": "search_tool",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "status": ["pending", "in_progress"]
  }
}
```

The response includes time estimates for remaining work.

## 🎨 Common Patterns

### Weekly Planning Workflow

1. **Review all projects:**
   ```json
   {"tool": "list_all_lists", "parameters": {"limit": 20}}
   ```

2. **Find high-priority tasks:**
   ```json
   {"tool": "search_tool", "parameters": {"priority": [4, 5], "status": ["pending"]}}
   ```

3. **Get ready tasks for each project:**
   ```json
   {"tool": "get_ready_tasks", "parameters": {"listId": "project-id"}}
   ```

4. **Plan daily work:**
   ```json
   {"tool": "search_tool", "parameters": {"isReady": true, "sortBy": "priority"}}
   ```

### Task Cleanup Workflow

1. **Find completed tasks:**
   ```json
   {"tool": "search_tool", "parameters": {"status": ["completed"]}}
   ```

2. **Archive old completed tasks:**
   ```json
   {"tool": "remove_task", "parameters": {"listId": "project-id", "taskId": "old-task-id"}}
   ```

3. **Update task priorities:**
   ```json
   {"tool": "bulk_task_operations", "parameters": {"operations": [...]}}
   ```

### Project Setup Workflow

1. **Create project list:**
   ```json
   {"tool": "create_list", "parameters": {"title": "New Project", "projectTag": "category"}}
   ```

2. **Add initial tasks:**
   ```json
   {"tool": "bulk_task_operations", "parameters": {"operations": [...]}}
   ```

3. **Set up task priorities:**
   ```json
   {"tool": "bulk_task_operations", "parameters": {"operations": [...]}}
   ```

4. **Review project structure:**
   ```json
   {"tool": "show_tasks", "parameters": {"listId": "project-id", "groupBy": "priority"}}
   ```

## 💡 Tips and Best Practices

### Effective Task Titles
- **Good**: "Create responsive navigation menu with dropdown functionality"
- **Poor**: "Navigation stuff"

### Priority Guidelines
- **5 (Critical)**: Blocking other work, urgent deadlines
- **4 (High)**: Important features, client deliverables
- **3 (Medium)**: Regular development tasks
- **2 (Low)**: Nice-to-have features, optimizations
- **1 (Minimal)**: Future considerations, ideas

### Tag Organization
- **Type**: `feature`, `bug`, `documentation`, `testing`
- **Area**: `frontend`, `backend`, `database`, `api`
- **Status**: `urgent`, `blocked`, `review-needed`, `client-feedback`
- **Phase**: `planning`, `development`, `testing`, `deployment`

### Time Estimation
- Break large tasks (>4 hours) into smaller pieces
- Include buffer time for testing and review
- Use past experience to calibrate estimates
- Track actual time vs. estimates to improve accuracy

---

These examples cover the most common task management scenarios. For more advanced workflows, see the [Advanced Examples](advanced.md) guide.