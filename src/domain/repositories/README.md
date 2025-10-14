# Repository Interfaces

This directory contains repository interfaces that define the contract for data access operations in the MCP Task Manager. These interfaces follow Domain-Driven Design principles and provide a clean separation between domain logic and data persistence.

## Overview

Repositories provide a collection-like interface for accessing domain aggregates (TaskLists and Tasks). They abstract away the details of data storage, allowing the domain layer to remain independent of infrastructure concerns.

## Key Principles

### 1. Domain-Driven Design

- Repositories are defined in the domain layer
- They work with domain entities (TaskList, Task)
- They enforce business rules and invariants
- They provide collection-like semantics

### 2. Abstraction

- Interfaces define contracts, not implementations
- Multiple storage backends can implement the same interface
- Domain logic doesn't depend on specific storage technology
- Easy to swap implementations for testing or deployment

### 3. Consistency

- All operations maintain data integrity
- Atomic operations where possible
- Proper error handling and recovery
- Transaction support where applicable

## Repository Interfaces

### ITaskListRepository

The primary repository for TaskList aggregates. Provides operations for:

- **CRUD Operations**: Create, read, update, delete TaskLists
- **Search & Query**: Complex queries with filtering, sorting, pagination
- **Summaries**: Lightweight list views without full task details
- **Health Checks**: Verify repository operational status

**Key Methods:**

```typescript
save(list: TaskList): Promise<void>
findById(id: string, options?: FindOptions): Promise<TaskList | null>
findAll(options?: FindOptions): Promise<TaskList[]>
search(query: SearchQuery): Promise<SearchResult<TaskList>>
searchSummaries(query: SearchQuery): Promise<SearchResult<TaskListSummary>>
delete(id: string, permanent: boolean): Promise<void>
exists(id: string): Promise<boolean>
count(query?: SearchQuery): Promise<number>
healthCheck(): Promise<boolean>
```

### ITaskRepository

Task-centric repository for operations that span multiple lists. Provides:

- **Cross-List Search**: Find tasks across all TaskLists
- **Dependency Analysis**: Find dependents and dependencies
- **Ready Tasks**: Find tasks ready to work on
- **Bulk Operations**: Efficient batch updates and deletes
- **Context Inclusion**: Optionally include parent list information

**Key Methods:**

```typescript
findById(taskId: string, includeListContext?: boolean): Promise<TaskWithContext | null>
search(query: TaskSearchQuery): Promise<SearchResult<TaskWithContext>>
create(options: CreateTaskOptions): Promise<TaskWithContext>
update(options: UpdateTaskOptions): Promise<TaskWithContext>
delete(listId: string, taskId: string): Promise<void>
findDependents(taskId: string): Promise<TaskWithContext[]>
findDependencies(taskId: string): Promise<TaskWithContext[]>
findReadyTasks(listId?: string, projectTag?: string): Promise<TaskWithContext[]>
findBlockedTasks(listId?: string, projectTag?: string): Promise<TaskWithContext[]>
bulkUpdateStatus(taskIds: Array<{listId: string; taskId: string}>, status: TaskStatus): Promise<BulkOperationResult>
bulkDelete(taskIds: Array<{listId: string; taskId: string}>): Promise<BulkOperationResult>
```

## Query Types

### FindOptions

Options for finding TaskLists with filtering and pagination:

```typescript
interface FindOptions {
  includeArchived?: boolean;
  includeCompleted?: boolean;
  filters?: TaskFilters;
  sorting?: SortOptions;
  pagination?: PaginationOptions;
}
```

### TaskFilters

Comprehensive filtering for tasks:

```typescript
interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: Priority | Priority[];
  tags?: string[];
  tagOperator?: 'AND' | 'OR';
  assignee?: string;
  dueDateBefore?: Date;
  dueDateAfter?: Date;
  createdBefore?: Date;
  createdAfter?: Date;
  hasDescription?: boolean;
  hasDependencies?: boolean;
  estimatedDurationMin?: number;
  estimatedDurationMax?: number;
  searchText?: string;
}
```

### SearchQuery

