# Dependency Validation API

This document describes the centralized dependency validation utilities available for dependency management tools.

## Overview

The dependency validation system provides comprehensive validation for task dependencies, including:

- **Existence validation**: Ensures all dependency IDs exist in the task list
- **Self-dependency prevention**: Prevents tasks from depending on themselves
- **Circular dependency detection**: Identifies and prevents circular dependency chains
- **Duplicate detection**: Warns about duplicate dependencies
- **Format validation**: Validates UUID formats for task and dependency IDs
- **User-friendly error messages**: Provides clear error messages with actionable suggestions

## Core Functions

### `validateTaskDependencies(taskId, dependencyIds, allTasks)`

The main validation function that should be used by all dependency management tools.

**Parameters:**
- `taskId: string` - UUID of the task to validate dependencies for
- `dependencyIds: string[]` - Array of dependency UUIDs (max 10)
- `allTasks: TodoItem[]` - All tasks in the list for validation context

**Returns:** `DependencyValidationResult`
```typescript
interface DependencyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  circularDependencies: string[][];
}
```

**Example:**
```typescript
import { validateTaskDependencies } from '../shared/utils/dependency-validation.js';

const result = validateTaskDependencies(
  '550e8400-e29b-41d4-a716-446655440001',
  ['550e8400-e29b-41d4-a716-446655440002'],
  allTasks
);

if (!result.isValid) {
  // Handle validation errors
  console.error('Validation failed:', result.errors);
}
```

### `detectCircularDependencies(taskId, newDependencies, allTasks)`

Detects circular dependencies using depth-first search algorithm.

**Parameters:**
- `taskId: string` - Task ID to check dependencies for
- `newDependencies: string[]` - New dependency IDs to validate
- `allTasks: TodoItem[]` - All tasks for dependency graph context

**Returns:** `string[][]` - Array of circular dependency chains

### `createDependencyErrorResponse(validation, taskId)`

Creates user-friendly error responses with actionable suggestions.

**Parameters:**
- `validation: DependencyValidationResult` - Validation result to format
- `taskId: string` - Task ID for context

**Returns:** Formatted error response with suggestions

## Error Types

The system includes specific error types for different validation failures:

- `DependencyValidationError` - General dependency validation failure
- `CircularDependencyError` - Circular dependency detected
- `InvalidDependencyError` - Invalid dependency IDs
- `SelfDependencyError` - Task depends on itself

## Validation Schemas

### `DependencyIdsSchema`
Validates dependency ID arrays:
- Must be valid UUIDs
- Maximum 10 dependencies per task
- Defaults to empty array

### `TaskIdSchema` / `ListIdSchema`
Validates individual UUID parameters.

## Usage in MCP Handlers

### Basic Validation Pattern
```typescript
import { validateTaskDependencies, createDependencyErrorResponse } from '../shared/utils/dependency-validation.js';

export class MyDependencyHandler {
  async handle(args: MyArgs): Promise<McpResponse> {
    // Get all tasks from the list
    const allTasks = await this.todoListManager.getList(args.listId);
    
    // Validate dependencies
    const validation = validateTaskDependencies(
      args.taskId,
      args.dependencyIds,
      allTasks.items
    );
    
    if (!validation.isValid) {
      const errorResponse = createDependencyErrorResponse(validation, args.taskId);
      return {
        content: [
          {
            type: 'text',
            text: errorResponse.message,
          },
        ],
      };
    }
    
    // Proceed with the operation
    // ...
  }
}
```

### Error Handling Best Practices

1. **Always validate before modifying**: Run validation before making any changes to task dependencies
2. **Use centralized validation**: Use `validateTaskDependencies()` for consistency
3. **Provide clear error messages**: Use `createDependencyErrorResponse()` for user-friendly errors
4. **Log validation results**: Log both errors and warnings for debugging
5. **Handle warnings appropriately**: Warnings don't prevent operations but should be communicated to users

### Integration with Existing Code

The new validation functions complement the existing `DependencyResolver` class:

- **New handlers**: Use `validateTaskDependencies()` for comprehensive validation
- **Existing handlers**: Continue using `DependencyResolver.validateDependencies()` (already working)
- **Both approaches**: Provide the same level of validation with consistent error handling

## Testing

Comprehensive test coverage is provided in `tests/unit/shared/utils/dependency-validation.test.ts`:

- ✅ Valid dependency validation
- ✅ Invalid dependency ID detection
- ✅ Self-dependency prevention
- ✅ Circular dependency detection (simple and complex chains)
- ✅ Duplicate dependency warnings
- ✅ Completed task dependency warnings
- ✅ Input format validation
- ✅ Error response formatting
- ✅ Exception handling

## Performance Considerations

- **Circular dependency detection**: O(V + E) complexity using DFS
- **Validation caching**: Results can be cached for repeated validations
- **Memory usage**: Efficient graph representation using Maps and Sets
- **Scalability**: Tested with realistic task counts (100-500 tasks)

## Error Message Examples

### Invalid Dependencies
```
Dependency validation failed:
  • Invalid dependencies: invalid-id do not exist

Suggestions:
  • Verify that all dependency task IDs exist in the same list
  • Check for typos in task IDs
  • Use the get_list tool to see all available task IDs
```

### Circular Dependencies
```
Dependency validation failed:
  • Circular dependencies detected: task-1 → task-2 → task-1

Suggestions:
  • Remove one or more dependencies to break the circular chain
  • Consider restructuring tasks to avoid circular dependencies
  • Use the analyze_task_dependencies tool to visualize the dependency graph
```

### Self-Dependencies
```
Dependency validation failed:
  • Task cannot depend on itself

Suggestions:
  • Remove the task ID from its own dependencies list
  • Tasks cannot have themselves as dependencies
```