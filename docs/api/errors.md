# Error Handling Guide

This guide covers comprehensive error handling patterns, error codes, and recovery strategies for the MCP Task Manager.

## Error Response Format

All errors follow the standard MCP error response format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: [specific error message]"
    }
  ],
  "isError": true
}
```

## Agent-Friendly Error Messages

The MCP Task Manager provides enhanced error messages designed specifically for AI agents:

### Visual Error Formatting

```json
{
  "error": "❌ priority: Expected number, but received string\n💡 Use numbers 1-5, where 5 is highest priority\n📝 Example: 5 (highest) to 1 (lowest)\n\n🔧 Common fixes:\n1. Use numbers 1-5 for priority\n   Example: {\"priority\": 5}"
}
```

### Error Message Components

- **❌ Error Indicator**: Clear identification of the problem
- **💡 Guidance**: Explanation of what's expected
- **📝 Examples**: Working examples to follow
- **🔧 Common Fixes**: Step-by-step solutions

## Error Categories

### 1. Validation Errors

Occur when input parameters fail validation checks.

#### Common Validation Errors

| Error Pattern                                 | Cause                           | Solution                                |
| --------------------------------------------- | ------------------------------- | --------------------------------------- |
| `Expected number, received string`            | String passed for numeric field | Convert to number or use numeric value  |
| `String must contain at least 1 character(s)` | Empty required string field     | Provide non-empty string value          |
| `Number must be greater than or equal to 1`   | Invalid priority/duration value | Use positive numbers within valid range |
| `Array must contain at most 10 element(s)`    | Too many items in array field   | Reduce array size to within limits      |
| `Invalid uuid`                                | Malformed UUID string           | Use properly formatted UUID             |

#### Priority Validation

```json
// ❌ Invalid
{
  "priority": "high"  // String instead of number
}

// ❌ Invalid
{
  "priority": 25      // Outside valid range (1-5)
}

// ✅ Valid
{
  "priority": 5       // Number within range 1-5
}
```

#### UUID Validation

```json
// ❌ Invalid
{
  "listId": "abc-123"  // Not a valid UUID format
}

