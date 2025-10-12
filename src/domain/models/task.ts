/**
 * Task domain model (formerly TodoItem)
 * Represents a single task with all its properties and metadata
 */

export interface Task {
  id: string;
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

  // Enhanced fields for agent prompt system
  agentPromptTemplate?: string; // Max 10,000 characters
  actionPlan?: ActionPlan;
  implementationNotes: ImplementationNote[];
  exitCriteria: ExitCriteria[];
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

export interface ActionPlan {
  steps: ActionStep[];
  estimatedDuration?: number;
  complexity?: 'simple' | 'moderate' | 'complex';
}

export interface ActionStep {
  id: string;
  description: string;
  completed: boolean;
  estimatedDuration?: number;
}

export interface ImplementationNote {
  id: string;
  content: string;
  createdAt: Date;
  author?: string;
  type: 'note' | 'warning' | 'todo' | 'decision';
}

export interface ExitCriteria {
  id: string;
  description: string;
  isMet: boolean;
  notes?: string;
  updatedAt: Date;
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

// Tag validation pattern - supports emoji, unicode, uppercase, numbers, hyphens, underscores
export const TAG_VALIDATION_PATTERN = /^[\p{L}\p{N}\p{Emoji}_-]+$/u;
export const TAG_MAX_LENGTH = 50;

// Priority validation
export const PRIORITY_MIN = 1;
export const PRIORITY_MAX = 5;

// Agent prompt template validation
export const AGENT_PROMPT_TEMPLATE_MAX_LENGTH = 10000;
