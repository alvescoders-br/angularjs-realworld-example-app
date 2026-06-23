// Fluxo 3 — criar/editar/publicar artigo (GUIA §5.6). Requer autenticacao.
// Inclui testes de draft: restauracao ao abrir e limpeza apos publish (Refs #6 S2).

import { test, expect } from '../fixtures/test-fixtures.mjs';
import { routes, sel } from '../helpers/app.mjs';

const DRAFT_KEY_NEW = 'conduit.draft.new';

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

    await expect(page).toHaveURL(/\/article\/my-e2e-article$/);
    await expect(page.locator('.article-page .banner h1')).toHaveText('My E2E Article');
    expect(mock.state.articles.some((a) => a.slug === 'my-e2e-article')).toBe(true);
  });

  test('edita um artigo existente e persiste a alteracao', async ({ page, mock, loginViaToken }) => {
    mock.state.currentUser = {
      ...mock.state.currentUser,
      username: 'alice',
      email: 'alice@example.com',
    };
    await loginViaToken();
    await page.goto(routes.editArticle('how-to-build-webapps-1'));

    const title = page.locator(sel.editor.title);
    await expect(title).toHaveValue('How to build webapps');
    await title.fill('How to build webapps v2');
    await page.click(sel.editor.publish);

    await expect(page).toHaveURL(/\/article\/how-to-build-webapps-v2$/);
    await expect(page.locator('.article-page .banner h1')).toHaveText('How to build webapps v2');
  });

  test('draft e restaurado ao abrir o editor de novo artigo', async ({ page, loginViaToken }) => {
    const savedDraft = JSON.stringify({
      title: 'Draft Title E2E',
      description: 'Draft desc',
      body: 'Draft body content',
      tagList: ['draft-tag'],
    });
    // Semear draft e token antes da navegacao.
    await page.addInitScript(([key, value]) => {
      window.localStorage.setItem(key, value);
    }, [DRAFT_KEY_NEW, savedDraft]);
    await loginViaToken();
    await page.goto(routes.editor);

    await expect(page.locator(sel.editor.title)).toHaveValue('Draft Title E2E');
    await expect(page.locator(sel.editor.description)).toHaveValue('Draft desc');
    await expect(page.locator(sel.editor.body)).toHaveValue('Draft body content');
    await expect(page.locator('.tag-list .tag-pill:has-text("draft-tag")')).toBeVisible();
  });

  test('draft e removido do localStorage apos publish com sucesso', async ({
    page,
    mock,
    loginViaToken,
  }) => {
    const savedDraft = JSON.stringify({
      title: 'Draft To Publish',
      description: 'draft desc',
      body: 'draft body',
      tagList: [],
    });
    await page.addInitScript(([key, value]) => {
      window.localStorage.setItem(key, value);
    }, [DRAFT_KEY_NEW, savedDraft]);
    await loginViaToken();
    await page.goto(routes.editor);

    // Verificar que o draft foi restaurado.
    await expect(page.locator(sel.editor.title)).toHaveValue('Draft To Publish');

    // Publicar o artigo.
    await page.click(sel.editor.publish);
    await expect(page).toHaveURL(/\/article\/draft-to-publish$/);
    expect(mock.state.articles.some((a) => a.slug === 'draft-to-publish')).toBe(true);

    // Draft deve ter sido removido do localStorage apos o publish.
    const draftValue = await page.evaluate((key) => window.localStorage.getItem(key), DRAFT_KEY_NEW);
    expect(draftValue).toBeNull();
  });
});
