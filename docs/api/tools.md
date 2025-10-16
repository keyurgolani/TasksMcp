# MCP Tools Reference

## Overview

The Task MCP Unified system provides 17 focused, easy-to-use tools for managing task lists and tasks, including advanced multi-agent orchestration capabilities. Each tool has a single, clear purpose with minimal required parameters and consistent response formats.

**Last Updated**: January 15, 2025  
**Version**: 2.5.0  
**Total Tools**: 17 organized in 5 categories

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

- **List Management (4 tools)**: Create, retrieve, list, and delete task lists
- **Task Management (7 tools)**: Add, update, remove, complete tasks, manage priorities/tags, and agent prompts
- **Search & Display (2 tools)**: Search, filter, and display tasks with formatting
- **Dependency Management (3 tools)**: Manage task relationships and workflow optimization
- **Exit Criteria Management (2 tools)**: Define and track detailed completion requirements

## Removed Features

The following features have been completely removed from the system:

- **Intelligence Tools**: Task suggestions, complexity analysis, and AI-powered recommendations
- **System Tracking**: Performance tracking and notification infrastructure
- **Statistics Management**: Task statistics calculation and reporting
- **Caching Systems**: All caching implementations have been removed
- **Bulk Operations in MCP**: Bulk operations are only available through the REST API
- **Task Ordering**: Tasks are now ordered by dependencies only, not manual ordering
- **Archiving**: Only permanent deletion is supported

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

Creates a new task list with basic information.

**Schema:**

```json
{
  "name": "create_list",
  "description": "Create a new task list",
  "inputSchema": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 200,
        "description": "The title of the task list"
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

Retrieves a specific task list with its tasks.

**Schema:**

```json
{
  "name": "get_list",
  "description": "Get a specific task list with its tasks",
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

Gets all task lists with basic information.

**Schema:**

```json
{
  "name": "list_all_lists",
  "description": "Get all task lists with basic information",
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
        "description": "Whether to include all lists"
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

Deletes a task list permanently.

**Schema:**

```json
{
  "name": "delete_list",
  "description": "Delete a task list permanently",
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
        "description": "Whether to permanently delete the list"
      }
    },
    "required": ["listId"]
  }
}
```

**Example Usage:**

```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Response:** Returns a success confirmation message.

---

### 5. update_list_metadata

Updates list metadata (title, description, projectTag) without affecting tasks.

**Schema:**

```json
{
  "name": "update_list_metadata",
  "description": "Update list metadata (title, description, projectTag)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list to update"
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1000,
        "description": "New title for the task list"
      },
      "description": {
        "type": "string",
        "maxLength": 5000,
        "description": "New description for the task list"
      },
      "projectTag": {
        "type": "string",
        "maxLength": 250,
        "description": "New project tag for organization (use lowercase with hyphens)"
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
  "title": "Updated Project Tasks",
  "description": "Updated description for the project",
  "projectTag": "updated-project"
}
```

**Response:** Returns an updated `ListResponse` object.

---

## Task Management Tools

**Enhanced Feature**: Tasks with dependencies automatically include a `blockReason` field showing why they're blocked and which tasks need to be completed first.

### 6. add_task

Adds a new task to a task list.

**Schema:**

