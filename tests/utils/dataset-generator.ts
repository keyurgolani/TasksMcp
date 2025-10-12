/**
 * Dataset generator for testing and performance benchmarks
 */

import { v4 as uuidv4 } from 'uuid';

import { TaskStatus } from '../../src/shared/types/task.js';

import type {
  TaskList,
  Task,
  Priority,
  ImplementationNote,
} from '../../src/shared/types/task.js';

export interface DatasetOptions {
  listCount?: number;
  tasksPerList?: number;
  notesPerTask?: number;
  projectTags?: string[];
}

export class DefaultDatasetGenerator {
  private readonly priorities: Priority[] = [1, 2, 3, 4, 5];
  private readonly statuses: TaskStatus[] = [
    TaskStatus.PENDING,
    TaskStatus.IN_PROGRESS,
    TaskStatus.COMPLETED,
    TaskStatus.BLOCKED,
    TaskStatus.CANCELLED,
  ];

  private readonly sampleTitles = [
    'Implement user authentication',
    'Fix database connection issues',
    'Update documentation',
    'Refactor legacy code',
    'Add unit tests',
    'Optimize performance',
    'Design new UI components',
    'Setup CI/CD pipeline',
    'Review security vulnerabilities',
    'Migrate to new framework',
  ];

  private readonly sampleDescriptions = [
    'This task requires careful planning and execution',
    'High priority item that needs immediate attention',
    'Part of the ongoing refactoring effort',
    'Critical for the next release',
    'Technical debt that should be addressed',
    'User-requested feature enhancement',
    'Bug fix for production issue',
    'Infrastructure improvement',
    'Code quality improvement',
    'Performance optimization task',
  ];

  private readonly sampleNotes = [
    'Need to consider edge cases',
    'Requires coordination with backend team',
    'Should follow existing patterns',
    'May need additional testing',
    'Consider performance implications',
    'Check compatibility with older versions',
    'Document any breaking changes',
    'Review with security team',
    'Update related documentation',
    'Consider user experience impact',
  ];

  /**
   * Generate a dataset of task lists
   */
  generateDataset(options: DatasetOptions = {}): TaskList[] {
    const {
      listCount = 10,
      tasksPerList = 5,
      notesPerTask = 2,
      projectTags = ['default', 'frontend', 'backend', 'mobile', 'devops'],
    } = options;

    const lists: TaskList[] = [];

    for (let i = 0; i < listCount; i++) {
      const list = this.generateTaskList(
        i,
        tasksPerList,
        notesPerTask,
        projectTags
      );
      lists.push(list);
    }

    return lists;
  }

  /**
   * Generate a single task list
   */
  generateTaskList(
    index: number,
    taskCount: number,
    notesPerTask: number,
    projectTags: string[]
  ): TaskList {
    const listId = uuidv4();
    const now = new Date();
    const createdAt = new Date(
      now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000
    ); // Random date within last 30 days

    const items = this.generateTasks(taskCount, notesPerTask);
    const completedItems = items.filter(
      item => item.status === 'completed'
    ).length;
    const progress =
      items.length > 0 ? Math.round((completedItems / items.length) * 100) : 0;

    return {
      id: listId,
      title: `Test List ${index + 1}`,
      description: `Generated test list for performance testing - ${this.getRandomElement(this.sampleDescriptions)}`,
      items,
      createdAt,
      updatedAt: new Date(
        createdAt.getTime() +
          Math.random() * (now.getTime() - createdAt.getTime())
      ),
      totalItems: items.length,
      completedItems,
      progress,
      projectTag: this.getRandomElement(projectTags),
      context: this.getRandomElement(projectTags), // For backward compatibility
      isArchived: Math.random() < 0.1, // 10% chance of being archived
      analytics: {
        totalItems: items.length,
        completedItems,
        inProgressItems: items.filter(
          item => item.status === TaskStatus.IN_PROGRESS
        ).length,
        blockedItems: items.filter(item => item.status === TaskStatus.BLOCKED)
          .length,
        progress,
        averageCompletionTime: Math.floor(Math.random() * 60),
        estimatedTimeRemaining: Math.floor(Math.random() * 120),
        velocityMetrics: {
          itemsPerDay: Math.random() * 5,
          completionRate: progress / 100,
        },
        complexityDistribution: {},
        tagFrequency: {},
        dependencyGraph: [],
      },
      metadata: {},
      implementationNotes: [],
    };
  }

