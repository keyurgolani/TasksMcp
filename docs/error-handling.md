# MCP Error Handling

This document describes the comprehensive error handling system implemented for the MCP tools interface.

**Last Updated**: September 15, 2025  
**Version**: 2.0.0 (Production Ready)  
**Coverage**: Complete error handling system with recovery mechanisms

## Overview

The MCP error handling system provides:

- **Consistent Error Responses**: All tools return errors in a standardized format
- **Validation Error Handling**: Comprehensive parameter validation with clear error messages
- **Automatic Error Recovery**: Smart recovery mechanisms for common failure scenarios
- **User-Friendly Messages**: Clear, actionable error messages for different user levels
- **Error Context Preservation**: Detailed logging while protecting sensitive information
- **Recovery Statistics**: Monitoring and tracking of error recovery attempts

## Architecture

### Core Components

1. **ErrorHandler**: Main error processing and formatting
2. **ErrorRecovery**: Automatic error recovery mechanisms
3. **Error Classes**: Structured error types with context and suggestions
4. **Response Formatters**: Consistent error response formatting

### Error Types

#### MCPError
Base error class for all MCP tool errors.

```typescript
class MCPError extends Error {
  code: ErrorCode;
  userMessage: string;
  recoverable: boolean;
  context?: Record<string, unknown>;
  suggestions: string[];
}
```

#### ValidationError
Specific error for parameter validation failures.

```typescript
class ValidationError extends MCPError {
  field: string;
  value: unknown;
  constraint: string;
}
```

#### ResourceNotFoundError
Error for missing resources (lists, tasks, etc.).

```typescript
class ResourceNotFoundError extends MCPError {
  resourceType: string;
  resourceId: string;
}
```

#### OperationFailedError
Error for failed operations with specific reasons.

```typescript
class OperationFailedError extends MCPError {
  operation: string;
  reason: string;
}
```

## Error Codes

### Validation Errors
- `INVALID_UUID`: Invalid UUID format
- `MISSING_REQUIRED_PARAMETER`: Required parameter not provided
- `PARAMETER_OUT_OF_RANGE`: Numeric parameter outside valid range
- `INVALID_ENUM_VALUE`: Invalid enum value provided
- `STRING_TOO_LONG`: String exceeds maximum length
- `STRING_TOO_SHORT`: String below minimum length
- `ARRAY_TOO_LARGE`: Array exceeds maximum size
- `ARRAY_TOO_SMALL`: Array below minimum size

### Resource Errors
- `LIST_NOT_FOUND`: Todo list not found
- `TASK_NOT_FOUND`: Task not found
- `RESOURCE_CONFLICT`: Resource conflict detected

### Operation Errors
- `OPERATION_FAILED`: General operation failure
- `INVALID_OPERATION_STATE`: Operation not valid in current state
- `CONCURRENT_MODIFICATION`: Resource modified concurrently

### System Errors
- `STORAGE_ERROR`: Storage/database error
- `TIMEOUT_ERROR`: Operation timeout
- `INTERNAL_ERROR`: Internal system error

### Business Logic Errors
- `INVALID_PRIORITY`: Priority value out of range
- `INVALID_STATUS`: Invalid status value
- `DUPLICATE_TAG`: Duplicate tag detected
- `CIRCULAR_DEPENDENCY`: Circular dependency detected

## Error Handling Flow

### 1. Error Detection
Errors are detected at multiple levels:
- **Schema Validation**: Zod schema validation for parameters
- **Business Logic**: TodoListManager operations
- **System Level**: Storage, network, timeout errors

### 2. Error Processing
```typescript
ErrorHandler.handleError(error, toolName, context)
```

The error handler:
1. Categorizes the error type
2. Creates appropriate error response
3. Logs error with context
4. Returns formatted MCP response

### 3. Error Recovery
```typescript
ErrorRecovery.attemptRecovery(error, toolName, params, operation)
```

Recovery mechanisms:
1. **Parameter Correction**: Fix invalid parameters automatically
2. **Fallback Values**: Use default values for invalid inputs
3. **Data Transformation**: Transform data to valid format
4. **Retry Logic**: Retry operations with corrected parameters

## Recovery Strategies

### String Too Long
- **Action**: Truncate string to maximum length with ellipsis
- **Example**: `"Very long title..."` → `"Very long tit..."`

### Parameter Out of Range
- **Action**: Clamp value to valid range
- **Example**: Priority `10` → Priority `5` (max)

### Array Too Large
- **Action**: Slice array to maximum size
- **Example**: 15 tags → 10 tags (first 10)

### Invalid Enum Value
- **Action**: Use default enum value
- **Example**: Invalid format → `"detailed"` (default)

### Duplicate Tags
- **Action**: Remove duplicates automatically
- **Example**: `["tag1", "tag2", "tag1"]` → `["tag1", "tag2"]`

## Usage Examples

### Basic Error Handling
```typescript
import { ErrorHandler } from '../utils/error-handler.js';

export async function handleCreateList(request, todoListManager) {
  try {
    // Validate and process request
    const args = CreateListSchema.parse(request.params?.arguments);
    const result = await todoListManager.createTodoList(args);
    return formatSuccessResponse(result);
  } catch (error) {
    // Handle Zod validation errors specifically
    if (error instanceof z.ZodError) {
      return ErrorHandler.handleValidationError(
        error,
        'create_list',
        request.params?.arguments || {}
      );
    }

    // Handle all other errors
    return ErrorHandler.handleError(
      error,
      'create_list',
      request.params?.arguments || {}
    );
  }
}
```

### Error Recovery Wrapper
```typescript
import { withRecovery } from '../utils/error-recovery.js';

const recoveryEnabledHandler = withRecovery(
  'create_list',
  async (params) => {
    return await todoListManager.createTodoList(params);
  },
  todoListManager
);
```

