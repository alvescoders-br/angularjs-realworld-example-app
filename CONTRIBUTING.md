# Contributing

## Conventional Commits (GUIA §7)

Todo commit neste repositório segue o padrão [Conventional Commits](https://www.conventionalcommits.org/).

### Formato

```
<type>(<scope>): <short description>

[corpo opcional]

Refs: #<issue-id>
```

### Tipos permitidos

| Tipo | Quando usar |
|------|-------------|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `chore` | Tarefa de manutenção / tooling (sem toque no app) |
| `refactor` | Refatoração sem mudança de comportamento |
| `test` | Adição ou ajuste de testes |
| `docs` | Documentação |
| `build` | Config de build / DevContainer |
| `ci` | CI/CD pipelines |

### Regras

- O `#<issue-id>` é **obrigatório** no corpo ou rodapé de cada commit versionado.
- Abrir a issue **antes** de iniciar qualquer trabalho (GUIA §6).
- **Nunca commitar** os paths do GUIA §13: `harness/`, `docs/`, `AGENTS.md`, `CLAUDE.md`,
  `documentacao/`. Estes caminhos estão em `.git/info/exclude` (local, não versionado).

## Bleeding Branch (GUIA §7)

O harness comita progresso automático em uma branch de experimentação chamada **`bleeding`**.

- Commits nesta branch seguem Conventional Commits com sufixo `[harness]`.
- A branch `bleeding` **nunca é mergeada diretamente** em `master`/`main` — serve apenas
  como rastreamento do progresso do agente e revisão humana.
- Para promover trabalho da `bleeding`, abrir uma PR da branch de feature para `master`.

## Branches de trabalho

```
master        ← branch estável (releases)
dev           ← integração de features
bleeding      ← progresso automático do harness (não mergear diretamente)
feat/<slug>   ← branches de feature, criadas a partir de dev
fix/<slug>    ← branches de bug fix
```

## Issues

- Usar os templates em `.github/ISSUE_TEMPLATE/`.
- Toda issue deve atender ao **DoR** antes de entrar em execução (GUIA §6).
- Toda PR deve satisfazer o **DoD** antes de ser mergeada (`.github/PULL_REQUEST_TEMPLATE.md`).
