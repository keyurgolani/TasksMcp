/**
 * Unit tests for consolidated MCP tools
 * Tests tool definitions and organization
 */

import { describe, it, expect } from 'vitest';

import {
  ALL_MCP_TOOLS,
  LIST_MANAGEMENT_TOOLS,
  TASK_MANAGEMENT_TOOLS,
  SEARCH_DISPLAY_TOOLS,
  DEPENDENCY_MANAGEMENT_TOOLS,
  EXIT_CRITERIA_MANAGEMENT_TOOLS,
  AGENT_PROMPT_MANAGEMENT_TOOLS,
} from '../../../../src/api/mcp/tools/consolidated-tools.js';

describe('Consolidated MCP Tools', () => {
  describe('Tool Organization', () => {
    it('should have all domain tools included in ALL_MCP_TOOLS', () => {
      const expectedCount =
        LIST_MANAGEMENT_TOOLS.length +
        TASK_MANAGEMENT_TOOLS.length +
        SEARCH_DISPLAY_TOOLS.length +
        DEPENDENCY_MANAGEMENT_TOOLS.length +
        EXIT_CRITERIA_MANAGEMENT_TOOLS.length +
        AGENT_PROMPT_MANAGEMENT_TOOLS.length;

      expect(ALL_MCP_TOOLS).toHaveLength(expectedCount);
    });

    it('should have proper tool naming with mcp_tasks prefix', () => {
      ALL_MCP_TOOLS.forEach(tool => {
        expect(tool.name).toMatch(/^mcp_tasks_/);
      });
    });

    it('should have valid tool schemas', () => {
      ALL_MCP_TOOLS.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });

  describe('List Management Tools', () => {
    it('should have 5 list management tools', () => {
      expect(LIST_MANAGEMENT_TOOLS).toHaveLength(5);
    });

    it('should include all required list management tools', () => {
      const toolNames = LIST_MANAGEMENT_TOOLS.map(tool => tool.name);
      expect(toolNames).toContain('mcp_tasks_create_list');
      expect(toolNames).toContain('mcp_tasks_get_list');
      expect(toolNames).toContain('mcp_tasks_list_all_lists');
      expect(toolNames).toContain('mcp_tasks_delete_list');
      expect(toolNames).toContain('mcp_tasks_update_list_metadata');
    });

    it('should have proper UUID validation patterns', () => {
      const getListTool = LIST_MANAGEMENT_TOOLS.find(
        tool => tool.name === 'mcp_tasks_get_list'
      );
      expect(getListTool?.inputSchema.properties?.listId).toMatchObject({
        type: 'string',
        format: 'uuid',
        pattern:
          '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      });
    });
  });

  describe('Task Management Tools', () => {
    it('should have 8 task management tools', () => {
      expect(TASK_MANAGEMENT_TOOLS).toHaveLength(8);
    });

    it('should include all required task management tools', () => {
      const toolNames = TASK_MANAGEMENT_TOOLS.map(tool => tool.name);
      expect(toolNames).toContain('mcp_tasks_add_task');
      expect(toolNames).toContain('mcp_tasks_update_task');
      expect(toolNames).toContain('mcp_tasks_complete_task');
      expect(toolNames).toContain('mcp_tasks_remove_task');
      expect(toolNames).toContain('mcp_tasks_set_task_priority');
      expect(toolNames).toContain('mcp_tasks_add_task_tags');
      expect(toolNames).toContain('mcp_tasks_remove_task_tags');
    });

    it('should have proper agent prompt template validation', () => {
      const addTaskTool = TASK_MANAGEMENT_TOOLS.find(
        tool => tool.name === 'mcp_tasks_add_task'
      );
      expect(
        addTaskTool?.inputSchema.properties?.agentPromptTemplate
      ).toMatchObject({
        type: 'string',
        maxLength: 10000,
      });
    });

    it('should have proper priority validation', () => {
      const addTaskTool = TASK_MANAGEMENT_TOOLS.find(
        tool => tool.name === 'mcp_tasks_add_task'
      );
      expect(addTaskTool?.inputSchema.properties?.priority).toMatchObject({
        type: 'number',
        minimum: 1,
        maximum: 5,
        default: 3,
      });
    });
  });

  describe('Search and Display Tools', () => {
    it('should have 2 search and display tools', () => {
      expect(SEARCH_DISPLAY_TOOLS).toHaveLength(2);
    });

    it('should include all required search and display tools', () => {
      const toolNames = SEARCH_DISPLAY_TOOLS.map(tool => tool.name);
      expect(toolNames).toContain('mcp_tasks_search_tool');
      expect(toolNames).toContain('mcp_tasks_show_tasks');
    });

    it('should have comprehensive search criteria', () => {
      const searchTool = SEARCH_DISPLAY_TOOLS.find(
        tool => tool.name === 'mcp_tasks_search_tool'
      );
      const properties = searchTool?.inputSchema.properties;

      expect(properties).toHaveProperty('query');
      expect(properties).toHaveProperty('listId');
      expect(properties).toHaveProperty('status');
      expect(properties).toHaveProperty('priority');
      expect(properties).toHaveProperty('tags');
      expect(properties).toHaveProperty('hasDependencies');
      expect(properties).toHaveProperty('isReady');
      expect(properties).toHaveProperty('isBlocked');
    });
  });

  describe('Dependency Management Tools', () => {
    it('should have 3 dependency management tools', () => {
      expect(DEPENDENCY_MANAGEMENT_TOOLS).toHaveLength(3);
    });

    it('should include all required dependency management tools', () => {
      const toolNames = DEPENDENCY_MANAGEMENT_TOOLS.map(tool => tool.name);
      expect(toolNames).toContain('mcp_tasks_set_task_dependencies');
      expect(toolNames).toContain('mcp_tasks_get_ready_tasks');
      expect(toolNames).toContain('mcp_tasks_analyze_task_dependencies');
    });

    it('should support empty dependency arrays', () => {
      const setDepsTool = DEPENDENCY_MANAGEMENT_TOOLS.find(
        tool => tool.name === 'mcp_tasks_set_task_dependencies'
      );
      expect(setDepsTool?.inputSchema.properties?.dependencyIds).toMatchObject({
        type: 'array',
        maxItems: 50,
      });
    });
  });

  describe('Exit Criteria Management Tools', () => {
    it('should have 2 exit criteria management tools', () => {
      expect(EXIT_CRITERIA_MANAGEMENT_TOOLS).toHaveLength(2);
    });

    it('should include all required exit criteria management tools', () => {
      const toolNames = EXIT_CRITERIA_MANAGEMENT_TOOLS.map(tool => tool.name);
      expect(toolNames).toContain('mcp_tasks_set_task_exit_criteria');
      expect(toolNames).toContain('mcp_tasks_update_exit_criteria');
    });

    it('should have proper exit criteria validation', () => {
      const setExitCriteriaTool = EXIT_CRITERIA_MANAGEMENT_TOOLS.find(
        tool => tool.name === 'mcp_tasks_set_task_exit_criteria'
      );
      expect(
        setExitCriteriaTool?.inputSchema.properties?.exitCriteria
      ).toMatchObject({
        type: 'array',
        maxItems: 20,
        items: {
          type: 'string',
          maxLength: 500,
        },
      });
    });
  });

  describe('Agent Prompt Management Tools', () => {
    it('should have 1 agent prompt management tool', () => {
      expect(AGENT_PROMPT_MANAGEMENT_TOOLS).toHaveLength(1);
    });

    it('should include the agent prompt tool', () => {
      const toolNames = AGENT_PROMPT_MANAGEMENT_TOOLS.map(tool => tool.name);
      expect(toolNames).toContain('mcp_tasks_get_agent_prompt');
    });

    it('should have proper useDefault parameter', () => {
      const getPromptTool = AGENT_PROMPT_MANAGEMENT_TOOLS.find(
        tool => tool.name === 'mcp_tasks_get_agent_prompt'
      );
      expect(getPromptTool?.inputSchema.properties?.useDefault).toMatchObject({
        type: 'boolean',
        default: false,
      });
    });
  });

  describe('Tool Descriptions and Methodology', () => {
    it('should have methodology guidance in descriptions', () => {
      const toolsWithMethodology = ALL_MCP_TOOLS.filter(
        tool =>
          tool.description.includes('🎯') ||
          tool.description.includes('🔍') ||
          tool.description.includes('🚀') ||
          tool.description.includes('📋') ||
          tool.description.includes('🔄') ||
          tool.description.includes('⚠️')
      );

      expect(toolsWithMethodology.length).toBeGreaterThan(0);
    });

    it('should reference Plan and Reflect methodology', () => {
      const methodologyTools = ALL_MCP_TOOLS.filter(
        tool =>
          tool.description.includes('Plan and Reflect') ||
          tool.description.includes('Persist Until Complete') ||
          tool.description.includes("Use Tools, Don't Guess")
      );

      expect(methodologyTools.length).toBeGreaterThan(0);
    });
  });
});
