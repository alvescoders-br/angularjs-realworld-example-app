# E2E — Playwright · Paridade S4 da Fase 3 + Incrementos da Fase 4 · Refs #5 #6

A suíte E2E valida os **fluxos observáveis** do app **Angular 21 migrado**
contra o mesmo mock determinístico da Fase 2, preservando o contrato RealWorld
imutável e cobrindo explicitamente o **R2/SR-2** na página de artigo.
A Fase 4 adicionou cobertura de **dark mode** (S1) e **drafts** (S2).

## Decisão herdada da Fase 2

A API RealWorld continua servida por um **mock efêmero em processo**: os fixtures do
Playwright interceptam as XHRs do app (`page.route`) e respondem a partir de
[`mock/api.mjs`](mock/api.mjs). Isso mantém o E2E **offline e determinístico** e
**não toca `src/js/**`** — a URL da API segue hardcoded em
`https://conduit.productionready.io/api` e é interceptada no browser.

## Gate de cobertura por fluxo (item 9)

O E2E não usa percentual de linha; a cobertura é **por fluxo**. O gate é
**verde ⇔ todos os fluxos abaixo passam**:

| # | Fluxo (GUIA §5.6) | Spec |
|---|---|---|
| 1 | login / register | [`specs/auth.spec.mjs`](specs/auth.spec.mjs) |
| 2 | listar / abrir artigo | [`specs/articles.spec.mjs`](specs/articles.spec.mjs) |
| 3 | criar / editar / publicar | [`specs/editor.spec.mjs`](specs/editor.spec.mjs) |
| 4 | favoritar na página de artigo | [`specs/social.spec.mjs`](specs/social.spec.mjs) |
| 5 | seguir na página de artigo | [`specs/social.spec.mjs`](specs/social.spec.mjs) |
| 6 | dark mode toggle + persistência | [`specs/dark-mode.spec.mjs`](specs/dark-mode.spec.mjs) |
| 7 | draft restauração + limpeza no publish | [`specs/editor.spec.mjs`](specs/editor.spec.mjs) |

Remover um fluxo desta lista exige decisão registrada no `progress.md`.

## Esquema Token (GUIA §3.2/§16)

O mock só responde aos endpoints autenticados (`GET/PUT /user`) quando o header
é `Authorization: Token <jwt>` — um `Bearer` recebe **401**. O esquema Token é,
portanto, um gate **observável** também no E2E, não só nos contract tests.

## Como rodar

```bash
# 1) build do app Angular migrado
npm run build --prefix app

# 2) E2E
cd tests/e2e
npm install
npm run install:browsers      # baixa o Chromium (passo de REDE — fora do offline)
npm test                      # sobe o static-server + roda os 7 casos
```

O `webServer` do Playwright sobe [`mock/static-server.mjs`](mock/static-server.mjs),
que entrega o build estático do Angular em `app/dist/conduit-angular-21/browser`
com fallback SPA para as rotas path-based.

## Branches pass/break (Fase 5 · Refs #7)

A Fase 5 exige demonstrar a rede E2E em dois estados:

| Branch | Expectativa | Comando de gate |
|---|---|---|
| `e2e/pass` | suíte Playwright completa verde | `cd tests/e2e && npx playwright test` -> exit 0 |
| `e2e/break` | regressão intencional em um fluxo funcional | `cd tests/e2e && npx playwright test` -> exit 1 |

Estado validado no slice atual:

- `e2e/pass` candidato: suíte atual com 14/14 testes passando.
- Evidência: `npm run build --prefix app` PASS; `cd tests/e2e && npm test` PASS (14 passed).
- `e2e/break` deve ser materializado em branch separada alterando **um único assert
  funcional observável** (por exemplo, expectativa de `aria-pressed` no teste de dark
  mode) e confirmando que o Playwright falha sem alterar mock/API/fixtures.

> Nota operacional: criar branches com conteúdo próprio exige commit ou autorização
> explícita para manipular refs/working tree. Sem commit automático, este README mantém
> o protocolo auditável e o `progress.md` registra a evidência do pass.

## Estrutura

| Caminho | Papel |
|---|---|
| `playwright.config.mjs` | Projeto chromium, `webServer` (static-server), baseURL `:4173`. |
| `mock/data.mjs` | Seed sintético (usuário, autor, artigo, tags). Sem segredos reais. |
| `mock/api.mjs` | Mock do contrato RealWorld consumido (gate do esquema Token). |
| `mock/static-server.mjs` | Servidor estático zero-dep do build Angular 21. |
| `fixtures/test-fixtures.mjs` | `page.route` → mock; `loginViaToken` (seed de auth). |
| `helpers/app.mjs` | Rotas path-based e seletores fiéis ao app migrado em `app/**`. |
| `specs/*.spec.mjs` | Os 7 fluxos (5 paridade S4 + 2 Fase 4), totalizando 14 casos. |

## Limite conhecido (offline)

Instalar o Chromium (`playwright install`) é um passo de **rede/toolchain** — não
executável no turno offline do harness. A suíte e o mock permanecem determinísticos
para garantir reprodutibilidade quando executados no runtime com browser disponível.

## Dados sintéticos

Credenciais e tokens são fabricados (`e2e-tester@example.com`,
`not-a-real-password`, `fake.jwt.token-for-e2e`). **Nunca** commitar segredos
reais (AGENTS.md Princípio 3; gate `secret_scan`).
