#!/usr/bin/env node

/**
 * Common Development Workflows
 *
 * This script provides pre-defined workflows that combine multiple script actions
 * for common development scenarios.
 */

import { spawn } from 'child_process';

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
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Workflow definitions
const WORKFLOWS = {
  'quick-check': {
    description: 'Quick development check (lint + unit tests)',
    steps: [
      { category: 'validate', action: 'lint' },
      { category: 'test', action: 'unit' },
    ],
  },

  'full-test': {
    description: 'Complete testing suite',
    steps: [
      { category: 'test', action: 'all' },
      { category: 'validate', action: 'project' },
    ],
  },

  'pre-commit': {
    description: 'Pre-commit validation (lint + tests + validation)',
    steps: [
      { category: 'validate', action: 'lint' },
      { category: 'test', action: 'all' },
      { category: 'validate', action: 'project' },
    ],
  },

  'pre-release': {
    description: 'Pre-release validation (full suite)',
    steps: [
      { category: 'clean', action: 'build' },
      { category: 'build', action: 'prod' },
      { category: 'test', action: 'all' },
      { category: 'validate', action: 'project' },
    ],
  },

  'fresh-start': {
    description: 'Fresh development setup (clean + build + test)',
    steps: [
      { category: 'clean', action: 'deep' },
      { category: 'build', action: 'dev' },
      { category: 'test', action: 'unit' },
    ],
  },

  maintenance: {
    description: 'Project maintenance (clean + validate)',
    steps: [
      { category: 'clean', action: 'basic' },
      { category: 'validate', action: 'project' },
      { category: 'validate', action: 'lint' },
    ],
  },
};

// Execute a single script step
async function executeStep(category, action) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'script', category, action], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`Step ${category}/${action} failed with exit code ${code}`)
        );
      }
    });

    child.on('error', error => {
      reject(error);
    });
  });
}

// Execute a workflow
async function runWorkflow(workflowName) {
  const workflow = WORKFLOWS[workflowName];
  if (!workflow) {
    log(`${colors.red}Unknown workflow: ${workflowName}${colors.reset}`);
    showHelp();
    process.exit(1);
  }

  log(
    `${colors.bold}${colors.cyan}🚀 Running workflow: ${workflowName}${colors.reset}`
  );
  log(`${colors.cyan}Description: ${workflow.description}${colors.reset}\n`);

  const startTime = Date.now();
  let completedSteps = 0;

  try {
    for (const [index, step] of workflow.steps.entries()) {
      const stepNumber = index + 1;
      const totalSteps = workflow.steps.length;

      log(
        `${colors.blue}[${stepNumber}/${totalSteps}] ${step.category}/${step.action}${colors.reset}`
      );

      await executeStep(step.category, step.action);
      completedSteps++;

      log(`${colors.green}✅ Step ${stepNumber} completed${colors.reset}\n`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(
      `${colors.bold}${colors.green}🎉 Workflow '${workflowName}' completed successfully!${colors.reset}`
    );
    log(
      `${colors.green}Completed ${completedSteps}/${workflow.steps.length} steps in ${duration}s${colors.reset}`
    );
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(
      `${colors.bold}${colors.red}❌ Workflow '${workflowName}' failed!${colors.reset}`
    );
    log(
      `${colors.red}Completed ${completedSteps}/${workflow.steps.length} steps in ${duration}s${colors.reset}`
    );
    log(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Show help
function showHelp() {
  log(
    `${colors.bold}${colors.cyan}MCP Task Manager - Development Workflows${colors.reset}\n`
  );
  log(`${colors.bold}Usage:${colors.reset} npm run workflow <workflow-name>\n`);

  log(`${colors.bold}Available Workflows:${colors.reset}\n`);

  Object.entries(WORKFLOWS).forEach(([name, config]) => {
    log(`  ${colors.green}${name}${colors.reset} - ${config.description}`);
    config.steps.forEach((step, index) => {
      const stepNumber = index + 1;
      log(
        `    ${colors.yellow}${stepNumber}.${colors.reset} ${step.category}/${step.action}`
      );
    });
    log('');
  });

  log(`${colors.bold}Examples:${colors.reset}`);
  log(`  npm run workflow quick-check   # Quick development check`);
  log(`  npm run workflow pre-commit    # Before committing changes`);
  log(`  npm run workflow pre-release   # Before releasing`);
  log(`  npm run workflow fresh-start   # Clean development setup`);
  log('');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (
    args.length === 0 ||
    args[0] === 'help' ||
    args[0] === '--help' ||
    args[0] === '-h'
  ) {
    showHelp();
    return;
  }

  const workflowName = args[0];
  await runWorkflow(workflowName);
}

// Handle uncaught errors
process.on('uncaughtException', error => {
  log(`${colors.red}Uncaught exception: ${error.message}${colors.reset}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, _promise) => {
  log(`${colors.red}Unhandled rejection: ${reason}${colors.reset}`);
  process.exit(1);
});

main().catch(error => {
  log(`${colors.red}Workflow runner failed: ${error.message}${colors.reset}`);
  process.exit(1);
});
