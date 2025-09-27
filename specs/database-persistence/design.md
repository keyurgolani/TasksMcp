# Design Document

## Overview

The database persistence feature adds PostgreSQL support to the MCP Task Manager while maintaining full backward compatibility with the existing file-based storage system. This design implements a storage abstraction layer that allows seamless switching between storage backends through configuration, with automatic database provisioning for development environments.

The system maintains the existing API interface and functionality while providing enterprise-grade data persistence capabilities. The design prioritizes simple external database connectivity, data consistency, and developer experience through automated local PostgreSQL setup.

## Architecture

### Storage Abstraction Layer

The design introduces a storage abstraction pattern that decouples the domain logic from specific storage implementations:

```
Domain Layer (unchanged)
    ↓
Storage Interface (new abstraction)
    ↓
Storage Factory (new component)
    ↓
┌─────────────────┬─────────────────┐
│  File Storage   │ PostgreSQL      │
│  (existing)     │ Storage (new)   │
└─────────────────┴─────────────────┘
```

**Design Rationale**: This abstraction ensures that existing domain logic remains unchanged while enabling multiple storage backends. The factory pattern allows runtime selection of storage implementation based on configuration.

### Configuration Strategy

The system uses a hierarchical configuration approach:

1. **Primary**: `MCP_DATABASE_URL` (full connection string)
2. **Secondary**: Individual environment variables (`MCP_DB_HOST`, `MCP_DB_PORT`, etc.)
3. **Fallback**: File-based storage using existing `MCP_TASKS_DIR`

**Design Rationale**: This approach provides flexibility for different deployment scenarios while maintaining backward compatibility. The precedence order ensures that explicit database URLs take priority over individual parameters.

### Expected Database Schema

The system expects an external PostgreSQL database with the following schema structure:

```sql
-- Todo Lists
CREATE TABLE todo_lists (
    id UUID PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    project_tag VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived BOOLEAN DEFAULT FALSE
);

-- Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    list_id UUID NOT NULL REFERENCES todo_lists(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    estimated_duration INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Task Dependencies
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, depends_on_task_id)
);

-- Task Tags
CREATE TABLE task_tags (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, tag)
);
```

**Design Rationale**: The system assumes the external database administrator has already created the required schema. This approach simplifies deployment and allows integration with existing database infrastructure and managed services.

## Components and Interfaces

### Storage Interface

```typescript
interface StorageBackend {
  // List operations
  createList(list: TodoList): Promise<TodoList>;
  getList(id: string): Promise<TodoList | null>;
  updateList(id: string, updates: Partial<TodoList>): Promise<TodoList>;
  deleteList(id: string): Promise<void>;
  getAllLists(options?: ListQueryOptions): Promise<TodoList[]>;
  
  // Task operations
  addTask(listId: string, task: Task): Promise<Task>;
  updateTask(listId: string, taskId: string, updates: Partial<Task>): Promise<Task>;
  removeTask(listId: string, taskId: string): Promise<void>;
  getTasks(listId: string, options?: TaskQueryOptions): Promise<Task[]>;
  
  // Dependency operations
  setTaskDependencies(listId: string, taskId: string, dependencyIds: string[]): Promise<void>;
  getTaskDependencies(listId: string, taskId: string): Promise<string[]>;
  
  // Health and maintenance
  healthCheck(): Promise<HealthStatus>;
  backup?(): Promise<BackupResult>;
  cleanup?(): Promise<void>;
}
```

### PostgreSQL Storage Implementation

```typescript
class PostgreSQLStorage implements StorageBackend {
  private pool: Pool;
  
  constructor(config: DatabaseConfig) {
    this.pool = new Pool(config);
  }
  
  async initialize(): Promise<void> {
    await this.validateConnection();
    await this.validateSchema();
  }
  
  private async validateSchema(): Promise<void> {
    // Verify required tables exist
    const requiredTables = ['todo_lists', 'tasks', 'task_dependencies', 'task_tags'];
    for (const table of requiredTables) {
      await this.verifyTableExists(table);
    }
  }
}
```

### Storage Factory

```typescript
class StorageFactory {
  static async createStorage(config: AppConfig): Promise<StorageBackend> {
    if (config.database?.url || config.database?.host) {
      const dbStorage = new PostgreSQLStorage(config.database);
      await dbStorage.initialize();
      return dbStorage;
    }
    
    return new FileStorage(config.storage.directory);
  }
}
```

**Design Rationale**: The factory pattern centralizes storage backend selection logic and ensures proper initialization. The async factory method allows for database connection validation and schema setup during startup.

### Schema Validation

