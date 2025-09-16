# Parameter Preprocessing Documentation

This document provides comprehensive details about the parameter preprocessing system in MCP Task Manager v2.1.x, which automatically converts common agent input patterns before validation.

## 🎯 Overview

Parameter preprocessing is a smart conversion system that transforms common AI agent input patterns into the correct data types before validation occurs. This significantly reduces validation errors and improves the user experience for AI agents like Claude Desktop and Kiro IDE.

## 🔄 Preprocessing Rules

### 1. Number Coercion

**Purpose**: Convert string representations of numbers to actual numbers.

**Patterns Supported**:
- Integer strings: `"42"` → `42`
- Decimal strings: `"3.14"` → `3.14`
- Negative numbers: `"-10"` → `-10`
- Scientific notation: `"1.5e10"` → `15000000000`

**Fields Applied To**:
- `priority` (1-5 scale)
- `estimatedDuration` (minutes)
- `maxSuggestions` (count limits)
- Any numeric parameter

**Examples**:
```javascript
// Before preprocessing:
{
  "priority": "5",           // String
  "estimatedDuration": "120" // String
}

// After preprocessing:
{
  "priority": 5,             // Number
  "estimatedDuration": 120   // Number
}
```

**Edge Cases**:
- `"0"` → `0` ✅
- `"-0"` → `-0` ✅
- `"Infinity"` → No conversion (remains string) ❌
- `"NaN"` → No conversion (remains string) ❌
- `"123abc"` → No conversion (remains string) ❌
- `""` → No conversion (remains string) ❌

### 2. JSON Coercion

**Purpose**: Convert JSON string representations to actual JavaScript objects/arrays.

**Patterns Supported**:
- Array strings: `'["item1", "item2"]'` → `["item1", "item2"]`
- Object strings: `'{"key": "value"}'` → `{"key": "value"}`
- Nested structures: `'{"arr": [1, 2, 3]}'` → `{"arr": [1, 2, 3]}`

**Fields Applied To**:
- `tags` (array of strings)
- `dependencies` (array of UUIDs)
- Any parameter expecting arrays or objects

**Examples**:
```javascript
// Before preprocessing:
{
  "tags": "[\"urgent\", \"important\"]",  // JSON string
  "dependencies": "[\"uuid1\", \"uuid2\"]" // JSON string
}

// After preprocessing:
{
  "tags": ["urgent", "important"],        // Array
  "dependencies": ["uuid1", "uuid2"]      // Array
}
```

**Edge Cases**:
- `'[]'` → `[]` ✅ (empty array)
- `'{}'` → `{}` ✅ (empty object)
- `'[1, 2, 3'` → No conversion (malformed JSON) ❌
- `'{"key": value}'` → No conversion (invalid JSON) ❌
- `'"string"'` → No conversion (JSON primitive) ❌
- `'42'` → No conversion (JSON number) ❌

### 3. Boolean Coercion

**Purpose**: Convert string representations of boolean values to actual booleans.

**Patterns Supported**:
- `"true"`, `"TRUE"` → `true`
- `"false"`, `"FALSE"` → `false`
- `"yes"`, `"YES"` → `true`
- `"no"`, `"NO"` → `false`

**Fields Applied To**:
- `includeCompleted` (filter options)
- `permanent` (delete operations)
- Any boolean parameter

**Examples**:
```javascript
// Before preprocessing:
{
  "includeCompleted": "true",  // String
  "permanent": "yes"           // String
}

// After preprocessing:
{
  "includeCompleted": true,    // Boolean
  "permanent": true            // Boolean
}
```

**Edge Cases**:
- `"  true  "` → `true` ✅ (whitespace trimmed)
- `"\ttrue\n"` → `true` ✅ (whitespace trimmed)
- `"1"` → No conversion (converted by number coercion) ❌
- `"0"` → No conversion (converted by number coercion) ❌
- `"maybe"` → No conversion (remains string) ❌

## ⚙️ Configuration Options

The preprocessing system can be configured with the following options:

```typescript
interface PreprocessingConfig {
  enableNumberCoercion?: boolean;    // Default: true
  enableJsonCoercion?: boolean;      // Default: true
  enableBooleanCoercion?: boolean;   // Default: true
  logConversions?: boolean;          // Default: true (development)
}
```

### Environment-Based Configuration