// ✅ Valid
{
  "listId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### 2. Resource Not Found Errors

Occur when trying to access non-existent resources.

#### List Not Found

```json
{
  "error": "❌ List not found: 123e4567-e89b-12d3-a456-426614174000\n💡 Check that the list ID is correct and the list exists\n📝 Use list_all_lists to see available lists\n\n🔧 Common fixes:\n1. Verify the list ID is correct\n2. Check if the list was deleted or archived"
}
```

#### Task Not Found

```json
{
  "error": "❌ Task not found: 456e7890-e89b-12d3-a456-426614174001\n💡 Check that the task ID is correct and exists in the specified list\n📝 Use get_list to see all tasks in the list\n\n🔧 Common fixes:\n1. Verify the task ID is correct\n2. Check if the task was removed\n3. Ensure you're looking in the correct list"
}
```

### 3. Business Logic Errors

Occur when operations violate business rules.

#### Circular Dependency

```json
{
  "error": "❌ Circular dependency detected\n💡 Task cannot depend on itself or create a dependency loop\n📝 Dependencies must form a directed acyclic graph (DAG)\n\n🔧 Common fixes:\n1. Remove the circular dependency\n2. Use analyze_task_dependencies to visualize the dependency graph\n3. Restructure dependencies to avoid loops"
}
```

#### Exit Criteria Not Met

```json
{
  "error": "❌ Cannot complete task: 2 exit criteria not yet met\n💡 All exit criteria must be satisfied before task completion\n📝 Use update_exit_criteria to mark criteria as met\n\n🔧 Remaining criteria:\n1. Code review completed\n2. Tests passing"
}
```

#### Dependency Blocking

```json
{
  "error": "❌ Task is blocked by incomplete dependencies\n💡 Complete the following tasks first:\n📝 Blocked by: Setup Database, Design API\n\n🔧 Next steps:\n1. Complete dependency tasks first\n2. Use get_ready_tasks to find tasks you can work on now"
}
```

### 4. Storage Errors

Occur when there are issues with data persistence.

#### Storage Initialization

```json
{
  "error": "❌ Storage backend not initialized\n💡 The storage system failed to start properly\n📝 Check storage configuration and permissions\n\n🔧 Common fixes:\n1. Verify DATA_DIRECTORY exists and is writable\n2. Check disk space availability\n3. Restart the MCP server"
}
```

#### Data Corruption

```json
{
  "error": "❌ Data integrity check failed\n💡 The stored data appears to be corrupted\n📝 Automatic recovery will be attempted\n\n🔧 Recovery options:\n1. Restore from backup if available\n2. Use data repair tools\n3. Contact support for assistance"
}
```

### 5. System Errors

Occur due to system-level issues.

#### Memory Limits

```json
{
  "error": "❌ Memory limit exceeded\n💡 The operation requires more memory than available\n📝 Try reducing the scope of the operation\n\n🔧 Solutions:\n1. Process fewer items at once\n2. Use pagination for large datasets\n3. Increase system memory if possible"
}
```

#### Timeout Errors

```json
{
  "error": "❌ Operation timed out\n💡 The operation took longer than the maximum allowed time\n📝 Try breaking the operation into smaller parts\n\n🔧 Solutions:\n1. Reduce the scope of the operation\n2. Check system performance\n3. Retry the operation"
}
```

## Error Recovery Strategies

### Automatic Recovery

The MCP Task Manager includes automatic recovery mechanisms for common error scenarios:

#### Parameter Preprocessing

- **String to Number**: Automatically converts string numbers to numeric values
- **JSON String Arrays**: Parses JSON string arrays to proper arrays
- **Boolean Strings**: Converts "true"/"false" and "yes"/"no" to boolean values

#### Data Integrity

- **Backup and Restore**: Automatic backups with rollback capability
- **Consistency Checks**: Regular validation of data integrity
- **Repair Operations**: Automatic repair of minor data inconsistencies

### Manual Recovery

For errors that require manual intervention:

#### Validation Errors

1. **Review the error message** for specific guidance
2. **Check the provided examples** for correct format
3. **Verify parameter types and ranges**
4. **Use the suggested fixes** in the error response

#### Resource Errors

1. **Verify resource IDs** are correct and exist
2. **Check permissions** for the operation
3. **Use list operations** to find available resources
4. **Ensure resources haven't been deleted or archived**

#### Business Logic Errors

1. **Understand the business rule** being violated
2. **Use analysis tools** to understand the current state
3. **Restructure the operation** to comply with rules
4. **Break complex operations** into smaller steps

## Error Prevention

### Best Practices

#### Parameter Validation

- **Use proper types**: Numbers for numeric fields, strings for text
- **Check ranges**: Ensure values are within valid ranges
- **Validate UUIDs**: Use properly formatted UUID strings
- **Limit array sizes**: Stay within maximum array lengths

#### Resource Management

- **Verify existence**: Check that resources exist before operations
- **Handle not found**: Gracefully handle missing resources
- **Use list operations**: Get available resources before operations
- **Check permissions**: Ensure operations are allowed

#### Dependency Management

- **Avoid circular dependencies**: Use DAG visualization to check
- **Validate prerequisites**: Ensure dependencies are completable
- **Use ready tasks**: Work on tasks that are ready to start
- **Plan workflows**: Design dependency structures carefully

### Testing Strategies

#### Unit Testing

- **Test error conditions**: Verify error handling works correctly
- **Test edge cases**: Check boundary conditions and limits
- **Test recovery**: Verify automatic recovery mechanisms
- **Test validation**: Ensure parameter validation is comprehensive

#### Integration Testing

- **Test workflows**: Verify end-to-end error handling
- **Test error propagation**: Ensure errors are properly reported
- **Test recovery scenarios**: Verify system recovers from errors
- **Test user experience**: Ensure error messages are helpful

## Debugging Tools

### Error Analysis

```json
{
  "tool": "analyze_task_dependencies",
  "parameters": {
    "listId": "project-uuid",
    "format": "both"
  }
}
```

### System Health

```bash
# Check system health
npm run health

# Validate data integrity
npm run validate

# View detailed logs
export MCP_LOG_LEVEL=debug
```

### Error Logging

The system provides comprehensive error logging:

- **Error Context**: Full context of the error situation
- **Stack Traces**: Detailed stack traces for debugging
- **User Actions**: What the user was trying to do
- **System State**: Relevant system state information
- **Recovery Actions**: What recovery actions were attempted

## Error Codes Reference

| Code                    | Category       | Description                  | Recovery                  |
| ----------------------- | -------------- | ---------------------------- | ------------------------- |
| `VALIDATION_ERROR`      | Validation     | Parameter validation failed  | Fix parameters            |
| `NOT_FOUND`             | Resource       | Resource not found           | Verify resource exists    |
| `CIRCULAR_DEPENDENCY`   | Business Logic | Circular dependency detected | Remove circular reference |
| `EXIT_CRITERIA_NOT_MET` | Business Logic | Exit criteria not satisfied  | Complete criteria         |
| `STORAGE_ERROR`         | System         | Storage operation failed     | Check storage system      |
| `MEMORY_LIMIT`          | System         | Memory limit exceeded        | Reduce operation scope    |
| `TIMEOUT`               | System         | Operation timed out          | Retry or reduce scope     |

## Getting Help

### Documentation

- **Check this error guide** for specific error patterns
- **Review the [FAQ](../reference/faq.md)** for common issues
- **See [Troubleshooting Guide](../guides/troubleshooting.md)** for solutions

### Diagnostics

```bash
# Run comprehensive diagnostics
npm run health

# Test with debug logging
export MCP_LOG_LEVEL=debug
npm test

# Validate system state
npm run validate
```

### Support

- **GitHub Issues**: Report bugs and get help
- **Documentation**: Comprehensive guides and examples
- **Community**: Discussions and shared solutions

---

This error handling guide provides comprehensive coverage of error scenarios and recovery strategies. For additional help, see the [Troubleshooting Guide](../guides/troubleshooting.md) or [FAQ](../reference/faq.md).
