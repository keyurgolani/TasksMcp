# Simplified MCP Tool Schemas - Quick Reference

## Overview

This document provides a quick reference for all 15 simplified MCP tool schemas. Each tool is designed with minimal required parameters and consistent response formats.

## Schema Conventions

- **Required parameters**: Marked with `*`
- **UUID format**: All IDs use standard UUID format (e.g., `123e4567-e89b-12d3-a456-426614174000`)
- **Priority range**: 1 (lowest) to 5 (highest)
- **Status values**: `pending`, `in_progress`, `completed`, `blocked`, `cancelled`
- **Tag limits**: Maximum 50 characters per tag, 10 tags per task
- **Text limits**: Titles max 200 chars, descriptions max 1000 chars

---

## List Management Tools

### create_list
```json
{
  "title": "string*",           // 1-200 chars
  "description": "string",      // max 1000 chars
  "projectTag": "string"        // max 50 chars
}
```
**Returns:** `SimpleListResponse`

### get_list
```json
{
  "listId": "uuid*",
  "includeCompleted": "boolean" // default: true
}
```
**Returns:** `SimpleListResponse` + `tasks` array

### list_all_lists
```json
{
  "projectTag": "string",       // max 50 chars
  "includeArchived": "boolean", // default: false
  "limit": "number"             // 1-100, default: 50
}
```
**Returns:** Array of `SimpleListResponse`

### delete_list
```json
{
  "listId": "uuid*",
  "permanent": "boolean"        // default: false (archive)
}
```
**Returns:** Success confirmation

---

## Task Management Tools

### add_task
```json
{
  "listId": "uuid*",
  "title": "string*",           // 1-200 chars
  "description": "string",      // max 1000 chars
  "priority": "number",         // 1-5, default: 3
  "tags": ["string"],           // max 10 items, 50 chars each
  "estimatedDuration": "number" // minutes, min: 1
}
```
**Returns:** `SimpleTaskResponse`

### update_task
```json
{
  "listId": "uuid*",
  "taskId": "uuid*",
  "title": "string",            // 1-200 chars
  "description": "string",      // max 1000 chars
  "estimatedDuration": "number" // minutes, min: 1
}
```
**Returns:** `SimpleTaskResponse`

### remove_task
```json
{
  "listId": "uuid*",
  "taskId": "uuid*"
}
```
**Returns:** Success confirmation

### complete_task
```json
{
  "listId": "uuid*",
  "taskId": "uuid*"
}
```
**Returns:** `SimpleTaskResponse`

### set_task_priority
```json
{
  "listId": "uuid*",
  "taskId": "uuid*",
  "priority": "number*"         // 1-5
}
```
**Returns:** `SimpleTaskResponse`

### add_task_tags
```json
{
  "listId": "uuid*",
  "taskId": "uuid*",
  "tags": ["string*"]           // 1-10 items, 50 chars each
}
```
**Returns:** `SimpleTaskResponse`

---

## Search & Display Tools

### search_tasks
```json
{
  "query": "string*",           // 1-200 chars
  "listId": "uuid",             // optional: limit to specific list
  "limit": "number"             // 1-100, default: 20
}
```
**Returns:** `SimpleSearchResponse`

### filter_tasks
```json
{
  "listId": "uuid*",
  "status": "enum",             // pending|in_progress|completed|blocked|cancelled
  "priority": "number",         // 1-5
  "tag": "string"               // max 50 chars
}
```
**Returns:** `SimpleSearchResponse`

### show_tasks
```json
{
  "listId": "uuid*",
  "format": "enum",             // compact|detailed|summary, default: detailed
  "groupBy": "enum",            // status|priority|none, default: status
  "includeCompleted": "boolean" // default: true
}
```
**Returns:** Formatted text string

---

## Advanced Features Tools

### analyze_task
```json
{
  "taskDescription": "string*", // 1-1000 chars
  "context": "string",          // max 500 chars
  "maxSuggestions": "number"    // 1-10, default: 5
}
```
**Returns:** Analysis object with complexity score and suggestions

### get_task_suggestions
```json
{
  "listId": "uuid*",
  "style": "enum",              // creative|practical|detailed, default: practical
  "maxSuggestions": "number"    // 1-10, default: 5
}
```
**Returns:** Array of task suggestions

---

## Response Formats

### SimpleListResponse
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string|null",
  "taskCount": "number",
  "completedCount": "number",
  "progress": "number",         // 0-100 percentage
  "lastUpdated": "ISO8601",
  "projectTag": "string|null"
}
```

### SimpleTaskResponse
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string|null",
  "status": "enum",             // pending|in_progress|completed|blocked|cancelled
  "priority": "number",         // 1-5
  "tags": ["string"],
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "estimatedDuration": "number|null" // minutes
}
```

### SimpleSearchResponse
```json
{
  "results": [/* SimpleTaskResponse */],
  "totalCount": "number",
  "hasMore": "boolean"
}
```

### Error Response
```json
{
  "error": "string",            // Error type
  "message": "string",          // Human-readable message
  "code": "string"              // Machine-readable code
}
```

---

## Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_UUID` | UUID format is invalid |
| `LIST_NOT_FOUND` | Specified list doesn't exist |
| `TASK_NOT_FOUND` | Specified task doesn't exist |
| `MISSING_REQUIRED_FIELD` | Required parameter is missing |
| `INVALID_PRIORITY` | Priority not in range 1-5 |
| `INVALID_STATUS` | Status not in allowed enum values |
| `TEXT_TOO_LONG` | Text exceeds maximum length |
| `TOO_MANY_TAGS` | More than 10 tags specified |
| `VALIDATION_ERROR` | General validation failure |

---

## Tool Categories Summary

| Category | Tools | Purpose |
|----------|-------|---------|
| **List Management** | 4 tools | CRUD operations on todo lists |
| **Task Management** | 6 tools | CRUD operations on individual tasks |
| **Search & Display** | 3 tools | Finding and formatting tasks |
| **Advanced Features** | 2 tools | AI-powered analysis and suggestions |

---

## Migration Quick Reference

| Old Complex Tool | New Simplified Tools |
|------------------|---------------------|
| `create_todo_list` | `create_list` |
| `get_todo_list` | `get_list` + `show_tasks` |
| `update_todo_list` | `update_task` + `complete_task` + `set_task_priority` + `add_task_tags` |
| `list_todo_lists` | `list_all_lists` |
| `delete_todo_list` | `delete_list` |
| `analyze_task_complexity` | `analyze_task` |
| `search_todo_lists` | `search_tasks` + `filter_tasks` |
| `show_tasks` (complex) | `show_tasks` (simplified) |

This quick reference provides all the essential information needed to use the simplified MCP tools effectively.