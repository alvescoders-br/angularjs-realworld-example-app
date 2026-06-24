import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['**/.stryker-tmp/**', '**/node_modules/**'],
    coverage: {
      exclude: ['src/**/*.html'],
      reporter: ['lcov', 'text-summary'],
      reportsDirectory: './coverage'
    }
  }
});
