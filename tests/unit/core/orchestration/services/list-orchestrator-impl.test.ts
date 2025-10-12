/**
 * Unit tests for ListOrchestratorImpl
 * Tests centralized task list management with validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ListOrchestratorImpl } from '../../../../../src/core/orchestration/services/list-orchestrator-impl';
import { ListValidator } from '../../../../../src/core/orchestration/validators/list-validator';
import { DataDelegationService } from '../../../../../src/data/delegation/data-delegation-service';
import { TaskList } from '../../../../../src/domain/models/task-list';
import {
  ValidationError,
  ListNotFoundError,
} from '../../../../../src/shared/errors/orchestration-error';
import {
  CreateListData,
  UpdateListData,
  ListFilters,
} from '../../../../../src/shared/types/list-operations';

describe('ListOrchestratorImpl', () => {
  let listOrchestrator: ListOrchestratorImpl;
  let mockValidator: ListValidator;
  let mockDataDelegation: DataDelegationService;

  const mockList: TaskList = {
    id: 'test-list-id',
    title: 'Test List',
    description: 'Test Description',
    items: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    projectTag: 'test-project',
    totalItems: 0,
    completedItems: 0,
    progress: 0,
    metadata: {},
    implementationNotes: [],
  };

  beforeEach(() => {
    mockValidator = {
      validate: vi.fn(),
    } as any;

    mockDataDelegation = {
      execute: vi.fn(),
    } as any;

    listOrchestrator = new ListOrchestratorImpl(
      mockValidator,
      mockDataDelegation
    );
  });

  describe('createList', () => {
    it('should create a list successfully with valid data', async () => {
      const createData: CreateListData = {
        title: 'New List',
        description: 'New Description',
        projectTag: 'new-project',
      };

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      vi.mocked(mockDataDelegation.execute).mockResolvedValue(mockList);

      const result = await listOrchestrator.createList(createData);

      expect(result).toEqual(mockList);
      expect(mockValidator.validate).toHaveBeenCalledWith(createData);
      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'create',
        entity: 'list',
        data: createData,
      });
    });

    it('should throw ValidationError when validation fails', async () => {
      const createData: CreateListData = {
        title: '',
      };

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: false,
        errors: [
          {
            field: 'title',
            message: 'Title is required',
            currentValue: '',
            expectedValue: 'non-empty string',
            actionableGuidance: 'Provide a valid title',
          },
        ],
        warnings: [],
      });

      await expect(listOrchestrator.createList(createData)).rejects.toThrow(
        ValidationError
      );
      expect(mockDataDelegation.execute).not.toHaveBeenCalled();
    });
  });

  describe('updateList', () => {
    it('should update a list successfully', async () => {
      const updateData: UpdateListData = {
        title: 'Updated List',
        description: 'Updated Description',
      };

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const updatedList = { ...mockList, ...updateData };
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(updatedList);

      const result = await listOrchestrator.updateList('test-id', updateData);

      expect(result).toEqual(updatedList);
      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'update',
        entity: 'list',
        data: { id: 'test-id', ...updateData },
      });
    });

    it('should throw ListNotFoundError when list does not exist', async () => {
      const updateData: UpdateListData = {
        title: 'Updated List',
      };

      vi.mocked(mockValidator.validate).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      vi.mocked(mockDataDelegation.execute).mockResolvedValue(null);

      await expect(
        listOrchestrator.updateList('non-existent-id', updateData)
      ).rejects.toThrow(ListNotFoundError);
    });
  });

  describe('getList', () => {
    it('should get list successfully', async () => {
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(mockList);

      const result = await listOrchestrator.getList('test-id');

      expect(result).toEqual(mockList);
      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'read',
        entity: 'list',
        filters: { id: 'test-id', includeCompleted: undefined },
      });
    });

    it('should get list with includeCompleted parameter', async () => {
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(mockList);

      const result = await listOrchestrator.getList('test-id', true);

      expect(result).toEqual(mockList);
      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'read',
        entity: 'list',
        filters: { id: 'test-id', includeCompleted: true },
      });
    });

    it('should throw ListNotFoundError when list does not exist', async () => {
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(null);

      await expect(listOrchestrator.getList('non-existent-id')).rejects.toThrow(
        ListNotFoundError
      );
    });
  });

  describe('getAllLists', () => {
    it('should get all lists successfully', async () => {
      const lists = [mockList];
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(lists);

      const result = await listOrchestrator.getAllLists();

      expect(result).toEqual(lists);
      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'search',
        entity: 'list',
        filters: undefined,
      });
    });

    it('should get all lists with filters', async () => {
      const filters: ListFilters = {
        projectTag: 'test-project',
        hasCompletedTasks: true,
      };
      const lists = [mockList];
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(lists);

      const result = await listOrchestrator.getAllLists(filters);

      expect(result).toEqual(lists);
      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'search',
        entity: 'list',
        filters,
      });
    });

    it('should return empty array when no lists found', async () => {
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(null);

      const result = await listOrchestrator.getAllLists();

      expect(result).toEqual([]);
    });
  });

  describe('deleteList', () => {
    it('should delete list successfully', async () => {
      vi.mocked(mockDataDelegation.execute).mockResolvedValue(undefined);

      await listOrchestrator.deleteList('test-id');

      expect(mockDataDelegation.execute).toHaveBeenCalledWith({
        type: 'delete',
        entity: 'list',
        filters: { id: 'test-id' },
      });
    });
  });
});
