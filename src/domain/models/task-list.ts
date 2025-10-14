/**
 * TaskList domain model
 * Represents a collection of tasks with metadata and progress tracking
 */

import { Task } from './task';
import { ImplementationNote } from './task';

/**
 * TaskList domain model
 * Represents a collection of tasks with metadata and progress tracking
 */
export interface TaskList {
  id: string;
  title: string;
  description?: string;
  items: Task[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  projectTag: string;
  totalItems: number;
  completedItems: number;
  progress: number;
  metadata: Record<string, unknown>;
  implementationNotes: ImplementationNote[];
}

// Validation constants
export const TASK_LIST_TITLE_MAX_LENGTH = 1000;
export const TASK_LIST_DESCRIPTION_MAX_LENGTH = 5000;
export const PROJECT_TAG_MAX_LENGTH = 250;
export const PROJECT_TAG_PATTERN = /^[a-z0-9-]+$/;
