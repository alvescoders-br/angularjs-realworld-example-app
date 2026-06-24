// Fluxo 5 — dark mode toggle e persistencia (GUIA §4.2, Refs #6 S1).
// Cobre: visibilidade do toggle, aplicacao da classe `theme-dark` em <html>,
// persistencia entre sessoes e ausencia de regressao no tema claro padrao.

import { test, expect } from '../fixtures/test-fixtures.mjs';

test.describe('dark mode', () => {
  test('toggle visivel na nav de guest com label correto', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('button.theme-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to dark mode');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  test('tema claro por padrao — html nao tem a classe theme-dark', async ({ page }) => {
    await page.goto('/');
    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('theme-dark')
    );
    expect(hasDark).toBe(false);
  });

  test('clicar no toggle aplica theme-dark em <html>', async ({ page }) => {
    await page.goto('/');
    await page.click('button.theme-toggle');
    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('theme-dark')
    );
    expect(hasDark).toBe(true);
  });

  test('dark mode persiste apos recarregar a pagina', async ({ page }) => {
    // Ativar dark mode via localStorage antes da navegacao (simula sessao previa).
    await page.addInitScript(() => {
      window.localStorage.setItem('conduit.theme', 'dark');
    });
    await page.goto('/');
    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains('theme-dark')
    );
    expect(hasDark).toBe(true);
    // O label tambem deve refletir o estado persistido.
    const toggle = page.locator('button.theme-toggle');
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to light mode');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  test('toggle volta ao tema claro quando dark mode esta ativo', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('conduit.theme', 'dark');
    });
    await page.goto('/');

    const toggle = page.locator('button.theme-toggle');
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to light mode');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-label', 'Switch to dark mode');
    // Regressão intencional para o branch e2e/break: o app correto volta para aria-pressed=false.
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains('theme-dark')))
      .toBe(false);
    const stored = await page.evaluate(() =>
      window.localStorage.getItem('conduit.theme')
    );
    expect(stored).toBe('light');
  });
});
