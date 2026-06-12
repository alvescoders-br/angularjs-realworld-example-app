// Playwright config — E2E mínimo da rede de segurança (Fase 2 · GUIA §5.6, Refs #2).
// Alvo: o app AngularJS LEGADO atual (oráculo de paridade para a Fase 3).
// PP-1 (A): API mockada em processo (page.route); app servido do build estático.

import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT || 4173);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './specs',
  testMatch: '**/*.spec.mjs',
  // E2E determinístico: sem flakiness tolerado localmente; 1 retry em CI p/ trace.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'results/e2e-results.json' }]]
    : [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // sobe o servidor estático que entrega o build do app legado.
  webServer: {
    command: 'node mock/static-server.mjs',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { E2E_PORT: String(PORT) },
  },
});
