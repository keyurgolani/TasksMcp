/**
 * Example: Using MultiSourceAggregator
 *
 * This example demonstrates how to use the MultiSourceAggregator to
 * aggregate data from multiple storage sources with conflict resolution,
 * filtering, sorting, and pagination.
 */

import { DataSourceRouter } from "../src/infrastructure/storage/data-source-router.js";
import { MultiSourceAggregator } from "../src/infrastructure/storage/multi-source-aggregator.js";

import type { SearchQuery } from "../src/domain/repositories/todo-list.repository.js";
import type { DataSourceConfig } from "../src/infrastructure/storage/data-source-router.js";

// Example 1: Basic aggregation from multiple sources
console.log("=== Example 1: Basic Multi-Source Aggregation ===\n");

// Configure multiple data sources
const dataSourceConfigs: DataSourceConfig[] = [
  {
    id: "local-storage",
    name: "Local File Storage",
    type: "filesystem",
    priority: 1,
    readonly: false,
    enabled: true,
    config: {
      type: "file",
      dataDirectory: "./data",
    },
  },
  {
    id: "shared-db",
    name: "Shared Database",
    type: "memory", // In production, this would be 'postgresql'
    priority: 2, // Higher priority
    readonly: false,
    enabled: true,
    config: {
      type: "memory",
    },
  },
];

// Initialize router and aggregator
const router = new DataSourceRouter(dataSourceConfigs);
await router.initialize();

const aggregator = new MultiSourceAggregator({
  conflictResolution: "priority", // Use highest priority source for conflicts
  parallelQueries: true, // Query sources in parallel
  queryTimeout: 30000, // 30 second timeout per source
});

// Get all sources from router
const sources = router.getAllSources().map((backend, index) => ({
  backend,
  id: dataSourceConfigs[index].id,
  name: dataSourceConfigs[index].name,
  priority: dataSourceConfigs[index].priority,
}));

// Aggregate lists from all sources
const query: SearchQuery = {};
const result = await aggregator.aggregateLists(sources, query);

console.log(
  `Found ${result.totalCount} lists across ${sources.length} sources`
);
console.log(`Returned ${result.items.length} lists`);
console.log(`Has more: ${result.hasMore}\n`);

// Example 2: Aggregation with filtering
console.log("=== Example 2: Filtered Aggregation ===\n");

const filteredQuery: SearchQuery = {
  text: "project", // Search for lists containing "project"
  status: "active", // Only active lists
  projectTag: "web-app", // Specific project
};

const filteredResult = await aggregator.aggregateLists(sources, filteredQuery);

console.log(`Filtered results: ${filteredResult.items.length} lists`);
console.log(`Total matching: ${filteredResult.totalCount}\n`);

// Example 3: Aggregation with sorting
console.log("=== Example 3: Sorted Aggregation ===\n");

const sortedQuery: SearchQuery = {
  sorting: {
    field: "updatedAt",
    direction: "desc", // Most recently updated first
  },
};

const sortedResult = await aggregator.aggregateLists(sources, sortedQuery);

console.log("Lists sorted by most recent update:");
sortedResult.items.slice(0, 5).forEach((list, index) => {
  console.log(
    `  ${index + 1}. ${list.title} (updated: ${list.updatedAt.toISOString()})`
  );
});
console.log();

// Example 4: Aggregation with pagination
console.log("=== Example 4: Paginated Aggregation ===\n");

const paginatedQuery: SearchQuery = {
  pagination: {
    offset: 0,
    limit: 10,
  },
};

const paginatedResult = await aggregator.aggregateLists(
  sources,
  paginatedQuery
);

console.log(`Page 1: ${paginatedResult.items.length} lists`);
console.log(`Total: ${paginatedResult.totalCount} lists`);
console.log(`Has more: ${paginatedResult.hasMore}`);
console.log(
  `Pagination: offset=${paginatedResult.pagination?.offset}, limit=${paginatedResult.pagination?.limit}\n`
);

// Example 5: Conflict resolution strategies
console.log("=== Example 5: Conflict Resolution ===\n");

// Latest strategy - uses most recently updated version
const latestAggregator = new MultiSourceAggregator({
  conflictResolution: "latest",
});

// Use the aggregator to demonstrate latest conflict resolution
console.log("Latest aggregator created:", latestAggregator.getConfig());

console.log('Using "latest" strategy:');
console.log("  - When same list exists in multiple sources");
console.log("  - Uses the version with most recent updatedAt timestamp\n");

// Priority strategy - uses version from highest priority source
const priorityAggregator = new MultiSourceAggregator({
  conflictResolution: "priority",
});

// Use the aggregator to demonstrate priority conflict resolution
console.log("Priority aggregator created:", priorityAggregator.getConfig());

console.log('Using "priority" strategy:');
console.log("  - When same list exists in multiple sources");
console.log("  - Uses the version from highest priority source");
console.log(
  '  - In this example, "shared-db" (priority 2) wins over "local-storage" (priority 1)\n'
);

// Example 6: Aggregating summaries (lightweight)
console.log("=== Example 6: Summary Aggregation ===\n");

const summaryQuery: SearchQuery = {
  status: "active",
};

const summaryResult = await aggregator.aggregateSummaries(
  sources,
  summaryQuery
);

console.log(`Found ${summaryResult.totalCount} active lists (summaries only)`);
console.log("Summaries are lightweight and faster to retrieve\n");

// Example 7: Handling source failures
console.log("=== Example 7: Graceful Failure Handling ===\n");

console.log("The aggregator handles source failures gracefully:");
console.log("  - If one source fails, continues with other sources");
console.log("  - Logs warnings for failed sources");
console.log("  - Returns partial results from available sources");
console.log("  - No data loss if at least one source succeeds\n");

// Example 8: Complex query combining multiple features
console.log("=== Example 8: Complex Query ===\n");

const complexQuery: SearchQuery = {
  text: "api",
  status: "active",
  taskPriority: [4, 5], // High and critical priority tasks
  sorting: {
    field: "priority",
    direction: "desc",
  },
  pagination: {
    offset: 0,
    limit: 5,
  },
};

const complexResult = await aggregator.aggregateLists(sources, complexQuery);

console.log("Complex query results:");
console.log(`  - Text search: "api"`);
console.log(`  - Status: active`);
console.log(`  - Task priority: high or critical`);
console.log(`  - Sorted by: priority (descending)`);
console.log(`  - Pagination: first 5 results`);
console.log(`  - Found: ${complexResult.totalCount} matching lists`);
console.log(`  - Returned: ${complexResult.items.length} lists\n`);

// Cleanup
await router.shutdown();

console.log("=== Examples Complete ===\n");
console.log("Key Takeaways:");
console.log("  1. MultiSourceAggregator combines data from multiple sources");
console.log("  2. Automatic deduplication and conflict resolution");
console.log("  3. Comprehensive filtering, sorting, and pagination");
console.log("  4. Graceful handling of source failures");
console.log("  5. Configurable conflict resolution strategies");
console.log("  6. Parallel or sequential query execution");
console.log("  7. Source metadata tracking for transparency");
