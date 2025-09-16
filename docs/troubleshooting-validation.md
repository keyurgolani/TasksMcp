# Troubleshooting Validation Issues

This guide helps resolve common validation errors when using the MCP Task Manager with AI agents.

## 🤖 Agent-Friendly Error Resolution

The MCP Task Manager includes smart parameter preprocessing and enhanced error messages to make validation issues easier to resolve for AI agents.

## Common Validation Patterns

### 1. Priority Field Issues

#### ❌ Problem: String Priority Values
```json
{
  "listId": "abc-123",
  "title": "My Task",
  "priority": "high"  // ❌ Invalid: not a number
}
```

#### ✅ Solution: Use Numbers 1-5
```json
{
  "listId": "abc-123",
  "title": "My Task", 
  "priority": 5  // ✅ Valid: 5 = highest, 1 = lowest
}
```

#### 🔄 Auto-Conversion: String Numbers Work Too
```json
{
  "listId": "abc-123",
  "title": "My Task",
  "priority": "5"  // ✅ Automatically converted to 5
}
```

**Priority Scale:**
- `5` - Highest priority (urgent, critical)
- `4` - High priority (important, time-sensitive)
- `3` - Medium priority (normal tasks)
- `2` - Low priority (nice to have)
- `1` - Lowest priority (someday/maybe)

### 2. Tags Field Issues

#### ❌ Problem: String Instead of Array
```json
{
  "listId": "abc-123",
  "title": "My Task",
  "tags": "urgent,important"  // ❌ Invalid: not an array
}
```

#### ✅ Solution: Use Array Format
```json
{
  "listId": "abc-123",
  "title": "My Task",
  "tags": ["urgent", "important"]  // ✅ Valid: proper array
}
```

#### 🔄 Auto-Conversion: JSON String Arrays Work Too
```json
{
  "listId": "abc-123",
  "title": "My Task",
  "tags": "[\"urgent\", \"important\"]"  // ✅ Automatically converted to array
}
```

### 3. Boolean Field Issues

#### ❌ Problem: String Boolean Values
```json
{
  "listId": "abc-123",
  "includeCompleted": "yes"  // ❌ Invalid in strict mode
}
```

#### ✅ Solution: Use Boolean Values
```json
{
  "listId": "abc-123",
  "includeCompleted": true  // ✅ Valid: proper boolean
}
```

#### 🔄 Auto-Conversion: String Booleans Work Too
```json
{
  "listId": "abc-123",
  "includeCompleted": "true"  // ✅ Automatically converted to true
}
```

**Supported Boolean Conversions:**
- `"true"`, `"TRUE"` → `true`
- `"false"`, `"FALSE"` → `false`
- `"yes"`, `"YES"` → `true`
- `"no"`, `"NO"` → `false`

### 4. Duration Field Issues

#### ❌ Problem: Duration with Units
```json
{
  "listId": "abc-123",
  "title": "My Task",
  "estimatedDuration": "2 hours"  // ❌ Invalid: not a number
}
```

#### ✅ Solution: Use Minutes as Numbers
```json
{
  "listId": "abc-123",
  "title": "My Task",
  "estimatedDuration": 120  // ✅ Valid: 120 minutes = 2 hours
}
```

#### 🔄 Auto-Conversion: String Numbers Work Too
```json
{
  "listId": "abc-123",
  "title": "My Task",
  "estimatedDuration": "120"  // ✅ Automatically converted to 120
}
```

### 5. Status Field Issues

#### ❌ Problem: Invalid Status Values
```json
{
  "listId": "abc-123",
  "status": "done"  // ❌ Invalid: not a valid enum value
}
```

#### ✅ Solution: Use Valid Status Values
```json
{
  "listId": "abc-123",
  "status": "completed"  // ✅ Valid: proper enum value
}
```

**Valid Status Values:**
- `"pending"` - Task not started
- `"in_progress"` - Task currently being worked on
- `"completed"` - Task finished
- `"blocked"` - Task waiting on dependencies
- `"cancelled"` - Task no longer needed

### 6. UUID Field Issues

#### ❌ Problem: Invalid UUID Format
```json
{
  "listId": "123"  // ❌ Invalid: not a proper UUID
}
```

#### ✅ Solution: Use Proper UUID Format
```json
{
  "listId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"  // ✅ Valid UUID
}
```

**UUID Format:** `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (36 characters with hyphens)

## Error Message Interpretation

### Understanding Enhanced Error Messages

When validation fails, you'll receive structured error messages:

```
❌ [Field]: [Error Description]
💡 [Helpful Suggestion]
📝 Example: [Working Example]

🔧 Common fixes:
1. [Specific Fix 1]
   Example: [Code Example]
2. [Specific Fix 2]
   Example: [Code Example]
