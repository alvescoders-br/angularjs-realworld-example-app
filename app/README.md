# Conduit Angular 21 workspace

Refs: #5 #11

This directory is the isolated Angular 21 migration workspace for Phase 3. It is intentionally separate from the legacy AngularJS source under `src/js/**`, which remains the parity baseline and must not be mutated during S1.

## S1 scope

- Angular CLI application workspace under `app/`.
- Standalone bootstrap with `provideRouter(routes)` and History API path routing.
- Strict TypeScript configuration.
- Base state holder implemented with Angular Signals.
- No SSR setup in this phase.
- `marked` declared for the later sanitized markdown slice.

## Local commands

```bash
npm install
npm run build
npm run typecheck
npm run lint
npm test
```

## Quality gates

The app quality evidence is reproducible by command; generated reports stay
ignored under `coverage/` and `reports/`.

```bash
npm test              # Vitest via Angular CLI, writes coverage/lcov.info
npm run mutation      # StrykerJS, threshold high=95 and break=94
```

The mutation gate is configured in `stryker.config.mjs`. A passing run must keep
the final mutation score at or above 95%. OTel SDK bootstrap wiring
(`TelemetryService`) is intentionally excluded from mutation because the useful
contract is integration wiring, not vendor SDK internals; it is covered by unit
tests plus the `ops/validate.py` LGTM artifact check. If a local
`reports/mutation/report.json` already exists, it is evidence only for that
workstation and must not be treated as the source of truth for a future commit.

## Observability

OpenTelemetry is initialized at app startup. Outbound calls to the Conduit API
are observed by `otel.interceptor.ts` without mutating requests or responses:

- counter: `http.outbound.calls`, labelled by `endpoint`;
- logs: `app_bootstrap` and `app_beforeunload`;
- traces: one `http.outbound` span per API call.

The collector endpoint defaults to `http://localhost:4318`; Docker Compose
exposes that port for local LGTM validation.

## Base styles

The Conduit base CSS is vendored at `public/conduit.css` because the original
`//demo.productionready.io/main.css` CDN asset is no longer reliable. Angular
loads it through `angular.json` before `src/styles.css`, so production builds do
not depend on a raw `<link href="conduit.css">` in `index.html`.
