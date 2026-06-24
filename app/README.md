# Conduit Angular 21 workspace

Refs: #5

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
```
