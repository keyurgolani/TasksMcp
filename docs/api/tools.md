# MCP Tools Reference

## Overview

The MCP Task Manager provides 20 focused, easy-to-use tools for managing todo lists and tasks, including advanced multi-agent orchestration capabilities. Each tool has a single, clear purpose with minimal required parameters and consistent response formats.

**Last Updated**: September 27, 2025  
**Version**: 2.3.0  
**Total Tools**: 20 organized in 6 categories

## 🤖 Agent-Friendly Features

### Smart Parameter Preprocessing
All MCP tools support automatic parameter conversion for common AI agent patterns:

- **String Numbers**: `"5"` → `5` (for priority, estimatedDuration, etc.)
- **JSON String Arrays**: `'["tag1", "tag2"]'` → `["tag1", "tag2"]` (for tags)
- **Boolean Strings**: `"true"` → `true`, `"yes"` → `true` (for includeCompleted, etc.)

### Enhanced Error Messages
When validation fails, you'll receive helpful, actionable error messages:

```json
{
  "error": "❌ priority: Expected number, but received string\n💡 Use numbers 1-5, where 5 is highest priority\n📝 Example: 5 (highest) to 1 (lowest)\n\n🔧 Common fixes:\n1. Use numbers 1-5 for priority\n   Example: {\"priority\": 5}"
}
```

### Backward Compatibility
All existing integrations continue to work without changes. The preprocessing only enhances the experience for new agent patterns.

## Tool Categories

- **List Management (4 tools)**: Create, retrieve, list, and delete todo lists
- **Task Management (6 tools)**: Add, update, remove, complete tasks and manage priorities/tags
- **Search & Display (3 tools)**: Search, filter, and display tasks with formatting
- **Advanced Features (2 tools)**: Task analysis and AI-generated suggestions
- **Exit Criteria Management (2 tools)**: Define and track detailed completion requirements
- **Dependency Management (3 tools)**: Manage task relationships and workflow optimization

## Common Response Formats

### ListResponse
```json
{
  "id": "uuid-string",
  "title": "List Title",
  "description": "Optional description",
  "taskCount": 5,
  "completedCount": 2,
  "progress": 40,
  "lastUpdated": "2024-01-15T10:30:00Z",
  "projectTag": "optional-project-tag"
}
```

### TaskResponse
```json
{
  "id": "uuid-string",
  "title": "Task Title",
  "description": "Optional description",
  "status": "pending",
  "priority": 3,
  "tags": ["tag1", "tag2"],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "estimatedDuration": 60
}
```

---

## List Management Tools

### 1. create_list

Creates a new todo list with basic information.

**Schema:**
```json
{
  "name": "create_list",
  "description": "Create a new todo list",
  "inputSchema": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 200,
        "description": "The title of the todo list"
      },
      "description": {
        "type": "string",
        "maxLength": 1000,
        "description": "Optional description of the list"
      },
      "projectTag": {
        "type": "string",
        "maxLength": 50,
        "description": "Optional project tag for organization"
      }
    },
    "required": ["title"]
  }
}
```

**Example Usage:**
```json
{
  "title": "Weekly Planning",
  "description": "Tasks for this week's planning session",
  "projectTag": "work"
}
```

**Response:** Returns a `ListResponse` object.

---

### 2. get_list

Retrieves a specific todo list with its tasks.

**Schema:**
```json
{
  "name": "get_list",
  "description": "Get a specific todo list with its tasks",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list to retrieve"
      },
      "includeCompleted": {
        "type": "boolean",
        "default": true,
        "description": "Whether to include completed tasks"
      }
    },
    "required": ["listId"]
  }
}
```

**Example Usage:**
```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "includeCompleted": false
}
```

**Response:** Returns a `ListResponse` with an additional `tasks` array containing `TaskResponse` objects.

---

### 3. list_all_lists

Gets all todo lists with basic information.

**Schema:**
```json
{
  "name": "list_all_lists",
  "description": "Get all todo lists with basic information",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectTag": {
        "type": "string",
        "maxLength": 50,
        "description": "Filter by project tag"
      },
      "includeArchived": {
        "type": "boolean",
        "default": false,
        "description": "Whether to include archived lists"
      },
      "limit": {
        "type": "number",
        "minimum": 1,
        "maximum": 100,
        "default": 50,
        "description": "Maximum number of lists to return"
      }
    },
    "required": []
  }
}
```

**Example Usage:**
```json
{
  "projectTag": "work",
  "limit": 10
}
```

**Response:** Returns an array of `ListResponse` objects.

---

### 4. delete_list

Deletes or archives a todo list.

**Schema:**
```json
{
  "name": "delete_list",
  "description": "Delete or archive a todo list",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list to delete"
      },
      "permanent": {
        "type": "boolean",
        "default": false,
        "description": "Whether to permanently delete (true) or archive (false)"
      }
    },
    "required": ["listId"]
  }
}
```

**Example Usage:**
```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "permanent": false
}
```

**Response:** Returns a success confirmation message.

---

## Task Management Tools

### 5. add_task

Adds a new task to a todo list.

