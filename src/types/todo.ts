/**
 * Core todo types and interfaces for the MCP Task Manager
 */

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled',
}

export enum Priority {
  CRITICAL = 5,
  HIGH = 4,
  MEDIUM = 3,
  LOW = 2,
  MINIMAL = 1,
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  dependencies: string[];
  estimatedDuration?: number; // minutes
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface TodoList {
  id: string;
  title: string;
  description?: string;
  items: TodoItem[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  context: string;
  isArchived: boolean;
  totalItems: number;
  completedItems: number;
  progress: number; // 0-100 percentage
  analytics: ListAnalytics;
  metadata: Record<string, unknown>;
}

export interface TodoListSummary {
  id: string;
  title: string;
  progress: number;
  totalItems: number;
  completedItems: number;
  lastUpdated: Date;
  context: string;
  isArchived?: boolean;
}

export interface ListAnalytics {
  totalItems: number;
  completedItems: number;
  inProgressItems: number;
  blockedItems: number;
  progress: number; // Percentage (0-100)
  averageCompletionTime: number; // Minutes
  estimatedTimeRemaining: number; // Minutes
  velocityMetrics: {
    itemsPerDay: number;
    completionRate: number;
  };
  complexityDistribution: Record<number, number>;
  tagFrequency: Record<string, number>;
  dependencyGraph: DependencyNode[];
}

export interface DependencyNode {
  id: string;
  title: string;
  dependencies: string[];
  dependents: string[];
  depth: number;
  isBlocked: boolean;
}

export interface GetTodoListFilters {
  status?: TaskStatus | TaskStatus[] | undefined;
  priority?: Priority | Priority[] | undefined;
  tags?: string[] | undefined;
  assignee?: string | undefined;
  dueDateBefore?: Date | undefined;
  dueDateAfter?: Date | undefined;
  createdBefore?: Date | undefined;
  createdAfter?: Date | undefined;
  hasDescription?: boolean | undefined;
  hasDependencies?: boolean | undefined;
  estimatedDurationMin?: number | undefined;
  estimatedDurationMax?: number | undefined;
  searchText?: string | undefined;
}

export interface GetTodoListSorting {
  field:
    | 'title'
    | 'status'
    | 'priority'
    | 'createdAt'
    | 'updatedAt'
    | 'completedAt'
    | 'estimatedDuration';
  direction: 'asc' | 'desc';
}

export interface GetTodoListPagination {
  limit?: number | undefined;
  offset?: number | undefined;
}