```json
{
  "name": "add_task",
  "description": "Add a new task to a task list",
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

### 7. remove_task

Removes a task from a task list permanently.

**Schema:**

```json
{
  "name": "remove_task",
  "description": "Remove a task from a task list",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list containing the task"
      },
      "taskId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the task to remove"
      }
    },
    "required": ["listId", "taskId"]
  }
}
```

**Example Usage:**

```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "taskId": "456e7890-e89b-12d3-a456-426614174111"
}
```

**Response:** Returns a success confirmation message.

---

### 8. update_task

Updates task properties like title, description, and estimated duration.

**Schema:**

```json
{
  "name": "update_task",
  "description": "Update task properties",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list containing the task"
      },
      "taskId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the task to update"
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1000,
        "description": "New title for the task"
      },
      "description": {
        "type": "string",
        "maxLength": 5000,
        "description": "New description for the task"
      },
      "estimatedDuration": {
        "type": "number",
        "minimum": 1,
        "description": "New estimated duration in minutes"
      }
    },
    "required": ["listId", "taskId"]
  }
}
```

### 9. complete_task

Marks a task as completed after verifying all exit criteria are met.

**Schema:**

```json
{
  "name": "complete_task",
  "description": "Mark a task as completed",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list containing the task"
      },
      "taskId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the task to complete"
      }
    },
    "required": ["listId", "taskId"]
  }
}
```

### 10. set_task_priority

Changes the priority of a task.

**Schema:**

```json
{
  "name": "set_task_priority",
  "description": "Set task priority",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list containing the task"
      },
      "taskId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the task"
      },
      "priority": {
        "type": "number",
        "minimum": 1,
        "maximum": 5,
        "description": "New priority level (1=minimal, 2=low, 3=medium, 4=high, 5=critical)"
      }
    },
    "required": ["listId", "taskId", "priority"]
  }
}
```

### 11. add_task_tags

Adds tags to a task.

**Schema:**

```json
{
  "name": "add_task_tags",
  "description": "Add tags to a task",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list containing the task"
      },
      "taskId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the task"
      },
      "tags": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 50,
          "pattern": "^[\\p{L}\\p{N}\\p{Emoji}_-]+$"
        },
        "maxItems": 10,
        "minItems": 1,
        "description": "Tags to add (supports emoji, unicode, uppercase, numbers, hyphens, underscores)"
      }
    },
    "required": ["listId", "taskId", "tags"]
  }
}
```

### 12. remove_task_tags

Removes tags from a task.

**Schema:**

```json
{
  "name": "remove_task_tags",
  "description": "Remove tags from a task",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list containing the task"
      },
      "taskId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the task"
      },
      "tags": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 50
        },
        "maxItems": 10,
        "minItems": 1,
        "description": "Tags to remove"
      }
    },
    "required": ["listId", "taskId", "tags"]
  }
}
```

---

## Search & Display Tools

### 13. search_tool

Unified search and filtering tool that replaces legacy search/filter tools.

**Schema:**

```json
{
  "name": "search_tool",
  "description": "Unified search, filter, and query tool for tasks",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "maxLength": 1000,
        "description": "Text to search for in task titles, descriptions, and tags"
      },
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "Optional: limit search to specific list"
      },
      "status": {
        "type": "array",
        "items": {
          "enum": [
            "pending",
            "in_progress",
            "completed",
            "blocked",
            "cancelled"
          ]
        },
        "description": "Filter by task statuses"
      },
      "priority": {
        "type": "array",
        "items": {
          "type": "number",
          "minimum": 1,
          "maximum": 5
        },
        "description": "Filter by priority levels"
      },
      "tags": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 50
        },
        "description": "Filter by tags"
      },
      "tagOperator": {
        "type": "string",
        "enum": ["AND", "OR"],
        "default": "AND",
        "description": "How to combine tag filters"
      },
      "includeCompleted": {
        "type": "boolean",
        "default": true,
        "description": "Whether to include completed tasks"
      },
      "limit": {
        "type": "number",
        "minimum": 1,
        "maximum": 500,
        "default": 50,
        "description": "Maximum number of results"
      }
    },
    "required": []
  }
}
```

### 14. show_tasks

Displays tasks in formatted output with grouping and emojis.

**Schema:**

```json
{
  "name": "show_tasks",
  "description": "Display tasks in formatted output",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of the task list to display"
      },
      "format": {
        "type": "string",
        "enum": ["detailed"],
        "default": "detailed",
        "description": "Display format style"
      },
      "groupBy": {
        "type": "string",
        "enum": ["status", "priority", "none"],
        "default": "status",
        "description": "How to group the tasks"
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

---

## Dependency Management Tools

### 15. set_task_dependencies

Sets all dependencies for a task, replacing existing dependencies.

**Schema:**

```json
{
  "name": "set_task_dependencies",
  "description": "Set task dependencies",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of the list containing the task"
      },
      "taskId": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of the task to set dependencies for"
      },
      "dependencyIds": {
        "type": "array",
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "maxItems": 50,
        "description": "Array of task UUIDs that this task depends on (empty array removes all)"
      }
    },
    "required": ["listId", "taskId"]
  }
}
```

### 16. get_ready_tasks

Gets tasks that are ready to work on (no incomplete dependencies).

**Schema:**

```json
{
  "name": "get_ready_tasks",
  "description": "Get tasks ready to work on",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of the list to get ready tasks from"
      },
      "limit": {
        "type": "number",
        "minimum": 1,
        "maximum": 50,
        "default": 20,
        "description": "Maximum number of ready tasks to return"
      }
    },
    "required": ["listId"]
  }
}
```

### 17. analyze_task_dependencies

Analyzes task dependencies and provides comprehensive insights.

**Schema:**

```json
{
  "name": "analyze_task_dependencies",
  "description": "Analyze task dependencies with optional DAG visualization",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of the list to analyze"
      },
      "format": {
        "type": "string",
        "enum": ["analysis", "dag", "both"],
        "default": "analysis",
        "description": "Output format"
      },
      "dagStyle": {
        "type": "string",
        "enum": ["ascii", "dot", "mermaid"],
        "default": "ascii",
        "description": "DAG visualization style"
      }
    },
    "required": ["listId"]
  }
}
```

---

## Exit Criteria Management Tools

### 18. set_task_exit_criteria

Sets exit criteria for a task, replacing existing criteria.

**Schema:**

```json
{
  "name": "set_task_exit_criteria",
  "description": "Set exit criteria for a task",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of the list containing the task"
      },
      "taskId": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of the task to set exit criteria for"
      },
      "exitCriteria": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 500
        },
        "maxItems": 20,
        "description": "Array of exit criteria descriptions (empty array removes all)"
      }
    },
    "required": ["listId", "taskId", "exitCriteria"]
  }
}
```

### 19. update_exit_criteria

Updates the status of a specific exit criteria.

**Schema:**

```json
{
  "name": "update_exit_criteria",
  "description": "Update exit criteria status",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of the list containing the task"
      },
      "taskId": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of the task containing the exit criteria"
      },
      "criteriaId": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of the exit criteria to update"
      },
      "isMet": {
        "type": "boolean",
        "description": "Whether the exit criteria has been met"
      },
      "notes": {
        "type": "string",
        "maxLength": 1000,
        "description": "Optional notes about the criteria status"
      }
    },
    "required": ["listId", "taskId", "criteriaId"]
  }
}
```

---

## Agent Prompt Management Tools

### 20. get_agent_prompt

Gets the rendered agent prompt for a task with variable substitution.

**Schema:**

```json
{
  "name": "get_agent_prompt",
  "description": "Get rendered agent prompt for a task",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of the task list"
      },
      "taskId": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of the task to get prompt for"
      },
      "useDefault": {
        "type": "boolean",
        "default": false,
        "description": "Whether to use a default template if no custom template is set"
      }
    },
    "required": ["listId", "taskId"]
  }
}
```

---

### set_task_priority

Changes the priority of a task.

**Schema:**

```json
{
  "name": "set_task_priority",
  "description": "Change task priority",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the list containing the task"
      },
      "taskId": {
        "type": "string",
        "format": "uuid",
        "description": "The UUID of the task to update"
      },
      "priority": {
        "type": "number",
        "minimum": 1,
        "maximum": 5,
        "description": "New priority level (1=minimal, 2=low, 3=medium, 4=high, 5=critical/urgent)"
      }
    },
    "required": ["listId", "taskId", "priority"]
  }
}
```

**Example Usage:**

```json
{
  "listId": "123e4567-e89b-12d3-a456-426614174000",
  "taskId": "456e7890-e89b-12d3-a456-426614174111",
  "priority": 5
}
```

**Response:** Returns an updated `TaskResponse` object.

---

This completes the documentation for all 17 MCP tools available in the Task MCP Unified system.

## Agent Best Practices Integration

### 📚 Essential Reading

**Before using these tools, review the [Agent Best Practices Guide](../guides/agent-best-practices.md)** for proven methodologies that ensure effective task management:

- **Investigation-Driven Task Creation**: Use `analyze_task` before `add_task` to create comprehensive action plans
- **Research-Based Execution**: Use `search_tool` and `get_list` to understand context before starting work
- **Progress Tracking**: Regular `update_task` calls with status updates and learnings
- **Quality Completion**: Verify all exit criteria with `update_exit_criteria` before `complete_task`

## Tool Selection Recommendations

### Tier 1: Essential Tools (Always Recommend)

- **`search_tool`** - Unified search and filtering (replaces legacy search/filter tools)
- **`add_task`** - Comprehensive task creation with exit criteria and dependencies
- **`show_tasks`** - Rich formatted display with emojis and grouping
- **`complete_task`** - Quality-enforced completion with exit criteria validation
- **`create_list`** - Clean, focused list creation

### Tier 2: Workflow Optimization Tools

- **`get_ready_tasks`** - Daily workflow planning with actionable next steps
- **`analyze_task_dependencies`** - Project management with critical path analysis
- **`set_task_exit_criteria`** - Quality control and completion standards
- **`update_exit_criteria`** - Granular progress tracking

### Note on Bulk Operations

**Important**: Bulk operations have been removed from MCP tools and are only available through the REST API. For MCP usage, perform individual operations using the respective tools instead.

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
