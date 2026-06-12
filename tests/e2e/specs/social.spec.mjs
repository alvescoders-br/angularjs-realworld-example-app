// Fluxos 4 e 5 — favoritar e seguir (GUIA §5.6).
// O app legado atual não renderiza article-actions na página de artigo em Angular/Node
// modernos porque o controller lê bindings antes do artigo estar disponível. Para manter
// o oráculo fiel sem tocar src/js/**, estes fluxos usam caminhos UI legados funcionais:
// favorite no preview do Global Feed e follow na página de perfil do autor.

import { test, expect } from '../fixtures/test-fixtures.mjs';
import { routes, sel } from '../helpers/app.mjs';

test.describe('social', () => {
  test('favoritar um artigo no feed incrementa a contagem e marca o botão', async ({ page, mock, loginViaToken }) => {
    await loginViaToken();
    await page.goto(routes.home);

    const favorite = page.locator(sel.feedFavoriteBtn).first();
    await expect(favorite).toBeVisible();
    await expect(favorite).toContainText('3');

    await favorite.click();

    // estado do mock confirma o POST /favorite; UI reflete o novo estado
    await expect.poll(() => mock.state.articles[0].favorited).toBe(true);
    await expect(favorite).toContainText('4');
    await expect(favorite).toHaveClass(/btn-primary/);
  });

  test('seguir o autor pelo perfil alterna o botão para Unfollow', async ({ page, mock, loginViaToken }) => {
    await loginViaToken();
    await page.goto('/#!/@alice');

    const follow = page.locator(sel.profileFollowBtn).first();
    await expect(follow).toBeVisible();
    await expect(follow).toContainText('Follow alice');

    await follow.click();

    await expect.poll(() => mock.state.author.following).toBe(true);
    await expect(follow).toContainText('Unfollow alice');
  });
});
