// Helpers de navegação/seleção fiéis aos templates do app legado.
// Rotas hashbang reais do app legado: os templates renderizam links em /#!/...
// Seletores derivados 1:1 dos templates em src/js/**/*.html (não inventados).

export const routes = {
  home: '/#!/',
  login: '/#!/login',
  register: '/#!/register',
  editor: '/#!/editor/',
  article: (slug) => `/#!/article/${slug}`,
};

// Campos do formulário auth/editor são identificados pelo placeholder (templates).
export const sel = {
  auth: {
    username: 'input[placeholder="Username"]',
    email: 'input[placeholder="Email"]',
    password: 'input[placeholder="Password"]',
    submit: 'form button[type="submit"]',
  },
  editor: {
    title: 'input[placeholder="Article Title"]',
    description: 'input[placeholder="What\'s this article about?"]',
    body: 'textarea[placeholder^="Write your article"]',
    tags: 'input[placeholder="Enter tags"]',
    publish: 'button:has-text("Publish Article")',
  },
  // Botões renderizam via componentes AngularJS; alvo pelos contêineres estáveis.
  feedFavoriteBtn: '.article-preview favorite-btn button',
  profileFollowBtn: '.user-info follow-btn button.action-btn',
  navUser: (username) => `.nav-link:has-text("${username}")`,
};

// Login pela UI (fluxo observável, não atalho de localStorage).
export async function loginViaUi(page, { email, password }) {
  await page.goto(routes.login);
  await page.fill(sel.auth.email, email);
  await page.fill(sel.auth.password, password);
  await page.click(sel.auth.submit);
}
