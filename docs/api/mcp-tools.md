# MCP Tools Reference

This document provides a comprehensive reference for all Model Context Protocol (MCP) tools available in the Task MCP Unified system.

## Tool Categories

The system provides 17 focused MCP tools organized into 5 categories:

- **List Management (5 tools)**: Create, retrieve, list, update, and delete task lists
- **Task Management (7 tools)**: Add, update, remove, complete tasks, manage priorities/tags
- **Search & Display (2 tools)**: Search, filter, and display tasks with formatting
- **Dependency Management (3 tools)**: Manage task relationships and workflow optimization
- **Exit Criteria Management (2 tools)**: Define and track detailed completion requirements

## List Management Tools

### create_list

Creates a new task list with basic information.

**Parameters:**

- `title` (required): The title of the task list
- `description` (optional): Description of the list
- `projectTag` (optional): Project tag for organization

**Example:**

```json
{
  "tool": "create_list",
  "parameters": {
    "title": "Weekly Planning",
    "description": "Tasks for this week's planning session",
    "projectTag": "work"
  }
}
```

### get_list

Retrieves a specific task list with its tasks.

**Parameters:**

- `listId` (required): UUID of the list to retrieve
- `includeCompleted` (optional): Whether to include completed tasks (default: true)

### list_all_lists

Gets all task lists with basic information.

**Parameters:**

- `projectTag` (optional): Filter by project tag
- `limit` (optional): Maximum number of lists to return (default: 50)

### update_list_metadata

Updates list metadata without affecting tasks.

**Parameters:**

- `listId` (required): UUID of the list to update
- `title` (optional): New title for the task list
- `description` (optional): New description for the task list
- `projectTag` (optional): New project tag for organization

### delete_list

Deletes a task list permanently.

**Parameters:**

- `listId` (required): UUID of the list to delete

## Task Management Tools

### add_task

Adds a new task to a task list.

**Parameters:**

- `listId` (required): UUID of the list to add the task to
- `title` (required): The title of the task
- `description` (optional): Description of the task
- `priority` (optional): Task priority (1=lowest, 5=highest, default: 3)
- `tags` (optional): Array of tags for the task
- `estimatedDuration` (optional): Estimated duration in minutes
- `dependencies` (optional): Array of task IDs that this task depends on
- `exitCriteria` (optional): Array of exit criteria descriptions

### update_task

Updates task properties like title, description, and estimated duration.

**Parameters:**

- `listId` (required): UUID of the list containing the task
- `taskId` (required): UUID of the task to update
- `title` (optional): New title for the task
- `description` (optional): New description for the task
- `estimatedDuration` (optional): New estimated duration in minutes

### remove_task

Removes a task from a task list permanently.

**Parameters:**

- `listId` (required): UUID of the list containing the task
- `taskId` (required): UUID of the task to remove

### complete_task

Marks a task as completed after verifying all exit criteria are met.

**Parameters:**

- `listId` (required): UUID of the list containing the task
- `taskId` (required): UUID of the task to complete

### set_task_priority

Changes the priority of a task.

**Parameters:**

- `listId` (required): UUID of the list containing the task
- `taskId` (required): UUID of the task
- `priority` (required): New priority level (1=minimal, 2=low, 3=medium, 4=high, 5=critical)

### add_task_tags

Adds tags to a task.

**Parameters:**

- `listId` (required): UUID of the list containing the task
- `taskId` (required): UUID of the task
- `tags` (required): Array of tags to add

### remove_task_tags

Removes tags from a task.

**Parameters:**

- `listId` (required): UUID of the list containing the task
- `taskId` (required): UUID of the task
- `tags` (required): Array of tags to remove

## Search & Display Tools

### search_tool

Unified search and filtering tool that replaces legacy search/filter tools.

**Parameters:**

- `query` (optional): Text to search for in task titles, descriptions, and tags
- `listId` (optional): Limit search to specific list
- `status` (optional): Filter by task statuses
- `priority` (optional): Filter by priority levels
- `tags` (optional): Filter by tags
- `tagOperator` (optional): How to combine tag filters (AND/OR, default: AND)
- `includeCompleted` (optional): Whether to include completed tasks (default: true)
- `limit` (optional): Maximum number of results (default: 50)

### show_tasks

Displays tasks in formatted output with grouping and emojis.

**Parameters:**

- `listId` (required): UUID of the task list to display
- `format` (optional): Display format style (default: "detailed")
- `groupBy` (optional): How to group the tasks (status/priority/none, default: "status")
- `includeCompleted` (optional): Whether to include completed tasks (default: true)

## Dependency Management Tools

### set_task_dependencies

Sets all dependencies for a task, replacing existing dependencies.

**Parameters:**

- `listId` (required): UUID of the list containing the task
- `taskId` (required): UUID of the task to set dependencies for
- `dependencyIds` (optional): Array of task UUIDs that this task depends on (empty array removes all)

### get_ready_tasks

Gets tasks that are ready to work on (no incomplete dependencies).

**Parameters:**

- `listId` (required): UUID of the list to get ready tasks from
- `limit` (optional): Maximum number of ready tasks to return (default: 20)

### analyze_task_dependencies

Analyzes task dependencies and provides comprehensive insights.

**Parameters:**

- `listId` (required): UUID of the list to analyze
- `format` (optional): Output format (analysis/dag/both, default: "analysis")
- `dagStyle` (optional): DAG visualization style (ascii/dot/mermaid, default: "ascii")

## Exit Criteria Management Tools

### set_task_exit_criteria

Sets exit criteria for a task, replacing existing criteria.

**Parameters:**

- `listId` (required): UUID of the list containing the task
- `taskId` (required): UUID of the task to set exit criteria for
- `exitCriteria` (required): Array of exit criteria descriptions (empty array removes all)

### update_exit_criteria

Updates the status of a specific exit criteria.

**Parameters:**

- `listId` (required): UUID of the list containing the task
- `taskId` (required): UUID of the task containing the exit criteria
- `criteriaId` (required): UUID of the exit criteria to update
- `isMet` (optional): Whether the exit criteria has been met
- `notes` (optional): Optional notes about the criteria status

## Agent Prompt Management

### get_agent_prompt

Gets the rendered agent prompt for a task with variable substitution.

**Parameters:**

- `listId` (required): UUID of the task list
- `taskId` (required): UUID of the task to get prompt for
- `useDefault` (optional): Whether to use a default template if no custom template is set (default: false)

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
  "estimatedDuration": 60,
  "dependencies": ["dependency-uuid"],
  "exitCriteria": [
    {
      "id": "criteria-uuid",
      "description": "Criteria description",
      "isMet": false,
      "notes": "Optional notes"
    }
  ]
}
```

## Error Handling

All tools provide comprehensive error handling with:

- Clear validation messages with specific field feedback
- Actionable suggestions for fixing common issues
- Working examples included in error responses
- Tool-specific guidance based on the operation being performed

## Performance Considerations

- **Basic CRUD operations**: < 10ms response time
- **Complex queries with filtering**: < 50ms response time
- **Search operations**: < 100ms response time
- **Dependency analysis**: < 100ms response time

## Best Practices

1. Use `search_tool` for all search and filtering needs
2. Set exit criteria for important tasks to track completion
3. Use dependencies to manage task relationships
4. Use `get_ready_tasks` for daily workflow planning
5. Group related tasks using project tags
6. Use appropriate limits for search operations

For detailed schemas and examples, see the [Tools Reference](tools.md) documentation.
