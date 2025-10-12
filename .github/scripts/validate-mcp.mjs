#!/usr/bin/env node

import fs from "fs";
// import path from 'path'; // Not used in this script

console.log("Validating MCP protocol structure...");

// Check handlers directory (new location)
const handlersDir = "./dist/api/handlers";
if (!fs.existsSync(handlersDir)) {
  console.error("Handlers directory not found at:", handlersDir);
  console.log("Checking dist directory structure...");
  if (fs.existsSync("./dist")) {
    console.log("Dist contents:", fs.readdirSync("./dist"));
    if (fs.existsSync("./dist/api")) {
      console.log("API contents:", fs.readdirSync("./dist/api"));
    }
  }
  throw new Error(
    "Handlers directory not found at expected location: " + handlersDir
  );
}

const handlers = fs.readdirSync(handlersDir).filter((f) => f.endsWith(".js"));
console.log("Found handlers:", handlers);

// Expect at least 15 handlers (we have 16 including index.ts)
if (handlers.length < 15) {
  throw new Error(
    `Expected at least 15 MCP handlers, found: ${handlers.length}`
  );
}

// Check for key required handlers
const requiredHandlers = [
  "create-list.js",
  "get-list.js",
  "add-task.js",
  "complete-task.js",
  "search-tool.js",
  "show-tasks.js",
];

const missingHandlers = requiredHandlers.filter(
  (handler) => !handlers.includes(handler)
);

if (missingHandlers.length > 0) {
  throw new Error(`Missing required handlers: ${missingHandlers.join(", ")}`);
}

console.log("✅ MCP structure validation passed");
