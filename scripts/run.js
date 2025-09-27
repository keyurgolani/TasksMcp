#!/usr/bin/env node

/**
 * Unified Script Runner for MCP Task Manager
 * 
 * This script provides a consistent interface for all project scripts,
 * organizing them into logical categories and providing help documentation.
 * 
 * Usage: npm run script <category> <action> [options]
 * Example: npm run script build prod
 *          npm run script test all
 *          npm run script clean deep
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Color utilities
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Script categories and their actions
const SCRIPT_CATEGORIES = {
  build: {
    description: 'Build and compilation scripts',
    actions: {
      dev: {
        description: 'Build for development',
        command: 'npm run build:dev'
      },
      prod: {
        description: 'Build for production',
        command: 'npm run build:prod'
      },
      clean: {
        description: 'Clean build artifacts',
        command: 'npm run clean:build'
      }
    }
  },
  
  test: {
    description: 'Testing and validation scripts',
    actions: {
      all: {
        description: 'Run all tests',
        command: 'npm run test:run'
      },
      unit: {
        description: 'Run unit tests only',
        command: 'npm run test:run -- tests/unit'
      },
      integration: {
        description: 'Run integration tests only',
        command: 'npm run test:run -- tests/integration'
      },
      performance: {
        description: 'Run performance tests only',
        command: 'npm run test:run -- tests/performance'
      },
      watch: {
        description: 'Run tests in watch mode',
        command: 'npm run test'
      }
    }
  },
  
  validate: {
    description: 'Validation and quality assurance scripts',
    actions: {
      project: {
        description: 'Validate project structure and configuration',
        script: 'validate.sh'
      },
      lint: {
        description: 'Run TypeScript linting',
        command: 'npm run lint'
      }
    }
  },
  
  clean: {
    description: 'Cleanup and maintenance scripts',
    actions: {
      basic: {
        description: 'Basic cleanup (logs, temp files)',
        script: 'clean.sh'
      },
      deep: {
        description: 'Deep cleanup (includes node_modules)',
        script: 'clean.sh',
        args: ['--deep']
      },
      build: {
        description: 'Clean build artifacts only',
        script: 'clean.sh',
        args: ['--build']
      }
    }
  },
  
  version: {
    description: 'Version management scripts',
    actions: {
      sync: {
        description: 'Sync version across all files',
        script: 'sync-version.js'
      },
      update: {
        description: 'Update version and sync files',
        script: 'update-version.sh'
      }
    }
  },
  
  deploy: {
    description: 'Deployment and release scripts',
    actions: {
      prepare: {
        description: 'Prepare for deployment',
        script: 'deploy.sh',
        args: ['prepare']
      },
      staging: {
        description: 'Deploy to staging environment',
        script: 'deploy.sh',
        args: ['staging']
      },
      production: {
        description: 'Deploy to production environment',
        script: 'deploy.sh',
        args: ['production']
      }
    }
  },
  
  dev: {
    description: 'Development utility scripts',
    actions: {
      start: {
        description: 'Start development server',
        command: 'npm run dev'
      },
      health: {
        description: 'Check application health',
        command: 'npm run health'
      }
    }
  }
};

// Help functions
function showHelp() {
  log(`${colors.bold}${colors.cyan}MCP Task Manager - Unified Script Runner${colors.reset}\n`);
  log(`${colors.bold}Usage:${colors.reset} npm run script <category> <action> [options]\n`);
  
  log(`${colors.bold}Available Categories:${colors.reset}\n`);
  
  Object.entries(SCRIPT_CATEGORIES).forEach(([category, config]) => {
    log(`  ${colors.green}${category}${colors.reset} - ${config.description}`);
    Object.entries(config.actions).forEach(([action, actionConfig]) => {
      log(`    ${colors.yellow}${action}${colors.reset} - ${actionConfig.description}`);
    });
    log('');
  });
  
  log(`${colors.bold}Examples:${colors.reset}`);
  log(`  npm run script build prod     # Build for production`);
  log(`  npm run script test all       # Run all tests`);
  log(`  npm run script clean deep     # Deep cleanup`);
  log(`  npm run script validate final # Final validation`);
  log(`  npm run script deploy staging # Deploy to staging`);
  log('');
}

function showCategoryHelp(category) {
  const config = SCRIPT_CATEGORIES[category];
  if (!config) {
    log(`${colors.red}Unknown category: ${category}${colors.reset}`, colors.red);
    return;
  }
  
  log(`${colors.bold}${colors.cyan}${category}${colors.reset} - ${config.description}\n`);
  log(`${colors.bold}Available actions:${colors.reset}\n`);
  
  Object.entries(config.actions).forEach(([action, actionConfig]) => {
    log(`  ${colors.yellow}${action}${colors.reset} - ${actionConfig.description}`);
  });
  log('');
}

// Script execution
async function runScript(category, action, args = []) {
  const categoryConfig = SCRIPT_CATEGORIES[category];
  if (!categoryConfig) {
    log(`${colors.red}Unknown category: ${category}${colors.reset}`);
    log(`Run 'npm run script help' to see available categories.`);
    process.exit(1);
  }
  
  const actionConfig = categoryConfig.actions[action];
  if (!actionConfig) {
    log(`${colors.red}Unknown action: ${action} for category: ${category}${colors.reset}`);
    showCategoryHelp(category);
    process.exit(1);
  }
  
  log(`${colors.blue}Running: ${category}/${action}${colors.reset}`);
  log(`${colors.cyan}Description: ${actionConfig.description}${colors.reset}\n`);
  
  let command, commandArgs;
  
  if (actionConfig.command) {
    // NPM command
    const parts = actionConfig.command.split(' ');
    command = parts[0];
    commandArgs = parts.slice(1).concat(args);
  } else if (actionConfig.script) {
    // Shell script
    const scriptPath = join(__dirname, actionConfig.script);
    if (!existsSync(scriptPath)) {
      log(`${colors.red}Script not found: ${scriptPath}${colors.reset}`);
      process.exit(1);
    }
    command = scriptPath;
    commandArgs = (actionConfig.args || []).concat(args);
  } else {
    log(`${colors.red}Invalid action configuration${colors.reset}`);
    process.exit(1);
  }
  
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        log(`\n${colors.green}✅ ${category}/${action} completed successfully${colors.reset}`);
        resolve();
      } else {
        log(`\n${colors.red}❌ ${category}/${action} failed with exit code ${code}${colors.reset}`);
        reject(new Error(`Script failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      log(`${colors.red}❌ Failed to execute ${category}/${action}: ${error.message}${colors.reset}`);
      reject(error);
    });
  });
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }
  
  const [category, action, ...scriptArgs] = args;
  
  if (!action) {
    showCategoryHelp(category);
    return;
  }
  
  try {
    await runScript(category, action, scriptArgs);
  } catch (error) {
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(`${colors.red}Uncaught exception: ${error.message}${colors.reset}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`${colors.red}Unhandled rejection at: ${promise}, reason: ${reason}${colors.reset}`);
  process.exit(1);
});

main().catch((error) => {
  log(`${colors.red}Script runner failed: ${error.message}${colors.reset}`);
  process.exit(1);
});