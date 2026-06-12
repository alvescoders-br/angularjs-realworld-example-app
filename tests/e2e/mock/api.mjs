// RealWorld mock API — instância efêmera/mock server da decisão PP-1 (A).
// Implementa apenas o subconjunto do contrato consumido pelo app legado
// (ver api/openapi/realworld.openapi.yaml). Determinístico, sem rede externa.
//
// Esquema Token (GUIA §3.2/§16): endpoints autenticados exigem o header
// `Authorization: Token <jwt>` — NUNCA `Bearer`. Um Bearer é rejeitado 401,
// o que torna o esquema Token um gate observável também no E2E.

import { seedState, FAKE_TOKEN } from './data.mjs';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type',
};
const JSON_HEADERS = {
  ...CORS_HEADERS,
  'content-type': 'application/json; charset=utf-8',
};

function ok(body) {
  return { status: 200, headers: JSON_HEADERS, body: JSON.stringify(body) };
}
function preflight() {
  return { status: 204, headers: CORS_HEADERS, body: '' };
}
function fail(status, errors) {
  return {
    status,
    headers: JSON_HEADERS,
    body: JSON.stringify({ errors: errors || { body: ['invalid'] } }),
  };
}

// Aceita SOMENTE o esquema Token (não Bearer). Retorna o jwt ou null.
function tokenFrom(headers) {
  const raw = headers['authorization'] || headers['Authorization'] || '';
  const m = /^Token\s+(.+)$/.exec(raw);
  return m ? m[1] : null;
}

function slugify(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'untitled';
}

// Resolve uma requisição contra o estado mutável. `state` é criado por createMockApi().
export function respond(state, method, pathname, headers, bodyText) {
  // normaliza: tira o prefixo do host/api → começa em /users, /articles, ...
  const path = pathname.replace(/^.*\/api/, '') || '/';
  if (method === 'OPTIONS') return preflight();

  let body = {};
  if (bodyText) {
    try { body = JSON.parse(bodyText); } catch { return fail(422, { body: ['malformed json'] }); }
  }

  // ---- auth/users -------------------------------------------------------
  if (method === 'POST' && path === '/users/login') {
    const u = (body.user) || {};
    if (!u.email || !u.password) return fail(422, { 'email or password': ["can't be blank"] });
    return ok({ user: { ...state.currentUser, email: u.email } });
  }
  if (method === 'POST' && path === '/users') {
    const u = (body.user) || {};
    if (!u.username || !u.email || !u.password) {
      return fail(422, { username: ["can't be blank"] });
    }
    state.currentUser = { ...state.currentUser, username: u.username, email: u.email };
    return ok({ user: state.currentUser });
  }
  if (path === '/user') {
    const jwt = tokenFrom(headers);
    if (jwt !== FAKE_TOKEN) return fail(401, { auth: ['requires Token scheme'] });
    if (method === 'GET') return ok({ user: state.currentUser });
    if (method === 'PUT') {
      state.currentUser = { ...state.currentUser, ...(body.user || {}) };
      return ok({ user: state.currentUser });
    }
  }

  // ---- tags -------------------------------------------------------------
  if (method === 'GET' && path === '/tags') return ok({ tags: state.tags });

  // ---- articles list / feed --------------------------------------------
  if (method === 'GET' && (path === '/articles' || path === '/articles/feed')) {
    return ok({ articles: state.articles, articlesCount: state.articles.length });
  }

  // ---- create article ---------------------------------------------------
  if (method === 'POST' && path === '/articles') {
    const a = (body.article) || {};
    if (!a.title) return fail(422, { title: ["can't be blank"] });
    const article = {
      slug: slugify(a.title),
      title: a.title,
      description: a.description || '',
      body: a.body || '',
      tagList: a.tagList || [],
      createdAt: '2022-06-01T00:00:00.000Z',
      updatedAt: '2022-06-01T00:00:00.000Z',
      favorited: false,
      favoritesCount: 0,
      author: { ...state.currentUser, following: false },
    };
    state.articles.unshift(article);
    return ok({ article });
  }

  // ---- single-article routes: get / update / favorite / comments -------
  const favMatch = /^\/articles\/([^/]+)\/favorite$/.exec(path);
  if (favMatch) {
    const article = state.articles.find((x) => x.slug === favMatch[1]);
    if (!article) return fail(404, { article: ['not found'] });
    if (method === 'POST') { article.favorited = true; article.favoritesCount += 1; }
    if (method === 'DELETE') { article.favorited = false; article.favoritesCount = Math.max(0, article.favoritesCount - 1); }
    return ok({ article });
  }

  const commentsMatch = /^\/articles\/([^/]+)\/comments$/.exec(path);
  if (commentsMatch && method === 'GET') return ok({ comments: [] });

  const slugMatch = /^\/articles\/([^/]+)$/.exec(path);
  if (slugMatch) {
    const idx = state.articles.findIndex((x) => x.slug === slugMatch[1]);
    if (idx === -1) return fail(404, { article: ['not found'] });
    if (method === 'GET') return ok({ article: state.articles[idx] });
    if (method === 'PUT') {
      const patch = (body.article) || {};
      const updated = { ...state.articles[idx], ...patch };
      // se o título muda, o slug acompanha (comportamento RealWorld)
      if (patch.title) updated.slug = slugify(patch.title);
      state.articles[idx] = updated;
      return ok({ article: updated });
    }
    if (method === 'DELETE') { state.articles.splice(idx, 1); return ok({}); }
  }

  // ---- profiles ---------------------------------------------------------
  const profileMatch = /^\/profiles\/([^/]+)$/.exec(path);
  if (profileMatch && method === 'GET') {
    return ok({ profile: { ...state.author, username: profileMatch[1] } });
  }
  const followMatch = /^\/profiles\/([^/]+)\/follow$/.exec(path);
  if (followMatch) {
    state.author.following = method === 'POST';
    return ok({ profile: { ...state.author, username: followMatch[1] } });
  }

  return fail(404, { route: [`${method} ${path} not mocked`] });
}

// Fábrica usada pelos fixtures do Playwright: estado isolado por teste.
export function createMockApi() {
  const state = seedState();
  return {
    state,
    handle(method, urlString, headers, bodyText) {
      const u = new URL(urlString);
      return respond(state, method, u.pathname, headers, bodyText);
    },
  };
}