Complex search queries for TaskLists:

```typescript
interface SearchQuery {
  text?: string;
  projectTag?: string;
  status?: 'active' | 'completed' | 'all';
  includeArchived?: boolean;
  taskStatus?: TaskStatus[];
  taskPriority?: Priority[];
  taskTags?: string[];
  dateRange?: { start: Date; end: Date };
  sorting?: SortOptions;
  pagination?: PaginationOptions;
}
```

### SearchResult

Paginated search results with metadata:

```typescript
interface SearchResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  pagination?: {
    offset: number;
    limit: number;
  };
}
```

## Expected Behaviors

### Idempotency

- `save()` operations should be idempotent
- Calling save multiple times with same data has same effect as once
- No duplicate entries or side effects

### Error Handling

- `findById()` returns `null` if not found (doesn't throw)
- Other operations throw descriptive errors on failure
- Errors should include context (operation, entity ID, reason)

### Atomicity

- Operations should be atomic where possible
- Partial updates should be avoided
- Use transactions for multi-step operations

### Concurrency

- Implementations should handle concurrent access safely
- Consider optimistic locking for updates
- Prevent race conditions and data corruption

### Performance

- Queries should be optimized with indexes
- Support pagination for large result sets
- Cache frequently accessed data where appropriate
- Use connection pooling for database backends

## Implementation Guidelines

### 1. Storage Backend Adapter

Create an adapter that implements the repository interface:

```typescript
export class TaskListRepositoryAdapter implements ITaskListRepository {
  constructor(private readonly storage: StorageBackend) {}

  async save(list: TaskList): Promise<void> {
    await this.storage.save(list.id, list, { validate: true });
  }

  async findById(id: string, options?: FindOptions): Promise<TaskList | null> {
    return await this.storage.load(id, {
      includeArchived: options?.includeArchived,
    });
  }

  // ... implement other methods
}
```

### 2. Multi-Source Repository

For aggregating data from multiple sources:

```typescript
export class MultiSourceTaskListRepository implements ITaskListRepository {
  constructor(
    private readonly router: DataSourceRouter,
    private readonly aggregator: MultiSourceAggregator
  ) {}

  async search(query: SearchQuery): Promise<SearchResult<TaskList>> {
    return await this.aggregator.aggregateLists(query);
  }

  // ... implement other methods
}
```

### 3. Testing with Mock Repository

Create mock implementations for testing:

```typescript
export class MockTaskListRepository implements ITaskListRepository {
  private lists = new Map<string, TaskList>();

  async save(list: TaskList): Promise<void> {
    this.lists.set(list.id, list);
  }

  async findById(id: string): Promise<TaskList | null> {
    return this.lists.get(id) ?? null;
  }

  // ... implement other methods
}
```

## Migration Path

### Current Architecture

```
TaskListManager → StorageBackend (direct coupling)
```

### Target Architecture

```
TaskListManager → ITaskListRepository → StorageBackend (via adapter)
```

### Migration Steps

1. ✅ Define repository interfaces (this step)
2. Create repository adapter wrapping existing StorageBackend
3. Update TaskListManager to accept ITaskListRepository
4. Replace direct storage calls with repository methods
5. Verify backward compatibility with existing tests
6. Implement multi-source repository for data aggregation

## Benefits

### Testability

- Easy to create mock repositories for unit tests
- Test domain logic without real storage
- Fast, isolated tests

### Flexibility

- Swap storage backends without changing domain code
- Support multiple storage types simultaneously
- Easy to add new storage implementations

### Maintainability

- Clear separation of concerns
- Domain logic independent of infrastructure
- Easier to understand and modify

### Scalability

- Support for distributed caching
- Connection pooling and optimization
- Multi-source data aggregation

## Related Documentation

- [Design Document](../../../.kiro/specs/multi-interface-access/design.md) - Overall architecture
- [Requirements](../../../.kiro/specs/multi-interface-access/requirements.md) - Feature requirements
- [Storage Types](../../shared/types/storage.ts) - Current storage interfaces
- [Task Types](../../shared/types/task.ts) - Domain entity definitions
