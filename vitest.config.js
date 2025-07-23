import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test files
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    
    // Environment
    environment: 'node',
    
    // Global test utilities
    globals: true,
    
    // Coverage
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json'],
      include: ['src/**/*.ts'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.config.js',
        '**/*.test.js',
        '**/*.d.ts'
      ],
      thresholds: {
        global: {
          branches: 50,
          functions: 50,
          lines: 50,
          statements: 50
        }
      }
    },
    
    // Timeout
    testTimeout: 10000,
    
    // Watch
    watch: false
  }
});
