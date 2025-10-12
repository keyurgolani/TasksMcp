/**
 * REST API task controller
 * Handles HTTP requests for task operations using orchestration layer
 */

import { Request, Response } from 'express';

import { TaskOrchestrator } from '../../../core/orchestration/interfaces/task-orchestrator';
import { Priority } from '../../../domain/models/task';
import { OrchestrationError } from '../../../shared/errors/orchestration-error';
import {
  CreateTaskData,
  UpdateTaskData,
} from '../../../shared/types/task-operations';

export class TaskController {
  constructor(private taskOrchestrator: TaskOrchestrator) {}

  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const taskData: CreateTaskData = req.body;
      const task = await this.taskOrchestrator.createTask(taskData);

      res.status(201).json({
        success: true,
        data: task,
        message: 'Task created successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'Task ID is required' },
        });
        return;
      }
      const updateData: UpdateTaskData = req.body;

      const task = await this.taskOrchestrator.updateTask(id, updateData);

      res.json({
        success: true,
        data: task,
        message: 'Task updated successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'Task ID is required' },
        });
        return;
      }
      const task = await this.taskOrchestrator.getTask(id);

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'Task ID is required' },
        });
        return;
      }
      await this.taskOrchestrator.deleteTask(id);

      res.json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async completeTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'Task ID is required' },
        });
        return;
      }
      const task = await this.taskOrchestrator.completeTask(id);

      res.json({
        success: true,
        data: task,
        message: 'Task completed successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async setTaskPriority(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'Task ID is required' },
        });
        return;
      }
      const { priority } = req.body;

      const task = await this.taskOrchestrator.setTaskPriority(
        id,
        priority as Priority
      );

      res.json({
        success: true,
        data: task,
        message: 'Task priority updated successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async addTaskTags(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'Task ID is required' },
        });
        return;
      }
      const { tags } = req.body;

      const task = await this.taskOrchestrator.addTaskTags(id, tags);

      res.json({
        success: true,
        data: task,
        message: 'Tags added successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async removeTaskTags(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({
          success: false,
          error: { message: 'Task ID is required' },
        });
        return;
      }
      const { tags } = req.body;

      const task = await this.taskOrchestrator.removeTaskTags(id, tags);

      res.json({
        success: true,
        data: task,
        message: 'Tags removed successfully',
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private handleError(error: unknown, res: Response): void {
    if (error instanceof OrchestrationError) {
      const statusCode = this.getStatusCodeForError(error);

      res.status(statusCode).json({
        success: false,
        error: {
          type: error.name,
          message: error.message,
          context: error.context,
          currentValue: error.currentValue,
          expectedValue: error.expectedValue,
          actionableGuidance: error.actionableGuidance,
          timestamp: error.timestamp,
        },
      });
      return;
    }

    // Handle unexpected errors
    res.status(500).json({
      success: false,
      error: {
        type: 'InternalServerError',
        message: 'An unexpected error occurred',
        timestamp: new Date(),
      },
    });
  }

  private getStatusCodeForError(error: OrchestrationError): number {
    switch (error.name) {
      case 'ValidationError':
        return 400;
      case 'TaskNotFoundError':
      case 'ListNotFoundError':
        return 404;
      case 'StatusTransitionError':
      case 'CircularDependencyError':
        return 409;
      default:
        return 500;
    }
  }
}
