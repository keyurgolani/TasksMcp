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

## Error Categories

### 1. Validation Errors

Occur when input parameters fail validation checks.

#### Common Validation Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Title is required and must be 1-200 characters` | Missing or invalid title | Provide valid title string |
| `Priority must be between 1 and 5` | Invalid priority value | Use integer 1-5 |
| `Maximum 20 tags allowed per item` | Too many tags | Reduce tag count |
| `Tag length must not exceed 50 characters` | Tag too long | Shorten tag text |
| `Maximum 1000 items per list` | List size limit exceeded | Create new list or remove items |
| `Description must not exceed 2000 characters` | Description too long | Shorten description |
| `Invalid UUID format` | Malformed UUID | Use valid UUID v4 format |
| `Dependencies array cannot exceed 50 items` | Too many dependencies | Reduce dependency count |

#### Example Validation Error Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Validation failed: Title is required and must be 1-200 characters, Priority must be between 1 and 5"
    }
  ],
  "isError": true
}
```

#### Handling Validation Errors

```javascript
function handleValidationError(error) {
  const errorText = error.content[0].text;
  
  if (errorText.includes('Title is required')) {
    return 'Please provide a valid title (1-200 characters)';
  }
  
  if (errorText.includes('Priority must be between 1 and 5')) {
    return 'Priority must be a number from 1 (lowest) to 5 (highest)';
  }
  
  if (errorText.includes('Maximum 1000 items per list')) {
    return 'This list is full. Consider creating a new list or removing completed items.';
  }
  
  return `Input validation failed: ${errorText}`;
}
```

### 2. Business Logic Errors

Occur when operations violate business rules or constraints.

#### Common Business Logic Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Todo list not found` | Invalid list ID | Verify list exists with list_todo_lists |
| `Todo item not found` | Invalid item ID | Check item exists in list |
| `Circular dependency detected` | Dependency creates cycle | Remove circular references |
| `Cannot depend on non-existent item` | Dependency references invalid ID | Use valid item IDs |
| `Cannot update archived list` | Attempting to modify archived list | Unarchive list first |
| `Item already has maximum dependencies` | Too many dependencies | Remove some dependencies |
| `Cannot set status to completed with incomplete dependencies` | Dependencies not met | Complete dependencies first |

#### Example Business Logic Error Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Circular dependency detected: item A depends on item B which depends on item A"
    }
  ],
  "isError": true
}
```

#### Handling Business Logic Errors

```javascript
function handleBusinessLogicError(error) {
  const errorText = error.content[0].text;
  
  if (errorText.includes('Todo list not found')) {
    return 'The requested todo list could not be found. It may have been deleted or archived.';
  }
  
  if (errorText.includes('Circular dependency detected')) {
    return 'Cannot create this dependency as it would create a circular reference. Please check your task dependencies.';
  }
  
  if (errorText.includes('Cannot update archived list')) {
    return 'This list is archived. Please unarchive it before making changes.';
  }
  
  return `Operation not allowed: ${errorText}`;
}
```

### 3. Storage Errors

Occur when the storage backend encounters issues.

#### Common Storage Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Failed to save todo list` | Storage write failure | Check disk space and permissions |
| `Failed to load todo list` | Storage read failure | Verify file exists and is readable |
| `Storage backend not initialized` | Storage not ready | Wait for initialization or restart |
| `Backup operation failed` | Backup creation failed | Check backup directory permissions |
| `Data corruption detected` | Invalid data format | Restore from backup |
| `Storage quota exceeded` | Disk space full | Free up space or configure cleanup |
| `Concurrent modification detected` | Race condition | Retry operation |