### Custom Error Creation
```typescript
import { createErrorResponse, ERROR_CODES } from '../utils/error-handler.js';

return createErrorResponse(
  'ValidationError',
  'Invalid list ID format',
  ERROR_CODES.INVALID_UUID,
  ['Use a valid UUID format like: 123e4567-e89b-12d3-a456-426614174000']
);
```

## Error Response Format

### Standard Error Response
```json
{
  "error": "ValidationError",
  "message": "Invalid title: must be at least 1 character",
  "code": "STRING_TOO_SHORT",
  "suggestions": [
    "Provide a title for your list",
    "Title cannot be empty"
  ],
  "recoverable": true
}
```

### Success with Warning
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "My List",
  "warning": "Operation completed with automatic corrections",
  "suggestions": [
    "Title was truncated to fit length requirements"
  ]
}
```

## Configuration

### Recovery Configuration
```typescript
const recoveryConfig = {
  enableAutoRecovery: true,
  maxRecoveryAttempts: 3,
  fallbackToDefaults: true,
  preserveUserData: true,
  logRecoveryActions: true
};
```

### Error Context
```typescript
const errorContext = {
  userLevel: 'intermediate', // 'beginner' | 'intermediate' | 'advanced'
  operation: 'create_list',
  feature: 'task_management',
  includeDetails: true,
  includeSuggestions: true
};
```

## Best Practices

### 1. Always Use Error Handler
```typescript
// ✅ Good
return ErrorHandler.handleError(error, toolName, context);

// ❌ Bad
return { content: [{ type: 'text', text: error.message }], isError: true };
```

### 2. Provide Context
```typescript
// ✅ Good
ErrorHandler.handleError(error, 'create_list', { 
  title: params.title,
  operation: 'list_creation'
});

// ❌ Bad
ErrorHandler.handleError(error, 'create_list');
```

### 3. Use Specific Error Types
```typescript
// ✅ Good
throw new ValidationError('title', '', 'must not be empty');

// ❌ Bad
throw new Error('Title is required');
```

### 4. Enable Recovery When Appropriate
```typescript
// ✅ Good - For user input errors
const handler = withRecovery('create_list', baseHandler, todoListManager);

// ❌ Bad - For system errors that shouldn't be auto-recovered
const handler = withRecovery('system_backup', baseHandler);
```

## Monitoring and Debugging

### Error Statistics
```typescript
const stats = ErrorHandler.getErrorStatistics();
console.log('Error rate:', stats.totalErrors);
console.log('Recovery rate:', stats.recoveryRate);
```

### Recovery Statistics
```typescript
const recoveryStats = globalRecoveryManager.getRecoveryStats();
console.log('Active recoveries:', recoveryStats.activeRecoveries);
```

### Logging
All errors are automatically logged with appropriate levels:
- **Error**: Internal system errors, non-recoverable errors
- **Warn**: Recoverable errors, business logic violations
- **Info**: Validation errors, successful recoveries

## Testing

### Unit Tests
```typescript
describe('Error Handling', () => {
  it('should handle validation errors', () => {
    const error = new ValidationError('title', '', 'required');
    const result = ErrorHandler.handleError(error, 'create_list');
    
    expect(result.isError).toBe(true);
    const response = JSON.parse(result.content[0].text);
    expect(response.error).toBe('ValidationError');
  });
});
```

### Integration Tests
```typescript
describe('Error Recovery', () => {
  it('should recover from string too long', async () => {
    const recovery = new ErrorRecovery();
    const result = await recovery.attemptRecovery(
      stringTooLongError,
      'create_list',
      { title: 'x'.repeat(300) },
      mockOperation
    );
    
    expect(result.success).toBe(true);
  });
});
```

## Migration Guide

### From Old Error Handling
```typescript
// Old way
catch (error) {
  return {
    content: [{ type: 'text', text: `Error: ${error.message}` }],
    isError: true
  };
}

// New way
catch (error) {
  if (error instanceof z.ZodError) {
    return ErrorHandler.handleValidationError(error, toolName, params);
  }
  return ErrorHandler.handleError(error, toolName, params);
}
```

### Adding Recovery
```typescript
// Before
export async function handleCreateList(request, todoListManager) {
  // ... existing implementation
}

// After
export const handleCreateList = withRecovery(
  'create_list',
  async (params, todoListManager) => {
    // ... existing implementation
  },
  todoListManager
);
```

## Security Considerations

### Sensitive Data Protection
- Error responses never include sensitive data (passwords, tokens, etc.)
- Context information is filtered to safe fields only
- Stack traces are logged but not returned to clients

### Information Disclosure
- Error messages are user-friendly and don't reveal internal system details
- Technical details are only included for advanced users when explicitly requested
- Database errors are generalized to "storage error" messages

## Performance Impact

### Error Processing Overhead
- Minimal overhead for successful operations
- Error categorization adds ~1-2ms per error
- Recovery attempts may add 10-50ms depending on complexity

### Memory Usage
- Error reports are limited to 1000 recent entries
- Recovery attempt counters are automatically cleaned up
- Context information is limited to essential fields only

## Future Enhancements

### Planned Features
1. **Machine Learning Error Prediction**: Predict likely errors based on parameters
2. **Advanced Recovery Strategies**: More sophisticated parameter correction
3. **Error Analytics Dashboard**: Visual error tracking and analysis
4. **Custom Recovery Rules**: User-defined recovery strategies
5. **Error Rate Limiting**: Prevent error spam from misbehaving clients

### Extension Points
- Custom error types can be added by extending `MCPError`
- Recovery strategies can be customized per tool or operation
- Error formatters can be extended for different output formats
- Monitoring hooks can be added for external error tracking systems