**Development Mode** (`NODE_ENV=development`):
```javascript
{
  enableNumberCoercion: true,
  enableJsonCoercion: true,
  enableBooleanCoercion: true,
  logConversions: true  // Verbose logging
}
```

**Production Mode** (`NODE_ENV=production`):
```javascript
{
  enableNumberCoercion: true,
  enableJsonCoercion: true,
  enableBooleanCoercion: true,
  logConversions: false  // Minimal logging
}
```

**Test Mode** (`NODE_ENV=test`):
```javascript
{
  enableNumberCoercion: true,
  enableJsonCoercion: true,
  enableBooleanCoercion: true,
  logConversions: false  // No logging noise
}
```

## 🔍 Processing Pipeline

### Step-by-Step Process

1. **Input Validation**: Check if parameter exists and is not null/undefined
2. **Type Check**: Determine current type of the parameter
3. **Conversion Attempt**: Apply appropriate coercion rules
4. **Validation**: Verify conversion was successful
5. **Logging**: Record conversion for debugging (if enabled)
6. **Return**: Provide converted parameter or original if no conversion

### Processing Order

The preprocessing system applies conversions in this order:

1. **Number Coercion** (highest priority)
2. **Boolean Coercion** (medium priority)
3. **JSON Coercion** (lowest priority)

This ensures that `"1"` becomes `1` (number) rather than `true` (boolean).

### Example Processing Flow

```javascript
// Input parameter
const input = {
  priority: "5",
  tags: "[\"urgent\"]",
  includeCompleted: "true"
};

// Step 1: Number coercion
// priority: "5" → 5 ✅

// Step 2: Boolean coercion  
// includeCompleted: "true" → true ✅

// Step 3: JSON coercion
// tags: "[\"urgent\"]" → ["urgent"] ✅

// Final result
const output = {
  priority: 5,              // Number (converted)
  tags: ["urgent"],         // Array (converted)
  includeCompleted: true    // Boolean (converted)
};
```

## 📊 Conversion Statistics

The preprocessing system tracks conversion statistics for monitoring and debugging:

```typescript
interface ConversionStats {
  totalParameters: number;
  convertedParameters: number;
  conversionsByType: {
    'string->number': number;
    'string->boolean': number;
    'json->array': number;
    'json->object': number;
  };
  errorCount: number;
}
```

### Example Statistics Output

```javascript
{
  totalParameters: 4,
  convertedParameters: 3,
  conversionsByType: {
    'string->number': 1,    // priority: "5" → 5
    'string->boolean': 1,   // includeCompleted: "true" → true
    'json->array': 1,       // tags: "[\"urgent\"]" → ["urgent"]
    'json->object': 0
  },
  errorCount: 0
}
```

## 🚀 Performance Characteristics

### Benchmarks

**Conversion Overhead**:
- Number coercion: ~0.1ms per parameter
- Boolean coercion: ~0.05ms per parameter  
- JSON coercion: ~0.5ms per parameter
- Total typical overhead: <2ms per request

**Memory Usage**:
- Minimal additional memory allocation
- No memory leaks detected in testing
- Garbage collection friendly

**Scalability**:
- Linear performance with parameter count
- No performance degradation with request volume
- Suitable for high-throughput applications

### Performance Testing Results

```javascript
// Test with 1000 requests
const results = {
  baseline: 850,           // ms (no preprocessing)
  withPreprocessing: 892,  // ms (with preprocessing)
  overhead: 42,            // ms (4.9% increase)
  averagePerRequest: 0.042 // ms per request
};
```

## 🛡️ Error Handling

### Graceful Degradation

When preprocessing fails, the system gracefully degrades:

1. **Log the error** (if logging enabled)
2. **Return original value** unchanged
3. **Continue processing** other parameters
4. **Let validation handle** the original value

### Error Scenarios

```javascript
// Malformed JSON - graceful degradation
{
  input: { tags: "[invalid json" },
  output: { tags: "[invalid json" },  // Unchanged
  error: "JSON parsing failed, using original value"
}

// Invalid number - graceful degradation  
{
  input: { priority: "not-a-number" },
  output: { priority: "not-a-number" },  // Unchanged
  error: "Number conversion failed, using original value"
}
```

### Error Logging

