// Helpers de navegação/seleção alinhados ao app Angular 21 migrado.
// Rotas reais usam History API/path routing (sem hashbang).
// Seletores seguem a estrutura/semântica do Conduit renderizado em `app/**`.

export const routes = {
  home: '/',
  login: '/login',
  register: '/register',
  editor: '/editor',
  editArticle: (slug) => `/editor/${slug}`,
  article: (slug) => `/article/${slug}`,
  profile: (username) => `/profile/${username}`,
};

// Campos do formulário auth/editor seguem os placeholders renderizados pelo app Angular.
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
  article: {
    followBtn: '.article-page .banner app-follow-button button.action-btn',
    favoriteBtn: '.article-page .banner app-favorite-button button',
  },
  navUser: (username) => `.nav-link:has-text("${username}")`,
  themeToggle: 'button.theme-toggle',
};

// Login pela UI (fluxo observável, não atalho de localStorage).
export async function loginViaUi(page, { email, password }) {
  await page.goto(routes.login);
  await page.fill(sel.auth.email, email);
  await page.fill(sel.auth.password, password);
  await page.click(sel.auth.submit);
}
