/**
 * Simplified Agent Integration Tests
 *
 * Focused tests to validate the agent-friendly improvements work correctly.
 * This test suite demonstrates that preprocessing and enhanced error handling
 * provide better user experience for AI agents.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { McpTaskManagerServer } from '../../src/app/server.js';
import { TestCleanup } from '../setup.js';

describe('Agent Integration Tests - Simplified', () => {
  let server: McpTaskManagerServer;
  let testListId: string;

  beforeEach(async () => {
    // Configure for testing with memory storage via environment variables
    await TestCleanup.registerEnvVar('STORAGE_TYPE', 'memory');
    await TestCleanup.registerEnvVar('METRICS_ENABLED', 'false');
    await TestCleanup.registerEnvVar('NODE_ENV', 'test');

    server = new McpTaskManagerServer();
    await server.start();

    // Register server for cleanup
    TestCleanup.registerServer(server);

    // Create a test list for task operations
    const createListResult = await simulateToolCall(server, 'create_list', {
      title: 'Agent Integration Test List',
      description: 'Test list for agent integration testing',
    });

    // Parse the nested JSON response
    const outerResponse = JSON.parse(createListResult.content[0].text);
    const listData = JSON.parse(outerResponse.content[0].text);
    testListId = listData.id;
  });

  afterEach(async () => {
    // Cleanup is handled automatically by test setup
  });

  describe('Parameter Preprocessing Validation', () => {
    it('should successfully convert string numbers to numbers', async () => {
      const result = await simulateToolCall(server, 'add_task', {
        listId: testListId,
        title: 'Test Task with String Priority',
        priority: '5', // String instead of number
      });

      // Should succeed after preprocessing
      expect(result.content[0].text).not.toContain('❌');
      const outerResponse = JSON.parse(result.content[0].text);
      const taskData = JSON.parse(outerResponse.content[0].text);
      expect(taskData.priority).toBe(5); // Should be converted to number
    });

    it('should successfully convert JSON string arrays to arrays', async () => {
      const result = await simulateToolCall(server, 'add_task', {
        listId: testListId,
        title: 'Test Task with JSON Tags',
        tags: '["urgent", "important"]', // JSON string instead of array
      });

      // Should succeed after preprocessing
      expect(result.content[0].text).not.toContain('❌');
      const outerResponse = JSON.parse(result.content[0].text);
      const taskData = JSON.parse(outerResponse.content[0].text);
      expect(taskData.tags).toEqual(['urgent', 'important']);
    });

    it('should successfully convert boolean strings to booleans', async () => {
      const result = await simulateToolCall(server, 'search_tool', {
        listId: testListId,
        includeCompleted: 'true', // String instead of boolean
      });

      // Should succeed after preprocessing
      expect(result.content[0].text).not.toContain('❌');
      // Should successfully filter without validation errors
    });

    it('should handle mixed type coercion in single request', async () => {
      const result = await simulateToolCall(server, 'add_task', {
        listId: testListId,
        title: 'Mixed Types Task',
        priority: '3', // String number
        tags: '["mixed", "types"]', // JSON string array
        estimatedDuration: '120', // String number for minutes
      });

      // Should succeed after preprocessing
      expect(result.content[0].text).not.toContain('❌');
      const outerResponse = JSON.parse(result.content[0].text);
      const taskData = JSON.parse(outerResponse.content[0].text);
      expect(taskData.priority).toBe(3);
      expect(taskData.tags).toEqual(['mixed', 'types']);
      expect(taskData.estimatedDuration).toBe(120);
    });
  });

  describe('Enhanced Error Messages Validation', () => {
    it('should provide agent-friendly error for invalid priority range', async () => {
      const result = await simulateToolCall(server, 'add_task', {
        listId: testListId,
        title: 'Invalid Priority Task',
        priority: '10', // Will be converted to 10, but max is 5
      });

      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('💡');
      expect(result.content[0].text).toContain('Use numbers 1-5');
      // The error message should be helpful and actionable
    });

    it('should provide helpful guidance for array type errors', async () => {
      const result = await simulateToolCall(server, 'add_task', {
        listId: testListId,
        title: 'Array Error Task',
        tags: 'not-an-array', // String that can't be converted to array
      });

      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('💡');
      expect(result.content[0].text).toContain('array of strings');
      expect(result.content[0].text).toContain('📝');
    });

    it('should handle multiple validation errors with clear formatting', async () => {
      const result = await simulateToolCall(server, 'add_task', {
        listId: testListId,
        title: 'hi', // Too short
        priority: 'urgent', // Invalid type that can't be converted
        tags: 'not-array', // Invalid type
      });

      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('validation error');
      expect(result.content[0].text).toContain('💡');
      // Should contain multiple error details
    });

    it('should provide clear, actionable error messages', async () => {
      const result = await simulateToolCall(server, 'add_task', {
        listId: testListId,
        title: 'UX Test Task',
        priority: 'urgent',
      });

      const errorText = result.content[0].text;

      // Should have clear error indicators
      expect(errorText).toContain('❌');

      // Should have helpful suggestions
      expect(errorText).toContain('💡');

      // Should be actionable
      expect(errorText.toLowerCase()).toMatch(/use|provide|try|example/);

      // Should not be too technical
      expect(errorText).not.toContain('ZodError');
      expect(errorText).not.toContain('ValidationError');
    });
  });

  describe('Enum Suggestions Validation', () => {
    it('should provide enum suggestions for invalid status', async () => {
      const result = await simulateToolCall(server, 'search_tool', {
        listId: testListId,
        status: ['done'], // Invalid enum value (now array)
      });

      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('Valid choices are:');
      expect(result.content[0].text).toContain('pending');
      expect(result.content[0].text).toContain('completed');
    });
  });

  describe('Performance and Resilience', () => {
    it('should not significantly impact performance with preprocessing', async () => {
      const startTime = Date.now();

      // Perform multiple operations with preprocessing
      for (let i = 0; i < 5; i++) {
        await simulateToolCall(server, 'add_task', {
          listId: testListId,
          title: `Performance Test Task ${i}`,
          priority: String(Math.floor(Math.random() * 5) + 1),
          tags: JSON.stringify([`tag${i}`, 'performance']),
        });
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete 5 operations in reasonable time
      expect(totalTime).toBeLessThan(5000);
    });

    it('should recover gracefully from preprocessing errors', async () => {
      // Test with parameters that might cause preprocessing issues
      const result = await simulateToolCall(server, 'add_task', {
        listId: testListId,
        title: 'Recovery Test Task',
        priority: '3',
        tags: '[invalid json', // Malformed JSON
      });

      expect(result.content[0].text).toContain('❌');
      expect(result.content[0].text).toContain('💡');
      // Should provide helpful guidance even when preprocessing fails
    });

    it('should maintain backward compatibility', async () => {
      // Test with pre-improvement request format
      const result = await simulateToolCall(server, 'add_task', {
        listId: testListId,
        title: 'Backward Compatible Task',
        priority: 2, // Already correct type
        tags: ['already', 'correct'], // Already correct type
        estimatedDuration: 75, // Already correct type
      });

      expect(result.content[0].text).not.toContain('❌');
      const outerResponse = JSON.parse(result.content[0].text);
      const taskData = JSON.parse(outerResponse.content[0].text);
      expect(taskData.title).toBe('Backward Compatible Task');
      expect(taskData.priority).toBe(2);
      expect(taskData.tags).toEqual(['already', 'correct']);
    });

    it('should handle edge cases without crashing', async () => {
      const edgeCases = [
        { listId: testListId, title: '', priority: '0' }, // Empty title, invalid priority
        { listId: testListId, title: 'Edge Case', tags: null }, // Null tags
        { listId: testListId, title: 'Edge Case', priority: 'NaN' }, // NaN priority
      ];

      for (const params of edgeCases) {
        const result = await simulateToolCall(server, 'add_task', params);

        // Should return error response, not crash
        expect(result.content[0].text).toContain('❌');
        expect(result.content[0].text).toContain('💡');
      }
    });
  });

  describe('Real-world Agent Scenarios', () => {
    it('should handle common agent input patterns', async () => {
      // Test various common patterns that agents might use
      const patterns = [
        {
          name: 'String priority with valid range',
          params: { listId: testListId, title: 'Task 1', priority: '5' },
          shouldSucceed: true,
        },
        {
          name: 'JSON string tags',
          params: {
            listId: testListId,
            title: 'Task 2',
            tags: '["urgent", "important"]',
          },
          shouldSucceed: true,
        },
        {
          name: 'String duration',
          params: {
            listId: testListId,
            title: 'Task 3',
            estimatedDuration: '120',
          },
          shouldSucceed: true,
        },
        {
          name: 'Invalid priority range',
          params: { listId: testListId, title: 'Task 4', priority: '10' },
          shouldSucceed: false,
        },
      ];

      for (const pattern of patterns) {
        const result = await simulateToolCall(
          server,
          'add_task',
          pattern.params
        );
        const isSuccess = !result.content[0].text.includes('❌');

        if (pattern.shouldSucceed) {
          expect(isSuccess).toBe(true);
        } else {
          expect(isSuccess).toBe(false);
          expect(result.content[0].text).toContain('💡');
        }
      }
    });

    it('should provide consistent error formatting across tools', async () => {
      const tools = [
        {
          name: 'add_task',
          params: { listId: testListId, title: 'Test', priority: 'invalid' },
        },
        {
          name: 'search_tool',
          params: { listId: testListId, priority: ['invalid'] },
        },
      ];

      const errorFormats: string[] = [];

      for (const tool of tools) {
        const result = await simulateToolCall(server, tool.name, tool.params);
        errorFormats.push(result.content[0].text);
      }

      // Check consistency in error formatting
      const allHaveEmojis = errorFormats.every(text => /[❌💡📝]/u.test(text));
      const allHaveSuggestions = errorFormats.every(text =>
        text.includes('💡')
      );

      expect(allHaveEmojis).toBe(true);
      expect(allHaveSuggestions).toBe(true);
    });
  });

  describe('Integration Metrics', () => {
    it('should demonstrate preprocessing effectiveness', async () => {
      const testCases = [
        // Cases that should succeed with preprocessing
        {
          params: { listId: testListId, title: 'Task 1', priority: '5' },
          shouldSucceed: true,
        },
        {
          params: {
            listId: testListId,
            title: 'Task 2',
            tags: '["tag1", "tag2"]',
          },
          shouldSucceed: true,
        },
        {
          params: {
            listId: testListId,
            title: 'Task 3',
            estimatedDuration: '120',
          },
          shouldSucceed: true,
        },

        // Cases that should still fail (invalid data)
        {
          params: { listId: testListId, title: 'Task 4', priority: '10' },
          shouldSucceed: false,
        },
        { params: { listId: testListId, title: '' }, shouldSucceed: false },
      ];

      let successCount = 0;
      let expectedSuccessCount = 0;
      let actualFailureCount = 0;
      let expectedFailureCount = 0;

      for (const testCase of testCases) {
        const result = await simulateToolCall(
          server,
          'add_task',
          testCase.params
        );
        const isSuccess = !result.content[0].text.includes('❌');

        if (testCase.shouldSucceed) {
          expectedSuccessCount++;
          if (isSuccess) successCount++;
        } else {
          expectedFailureCount++;
          if (!isSuccess) actualFailureCount++;
        }
      }

      // Calculate metrics
      const preprocessingSuccessRate = successCount / expectedSuccessCount;
      const appropriateFailureRate = actualFailureCount / expectedFailureCount;

      expect(preprocessingSuccessRate).toBeGreaterThan(0.8); // 80%+ success rate for valid cases
      expect(appropriateFailureRate).toBeGreaterThan(0.8); // 80%+ appropriate failure rate for invalid cases
    });

    it('should demonstrate error message quality', async () => {
      const result = await simulateToolCall(server, 'add_task', {
        listId: testListId,
        title: 'Test',
        priority: 'high',
        tags: 'not-array',
      });

      const errorText = result.content[0].text;

      // Quality indicators
      const hasEmojis = /[❌💡📝🔧]/u.test(errorText);
      const hasStructure =
        errorText.includes('\\n') || errorText.includes('\n'); // Check for actual or escaped newlines
      const isReasonableLength =
        errorText.length > 100 && errorText.length < 2000;
      const hasActionableLanguage = /use|provide|try|example|choose/i.test(
        errorText
      );
      const avoidsJargon = !/(zod|schema|parse)/i.test(errorText); // Removed 'validation' as it's commonly used

      expect(hasEmojis).toBe(true);
      expect(hasStructure).toBe(true);
      expect(isReasonableLength).toBe(true);
      expect(hasActionableLanguage).toBe(true);
      expect(avoidsJargon).toBe(true);
    });
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
    // Use the public routeToolCall method
    const routeToolCall = server.routeToolCall.bind(server);
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
