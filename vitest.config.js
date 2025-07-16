import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test files
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    
    // Environment
    environment: 'node',
    
    // Global test utilities
    globals: true,
    
    // Reporter
    reporter: ['verbose', 'json'],
    
    // Coverage
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.config.js',
        '**/*.test.js'
      ]
    },
    
    // Timeout
    testTimeout: 10000,
    
    // Watch
    watch: false
  }
});
