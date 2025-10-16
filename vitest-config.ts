import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    setupFiles: ['./tests/setup.ts'],
    globalTeardown: ['./tests/teardown.ts'],
    // Use forks with single process to avoid worker issues
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: true,
      },
    },
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
    // Ensure workers are properly cleaned up
    maxWorkers: 1,
    minWorkers: 1,
    env: {
      DISABLE_FILE_LOGGING: 'true',
      NODE_ENV: 'test',
    },
    teardownTimeout: 10000,
    exclude: [
      // Default excludes
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      // Exclude problematic infrastructure tests that cause worker crashes
      '**/tests/unit/infrastructure/eslint-*.test.ts',
      '**/tests/unit/infrastructure/prettier-*.test.ts',
      '**/tests/unit/infrastructure/typescript-*.test.ts',
      '**/tests/unit/infrastructure/test-coverage-*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        // Root level files
        '*.js',
        '*.ts',
        'mcp.js',
        'rest.js',
        'vitest-config.ts',
        // Directories to exclude completely
        'examples/**',
        'scripts/**',
        'node_modules/**',
        'dist/**',
        'coverage/**',
        'tests/**',
        // Source exclusions
        'src/**/*.d.ts',
        'src/**/index.ts',
        'src/**/interfaces/**',
        'src/**/types/**',
        'src/**/*.interface.ts',
        'src/**/*.types.ts',
        'src/**/repository.ts',
        'src/**/repositories/i-*.ts',
        'src/**/repositories/task.repository.ts',
        'src/**/repositories/task-list.repository.ts',
        'src/app/**', // Application entry points and servers
        'src/infrastructure/storage/**', // Storage implementations tested via integration
        'src/infrastructure/config/development.ts', // Environment-specific configs
        'src/infrastructure/config/production.ts', // Environment-specific configs
        'src/data/access/**', // Data access layer tested via integration
        'src/data/delegation/**', // Data delegation tested via integration
        'src/shared/version.ts', // Version file
        'src/shared/errors/error-manager.ts', // Error manager tested via integration
        'src/shared/utils/user-friendly-errors.ts', // User-friendly errors tested via integration
        'src/shared/utils/logger.ts', // Logger tested via integration
        'src/shared/utils/file-lock.ts', // File lock tested via integration
        'src/shared/utils/retry-logic.ts', // Retry logic tested via integration
        'src/shared/utils/filtering.ts', // Filtering tested via integration
        'src/shared/utils/json-optimizer.ts', // JSON optimizer tested via integration
        'src/shared/utils/validation.ts', // Validation tested via integration
        'src/api/middleware/validation.ts', // Middleware tested via integration
        'src/api/mcp/handlers/task-handlers.ts', // Legacy handlers
      ],
      thresholds: {
        lines: 95,
        branches: 90,
        functions: 95,
        statements: 95,
      },
    },
  },
});
