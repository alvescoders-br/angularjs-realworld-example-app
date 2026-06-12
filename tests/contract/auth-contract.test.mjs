// Fase 2 (Refs #2) - contrato do esquema de autenticacao.
// O app envia "Authorization: Token <jwt>" (NAO Bearer). Estes gates protegem
// essa invariante de paridade (GUIA §3.2/§16) tanto no helper quanto no OpenAPI.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isConduitAuthHeader, buildConduitAuthHeader } from './lib/auth.mjs';

const here = dirname(fileURLToPath(import.meta.url));

test('aceita o header literal "Token <jwt>"', () => {
  assert.equal(isConduitAuthHeader('Token abc.def.ghi'), true);
});

test('rejeita o esquema "Bearer" (divergencia de contrato)', () => {
  assert.equal(isConduitAuthHeader('Bearer abc.def.ghi'), false);
});

test('rejeita header malformado ou vazio', () => {
  assert.equal(isConduitAuthHeader('Token'), false);
  assert.equal(isConduitAuthHeader('Token '), false);
  assert.equal(isConduitAuthHeader(''), false);
  assert.equal(isConduitAuthHeader(null), false);
  assert.equal(isConduitAuthHeader(undefined), false);
});

test('buildConduitAuthHeader produz um header valido', () => {
  const header = buildConduitAuthHeader('my.jwt.token');
  assert.equal(header, 'Token my.jwt.token');
  assert.equal(isConduitAuthHeader(header), true);
});

// Guard textual sobre a fonte da verdade: o OpenAPI deve modelar `Token`, nao `Bearer`.
test('o OpenAPI codifica o esquema Token, nunca Bearer', () => {
  const yaml = readFileSync(join(here, '..', '..', 'api', 'openapi', 'realworld.openapi.yaml'), 'utf8');
  assert.ok(yaml.includes('Authorization: Token <jwt>'), 'OpenAPI deve documentar "Authorization: Token <jwt>"');
  assert.ok(!/scheme:\s*bearer/i.test(yaml), 'OpenAPI nao deve usar o esquema HTTP bearer');
});
