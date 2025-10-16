# Error Handling Guide

## Overview

The Task MCP Unified system provides comprehensive error handling with clear, actionable error messages designed to help developers quickly identify and resolve issues.

## Error Response Format

All errors follow a consistent format across both MCP and REST API interfaces:

### MCP Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "❌ priority: Expected number, but received string\n💡 Use numbers 1-5, where 5 is highest priority\n📝 Example: 5 (highest) to 1 (lowest)\n\n🔧 Common fixes:\n1. Use numbers 1-5 for priority\n   Example: {\"priority\": 5}",
    "data": {
      "field": "priority",
      "expectedType": "number",
      "receivedType": "string",
      "receivedValue": "high",
      "actionableGuidance": "Use numbers 1-5 for priority levels"
    }
  }
}
```

### REST API Error Format

```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "field": "priority",
    "message": "Priority must be between 1 and 5",
    "received": "10",
    "expected": "number between 1 and 5"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Categories

### Validation Errors

Occur when input parameters don't meet schema requirements.

**Common Causes:**

- Missing required parameters
- Invalid parameter types
- Values outside allowed ranges
- Invalid UUID formats

**Example:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "❌ listId: Required field missing\n💡 Provide the UUID of the task list\n📝 Example: \"123e4567-e89b-12d3-a456-426614174000\""
  }
}
```

### Business Logic Errors

Occur when operations violate business rules.

**Common Causes:**

- Circular dependencies
- Completing tasks with unmet exit criteria
- Deleting lists with active tasks
- Invalid task state transitions

**Example:**

```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "❌ Cannot complete task: 2 exit criteria not met\n💡 Complete all exit criteria before marking task as done\n📝 Use update_exit_criteria to mark criteria as met\n\n🔧 Unmet criteria:\n• Code review completed\n• Tests pass with 95% coverage"
  }
}
```

### Resource Not Found Errors

Occur when referenced resources don't exist.

**Common Causes:**

- Invalid UUIDs
- Deleted resources
- Typos in identifiers

**Example:**

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "❌ Task not found: 123e4567-e89b-12d3-a456-426614174000\n💡 Check the task ID and ensure the task exists\n📝 Use search_tool to find tasks by title or description"
  }
}
```

### Dependency Errors

Occur when task dependencies create invalid states.

**Common Causes:**

- Circular dependencies
- Dependencies on non-existent tasks
- Cross-list dependencies

**Example:**

```json
{
  "error": {
    "code": "DEPENDENCY_ERROR",
    "message": "❌ Circular dependency detected\n💡 Task dependencies cannot form cycles\n📝 Dependency chain: Task A → Task B → Task C → Task A\n\n🔧 To fix:\n1. Remove one dependency to break the cycle\n2. Use analyze_task_dependencies to visualize the graph"
  }
}
```

## Error Codes Reference

### Validation Error Codes

| Code                 | Description                    | Common Causes                                 |
| -------------------- | ------------------------------ | --------------------------------------------- |
| `VALIDATION_ERROR`   | Parameter validation failed    | Invalid types, missing required fields        |
| `INVALID_UUID`       | UUID format is invalid         | Malformed UUID strings                        |
| `INVALID_ENUM_VALUE` | Enum value not in allowed list | Invalid status, priority, or format values    |
| `STRING_TOO_LONG`    | String exceeds maximum length  | Titles, descriptions, or tags too long        |
| `ARRAY_TOO_LARGE`    | Array exceeds maximum size     | Too many tags, dependencies, or exit criteria |

### Business Logic Error Codes

| Code                      | Description                               | Common Causes                             |
| ------------------------- | ----------------------------------------- | ----------------------------------------- |
| `BUSINESS_RULE_VIOLATION` | Operation violates business rules         | Invalid state transitions                 |
| `EXIT_CRITERIA_NOT_MET`   | Task completion blocked by unmet criteria | Attempting to complete incomplete tasks   |
| `DEPENDENCY_VIOLATION`    | Dependency rules violated                 | Circular dependencies, invalid references |
| `LIST_NOT_EMPTY`          | Cannot delete non-empty list              | Attempting to delete lists with tasks     |

### Resource Error Codes

| Code                 | Description                      | Common Causes                  |
| -------------------- | -------------------------------- | ------------------------------ |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist | Invalid IDs, deleted resources |
| `LIST_NOT_FOUND`     | Task list not found              | Invalid list ID                |
| `TASK_NOT_FOUND`     | Task not found                   | Invalid task ID                |
| `CRITERIA_NOT_FOUND` | Exit criteria not found          | Invalid criteria ID            |

### System Error Codes

| Code                | Description                      | Common Causes                           |
| ------------------- | -------------------------------- | --------------------------------------- |
| `INTERNAL_ERROR`    | Unexpected system error          | System failures, data corruption        |
| `STORAGE_ERROR`     | Storage operation failed         | File system issues, permissions         |
| `CONCURRENCY_ERROR` | Concurrent modification detected | Multiple agents modifying same resource |

## Error Message Components

### Visual Indicators

