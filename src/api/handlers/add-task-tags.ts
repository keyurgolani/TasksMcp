/**
 * MCP handler for adding tags to tasks
 */

import { z } from "zod";
import type { CallToolRequest, CallToolResult } from "../../shared/types/mcp-types.js";
import type { TodoListManager } from "../../domain/lists/todo-list-manager.js";
import type { SimpleTaskResponse } from "../../shared/types/mcp-types.js";
import { logger } from "../../shared/utils/logger.js";

const AddTaskTagsSchema = z.object({
  listId: z.string().uuid(),
  taskId: z.string().uuid(),
  tags: z.array(z.string().max(50)).min(1).max(10),
});

export async function handleAddTaskTags(
  request: CallToolRequest,
  todoListManager: TodoListManager
): Promise<CallToolResult> {
  try {
    logger.debug("Processing add_task_tags request", {
      params: request.params?.arguments,
    });

    const args = AddTaskTagsSchema.parse(request.params?.arguments);
    const currentList = await todoListManager.getTodoList({
      listId: args.listId,
    });

    if (!currentList) {
      throw new Error("Todo list not found");
    }

    const currentTask = currentList.items.find(
      (item) => item.id === args.taskId
    );
    if (!currentTask) {
      throw new Error("Task not found");
    }

    const existingTags = currentTask.tags || [];
    const newTags = [...new Set([...existingTags, ...args.tags])];
    const result = await todoListManager.updateTodoList({
      listId: args.listId,
      action: "update_item",
      itemId: args.taskId,
      itemData: {
        tags: newTags,
      },
    });

    const updatedTask = result.items.find((item) => item.id === args.taskId);
    if (!updatedTask) {
      throw new Error("Task not found after tag update");
    }

    const addedTags = args.tags.filter((tag) => updatedTask.tags.includes(tag));
    if (addedTags.length !== args.tags.length) {
      logger.warn("Not all tags were successfully added", {
        requestedTags: args.tags,
        addedTags,
        finalTags: updatedTask.tags,
      });
    }

    const response: SimpleTaskResponse = {
      id: updatedTask.id,
      title: updatedTask.title,
      description: updatedTask.description,
      status: updatedTask.status,
      priority: updatedTask.priority,
      tags: updatedTask.tags,
      createdAt: updatedTask.createdAt.toISOString(),
      updatedAt: updatedTask.updatedAt.toISOString(),
      estimatedDuration: updatedTask.estimatedDuration,
    };

    logger.info("Task tags added successfully", {
      listId: args.listId,
      taskId: args.taskId,
      title: updatedTask.title,
      addedTags: args.tags,
      finalTags: updatedTask.tags,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    logger.error("Failed to add task tags", { error });

    if (error instanceof z.ZodError) {
      return {
        content: [
          {
            type: "text",
            text: `Validation error: ${error.errors
              .map((e) => `${e.path.join(".")}: ${e.message}`)
              .join(", ")}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Error: ${
            error instanceof Error ? error.message : "Unknown error occurred"
          }`,
        },
      ],
      isError: true,
    };
  }
}
