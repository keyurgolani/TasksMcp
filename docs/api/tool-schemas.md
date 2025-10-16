# Tool Schemas Reference

This document provides the complete JSON schemas for all MCP tools in the Task MCP Unified system.

## Schema Format

All tools follow the MCP (Model Context Protocol) schema format with consistent structure:

```json
{
  "name": "tool_name",
  "description": "Tool description",
  "inputSchema": {
    "type": "object",
    "properties": {
      // Parameter definitions
    },
    "required": ["required_params"]
  }
}
```

## Common Parameter Types

### UUID Parameters

```json
{
  "type": "string",
  "format": "uuid",
  "description": "UUID identifier"
}
```

### Priority Parameters

```json
{
  "type": "number",
  "minimum": 1,
  "maximum": 5,
  "description": "Priority level (1=lowest, 5=highest)"
}
```

### Tag Arrays

```json
{
  "type": "array",
  "items": {
    "type": "string",
    "maxLength": 50
  },
  "maxItems": 10,
  "description": "Array of tags"
}
```

## List Management Schemas

### create_list

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
        "maxLength": 1000,
        "description": "The title of the task list"
      },
      "description": {
        "type": "string",
        "maxLength": 5000,
        "description": "Optional description of the list"
      },
      "projectTag": {
        "type": "string",
        "maxLength": 250,
        "description": "Optional project tag for organization"
      }
    },
    "required": ["title"]
  }
}
```

### get_list

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

### list_all_lists

```json
{
  "name": "list_all_lists",
  "description": "Get all task lists with basic information",
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectTag": {
        "type": "string",
        "maxLength": 250,
        "description": "Filter by project tag"
      },
      "limit": {
        "type": "number",
        "minimum": 1,
        "maximum": 500,
        "default": 50,
        "description": "Maximum number of lists to return"
      }
    },
    "required": []
  }
}
```

### update_list_metadata

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
        "description": "New project tag for organization"
      }
    },
    "required": ["listId"]
  }
}
```

### delete_list

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
      }
    },
    "required": ["listId"]
  }
}
```

## Task Management Schemas

### add_task

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
        "maxLength": 1000,
        "description": "The title of the task"
      },
      "description": {
        "type": "string",
        "maxLength": 5000,
        "description": "Optional description of the task"
      },
      "priority": {
        "type": "number",
        "minimum": 1,
        "maximum": 5,
        "default": 3,
        "description": "Task priority (1=lowest, 5=highest)"
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
        "maxItems": 50,
        "description": "Array of task IDs that this task depends on"
      },
      "exitCriteria": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 500
        },
        "maxItems": 20,
        "description": "Array of exit criteria descriptions"
      }
    },
    "required": ["listId", "title"]
  }
}
```

### update_task

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

### remove_task

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

### complete_task

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

### set_task_priority

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

### add_task_tags

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
          "maxLength": 50
        },
        "maxItems": 10,
        "minItems": 1,
        "description": "Tags to add"
      }
    },
    "required": ["listId", "taskId", "tags"]
  }
}
```

### remove_task_tags

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

## Search & Display Schemas

### search_tool

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

### show_tasks

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

## Dependency Management Schemas

### set_task_dependencies

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
        "description": "Array of task UUIDs that this task depends on"
      }
    },
    "required": ["listId", "taskId"]
  }
}
```

### get_ready_tasks

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

### analyze_task_dependencies

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

## Exit Criteria Management Schemas

### set_task_exit_criteria

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
        "description": "Array of exit criteria descriptions"
      }
    },
    "required": ["listId", "taskId", "exitCriteria"]
  }
}
```

### update_exit_criteria

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

## Agent Prompt Management Schemas

### get_agent_prompt

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

## Validation Rules

### Common Validation Patterns

- **UUIDs**: Must match format `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`
- **Priorities**: Must be integers between 1 and 5 inclusive
- **Tags**: Maximum 50 characters, support emoji and unicode
- **Titles**: Maximum 1000 characters, minimum 1 character
- **Descriptions**: Maximum 5000 characters
- **Arrays**: Various maximum item limits per tool

### Error Responses

All tools return consistent error formats with actionable guidance when validation fails.

For complete examples and usage patterns, see the [Tools Reference](tools.md) documentation.
