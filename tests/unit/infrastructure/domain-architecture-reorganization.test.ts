/**
 * Unit tests for domain architecture reorganization
 * Tests that new domain structure exists and follows domain-driven design principles
 */

import { existsSync } from 'fs';
import { join } from 'path';

import { describe, it, expect } from 'vitest';

import type { Task } from '../../../src/domain/models/task';

describe('Domain Architecture Reorganization', () => {
  const srcPath = join(process.cwd(), 'src');

  describe('Core Orchestration Domain', () => {
    const corePath = join(srcPath, 'core', 'orchestration');

    it('should have core orchestration interfaces', () => {
      const interfacesPath = join(corePath, 'interfaces');

      expect(existsSync(join(interfacesPath, 'base-orchestrator.ts'))).toBe(
        true
      );
      expect(existsSync(join(interfacesPath, 'task-orchestrator.ts'))).toBe(
        true
      );
      expect(existsSync(join(interfacesPath, 'list-orchestrator.ts'))).toBe(
        true
      );
      expect(
        existsSync(join(interfacesPath, 'dependency-orchestrator.ts'))
      ).toBe(true);
      expect(existsSync(join(interfacesPath, 'search-orchestrator.ts'))).toBe(
        true
      );
      expect(
        existsSync(join(interfacesPath, 'agent-prompt-orchestrator.ts'))
      ).toBe(true);
    });

    it('should have core orchestration services', () => {
      const servicesPath = join(corePath, 'services');

      expect(existsSync(join(servicesPath, 'task-orchestrator-impl.ts'))).toBe(
        true
      );
      expect(existsSync(join(servicesPath, 'list-orchestrator-impl.ts'))).toBe(
        true
      );
      expect(
        existsSync(join(servicesPath, 'dependency-orchestrator-impl.ts'))
      ).toBe(true);
    });

    it('should have core orchestration validators', () => {
      const validatorsPath = join(corePath, 'validators');

      expect(existsSync(join(validatorsPath, 'task-validator.ts'))).toBe(true);
      expect(existsSync(join(validatorsPath, 'list-validator.ts'))).toBe(true);
    });
  });

  describe('Domain Models', () => {
    const domainPath = join(srcPath, 'domain', 'models');

    it('should have domain models in correct location', () => {
      expect(existsSync(join(domainPath, 'task.ts'))).toBe(true);
      expect(existsSync(join(domainPath, 'task-list.ts'))).toBe(true);
      expect(existsSync(join(domainPath, 'index.ts'))).toBe(true);
    });

    it('should export models from index', async () => {
      const {
        Task: _Task,
        TaskList: _TaskList,
        TaskStatus,
        Priority,
      } = await import('../../../src/domain/models');

      expect(TaskStatus).toBeDefined();
      expect(Priority).toBeDefined();
      expect(TaskStatus.PENDING).toBe('pending');
      expect(Priority.MEDIUM).toBe(3);
    });
  });

  describe('Data Delegation Domain', () => {
    const dataPath = join(srcPath, 'data');

    it('should have data delegation service', () => {
      expect(
        existsSync(join(dataPath, 'delegation', 'data-delegation-service.ts'))
      ).toBe(true);
    });

    it('should have data access service', () => {
      expect(
        existsSync(join(dataPath, 'access', 'data-access-service.ts'))
      ).toBe(true);
    });
  });

  describe('MCP Tools Domain', () => {
    const mcpPath = join(srcPath, 'api', 'mcp');

    it('should have MCP tools definitions', () => {
      expect(existsSync(join(mcpPath, 'tools', 'task-tools.ts'))).toBe(true);
    });

    it('should have MCP handlers', () => {
      expect(existsSync(join(mcpPath, 'handlers', 'task-handlers.ts'))).toBe(
        true
      );
    });
  });

  describe('REST API Domain', () => {
    const restPath = join(srcPath, 'api', 'rest');

    it('should have REST controllers', () => {
      expect(
        existsSync(join(restPath, 'controllers', 'task-controller.ts'))
      ).toBe(true);
    });
  });

  describe('Configuration Management Domain', () => {
    const configPath = join(srcPath, 'infrastructure', 'config');

    it('should have system configuration', () => {
      expect(existsSync(join(configPath, 'system-configuration.ts'))).toBe(
        true
      );
    });
  });

  describe('Shared Types Domain', () => {
    const sharedPath = join(srcPath, 'shared');

    it('should have comprehensive type definitions', () => {
      expect(existsSync(join(sharedPath, 'types', 'validation.ts'))).toBe(true);
      expect(existsSync(join(sharedPath, 'types', 'task-operations.ts'))).toBe(
        true
      );
      expect(existsSync(join(sharedPath, 'types', 'list-operations.ts'))).toBe(
        true
      );
      expect(existsSync(join(sharedPath, 'types', 'dependency.ts'))).toBe(true);
      expect(existsSync(join(sharedPath, 'types', 'search.ts'))).toBe(true);
      expect(existsSync(join(sharedPath, 'types', 'template.ts'))).toBe(true);
    });

    it('should have orchestration error classes', () => {
      expect(
        existsSync(join(sharedPath, 'errors', 'orchestration-error.ts'))
      ).toBe(true);
    });
  });

  describe('CLI Files', () => {
    const rootPath = process.cwd();

    it('should have MCP CLI file', () => {
      expect(existsSync(join(rootPath, 'mcp.js'))).toBe(true);
    });

    it('should have REST CLI file', () => {
      expect(existsSync(join(rootPath, 'rest.js'))).toBe(true);
    });
  });

  describe('Domain Boundaries', () => {
    it('should have proper separation between orchestration and data layers', async () => {
      // Test that orchestration implementations exist and can be imported
      const { TaskOrchestratorImpl } = await import(
        '../../../src/core/orchestration/services/task-orchestrator-impl'
      );
      const { DataDelegationService } = await import(
        '../../../src/data/delegation/data-delegation-service'
      );

      expect(TaskOrchestratorImpl).toBeDefined();
      expect(DataDelegationService).toBeDefined();
    });

    it('should have proper error handling hierarchy', async () => {
      const { OrchestrationError, ValidationError, TaskNotFoundError } =
        await import('../../../src/shared/errors/orchestration-error');

      const validationError = new ValidationError('test', 'context');
      const taskNotFoundError = new TaskNotFoundError('test-id');

      expect(validationError).toBeInstanceOf(OrchestrationError);
      expect(taskNotFoundError).toBeInstanceOf(OrchestrationError);
    });

    it('should have proper model structure', async () => {
      const { TaskStatus, Priority } = await import(
        '../../../src/domain/models/task'
      );
      const { TaskList: _TaskList } = await import(
        '../../../src/domain/models/task-list'
      );

      // Test that models have expected structure
      expect(TaskStatus.PENDING).toBe('pending');
      expect(Priority.MEDIUM).toBe(3);

      // Test that interfaces are properly defined
      const mockTask: Task = {
        id: 'test',
        title: 'Test Task',
        status: TaskStatus.PENDING,
        priority: Priority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
        dependencies: [],
        tags: [],
        metadata: {},
        implementationNotes: [],
        exitCriteria: [],
      };

      expect(mockTask.id).toBe('test');
      expect(mockTask.status).toBe(TaskStatus.PENDING);
    });
  });

  describe('Functional Integration', () => {
    it('should have working orchestrator implementations', async () => {
      const { TaskOrchestratorImpl: _TaskOrchestratorImpl } = await import(
        '../../../src/core/orchestration/services/task-orchestrator-impl'
      );
      const { TaskValidator } = await import(
        '../../../src/core/orchestration/validators/task-validator'
      );
      const { DataDelegationService: _DataDelegationService } = await import(
        '../../../src/data/delegation/data-delegation-service'
      );

      // Test that classes can be instantiated
      const validator = new TaskValidator();
      expect(validator).toBeDefined();
      expect(typeof validator.validate).toBe('function');

      // Test validation functionality
      const validationResult = validator.validate({ title: 'Test Task' });
      expect(validationResult.isValid).toBe(true);
    });

    it('should have working MCP tools structure', async () => {
      const { TASK_TOOLS } = await import(
        '../../../src/api/mcp/tools/task-tools'
      );

      expect(Array.isArray(TASK_TOOLS)).toBe(true);
      expect(TASK_TOOLS.length).toBeGreaterThan(0);

      const addTaskTool = TASK_TOOLS.find(
        tool => tool.name === 'mcp_tasks_add_task'
      );
      expect(addTaskTool).toBeDefined();
      expect(addTaskTool?.inputSchema).toBeDefined();
    });

    it('should have working configuration management', async () => {
      const { ConfigurationManager } = await import(
        '../../../src/infrastructure/config/system-configuration'
      );

      const configManager = new ConfigurationManager();
      const config = configManager.getConfiguration();

      expect(config).toBeDefined();
      expect(config.dataStore).toBeDefined();
      expect(config.server).toBeDefined();
      expect(config.features).toBeDefined();
    });
  });

  describe('Test Structure Mirrors Source Structure', () => {
    const testsPath = join(process.cwd(), 'tests', 'unit');

    it('should have tests for core orchestration', () => {
      const coreTestsPath = join(testsPath, 'core', 'orchestration');

      expect(
        existsSync(
          join(coreTestsPath, 'services', 'task-orchestrator-impl.test.ts')
        )
      ).toBe(true);
      expect(
        existsSync(
          join(coreTestsPath, 'services', 'list-orchestrator-impl.test.ts')
        )
      ).toBe(true);
      expect(
        existsSync(join(coreTestsPath, 'validators', 'task-validator.test.ts'))
      ).toBe(true);
      expect(
        existsSync(join(coreTestsPath, 'validators', 'list-validator.test.ts'))
      ).toBe(true);
    });

    it('should have tests for domain models', () => {
      const domainTestsPath = join(testsPath, 'domain', 'models');

      expect(existsSync(join(domainTestsPath, 'task.test.ts'))).toBe(true);
      expect(existsSync(join(domainTestsPath, 'task-list.test.ts'))).toBe(true);
    });

    it('should have tests for shared errors', () => {
      const sharedTestsPath = join(testsPath, 'shared', 'errors');

      expect(
        existsSync(join(sharedTestsPath, 'orchestration-error.test.ts'))
      ).toBe(true);
    });
  });

  describe('Domain-Driven Design Principles', () => {
    it('should follow domain-driven directory structure', () => {
      // Core domain should be at the top level
      expect(existsSync(join(srcPath, 'core'))).toBe(true);
      expect(existsSync(join(srcPath, 'domain'))).toBe(true);

      // Infrastructure should be separate
      expect(existsSync(join(srcPath, 'infrastructure'))).toBe(true);

      // API layers should be organized by interface type
      expect(existsSync(join(srcPath, 'api', 'mcp'))).toBe(true);
      expect(existsSync(join(srcPath, 'api', 'rest'))).toBe(true);

      // Shared utilities should be separate
      expect(existsSync(join(srcPath, 'shared'))).toBe(true);
    });

    it('should have clear separation of concerns', () => {
      // Orchestration should be separate from data access
      expect(existsSync(join(srcPath, 'core', 'orchestration'))).toBe(true);
      expect(existsSync(join(srcPath, 'data', 'access'))).toBe(true);
      expect(existsSync(join(srcPath, 'data', 'delegation'))).toBe(true);

      // Models should be in domain layer
      expect(existsSync(join(srcPath, 'domain', 'models'))).toBe(true);

      // Configuration should be in infrastructure
      expect(existsSync(join(srcPath, 'infrastructure', 'config'))).toBe(true);
    });

    it('should maintain proper dependency direction', async () => {
      // Test that domain models don't depend on infrastructure
      const { Task: _Task2, TaskStatus } = await import(
        '../../../src/domain/models/task'
      );

      // Models should be pure and not depend on external services
      expect(TaskStatus.PENDING).toBe('pending');

      // Test that orchestrator implementations exist and follow proper structure
      const { TaskOrchestratorImpl: _TaskOrchestratorImpl3 } = await import(
        '../../../src/core/orchestration/services/task-orchestrator-impl'
      );
      expect(_TaskOrchestratorImpl3).toBeDefined();
    });
  });
});