#### Example Storage Error Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Failed to save todo list: insufficient disk space"
    }
  ],
  "isError": true
}
```

#### Handling Storage Errors

```javascript
async function handleStorageError(error, operation, retryCount = 0) {
  const errorText = error.content[0].text;
  const maxRetries = 3;
  
  if (errorText.includes('Concurrent modification detected') && retryCount < maxRetries) {
    // Wait and retry for race conditions
    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
    return await retryOperation(operation, retryCount + 1);
  }
  
  if (errorText.includes('insufficient disk space')) {
    return 'Storage is full. Please free up space or contact your administrator.';
  }
  
  if (errorText.includes('Storage backend not initialized')) {
    return 'Storage system is starting up. Please try again in a moment.';
  }
  
  return `Storage error: ${errorText}`;
}
```

### 4. System Errors

Occur due to system-level issues or resource constraints.

#### Common System Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `Memory limit exceeded` | High memory usage | Restart server or reduce load |
| `Request timeout` | Operation took too long | Retry with smaller batch size |
| `Rate limit exceeded` | Too many requests | Implement backoff and retry |
| `Server overloaded` | High CPU usage | Reduce concurrent operations |
| `Network connection failed` | Network issues | Check connectivity |
| `Service unavailable` | Server maintenance | Wait and retry later |

#### Example System Error Response

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Rate limit exceeded: maximum 1000 requests per minute"
    }
  ],
  "isError": true
}
```

#### Handling System Errors

```javascript
async function handleSystemError(error, operation) {
  const errorText = error.content[0].text;
  
  if (errorText.includes('Rate limit exceeded')) {
    // Implement exponential backoff
    const waitTime = Math.min(1000 * Math.pow(2, retryCount), 30000);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    return await retryOperation(operation);
  }
  
  if (errorText.includes('Request timeout')) {
    return 'Operation timed out. Try breaking it into smaller parts.';
  }
  
  if (errorText.includes('Service unavailable')) {
    return 'Service is temporarily unavailable. Please try again later.';
  }
  
  return `System error: ${errorText}`;
}
```

## Error Recovery Strategies

### 1. Automatic Retry with Exponential Backoff

```javascript
async function retryWithBackoff(operation, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      
      if (!result.isError) {
        return result;
      }
      
      // Don't retry validation errors
      if (result.content[0].text.includes('Validation failed')) {
        throw new Error(result.content[0].text);
      }
      
      // Don't retry on final attempt
      if (attempt === maxRetries) {
        throw new Error(result.content[0].text);
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
}
```

### 2. Circuit Breaker Pattern

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureThreshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      
      if (result.isError) {
        this.onFailure();
        throw new Error(result.content[0].text);
      }
      
      this.onSuccess();
      return result;
      
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}
```

### 3. Graceful Degradation

```javascript
async function getTodoListWithFallback(listId) {
  try {
    // Try to get full list with analytics
    return await getTodoList(listId, { includeAnalytics: true });
    
  } catch (error) {
    console.warn('Failed to get full list, trying basic version:', error.message);
    
    try {
      // Fallback to basic list without analytics
      return await getTodoList(listId, { includeAnalytics: false });
      
    } catch (fallbackError) {
      console.error('All attempts failed:', fallbackError.message);
      
      // Return cached version if available
      const cached = getCachedList(listId);
      if (cached) {
        return { ...cached, isStale: true };
      }
      
      throw fallbackError;
    }
  }
}
```

## Error Monitoring and Logging

### 1. Error Classification and Metrics

```javascript
class ErrorMonitor {
  constructor() {
    this.errorCounts = new Map();
    this.errorRates = new Map();
  }
  
  recordError(error, operation) {
    const errorType = this.classifyError(error);
    const key = `${operation}:${errorType}`;
    
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
    
    // Log structured error data
    console.error('MCP Task Manager Error', {
      operation,
      errorType,
      message: error.content[0].text,
      timestamp: new Date().toISOString(),
      count: this.errorCounts.get(key)
    });
  }
  
  classifyError(error) {
    const message = error.content[0].text;
    
    if (message.includes('Validation failed')) return 'validation';
    if (message.includes('not found')) return 'not_found';
    if (message.includes('Storage')) return 'storage';
    if (message.includes('Rate limit')) return 'rate_limit';
    if (message.includes('timeout')) return 'timeout';
    
    return 'unknown';
  }
  
