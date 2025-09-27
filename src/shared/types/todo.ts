/**
 * Core todo types and interfaces for the MCP Task Manager
 * 
 * Defines the complete data model for todo lists, tasks, and related entities.
 * Includes features like action plans, implementation notes, and analytics.
 */

/**
 * Task status enumeration
 * Represents the current state of a todo item
 */
export enum TaskStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress", 
  COMPLETED = "completed",
  BLOCKED = "blocked",
  CANCELLED = "cancelled",
}

/**
 * Priority levels for tasks
 * Numeric values allow for easy sorting and comparison
 */
export enum Priority {
  CRITICAL = 5,
  HIGH = 4,
  MEDIUM = 3,
  LOW = 2,
  MINIMAL = 1,
}

/**
 * Individual step within an action plan
 * Represents a specific action item with its own status and notes
 */
export interface ActionStep {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  completedAt?: Date;
  notes?: string;
  order: number;
}

/**
 * Structured action plan for complex tasks
 * Breaks down tasks into manageable steps with progress tracking
 */
export interface ActionPlan {
  id: string;
  content: string; // Structured text with steps
  steps: ActionStep[];
  createdAt: Date;
  updatedAt: Date;
  version: number; // For tracking plan revisions
}

/**
 * Implementation note for tasks or lists
 * Captures contextual information, decisions, and learnings
 */
export interface ImplementationNote {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author?: string; // For future multi-user support
  type: "general" | "technical" | "decision" | "learning";
}

/**
 * Exit criteria for task completion
 * Defines specific conditions that must be met for a task to be considered complete
 */
export interface ExitCriteria {
  id: string;
  description: string;
  isMet: boolean;
  metAt?: Date;
  notes?: string;
  order: number;
}

/**
 * Individual todo item/task
 * Core entity representing a single task with all its properties and metadata
 */
export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  dependencies: string[]; // IDs of tasks this item depends on
  estimatedDuration?: number; // Duration in minutes
  tags: string[]; // Categorization tags
  metadata: Record<string, unknown>; // Extensible metadata

  // v2 fields - AI-powered features
  actionPlan?: ActionPlan; // Structured breakdown for complex tasks
  implementationNotes: ImplementationNote[]; // Contextual notes and decisions
  exitCriteria: ExitCriteria[]; // Completion criteria that must be met
}

/**
 * Todo list container
 * Groups related tasks with comprehensive analytics and project management features
 */
export interface TodoList {
  id: string;
  title: string;
  description?: string;
  items: TodoItem[]; // All tasks in this list
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date; // When all tasks were completed
  context: string; // Deprecated in favor of projectTag
  isArchived: boolean; // Whether list is archived
  totalItems: number; // Cached count for performance
  completedItems: number; // Cached count for performance
  progress: number; // Completion percentage (0-100)
  analytics: ListAnalytics; // Comprehensive analytics data
  metadata: Record<string, unknown>; // Extensible metadata

  // v2 fields - Project management features
  projectTag: string; // Project/context identifier (replaces context)
  implementationNotes: ImplementationNote[]; // List-level notes
  cleanupSuggested?: Date; // When cleanup was last suggested
  cleanupDeclined?: Date; // When cleanup was last declined
}

export interface TodoListSummary {
  id: string;
  title: string;
  progress: number;
  totalItems: number;
  completedItems: number;
  lastUpdated: Date;
  context: string; // Deprecated, use projectTag
  projectTag: string; // v2 field
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
    | "title"
    | "status"
    | "priority"
    | "createdAt"
    | "updatedAt"
    | "completedAt"
    | "estimatedDuration";
  direction: "asc" | "desc";
}

export interface GetTodoListPagination {
  limit?: number | undefined;
  offset?: number | undefined;
}
