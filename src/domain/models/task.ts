/**
 * Task domain model
 * Represents a single task with all its properties and metadata
 */

/**
 * Represents a single task with all its properties and metadata
 *
 * @interface Task
 */
export interface Task {
  id: string;
  listId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  dependencies: string[];
  estimatedDuration?: number;
  tags: string[];
  metadata: Record<string, unknown>;

  // Agent prompt system fields
  agentPromptTemplate?: string; // Max 10,000 characters
  actionPlan?: ActionPlan;
  implementationNotes: ImplementationNote[];
  exitCriteria: ExitCriteria[];

  // Dependency blocking information
  blockReason?: BlockReason;
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled',
}

export enum Priority {
  MINIMAL = 1,
  LOW = 2,
  MEDIUM = 3,
  HIGH = 4,
  CRITICAL = 5,
}

/**
 * Represents an action plan for a task with steps
 */
export interface ActionPlan {
  steps: ActionStep[];
  estimatedDuration?: number;
}

/**
 * Represents a single step in an action plan
 */
export interface ActionStep {
  id: string;
  description: string;
  completed: boolean;
  estimatedDuration?: number;
}

/**
 * Represents an implementation note attached to a task or list
 */
export interface ImplementationNote {
  id: string;
  content: string;
  createdAt: Date;
  author?: string;
  type: 'note' | 'warning' | 'task' | 'decision';
}

/**
 * Represents exit criteria that must be met to complete a task
 */
export interface ExitCriteria {
  id: string;
  description: string;
  isMet: boolean;
  notes?: string;
  updatedAt: Date;
}

/**
 * Represents the reason why a task is blocked by dependencies
 */
export interface BlockReason {
  blockedBy: string[];
  details: Array<{
    taskId: string;
    taskTitle: string;
    status: TaskStatus;
    estimatedCompletion?: Date;
  }>;
}

// Status transition rules
export const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PENDING]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.IN_PROGRESS]: [
    TaskStatus.COMPLETED,
    TaskStatus.BLOCKED,
    TaskStatus.CANCELLED,
  ],
  [TaskStatus.BLOCKED]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.COMPLETED]: [], // Terminal state
  [TaskStatus.CANCELLED]: [TaskStatus.PENDING], // Can be reactivated
};

// Tag validation pattern - supports emoji, unicode (including combining marks), uppercase, numbers, hyphens, underscores
export const TAG_VALIDATION_PATTERN =
  /^[\p{L}\p{M}\p{N}\p{Emoji_Presentation}_-]+$/u;
export const TAG_MAX_LENGTH = 50;

// Priority validation
export const PRIORITY_MIN = 1;
export const PRIORITY_MAX = 5;

// Agent prompt template validation
export const AGENT_PROMPT_TEMPLATE_MAX_LENGTH = 10000;
