/**
 * Debug Integration Test
 * 
 * Simple test to debug the integration testing setup and understand
 * what's happening with the list creation and parameter passing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { McpTaskManagerServer } from '../../src/app/server.js';
import { TestCleanup } from '../setup.js';

describe('Debug Integration Test', () => {
  let server: McpTaskManagerServer;

  beforeEach(async () => {
    // Configure for testing with memory storage via environment variables
    await TestCleanup.registerEnvVar('STORAGE_TYPE', 'memory');
    await TestCleanup.registerEnvVar('METRICS_ENABLED', 'false');
    await TestCleanup.registerEnvVar('NODE_ENV', 'test');

    server = new McpTaskManagerServer();
    await server.start();
    
    // Register server for cleanup
    TestCleanup.registerServer(server);
  });

  afterEach(async () => {
    // Cleanup is handled automatically by test setup
  });

  it('should debug list creation and parameter passing', async () => {
    // Create a test list
    const createListResult = await simulateToolCall(server, 'create_list', {
      title: 'Debug Test List',
      description: 'Test list for debugging',
    });

    expect(createListResult).toBeDefined();
    expect(createListResult.content).toBeDefined();
    expect(createListResult.content[0]).toBeDefined();

    // Try to parse the result
    let listData;
    try {
      // The result is double-wrapped, so we need to parse twice
      const outerResult = JSON.parse(createListResult.content[0].text);
      listData = JSON.parse(outerResult.content[0].text);
    } catch (error) {
      throw new Error(`Failed to parse list data: ${error}`);
    }

    expect(listData).toBeDefined();
    expect(listData.id).toBeDefined();
    expect(listData.title).toBe('Debug Test List');

    // Now try to create a task with the list ID
    const addTaskResult = await simulateToolCall(server, 'add_task', {
      listId: listData.id,
      title: 'Debug Test Task',
      priority: '5', // String number to test preprocessing
    });

    expect(addTaskResult).toBeDefined();
    expect(addTaskResult.content).toBeDefined();

    // Check if it succeeded
    const isSuccess = !addTaskResult.content[0].text.includes('❌');
    expect(isSuccess).toBe(true);

    if (isSuccess) {
      try {
        // Check if the response is double-wrapped or single-wrapped
        const responseText = addTaskResult.content[0].text;
        let taskData;
        
        try {
          // Try parsing as single-wrapped first
          taskData = JSON.parse(responseText);
          // If it has a 'content' property, it's double-wrapped
          if (taskData.content && Array.isArray(taskData.content)) {
            taskData = JSON.parse(taskData.content[0].text);
          }
        } catch {
          // If single parse fails, it might be already parsed
          taskData = responseText;
        }
        
        expect(taskData).toBeDefined();
        if (taskData && typeof taskData === 'object') {
          expect(taskData.priority).toBe(5);
          expect(typeof taskData.priority).toBe('number');
        }
      } catch (error) {
        throw new Error(`Failed to parse task data: ${error}`);
      }
    }
  });

  it('should test parameter preprocessing directly', async () => {
    // First create a list
    const createListResult = await simulateToolCall(server, 'create_list', {
      title: 'Preprocessing Test List',
    });

    // The result is double-wrapped, so we need to parse twice
    const outerResult = JSON.parse(createListResult.content[0].text);
    const listData = JSON.parse(outerResult.content[0].text);
    
    expect(listData).toBeDefined();
    expect(listData.id).toBeDefined();

    // Test various preprocessing scenarios
    const testCases = [
      {
        name: 'String number priority',
        params: { listId: listData.id, title: 'Test 1', priority: '4' },
        expectedPriority: 4,
      },
      {
        name: 'JSON string tags',
        params: { listId: listData.id, title: 'Test 2', tags: '["tag1", "tag2"]' },
        expectedTags: ['tag1', 'tag2'],
      },
      {
        name: 'String duration',
        params: { listId: listData.id, title: 'Test 3', estimatedDuration: '90' },
        expectedDuration: 90,
      },
    ];

    for (const testCase of testCases) {
      const result = await simulateToolCall(server, 'add_task', testCase.params);
      const isSuccess = !result.content[0].text.includes('❌');
      
      expect(isSuccess).toBe(true);
      
      if (isSuccess) {
        try {
          // Handle double-wrapped response format
          const responseText = result.content[0].text;
          let taskData;
          
          try {
            // Try parsing as single-wrapped first
            taskData = JSON.parse(responseText);
            // If it has a 'content' property, it's double-wrapped
            if (taskData.content && Array.isArray(taskData.content)) {
              taskData = JSON.parse(taskData.content[0].text);
            }
          } catch {
            // If parsing fails, the response might be a plain string
            taskData = responseText;
          }
          
          expect(taskData).toBeDefined();
          expect(typeof taskData).toBe('object');
          
          if (testCase.expectedPriority !== undefined) {
            expect(taskData.priority).toBe(testCase.expectedPriority);
            expect(typeof taskData.priority).toBe('number');
          }
          
          if (testCase.expectedTags !== undefined) {
            expect(taskData.tags).toEqual(testCase.expectedTags);
            expect(Array.isArray(taskData.tags)).toBe(true);
          }
          
          if (testCase.expectedDuration !== undefined) {
            expect(taskData.estimatedDuration).toBe(testCase.expectedDuration);
            expect(typeof taskData.estimatedDuration).toBe('number');
          }
        } catch (error) {
          throw new Error(`Parse error for ${testCase.name}: ${error}`);
        }
      }
    }
  });
});

/**
 * Helper function to simulate MCP tool calls
 */
async function simulateToolCall(
  server: McpTaskManagerServer,
  toolName: string,
  params: Record<string, unknown>
): Promise<{ content: Array<{ text: string }> }> {
  const request = {
    params: {
      name: toolName,
      arguments: params,
    },
  };

  try {
    // Use reflection to access the private routeToolCall method
    const routeToolCall = (server as any).routeToolCall.bind(server);
    const result = await routeToolCall(toolName, request);
    
    return {
      content: [
        {
          text: typeof result === 'string' ? result : JSON.stringify(result),
        },
      ],
    };
  } catch (error) {
    // Return error as MCP response format
    return {
      content: [
        {
          text: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}