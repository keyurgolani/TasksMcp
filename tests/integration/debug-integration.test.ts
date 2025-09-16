/**
 * Debug Integration Test
 * 
 * Simple test to debug the integration testing setup and understand
 * what's happening with the list creation and parameter passing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { McpTaskManagerServer } from '../../src/app/server.js';

describe('Debug Integration Test', () => {
  let server: McpTaskManagerServer;

  beforeEach(async () => {
    // Configure for testing with memory storage via environment variables
    process.env.STORAGE_TYPE = 'memory';
    process.env.METRICS_ENABLED = 'false';
    process.env.NODE_ENV = 'test';

    server = new McpTaskManagerServer();
    await server.start();
  });

  afterEach(async () => {
    // Clean up server resources
    if (server) {
      await server.close();
    }
    // Clean up environment variables
    delete process.env.STORAGE_TYPE;
    delete process.env.METRICS_ENABLED;
    delete process.env.NODE_ENV;
  });

  it('should debug list creation and parameter passing', async () => {
    console.log('=== Testing list creation ===');
    
    // Create a test list
    const createListResult = await simulateToolCall(server, 'create_list', {
      title: 'Debug Test List',
      description: 'Test list for debugging',
    });

    console.log('Create list result:', createListResult);
    console.log('Create list text:', createListResult.content[0].text);

    // Try to parse the result
    let listData;
    try {
      // The result is double-wrapped, so we need to parse twice
      const outerResult = JSON.parse(createListResult.content[0].text);
      listData = JSON.parse(outerResult.content[0].text);
      console.log('Parsed list data:', listData);
      console.log('List ID:', listData.id);
    } catch (error) {
      console.log('Failed to parse list data:', error);
      return;
    }

    if (!listData.id) {
      console.log('No ID found in list data');
      return;
    }

    console.log('=== Testing task creation with valid listId ===');
    
    // Now try to create a task with the list ID
    const addTaskResult = await simulateToolCall(server, 'add_task', {
      listId: listData.id,
      title: 'Debug Test Task',
      priority: '5', // String number to test preprocessing
    });

    console.log('Add task result:', addTaskResult);
    console.log('Add task text:', addTaskResult.content[0].text);

    // Check if it succeeded
    const isSuccess = !addTaskResult.content[0].text.includes('❌');
    console.log('Task creation success:', isSuccess);

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
        
        console.log('Parsed task data:', taskData);
        if (taskData && typeof taskData === 'object') {
          console.log('Task priority (should be number 5):', taskData.priority, typeof taskData.priority);
        } else {
          console.log('Task data is not an object:', typeof taskData);
        }
      } catch (error) {
        console.log('Failed to parse task data:', error);
      }
    }
  });

  it('should test parameter preprocessing directly', async () => {
    console.log('=== Testing parameter preprocessing ===');
    
    // First create a list
    const createListResult = await simulateToolCall(server, 'create_list', {
      title: 'Preprocessing Test List',
    });

    // The result is double-wrapped, so we need to parse twice
    const outerResult = JSON.parse(createListResult.content[0].text);
    const listData = JSON.parse(outerResult.content[0].text);
    console.log('Created list with ID:', listData.id);

    // Test various preprocessing scenarios
    const testCases = [
      {
        name: 'String number priority',
        params: { listId: listData.id, title: 'Test 1', priority: '4' },
      },
      {
        name: 'JSON string tags',
        params: { listId: listData.id, title: 'Test 2', tags: '["tag1", "tag2"]' },
      },
      {
        name: 'String duration',
        params: { listId: listData.id, title: 'Test 3', estimatedDuration: '90' },
      },
    ];

    for (const testCase of testCases) {
      console.log(`\n--- Testing: ${testCase.name} ---`);
      console.log('Input params:', testCase.params);
      
      const result = await simulateToolCall(server, 'add_task', testCase.params);
      const isSuccess = !result.content[0].text.includes('❌');
      
      console.log('Success:', isSuccess);
      console.log('Response:', result.content[0].text.substring(0, 200) + '...');
      
      if (isSuccess) {
        try {
          const taskData = JSON.parse(result.content[0].text);
          console.log('Converted values:');
          if (testCase.params.priority && taskData.priority !== undefined) {
            console.log('  priority:', taskData.priority, typeof taskData.priority);
          }
          if (testCase.params.tags && taskData.tags !== undefined) {
            console.log('  tags:', taskData.tags);
          }
          if (testCase.params.estimatedDuration && taskData.estimatedDuration !== undefined) {
            console.log('  estimatedDuration:', taskData.estimatedDuration, typeof taskData.estimatedDuration);
          }
        } catch (error) {
          console.log('Parse error:', error);
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