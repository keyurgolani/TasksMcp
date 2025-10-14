import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    setupFiles: ['./tests/setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    env: {
      DISABLE_FILE_LOGGING: 'true',
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
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
        'examples/**',
        'scripts/**',
        'node_modules/**',
        'dist/**',
        'coverage/**',
        'tests/**',
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
