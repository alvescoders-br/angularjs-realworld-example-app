// Fixtures do Playwright para o E2E da rede de segurança (Fase 2 · Refs #2).
//
// PP-1 (A): a API RealWorld é servida por um mock EFÊMERO em processo — aqui,
// via page.route, que intercepta as XHRs do app legado e responde a partir de
// tests/e2e/mock/api.mjs. Isso evita tocar src/js/** (a URL da API é hardcoded
// em app.constants.js: https://conduit.productionready.io/api) e mantém o E2E
// 100% offline e determinístico.

import { test as base, expect } from '@playwright/test';
import { createMockApi } from '../mock/api.mjs';
import { FAKE_TOKEN } from '../mock/data.mjs';

const API_GLOB = '**/conduit.productionready.io/api/**';
// hosts de assets externos (ícones, fontes, css do tema) — neutralizados p/ offline.
const ASSET_GLOBS = [
  '**/code.ionicframework.com/**',
  '**/fonts.googleapis.com/**',
  '**/demo.productionready.io/**',
  '**/static.productionready.io/**',
];

export const test = base.extend({
  // mock isolado por teste (estado fresco a cada caso). Auto porque até testes
  // anônimos disparam XHRs na inicialização da home (articles/tags).
  mock: [async ({ page }, use) => {
    const api = createMockApi();

    await page.route(API_GLOB, async (route) => {
      const req = route.request();
      const result = api.handle(req.method(), req.url(), req.headers(), req.postData() || '');
      await route.fulfill(result);
    });

    for (const glob of ASSET_GLOBS) {
      await page.route(glob, (route) => route.fulfill({ status: 200, body: '' }));
    }

    await use(api);
  }, { auto: true }],

  // semeia autenticação ANTES da navegação (token Token-scheme no localStorage,
  // chave AppConstants.jwtKey = 'jwtToken'); o app revalida via GET /user.
  loginViaToken: async ({ page }, use) => {
    await use(async () => {
      await page.addInitScript((token) => {
        window.localStorage.setItem('jwtToken', token);
      }, FAKE_TOKEN);
    });
  },
});

export { expect, FAKE_TOKEN };
