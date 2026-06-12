# Contract tests — Fase 2 (Rede de segurança) · Refs #2

Rede de segurança **T2**: trava o **contrato HTTP RealWorld consumido** pelo app
AngularJS legado, para servir de oráculo de paridade na migração Angular 21 (Fase 3).

## Decisão PP-1 (A)

Estes testes rodam **offline, sem backend ao vivo**: validam **fixtures
versionadas** (`fixtures/*.json`) contra os schemas do contrato. O E2E (T3, Playwright)
cobrirá os fluxos contra uma instância efêmera / mock server. Decisão registrada em
`harness/docs/plans/active/fase-2-rede-de-seguranca/progress.md`.

## Como rodar

```bash
cd tests/contract
node --test                                   # 36 testes
node --test --experimental-test-coverage      # com cobertura (alvo: 80%)
npm run coverage                              # gera coverage/lcov.info (gate coverage-check.py)
```

Requer apenas **Node 18+** (testado em Node 26). **Zero dependências de terceiros** —
runner de teste nativo (`node:test`) + validador próprio. Não toca o build legado
(`package.json` da raiz permanece intacto).

## Estrutura

| Caminho | Papel |
|---|---|
| `contract.schemas.json` | Projeção JSON fiel das `components.schemas` do OpenAPI (refs por nome). |
| `lib/validate.mjs` | Validador mínimo (subset JSON-Schema: type/required/properties/items/$ref/nullable/format). |
| `lib/auth.mjs` | Contrato do esquema `Token` (`Authorization: Token <jwt>`, **não** `Bearer`). |
| `fixtures/*.json` | Payloads sintéticos versionados (respostas + requests). Sem segredos reais. |
| `contract.test.mjs` | Cada fixture valida seu envelope; negativos provam que divergência falha o gate. |
| `auth-contract.test.mjs` | Gate do esquema `Token` + guard textual sobre o `realworld.openapi.yaml`. |
| `validate.unit.test.mjs` | Cobertura por ramo do validador. |

## Fonte da verdade e regeneração

`../../api/openapi/realworld.openapi.yaml` é a **fonte única da verdade** do contrato
(GUIA §3.2/§16 — contrato imutável). `contract.schemas.json` é uma **projeção derivada**
para o validador offline; **regenere-o a partir do YAML** sempre que o contrato mudar
(copiar `components.schemas`, reescrevendo `$ref: '#/components/schemas/X'` para
`$ref: 'X'`). O gate `auth-contract.test.mjs` falha se o OpenAPI deixar de modelar o
esquema `Token`.

## Dados sintéticos

Todas as fixtures usam dados fabricados (`jake@example.com`, `not-a-real-password`,
`fake.jwt.token-for-tests`). **Nunca** commitar segredos, tokens ou dados reais
(AGENTS.md Princípio 3; gate `secret_scan`).