- ❌ **Error indicator**: Clearly marks error messages
- 💡 **Guidance indicator**: Provides helpful suggestions
- 📝 **Example indicator**: Shows correct usage examples
- 🔧 **Fix indicator**: Lists specific steps to resolve issues

### Message Structure

1. **Problem Description**: What went wrong
2. **Guidance**: Why it happened and how to fix it
3. **Examples**: Correct usage patterns
4. **Action Items**: Specific steps to resolve the issue

## Handling Specific Error Scenarios

### Missing Required Parameters

```json
{
  "tool": "add_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000"
    // Missing required "title" parameter
  }
}
```

**Error Response:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "❌ title: Required field missing\n💡 Provide a title for the task\n📝 Example: \"Review project proposal\""
  }
}
```

### Invalid Parameter Types

```json
{
  "tool": "set_task_priority",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174111",
    "priority": "high" // Should be number
  }
}
```

**Error Response:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "❌ priority: Expected number, but received string\n💡 Use numbers 1-5, where 5 is highest priority\n📝 Example: 5 (highest) to 1 (lowest)\n\n🔧 Common fixes:\n1. Use 5 for critical/urgent tasks\n2. Use 4 for high priority tasks\n3. Use 3 for medium priority tasks\n4. Use 2 for low priority tasks\n5. Use 1 for minimal priority tasks"
  }
}
```

### Circular Dependencies

```json
{
  "tool": "set_task_dependencies",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "task-a",
    "dependencyIds": ["task-b"] // task-b already depends on task-a
  }
}
```

**Error Response:**

```json
{
  "error": {
    "code": "DEPENDENCY_ERROR",
    "message": "❌ Circular dependency detected\n💡 Task dependencies cannot form cycles\n📝 Dependency chain: Task A → Task B → Task A\n\n🔧 To fix:\n1. Remove the dependency causing the cycle\n2. Use analyze_task_dependencies to visualize dependencies\n3. Restructure tasks to avoid circular relationships"
  }
}
```

### Completing Tasks with Unmet Exit Criteria

```json
{
  "tool": "complete_task",
  "parameters": {
    "listId": "123e4567-e89b-12d3-a456-426614174000",
    "taskId": "456e7890-e89b-12d3-a456-426614174111"
  }
}
```

**Error Response:**

```json
{
  "error": {
    "code": "EXIT_CRITERIA_NOT_MET",
    "message": "❌ Cannot complete task: 2 exit criteria not met\n💡 Complete all exit criteria before marking task as done\n📝 Use update_exit_criteria to mark criteria as met\n\n🔧 Unmet criteria:\n• Code review completed\n• Tests pass with 95% coverage\n\n🔧 Next steps:\n1. Complete the remaining work\n2. Use update_exit_criteria for each completed criteria\n3. Try complete_task again when all criteria are met"
  }
}
```

## Best Practices for Error Handling

### In Client Code

1. **Always check for errors** before processing responses
2. **Parse error messages** for actionable guidance
3. **Implement retry logic** for transient errors
4. **Log errors** with context for debugging
5. **Provide user-friendly** error messages in UIs

### Error Recovery Strategies

#### Validation Errors

- Fix parameter values and retry
- Use schema documentation to verify requirements
- Check examples in error messages

#### Business Logic Errors

- Review business rules and constraints
- Use analysis tools to understand current state
- Break complex operations into smaller steps

#### Resource Not Found Errors

- Verify resource IDs are correct
- Use search tools to find resources
- Check if resources were deleted

#### Dependency Errors

- Use `analyze_task_dependencies` to visualize relationships
- Simplify dependency structures
- Remove circular dependencies

## Error Prevention

### Parameter Validation

Always validate parameters before making tool calls:

```javascript
function validateTaskPriority(priority) {
  if (typeof priority !== 'number') {
    throw new Error('Priority must be a number');
  }
  if (priority < 1 || priority > 5) {
    throw new Error('Priority must be between 1 and 5');
  }
}
```

### UUID Validation

Validate UUIDs before using them:

```javascript
function isValidUUID(uuid) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
```

### Dependency Checking

Check for circular dependencies before setting them:

```javascript
async function checkCircularDependency(listId, taskId, dependencyIds) {
  const analysis = await analyzeDependencies(listId);
  // Check if adding dependencies would create cycles
  return analysis.wouldCreateCycle(taskId, dependencyIds);
}
```

## Debugging Tips

### Enable Debug Logging

Set debug logging to see detailed error information:

```bash
export MCP_LOG_LEVEL=debug
```

### Use Analysis Tools

Use built-in analysis tools to understand system state:

```json
{
  "tool": "analyze_task_dependencies",
  "parameters": {
    "listId": "your-list-id",
    "format": "both"
  }
}
```

### Check System Health

Verify system health when encountering errors:

```bash
# For REST API
curl http://localhost:3000/api/health

# For MCP
echo '{"tool": "list_all_lists", "parameters": {}}' | node dist/app/cli.js
```

This comprehensive error handling guide helps developers quickly identify, understand, and resolve issues when working with the Task MCP Unified system.