```typescript
class SchemaValidator {
  async validateRequiredTables(pool: Pool): Promise<void> {
    const requiredTables = [
      'todo_lists',
      'tasks', 
      'task_dependencies',
      'task_tags'
    ];
    
    for (const tableName of requiredTables) {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )`,
        [tableName]
      );
      
      if (!result.rows[0].exists) {
        throw new Error(`Required table '${tableName}' not found in database`);
      }
    }
  }
}
```

**Design Rationale**: Schema validation ensures the external database has the required structure without attempting to modify it. This approach respects database administrator control while providing clear error messages for missing components.

## Data Models

### Database Configuration Model

```typescript
interface DatabaseConfig {
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  poolSize?: number;
  connectionTimeout?: number;
  queryTimeout?: number;
}
```

### Health Status Model

```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  storage: {
    type: 'file' | 'postgresql';
    connected: boolean;
    responseTime?: number;
    lastCheck: Date;
  };
  details?: {
    error?: string;
    connectionPool?: {
      total: number;
      idle: number;
      active: number;
    };
  };
}
```

**Design Rationale**: The health status model provides comprehensive monitoring information for both storage backends, enabling effective troubleshooting and monitoring.

## Error Handling

### Database-Specific Error Handling

```typescript
class DatabaseErrorHandler {
  static handlePostgreSQLError(error: any): McpError {
    if (error.code === '23505') { // Unique violation
      return new ValidationError('Duplicate entry detected');
    }
    if (error.code === '23503') { // Foreign key violation
      return new ValidationError('Referenced record not found');
    }
    if (error.code === 'ECONNREFUSED') {
      return new ConnectionError('Database connection refused');
    }
    
    return new InternalError(`Database error: ${error.message}`);
  }
}
```

### Connection Resilience

```typescript
class ConnectionManager {
  private retryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  };
  
  async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    return withRetry(operation, this.retryConfig);
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      logger.warn('Database health check failed', { error });
      return false;
    }
  }
}
```

**Design Rationale**: Robust error handling ensures graceful degradation and provides actionable error messages. The retry mechanism handles transient connection issues common in distributed environments.

## Testing Strategy

### Unit Testing Approach

1. **Storage Interface Tests**: Verify all storage implementations conform to the interface contract
2. **PostgreSQL Storage Tests**: Test database operations with an in-memory PostgreSQL instance
3. **Migration Tests**: Verify schema migrations work correctly and are idempotent
4. **Error Handling Tests**: Ensure proper error translation and recovery

### Integration Testing Strategy

1. **Storage Backend Switching**: Test seamless switching between file and database storage
2. **Development Environment**: Verify automated PostgreSQL setup and configuration
3. **Performance Testing**: Compare performance between storage backends
4. **Failure Recovery**: Test behavior during database connection failures

### Test Database Setup

```typescript
// Test configuration for isolated database testing
const testConfig = {
  database: {
    host: 'localhost',
    port: 5433, // Non-conflicting port
    database: 'mcp_task_manager_test',
    username: 'test_user',
    password: 'test_password'
  }
};
```

**Design Rationale**: Isolated test databases prevent interference with development data and enable parallel test execution. The test configuration uses non-standard ports to avoid conflicts.

### Development Environment Setup

The design includes automated development environment provisioning:

```bash
# Development scripts
scripts/dev-db-start.sh    # Start PostgreSQL container with schema
scripts/dev-db-stop.sh     # Stop PostgreSQL container
scripts/dev-db-reset.sh    # Reset development database
scripts/dev-db-init.sh     # Initialize schema in development database
```

**Design Rationale**: Automated development setup reduces friction for contributors and ensures consistent development environments. The development scripts create the required schema automatically for local development while production deployments use external databases with pre-existing schemas.

## Performance Considerations

### Database Indexing Strategy

```sql
-- Performance indexes
CREATE INDEX idx_tasks_list_id ON tasks(list_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
CREATE INDEX idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX idx_task_tags_tag ON task_tags(tag);
```

### Connection Pooling

```typescript
const poolConfig = {
  min: 2,           // Minimum connections
  max: 10,          // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  acquireTimeoutMillis: 60000
};
```

**Design Rationale**: Appropriate indexing ensures query performance scales with data size. Connection pooling optimizes resource usage and handles concurrent requests efficiently.

## Security Considerations

### Connection Security

- **SSL/TLS encryption** for database connections in production
- **Environment variable protection** for sensitive configuration
- **Connection string validation** to prevent injection attacks
- **Least privilege access** for database user accounts

### Data Protection

- **Input validation** using existing Zod schemas
- **SQL injection prevention** through parameterized queries
- **Audit logging** for data modification operations
- **Backup encryption** for data at rest protection

**Design Rationale**: Security measures are layered to provide defense in depth while maintaining performance and usability.