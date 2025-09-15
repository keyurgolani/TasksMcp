# Enhanced MCP Tools API Documentation

This document describes the enhanced MCP tools that support advanced task management features including action plans, implementation notes, project organization, and pretty print formatting.

## Table of Contents

- [Enhanced create_todo_list](#enhanced-create_todo_list)
- [Enhanced update_todo_list](#enhanced-update_todo_list)
- [Enhanced get_todo_list](#enhanced-get_todo_list)
- [Enhanced list_todo_lists](#enhanced-list_todo_lists)
- [New show_tasks Tool](#new-show_tasks-tool)
- [Data Types](#data-types)
- [Examples](#examples)
- [Migration Guide](#migration-guide)

## Enhanced create_todo_list

Creates a new todo list with support for action plans, implementation notes, and project organization.

### Schema

```json
{
  "name": "create_todo_list",
  "description": "Create a new todo list with enhanced features including action plans and implementation notes",
  "inputSchema": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "Title of the todo list",
        "minLength": 1,
        "maxLength": 200
      },
      "description": {
        "type": "string",
        "description": "Optional description of the todo list",
        "maxLength": 2000
      },
      "projectTag": {
        "type": "string",
        "description": "Project tag for organization (replaces context)",
        "pattern": "^[a-z0-9-]+$",
        "maxLength": 50
      },
      "context": {
        "type": "string",
        "description": "Legacy context field (use projectTag instead)",
        "maxLength": 50
      },
      "implementationNotes": {
        "type": "array",
        "description": "List-level implementation notes",
        "items": {
          "$ref": "#/definitions/ImplementationNoteInput"
        },
        "maxItems": 20
      },
      "tasks": {
        "type": "array",
        "description": "Initial tasks for the todo list",
        "items": {
          "$ref": "#/definitions/TaskInput"
        },
        "maxItems": 100
      }
    },
    "required": ["title"],
    "definitions": {
      "ImplementationNoteInput": {
        "type": "object",
        "properties": {
          "content": {
            "type": "string",
            "description": "Note content",
            "minLength": 1,
            "maxLength": 10000
          },
          "type": {
            "type": "string",
            "enum": ["general", "technical", "decision", "learning"],
            "description": "Type of implementation note"
          },
          "author": {
            "type": "string",
            "description": "Optional author of the note",
            "maxLength": 100
          }
        },
        "required": ["content", "type"]
      },
      "TaskInput": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string",
            "description": "Task title",
            "minLength": 1,
            "maxLength": 200
          },
          "description": {
            "type": "string",
            "description": "Task description",
            "maxLength": 2000
          },
          "priority": {
            "type": "number",
            "description": "Task priority (1-5, where 5 is highest)",
            "minimum": 1,
            "maximum": 5
          },
          "estimatedDuration": {
            "type": "number",
            "description": "Estimated duration in minutes",
            "minimum": 1
          },
          "tags": {
            "type": "array",
            "description": "Task tags",
            "items": {
              "type": "string",
              "maxLength": 50
            },
            "maxItems": 20
          },
          "dependencies": {
            "type": "array",
            "description": "Task dependencies (task IDs)",
            "items": {
              "type": "string",
              "format": "uuid"
            },
            "maxItems": 50
          },
          "actionPlan": {
            "type": "string",
            "description": "Detailed action plan for the task",
            "maxLength": 10000
          },
          "implementationNotes": {
            "type": "array",
            "description": "Task-level implementation notes",
            "items": {
              "$ref": "#/definitions/ImplementationNoteInput"
            },
            "maxItems": 20
          }
        },
        "required": ["title"]
      }
    }
  }
}
```

### Response

```json
{
  "todoList": {
    "id": "uuid",
    "title": "string",
    "description": "string",
    "projectTag": "string",
    "context": "string",
    "implementationNotes": [
      {
        "id": "uuid",
        "content": "string",
        "type": "general|technical|decision|learning",
        "author": "string",
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601"
      }
    ],
    "items": [
      {
        "id": "uuid",
        "title": "string",
        "description": "string",
        "status": "pending|in_progress|completed|blocked|cancelled",
        "priority": 1-5,
        "actionPlan": {
          "id": "uuid",
          "content": "string",
          "steps": [
            {
              "id": "uuid",
              "content": "string",
              "status": "pending|in_progress|completed",
              "order": "number",
              "completedAt": "ISO8601",
              "notes": "string"
            }
          ],
          "createdAt": "ISO8601",
          "updatedAt": "ISO8601",
          "version": "number"
        },
        "implementationNotes": [...],
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601",
        "completedAt": "ISO8601",
        "estimatedDuration": "number",
        "tags": ["string"],
        "dependencies": ["uuid"]
      }
    ],
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "completedAt": "ISO8601",
    "isArchived": false,
    "totalItems": "number",
    "completedItems": "number",
    "progress": "number"
  },
  "cleanupSuggestions": [
    {
      "list": {...},
      "reason": "string",
      "completedDaysAgo": "number",
      "estimatedSpaceSaved": "number",
      "riskLevel": "low|medium|high"
    }
  ]
}
```

## Enhanced update_todo_list

Updates a todo list with support for action plan progress tracking and notes management.

### New Action Types

#### update_action_plan_progress

Updates the progress of individual steps in an action plan.

```json
{
  "listId": "uuid",
  "action": "update_action_plan_progress",
  "itemId": "uuid",
  "stepId": "uuid",
  "stepStatus": "pending|in_progress|completed",
  "stepNotes": "string (optional)"
}
```

#### add_task_note

Adds an implementation note to a specific task.

```json
{
  "listId": "uuid",
  "action": "add_task_note",
  "itemId": "uuid",
  "noteContent": "string",
  "noteType": "general|technical|decision|learning",
  "noteAuthor": "string (optional)"
}
```

#### add_list_note

Adds an implementation note to the todo list.

```json
{
  "listId": "uuid",
  "action": "add_list_note",
  "noteContent": "string",
  "noteType": "general|technical|decision|learning",
  "noteAuthor": "string (optional)"
}
```

#### update_action_plan

Updates the entire action plan for a task.

```json
{
  "listId": "uuid",
  "action": "update_action_plan",
  "itemId": "uuid",
  "actionPlanContent": "string"
}
```

## Enhanced get_todo_list

Retrieves a todo list with all enhanced features included.

### Schema

```json
{
  "name": "get_todo_list",
  "description": "Retrieve a specific todo list with enhanced features",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of the todo list to retrieve"
      },
      "includeCompleted": {
        "type": "boolean",
        "default": true,
        "description": "Whether to include completed items"
      },
      "includeArchived": {
        "type": "boolean",
        "default": false,
        "description": "Whether to include archived items"
      },
      "filters": {
        "$ref": "#/definitions/TaskFilters"
      },
      "sorting": {
        "$ref": "#/definitions/SortingOptions"
      },
      "pagination": {
        "$ref": "#/definitions/PaginationOptions"
      }
    },
    "required": ["listId"]
  }
}
```

## Enhanced list_todo_lists

Lists todo lists with enhanced filtering and project-based organization.

### New Filter Options

- `projectTag`: Filter by project tag
- `hasActionPlans`: Filter lists containing tasks with action plans
- `hasNotes`: Filter lists with implementation notes
- `completedAfter`: Filter by completion date
- `completedBefore`: Filter by completion date

### Schema

```json
{
  "name": "list_todo_lists",
  "description": "List todo lists with enhanced filtering and project organization",
  "inputSchema": {
    "type": "object",
    "properties": {
      "filters": {
        "type": "object",
        "properties": {
          "status": {
            "type": "string",
            "enum": ["active", "completed", "all"],
            "default": "all"
          },
          "context": {
            "type": "string",
            "description": "Legacy context filter (use projectTag instead)"
          },
          "projectTag": {
            "type": "string",
            "description": "Filter by project tag"
          },
          "hasActionPlans": {
            "type": "boolean",
            "description": "Filter lists containing tasks with action plans"
          },
          "hasNotes": {
            "type": "boolean",
            "description": "Filter lists with implementation notes"
          },
          "completedAfter": {
            "type": "string",
            "format": "date-time",
            "description": "Filter lists completed after this date"
          },
          "completedBefore": {
            "type": "string",
            "format": "date-time",
            "description": "Filter lists completed before this date"
          }
        }
      },
      "includeArchived": {
        "type": "boolean",
        "default": false
      },
      "sorting": {
        "$ref": "#/definitions/SortingOptions"
      },
      "pagination": {
        "$ref": "#/definitions/PaginationOptions"
      }
    }
  }
}
```

## New show_tasks Tool

Provides human-readable, formatted display of tasks with customizable formatting options.

### Schema

```json
{
  "name": "show_tasks",
  "description": "Display tasks in a human-readable format with customizable formatting",
  "inputSchema": {
    "type": "object",
    "properties": {
      "listId": {
        "type": "string",
        "format": "uuid",
        "description": "UUID of specific list to display (optional)"
      },
      "projectTag": {
        "type": "string",
        "description": "Filter by project tag"
      },
      "includeCompleted": {
        "type": "boolean",
        "default": true,
        "description": "Whether to include completed tasks"
      },
      "limit": {
        "type": "number",
        "minimum": 1,
        "maximum": 1000,
        "description": "Maximum number of lists to process"
      },
      "filters": {
        "$ref": "#/definitions/TaskFilters"
      },
      "formatOptions": {
        "type": "object",
        "properties": {
          "compactMode": {
            "type": "boolean",
            "default": false,
            "description": "Use compact formatting"
          },
          "includeActionPlans": {
            "type": "boolean",
            "default": true,
            "description": "Include action plan details"
          },
          "includeNotes": {
            "type": "boolean",
            "default": true,
            "description": "Include implementation notes"
          },
          "includeProgress": {
            "type": "boolean",
            "default": true,
            "description": "Include progress bars and indicators"
          },
          "colorize": {
            "type": "boolean",
            "default": false,
            "description": "Use ANSI color codes"
          },
          "maxWidth": {
            "type": "number",
            "minimum": 40,
            "maximum": 200,
            "default": 120,
            "description": "Maximum line width"
          },
          "groupBy": {
            "type": "string",
            "enum": ["status", "priority", "project"],
            "description": "Group tasks by specified field"
          },
          "showIds": {
            "type": "boolean",
            "default": false,
            "description": "Show task and list IDs"
          },
          "truncateNotes": {
            "type": "number",
            "minimum": 50,
            "maximum": 1000,
            "description": "Truncate notes longer than this length"
          }
        }
      }
    }
  }
}
```

### Response

Returns formatted text output with task information, progress indicators, and enhanced details.

```
Enhanced Feature Development [feature-dev]
Tasks: 1/2 completed (50%) [████████████░░░░░░░░░░░░] 

List Notes:
  [GENERAL] This project uses the new enhanced task management features
  [TECHNICAL] Technical architecture decisions documented separately

In Progress (1):
  ◐ Design API endpoints ⬆ 
    Duration: 4h, Dependencies: 0, Tags: #api #design
    
    Action Plan: Progress 3/6 steps completed (50%)
    1. ● Research existing patterns ✓
    2. ● Design endpoint structure ✓  
    3. ● Document API specification ✓
    4. ◐ Review with team (in progress)
    5. ○ Implement rate limiting
    6. ○ Add authentication layer
    
    Notes:
      [TECHNICAL] Consider rate limiting and authentication
      [DECISION] Decided on GraphQL instead of REST for better flexibility

Completed (1):
  ● Setup development environment ⬆ 
    Completed: 2024-01-15 14:30
    Duration: 6h, Tags: #devops #setup
```

## Data Types

### ImplementationNote

```typescript
interface ImplementationNote {
  id: string;
  content: string;
  type: 'general' | 'technical' | 'decision' | 'learning';
  author?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### ActionPlan

```typescript
interface ActionPlan {
  id: string;
  content: string;
  steps: ActionStep[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
}
```

### ActionStep

```typescript
interface ActionStep {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  order: number;
  completedAt?: Date;
  notes?: string;
}
```

### CleanupSuggestion

```typescript
interface CleanupSuggestion {
  list: TodoList;
  reason: string;
  completedDaysAgo: number;
  estimatedSpaceSaved: number;
  riskLevel: 'low' | 'medium' | 'high';
}
```

## Examples

### Creating a Task with Action Plan

```json
{
  "name": "create_todo_list",
  "arguments": {
    "title": "API Development Sprint",
    "projectTag": "backend-api",
    "implementationNotes": [
      {
        "content": "Sprint goal: Complete user authentication endpoints",
        "type": "general"
      }
    ],
    "tasks": [
      {
        "title": "Implement JWT Authentication",
        "description": "Add JWT-based authentication to the API",
        "priority": 4,
        "actionPlan": "1. [ ] Research JWT libraries\n2. [ ] Design token structure\n3. [ ] Implement token generation\n4. [ ] Add token validation\n5. [ ] Write tests",
        "implementationNotes": [
          {
            "content": "Use RS256 algorithm for better security",
            "type": "technical"
          }
        ],
        "tags": ["auth", "jwt", "security"],
        "estimatedDuration": 480
      }
    ]
  }
}
```

### Updating Action Plan Progress

```json
{
  "name": "update_todo_list",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "action": "update_action_plan_progress",
    "itemId": "987fcdeb-51a2-43d1-b789-123456789abc",
    "stepId": "step-uuid-1",
    "stepStatus": "completed",
    "stepNotes": "Selected jsonwebtoken library for Node.js implementation"
  }
}
```

### Adding Implementation Notes

```json
{
  "name": "update_todo_list",
  "arguments": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "action": "add_task_note",
    "itemId": "987fcdeb-51a2-43d1-b789-123456789abc",
    "noteContent": "Decision: Using 15-minute token expiry with refresh token mechanism",
    "noteType": "decision"
  }
}
```

### Displaying Formatted Tasks

```json
{
  "name": "show_tasks",
  "arguments": {
    "projectTag": "backend-api",
    "formatOptions": {
      "includeActionPlans": true,
      "includeNotes": true,
      "includeProgress": true,
      "groupBy": "status",
      "colorize": true
    }
  }
}
```

### Filtering by Enhanced Features

```json
{
  "name": "list_todo_lists",
  "arguments": {
    "filters": {
      "projectTag": "backend-api",
      "hasActionPlans": true,
      "status": "active"
    },
    "sorting": {
      "field": "updatedAt",
      "direction": "desc"
    }
  }
}
```

## Migration Guide

### From v1 to v2

#### Field Changes

- `context` → `projectTag`: The `context` field is deprecated in favor of `projectTag` for better semantics
- Both fields are supported for backward compatibility
- When both are provided, `projectTag` takes precedence

#### New Optional Fields

All new fields are optional and backward compatible:

- `implementationNotes`: Array of implementation notes
- `actionPlan`: Detailed action plan with steps
- Enhanced filtering and formatting options

#### Automatic Migration

The system automatically migrates existing data:

1. `context` values are copied to `projectTag` if missing
2. Empty arrays are initialized for `implementationNotes`
3. Default values are set for missing optional fields

#### Breaking Changes

None. All existing API calls continue to work without modification.

#### Recommended Updates

1. Update client code to use `projectTag` instead of `context`
2. Take advantage of new formatting options in `show_tasks`
3. Use implementation notes for better documentation
4. Leverage action plans for complex tasks

### Example Migration

**Before (v1):**
```json
{
  "title": "My Project",
  "context": "web-app",
  "tasks": [
    {
      "title": "Build feature",
      "priority": 3
    }
  ]
}
```

**After (v2):**
```json
{
  "title": "My Project",
  "projectTag": "web-app",
  "implementationNotes": [
    {
      "content": "Project migrated from v1 format",
      "type": "general"
    }
  ],
  "tasks": [
    {
      "title": "Build feature",
      "priority": 3,
      "actionPlan": "1. [ ] Design feature\n2. [ ] Implement feature\n3. [ ] Test feature",
      "implementationNotes": [
        {
          "content": "Consider mobile responsiveness",
          "type": "technical"
        }
      ]
    }
  ]
}
```