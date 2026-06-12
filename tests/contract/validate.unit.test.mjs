// Fase 2 (Refs #2) - testes unitarios do validador (lib/validate.mjs).
// Exercitam cada ramo do subset de schema para sustentar o gate de cobertura
// (tests/contract = 80%, harness-manifest.json).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from './lib/validate.mjs';

const root = {
  Inner: { type: 'object', required: ['x'], properties: { x: { type: 'integer' } } },
  Wrapper: { type: 'object', properties: { inner: { $ref: 'Inner' } } },
};

test('$ref desconhecido reporta erro', () => {
  const errors = validate({ $ref: 'Missing' }, {}, root);
  assert.equal(errors.length, 1);
  assert.ok(errors[0].includes("unknown $ref 'Missing'"));
});

test('$ref valido delega ao schema referenciado', () => {
  assert.deepEqual(validate({ $ref: 'Inner' }, { x: 1 }, root), []);
  assert.ok(validate({ $ref: 'Inner' }, {}, root).length === 1);
});

test('null permitido quando nullable, rejeitado caso contrario', () => {
  assert.deepEqual(validate({ type: 'string', nullable: true }, null, root), []);
  assert.ok(validate({ type: 'string' }, null, root)[0].includes('null not allowed'));
});

test('undefined reporta valor ausente', () => {
  assert.ok(validate({ type: 'string' }, undefined, root)[0].includes('missing value'));
});

test('object: tipo errado e obrigatorio ausente', () => {
  assert.ok(validate({ type: 'object' }, [], root)[0].includes('expected object'));
  assert.ok(validate(root.Inner, {}, root)[0].includes('required property missing'));
});

test('array: tipo errado e validacao de itens', () => {
  assert.ok(validate({ type: 'array', items: { type: 'string' } }, 'x', root)[0].includes('expected array'));
  const errs = validate({ type: 'array', items: { type: 'string' } }, ['ok', 2], root);
  assert.ok(errs.some((e) => e.includes('[1]') && e.includes('expected string')));
  // array sem items declarados: nao valida elementos
  assert.deepEqual(validate({ type: 'array' }, [1, 2, 3], root), []);
});

test('string: tipo, email e date-time', () => {
  assert.ok(validate({ type: 'string' }, 5, root)[0].includes('expected string'));
  assert.ok(validate({ type: 'string', format: 'email' }, 'bad', root)[0].includes('invalid email'));
  assert.deepEqual(validate({ type: 'string', format: 'email' }, 'a@b.co', root), []);
  assert.ok(validate({ type: 'string', format: 'date-time' }, 'nope', root)[0].includes('invalid date-time'));
  assert.deepEqual(validate({ type: 'string', format: 'date-time' }, '2016-02-18T03:22:56.637Z', root), []);
});

test('integer, number e boolean', () => {
  assert.ok(validate({ type: 'integer' }, 1.5, root)[0].includes('expected integer'));
  assert.deepEqual(validate({ type: 'integer' }, 3, root), []);
  assert.ok(validate({ type: 'number' }, 'x', root)[0].includes('expected number'));
  assert.deepEqual(validate({ type: 'number' }, 1.5, root), []);
  assert.ok(validate({ type: 'boolean' }, 'true', root)[0].includes('expected boolean'));
  assert.deepEqual(validate({ type: 'boolean' }, true, root), []);
});

test('tipo de schema nao suportado reporta erro', () => {
  assert.ok(validate({ type: 'banana' }, 'x', root)[0].includes('unsupported schema type'));
});

test('aninhamento via $ref dentro de properties', () => {
  assert.deepEqual(validate(root.Wrapper, { inner: { x: 1 } }, root), []);
  assert.ok(validate(root.Wrapper, { inner: { x: 'no' } }, root)[0].includes('expected integer'));
});
