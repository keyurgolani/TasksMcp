/**
 * Unit tests for ProjectManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ProjectManager } from '../../../../src/domain/lists/project-manager.js';
import { TaskStatus, Priority } from '../../../../src/shared/types/task.js';

import type { StorageBackend } from '../../../../src/shared/types/storage.js';
import type { TaskList } from '../../../../src/shared/types/task.js';

// Mock storage backend
const createMockStorage = (): StorageBackend => ({
  initialize: vi.fn().mockResolvedValue(undefined),
  save: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue(null),
  delete: vi.fn().mockResolvedValue(undefined),
  list: vi.fn().mockResolvedValue([]),
  healthCheck: vi.fn().mockResolvedValue(true),
  shutdown: vi.fn().mockResolvedValue(undefined),
  loadAllData: vi.fn().mockResolvedValue({ version: '2.0', taskLists: [] }),
  saveAllData: vi.fn().mockResolvedValue(undefined),
  needsMigration: vi.fn().mockResolvedValue(false),
});

// Helper to create test task lists
const createTestList = (
  id: string,
  projectTag: string,
  context?: string,
  totalTasks = 5,
  completedTasks = 2
): TaskList => ({
  id,
  title: `Test List ${id}`,
  description: 'Test description',
  items: Array.from({ length: totalTasks }, (_, i) => ({
    id: `item-${id}-${i}`,
    title: `Task ${i + 1}`,
    status: i < completedTasks ? TaskStatus.COMPLETED : TaskStatus.PENDING,
    priority: Priority.MEDIUM,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    dependencies: [],
    tags: [],
    metadata: {},
    implementationNotes: [],
  })),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  context: context || projectTag,
  totalItems: totalTasks,
  completedItems: completedTasks,
  progress: Math.round((completedTasks / totalTasks) * 100),
  analytics: {
    totalItems: totalTasks,
    completedItems: completedTasks,
    inProgressItems: 0,
    blockedItems: 0,
    progress: Math.round((completedTasks / totalTasks) * 100),
    averageCompletionTime: 0,
    estimatedTimeRemaining: 0,
    velocityMetrics: { itemsPerDay: 0, completionRate: 0 },
    complexityDistribution: {},
    tagFrequency: {},
    dependencyGraph: [],
  },
  metadata: {},
  projectTag,
  implementationNotes: [],
});

describe('ProjectManager', () => {
  let projectManager: ProjectManager;
  let mockStorage: StorageBackend;

  beforeEach(() => {
    mockStorage = createMockStorage();
    projectManager = new ProjectManager(mockStorage);
  });

  describe('validateProjectTag', () => {
    it('should validate correct project tags', () => {
      expect(projectManager.validateProjectTag('valid-project')).toBe(true);
      expect(projectManager.validateProjectTag('project_123')).toBe(true);
      expect(projectManager.validateProjectTag('Project-Name')).toBe(true);
      expect(projectManager.validateProjectTag('a')).toBe(true);
      expect(projectManager.validateProjectTag('a'.repeat(50))).toBe(true);
    });

    it('should reject invalid project tags', () => {
      expect(projectManager.validateProjectTag('')).toBe(false);
      expect(projectManager.validateProjectTag('project with spaces')).toBe(
        false
      );
      expect(projectManager.validateProjectTag('project@special')).toBe(false);
      expect(projectManager.validateProjectTag('a'.repeat(51))).toBe(false);

      expect(projectManager.validateProjectTag(null as any)).toBe(false);

      expect(projectManager.validateProjectTag(undefined as any)).toBe(false);

      expect(projectManager.validateProjectTag(123 as any)).toBe(false);
    });
  });

  describe('getDefaultProjectTag', () => {
    it('should return the default project tag', () => {
      expect(projectManager.getDefaultProjectTag()).toBe('default');
    });
  });

  describe('sanitizeProjectTag', () => {
    it('should sanitize invalid characters', () => {
      expect(projectManager.sanitizeProjectTag('project with spaces')).toBe(
        'project-with-spaces'
      );
      expect(projectManager.sanitizeProjectTag('project@#$%')).toBe(
        'project----'
      );
      expect(projectManager.sanitizeProjectTag('Project-Name')).toBe(
        'project-name'
      );
    });

    it('should handle edge cases', () => {
      expect(projectManager.sanitizeProjectTag('')).toBe('default');

      expect(projectManager.sanitizeProjectTag(null as any)).toBe('default');

      expect(projectManager.sanitizeProjectTag(undefined as any)).toBe(
        'default'
      );
      expect(projectManager.sanitizeProjectTag('a'.repeat(60))).toBe(
        'a'.repeat(50)
      );
    });

    it('should preserve valid tags', () => {
      expect(projectManager.sanitizeProjectTag('valid-project')).toBe(
        'valid-project'
      );
      expect(projectManager.sanitizeProjectTag('project_123')).toBe(
        'project_123'
      );
    });
  });

  describe('listProjects', () => {
    it('should return empty array when no lists exist', async () => {
      vi.mocked(mockStorage.list).mockResolvedValue([]);

      const projects = await projectManager.listProjects();

      expect(projects).toEqual([]);
      expect(mockStorage.list).toHaveBeenCalledWith({});
    });

    it('should group lists by project tag', async () => {
      const testLists = [
        createTestList('1', 'project-a', undefined, 10, 5),
        createTestList('2', 'project-a', undefined, 8, 4),
        createTestList('3', 'project-b', undefined, 6, 6),
        createTestList('4', 'default', undefined, 4, 2),
      ];

      // Mock list to return summaries
      vi.mocked(mockStorage.list).mockResolvedValue(
        testLists.map(list => ({
          id: list.id,
          title: list.title,
          progress: list.progress,
          totalItems: list.totalItems,
          completedItems: list.completedItems,
          lastUpdated: list.updatedAt,
          context: list.context,
          projectTag: list.projectTag,
        }))
      );

      // Mock load to return full lists
      vi.mocked(mockStorage.load).mockImplementation(async id => {
        return testLists.find(list => list.id === id) || null;
      });

      const projects = await projectManager.listProjects();

      expect(projects).toHaveLength(3);

      const projectA = projects.find(p => p.tag === 'project-a');
      expect(projectA).toEqual({
        tag: 'project-a',
        listCount: 2,
        totalTasks: 18,
        completedTasks: 9,
        lastActivity: new Date('2024-01-02'),
        completionRate: 50,
      });

      const projectB = projects.find(p => p.tag === 'project-b');
      expect(projectB).toEqual({
        tag: 'project-b',
        listCount: 1,
        totalTasks: 6,
        completedTasks: 6,
        lastActivity: new Date('2024-01-02'),
        completionRate: 100,
      });

      const defaultProject = projects.find(p => p.tag === 'default');
      expect(defaultProject).toEqual({
        tag: 'default',
        listCount: 1,
        totalTasks: 4,
        completedTasks: 2,
        lastActivity: new Date('2024-01-02'),
        completionRate: 50,
      });
    });

    it('should handle lists with missing projectTag by using context', async () => {
      const testLists = [createTestList('1', '', 'legacy-context', 5, 2)];
      // Remove projectTag to simulate legacy data

      testLists[0].projectTag = undefined as any;

      vi.mocked(mockStorage.list).mockResolvedValue(testLists);

      const projects = await projectManager.listProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].tag).toBe('legacy-context');
    });

    it('should sort projects by last activity (most recent first)', async () => {
      const testLists = [
        {
          ...createTestList('1', 'project-a'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          ...createTestList('2', 'project-b'),
          updatedAt: new Date('2024-01-03'),
        },
        {
          ...createTestList('3', 'project-c'),
          updatedAt: new Date('2024-01-02'),
        },
      ];

      vi.mocked(mockStorage.list).mockResolvedValue(testLists);

      const projects = await projectManager.listProjects();

      expect(projects.map(p => p.tag)).toEqual([
        'project-b',
        'project-c',
        'project-a',
      ]);
    });
  });

  describe('migrateContextToProjectTag', () => {
    it('should migrate context to projectTag when projectTag is missing', async () => {
      const testLists = [
        {
          ...createTestList('1', '', 'old-context'),

          projectTag: undefined as any,
        },
        {
          ...createTestList('2', '', 'another-context'),

          projectTag: undefined as any,
        },
      ];

      vi.mocked(mockStorage.list).mockResolvedValue(testLists);

      await projectManager.migrateContextToProjectTag();

      expect(mockStorage.save).toHaveBeenCalledTimes(2);

      // Check first list migration
      expect(mockStorage.save).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          projectTag: 'old-context',
          context: 'old-context',
        }),
        { validate: true }
      );

      // Check second list migration
      expect(mockStorage.save).toHaveBeenCalledWith(
        '2',
        expect.objectContaining({
          projectTag: 'another-context',
          context: 'another-context',
        }),
        { validate: true }
      );
    });

    it('should set default values when both context and projectTag are missing', async () => {
      const testLists = [
        {
          ...createTestList('1', '', ''),

          projectTag: undefined as any,

          context: undefined as any,
        },
      ];

      vi.mocked(mockStorage.list).mockResolvedValue(testLists);

      await projectManager.migrateContextToProjectTag();

      expect(mockStorage.save).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          projectTag: 'default',
          context: 'default',
        }),
        { validate: true }
      );
    });

    it('should ensure context is set for backward compatibility when projectTag exists', async () => {
      const testLists = [
        {
          ...createTestList('1', 'existing-project'),

          context: undefined as any,
        },
      ];

      vi.mocked(mockStorage.list).mockResolvedValue(testLists);

      await projectManager.migrateContextToProjectTag();

      expect(mockStorage.save).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          projectTag: 'existing-project',
          context: 'existing-project',
        }),
        { validate: true }
      );
    });

    it('should skip lists that already have both fields set', async () => {
      const testLists = [createTestList('1', 'project-tag', 'context-value')];

      vi.mocked(mockStorage.list).mockResolvedValue(testLists);

      await projectManager.migrateContextToProjectTag();

      expect(mockStorage.save).not.toHaveBeenCalled();
    });

    it('should sanitize invalid context values during migration', async () => {
      const testLists = [
        {
          ...createTestList('1', '', 'invalid context with spaces'),

          projectTag: undefined as any,
        },
      ];

      vi.mocked(mockStorage.list).mockResolvedValue(testLists);

      await projectManager.migrateContextToProjectTag();

      expect(mockStorage.save).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          projectTag: 'invalid-context-with-spaces',
        }),
        { validate: true }
      );
    });

    it('should handle storage errors gracefully', async () => {
      const testLists = [
        {
          ...createTestList('1', '', 'test-context'),

          projectTag: undefined as any,
        },
      ];

      vi.mocked(mockStorage.list).mockResolvedValue(testLists);
      vi.mocked(mockStorage.save).mockRejectedValue(new Error('Storage error'));

      await expect(projectManager.migrateContextToProjectTag()).rejects.toThrow(
        'Storage error'
      );
    });
  });
});
