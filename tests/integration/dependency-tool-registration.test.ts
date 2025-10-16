/**
 * Integration tests for dependency management tool registration and discovery
 * Tests that the 3 new MCP tools are properly registered and discoverable
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  MCP_TOOLS,
  getToolNames,
  getToolSchema,
} from '../../src/api/tools/definitions.js';
import { McpTaskManagerServer } from '../../src/app/server.js';
import { TestCleanup } from '../setup.js';

describe('Dependency Tool Registration', () => {
  let server: McpTaskManagerServer;

  beforeEach(async () => {
    await TestCleanup.registerEnvVar('STORAGE_TYPE', 'memory');
    await TestCleanup.registerEnvVar('METRICS_ENABLED', 'false');
    await TestCleanup.registerEnvVar('NODE_ENV', 'test');

    server = new McpTaskManagerServer();
    await server.start();

    // Register server for cleanup
    TestCleanup.registerServer(server);
  });

  afterEach(async () => {
    if (server) {
      await server.close();
    }
  });

  describe('Tool Discovery', () => {
    it('should include all 19 MCP tools in the registry', () => {
      expect(MCP_TOOLS).toHaveLength(19);

      const toolNames = getToolNames();
      expect(toolNames).toHaveLength(19);
    });

    it('should include the 3 new dependency management tools', () => {
      const toolNames = getToolNames();

      // Verify the 3 new dependency tools are registered
      expect(toolNames).toContain('set_task_dependencies');
      expect(toolNames).toContain('get_ready_tasks');
      expect(toolNames).toContain('analyze_task_dependencies');
    });

    it('should maintain backward compatibility with existing tools', () => {
      const toolNames = getToolNames();

      // List management tools (4 tools)
      expect(toolNames).toContain('create_list');
      expect(toolNames).toContain('get_list');
      expect(toolNames).toContain('list_all_lists');
      expect(toolNames).toContain('delete_list');

      // Task management tools (7 tools)
      expect(toolNames).toContain('add_task');
      expect(toolNames).toContain('update_task');
      expect(toolNames).toContain('get_agent_prompt');
      expect(toolNames).toContain('remove_task');
      expect(toolNames).toContain('complete_task');
      expect(toolNames).toContain('set_task_priority');
      expect(toolNames).toContain('add_task_tags');

      // Search & display tools (2 tools)
      expect(toolNames).toContain('search_tool');
      expect(toolNames).toContain('show_tasks');

      // Intelligence tools removed - no longer supported
    });
  });

  describe('Tool Schema Validation', () => {
    it('should have valid schema for set_task_dependencies tool', () => {
      const schema = getToolSchema('set_task_dependencies');

      expect(schema).toBeDefined();
      expect(schema?.name).toBe('set_task_dependencies');
      expect(schema?.description).toContain(
        'Set which tasks this task depends on'
      );

      const inputSchema = schema?.inputSchema;
      expect(inputSchema).toBeDefined();
      expect(inputSchema.type).toBe('object');
      expect(inputSchema.required).toEqual(['listId', 'taskId']);

      // Validate parameter schemas
      const properties = inputSchema.properties;
      expect(properties.listId.type).toBe('string');
      expect(properties.listId.format).toBe('uuid');
      expect(properties.taskId.type).toBe('string');
      expect(properties.taskId.format).toBe('uuid');
      expect(properties.dependencyIds.type).toBe('array');
      expect(properties.dependencyIds.maxItems).toBe(50);
      expect(properties.dependencyIds.items.type).toBe('string');
      expect(properties.dependencyIds.items.format).toBe('uuid');
    });

    it('should have valid schema for get_ready_tasks tool', () => {
      const schema = getToolSchema('get_ready_tasks');

      expect(schema).toBeDefined();
      expect(schema?.name).toBe('get_ready_tasks');
      expect(schema?.description).toContain(
        'Get tasks that are ready to work on'
      );

      const inputSchema = schema?.inputSchema;
      expect(inputSchema).toBeDefined();
      expect(inputSchema.type).toBe('object');
      expect(inputSchema.required).toEqual(['listId']);

      // Validate parameter schemas
      const properties = inputSchema.properties;
      expect(properties.listId.type).toBe('string');
      expect(properties.listId.format).toBe('uuid');
      expect(properties.limit.type).toBe('number');
      expect(properties.limit.minimum).toBe(1);
      expect(properties.limit.maximum).toBe(50);
      expect(properties.limit.default).toBe(20);
    });

    it('should have valid schema for analyze_task_dependencies tool', () => {
      const schema = getToolSchema('analyze_task_dependencies');

      expect(schema).toBeDefined();
      expect(schema?.name).toBe('analyze_task_dependencies');
      expect(schema?.description).toContain(
        'Get analysis of task dependencies and project structure'
      );

      const inputSchema = schema?.inputSchema;
      expect(inputSchema).toBeDefined();
      expect(inputSchema.type).toBe('object');
      expect(inputSchema.required).toEqual(['listId']);

      // Validate parameter schemas
      const properties = inputSchema.properties;
      expect(properties.listId.type).toBe('string');
      expect(properties.listId.format).toBe('uuid');
    });
  });

  describe('Tool Categories', () => {
    it('should organize tools into correct categories', () => {
      const toolNames = getToolNames();

      // List Management Tools (4 tools)
      const listTools = [
        'create_list',
        'get_list',
        'list_all_lists',
        'delete_list',
      ];
      listTools.forEach(tool => expect(toolNames).toContain(tool));

      // Task Management Tools (7 tools)
      const taskTools = [
        'add_task',
        'update_task',
        'get_agent_prompt',
        'remove_task',
        'complete_task',
        'set_task_priority',
        'add_task_tags',
      ];
      taskTools.forEach(tool => expect(toolNames).toContain(tool));

      // Search & Display Tools (2 tools)
      const searchTools = ['search_tool', 'show_tasks'];
      searchTools.forEach(tool => expect(toolNames).toContain(tool));

      // Intelligence Tools removed - no longer supported

      // Dependency Management Tools (3 tools)
      const dependencyTools = [
        'set_task_dependencies',
        'get_ready_tasks',
        'analyze_task_dependencies',
      ];
      dependencyTools.forEach(tool => expect(toolNames).toContain(tool));
    });
  });

  describe('Enhanced Existing Tools', () => {
    it('should enhance add_task tool with dependencies parameter', () => {
      const schema = getToolSchema('add_task');

      expect(schema).toBeDefined();
      const properties = schema?.inputSchema.properties;
      expect(properties.dependencies).toBeDefined();
      expect(properties.dependencies.type).toBe('array');
      expect(properties.dependencies.maxItems).toBe(50);
      expect(properties.dependencies.items.type).toBe('string');
      expect(properties.dependencies.items.format).toBe('uuid');
      expect(properties.dependencies.description).toContain('Array of task');
    });

    it('should enhance search_tool with dependency filters', () => {
      const schema = getToolSchema('search_tool');

      expect(schema).toBeDefined();
      const properties = schema?.inputSchema.properties;

      // Check for new dependency-related filters
      expect(properties.hasDependencies).toBeDefined();
      expect(properties.hasDependencies.type).toBe('boolean');
      expect(properties.hasDependencies.description).toContain(
        'Filter by whether tasks have dependencies'
      );

      expect(properties.isReady).toBeDefined();
      expect(properties.isReady.type).toBe('boolean');
      expect(properties.isReady.description).toContain(
        'Filter by whether tasks are ready to work on'
      );

      expect(properties.isBlocked).toBeDefined();
      expect(properties.isBlocked.type).toBe('boolean');
      expect(properties.isBlocked.description).toContain(
        'Filter by whether tasks are blocked by dependencies'
      );
    });
  });

  describe('Parameter Validation', () => {
    it('should validate UUID format for dependency tool parameters', () => {
      const _validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const _invalidUuid = 'not-a-uuid';

      // Test set_task_dependencies validation
      const setDepsSchema = getToolSchema('set_task_dependencies');
      expect(setDepsSchema?.inputSchema.properties.listId.format).toBe('uuid');
      expect(setDepsSchema?.inputSchema.properties.taskId.format).toBe('uuid');
      expect(
        setDepsSchema?.inputSchema.properties.dependencyIds.items.format
      ).toBe('uuid');

      // Test get_ready_tasks validation
      const readyTasksSchema = getToolSchema('get_ready_tasks');
      expect(readyTasksSchema?.inputSchema.properties.listId.format).toBe(
        'uuid'
      );

      // Test analyze_task_dependencies validation
      const analyzeSchema = getToolSchema('analyze_task_dependencies');
      expect(analyzeSchema?.inputSchema.properties.listId.format).toBe('uuid');
    });

    it('should enforce array size limits for dependencies', () => {
      const setDepsSchema = getToolSchema('set_task_dependencies');
      expect(setDepsSchema?.inputSchema.properties.dependencyIds.maxItems).toBe(
        50
      );

      const addTaskSchema = getToolSchema('add_task');
      expect(addTaskSchema?.inputSchema.properties.dependencies.maxItems).toBe(
        50
      );
    });

    it('should enforce numeric limits for get_ready_tasks', () => {
      const schema = getToolSchema('get_ready_tasks');
      const limitProperty = schema?.inputSchema.properties.limit;

      expect(limitProperty.minimum).toBe(1);
      expect(limitProperty.maximum).toBe(50);
      expect(limitProperty.default).toBe(20);
    });
  });

  describe('Tool Descriptions', () => {
    it('should have clear, simple descriptions for dependency tools', () => {
      const setDepsSchema = getToolSchema('set_task_dependencies');
      expect(setDepsSchema?.description).toContain(
        'Set which tasks this task depends on (replaces all existing dependencies)'
      );

      const readyTasksSchema = getToolSchema('get_ready_tasks');
      expect(readyTasksSchema?.description).toContain(
        'Get tasks that are ready to work on (no incomplete dependencies)'
      );

      const analyzeSchema = getToolSchema('analyze_task_dependencies');
      expect(analyzeSchema?.description).toContain(
        'Get analysis of task dependencies and project structure with optional DAG visualization'
      );
    });

    it('should have clear parameter descriptions', () => {
      const setDepsSchema = getToolSchema('set_task_dependencies');
      const properties = setDepsSchema?.inputSchema.properties;

      expect(properties.listId.description).toContain(
        'UUID of the list containing the task'
      );
      expect(properties.taskId.description).toContain(
        'UUID of the task to set dependencies for'
      );
      expect(properties.dependencyIds.description).toContain('Array of task');
    });
  });
});
