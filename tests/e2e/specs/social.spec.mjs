// Fluxos 4 e 5 — favoritar e seguir (GUIA §5.6).
// Na S4, o oráculo de paridade valida explicitamente os botões da página de artigo
// para cobrir o R2/SR-2 da migração Angular.

import { test, expect } from '../fixtures/test-fixtures.mjs';
import { routes, sel } from '../helpers/app.mjs';

test.describe('social', () => {
  test('favoritar um artigo na página de artigo incrementa a contagem e marca o botão', async ({
    page,
    mock,
    loginViaToken,
  }) => {
    await loginViaToken();
    await page.goto(routes.article('how-to-build-webapps-1'));
    await expect(page.locator(sel.navUser('e2e-tester'))).toBeVisible();

    const favorite = page.locator(sel.article.favoriteBtn).first();
    await expect(favorite).toBeVisible();
    await expect(favorite).toContainText('Favorite Article');
    await expect(favorite).toContainText('(3)');

    await favorite.click();

    await expect.poll(() => mock.state.articles[0].favorited).toBe(true);
    await expect(favorite).toContainText('Unfavorite Article');
    await expect(favorite).toContainText('(4)');
    await expect(favorite).toHaveClass(/btn-primary/);
  });

  test('seguir o autor pela página de artigo alterna o botão para Unfollow', async ({
    page,
    mock,
    loginViaToken,
  }) => {
    await loginViaToken();
    await page.goto(routes.article('how-to-build-webapps-1'));
    await expect(page.locator(sel.navUser('e2e-tester'))).toBeVisible();

    const follow = page.locator(sel.article.followBtn).first();
    await expect(follow).toBeVisible();
    await expect(follow).toContainText('Follow alice');

    await follow.click();

    await expect.poll(() => mock.state.author.following).toBe(true);
    await expect(follow).toContainText('Unfollow alice');
  });
});
