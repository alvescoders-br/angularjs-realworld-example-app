// Fase 2 (Refs #2) - contract tests T2.
// Cada fixture versionada (PP-1 decisao A: replay contra fixtures, sem backend ao
// vivo) e validada contra o schema do contrato OpenAPI RealWorld. Qualquer
// divergencia entre o que o app envia/espera e o contrato falha o gate (GUIA §10/§11).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateAgainst } from './lib/validate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = JSON.parse(readFileSync(join(here, 'contract.schemas.json'), 'utf8'));

function fixture(name) {
  return JSON.parse(readFileSync(join(here, 'fixtures', `${name}.json`), 'utf8'));
}

// schema <- fixture: cada envelope do contrato deve validar sua fixture gravada.
const CASES = [
  ['UserResponse', 'user-response'],
  ['ProfileResponse', 'profile-response'],
  ['ArticleResponse', 'article-response'],
  ['MultipleArticlesResponse', 'multiple-articles-response'],
  ['CommentResponse', 'comment-response'],
  ['MultipleCommentsResponse', 'multiple-comments-response'],
  ['TagsResponse', 'tags-response'],
  ['GenericErrorModel', 'generic-error'],
  ['LoginRequest', 'login-request'],
  ['NewUserRequest', 'new-user-request'],
  ['NewArticleRequest', 'new-article-request'],
  ['CreateCommentRequest', 'create-comment-request'],
];

for (const [schema, fx] of CASES) {
  test(`fixture '${fx}' satisfaz o contrato '${schema}'`, () => {
    const errors = validateAgainst(root, schema, fixture(fx));
    assert.deepEqual(errors, [], `divergencia de contrato:\n${errors.join('\n')}`);
  });
}

// Negativos: o gate DEVE falhar quando o payload diverge do contrato.
test('detecta campo obrigatorio ausente (User sem token)', () => {
  const bad = { user: { email: 'jake@example.com', username: 'jake' } };
  const errors = validateAgainst(root, 'UserResponse', bad);
  assert.ok(errors.some((e) => e.includes('token') && e.includes('required')), errors.join('\n'));
});

test('detecta tipo errado (favoritesCount como string)', () => {
  const bad = fixture('article-response');
  bad.article.favoritesCount = '0';
  const errors = validateAgainst(root, 'ArticleResponse', bad);
  assert.ok(errors.some((e) => e.includes('favoritesCount') && e.includes('integer')), errors.join('\n'));
});

test('detecta following nao-booleano no Profile', () => {
  const bad = fixture('profile-response');
  bad.profile.following = 'false';
  const errors = validateAgainst(root, 'ProfileResponse', bad);
  assert.ok(errors.some((e) => e.includes('following') && e.includes('boolean')), errors.join('\n'));
});

test('detecta email invalido (format email)', () => {
  const bad = fixture('login-request');
  bad.user.email = 'not-an-email';
  const errors = validateAgainst(root, 'LoginRequest', bad);
  assert.ok(errors.some((e) => e.includes('email')), errors.join('\n'));
});

test('detecta createdAt nao date-time no Comment', () => {
  const bad = fixture('comment-response');
  bad.comment.createdAt = 'ontem';
  const errors = validateAgainst(root, 'CommentResponse', bad);
  assert.ok(errors.some((e) => e.includes('createdAt') && e.includes('date-time')), errors.join('\n'));
});

test('detecta articles que nao e array', () => {
  const errors = validateAgainst(root, 'MultipleArticlesResponse', { articles: {}, articlesCount: 0 });
  assert.ok(errors.some((e) => e.includes('articles') && e.includes('array')), errors.join('\n'));
});

test('schema desconhecido reporta erro', () => {
  const errors = validateAgainst(root, 'NaoExiste', {});
  assert.equal(errors.length, 1);
  assert.ok(errors[0].includes('unknown schema'));
});

test('nullable: bio/image podem ser null no User', () => {
  const ok = { user: { email: 'a@b.co', token: 't', username: 'u', bio: null, image: null } };
  assert.deepEqual(validateAgainst(root, 'UserResponse', ok), []);
});

test('campos extras no payload sao tolerados (forward-compat)', () => {
  const withExtra = fixture('tags-response');
  withExtra.tagsCount = 3;
  assert.deepEqual(validateAgainst(root, 'TagsResponse', withExtra), []);
});
