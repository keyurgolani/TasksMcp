/**
 * Agent Integration Tests
 *
 * Tests the improved MCP server with real agent interactions to validate that
 * the changes effectively reduce validation errors and improve usability.
 *
 * This test suite simulates common agent mistakes and validates that the
 * preprocessing and enhanced error handling provide better user experience.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { McpTaskManagerServer } from "../../src/app/server.js";
import { ConfigManager } from "../../src/infrastructure/config/index.js";
import { StorageFactory } from "../../src/infrastructure/storage/storage-factory.js";
import { logger } from "../../src/shared/utils/logger.js";

describe("Agent Integration Tests", () => {
  let server: McpTaskManagerServer;
  let testListId: string;

  beforeEach(async () => {
    // Configure for testing with memory storage via environment variables
    process.env.STORAGE_TYPE = "memory";
    process.env.METRICS_ENABLED = "false";
    process.env.NODE_ENV = "test";

    server = new McpTaskManagerServer();
    await server.start();

    // Create a test list for task operations
    const createListResult = await simulateToolCall(server, "create_list", {
      title: "Agent Integration Test List",
      description: "Test list for agent integration testing",
    });

    const resultText = createListResult.content[0].text;
    if (resultText.includes('❌')) {
      throw new Error(`Failed to create test list: ${resultText}`);
    }
    
    // Parse the double-wrapped response
    const outerResponse = JSON.parse(resultText);
    const listData = JSON.parse(outerResponse.content[0].text);
    testListId = listData.id;
  });

  afterEach(async () => {
    // Cleanup is handled by memory storage reset
  });

  describe("Parameter Preprocessing Integration", () => {
    it("should handle string numbers in priority fields", async () => {
      // Simulate agent providing priority as string
      const result = await simulateToolCall(server, "add_task", {
        listId: testListId,
        title: "Test Task with String Priority",
        priority: "5", // String instead of number
      });

      expect(result.content[0].text).not.toContain("❌");
      
      // Parse the double-wrapped response
      const outerResponse = JSON.parse(result.content[0].text);
      const taskData = JSON.parse(outerResponse.content[0].text);
      expect(taskData.priority).toBe(5); // Should be converted to number
    });

    it("should handle JSON string arrays for tags", async () => {
      // Simulate agent providing tags as JSON string
      const result = await simulateToolCall(server, "add_task", {
        listId: testListId,
        title: "Test Task with JSON Tags",
        tags: '["urgent", "important", "bug-fix"]', // JSON string instead of array
      });

      expect(result.content[0].text).not.toContain("❌");
      
      // Parse the double-wrapped response
      const outerResponse = JSON.parse(result.content[0].text);
      const taskData = JSON.parse(outerResponse.content[0].text);
      expect(taskData.tags).toEqual(["urgent", "important", "bug-fix"]);
    });

    it("should handle boolean strings", async () => {
      // Test with list creation using boolean string
      const result = await simulateToolCall(server, "filter_tasks", {
        listId: testListId,
        includeCompleted: "true", // String instead of boolean
      });

      expect(result.content[0].text).not.toContain("❌");
      // Should successfully filter without validation errors
    });

    it("should handle mixed type coercion in single request", async () => {
      const result = await simulateToolCall(server, "add_task", {
        listId: testListId,
        title: "Mixed Types Task",
        priority: "3", // String number
        tags: '["mixed", "types"]', // JSON string array
        estimatedDuration: "120", // String number for minutes
      });

      expect(result.content[0].text).not.toContain("❌");
      
      // Parse the double-wrapped response
      const outerResponse = JSON.parse(result.content[0].text);
      const taskData = JSON.parse(outerResponse.content[0].text);
      expect(taskData.priority).toBe(3);
      expect(taskData.tags).toEqual(["mixed", "types"]);
      expect(taskData.estimatedDuration).toBe(120);
    });

    it("should preserve already correct types", async () => {
      const result = await simulateToolCall(server, "add_task", {
        listId: testListId,
        title: "Correct Types Task",
        priority: 4, // Already number
        tags: ["already", "array"], // Already array
        estimatedDuration: 90, // Already number
      });

      expect(result.content[0].text).not.toContain("❌");
      
      // Parse the double-wrapped response
      const outerResponse = JSON.parse(result.content[0].text);
      const taskData = JSON.parse(outerResponse.content[0].text);
      expect(taskData.priority).toBe(4);
      expect(taskData.tags).toEqual(["already", "array"]);
      expect(taskData.estimatedDuration).toBe(90);
    });
  });

  describe("Enhanced Error Messages Integration", () => {
    it("should provide agent-friendly error for invalid priority range", async () => {
      const result = await simulateToolCall(server, "add_task", {
        listId: testListId,
        title: "Invalid Priority Task",
        priority: "10", // Will be converted to 10, but max is 5
      });

      expect(result.content[0].text).toContain("❌");
      expect(result.content[0].text).toContain("💡");
      expect(result.content[0].text).toContain("Use numbers 1-5");
      expect(result.content[0].text).toContain("5 (highest) to 1 (lowest)");
    });

    it("should provide enum suggestions for invalid status", async () => {
      const result = await simulateToolCall(server, "filter_tasks", {
        listId: testListId,
        status: "done", // Invalid enum value, close to 'completed'
      });

      expect(result.content[0].text).toContain("❌");
      expect(result.content[0].text).toContain('Use one of the valid status values');
      expect(result.content[0].text).toContain("pending, in_progress, completed");
    });

    it("should provide helpful guidance for array type errors", async () => {
      const result = await simulateToolCall(server, "add_task", {
        listId: testListId,
        title: "Array Error Task",
        tags: "not-an-array", // String that can't be converted to array
      });

      expect(result.content[0].text).toContain("❌");
      expect(result.content[0].text).toContain("💡");
      expect(result.content[0].text).toContain("Provide as array of strings");
      expect(result.content[0].text).toContain(
        '\\"urgent\\", \\"important\\", \\"bug-fix\\"'
      );
    });

    it("should handle multiple validation errors with clear formatting", async () => {
      const result = await simulateToolCall(server, "add_task", {
        listId: testListId,
        title: "hi", // Too short
        priority: "urgent", // Invalid type that can't be converted
        tags: "not-array", // Invalid type
        estimatedDuration: "two hours", // Invalid type that can't be converted
      });

      expect(result.content[0].text).toContain("❌");
      expect(result.content[0].text).toContain("validation error");
      expect(result.content[0].text).toContain("title");
      expect(result.content[0].text).toContain("priority");
      expect(result.content[0].text).toContain("tags");
      expect(result.content[0].text).toContain("estimatedDuration");
      expect(result.content[0].text).toContain("💡");
    });

    it("should provide tool-specific guidance based on context", async () => {
      // Test add_task specific guidance
      const addTaskResult = await simulateToolCall(server, "add_task", {
        listId: testListId,
        title: "Test Task",
        priority: "high", // Invalid
      });

      expect(addTaskResult.content[0].text).toContain(
        "Use numbers 1-5, where 5 is highest priority"
      );

      // Test filter_tasks specific guidance
      const filterResult = await simulateToolCall(server, "filter_tasks", {
        listId: testListId,
        priority: "high", // Invalid
      });

      expect(filterResult.content[0].text).toContain(
        "Use numbers 1-5 to filter by priority level"
      );
    });
  });

  describe("Enum Fuzzy Matching Integration", () => {
    it("should suggest closest enum match for typos", async () => {
      const result = await simulateToolCall(server, "filter_tasks", {
        listId: testListId,
        status: "complet", // Typo for 'completed'
      });

      expect(result.content[0].text).toContain("❌");
      expect(result.content[0].text).toContain('Did you mean \\"completed\\"?');
    });

    it("should handle case-insensitive enum matching", async () => {
      const result = await simulateToolCall(server, "filter_tasks", {
        listId: testListId,
        status: "PENDING", // Wrong case
      });

      expect(result.content[0].text).toContain("❌");
      expect(result.content[0].text).toContain('Did you mean \\"pending\\"?');
    });

    it("should suggest multiple options when input is ambiguous", async () => {
      const result = await simulateToolCall(server, "filter_tasks", {
        listId: testListId,
        status: "p", // Very short, could match 'pending'
      });

      expect(result.content[0].text).toContain("❌");
      expect(result.content[0].text).toContain("💡 Use one of the valid status values");
      expect(result.content[0].text).toContain("pending");
    });

    it("should handle abbreviations and partial matches", async () => {
      const result = await simulateToolCall(server, "filter_tasks", {
        listId: testListId,
        status: "prog", // Abbreviation for 'in_progress'
      });

      expect(result.content[0].text).toContain("❌");
      expect(result.content[0].text).toContain('Did you mean \\"in_progress\\"?');
    });
  });

  describe("Real-world Agent Scenarios", () => {
    it("should handle common Claude Desktop mistakes", async () => {
      // Simulate common mistakes from Claude Desktop
      const scenarios = [
        {
          name: "Priority as word",
          params: { listId: testListId, title: "Task", priority: "high" },
          expectedSuggestion: "Use numbers 1-5",
        },
        {
          name: "Tags as comma-separated string",
          params: {
            listId: testListId,
            title: "Task",
            tags: "urgent,important",
          },
          expectedSuggestion: "Provide as array of strings",
        },
        {
          name: "Boolean as string",
          params: { listId: testListId, includeCompleted: "yes" },
          tool: "filter_tasks",
          shouldSucceed: true, // 'yes' should be converted to true
        },
        {
          name: "Duration with units",
          params: {
            listId: testListId,
            title: "Task",
            estimatedDuration: "2 hours",
          },
          expectedSuggestion: "Provide duration in minutes as a number",
        },
      ];

      for (const scenario of scenarios) {
        const toolName = scenario.tool || "add_task";
        const result = await simulateToolCall(
          server,
          toolName,
          scenario.params
        );

        if (scenario.shouldSucceed) {
          expect(result.content[0].text).not.toContain("❌");
        } else {
          expect(result.content[0].text).toContain("❌");
          if (scenario.expectedSuggestion) {
            expect(result.content[0].text).toContain(
              scenario.expectedSuggestion
            );
          }
        }
      }
    });

    it("should handle Kiro IDE agent patterns", async () => {
      // Simulate patterns common in Kiro IDE
      const result = await simulateToolCall(server, "add_task", {
        listId: testListId,
        title: "Kiro Task",
        priority: "5",
        tags: JSON.stringify(["kiro", "ide", "task"]),
        estimatedDuration: "30",
        description: "Task created by Kiro IDE agent",
      });

      expect(result.content[0].text).not.toContain("❌");
      // The response is double-encoded JSON, need to parse twice
      const outerResponse = JSON.parse(result.content[0].text);
      const taskData = JSON.parse(outerResponse.content[0].text);
      expect(taskData.priority).toBe(5);
      expect(taskData.tags).toEqual(["kiro", "ide", "task"]);
      expect(taskData.estimatedDuration).toBe(30);
    });

    it("should handle mixed valid and invalid parameters gracefully", async () => {
      const result = await simulateToolCall(server, "add_task", {
        listId: testListId,
        title: "Mixed Validity Task",
        priority: "3", // Valid after conversion
        tags: '["valid", "array"]', // Valid after conversion
        estimatedDuration: "invalid-duration", // Invalid, can't convert
      });

      expect(result.content[0].text).toContain("❌");
      expect(result.content[0].text).toContain("estimatedDuration");
      expect(result.content[0].text).toContain("💡");
      expect(result.content[0].text).toContain(
        "Provide duration in minutes as a number"
      );
    });
  });

  describe("Performance Impact Validation", () => {
    it("should not significantly impact performance with preprocessing", async () => {
      const startTime = Date.now();

      // Perform multiple operations with preprocessing
      for (let i = 0; i < 10; i++) {
        await simulateToolCall(server, "add_task", {
          listId: testListId,
          title: `Performance Test Task ${i}`,
          priority: String(Math.floor(Math.random() * 5) + 1),
          tags: JSON.stringify([`tag${i}`, "performance"]),
          estimatedDuration: String(Math.floor(Math.random() * 120) + 30),
        });
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete 10 operations in reasonable time (less than 2 seconds)
      expect(totalTime).toBeLessThan(2000);
    });

    it("should handle large parameter objects efficiently", async () => {
      const largeDescription = "A".repeat(1000); // Large description
      const manyTags = Array.from({ length: 8 }, (_, i) => `tag${i}`); // Within the 10 tag limit

      const startTime = Date.now();

      const result = await simulateToolCall(server, "add_task", {
        listId: testListId,
        title: "Large Parameter Task",
        description: largeDescription,
        priority: "4",
        tags: JSON.stringify(manyTags),
        estimatedDuration: "60",
      });

      const endTime = Date.now();
      const operationTime = endTime - startTime;

      expect(result.content[0].text).not.toContain("❌");
      expect(operationTime).toBeLessThan(500); // Should be fast even with large params
    });
  });

  describe("Error Recovery and Resilience", () => {
    it("should recover gracefully from preprocessing errors", async () => {
      // Test with parameters that might cause preprocessing issues
      const result = await simulateToolCall(server, "add_task", {
        listId: testListId,
        title: "Recovery Test Task",
        priority: "3",
        tags: "[invalid json", // Malformed JSON
        estimatedDuration: "45",
      });

      expect(result.content[0].text).toContain("❌");
      expect(result.content[0].text).toContain("tags");
      expect(result.content[0].text).toContain("💡");
      // Should provide helpful guidance even when preprocessing fails
    });

    it("should maintain backward compatibility", async () => {
      // Test with pre-improvement request format
      const result = await simulateToolCall(server, "add_task", {
        listId: testListId,
        title: "Backward Compatible Task",
        priority: 2, // Already correct type
        tags: ["already", "correct"], // Already correct type
        estimatedDuration: 75, // Already correct type
      });

      expect(result.content[0].text).not.toContain("❌");
      // The response is double-encoded JSON, need to parse twice
      const outerResponse = JSON.parse(result.content[0].text);
      const taskData = JSON.parse(outerResponse.content[0].text);
      expect(taskData.title).toBe("Backward Compatible Task");
      expect(taskData.priority).toBe(2);
      expect(taskData.tags).toEqual(["already", "correct"]);
    });

    it("should handle edge cases without crashing", async () => {
      const edgeCases = [
        { listId: testListId, title: "", priority: "0" }, // Empty title, invalid priority
        { listId: testListId, title: "Edge Case", tags: null }, // Null tags
        { listId: testListId, title: "Edge Case", priority: "NaN" }, // NaN priority
        {
          listId: testListId,
          title: "Edge Case",
          estimatedDuration: "Infinity",
        }, // Infinity duration
      ];

      for (const params of edgeCases) {
        const result = await simulateToolCall(server, "add_task", params);

        // Should return error response, not crash
        expect(result.content[0].text).toContain("❌");
        expect(result.content[0].text).toContain("💡");
      }
    });
  });

  describe("User Experience Improvements", () => {
    it("should provide clear, actionable error messages", async () => {
      const result = await simulateToolCall(server, "add_task", {
        listId: testListId,
        title: "UX Test Task",
        priority: "urgent",
      });

      const errorText = result.content[0].text;

      // Should have clear error indicators
      expect(errorText).toContain("❌");

      // Should have helpful suggestions
      expect(errorText).toContain("💡");

      // Should have examples
      expect(errorText).toContain("📝");

      // Should be actionable
      expect(errorText.toLowerCase()).toMatch(/use|provide|try|example/);

      // Should not be too technical
      expect(errorText).not.toContain("ZodError");
      expect(errorText).not.toContain("ValidationError");
    });

    it("should provide working examples in error responses", async () => {
      const result = await simulateToolCall(server, "add_task", {
        listId: testListId,
        title: "Example Test Task",
        tags: "not-array",
      });

      const errorText = result.content[0].text;

      expect(errorText).toContain("📝");
      expect(errorText).toContain('\\"urgent\\", \\"important\\", \\"bug-fix\\"');
      expect(errorText).toContain("listId");
      expect(errorText).toContain("title");
    });

    it("should limit error message length for readability", async () => {
      // Create a request with many validation errors
      const result = await simulateToolCall(server, "add_task", {
        listId: "invalid-uuid",
        title: "", // Too short
        priority: "invalid",
        tags: "invalid",
        estimatedDuration: "invalid",
      });

      const errorText = result.content[0].text;

      // Should contain errors but not be overwhelming
      expect(errorText.length).toBeLessThan(2000);
      expect(errorText).toContain("❌");
      expect(errorText).toContain("💡");
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
    // Use reflection to access the private routeToolCall method
    const routeToolCall = (server as any).routeToolCall.bind(server);
    const result = await routeToolCall(toolName, request);

    return {
      content: [
        {
          text: typeof result === "string" ? result : JSON.stringify(result),
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
