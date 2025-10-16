# MCP Tools Quick Reference

This is a quick reference for the MCP tools available in the Task MCP Unified system. For detailed documentation, see [API Tools Reference](api/tools.md).

## Available 17 Tools

### List Management (5 tools)

- `create_list` - Create a new task list
- `get_list` - Retrieve a specific task list with its tasks
- `list_all_lists` - Get all task lists with basic information
- `update_list_metadata` - Update list metadata without affecting tasks
- `delete_list` - Delete a task list permanently

### Task Management (7 tools)

- `add_task` - Add a new task to a task list
- `update_task` - Update task properties
- `remove_task` - Remove a task from a task list permanently
- `complete_task` - Mark a task as completed
- `set_task_priority` - Change the priority of a task
- `add_task_tags` - Add tags to a task
- `remove_task_tags` - Remove tags from a task

### Search & Display (2 tools)

- `search_tool` - Unified search and filtering tool
- `show_tasks` - Display tasks in formatted output

### Dependency Management (3 tools)

- `set_task_dependencies` - Set all dependencies for a task
- `get_ready_tasks` - Get tasks ready to work on
- `analyze_task_dependencies` - Analyze task dependencies with circular dependency detection

### Exit Criteria Management (2 tools)

- `set_task_exit_criteria` - Set exit criteria for a task
- `update_exit_criteria` - Update the status of specific exit criteria

### Agent Prompt Management (1 tool)

- `get_agent_prompt` - Get rendered agent prompt template for a task with variable substitution for multi-agent environmentsubstitution

## Quick Examples

### Create a task list

```json
{
  "tool": "create_list",
  "parameters": {
    "title": "My Project Tasks",
    "projectTag": "web-development"
  }
}
```

### Add a task

```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "your-list-id",
    "title": "Complete project setup",
    "priority": 4,
    "tags": ["setup", "urgent"]
  }
}
```

### Search for tasks

```json
{
  "tool": "search_tool",
  "parameters": {
    "query": "urgent",
    "priority": [4, 5],
    "limit": 10
  }
}
```

For complete documentation with schemas and examples, see the [API Tools Reference](api/tools.md).
