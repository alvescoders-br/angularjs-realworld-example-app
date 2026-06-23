// Fluxo 2 — listar e abrir artigo (GUIA §5.6). Anônimo: Global Feed + preview-link.

import { test, expect } from '../fixtures/test-fixtures.mjs';
import { routes } from '../helpers/app.mjs';

test.describe('articles', () => {
  test('lista o Global Feed e abre um artigo', async ({ page }) => {
    await page.goto(routes.home);

    const preview = page.locator('.article-preview').first();
    await expect(preview).toBeVisible();
    await expect(preview.locator('h1')).toHaveText('How to build webapps');

    await preview.locator('a.preview-link').click();
    await expect(page).toHaveURL(/\/article\/how-to-build-webapps-1$/);
    await expect(page.locator('.article-page .banner h1')).toHaveText('How to build webapps');
  });
});