```

### Error Message Components

- **❌ Error Description**: What went wrong
- **💡 Suggestion**: How to fix it
- **📝 Example**: Working example to copy
- **🔧 Common Fixes**: Step-by-step solutions

## Tool-Specific Validation

### List Management Tools

#### `create_list`
**Required Fields:**
- `title` (string, 1-200 characters)

**Optional Fields:**
- `description` (string, max 1000 characters)
- `projectTag` (string, max 50 characters)

#### `get_list` / `delete_list`
**Required Fields:**
- `listId` (UUID format)

### Task Management Tools

#### `add_task`
**Required Fields:**
- `listId` (UUID format)
- `title` (string, 1-200 characters)

**Optional Fields:**
- `description` (string, max 1000 characters)
- `priority` (number, 1-5) - Auto-converts from string numbers
- `tags` (array of strings) - Auto-converts from JSON strings
- `estimatedDuration` (number, minutes) - Auto-converts from string numbers

#### `filter_tasks`
**Required Fields:**
- `listId` (UUID format)

**Optional Fields:**
- `status` (enum: pending, in_progress, completed, blocked, cancelled)
- `priority` (number, 1-5)
- `includeCompleted` (boolean) - Auto-converts from string booleans

## Common Agent Mistakes and Solutions

### 1. Claude Desktop Common Patterns

#### Pattern: Using descriptive priority values
```json
// ❌ Claude might try:
{"priority": "high"}

// ✅ Use instead:
{"priority": 5}  // or "5" (auto-converted)
```

#### Pattern: Comma-separated tags
```json
// ❌ Claude might try:
{"tags": "urgent,important,bug-fix"}

// ✅ Use instead:
{"tags": ["urgent", "important", "bug-fix"]}  // or JSON string (auto-converted)
```

### 2. Kiro IDE Common Patterns

#### Pattern: Duration with time units
```json
// ❌ Kiro might try:
{"estimatedDuration": "2h 30m"}

// ✅ Use instead:
{"estimatedDuration": 150}  // 150 minutes, or "150" (auto-converted)
```

#### Pattern: Yes/No for booleans
```json
// ❌ Kiro might try:
{"includeCompleted": "no"}

// ✅ Use instead:
{"includeCompleted": false}  // or "false", "no" (auto-converted)
```

## Debugging Validation Issues

### 1. Check Parameter Types
Ensure parameters match expected types:
- Numbers for priority, estimatedDuration
- Strings for title, description, listId
- Arrays for tags, dependencies
- Booleans for includeCompleted, etc.

### 2. Validate UUIDs
List and task IDs must be valid UUIDs:
```javascript
// Valid UUID pattern:
/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
```

### 3. Check String Lengths
- `title`: 1-200 characters
- `description`: max 1000 characters
- `projectTag`: max 50 characters
- Individual `tags`: max 50 characters each

### 4. Verify Enum Values
Status values must be exactly:
- `"pending"`
- `"in_progress"`
- `"completed"`
- `"blocked"`
- `"cancelled"`

### 5. Test with Minimal Parameters
Start with minimal required parameters and add optional ones:

```json
// Minimal add_task example:
{
  "listId": "valid-uuid-here",
  "title": "Simple task"
}

// Then add optional parameters:
{
  "listId": "valid-uuid-here",
  "title": "Enhanced task",
  "priority": 4,
  "tags": ["important"],
  "estimatedDuration": 60
}
```

## Performance Considerations

### Parameter Preprocessing Impact
- **Overhead**: <50ms per request
- **Memory**: Minimal additional memory usage
- **Compatibility**: 100% backward compatible

### Best Practices
1. **Use native types when possible** (faster than conversion)
2. **Batch operations** for multiple tasks
3. **Cache list IDs** to avoid repeated lookups
4. **Use appropriate priority levels** (don't overuse priority 5)

## Getting Help

### 1. Enable Verbose Logging
```bash
# For development debugging
NODE_ENV=development MCP_LOG_LEVEL=debug npx task-list-mcp@latest
```

### 2. Test Parameters Manually
Use the debug integration tests to validate parameter patterns:
```bash
npm test -- tests/integration/debug-integration.test.ts
```

### 3. Check Error Message Details
Enhanced error messages include:
- Specific field that failed validation
- Expected vs received type/value
- Working examples
- Common fix suggestions

### 4. Validate JSON Syntax
Ensure your JSON is properly formatted:
```bash
echo '{"listId": "test", "title": "My Task"}' | jq .
```

## Migration from Previous Versions

### Version 2.0.x → 2.1.x (Agent-Friendly)
- **No breaking changes**: All existing code continues to work
- **New features**: Parameter preprocessing and enhanced errors
- **Recommended**: Update error handling to use new error message format

### Updating Error Handling
```javascript
// Before (still works):
if (response.error) {
  console.log(response.error);
}

// After (enhanced):
if (response.error) {
  // Error now includes emojis and structured guidance
  console.log(response.error);  // Much more helpful for users
}
```

The agent-friendly improvements are designed to be completely backward compatible while significantly improving the experience for AI agents and human users alike.