  /**
   * Generate tasks for a list
   */
  generateTasks(count: number, notesPerTask: number): Task[] {
    const tasks: Task[] = [];

    for (let i = 0; i < count; i++) {
      const task = this.generateTask(i, notesPerTask);
      tasks.push(task);
    }

    return tasks;
  }

  /**
   * Generate a single task
   */
  generateTask(index: number, notesCount: number): Task {
    const taskId = uuidv4();
    const now = new Date();
    const createdAt = new Date(
      now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000
    ); // Random date within last 7 days

    const status = this.getRandomElement(this.statuses);
    const completedAt =
      status === TaskStatus.COMPLETED
        ? new Date(
            createdAt.getTime() +
              Math.random() * (now.getTime() - createdAt.getTime())
          )
        : undefined;

    return {
      id: taskId,
      title: `${this.getRandomElement(this.sampleTitles)} ${index + 1}`,
      description: this.getRandomElement(this.sampleDescriptions),
      status,
      priority: this.getRandomElement(this.priorities),
      tags: this.generateTags(),
      createdAt,
      updatedAt: new Date(
        createdAt.getTime() +
          Math.random() * (now.getTime() - createdAt.getTime())
      ),
      ...(completedAt && { completedAt }),
      estimatedDuration: Math.floor(Math.random() * 480) + 30, // 30 minutes to 8 hours
      dependencies: [],
      metadata: {},
      implementationNotes: this.generateNotes(notesCount),
    };
  }

  /**
   * Generate notes for a task
   */
  generateNotes(count: number): ImplementationNote[] {
    const notes: ImplementationNote[] = [];

    for (let i = 0; i < count; i++) {
      const noteTypes = [
        'general',
        'technical',
        'decision',
        'learning',
      ] as const;
      notes.push({
        id: uuidv4(),
        content: this.getRandomElement(this.sampleNotes),
        type: this.getRandomElement(noteTypes),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return notes;
  }

  /**
   * Generate random tags for a task
   */
  generateTags(): string[] {
    const allTags = [
      'urgent',
      'bug',
      'feature',
      'refactor',
      'test',
      'docs',
      'performance',
      'security',
    ];
    const tagCount = Math.floor(Math.random() * 3) + 1; // 1-3 tags
    const selectedTags: string[] = [];

    for (let i = 0; i < tagCount; i++) {
      const tag = this.getRandomElement(allTags);
      if (!selectedTags.includes(tag)) {
        selectedTags.push(tag);
      }
    }

    return selectedTags;
  }

  /**
   * Get a random element from an array
   */
  private getRandomElement<T>(array: readonly T[]): T {
    const element = array[Math.floor(Math.random() * array.length)];
    if (element === undefined) {
      throw new Error('Array is empty');
    }
    return element;
  }

  /**
   * Generate large dataset for performance testing
   */
  generateLargeDataset(): TaskList[] {
    return this.generateDataset({
      listCount: 100,
      tasksPerList: 20,
      notesPerTask: 3,
      projectTags: [
        'frontend',
        'backend',
        'mobile',
        'devops',
        'design',
        'qa',
        'docs',
        'research',
      ],
    });
  }

  /**
   * Generate small dataset for unit testing
   */
  generateSmallDataset(): TaskList[] {
    return this.generateDataset({
      listCount: 3,
      tasksPerList: 2,
      notesPerTask: 1,
      projectTags: ['test', 'demo'],
    });
  }
}
