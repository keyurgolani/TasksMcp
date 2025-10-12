/**
 * Orchestration error classes for comprehensive error handling
 * Provides detailed error information with context and actionable guidance
 */

export class OrchestrationError extends Error {
  constructor(
    message: string,
    public context: string,
    public currentValue?: unknown,
    public expectedValue?: unknown,
    public actionableGuidance?: string,
    public timestamp: Date = new Date()
  ) {
    super(message);
    this.name = 'OrchestrationError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      currentValue: this.currentValue,
      expectedValue: this.expectedValue,
      actionableGuidance: this.actionableGuidance,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

export class ValidationError extends OrchestrationError {
  constructor(
    message: string,
    context: string,
    currentValue?: unknown,
    expectedValue?: unknown,
    actionableGuidance?: string
  ) {
    super(message, context, currentValue, expectedValue, actionableGuidance);
    this.name = 'ValidationError';
  }
}

export class CircularDependencyError extends OrchestrationError {
  constructor(
    message: string,
    public dependencyCycle: string[],
    actionableGuidance?: string
  ) {
    super(
      message,
      'Dependency Management',
      dependencyCycle,
      undefined,
      actionableGuidance
    );
    this.name = 'CircularDependencyError';
  }
}

export class StatusTransitionError extends OrchestrationError {
  constructor(
    message: string,
    public currentStatus: string,
    public targetStatus: string,
    public validTransitions: string[]
  ) {
    super(
      message,
      'Task Status Management',
      currentStatus,
      validTransitions,
      `Valid transitions from ${currentStatus}: ${validTransitions.join(', ')}`
    );
    this.name = 'StatusTransitionError';
  }
}

export class TemplateRenderError extends OrchestrationError {
  constructor(
    message: string,
    public template: string,
    public renderTime?: number,
    actionableGuidance?: string
  ) {
    super(
      message,
      'Template Rendering',
      template,
      undefined,
      actionableGuidance
    );
    this.name = 'TemplateRenderError';
  }
}

export class TaskNotFoundError extends OrchestrationError {
  constructor(taskId: string) {
    super(
      `Task not found: ${taskId}`,
      'Task Management',
      taskId,
      'Valid task ID',
      'Ensure the task ID exists and is accessible'
    );
    this.name = 'TaskNotFoundError';
  }
}

export class ListNotFoundError extends OrchestrationError {
  constructor(listId: string) {
    super(
      `List not found: ${listId}`,
      'List Management',
      listId,
      'Valid list ID',
      'Ensure the list ID exists and is accessible'
    );
    this.name = 'ListNotFoundError';
  }
}
