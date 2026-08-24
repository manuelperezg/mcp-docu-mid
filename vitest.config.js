import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    forks: { singleFork: true },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/server/dashboardHtml.js'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 70,
        statements: 85
      }
    }
  }
});
