// Stryker configuration — Fase 5 (Qualidade) · Refs #7
// Meta: mutation score ≥ 95% em app/src/**
// breakAt: 94  =>  score < 95% faz o run falhar com exit 1

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.stryker.config.ts',
  },
  mutate: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.html',
    '!src/main.ts',
    '!src/test-setup.ts',
    '!src/app/app.config.ts',
    '!src/app/app.routes.ts',
  ],
  thresholds: {
    high: 95,
    low: 90,
    break: 94,
  },
  reporters: ['html', 'json', 'clear-text', 'progress'],
  htmlReporter: {
    fileName: 'reports/mutation/html/index.html',
  },
  jsonReporter: {
    fileName: 'reports/mutation/report.json',
  },
  timeoutMS: 10000,
  concurrency: 4,
  // Angular TestBed não é compatível com instrumentação perTest do Stryker.
  // coverageAnalysis: 'off' executa todos os testes contra cada mutante —
  // mais lento mas correto com NgModules/standalone components.
  coverageAnalysis: 'off',
  disableTypeChecks: true,
};
