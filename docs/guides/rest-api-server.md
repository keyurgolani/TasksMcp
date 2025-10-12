# REST API Server Guide

## Overview

The REST API server provides a comprehensive HTTP API for task management, serving as the backend for both the MCP server client and the React UI client.

## Starting the Server

### Quick Start

```bash
# Build and start the server
npm run dev:api

# Or start the pre-built server
npm run start:api
```

### Configuration

The server can be configured using environment variables:

| Variable             | Default       | Description                                  |
| -------------------- | ------------- | -------------------------------------------- |
| `API_PORT` or `PORT` | `3001`        | Port number for the API server               |
| `CORS_ORIGINS`       | `*`           | Comma-separated list of allowed CORS origins |
| `NODE_ENV`           | `development` | Environment (development, production, test)  |
| `LOG_LEVEL`          | `info`        | Logging level (error, warn, info, debug)     |

### Example with Custom Configuration

```bash
# Start on custom port with specific CORS origins
API_PORT=8080 CORS_ORIGINS=http://localhost:3000,http://localhost:3002 npm run start:api

# Start in production mode
NODE_ENV=production npm run start:api
```

## Server Features

### Startup Process

1. **Configuration Loading**: Loads configuration from environment variables
2. **Data Layer Initialization**: Initializes data sources and repository
3. **Domain Managers Creation**: Creates all domain managers (TaskList, Dependency, etc.)
4. **Route Initialization**: Sets up all API routes and middleware
5. **Server Start**: Starts listening on configured port
6. **Health Check**: Verifies all data sources are healthy

### Startup Output

When the server starts successfully, you'll see:

```
╔════════════════════════════════════════════════════════════╗
║         REST API Server Started Successfully              ║
╚════════════════════════════════════════════════════════════╝

  Environment:  development
  Port:         3001
  API URL:      http://localhost:3001
  Health:       http://localhost:3001/health
  API Docs:     http://localhost:3001/api

  Data Sources: 1/1 healthy

  Press Ctrl+C to stop the server
```

### Graceful Shutdown

The server handles shutdown signals gracefully:

- **SIGINT** (Ctrl+C): Graceful shutdown
- **SIGTERM**: Graceful shutdown
- **Uncaught Exception**: Logs error and attempts graceful shutdown
- **Unhandled Rejection**: Logs error and attempts graceful shutdown

During shutdown:

1. Stops accepting new connections
2. Completes in-flight requests
3. Closes data source connections
4. Logs shutdown completion

## API Endpoints

### Health Check

```bash
GET /health
GET /api/health
```

Returns server health status and metrics.

### API Information

```bash
GET /api
```

Returns API information and available endpoints.

### API v1 Endpoints

All API endpoints are prefixed with `/api/v1`:

#### List Management

- `POST /api/v1/lists` - Create a new list
- `GET /api/v1/lists` - Get all lists
- `GET /api/v1/lists/:id` - Get a specific list
- `PUT /api/v1/lists/:id` - Update a list
- `DELETE /api/v1/lists/:id` - Delete a list

#### Task Management

- `POST /api/v1/tasks` - Create a new task
- `GET /api/v1/tasks` - Search tasks
- `GET /api/v1/tasks/:id` - Get a specific task
- `PUT /api/v1/tasks/:id` - Update a task
- `DELETE /api/v1/tasks/:id` - Delete a task
- `POST /api/v1/tasks/:id/complete` - Mark task as complete

#### Dependency Management

- `GET /api/v1/dependencies/graph/:listId` - Get dependency graph
- `POST /api/v1/dependencies/validate` - Validate dependencies
- `GET /api/v1/dependencies/ready/:listId` - Get ready tasks
- `POST /api/v1/dependencies/set` - Set task dependencies

#### Exit Criteria

- `GET /api/v1/exit-criteria/task/:taskId` - Get task exit criteria
- `POST /api/v1/exit-criteria/task/:taskId` - Add exit criteria
- `PUT /api/v1/exit-criteria/:id` - Update exit criteria

#### Action Plans

- `GET /api/v1/action-plans/task/:taskId` - Get action plan
- `POST /api/v1/action-plans/task/:taskId` - Create action plan
- `PUT /api/v1/action-plans/:id` - Update action plan
- `POST /api/v1/action-plans/:id/steps/:stepId/complete` - Complete step

#### Notes

- `GET /api/v1/notes/task/:taskId` - Get task notes
- `POST /api/v1/notes/task/:taskId` - Add task note

## Testing the Server

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test API info
curl http://localhost:3001/api

# Create a list
curl -X POST http://localhost:3001/api/v1/lists \
  -H "Content-Type: application/json" \
  -d '{"title": "My Tasks", "description": "Test list"}'

# Get all lists
curl http://localhost:3001/api/v1/lists
```

### Automated Testing

Run the test script:

```bash
./test-api-server.sh
```

This script tests:

- Server startup
- Health endpoint
- API root endpoint
- Graceful shutdown

## Troubleshooting

### Port Already in Use

If you see an error about the port being in use:

```bash
# Use a different port
API_PORT=3002 npm run start:api

# Or find and kill the process using the port
lsof -ti:3001 | xargs kill
```

### Data Source Errors

If data sources fail to initialize:

1. Check the logs for specific error messages
2. Verify data directory permissions
3. Check database connection settings (if using PostgreSQL)
4. Ensure required environment variables are set

### Memory Issues

If you encounter memory issues:

1. Check the health endpoint for memory metrics
2. Adjust Node.js memory limits: `NODE_OPTIONS=--max-old-space-size=4096 npm run start:api`
3. Review logs for memory leak warnings

## Production Deployment

### Recommended Configuration

```bash
# Production environment variables
NODE_ENV=production
API_PORT=3001
LOG_LEVEL=warn
CORS_ORIGINS=https://yourdomain.com

# Start the server
npm run start:api
```

### Process Management

Use a process manager like PM2 for production:

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/app/api-server.js --name task-api

# View logs
pm2 logs task-api

# Restart
pm2 restart task-api

# Stop
pm2 stop task-api
```

### Docker Deployment

Example Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY data ./data

EXPOSE 3001

CMD ["node", "dist/app/api-server.js"]
```

Build and run:

```bash
docker build -t task-api .
docker run -p 3001:3001 -e NODE_ENV=production task-api
```

## Monitoring

### Health Checks

The `/health` endpoint provides:

- Overall health status
- Version information
- Uptime
- Storage status
- Memory usage

### Logging

Logs are written to:

- Console (stdout/stderr)
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

Log format includes:

- Timestamp
- Log level
- Message
- Context (request ID, user info, etc.)

### Metrics

Key metrics to monitor:

- Request rate
- Response time
- Error rate
- Memory usage
- Data source health

## Next Steps

- [API Reference](../api/rest-api-endpoints.md) - Detailed endpoint documentation
- [MCP Server Client](./mcp-server-client.md) - Using the MCP server with the API
- [React UI Client](./react-ui-client.md) - Building the web interface