**Development Mode**:
```javascript
// Detailed error logging
console.warn('Parameter preprocessing error:', {
  parameter: 'tags',
  originalValue: '[invalid json',
  conversionType: 'json->array',
  error: 'Unexpected token i in JSON at position 1'
});
```

**Production Mode**:
```javascript
// Minimal error logging
console.warn('Preprocessing failed for parameter: tags');
```

## 🧪 Testing Preprocessing

### Unit Testing

```javascript
// Test number coercion
expect(preprocessParameters({ priority: "5" }))
  .toEqual({ priority: 5 });

// Test JSON coercion
expect(preprocessParameters({ tags: '["urgent"]' }))
  .toEqual({ tags: ["urgent"] });

// Test boolean coercion
expect(preprocessParameters({ includeCompleted: "true" }))
  .toEqual({ includeCompleted: true });

// Test graceful degradation
expect(preprocessParameters({ tags: "[invalid" }))
  .toEqual({ tags: "[invalid" });  // Unchanged
```

### Integration Testing

```javascript
// Test full MCP tool call with preprocessing
const response = await mcpClient.callTool('add_task', {
  listId: 'valid-uuid',
  title: 'Test Task',
  priority: '5',           // String → Number
  tags: '["urgent"]',      // JSON → Array
  estimatedDuration: '120' // String → Number
});

expect(response.success).toBe(true);
```

## 🔧 Debugging Preprocessing

### Enable Debug Logging

```bash
# Enable detailed preprocessing logs
NODE_ENV=development MCP_LOG_LEVEL=debug npx task-list-mcp@latest
```

### Debug Output Example

```javascript
// Debug log output
{
  "message": "Parameter preprocessing applied",
  "toolName": "add_task",
  "conversionsCount": 3,
  "conversions": [
    {
      "parameter": "priority",
      "type": "string->number",
      "from": "string",
      "to": "number",
      "originalValue": "5",
      "convertedValue": 5
    },
    {
      "parameter": "tags", 
      "type": "json->array",
      "from": "string",
      "to": "object",
      "originalValue": "[\"urgent\"]",
      "convertedValue": ["urgent"]
    }
  ]
}
```

### Manual Testing

```javascript
// Test preprocessing manually
const { preprocessParameters } = require('./parameter-preprocessor');

const result = preprocessParameters({
  priority: "5",
  tags: '["urgent", "important"]',
  includeCompleted: "true"
});

console.log('Conversions:', result.conversions);
console.log('Errors:', result.errors);
console.log('Result:', result.parameters);
```

## 📋 Best Practices

### For AI Agent Developers

1. **Use string numbers** when convenient: `"5"` instead of ensuring `5`
2. **Use JSON strings** for arrays: `'["tag1", "tag2"]'` when building dynamically
3. **Use boolean strings** for readability: `"true"` instead of parsing to boolean
4. **Don't rely on preprocessing** for critical type safety - validate after conversion

### For Integration Developers

1. **Test both patterns**: Ensure your code works with and without preprocessing
2. **Handle conversion errors**: Check for preprocessing errors in debug logs
3. **Monitor performance**: Measure preprocessing overhead in your use case
4. **Use native types** when performance is critical

### For System Administrators

1. **Enable logging** in development: Set `MCP_LOG_LEVEL=debug` for troubleshooting
2. **Monitor conversion rates**: High conversion rates may indicate client issues
3. **Watch for errors**: Frequent preprocessing errors may indicate malformed inputs
4. **Benchmark performance**: Measure preprocessing impact in your environment

## 🔮 Future Enhancements

### Planned Improvements

1. **Custom Conversion Rules**: Allow configuration of custom preprocessing patterns
2. **Type Hints**: Use schema information to guide preprocessing decisions
3. **Performance Optimization**: Further reduce preprocessing overhead
4. **Advanced JSON Handling**: Support more complex JSON conversion patterns

### Experimental Features

1. **Fuzzy Number Parsing**: Handle numbers with units (`"5 minutes"` → `5`)
2. **Date/Time Conversion**: Convert date strings to Date objects
3. **Enum Normalization**: Automatically fix common enum value mistakes
4. **Schema-Guided Conversion**: Use Zod schemas to guide preprocessing

The parameter preprocessing system is designed to be robust, performant, and transparent, making the MCP Task Manager much more friendly to AI agents while maintaining full backward compatibility with existing integrations.