**Schema:**
```json
{
  "name": "add_task",
  "description": "Add a new task to a todo list",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list to add the task to"
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 200,
        "description": "The title of the task"
      },
      "description": {
        "type": "string",
        "maxLength": 1000,
        "description": "Optional description of the task"
      },
      "priority": {
        "type": "number",
        "minimum": 1,
        "maximum": 5,
        "default": 3,
        "description": "Task priority (1=lowest, 5=highest)"
      },
      "exitCriteria": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 500
        },
        "maxItems": 20,
        "description": "Array of exit criteria descriptions that must be met to complete the task"
      },
      "tags": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 50
        },
        "maxItems": 10,
        "description": "Optional tags for the task"
      },
      "estimatedDuration": {
        "type": "number",
        "minimum": 1,
        "description": "Estimated duration in minutes"
      },
      "dependencies": {
        "type": "array",
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "maxItems": 10,
        "description": "Array of task IDs that this task depends on (max 10 dependencies)"
      }
    },
    "required": ["listId", "title"]
  }
}
```

**Example Usage:**
```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "title": "Review project proposal",
  "description": "Review the Q1 project proposal document",
  "priority": 4,
  "tags": ["review", "urgent"],
  "estimatedDuration": 30,
  "dependencies": ["456e7890-e89b-12d3-a456-426614174111"],
  "exitCriteria": ["Document reviewed", "Feedback provided", "Approval given"]
}
```

**Response:** Returns a `TaskResponse` object.

---

For the complete documentation of all 20 tools, including Task Management, Search & Display, Advanced Features, Exit Criteria Management, and Dependency Management tools, see the full documentation in the source files.

## Agent Best Practices Integration

### 📚 Essential Reading
**Before using these tools, review the [Agent Best Practices Guide](../guides/agent-best-practices.md)** for proven methodologies that ensure effective task management:

- **Investigation-Driven Task Creation**: Use `analyze_task` before `add_task` to create comprehensive action plans
- **Research-Based Execution**: Use `search_tool` and `get_list` to understand context before starting work
- **Progress Tracking**: Regular `update_task` calls with status updates and learnings
- **Quality Completion**: Verify all exit criteria with `update_exit_criteria` before `complete_task`

## Tool Selection Recommendations

### Tier 1: Essential Tools (Always Recommend)
- **`search_tool`** - Unified search and filtering (replaces search_tasks/filter_tasks)
- **`add_task`** - Comprehensive task creation with exit criteria and dependencies
- **`show_tasks`** - Rich formatted display with emojis and grouping
- **`complete_task`** - Quality-enforced completion with exit criteria validation
- **`create_list`** - Clean, focused list creation

### Tier 2: Workflow Optimization Tools
- **`get_ready_tasks`** - Daily workflow planning with actionable next steps
- **`analyze_task_dependencies`** - Project management with critical path analysis
- **`bulk_task_operations`** - Batch efficiency for multiple operations
- **`set_task_exit_criteria`** - Quality control and completion standards
- **`update_exit_criteria`** - Granular progress tracking

### Legacy Tools (Use Alternatives)
- ⚠️ `search_tasks` → Use `search_tool` instead
- ⚠️ `filter_tasks` → Use `search_tool` instead

## Common Usage Workflows

### Workflow 1: Creating a New Project with Tasks

**Step 1: Create a new list**
```json
{
  "tool": "create_list",
  "parameters": {
    "title": "Website Redesign Project",
    "description": "Tasks for the company website redesign",
    "projectTag": "web-design"
  }
}
```

**Step 2: Add initial tasks**
```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "project-uuid",
    "title": "Create wireframes",
    "priority": 4,
    "tags": ["design", "planning"],
    "exitCriteria": ["Wireframes approved by stakeholders"]
  }
}
```

### Workflow 2: Daily Task Management

**Step 1: Find ready tasks**
```json
{
  "tool": "get_ready_tasks",
  "parameters": {
    "listId": "project-uuid",
    "limit": 5
  }
}
```

**Step 2: Work on tasks and update progress**
```json
{
  "tool": "update_exit_criteria",
  "parameters": {
    "listId": "project-uuid",
    "taskId": "task-uuid",
    "criteriaId": "criteria-uuid",
    "isMet": true,
    "notes": "Wireframes completed and approved"
  }
}
```

**Step 3: Complete tasks when all criteria are met**
```json
{
  "tool": "complete_task",
  "parameters": {
    "listId": "project-uuid",
    "taskId": "task-uuid"
  }
}
```

## Performance Considerations

### Response Time Targets
- **Basic CRUD operations**: < 10ms (current: ~5ms create, ~2ms read)
- **Complex queries with filtering**: < 50ms
- **Search operations**: < 100ms
- **Dependency analysis**: < 100ms

### Data Limitations
- **Maximum items per list**: 1000
- **Maximum lists per installation**: Unlimited (limited by storage)
- **Maximum concurrent operations**: 100+
- **Search result limit**: 1000 per query

## Error Handling

All tools provide comprehensive error handling with:
- **Clear validation messages** with specific field feedback
- **Actionable suggestions** for fixing common issues
- **Working examples** included in error responses
- **Tool-specific guidance** based on the operation being performed

For detailed error handling information, see the [Error Handling Guide](errors.md).

---

This reference provides the foundation for using all MCP Task Manager tools effectively. For practical examples and integration patterns, see the [Examples](../examples/) section.