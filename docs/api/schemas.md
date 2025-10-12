# Tool Schemas Reference

This document provides quick reference schemas for all MCP Task Manager tools.

## Common Types

### UUID Format

```
Pattern: ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$
Example: "123e4567-e89b-12d3-a456-426614174000"
```

### Priority Scale

```
Range: 1-5
1 = Lowest priority (minimal)
2 = Low priority
3 = Medium priority (default)
4 = High priority
5 = Highest priority (critical)
```

### Status Values

```
Enum: ["pending", "in_progress", "completed", "blocked", "cancelled"]
```

### Tag Format

```
Pattern: ^[a-z0-9-_]+$
Max Length: 50 characters
Examples: ["urgent", "frontend", "bug-fix"]
```

## List Management Tools

### create_list

```json
{
  "name": "create_list",
  "inputSchema": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 200
      },
      "description": {
        "type": "string",
        "maxLength": 1000
      },
      "projectTag": {
        "type": "string",
        "maxLength": 50
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
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "includeCompleted": {
        "type": "boolean",
        "default": true
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
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectTag": {
        "type": "string",
        "maxLength": 50
      },
      "includeArchived": {
        "type": "boolean",
        "default": false
      },
      "limit": {
        "type": "number",
        "minimum": 1,
        "maximum": 100,
        "default": 50
      }
    },
    "required": []
  }
}
```

### delete_list

```json
{
  "name": "delete_list",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "permanent": {
        "type": "boolean",
        "default": false
      }
    },
    "required": ["listId"]
  }
}
```

## Task Management Tools

### add_task

```json
{
  "name": "add_task",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 200
      },
      "description": {
        "type": "string",
        "maxLength": 1000
      },
      "priority": {
        "type": "number",
        "minimum": 1,
        "maximum": 5,
        "default": 3
      },
      "exitCriteria": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 500
        },
        "maxItems": 20
      },
      "tags": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 50
        },
        "maxItems": 10
      },
      "estimatedDuration": {
        "type": "number",
        "minimum": 1
      },
      "dependencies": {
        "type": "array",
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "maxItems": 10
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
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "taskId": {
        "type": "string",
        "format": "uuid"
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 200
      },
      "description": {
        "type": "string",
        "maxLength": 1000
      },
      "estimatedDuration": {
        "type": "number",
        "minimum": 1
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
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "taskId": {
        "type": "string",
        "format": "uuid"
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
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "taskId": {
        "type": "string",
        "format": "uuid"
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
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "taskId": {
        "type": "string",
        "format": "uuid"
      },
      "priority": {
        "type": "number",
        "minimum": 1,
        "maximum": 5
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
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "taskId": {
        "type": "string",
        "format": "uuid"
      },
      "tags": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 50
        },
        "minItems": 1,
        "maxItems": 10
      }
    },
    "required": ["listId", "taskId", "tags"]
  }
}
```

## Search & Display Tools

### search_tool (Recommended)

```json
{
  "name": "search_tool",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "minLength": 1,
        "maxLength": 200
      },
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "status": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": [
            "pending",
            "in_progress",
            "completed",
            "blocked",
            "cancelled"
          ]
        }
      },
      "priority": {
        "type": "array",
        "items": {
          "type": "number",
          "minimum": 1,
          "maximum": 5
        }
      },
      "tags": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 50
        }
      },
      "tagOperator": {
        "type": "string",
        "enum": ["AND", "OR"],
        "default": "AND"
      },
      "isReady": {
        "type": "boolean"
      },
      "isBlocked": {
        "type": "boolean"
      },
      "hasDependencies": {
        "type": "boolean"
      },
      "sortBy": {
        "type": "string",
        "enum": ["relevance", "priority", "createdAt", "updatedAt", "title"],
        "default": "relevance"
      },
      "sortOrder": {
        "type": "string",
        "enum": ["asc", "desc"],
        "default": "desc"
      },
      "limit": {
        "type": "number",
        "minimum": 1,
        "maximum": 100,
        "default": 20
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
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "format": {
        "type": "string",
        "enum": ["compact", "detailed", "summary"],
        "default": "detailed"
      },
      "groupBy": {
        "type": "string",
        "enum": ["status", "priority", "none"],
        "default": "status"
      },
      "includeCompleted": {
        "type": "boolean",
        "default": true
      }
    },
    "required": ["listId"]
  }
}
```

## Advanced Features Tools

### analyze_task

