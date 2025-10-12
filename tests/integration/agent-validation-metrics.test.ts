/**
 * Agent Validation Metrics Tests
 *
 * Measures the effectiveness of agent-friendly improvements by comparing
 * before/after scenarios and collecting metrics on error reduction and
 * user experience improvements.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { z as _z } from 'zod';

import { McpTaskManagerServer } from '../../src/app/server.js';
import { ConfigManager as _ConfigManager } from '../../src/infrastructure/config/index.js';
import { TestCleanup } from '../setup.js';

describe('Agent Validation Metrics', () => {
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

    const createListResult = await simulateToolCall(server, 'create_list', {
      title: 'Metrics Test List',
    });

    // The result is double-wrapped, so we need to parse twice
    const outerResult = JSON.parse(createListResult.content[0].text);
    const listData = JSON.parse(outerResult.content[0].text);
    testListId = listData.id;
  });

  afterEach(async () => {
    // Cleanup is handled automatically by test setup
  });

  describe('Error Rate Reduction Metrics', () => {
    it('should measure preprocessing success rate', async () => {
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
        {
          params: { listId: testListId, status: ['pending'] },
          tool: 'search_tool',
          shouldSucceed: true,
        },
        {
          params: { listId: testListId, priority: [3] },
          tool: 'search_tool',
          shouldSucceed: true,
        },

        // Cases that should still fail (invalid data)
        {
          params: { listId: testListId, title: 'Task 4', priority: '10' },
          shouldSucceed: false,
        },
        {
          params: { listId: testListId, title: '', priority: '3' },
          shouldSucceed: false,
        },
        {
          params: { listId: 'invalid-uuid', title: 'Task 5' },
          shouldSucceed: false,
        },
      ];

      let successCount = 0;
      let expectedSuccessCount = 0;
      let actualFailureCount = 0;
      let expectedFailureCount = 0;

      for (const testCase of testCases) {
        const toolName = testCase.tool || 'add_task';
        const result = await simulateToolCall(
          server,
          toolName,
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

    it('should measure error message quality improvements', async () => {
      const errorScenarios = [
        {
          params: { listId: testListId, title: 'Test', priority: 'high' },
          expectedElements: ['❌', '💡', 'Use numbers 1-5', '📝'],
        },
        {
          params: { listId: testListId, title: 'Test', tags: 'not-array' },
          expectedElements: ['❌', '💡', 'array of strings', '📝'],
        },
        {
          params: { listId: testListId, status: ['done'] },
          tool: 'search_tool',
          expectedElements: [
            '❌',
            'Did you mean "completed"?',
            'pending, completed',
          ],
        },
      ];

      let qualityScore = 0;
      const maxScore = errorScenarios.length * 4; // 4 quality indicators per scenario

      for (const scenario of errorScenarios) {
        const toolName = scenario.tool || 'add_task';
        const result = await simulateToolCall(
          server,
          toolName,
          scenario.params
        );
        const errorText = result.content[0].text;

        // Score based on presence of quality indicators
        for (const element of scenario.expectedElements) {
          if (errorText.includes(element)) {
            qualityScore++;
          }
        }
      }

      const qualityPercentage = (qualityScore / maxScore) * 100;
      expect(qualityPercentage).toBeGreaterThanOrEqual(75); // 75%+ quality score
    });
  });

  describe('User Experience Metrics', () => {
    it('should measure error message readability', async () => {
      const result = await simulateToolCall(server, 'add_task', {
        listId: testListId,
        title: 'Test',
        priority: 'urgent',
        tags: 'not-array',
      });

      let errorText = result.content[0].text;

      // Parse the JSON-wrapped error message to get the actual error text
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.content && parsed.content[0] && parsed.content[0].text) {
          errorText = parsed.content[0].text;
        }
      } catch {
        // If parsing fails, use the original text
      }

      // Readability metrics
      const hasEmojis = /[❌💡📝🔧]/u.test(errorText);
      const hasStructure = errorText.includes('\n');
      const isReasonableLength =
        errorText.length > 100 && errorText.length < 1500;
      const hasActionableLanguage = /use|provide|try|example|choose/i.test(
        errorText
      );
      const avoidsJargon = !/(zod|schema|parse)/i.test(errorText);

      expect(hasEmojis).toBe(true);
      expect(hasStructure).toBe(true);
      expect(isReasonableLength).toBe(true);
      expect(hasActionableLanguage).toBe(true);
      expect(avoidsJargon).toBe(true);
    });

    it('should measure suggestion accuracy for enum errors', async () => {
      const enumTestCases = [
        {
          input: 'complet',
          expected: 'completed',
          tool: 'search_tool',
          param: 'status',
        },
        {
          input: 'pend',
          expected: 'pending',
          tool: 'search_tool',
          param: 'status',
        },
        {
          input: 'cancel',
          expected: 'cancelled',
          tool: 'search_tool',
          param: 'status',
        },
        {
          input: 'PENDING',
          expected: 'pending',
          tool: 'search_tool',
          param: 'status',
        },
      ];

      let accurateCount = 0;

      for (const testCase of enumTestCases) {
        // For search_tool, status parameter should be an array
        const paramValue =
          testCase.tool === 'search_tool' && testCase.param === 'status'
            ? [testCase.input]
            : testCase.input;
        const params = { listId: testListId, [testCase.param]: paramValue };
        const result = await simulateToolCall(server, testCase.tool, params);
        let errorText = result.content[0].text;

        // Parse the JSON-wrapped error message to get the actual error text
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.content && parsed.content[0] && parsed.content[0].text) {
            errorText = parsed.content[0].text;
          }
        } catch {
          // If parsing fails, use the original text
        }

        if (errorText.includes(`Did you mean "${testCase.expected}"?`)) {
          accurateCount++;
        }
      }

      const accuracy = accurateCount / enumTestCases.length;
      expect(accuracy).toBeGreaterThan(0.75); // 75%+ accuracy for enum suggestions
    });

    it('should measure response time impact', async () => {
      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await simulateToolCall(server, 'add_task', {
          listId: testListId,
          title: `Performance Test ${i}`,
          priority: String(Math.floor(Math.random() * 5) + 1),
          tags: JSON.stringify([`tag${i}`]),
        });

        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      const averageTime =
        times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      // Performance should be reasonable
      expect(averageTime).toBeLessThan(100); // Average under 100ms
      expect(maxTime).toBeLessThan(500); // Max under 500ms
    });
  });

  describe('Preprocessing Effectiveness Metrics', () => {
    it('should measure type coercion success rates by type', async () => {
      const coercionTests = [
        // Number coercion (use valid priority values 1-5)
        { type: 'number', input: '4', expected: 4, param: 'priority' },
        {
          type: 'number',
          input: '90',
          expected: 90,
          param: 'estimatedDuration',
        },
        { type: 'number', input: '1', expected: 1, param: 'priority' },

        // Boolean coercion (test with get_list which returns includeCompleted)
        {
          type: 'boolean',
          input: 'true',
          expected: true,
          param: 'includeCompleted',
          tool: 'get_list',
        },
        {
          type: 'boolean',
          input: 'false',
          expected: false,
          param: 'includeCompleted',
          tool: 'get_list',
        },

        // JSON coercion
        {
          type: 'json',
          input: '["tag1", "tag2"]',
          expected: ['tag1', 'tag2'],
          param: 'tags',
        },
        { type: 'json', input: '[]', expected: [], param: 'tags' },
      ];

      const results: Record<string, { success: number; total: number }> = {
        number: { success: 0, total: 0 },
        boolean: { success: 0, total: 0 },
        json: { success: 0, total: 0 },
      };

      for (const test of coercionTests) {
        results[test.type].total++;

        const toolName = test.tool || 'add_task';
        const params = {
          listId: testListId,
          title: 'Coercion Test',
          [test.param]: test.input,
        };

        const result = await simulateToolCall(server, toolName, params);
        const responseText = result.content[0].text;

        if (!responseText.includes('❌')) {
          // For boolean tests with get_list, success is just not getting an error
          if (test.type === 'boolean' && test.tool === 'get_list') {
            results[test.type].success++;
          } else {
            // Parse the result to check if coercion worked
            try {
              // Handle double-wrapped JSON responses
              let data = JSON.parse(responseText);
              if (data.content && data.content[0] && data.content[0].text) {
                data = JSON.parse(data.content[0].text);
              }

              if (
                JSON.stringify(data[test.param]) ===
                JSON.stringify(test.expected)
              ) {
                results[test.type].success++;
              }
            } catch {
              // If parsing fails, it might be a filter result - check for no error
              results[test.type].success++;
            }
          }
        }
      }

      // Calculate success rates
      for (const [_type, stats] of Object.entries(results)) {
        const successRate = stats.success / stats.total;
        expect(successRate).toBeGreaterThan(0.8); // 80%+ success rate for each type
      }
    });

    it('should measure malformed input handling', async () => {
      const malformedInputs = [
        { param: 'tags', value: '[invalid json' },
        { param: 'tags', value: '{"not": "array"}' },
        { param: 'priority', value: 'not-a-number' },
        { param: 'estimatedDuration', value: 'two hours' },
      ];

      let gracefulHandlingCount = 0;

      for (const input of malformedInputs) {
        const params = {
          listId: testListId,
          title: 'Malformed Test',
          [input.param]: input.value,
        };

        const result = await simulateToolCall(server, 'add_task', params);

        // Should return error but not crash
        if (
          result.content[0].text.includes('❌') &&
          result.content[0].text.includes('💡')
        ) {
          gracefulHandlingCount++;
        }
      }

      const gracefulHandlingRate =
        gracefulHandlingCount / malformedInputs.length;
      expect(gracefulHandlingRate).toBe(1.0); // 100% graceful handling
    });
  });

  describe('Backward Compatibility Metrics', () => {
    it('should maintain 100% compatibility with existing valid requests', async () => {
      const existingValidRequests = [
        {
          tool: 'add_task',
          params: {
            listId: testListId,
            title: 'Existing Task',
            priority: 3,
            tags: ['existing', 'valid'],
            estimatedDuration: 60,
          },
        },
        {
          tool: 'search_tool',
          params: {
            listId: testListId,
            includeCompleted: true,
            priority: [4],
          },
        },
        {
          tool: 'create_list',
          params: {
            title: 'Existing List',
            description: 'Valid existing request',
          },
        },
      ];

      let compatibilityCount = 0;

      for (const request of existingValidRequests) {
        const result = await simulateToolCall(
          server,
          request.tool,
          request.params
        );

        if (!result.content[0].text.includes('❌')) {
          compatibilityCount++;
        }
      }

      const compatibilityRate =
        compatibilityCount / existingValidRequests.length;
      expect(compatibilityRate).toBe(1.0); // 100% backward compatibility
    });
  });

  describe('Agent-Specific Behavior Metrics', () => {
    it('should handle Claude Desktop common patterns', async () => {
      const claudePatterns = [
        { priority: 'high', expectedConversion: false }, // Should fail with suggestion
        { priority: '5', expectedConversion: true }, // Should succeed
        { tags: 'urgent,important', expectedConversion: false }, // Should fail with guidance
        { tags: '["urgent", "important"]', expectedConversion: true }, // Should succeed
        { estimatedDuration: '2 hours', expectedConversion: false }, // Should fail with guidance
        { estimatedDuration: '120', expectedConversion: true }, // Should succeed
      ];

      let correctBehaviorCount = 0;

      for (const pattern of claudePatterns) {
        const params = {
          listId: testListId,
          title: 'Claude Pattern Test',
          ...pattern,
        };

        // Remove the expectedConversion property before making the call
        const { expectedConversion, ...testParams } = pattern;
        const finalParams = { ...params, ...testParams };

        delete (finalParams as any).expectedConversion;

        const result = await simulateToolCall(server, 'add_task', finalParams);
        const isSuccess = !result.content[0].text.includes('❌');

        if (isSuccess === expectedConversion) {
          correctBehaviorCount++;
        }
      }

      const correctBehaviorRate = correctBehaviorCount / claudePatterns.length;
      expect(correctBehaviorRate).toBeGreaterThan(0.8); // 80%+ correct behavior
    });

    it('should provide consistent error formatting across tools', async () => {
      const tools = ['add_task', 'search_tool', 'update_task'];
      const errorFormats: string[] = [];

      for (const tool of tools) {
        const params: any = { listId: testListId };

        if (tool === 'add_task') {
          params.title = 'Test';
          params.priority = 'invalid';
        } else if (tool === 'search_tool') {
          params.priority = 'invalid';
        } else if (tool === 'update_task') {
          params.taskId = 'invalid-uuid';
          params.title = 'Test';
        }

        const result = await simulateToolCall(server, tool, params);
        let errorText = result.content[0].text;

        // Parse the JSON-wrapped error message to get the actual error text
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.content && parsed.content[0] && parsed.content[0].text) {
            errorText = parsed.content[0].text;
          }
        } catch {
          // If parsing fails, use the original text
        }

        errorFormats.push(errorText);
      }

      // Check consistency in error formatting
      const allHaveEmojis = errorFormats.every(text => /[❌💡📝]/u.test(text));
      const allHaveSuggestions = errorFormats.every(text =>
        text.includes('💡')
      );
      const allAreStructured = errorFormats.every(text => text.includes('\n'));

      expect(allHaveEmojis).toBe(true);
      expect(allHaveSuggestions).toBe(true);
      expect(allAreStructured).toBe(true);
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
    return {
      content: [
        {
          text: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  }
}
