/**
 * Unit tests for ActionPlanManager
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { ActionPlanManager } from '../../../../src/domain/tasks/action-plan-manager.js';
import type { ActionPlan, ActionStep } from '../../../../src/shared/types/todo.js';

describe('ActionPlanManager', () => {
  let manager: ActionPlanManager;

  beforeEach(() => {
    manager = new ActionPlanManager();
  });

  describe('createActionPlan', () => {
    test('creates action plan with basic content', async () => {
      const input = {
        taskId: 'task-123',
        content: '- Step 1\n- Step 2\n- Step 3',
      };

      const plan = await manager.createActionPlan(input);

      expect(plan.id).toBeDefined();
      expect(plan.content).toBe(input.content);
      expect(plan.steps).toHaveLength(3);
      expect(plan.version).toBe(1);
      expect(plan.createdAt).toBeInstanceOf(Date);
      expect(plan.updatedAt).toBeInstanceOf(Date);
    });

    test('throws error for empty content', async () => {
      const input = {
        taskId: 'task-123',
        content: '',
      };

      await expect(manager.createActionPlan(input)).rejects.toThrow(
        'Action plan validation failed'
      );
    });

    test('throws error for content that is too long', async () => {
      const input = {
        taskId: 'task-123',
        content: 'x'.repeat(50001),
      };

      await expect(manager.createActionPlan(input)).rejects.toThrow(
        'Action plan content is too long'
      );
    });
  });

  describe('parseStepsFromContent', () => {
    test('parses bullet points with dashes', () => {
      const content = '- First step\n- Second step\n- Third step';
      const steps = manager.parseStepsFromContent(content);

      expect(steps).toHaveLength(3);
      expect(steps[0]?.content).toBe('First step');
      expect(steps[1]?.content).toBe('Second step');
      expect(steps[2]?.content).toBe('Third step');
      expect(steps[0]?.status).toBe('pending');
      expect(steps[0]?.order).toBe(0);
      expect(steps[1]?.order).toBe(1);
    });

    test('parses numbered lists', () => {
      const content = '1. First step\n2. Second step\n3. Third step';
      const steps = manager.parseStepsFromContent(content);

      expect(steps).toHaveLength(3);
      expect(steps[0]?.content).toBe('First step');
      expect(steps[1]?.content).toBe('Second step');
      expect(steps[2]?.content).toBe('Third step');
    });

    test('parses checkboxes', () => {
      const content = '[ ] Pending step\n[x] Completed step\n[ ] Another pending';
      const steps = manager.parseStepsFromContent(content);

      expect(steps).toHaveLength(3);
      expect(steps[0]?.content).toBe('Pending step');
      expect(steps[0]?.status).toBe('pending');
      expect(steps[1]?.content).toBe('Completed step');
      expect(steps[1]?.status).toBe('completed');
      expect(steps[1]?.completedAt).toBeInstanceOf(Date);
      expect(steps[2]?.status).toBe('pending');
    });

    test('parses mixed formats', () => {
      const content = `
        - First bullet point
        1. Numbered item
        [ ] Checkbox item
        [x] Completed checkbox
        * Asterisk bullet
        + Plus bullet
      `;
      const steps = manager.parseStepsFromContent(content);

      expect(steps).toHaveLength(6);
      expect(steps[0]?.content).toBe('First bullet point');
      expect(steps[1]?.content).toBe('Numbered item');
      expect(steps[2]?.content).toBe('Checkbox item');
      expect(steps[3]?.content).toBe('Completed checkbox');
      expect(steps[3]?.status).toBe('completed');
      expect(steps[4]?.content).toBe('Asterisk bullet');
      expect(steps[5]?.content).toBe('Plus bullet');
    });

    test('handles empty lines and whitespace', () => {
      const content = `
        - First step
        
        - Second step
        
        
        - Third step
      `;
      const steps = manager.parseStepsFromContent(content);

      expect(steps).toHaveLength(3);
      expect(steps[0]?.content).toBe('First step');
      expect(steps[1]?.content).toBe('Second step');
      expect(steps[2]?.content).toBe('Third step');
    });

    test('returns empty array for content with no steps', () => {
      const content = 'This is just plain text without any bullet points or structure.';
      const steps = manager.parseStepsFromContent(content);

      expect(steps).toHaveLength(1);
      expect(steps[0]?.content).toBe('This is just plain text without any bullet points or structure.');
    });

    test('handles roman numerals', () => {
      const content = 'i. First item\nii. Second item\niii. Third item';
      const steps = manager.parseStepsFromContent(content);

      expect(steps).toHaveLength(3);
      expect(steps[0]?.content).toBe('First item');
      expect(steps[1]?.content).toBe('Second item');
      expect(steps[2]?.content).toBe('Third item');
    });
  });

  describe('updateActionPlan', () => {
    test('updates action plan content and re-parses steps', async () => {
      const originalPlan: ActionPlan = {
        id: 'plan-123',
        content: '- Old step 1\n- Old step 2',
        steps: [
          {
            id: 'step-1',
            content: 'Old step 1',
            status: 'pending',
            order: 0,
          },
          {
            id: 'step-2',
            content: 'Old step 2',
            status: 'completed',
            completedAt: new Date(),
            order: 1,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const updates = {
        content: '- New step 1\n- New step 2\n- New step 3',
      };

      const updatedPlan = await manager.updateActionPlan(originalPlan, updates);

      expect(updatedPlan.content).toBe(updates.content);
      expect(updatedPlan.steps).toHaveLength(3);
      expect(updatedPlan.version).toBe(2);
      expect(updatedPlan.steps[0]?.content).toBe('New step 1');
      expect(updatedPlan.steps[1]?.content).toBe('New step 2');
      expect(updatedPlan.steps[2]?.content).toBe('New step 3');
    });

    test('preserves existing steps when content is not updated', async () => {
      const originalPlan: ActionPlan = {
        id: 'plan-123',
        content: '- Step 1\n- Step 2',
        steps: [
          {
            id: 'step-1',
            content: 'Step 1',
            status: 'completed',
            completedAt: new Date(),
            order: 0,
          },
          {
            id: 'step-2',
            content: 'Step 2',
            status: 'in_progress',
            order: 1,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const updates = {}; // No content update

      const updatedPlan = await manager.updateActionPlan(originalPlan, updates);

      expect(updatedPlan.steps).toHaveLength(2);
      expect(updatedPlan.version).toBe(2);
      expect(updatedPlan.steps[0]?.status).toBe('completed');
      expect(updatedPlan.steps[1]?.status).toBe('in_progress');
    });
  });

  describe('updateStepProgress', () => {
    let samplePlan: ActionPlan;

    beforeEach(() => {
      samplePlan = {
        id: 'plan-123',
        content: '- Step 1\n- Step 2\n- Step 3',
        steps: [
          {
            id: 'step-1',
            content: 'Step 1',
            status: 'pending',
            order: 0,
          },
          {
            id: 'step-2',
            content: 'Step 2',
            status: 'in_progress',
            order: 1,
          },
          {
            id: 'step-3',
            content: 'Step 3',
            status: 'completed',
            completedAt: new Date(),
            order: 2,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
    });

    test('updates step status to completed and sets timestamp', async () => {
      const input = {
        planId: 'plan-123',
        stepId: 'step-1',
        status: 'completed' as const,
      };

      const updatedPlan = await manager.updateStepProgress(samplePlan, input);

      const updatedStep = updatedPlan.steps.find(s => s.id === 'step-1');
      expect(updatedStep?.status).toBe('completed');
      expect(updatedStep?.completedAt).toBeInstanceOf(Date);
      expect(updatedPlan.version).toBe(2);
    });

    test('updates step status from completed to pending and removes timestamp', async () => {
      const input = {
        planId: 'plan-123',
        stepId: 'step-3',
        status: 'pending' as const,
      };

      const updatedPlan = await manager.updateStepProgress(samplePlan, input);

      const updatedStep = updatedPlan.steps.find(s => s.id === 'step-3');
      expect(updatedStep?.status).toBe('pending');
      expect(updatedStep?.completedAt).toBeUndefined();
    });

    test('adds notes to step', async () => {
      const input = {
        planId: 'plan-123',
        stepId: 'step-2',
        status: 'in_progress' as const,
        notes: 'Working on this step now',
      };

      const updatedPlan = await manager.updateStepProgress(samplePlan, input);

      const updatedStep = updatedPlan.steps.find(s => s.id === 'step-2');
      expect(updatedStep?.notes).toBe('Working on this step now');
    });

    test('throws error for non-existent step', async () => {
      const input = {
        planId: 'plan-123',
        stepId: 'non-existent',
        status: 'completed' as const,
      };

      await expect(manager.updateStepProgress(samplePlan, input)).rejects.toThrow(
        'Step not found: non-existent'
      );
    });
  });

  describe('calculatePlanProgress', () => {
    test('calculates progress correctly', () => {
      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: '1', content: 'Step 1', status: 'completed', order: 0 },
          { id: '2', content: 'Step 2', status: 'completed', order: 1 },
          { id: '3', content: 'Step 3', status: 'in_progress', order: 2 },
          { id: '4', content: 'Step 4', status: 'pending', order: 3 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const progress = manager.calculatePlanProgress(plan);
      expect(progress).toBe(50); // 2 out of 4 completed = 50%
    });

    test('returns 0 for plan with no steps', () => {
      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const progress = manager.calculatePlanProgress(plan);
      expect(progress).toBe(0);
    });

    test('returns 100 for fully completed plan', () => {
      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: '1', content: 'Step 1', status: 'completed', order: 0 },
          { id: '2', content: 'Step 2', status: 'completed', order: 1 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const progress = manager.calculatePlanProgress(plan);
      expect(progress).toBe(100);
    });
  });

  describe('suggestTaskStatusUpdate', () => {
    test('suggests completed when all steps are completed', () => {
      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: '1', content: 'Step 1', status: 'completed', order: 0 },
          { id: '2', content: 'Step 2', status: 'completed', order: 1 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const suggestion = manager.suggestTaskStatusUpdate(plan);
      expect(suggestion).toBe('completed');
    });

    test('suggests in_progress when some steps are completed or in progress', () => {
      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: '1', content: 'Step 1', status: 'completed', order: 0 },
          { id: '2', content: 'Step 2', status: 'pending', order: 1 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const suggestion = manager.suggestTaskStatusUpdate(plan);
      expect(suggestion).toBe('in_progress');
    });

    test('suggests in_progress when steps are in progress', () => {
      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: '1', content: 'Step 1', status: 'in_progress', order: 0 },
          { id: '2', content: 'Step 2', status: 'pending', order: 1 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const suggestion = manager.suggestTaskStatusUpdate(plan);
      expect(suggestion).toBe('in_progress');
    });

    test('suggests pending when no progress has been made', () => {
      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: '1', content: 'Step 1', status: 'pending', order: 0 },
          { id: '2', content: 'Step 2', status: 'pending', order: 1 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const suggestion = manager.suggestTaskStatusUpdate(plan);
      expect(suggestion).toBe('pending');
    });
  });

  describe('getActionPlanStats', () => {
    test('returns correct statistics', () => {
      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: '1', content: 'Step 1', status: 'completed', order: 0 },
          { id: '2', content: 'Step 2', status: 'completed', order: 1 },
          { id: '3', content: 'Step 3', status: 'in_progress', order: 2 },
          { id: '4', content: 'Step 4', status: 'pending', order: 3 },
          { id: '5', content: 'Step 5', status: 'pending', order: 4 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const stats = manager.getActionPlanStats(plan);

      expect(stats.totalSteps).toBe(5);
      expect(stats.completedSteps).toBe(2);
      expect(stats.inProgressSteps).toBe(1);
      expect(stats.pendingSteps).toBe(2);
      expect(stats.progress).toBe(40); // 2/5 = 40%
    });
  });

  describe('getStepsByStatus', () => {
    test('filters steps by status correctly', () => {
      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: '1', content: 'Step 1', status: 'completed', order: 0 },
          { id: '2', content: 'Step 2', status: 'pending', order: 1 },
          { id: '3', content: 'Step 3', status: 'in_progress', order: 2 },
          { id: '4', content: 'Step 4', status: 'pending', order: 3 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const pendingSteps = manager.getStepsByStatus(plan, 'pending');
      const completedSteps = manager.getStepsByStatus(plan, 'completed');
      const inProgressSteps = manager.getStepsByStatus(plan, 'in_progress');

      expect(pendingSteps).toHaveLength(2);
      expect(completedSteps).toHaveLength(1);
      expect(inProgressSteps).toHaveLength(1);
      expect(pendingSteps[0]?.content).toBe('Step 2');
      expect(pendingSteps[1]?.content).toBe('Step 4');
    });
  });

  describe('getNextPendingStep', () => {
    test('returns the first pending step by order', () => {
      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: '1', content: 'Step 1', status: 'completed', order: 0 },
          { id: '2', content: 'Step 2', status: 'pending', order: 3 },
          { id: '3', content: 'Step 3', status: 'in_progress', order: 2 },
          { id: '4', content: 'Step 4', status: 'pending', order: 1 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const nextStep = manager.getNextPendingStep(plan);

      expect(nextStep?.content).toBe('Step 4'); // order: 1 is first
      expect(nextStep?.order).toBe(1);
    });

    test('returns null when no pending steps', () => {
      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: '1', content: 'Step 1', status: 'completed', order: 0 },
          { id: '2', content: 'Step 2', status: 'completed', order: 1 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const nextStep = manager.getNextPendingStep(plan);
      expect(nextStep).toBeNull();
    });
  });

  describe('getCompletionTimeline', () => {
    test('returns completed steps in chronological order', () => {
      const date1 = new Date('2023-01-01T10:00:00Z');
      const date2 = new Date('2023-01-01T11:00:00Z');
      const date3 = new Date('2023-01-01T09:00:00Z');

      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: '1', content: 'Step 1', status: 'completed', completedAt: date1, order: 0 },
          { id: '2', content: 'Step 2', status: 'pending', order: 1 },
          { id: '3', content: 'Step 3', status: 'completed', completedAt: date2, order: 2 },
          { id: '4', content: 'Step 4', status: 'completed', completedAt: date3, order: 3 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const timeline = manager.getCompletionTimeline(plan);

      expect(timeline).toHaveLength(3);
      expect(timeline[0]?.stepContent).toBe('Step 4'); // 09:00 - earliest
      expect(timeline[1]?.stepContent).toBe('Step 1'); // 10:00
      expect(timeline[2]?.stepContent).toBe('Step 3'); // 11:00 - latest
    });
  });

  describe('calculateAverageStepCompletionTime', () => {
    test('calculates average time between completions', () => {
      const date1 = new Date('2023-01-01T10:00:00Z');
      const date2 = new Date('2023-01-01T10:30:00Z'); // 30 minutes later
      const date3 = new Date('2023-01-01T11:00:00Z'); // 30 minutes later

      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: '1', content: 'Step 1', status: 'completed', completedAt: date1, order: 0 },
          { id: '2', content: 'Step 2', status: 'completed', completedAt: date2, order: 1 },
          { id: '3', content: 'Step 3', status: 'completed', completedAt: date3, order: 2 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const avgTime = manager.calculateAverageStepCompletionTime(plan);
      expect(avgTime).toBe(30); // 30 minutes average
    });

    test('returns null for insufficient data', () => {
      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: '1', content: 'Step 1', status: 'completed', completedAt: new Date(), order: 0 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const avgTime = manager.calculateAverageStepCompletionTime(plan);
      expect(avgTime).toBeNull();
    });
  });

  describe('estimateTimeToCompletion', () => {
    test('provides estimation with sufficient data', () => {
      const date1 = new Date('2023-01-01T10:00:00Z');
      const date2 = new Date('2023-01-01T10:20:00Z'); // 20 minutes later
      const date3 = new Date('2023-01-01T10:40:00Z'); // 20 minutes later

      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: '1', content: 'Step 1', status: 'completed', completedAt: date1, order: 0 },
          { id: '2', content: 'Step 2', status: 'completed', completedAt: date2, order: 1 },
          { id: '3', content: 'Step 3', status: 'completed', completedAt: date3, order: 2 },
          { id: '4', content: 'Step 4', status: 'pending', order: 3 },
          { id: '5', content: 'Step 5', status: 'pending', order: 4 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const estimation = manager.estimateTimeToCompletion(plan);

      expect(estimation.estimatedMinutes).toBe(40); // 20 minutes * 2 pending steps
      expect(estimation.confidence).toBe('medium'); // 3 completed steps
      expect(estimation.reasoning).toContain('3 completed steps');
    });

    test('returns low confidence for insufficient data', () => {
      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: '1', content: 'Step 1', status: 'pending', order: 0 },
          { id: '2', content: 'Step 2', status: 'pending', order: 1 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const estimation = manager.estimateTimeToCompletion(plan);

      expect(estimation.estimatedMinutes).toBeNull();
      expect(estimation.confidence).toBe('low');
      expect(estimation.reasoning).toContain('No completed steps');
    });
  });

  describe('batchUpdateSteps', () => {
    test('updates multiple steps in batch', async () => {
      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: 'step-1', content: 'Step 1', status: 'pending', order: 0 },
          { id: 'step-2', content: 'Step 2', status: 'pending', order: 1 },
          { id: 'step-3', content: 'Step 3', status: 'pending', order: 2 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const updates = [
        { stepId: 'step-1', status: 'completed' as const },
        { stepId: 'step-2', status: 'in_progress' as const, notes: 'Working on it' },
      ];

      const updatedPlan = await manager.batchUpdateSteps(plan, updates);

      expect(updatedPlan.version).toBe(3); // Should increment for each update
      const step1 = updatedPlan.steps.find(s => s.id === 'step-1');
      const step2 = updatedPlan.steps.find(s => s.id === 'step-2');
      
      expect(step1?.status).toBe('completed');
      expect(step1?.completedAt).toBeInstanceOf(Date);
      expect(step2?.status).toBe('in_progress');
      expect(step2?.notes).toBe('Working on it');
    });
  });

  describe('isValidStepStatusTransition', () => {
    test('allows valid transitions', () => {
      expect(manager.isValidStepStatusTransition('pending', 'in_progress')).toBe(true);
      expect(manager.isValidStepStatusTransition('pending', 'completed')).toBe(true);
      expect(manager.isValidStepStatusTransition('in_progress', 'completed')).toBe(true);
      expect(manager.isValidStepStatusTransition('in_progress', 'pending')).toBe(true);
      expect(manager.isValidStepStatusTransition('completed', 'pending')).toBe(true);
      expect(manager.isValidStepStatusTransition('completed', 'in_progress')).toBe(true);
    });

    test('allows same status transitions', () => {
      expect(manager.isValidStepStatusTransition('pending', 'pending')).toBe(true);
      expect(manager.isValidStepStatusTransition('in_progress', 'in_progress')).toBe(true);
      expect(manager.isValidStepStatusTransition('completed', 'completed')).toBe(true);
    });
  });

  describe('getProgressSummary', () => {
    test('provides comprehensive progress summary', () => {
      const today = new Date();
      const plan: ActionPlan = {
        id: 'plan-123',
        content: 'test',
        steps: [
          { id: '1', content: 'Step 1', status: 'completed', completedAt: today, order: 0 },
          { id: '2', content: 'Step 2', status: 'completed', completedAt: new Date(today.getTime() - 86400000), order: 1 }, // yesterday
          { id: '3', content: 'Step 3', status: 'in_progress', order: 2 },
          { id: '4', content: 'Step 4', status: 'pending', order: 3 },
          { id: '5', content: 'Step 5', status: 'pending', order: 4 },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      const summary = manager.getProgressSummary(plan);

      expect(summary.progress).toBe(40); // 2/5 completed
      expect(summary.statusText).toContain('1 step in progress');
      expect(summary.nextStep).toBe('Step 4');
      expect(summary.completedToday).toBe(1);
    });
  });
});