```json
{
  "name": "analyze_task",
  "inputSchema": {
    "type": "object",
    "properties": {
      "taskDescription": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1000
      },
      "context": {
        "type": "string",
        "maxLength": 500
      },
      "maxSuggestions": {
        "type": "number",
        "minimum": 1,
        "maximum": 10,
        "default": 5
      }
    },
    "required": ["taskDescription"]
  }
}
```

### get_task_suggestions

```json
{
  "name": "get_task_suggestions",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "style": {
        "type": "string",
        "enum": ["creative", "practical", "detailed"],
        "default": "practical"
      },
      "maxSuggestions": {
        "type": "number",
        "minimum": 1,
        "maximum": 10,
        "default": 5
      }
    },
    "required": ["listId"]
  }
}
```

## Exit Criteria Management Tools

### set_task_exit_criteria

```json
{
  "name": "set_task_exit_criteria",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "taskId": {
        "type": "string",
        "format": "uuid"
      },
      "exitCriteria": {
        "type": "array",
        "items": {
          "type": "string",
          "maxLength": 500
        },
        "maxItems": 20
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
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "taskId": {
        "type": "string",
        "format": "uuid"
      },
      "criteriaId": {
        "type": "string",
        "format": "uuid"
      },
      "isMet": {
        "type": "boolean"
      },
      "notes": {
        "type": "string",
        "maxLength": 1000
      }
    },
    "required": ["listId", "taskId", "criteriaId"]
  }
}
```

## Dependency Management Tools

### set_task_dependencies

```json
{
  "name": "set_task_dependencies",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "taskId": {
        "type": "string",
        "format": "uuid"
      },
      "dependencyIds": {
        "type": "array",
        "items": {
          "type": "string",
          "format": "uuid"
        },
        "maxItems": 10
      }
    },
    "required": ["listId", "taskId", "dependencyIds"]
  }
}
```

### get_ready_tasks

```json
{
  "name": "get_ready_tasks",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "limit": {
        "type": "number",
        "minimum": 1,
        "maximum": 50,
        "default": 20
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
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "format": {
        "type": "string",
        "enum": ["analysis", "dag", "both"],
        "default": "analysis"
      },
      "dagStyle": {
        "type": "string",
        "enum": ["ascii", "dot", "mermaid"],
        "default": "ascii"
      }
    },
    "required": ["listId"]
  }
}
```

## Bulk Operations Tool

### bulk_task_operations

```json
{
  "name": "bulk_task_operations",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid"
      },
      "operations": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "type": {
              "type": "string",
              "enum": ["create", "update", "delete", "complete", "set_priority"]
            },
            "taskId": {
              "type": "string",
              "format": "uuid"
            },
            "data": {
              "type": "object"
            },
            "priority": {
              "type": "number",
              "minimum": 1,
              "maximum": 5
            }
          },
          "required": ["type"]
        },
        "minItems": 1,
        "maxItems": 50
      }
    },
    "required": ["listId", "operations"]
  }
}
```

## Response Formats

### Standard List Response

```json
{
  "id": "string (uuid)",
  "title": "string",
  "description": "string",
  "taskCount": "number",
  "completedCount": "number",
  "progress": "number (0-100)",
  "lastUpdated": "string (ISO date)",
  "projectTag": "string",
  "createdAt": "string (ISO date)"
}
```

### Standard Task Response

```json
{
  "id": "string (uuid)",
  "title": "string",
  "description": "string",
  "status": "string (enum)",
  "priority": "number (1-5)",
  "tags": ["string"],
  "createdAt": "string (ISO date)",
  "updatedAt": "string (ISO date)",
  "completedAt": "string (ISO date)",
  "estimatedDuration": "number (minutes)",
  "dependencies": ["string (uuid)"],
  "isReady": "boolean",
  "blockedBy": ["string (uuid)"],
  "exitCriteria": [
    {
      "id": "string (uuid)",
      "description": "string",
      "isMet": "boolean",
      "order": "number",
      "metAt": "string (ISO date)",
      "notes": "string"
    }
  ],
  "exitCriteriaProgress": "number (0-100)",
  "canComplete": "boolean"
}
```

### Search Response

```json
{
  "results": ["TaskResponse"],
  "totalCount": "number",
  "hasMore": "boolean",
  "query": "string",
  "filters": "object"
}
```

### Error Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "string (error message)"
    }
  ],
  "isError": true
}
```

---

This schema reference provides the complete parameter specifications for all MCP Task Manager tools. For detailed usage examples, see the [Tools Documentation](tools.md).
