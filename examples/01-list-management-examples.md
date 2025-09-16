# List Management Examples

This document demonstrates the list management capabilities of the MCP Task Manager through real-world examples.

## Creating Lists

### Basic List Creation
```json
{
  "tool": "create_list",
  "parameters": {
    "title": "Development Project Alpha"
  }
}
```

**Response:**
```json
{
  "id": "11b0dfb3-9580-42ea-afba-208b5e44877d",
  "title": "Development Project Alpha",
  "taskCount": 0,
  "completedCount": 0,
  "progress": 0,
  "lastUpdated": "2025-09-16T21:16:13.376Z",
  "projectTag": "default"
}
```

### List with Description and Project Tag
```json
{
  "tool": "create_list",
  "parameters": {
    "title": "Mobile App Development",
    "description": "Cross-platform mobile application using React Native",
    "projectTag": "mobile-project"
  }
}
```

**Response:**
```json
{
  "id": "1ebb1448-790b-438a-9ef8-aa16e9dbc4ba",
  "title": "Mobile App Development",
  "description": "Cross-platform mobile application using React Native",
  "taskCount": 0,
  "completedCount": 0,
  "progress": 0,
  "lastUpdated": "2025-09-16T21:16:17.144Z",
  "projectTag": "mobile-project"
}
```

## Retrieving Lists

### Get All Lists
```json
{
  "tool": "list_all_lists"
}
```

**Response:** Returns array of all lists with basic information.

### Get Lists with Filters
```json
{
  "tool": "list_all_lists",
  "parameters": {
    "limit": 5,
    "projectTag": "web-app"
  }
}
```

**Response:**
```json
[
  {
    "id": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "title": "Development Project Alpha",
    "taskCount": 5,
    "completedCount": 1,
    "progress": 20,
    "lastUpdated": "2025-09-16T21:16:13.376Z",
    "projectTag": "web-app"
  }
]
```

### Get Specific List with Tasks
```json
{
  "tool": "get_list",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d"
  }
}
```

**Response:**
```json
{
  "id": "11b0dfb3-9580-42ea-afba-208b5e44877d",
  "title": "Development Project Alpha",
  "description": "A comprehensive web application development project with frontend, backend, and deployment components",
  "taskCount": 5,
  "completedCount": 1,
  "progress": 20,
  "lastUpdated": "2025-09-16T21:16:13.376Z",
  "projectTag": "web-app",
  "tasks": [
    // Array of task objects
  ]
}
```

### Get List Without Completed Tasks
```json
{
  "tool": "get_list",
  "parameters": {
    "listId": "11b0dfb3-9580-42ea-afba-208b5e44877d",
    "includeCompleted": false
  }
}
```

## Deleting Lists

### Archive a List (Default)
```json
{
  "tool": "delete_list",
  "parameters": {
    "listId": "83aeb714-ae8a-43c9-a2bd-9ef687ed8575"
  }
}
```

**Response:**
```json
{
  "success": true,
  "operation": "archived",
  "message": "Todo list \"Quick Tasks\" has been archived",
  "listId": "83aeb714-ae8a-43c9-a2bd-9ef687ed8575"
}
```

### Permanently Delete a List
```json
{
  "tool": "delete_list",
  "parameters": {
    "listId": "1ebb1448-790b-438a-9ef8-aa16e9dbc4ba",
    "permanent": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "operation": "deleted",
  "message": "Todo list \"Mobile App Development\" has been permanently deleted",
  "listId": "1ebb1448-790b-438a-9ef8-aa16e9dbc4ba"
}
```

## Best Practices

1. **Use descriptive titles** that clearly indicate the project or purpose
2. **Add descriptions** for complex projects to provide context
3. **Use project tags** to organize related lists (e.g., "web-app", "mobile-project")
4. **Archive instead of delete** to preserve project history
5. **Use limits** when retrieving lists to improve performance
6. **Filter by project tags** to focus on specific types of work

## Common Use Cases

- **Project Management**: Create lists for different projects or phases
- **Team Organization**: Use project tags to separate team responsibilities
- **Personal Productivity**: Create lists for different areas of life or work
- **Sprint Planning**: Create lists for development sprints or iterations
- **Client Work**: Separate lists for different clients using project tags