  getErrorStats() {
    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0),
      errorsByType: Object.fromEntries(this.errorCounts),
      topErrors: Array.from(this.errorCounts.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
    };
  }
}
```

### 2. Health Check Integration

```javascript
async function healthCheckWithErrorTracking() {
  const monitor = new ErrorMonitor();
  
  try {
    // Test basic operations
    await testCreateTodoList();
    await testGetTodoList();
    await testUpdateTodoList();
    
    return {
      status: 'healthy',
      errors: monitor.getErrorStats(),
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    monitor.recordError(error, 'health_check');
    
    return {
      status: 'unhealthy',
      error: error.message,
      errors: monitor.getErrorStats(),
      timestamp: new Date().toISOString()
    };
  }
}
```

## Best Practices

### 1. Error Handling in AI Agents

```javascript
async function aiAgentErrorHandler(operation, userMessage) {
  try {
    const result = await operation();
    
    if (result.isError) {
      const userFriendlyMessage = translateErrorForUser(result.content[0].text);
      return `I encountered an issue: ${userFriendlyMessage}. Would you like me to try a different approach?`;
    }
    
    return result;
    
  } catch (error) {
    console.error('Unexpected error in AI agent:', error);
    return `I'm sorry, I encountered an unexpected error while ${userMessage}. Please try again or contact support if the issue persists.`;
  }
}

function translateErrorForUser(errorMessage) {
  const translations = {
    'Todo list not found': 'I couldn\'t find that todo list. It may have been deleted or archived.',
    'Validation failed': 'The information provided doesn\'t meet the requirements.',
    'Rate limit exceeded': 'I\'m making too many requests. Let me slow down and try again.',
    'Storage': 'There\'s an issue with saving your data. Your changes might not be saved.',
    'Circular dependency': 'The task dependencies you specified would create a loop, which isn\'t allowed.'
  };
  
  for (const [key, translation] of Object.entries(translations)) {
    if (errorMessage.includes(key)) {
      return translation;
    }
  }
  
  return 'An unexpected error occurred';
}
```

### 2. Defensive Programming

```javascript
// Always validate inputs before MCP calls
function validateTodoListInput(input) {
  const errors = [];
  
  if (!input.title || input.title.length < 1 || input.title.length > 200) {
    errors.push('Title must be 1-200 characters');
  }
  
  if (input.description && input.description.length > 2000) {
    errors.push('Description must not exceed 2000 characters');
  }
  
  if (input.tasks && input.tasks.length > 1000) {
    errors.push('Maximum 1000 tasks per list');
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
}

// Always check for errors in responses
function parseResponse(response) {
  if (response.isError) {
    throw new Error(response.content[0].text);
  }
  
  try {
    return JSON.parse(response.content[0].text);
  } catch (parseError) {
    throw new Error(`Failed to parse response: ${parseError.message}`);
  }
}
```

### 3. Error Recovery Workflows

```javascript
async function robustTodoListCreation(listData) {
  // Step 1: Validate input
  try {
    validateTodoListInput(listData);
  } catch (validationError) {
    return {
      success: false,
      error: 'validation',
      message: validationError.message,
      suggestions: getValidationSuggestions(validationError.message)
    };
  }
  
  // Step 2: Attempt creation with retry
  try {
    const result = await retryWithBackoff(
      () => createTodoList(listData),
      3
    );
    
    return {
      success: true,
      data: parseResponse(result),
      message: 'Todo list created successfully'
    };
    
  } catch (error) {
    // Step 3: Attempt recovery strategies
    if (error.message.includes('Storage')) {
      // Try with memory storage as fallback
      try {
        const fallbackResult = await createTodoListInMemory(listData);
        return {
          success: true,
          data: fallbackResult,
          message: 'Todo list created in temporary storage',
          warning: 'Data will be lost on server restart'
        };
      } catch (fallbackError) {
        // Final fallback: return structured data without persistence
        return {
          success: false,
          error: 'storage',
          message: 'Unable to save todo list',
          fallbackData: createLocalTodoList(listData)
        };
      }
    }
    
    return {
      success: false,
      error: 'unknown',
      message: error.message
    };
  }
}
```

This comprehensive error handling guide provides the foundation for building robust applications with the MCP Task Manager. Always implement proper error handling, monitoring, and recovery strategies to ensure a reliable user experience.