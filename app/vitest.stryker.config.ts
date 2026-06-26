// Vitest configuration used exclusively by Stryker — Refs #7
// Keeps Angular CLI's vitest.config.ts untouched.
// Uses @analogjs/vite-plugin-angular so that Angular templates and
// decorators are compiled by the Angular Vite plugin rather than relying
// on JIT or the private @angular/build:unit-test pipeline.

/// <reference types="vitest" />
import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    exclude: ['**/.stryker-tmp/**', '**/node_modules/**'],
    coverage: {
      exclude: ['src/**/*.html'],
      reporter: ['lcov', 'text-summary'],
      reportsDirectory: './coverage',
    },
  },
});
