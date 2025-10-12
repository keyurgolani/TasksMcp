# REST API Server

## Overview

The REST API Server provides a comprehensive HTTP API for the MCP Task Manager. It serves as the foundation for all client interfaces including the MCP server and React UI.

## Architecture

The server is built using Express.js with TypeScript and follows a layered architecture:

- **Middleware Layer**: Request processing, logging, error handling
- **Route Layer**: API endpoint definitions
- **Handler Layer**: Business logic execution
- **Manager Layer**: Domain operations

## Features

### Core Middleware

1. **Request ID Generation**: Every request gets a unique UUID for tracking
2. **Request Logging**: Structured logging of all requests and responses
3. **CORS Support**: Configurable cross-origin resource sharing
4. **Body Parsing**: JSON and URL-encoded body parsing with size limits
5. **Error Handling**: Global error handler with consistent error responses
6. **Request Timeout**: Configurable timeout for all requests

### Endpoints

#### Health Check

- `GET /health` - Server health status
- `GET /api/health` - Alternative health check endpoint

Returns:

```json
{
  "status": "healthy",
  "version": "2.5.0",
  "uptime": 3600,
  "timestamp": "2025-02-10T12:00:00.000Z",
  "checks": {
    "storage": {
      "status": "pass",
      "message": "Storage is operational"
    },
    "memory": {
      "status": "pass",
      "message": "Memory usage is normal",
      "details": {
        "heapUsedMB": 45,
        "heapTotalMB": 100,
        "heapUsedPercent": 45
      }
    }
  }
}
```

#### API Info

- `GET /api` - API information and available endpoints
- `GET /api/v1` - API v1 information

### Configuration

```typescript
interface ApiConfig {
  port: number; // Server port (default: 3001)
  corsOrigins: string[]; // Allowed CORS origins (default: ['*'])
  authEnabled: boolean; // Enable authentication (default: false)
  requestTimeout: number; // Request timeout in ms (default: 30000)
  bodyLimit: string; // Body size limit (default: '10mb')
  rateLimitWindowMs: number; // Rate limit window (default: 900000)
  rateLimitMax: number; // Max requests per window (default: 100)
}
```

## Usage

### Basic Setup

```typescript
import { RestApiServer } from './app/rest-api-server.js';
import { TaskListManager } from './domain/lists/task-list-manager.js';
// ... import other managers

// Initialize managers
const taskListManager = new TaskListManager(storage);
const dependencyManager = new DependencyResolver();
// ... initialize other managers

// Create server
const server = new RestApiServer(
  {
    port: 3001,
    corsOrigins: ['http://localhost:3000'],
  },
  taskListManager,
  dependencyManager,
  exitCriteriaManager,
  actionPlanManager,
  notesManager,
  intelligenceManager
);

// Start server
await server.start();
console.log('Server running on http://localhost:3001');

// Stop server
await server.stop();
```

### Error Handling

All errors are caught by the global error handler and returned in a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation error",
    "details": [
      {
        "field": "title",
        "message": "Title is required"
      }
    ]
  },
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-02-10T12:00:00.000Z",
    "duration": 15
  }
}
```

### Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Internal server error
- `BAD_REQUEST` - Invalid request
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Access denied
- `CONFLICT` - Resource conflict
- `RATE_LIMIT_EXCEEDED` - Too many requests

## Testing

Run integration tests:

```bash
npm run test:run -- tests/integration/rest-api-server.test.ts
```

## Next Steps

The following endpoints will be implemented in subsequent tasks:

- List management (`/api/v1/lists`)
- Task management (`/api/v1/tasks`)
- Dependency management (`/api/v1/dependencies`)
- Exit criteria management (`/api/v1/exit-criteria`)
- Action plans (`/api/v1/action-plans`)
- Notes (`/api/v1/notes`)
- Intelligence features (`/api/v1/intelligence`)

## Security Considerations

1. **CORS**: Configure `corsOrigins` to restrict access to trusted domains
2. **Rate Limiting**: Adjust rate limits based on expected traffic
3. **Body Size**: Limit body size to prevent DoS attacks
4. **Timeouts**: Set appropriate timeouts to prevent resource exhaustion
5. **Authentication**: Enable authentication for production deployments

## Performance

- Request ID generation uses crypto.randomUUID() for performance
- Logging is structured for efficient parsing
- Error handling is optimized to avoid stack trace generation in production
- Health checks are lightweight and cached where possible
