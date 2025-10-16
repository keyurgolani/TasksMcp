/**
 * MCP Tool Validation
 * Provides validation for MCP tool parameters with agent-friendly error messages
 */

import { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { z, ZodError } from 'zod';

/**
 * Error formatter for MCP validation errors
 */
export function formatMcpValidationError(
  error: ZodError,
  toolName: string,
  originalInput?: unknown
): string {
  const errors = error.issues;

  let result = `❌ Validation error in tool "${toolName}": ${JSON.stringify(errors, null, 2)}`;

  // Add original input context if provided
  if (originalInput !== undefined) {
    result += `\n\n📥 Original input: ${JSON.stringify(originalInput, null, 2)}`;
  }

  // Add common fixes section
  result += '\n\n🔧 Common fixes:';
  result += '\n1. Check parameter types and formats';
  result += '\n2. Ensure all required fields are provided';
  result += '\n3. Verify UUID format for ID fields';

  // Add working example section
  result += '\n\n📝 Working example:';
  result +=
    '\n{\n  "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",\n  "title": "New task"\n}';

  return result;
}

/**
 * Validates MCP tool parameters against their schema
 */
export function validateMcpToolParameters(
  request: CallToolRequest,
  schema: z.ZodSchema
): { isValid: boolean; error?: string } {
  try {
    schema.parse(request.params.arguments);
    return { isValid: true };
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedError = formatMcpValidationError(
        error,
        request.params.name,
        request.params.arguments
      );
      return { isValid: false, error: formattedError };
    }
    return {
      isValid: false,
      error: `❌ Validation error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
