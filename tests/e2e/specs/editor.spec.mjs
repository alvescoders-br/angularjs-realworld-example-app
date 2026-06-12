// Fluxo 3 — criar/editar/publicar artigo (GUIA §5.6). Requer autenticação.

import { test, expect } from '../fixtures/test-fixtures.mjs';
import { routes, sel } from '../helpers/app.mjs';

test.describe('editor', () => {
  test('cria e publica um artigo novo', async ({ page, mock, loginViaToken }) => {
    await loginViaToken();
    await page.goto(routes.editor);

    await page.fill(sel.editor.title, 'My E2E Article');
    await page.fill(sel.editor.description, 'written by the safety net');
    await page.fill(sel.editor.body, '# Heading\n\nbody in markdown');
    await page.fill(sel.editor.tags, 'e2e');
    await page.press(sel.editor.tags, 'Enter');
    await expect(page.locator('.tag-list .tag-pill:has-text("e2e")')).toBeVisible();

    await page.click(sel.editor.publish);

    // publicar redireciona para o artigo recém-criado (slug derivado do título)
    await expect(page).toHaveURL(/#!\/article\/my-e2e-article$/);
    await expect(page.locator('.article-page .banner h1')).toHaveText('My E2E Article');
    expect(mock.state.articles.some((a) => a.slug === 'my-e2e-article')).toBe(true);
  });

  test('edita um artigo existente e persiste a alteração', async ({ page, mock, loginViaToken }) => {
    mock.state.currentUser = {
      ...mock.state.currentUser,
      username: 'alice',
      email: 'alice@example.com',
    };
    await loginViaToken();
    await page.goto(routes.editor + 'how-to-build-webapps-1');

    const title = page.locator(sel.editor.title);
    await expect(title).toHaveValue('How to build webapps');
    await title.fill('How to build webapps v2');
    await page.click(sel.editor.publish);

    await expect(page).toHaveURL(/#!\/article\/how-to-build-webapps-v2$/);
    await expect(page.locator('.article-page .banner h1')).toHaveText('How to build webapps v2');
  });
});
