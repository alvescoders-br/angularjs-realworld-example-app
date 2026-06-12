# E2E — Playwright · Rede de segurança Fase 2 (T3) · Refs #2

Rede de segurança **T3**: captura os **fluxos observáveis** do app AngularJS
**legado atual** como oráculo de paridade para a migração Angular 21 (Fase 3,
GUIA §5.6, §15.2). Roda contra o app **como está hoje** — não contra o rewrite.

## Decisão PP-1 (A)

A API RealWorld é servida por um **mock efêmero em processo**: os fixtures do
Playwright interceptam as XHRs do app (`page.route`) e respondem a partir de
[`mock/api.mjs`](mock/api.mjs). Isso mantém o E2E **offline e determinístico** e
**não toca `src/js/**`** — a URL da API é hardcoded em `app.constants.js` e é
interceptada no browser, nunca editada.

## Gate de cobertura por fluxo (item 9)

O E2E não usa percentual de linha; a cobertura é **por fluxo**. O gate é
**verde ⇔ todos os fluxos abaixo passam**:

| # | Fluxo (GUIA §5.6) | Spec |
|---|---|---|
| 1 | login / register | [`specs/auth.spec.mjs`](specs/auth.spec.mjs) |
| 2 | listar / abrir artigo | [`specs/articles.spec.mjs`](specs/articles.spec.mjs) |
| 3 | criar / editar / publicar | [`specs/editor.spec.mjs`](specs/editor.spec.mjs) |
| 4 | favoritar | [`specs/social.spec.mjs`](specs/social.spec.mjs) |
| 5 | seguir | [`specs/social.spec.mjs`](specs/social.spec.mjs) |

Remover um fluxo desta lista exige decisão registrada no `progress.md`.

## Esquema Token (GUIA §3.2/§16)

O mock só responde aos endpoints autenticados (`GET/PUT /user`) quando o header
é `Authorization: Token <jwt>` — um `Bearer` recebe **401**. O esquema Token é,
portanto, um gate **observável** também no E2E, não só nos contract tests (T2).

## Como rodar

```bash
# 1) build do app legado (gera ./build/index.html + ./build/main.js)
npm install
npx gulp                      # toolchain legada (browserify + templatecache)

# 2) E2E
cd tests/e2e
npm install
npm run install:browsers      # baixa o Chromium (passo de REDE — fora do offline)
npm test                      # sobe o static-server + roda os 6 casos
```

O `webServer` do Playwright sobe [`mock/static-server.mjs`](mock/static-server.mjs),
que entrega o build estático do app (sem fallback SPA — o app é hashbang-routed).

## Estrutura

| Caminho | Papel |
|---|---|
| `playwright.config.mjs` | Projeto chromium, `webServer` (static-server), baseURL `:4173`. |
| `mock/data.mjs` | Seed sintético (usuário, autor, artigo, tags). Sem segredos reais. |
| `mock/api.mjs` | Mock do contrato RealWorld consumido (gate do esquema Token). |
| `mock/static-server.mjs` | Servidor estático zero-dep do build do app. |
| `fixtures/test-fixtures.mjs` | `page.route` → mock; `loginViaToken` (seed de auth). |
| `helpers/app.mjs` | Rotas hashbang + seletores fiéis aos templates `src/js/**/*.html`. |
| `specs/*.spec.mjs` | Os 5 fluxos da rede de segurança. |

## Limite conhecido (offline)

Instalar o Chromium (`playwright install`) e buildar o app legado são passos de
**rede/toolchain** — não executáveis no turno offline do harness. A suíte é
**autorada e verificada por sintaxe**; a **execução ao vivo** roda no runtime de
CI/host que dispõe de browsers. Os artefatos foram mantidos zero-dep onde possível
e o mock é determinístico para garantir reprodutibilidade quando executado.

## Dados sintéticos

Credenciais e tokens são fabricados (`e2e-tester@example.com`,
`not-a-real-password`, `fake.jwt.token-for-e2e`). **Nunca** commitar segredos
reais (AGENTS.md Princípio 3; gate `secret_scan`).
