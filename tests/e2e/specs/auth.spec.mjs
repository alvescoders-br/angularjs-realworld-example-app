// Fluxo 1 — login/register (GUIA §5.6). Exercita o esquema Token de ponta a ponta:
// o mock só responde /user quando o header é `Authorization: Token <jwt>`.

import { test, expect } from '../fixtures/test-fixtures.mjs';
import { routes, sel, loginViaUi } from '../helpers/app.mjs';

const CREDS = { email: 'e2e-tester@example.com', password: 'not-a-real-password' };

test.describe('auth', () => {
  test('register cria conta e autentica (header mostra o usuário)', async ({ page, mock }) => {
    await page.goto(routes.register);
    await page.fill(sel.auth.username, 'e2e-tester');
    await page.fill(sel.auth.email, CREDS.email);
    await page.fill(sel.auth.password, CREDS.password);
    await page.click(sel.auth.submit);

    // redireciona para home e o bloco show-authed="true" passa a exibir o usuário
    await expect(page).toHaveURL(/#!\/$/);
    await expect(page.locator(sel.navUser('e2e-tester'))).toBeVisible();
    expect(mock.state.currentUser.username).toBe('e2e-tester');
  });

  test('login autentica e expõe a navegação autenticada', async ({ page }) => {
    await loginViaUi(page, CREDS);

    await expect(page).toHaveURL(/#!\/$/);
    await expect(page.locator('.nav-link:has-text("New Article")')).toBeVisible();
    await expect(page.locator('.nav-link:has-text("Settings")')).toBeVisible();
  });
});
